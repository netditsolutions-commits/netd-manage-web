-- ============================================================================
-- NETD IT MANAGEMENT SYSTEM - CLOUDFLARE D1 DATABASE SCHEMA (v3.0)
-- ຖານຂໍ້ມູນລະບົບຄຸ້ມຄອງທຸລະກິດຮ້ານໄອທີ (Cloudflare D1 SQLite Engine)
-- ============================================================================

-- 1. ຕາຕະລາງການຕັ້ງຄ່າລະບົບ (System Settings)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'setting_01',
    shop_name TEXT NOT NULL DEFAULT 'NETD IT Solutions & Services',
    shop_subtitle TEXT DEFAULT 'ສູນບໍລິການຕິດຕັ້ງ ແລະ ຈັດຈຳໜ່າຍອຸປະກອນໄອທີຄົບວົງຈອນ',
    phone TEXT DEFAULT '+856 20 5555 8888 / 021 456 789',
    email TEXT DEFAULT 'info@netd-it.la',
    address TEXT DEFAULT 'ຖະໜົນ ໄກສອນ ພົມວິຫານ, ບ້ານ ໂພນສະອາດ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
    tax_id TEXT DEFAULT 'TAX-0102030405-LA',
    currency TEXT DEFAULT 'LAK',
    currency_symbol TEXT DEFAULT '₭',
    tax_rate REAL DEFAULT 7.0,
    logo_url TEXT DEFAULT 'Logo.png',
    bank_name TEXT DEFAULT 'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)',
    bank_account_no TEXT DEFAULT '010-12-00-01234567-001',
    bank_account_name TEXT DEFAULT 'NETD IT SOLUTIONS & SERVICES',
    bank_qr_url TEXT,
    d1_worker_url TEXT,
    theme TEXT DEFAULT 'dark',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ຕາຕະລາງພະນັກງານ (Employees & Users)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'technician',
    role_name TEXT,
    position TEXT,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    address TEXT,
    joined_date DATE,
    salary REAL DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, on_leave, resigned
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ຕາຕະລາງຂໍ້ມູນລູກຄ້າ (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'individual', -- individual (ບຸກຄົນ), corporate (ອົງກອນ)
    name TEXT NOT NULL,
    company TEXT,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    tax_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. ຕາຕະລາງໝວດໝູ່ສິນຄ້າ (Product Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'fa-box',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. ຕາຕະລາງແບຣນສິນຄ້າ (Brands)
CREATE TABLE IF NOT EXISTS brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    category_id TEXT,
    contact_info TEXT,
    warranty_policy TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. ຕາຕະລາງຜູ້ສະໜອງ (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    payment_terms TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. ຕາຕະລາງສິນຄ້າ (Products / SKUs)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    model TEXT,
    sn_or_mac TEXT,
    category_id TEXT NOT NULL,
    brand_id TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    cost_price REAL NOT NULL DEFAULT 0,
    profit_margin REAL DEFAULT 0, -- %
    sale_price REAL NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 2,
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'ໜ່ວຍ',
    has_sn INTEGER DEFAULT 1,
    image_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

-- 8. ຕາຕະລາງ Serial Number (Product Serials)
CREATE TABLE IF NOT EXISTS product_serials (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    mac_address TEXT,
    status TEXT DEFAULT 'in_stock', -- in_stock, reserved, sold, maintenance
    purchase_order_id TEXT,
    invoice_id TEXT,
    warranty_months INTEGER DEFAULT 12,
    location TEXT DEFAULT 'ສາງໃຫຍ່',
    received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    sold_date DATETIME,
    notes TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
);

-- 9. ຕາຕະລາງໃບສັ່ງຊື້ສິນຄ້າ (Purchase Orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_date DATE,
    status TEXT DEFAULT 'ordered', -- ordered, received, cancelled
    total_amount REAL DEFAULT 0,
    shipping_cost REAL DEFAULT 0,
    items_json TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

-- 10. ຕາຕະລາງເອກະສານ ແລະ ໃບບີນ (Documents: Quotation, Invoice, POS Receipt, Delivery Note)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    doc_number TEXT UNIQUE NOT NULL,
    doc_type TEXT NOT NULL, -- quotation, invoice, pos, receipt, delivery
    ref_doc_id TEXT,
    customer_id TEXT NOT NULL,
    customer_name TEXT,
    phone TEXT,
    delivery_address TEXT,
    driver TEXT,
    vehicle TEXT,
    doc_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    items_json TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. ຕາຕະລາງໝວດໝູ່ໂຄງການ (Project Categories)
CREATE TABLE IF NOT EXISTS project_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT 'sky',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. ຕາຕະລາງໂຄງການ (Projects)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    category TEXT DEFAULT 'Network & Security',
    leader_id TEXT,
    quotation_doc_number TEXT,
    invoice_doc_number TEXT,
    start_date DATE,
    deadline DATE,
    budget REAL DEFAULT 0,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. ຕາຕະລາງໜ້າວຽກຍ່ອຍໂຄງການ (Project Checklist Tasks)
CREATE TABLE IF NOT EXISTS project_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'todo', -- todo, in_progress, done
    deadline DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);

-- 14. ຕາຕະລາງໝວດໝູ່ໜ້າວຽກໄອທີ (IT Job Categories)
CREATE TABLE IF NOT EXISTS it_job_categories (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'sky',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. ຕາຕະລາງໜ້າວຽກໄອທີ (IT Service Jobs: Onsite, ແປງຄອມ, ແປງປຣິນເຕີ, Network)
CREATE TABLE IF NOT EXISTS it_jobs (
    id TEXT PRIMARY KEY,
    job_code TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    job_type TEXT NOT NULL DEFAULT 'onsite',
    device_model TEXT,
    serial_or_mac TEXT,
    issue_description TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    service_fee REAL DEFAULT 0,
    parts_replaced TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, delivered
    received_date DATE DEFAULT CURRENT_TIMESTAMP,
    completed_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. ຕາຕະລາງບັນທຶກລາຍຮັບ-ລາຍຈ່າຍ (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- income, expense
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    ref_doc_id TEXT,
    description TEXT NOT NULL,
    payment_method TEXT DEFAULT 'transfer',
    recorded_by TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. ຕາຕະລາງລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າ (Client Developed Systems)
CREATE TABLE IF NOT EXISTS client_systems (
    id TEXT PRIMARY KEY,
    system_name TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    domain_url TEXT,
    hosting_provider TEXT,
    launch_date DATE,
    expiry_date DATE,
    sla_type TEXT DEFAULT 'SLA Gold 24/7',
    status TEXT DEFAULT 'active',
    price REAL DEFAULT 0,
    tech_stack TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. ຕາຕະລາງປະຫວັດການເຄື່ອນໄຫວ (Activity Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user TEXT,
    action TEXT,
    module TEXT,
    details TEXT,
    time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INITIAL SEED DATA (ຂໍ້ມູນເລີ່ມຕົ້ນສຳລັບການ Deploy ໃໝ່)
-- ============================================================================

-- 1. Default Admin User (user: admin, Password: p@ss4admin)
INSERT OR IGNORE INTO employees (id, name, username, password, role, role_name, position, phone, email, status)
VALUES (
    'emp_01', 
    'ສົມສັກ ແກ້ວມະນີ', 
    'admin', 
    'p@ss4admin', 
    'admin', 
    'Admin (ສິດສູງສຸດ)', 
    'ຜູ້ຈັດການທົ່ວໄປ (General Manager)', 
    '020 5555 8888', 
    'somsack@netd-it.la', 
    'active'
);

-- 2. Default Settings
INSERT OR IGNORE INTO settings (
    id, shop_name, shop_subtitle, phone, email, address, tax_id, 
    bank_name, bank_account_no, bank_account_name, theme
)
VALUES (
    'setting_01',
    'NETD IT Solutions & Services',
    'ສູນບໍລິການຕິດຕັ້ງ ແລະ ຈັດຈຳໜ່າຍອຸປະກອນໄອທີຄົບວົງຈອນ',
    '+856 20 5555 8888 / 021 456 789',
    'info@netd-it.la',
    'ຖະໜົນ ໄກສອນ ພົມວິຫານ, ບ້ານ ໂພນສະອາດ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
    'TAX-0102030405-LA',
    'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)',
    '010-12-00-01234567-001',
    'NETD IT SOLUTIONS & SERVICES',
    'dark'
);

-- 3. Default Product Categories
INSERT OR IGNORE INTO categories (id, name, code, description, icon) VALUES
('cat_cctv', 'ກ້ອງວົງຈອນປິດ (CCTV)', 'CCTV', 'ກ້ອງ IP, ColorVu, DVR/NVR', 'fa-video'),
('cat_net', 'ອຸປະກອນເຄືອຂ່າຍ (Network)', 'NET', 'Router, Switch, Access Point, Firewall', 'fa-network-wired'),
('cat_server', 'ເຊີບເວີ & ຕູ້ຣັກ (Server & Rack)', 'SRV', 'Tower/Rack Server, UPS, Rack Cabinet', 'fa-server'),
('cat_cable', 'ສາຍສັນຍານ & ອຸປະກອນຕໍ່ພ່ວງ', 'CAB', 'ສາຍ LAN CAT6, Fiber Optic, RJ45, Patch Panel', 'fa-plug'),
('cat_pos', 'ລະບົບຂາຍໜ້າຮ້ານ (POS)', 'POS', 'ເຄື່ອງ POS Touchscreen, ເຄື່ອງພິມໃບບິນ 80mm', 'fa-cash-register'),
('cat_pc', 'ຄອມພິວເຕີ & ໂນ໊ດບຸກ (PC & Laptop)', 'PC', 'Desktop PC, Laptop, All-in-One, Monitor', 'fa-computer');

-- 4. Default IT Job Categories
INSERT OR IGNORE INTO it_job_categories (id, key, name, description, color) VALUES
('cat_onsite', 'onsite', 'Onsite Support', 'ລົງກວດເຊັກໜ້າວຽກຕົວຈິງ', 'cyan'),
('cat_repair_pc', 'repair_pc', 'ວຽກແປງຄອມ', 'ສ້ອມແປງ PC / Desktop / Laptop', 'amber'),
('cat_printer', 'printer', 'ແປງປຣິນເຕີ', 'ສ້ອມແປງ Printer / Scanner / POS', 'purple'),
('cat_network', 'network', 'ວາງສາຍ Network', 'ຕິດຕັ້ງ Wi-Fi / LAN / CCTV', 'emerald'),
('cat_software', 'software', 'Software / Windows', 'ລົງ Windows / License / ແກ້ໄວຣັສ', 'rose');

-- 5. Default Project Categories
INSERT OR IGNORE INTO project_categories (id, name, code, color) VALUES
('pcat_net', 'Network & Security', 'NET', 'sky'),
('pcat_srv', 'Server & Cloud Infrastructure', 'SRV', 'indigo'),
('pcat_cctv', 'CCTV & Surveillance System', 'CCTV', 'emerald'),
('pcat_soft', 'Custom Web Application & ERP', 'SOFT', 'purple');
