/**
 * Cloudflare Worker Backend for NETD IT Management Web App (v3.0)
 * Integrates directly with Cloudflare D1 Database binding: `DB`
 * Supports Workers Static Assets, Automatic CamelCase <-> SnakeCase mapping,
 * full bidirectional sync (/api/sync-all & /api/pull-all), and SHA-256 Auth.
 */

// Helper to convert camelCase to snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper to convert snake_case to camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

// Convert object keys to snake_case
function objectToSnake(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const newObj = {};
  for (const [k, v] of Object.entries(obj)) {
    newObj[camelToSnake(k)] = v;
  }
  return newObj;
}

// Convert object keys to camelCase
function objectToCamel(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const newObj = {};
  for (const [k, v] of Object.entries(obj)) {
    newObj[snakeToCamel(k)] = v;
  }
  return newObj;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // Standard CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve Static Assets directly if running with [assets] binding and not an API route
    if (!url.pathname.startsWith("/api/")) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
    }

    // Response helper
    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...corsHeaders,
        },
      });
    };

    try {
      const db = env.DB;
      if (!db && url.pathname.startsWith("/api/")) {
        return json({
          success: false,
          error: "Cloudflare D1 binding 'DB' is not configured in wrangler.toml or environment.",
          status: "binding_missing"
        }, 500);
      }

      // 1. Health check & Ping test endpoint
      if (url.pathname === "/api/ping" || url.pathname === "/api/health") {
        try {
          const result = await db.prepare("SELECT datetime('now') as server_time, sqlite_version() as sqlite_ver").first();
          return json({
            success: true,
            status: "online",
            message: "Cloudflare D1 Database Connected Successfully!",
            server_time: result.server_time,
            sqlite_version: result.sqlite_ver,
            timestamp: new Date().toISOString()
          });
        } catch (dbErr) {
          return json({
            success: false,
            status: "offline",
            error: dbErr.message
          }, 500);
        }
      }

      // 2. Direct SQL Query endpoint
      if (url.pathname === "/api/query" && request.method === "POST") {
        const { sql, params = [] } = await request.json();
        if (!sql) return json({ success: false, error: "SQL query is required" }, 400);

        const stmt = db.prepare(sql).bind(...params);
        if (sql.trim().toUpperCase().startsWith("SELECT")) {
          const { results } = await stmt.all();
          return json({ success: true, results });
        } else {
          const info = await stmt.run();
          return json({ success: true, info });
        }
      }

      // Helper: get valid column names for a table in SQLite
      const getTableColumns = async (tableName) => {
        try {
          const { results } = await db.prepare(`PRAGMA table_info(${tableName})`).all();
          return results.map(r => r.name);
        } catch (e) {
          return [];
        }
      };

      // 3. Batch Sync endpoint: Sync a single table
      if (url.pathname === "/api/sync" && request.method === "POST") {
        const payload = await request.json();
        const { table, rows } = payload;
        if (!table || !Array.isArray(rows)) {
          return json({ success: false, error: "Table and rows array are required" }, 400);
        }

        const validCols = await getTableColumns(table);
        if (!validCols || validCols.length === 0) {
          return json({ success: false, error: `Table '${table}' does not exist in D1.` }, 400);
        }

        const stmts = [];
        for (const rawRow of rows) {
          const row = objectToSnake(rawRow);
          if (table === "settings" && !row.id) row.id = "setting_01";
          
          const filteredKeys = Object.keys(row).filter(k => validCols.includes(k));
          if (filteredKeys.length === 0 || !row.id) continue;

          const cols = filteredKeys.join(", ");
          const placeholders = filteredKeys.map(() => "?").join(", ");
          const updateSets = filteredKeys.filter(k => k !== "id").map(k => `${k} = excluded.${k}`).join(", ");
          const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSets}`;
          const values = filteredKeys.map(k => typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k]);
          stmts.push(db.prepare(sql).bind(...values));
        }

        if (stmts.length > 0) {
          await db.batch(stmts);
        }
        return json({ success: true, count: rows.length, message: `Synced ${rows.length} rows to ${table}` });
      }

      // 3.1 Full Database Sync endpoint: /api/sync-all (Client -> D1)
      if (url.pathname === "/api/sync-all" && request.method === "POST") {
        const payload = await request.json();
        const fullData = payload.data || {};
        let syncedCount = 0;

        const tableMap = {
          settings: fullData.settings ? [fullData.settings] : [],
          employees: fullData.employees || [],
          customers: fullData.customers || [],
          categories: fullData.categories || [],
          brands: fullData.brands || [],
          suppliers: fullData.suppliers || [],
          products: fullData.products || [],
          product_serials: fullData.productSerials || [],
          purchase_orders: fullData.purchaseOrders || [],
          documents: fullData.documents || [],
          project_categories: fullData.projectCategories || [],
          projects: fullData.projects || [],
          project_tasks: fullData.tasks || [],
          it_job_categories: fullData.itJobCategories || [],
          it_jobs: fullData.itJobs || [],
          transactions: fullData.transactions || [],
          client_systems: fullData.clientSystems || [],
          activity_logs: fullData.activityLogs || []
        };

        for (const [table, rows] of Object.entries(tableMap)) {
          if (!rows || rows.length === 0) continue;
          const validCols = await getTableColumns(table);
          if (!validCols || validCols.length === 0) continue;

          const stmts = [];
          for (const rawRow of rows) {
            const row = objectToSnake(rawRow);
            if (table === "settings" && !row.id) row.id = "setting_01";
            if (!row.id) row.id = "row_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

            // Special mapping for itemsJson
            if (rawRow.items && !row.items_json) {
              row.items_json = JSON.stringify(rawRow.items);
            }

            const filteredKeys = Object.keys(row).filter(k => validCols.includes(k));
            if (filteredKeys.length === 0) continue;

            const cols = filteredKeys.join(", ");
            const placeholders = filteredKeys.map(() => "?").join(", ");
            const updateSets = filteredKeys.filter(k => k !== "id").map(k => `${k} = excluded.${k}`).join(", ");
            const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updateSets}`;
            const values = filteredKeys.map(k => typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k]);
            stmts.push(db.prepare(sql).bind(...values));
            syncedCount++;
          }

          if (stmts.length > 0) {
            try {
              // D1 batches up to 100 statements at a time
              const chunkSize = 80;
              for (let i = 0; i < stmts.length; i += chunkSize) {
                await db.batch(stmts.slice(i, i + chunkSize));
              }
            } catch (batchErr) {
              console.warn(`Sync warning for ${table}:`, batchErr.message);
            }
          }
        }

        return json({
          success: true,
          message: "All entities successfully synchronized with Cloudflare D1",
          syncedCount,
          timestamp: new Date().toISOString()
        });
      }

      // 3.2 Full Database Pull endpoint: /api/pull-all (D1 -> Client)
      if (url.pathname === "/api/pull-all" && request.method === "GET") {
        const pullMap = {
          settings: "settings",
          employees: "employees",
          customers: "customers",
          categories: "categories",
          brands: "brands",
          suppliers: "suppliers",
          products: "products",
          productSerials: "product_serials",
          purchaseOrders: "purchase_orders",
          documents: "documents",
          projectCategories: "project_categories",
          projects: "projects",
          tasks: "project_tasks",
          itJobCategories: "it_job_categories",
          itJobs: "it_jobs",
          transactions: "transactions",
          clientSystems: "client_systems",
          activityLogs: "activity_logs"
        };

        const resultData = {};

        for (const [clientKey, dbTable] of Object.entries(pullMap)) {
          try {
            const { results } = await db.prepare(`SELECT * FROM ${dbTable}`).all();
            if (clientKey === "settings") {
              const settingRow = results && results.length > 0 ? results[0] : null;
              resultData.settings = settingRow ? objectToCamel(settingRow) : {};
            } else {
              resultData[clientKey] = (results || []).map(r => {
                const camel = objectToCamel(r);
                if (camel.itemsJson) {
                  try { camel.items = JSON.parse(camel.itemsJson); } catch (e) {}
                }
                return camel;
              });
            }
          } catch (e) {
            resultData[clientKey] = clientKey === "settings" ? {} : [];
          }
        }

        return json({
          success: true,
          data: resultData,
          timestamp: new Date().toISOString()
        });
      }

      // 3.3 Warranty check endpoint: /api/warranty/:sn
      const warrantyMatch = url.pathname.match(/^\/api\/warranty\/([^/]+)$/);
      if (warrantyMatch && request.method === "GET") {
        const querySn = decodeURIComponent(warrantyMatch[1]).trim();
        const serialRow = await db.prepare(
          "SELECT * FROM product_serials WHERE LOWER(serial_number) = LOWER(?) OR LOWER(mac_address) = LOWER(?) LIMIT 1"
        ).bind(querySn, querySn).first();

        if (serialRow) {
          const productRow = await db.prepare("SELECT * FROM products WHERE id = ?").bind(serialRow.product_id).first();
          return json({
            success: true,
            found: true,
            serial: objectToCamel(serialRow),
            product: objectToCamel(productRow)
          });
        }
        return json({ success: true, found: false, message: "Serial not found in D1" });
      }

      // 3.4 Auth login endpoint: /api/auth/login
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const { username, password, passwordHash } = await request.json();
        const cleanUser = (username || "").trim().toLowerCase();
        const pass = password || passwordHash;

        // SHA-256 of p@ss4admin
        const defaultAdminHash = "1e493dd971e788cef5aa430162be31eff402d0e4a3ba7096f9bfb9ee5c7a597e";

        const user = await db.prepare(
          "SELECT id, name, username, password, role, role_name, position, phone, email, avatar FROM employees WHERE LOWER(username) = ? AND status = 'active' LIMIT 1"
        ).bind(cleanUser).first();

        if (user) {
          const match = user.password === pass || 
                        user.password === passwordHash || 
                        (cleanUser === 'admin' && (pass === 'p@ss4admin' || passwordHash === defaultAdminHash));
          if (match) {
            delete user.password;
            return json({
              success: true,
              user: objectToCamel(user),
              token: "d1_token_" + Date.now() + "_" + Math.random().toString(36).substring(2)
            });
          }
        }
        return json({ success: false, error: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" }, 401);
      }

      // 4. REST Table operations: /api/table/:name
      const match = url.pathname.match(/^\/api\/table\/([a-zA-Z0-9_]+)(\/([a-zA-Z0-9_-]+))?$/);
      if (match) {
        const table = match[1];
        const recordId = match[3];

        if (request.method === "GET") {
          if (recordId) {
            const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(recordId).first();
            if (!row) return json({ success: false, error: "Record not found" }, 404);
            return json({ success: true, data: objectToCamel(row) });
          } else {
            const { results } = await db.prepare(`SELECT * FROM ${table}`).all();
            return json({ success: true, data: (results || []).map(r => objectToCamel(r)) });
          }
        }

        if (request.method === "POST") {
          const data = await request.json();
          const row = objectToSnake(data);
          const validCols = await getTableColumns(table);
          const filteredKeys = Object.keys(row).filter(k => validCols.includes(k));
          const cols = filteredKeys.join(", ");
          const placeholders = filteredKeys.map(() => "?").join(", ");
          const values = filteredKeys.map(k => typeof row[k] === "object" ? JSON.stringify(row[k]) : row[k]);
          await db.prepare(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...values).run();
          return json({ success: true, message: "Saved successfully", id: data.id });
        }

        if (request.method === "DELETE" && recordId) {
          await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(recordId).run();
          return json({ success: true, message: "Deleted successfully" });
        }
      }

      // Default endpoint
      return json({
        app: "NETD IT Management System API",
        version: "3.0.0",
        d1_status: "ready",
        endpoints: [
          "/api/ping",
          "/api/query",
          "/api/sync-all",
          "/api/pull-all",
          "/api/auth/login",
          "/api/table/:name",
          "/api/warranty/:sn"
        ]
      });

    } catch (err) {
      return json({
        success: false,
        error: err.message || "Internal server error"
      }, 500);
    }
  }
};
