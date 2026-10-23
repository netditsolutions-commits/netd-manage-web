# ລະບົບບໍລິຫານ-ຈັດການທຸລະກິດຮ້ານໃຫ້ບໍລິການໄອທີ (NETD IT Management System)

ເວັບແອັບພລິເຄຊັນ Single Page Application (SPA) ແບບ Glassmorphism ລະດັບ SaaS Platform ສຳລັບທຸລະກິດຮ້ານໃຫ້ບໍລິການໄອທີ, ຕິດຕັ້ງ Network, CCTV, Server, Software Solutions ແລະ ຈັດຈຳໜ່າຍອຸປະກອນໄອທີຄົບວົງຈອນ. ຮອງຮັບການບັນທຶກ ແລະ ຊິ້ງຂໍ້ມູນກັບ **Cloudflare D1 Database**, Export ເປັນ **Excel** ແລະ **PDF** ໄດ້ທັນທີ.

---

## 🌟 ຄຸນສົມບັດຫຼັກ ແລະ ຈຸດເດັ່ນ (Core Features)

### 1. ຮູບລັກສະນະ ແລະ ການອອກແບບ (Design System)
- **Gradient Background:** ສີມ່ວງເຂັ້ມ → ສີຟ້າ → ສີຟ້າອ່ອນ (`linear-gradient(135deg, #150b2e 0%, #1e1b4b 28%, #1d4ed8 68%, #0284c7 88%, #38bdf8 100%)`)
- **Card Glassmorphism:** ມີ `backdrop-filter: blur(20px)`, ໂປ່ງໃສ (transparency), ຂອບຂາວອ່ອນໆ ແລະ ເງົານຸ່ມໆ
- **Border Radius:** ຂອບໂຄ້ງຂະໜາດໃຫຍ່ **Rounded-3xl** (1.5rem / 24px)
- **Typography:** ຟ້ອນພາສາລາວ **Noto Sans Lao** ຄູ່ກັບ **Plus Jakarta Sans** ອ່ານງ່າຍ ແລະ ຄົມຊັດ
- **Animation & Transitions:** Hover scale, smooth transitions, Pulse status indicator
- **Responsive Design:** ຮອງຮັບທຸກຂະໜາດຈໍ (Desktop, Tablet, Mobile) ພ້ອມ Drawer Sidebar ສຳລັບມືຖື
- **SweetAlert2 Notifications:** ປັອບອັບແຈ້ງເຕືອນສະໄຕ Glassmorphism

---

### 2. ໂຄງສ້າງລະບົບ ແລະ 10 ໂມດູນຫຼັກ (Modules)

1. **Dash board (ໜ້າຫຼັກ - ຕາມ Draft Page 1):**
   - **8 Stat Cards:** ຈຳນວນໂຄງການທັງໝົດ, ຈຳນວນໃບບີນທັງໝົດ, ລວມຍອດລາຍຮັບ (ຄ່າບໍລິການ/ຂາຍສິນຄ້າ), ຍອດລາຍຈ່າຍລວມ (ຕົ້ນທຶນ/ອື່ນໆ), ຈຳນວນສິນຄ້າໃນສະຕອກ (ໝວດ/SKU), ສິນຄ້າກຳລັງສັ່ງຊື້ (PO), ຈຳນວນລູກຄ້າ (ອົງກອນ/ບຸກຄົນ), ມູນຄ່າສິນຄ້າລວມໃນສາງ.
   - **4 Charts (Chart.js):**
     1. ກຮາຟແທ່ງຍອດລາຍຮັບ-ລາຍຈ່າຍແຕ່ລະເດືອນ (ລາຍຮັບສີຂຽວ, ລາຍຈ່າຍສີແດງ)
     2. ກຮາຟສະແດງຍອດມູນຄ່າສິນຄ້າໃນສະຕອກຕາມໝວດໝູ່ (Doughnut)
     3. ກຮາຟສະແດງຈຳນວນສິນຄ້າໃນສະຕອກທີ່ມີຫຼາຍ Top 5 (Horizontal Bar)
     4. ກຮາຟປຽບທຽບລູກຄ້າບຸກຄົນ ແລະ ອົງກອນ (Pie Chart)
   - **3 Bottom Cards:** ສິນຄ້າທີ່ຕ້ອງຊື້ດ່ວນ (Low Stock), Dead Line ງານ ແລະ ໂຄງການ, ສະແດງການເຄື່ອນໄຫວລ່າສຸດ (Activity Log).

2. **ການຈັດການສີນຄ້າ (Inventory & Products - ຕາມ Draft Page 2):**
   - ປຸ່ມຈັດການ: ເພີ່ມ/ແກ້ໄຂໝວດສິນຄ້າ, ເພີ່ມສິນຄ້າໃໝ່, ນຳສິນຄ້າເຂົ້າສະຕອກ, ເບີກສິນຄ້າອອກ.
   - Category Cards ສະແດງ: ຊື່ໝວດ, ຈຳນວນໃນສະຕອກ, ມູນຄ່າລວມ, ຈຳນວນ SKU.
   - ແຖບ Filter: ສີນຄ້າທີ່ມີໃນສະຕອ໋ກ, ສີນຄ້າກຳລັງສັ່ງຊື້, ສີນຄ້າທີ່ມີການເບີກຈ່າຍແລ້ວ.
   - **Serial Number (SN) ແຍກລາຍໜ່ວຍ:** ຄລິກທີ່ສິນຄ້າເພື່ອເບິ່ງລາຍການຍ່ອຍແຍກແຕ່ລະ SN ພ້ອມສະຖານະ, ໄລຍະຮັບປະກັນ ແລະ ສະຖານທີ່ເກັບ (ຕົວຢ່າງ: ກ້ອງ 2MP 3 ໜ່ວຍ ມີ 3 SN ສະເພາະ).
   - ນຳສິນຄ້າເຂົ້າສະຕອກໂດຍດຶງມາຈາກ **ໃບສັ່ງຊື້ສິນຄ້າ (PO)**.

3. **ໂຄງການ ແລະ ໜ້າວຽກ (Projects & Tasks):**
   - ຄຸ້ມຄອງໂຄງການໄອທີ: ຕິດຕັ້ງ Network, CCTV, Server, Cloud, Software.
   - ແຖບ Progress ຄວາມຄືບໜ້າ (0 - 100%), ກຳນົດສົ່ງ, ງົບປະມານ, ຫົວໜ້າໂຄງການ.
   - ລະບົບ Checklist ໜ້າວຽກຍ່ອຍ (Todo, In Progress, Done).

4. **ເອກະສານ ແລະ ໃບບີນ (Documents & Billing - ຕາມ Draft Page 3):**
   - ປຸ່ມສ້າງ: ໃບສະເໜີລາຄາ, ໃບເກັບເງິນ, ໃບບີນຂາຍໜ້າຮ້ານ, ໃບບີນສັ່ງສິນຄ້າ.
   - ແຖບ Filter: ເອກະສານທັງໝົດ | ໃບສະເໜີລາຄາ | ໃບເກັບເງີນ | ໃບບີນຂາຍໜ້າຮ້ານ.
   - **Workflow ໃບສະເໜີລາຄາ:** ດຶງສິນຄ້າຈາກສາງ, ດຶງລູກຄ້າຈາກຖານຂໍ້ມູນ ຫຼື ກົດ "+ ເພີ່ມລູກຄ້າໃໝ່ທັນທີ" ຈາກໜ້າສ້າງໃບສະເໜີລາຄາ.
   - **Workflow ໃບເກັບເງິນ:** ສາມາດ Browse ເລືອກຈາກໃບສະເໜີລາຄາເພື່ອດຶງຂໍ້ມູນສິນຄ້າ ແລະ ລູກຄ້າມາອັດຕະໂນມັດ, ຫຼື ພິມໃໝ່ໄດ້.
   - ພິມເອກະສານ ຫຼື Export ເປັນ **PDF** ພ້ອມຮູບແບບໃບບິນມາດຕະຖານ.

5. **ຂໍ້ມູນພະນັກງານ (Employees & Auth):**
   - ບັນຊີພະນັກງານ, ຕຳແໜ່ງ (Admin, Lead Tech, Accountant, Sales), ສິດເຂົ້າເຖິງ.
   - ໃຊ້ບັນຊີພະນັກງານໃນການ Login ເຂົ້າລະບົບ.

6. **ຂໍ້ມູນລູກຄ້າ (Clients & Customers):**
   - ແຍກປະເພດ: ບຸກຄົນທົ່ວໄປ (Individual) vs ອົງກອນ/ບໍລິສັດ (Corporate).
   - ເບີໂທ, ອີເມວ, ເລກປະຈຳຕົວຜູ້ເສຍພາສີ, ທີ່ຢູ່, ຍອດຊື້ສະສົມ.

7. **ລາຍຮັບ-ລາຍຈ່າຍ (Accounting Ledger):**
   - ບັນທຶກລາຍຮັບ (ຄ່າບໍລິການ, ຂາຍສິນຄ້າ) ແລະ ລາຍຈ່າຍ (ຕົ້ນທຶນ, ເງິນເດືອນ, ຄ່າເຊົ່າ).
   - ສະຫຼຸບລວມຍອດຮັບ, ຍອດຈ່າຍ, ກຳໄລສຸດທິ (Net Balance).

8. **ສີນຄ້າ ແລະ ຜູ້ສະໜອງ (Brands & Suppliers - ຕາມ Draft Page 4):**
   - ແຖບ **Brand ສີນຄ້າທີ່ຈຳໜ່າຍ:** Hikvision, Dahua, Ubiquiti, Cisco, MikroTik, Dell, Sunmi ພ້ອມນະໂຍບາຍຮັບປະກັນ.
   - ແຖບ **ຂໍ້ມູນຜູ້ສະໜອງສີນຄ້າ (ຄູ່ຄ້າ):** ລາຍຊື່ບໍລິສັດຄູ່ຄ້າ, ຜູ້ຕິດຕໍ່, ເບີໂທ, ເງື່ອນໄຂເຄຣດິດ, ປຸ່ມສ້າງໃບສັ່ງຊື້ PO.

9. **ລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າ (Client Developed Systems & SLA):**
   - ຕິດຕາມລະບົບ Web Apps, ERP, Cloud, Portal ທີ່ພັດທະນາໃຫ້ລູກຄ້າ.
   - ຕິດຕາມ Domain, Hosting Provider, Tech Stack, ລະດັບ SLA (Gold 24/7, Platinum) ແລະ ວັນໝົດສັນຍາ.

10. **ຕັ້ງຄ່າລະບົບ (Settings & Cloudflare D1 Integration):**
    - ຂໍ້ມູນຮ້ານ: ຊື່, ເບີໂທ, ທີ່ຢູ່, Logo, ອັດຕາພາສີ VAT.
    - Cloudflare D1 Worker API Endpoint Configuration.
    - ປຸ່ມ **"🔗 ທົດສອບການເຊື່ອມຕໍ່"** (ທົດສອບ Ping, Latency, SQLite Version).
    - ປຸ່ມ **"ຊິ້ງຂໍ້ມູນຂຶ້ນ Cloudflare D1 ດຽວນີ້"**.
    - Backup & Restore ຖານຂໍ້ມູນເປັນໄຟລ໌ JSON.
    - ເບິ່ງ ແລະ Copy Cloudflare D1 SQL Schema.

---

## 🚀 ວິທີເປີດໃຊ້ງານທັນທີ (Quick Start)

1. ເປີດໄຟລ໌ `index.html` ຜ່ານ Web Browser ໃດກໍໄດ້ (Chrome, Edge, Firefox, Safari).
2. ເຂົ້າສູ່ລະບົບດ້ວຍບັນຊີຫຼັກ:
   - **Admin (ຜູ້ຈັດການ):** Username: `admin` | Password: `p@ss4admin`
   - **IT Technician (ຫົວໜ້າຊ່າງ):** Username: `somxay` | Password: `tech123`
   - **Accountant (ນັກບັນຊີ):** Username: `champa` | Password: `acc123`

---

## ☁️ ການ Deploy ຂຶ້ນ Cloudflare D1 Database (Online Production)

ໂຄງສ້າງໂປຣເຈັກໄດ້ກຽມໄຟລ໌ Full-Stack Backend ທີ່ພ້ອມ Deploy ໄວ້ຮຽບຮ້ອຍແລ້ວ:
- `schema.sql`: ຄຳສັ່ງສ້າງຕາຕະລາງ SQLite ທັງໝົດ 18 Tables ພ້ອມ Seed ຂໍ້ມູນ Admin ແລະ Settings ໃນ Cloudflare D1.
- `worker.js`: Cloudflare Worker API Backend ຮອງຮັບ Workers Static Assets (UI + API), Sync ສອງທິດທາງ (/api/sync-all & /api/pull-all), ແລະ ລະບົບຖອດລະຫັດ SHA-256.
- `wrangler.toml`: ໄຟລ໌ Config ສຳລັບ Cloudflare Wrangler CLI.

### ຂັ້ນຕອນການ Deploy ຂຶ້ນ Cloudflare D1 ໃຫ້ໃຊ້ງານ Online ໄດ້ 100%:
```bash
# 1. Login ເຂົ້າສູ່ Cloudflare Account ຂອງທ່ານ
npx wrangler login

# 2. ສ້າງ D1 Database
npx wrangler d1 create netd_it_management
# (ລະບົບຈະສະແດງ database_id ຂຶ້ນມາ, ໃຫ້ນຳຄ່ານັ້ນໄປວາງໃສ່ໃນໄຟລ໌ wrangler.toml ຢູ່ແຖວ database_id = "...")

# 3. Execute Schema ເພື່ອສ້າງຕາຕະລາງທັງໝົດ 18 Tables ແລະ Seed ຂໍ້ມູນ Admin
npx wrangler d1 execute netd_it_management --remote --file=./schema.sql

# 4. Deploy ທັງ Web UI ແລະ Backend Worker ຂຶ້ນ Cloudflare ທັນທີ
npx wrangler deploy
```

ຫຼັງຈາກ Deploy ສຳເລັດ ຈະໄດ້ URL ເຊັ່ນ: `https://netd-webapp-api.your-subdomain.workers.dev` 
ທ່ານສາມາດເປີດ URL ນີ້ເທິງ Browser ໃດກໍໄດ້, ທັງໜ້າເວັບ SPA ແລະ Cloudflare D1 Database ຈະເຊື່ອມຕໍ່ກັນອັດຕະໂນມັດ ໂດຍບໍ່ຕ້ອງຕັ້ງຄ່າເພີ່ມເຕີມ!

---

## 📊 ການ Export ຂໍ້ມູນ (PDF & Excel)
- **Excel (.xlsx):** ສາມາດ Export ລາຍການສາງສິນຄ້າ (Inventory), ລາຍການ Serial Numbers (SN), ເອກະສານ ແລະ ລາຍຮັບ-ລາຍຈ່າຍ ຜ່ານປຸ່ມ `Export Excel`.
- **PDF (.pdf):** ໃນໜ້າ **ເອກະສານ ແລະ ໃບບີນ**, ກົດປຸ່ມ `ພິມ / PDF` ຢູ່ແຕ່ລະໃບບິນ ລະບົບຈະສ້າງໜ້າໃບບິນມາດຕະຖານພ້ອມສັ່ງ Print ຫຼື Save as PDF ໄດ້ທັນທີ.

---

## 📁 ໂຄງສ້າງໄຟລ໌ໃນໂປຣເຈັກ
```text
NETD-WEBAPP-MANAGEMENT/
├── Logo.png               # ໂລໂກ້ຮ້ານໄອທີ (ໃຊ້ສະແດງໃນລະບົບ ແລະ ໃບບິນ)
├── web ui.pdf             # ແບບຮ່າງ Blueprint (Draft UI) ຈາກຜູ້ໃຊ້
├── index.html             # ໄຟລ໌ຫຼັກ Single Page Application
├── schema.sql             # SQL Schema ສຳລັບ Cloudflare D1 SQLite
├── worker.js              # Cloudflare Worker REST API Backend
├── wrangler.toml          # Wrangler Cloudflare Config
├── css/
│   └── style.css          # Glassmorphism, Gradient, Fonts & Print CSS
├── js/
│   ├── db.js              # Database Layer, Cloudflare D1 Client, Seed Data
│   ├── export.js          # Export to Excel (SheetJS) & Printable PDF
│   └── app.js             # SPA Router, Chart.js, Modals, SweetAlert2
└── README.md              # ຄູ່ມືການໃຊ້ງານລະບົບ
```
