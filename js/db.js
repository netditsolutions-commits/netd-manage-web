/**
 * NETD IT MANAGEMENT SYSTEM - DATA & CLOUDFLARE D1 ADAPTER (v2.5)
 * Handles local persistence, Cloudflare D1 REST sync, continuous SKU generator,
 * profit margin calculations, IT service jobs, and full CRUD.
 */

const DB_STORAGE_KEY = 'netd_it_database_v2_5';
const CF_CONFIG_KEY = 'netd_cf_d1_config_v2';

// ----------------------------------------------------------------------------
// INITIAL SEED DATA (ຂໍ້ມູນເລີ່ມຕົ້ນພາສາລາວ)
// ----------------------------------------------------------------------------
const DEFAULT_DATABASE = {
  settings: {
    id: 'setting_01',
    shopName: 'NETD IT Solutions & Services',
    shopSubtitle: 'ສູນບໍລິການຕິດຕັ້ງ ແລະ ຈັດຈຳໜ່າຍອຸປະກອນໄອທີຄົບວົງຈອນ',
    phone: '+856 20 5555 8888 / 021 456 789',
    email: 'info@netd-it.la',
    address: 'ຖະໜົນ ໄກສອນ ພົມວິຫານ, ບ້ານ ໂພນສະອາດ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
    taxId: 'TAX-0102030405-LA',
    currency: 'LAK',
    currencySymbol: '₭',
    taxRate: 7,
    logoUrl: 'Logo.png',
    bankName: 'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)',
    bankAccountNo: '010-12-00-01234567-001',
    bankAccountName: 'NETD IT SOLUTIONS & SERVICES',
    bankQrUrl: '',
    d1WorkerUrl: '',
    d1DatabaseId: '',
    syncMode: 'local_d1_hybrid',
    theme: 'dark', // 'dark' or 'light'
    lastSync: null
  },

  employees: [
    {
      id: 'emp_01',
      name: 'ສົມສັກ ແກ້ວມະນີ',
      username: 'admin',
      password: 'p@ss4admin',
      role: 'admin',
      roleName: 'Admin (ສິດສູງສຸດ)',
      position: 'ຜູ້ຈັດການທົ່ວໄປ (General Manager)',
      phone: '020 5555 8888',
      email: 'somsack@netd-it.la',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'active', // active, on_leave, resigned
      joinedDate: '2023-01-15',
      address: 'ບ້ານ ໂພນສະອາດ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      salary: 12000000,
      notes: 'ຜູ້ຈັດການທົ່ວໄປ ແລະ ດູແລລະບົບ IT Infrastructure'
    },
    {
      id: 'emp_02',
      name: 'ສົມໄຊ ໄຊຍະວົງ',
      username: 'somxay',
      password: 'tech123',
      role: 'technician',
      roleName: 'Technician (ຊ່າງໄອທີ)',
      position: 'ຫົວໜ້າທີມຊ່າງໄອທີ (Lead IT Tech)',
      phone: '020 7788 9911',
      email: 'somxay.tech@netd-it.la',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'active',
      joinedDate: '2023-05-10',
      address: 'ບ້ານ ໜອງບອນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      salary: 8500000,
      notes: 'ຊ່ຽວຊານລະບົບ Network UniFi, Cisco, Mikrotik ແລະ CCTV'
    },
    {
      id: 'emp_03',
      name: 'ຈຳປາ ວົງວິໄລ',
      username: 'champa',
      password: 'acc123',
      role: 'officer',
      roleName: 'Officer (ພະນັກງານທົ່ວໄປ)',
      position: 'ຫົວໜ້າຝ່າຍບັນຊີ ແລະ ເອກະສານ',
      phone: '020 2233 4455',
      email: 'champa.acc@netd-it.la',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      status: 'active',
      joinedDate: '2023-08-01',
      address: 'ບ້ານ ສີຫອມ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
      salary: 7500000,
      notes: 'ດູແລເອກະສານບັນຊີ, ໃບເກັບເງິນ, ພາສີ ແລະ ເງິນເດືອນ'
    },
    {
      id: 'emp_04',
      name: 'ຄຳຫຼ້າ ສຸລິຍະ',
      username: 'khamla',
      password: 'sales123',
      role: 'officer',
      roleName: 'Officer (ພະນັກງານທົ່ວໄປ)',
      position: 'ພະນັກງານຂາຍ ແລະ ປະສານງານ (Sales)',
      phone: '020 9988 7766',
      email: 'khamla.sales@netd-it.la',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      status: 'active',
      joinedDate: '2024-02-15',
      address: 'ບ້ານ ດົງປ່າລານ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ',
      salary: 6000000,
      notes: 'ປະສານງານລູກຄ້າ, ອອກໃບສະເໜີລາຄາ ແລະ ຂາຍໜ້າຮ້ານ'
    }
  ],

  customers: [
    {
      id: 'cust_01',
      type: 'corporate',
      name: 'ທະນາຄານຮ່ວມພັດທະນາ (JDB Bank)',
      company: 'ທະນາຄານຮ່ວມພັດທະນາ ຈຳກັດ',
      phone: '021 216 555',
      email: 'procurement@jdbbank.la',
      address: 'ສຳນັກງານໃຫຍ່ ຖະໜົນ ລ້ານຊ້າງ, ນະຄອນຫຼວງວຽງຈັນ',
      taxId: 'TAX-JDB-9901',
      totalSpent: 45000000,
      notes: 'ລູກຄ້າສັນຍາບຳລຸງຮັກສາລະບົບ CCTV & Network SLA Gold'
    },
    {
      id: 'cust_02',
      type: 'corporate',
      name: 'ໂຮງແຮມ ລາວ ພາຊາ (Lao Plaza Hotel)',
      company: 'ໂຮງແຮມ ລາວ ພາຊາ ວຽງຈັນ',
      phone: '021 218 800',
      email: 'it@laoplazahotel.com',
      address: 'ຖະໜົນ ສາມແສນໄທ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
      taxId: 'TAX-LPH-4421',
      totalSpent: 78000000,
      notes: 'ຕິດຕັ້ງລະບົບ Wi-Fi UniFi ທົ່ວອາຄານ 200 ຫ້ອງ'
    },
    {
      id: 'cust_03',
      type: 'corporate',
      name: 'ຮ້ານກາເຟ ອາມາໂຊນ ສາຂາ ດົງໂດກ',
      company: 'ບໍລິສັດ ກາເຟອາຊຽນ ຈຳກັດ',
      phone: '020 5511 2233',
      email: 'amazon.dongdok@gmail.com',
      address: 'ບ້ານ ດົງໂດກ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ',
      taxId: 'TAX-AMZ-7712',
      totalSpent: 18500000,
      notes: 'ໃຊ້ລະບົບ POS Sunmi + ກ້ອງວົງຈອນປິດ 8 ຈຸດ'
    },
    {
      id: 'cust_04',
      type: 'individual',
      name: 'ທ່ານ ສົມສັກ ວົງສາ',
      company: '',
      phone: '020 9911 4455',
      email: 'somsack.w@gmail.com',
      address: 'ບ້ານ ໜອງບອນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      taxId: '',
      totalSpent: 4200000,
      notes: 'ຕິດຕັ້ງກ້ອງ CCTV ປະຈຳເຮືອນ 4 ໜ່ວຍ'
    },
    {
      id: 'cust_05',
      type: 'individual',
      name: 'ທ່ານ ນາງ ແສງເດືອນ ມະນີວົງ',
      company: '',
      phone: '020 5544 3322',
      email: 'saengduan.m@gmail.com',
      address: 'ບ້ານ ສີຫອມ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
      taxId: '',
      totalSpent: 6500000,
      notes: 'ຊື້ຄອມພິວເຕີ Workstation ແລະ ອຸປະກອນ Network'
    }
  ],

  categories: [
    {
      id: 'cat_cctv',
      code: 'CCTV',
      name: 'ລະບົບກ້ອງວົງຈອນປິດ (CCTV & Security)',
      description: 'ກ້ອງ IP Camera, NVR, PTZ, Switch PoE ແລະ ອຸປະກອນຮັກສາຄວາມປອດໄພ',
      icon: 'fa-video'
    },
    {
      id: 'cat_net',
      code: 'NET',
      name: 'ອຸປະກອນເຄືອຂ່າຍ (Network & WiFi)',
      description: 'Router, Access Point, PoE Switch, Firewall ແລະ ອຸປະກອນສື່ສານ',
      icon: 'fa-network-wired'
    },
    {
      id: 'cat_srv',
      code: 'SRV',
      name: 'ເຄື່ອງຄອມພິວເຕີ ແລະ ເຊີເວີ (Computers & Servers)',
      description: 'Server Rack/Tower, NAS Storage, PC Workstation, UPS',
      icon: 'fa-server'
    },
    {
      id: 'cat_pos',
      code: 'POS',
      name: 'ລະບົບຂາຍໜ້າຮ້ານ (POS & Peripherals)',
      description: 'ເຄື່ອງ POS Touchscreen, ເຄື່ອງພິມໃບບິນ, ເຄື່ອງຍິງບາໂຄດ, ລີ້ນຊັກເກັບເງິນ',
      icon: 'fa-cash-register'
    },
    {
      id: 'cat_cab',
      code: 'CAB',
      name: 'ສາຍສັນຍານ ແລະ ອຸປະກອນຕິດຕັ້ງ (Cabling & Accessories)',
      description: 'ສາຍ LAN CAT6, Fiber Optic, ຕູ້ Rack, Jack RJ45, Patch Panel',
      icon: 'fa-plug'
    }
  ],

  brands: [
    { id: 'br_hik', name: 'Hikvision', logoUrl: '', category: 'CCTV & Security', contact: 'Hikvision Laos Authorized', warranty: 'ຮັບປະກັນ 24 ເດືອນ' },
    { id: 'br_dahua', name: 'Dahua Technology', logoUrl: '', category: 'CCTV & Security', contact: 'Dahua Partner Laos', warranty: 'ຮັບປະກັນ 24 ເດືອນ' },
    { id: 'br_ubnt', name: 'Ubiquiti UniFi', logoUrl: '', category: 'Network & Wireless', contact: 'Ubiquiti Laos Official Partner', warranty: 'ຮັບປະກັນ 12 ເດືອນ' },
    { id: 'br_cisco', name: 'Cisco Systems', logoUrl: '', category: 'Enterprise Network', contact: 'Cisco Distributor Indochina', warranty: 'ຮັບປະກັນ 3 ປີ' },
    { id: 'br_mikrotik', name: 'MikroTik RouterBOARD', logoUrl: '', category: 'Routers & Switches', contact: 'MikroTik Certified Distributor', warranty: 'ຮັບປະກັນ 12 ເດືອນ' },
    { id: 'br_dell', name: 'Dell Technologies', logoUrl: '', category: 'Server & PC', contact: 'Dell Laos ProSupport', warranty: 'ຮັບປະກັນ 3 ປີ' },
    { id: 'br_sunmi', name: 'Sunmi POS', logoUrl: '', category: 'POS Systems', contact: 'Sunmi Southeast Asia', warranty: 'ຮັບປະກັນ 12 ເດືອນ' }
  ],

  suppliers: [
    {
      id: 'sup_01',
      name: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      contactPerson: 'ທ່ານ ອານຸສອນ ແສງດາລາ',
      phone: '020 5599 1122',
      email: 'sales@vientiane-itsupply.la',
      address: 'ຖະໜົນ ດົງປ່າລານ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ',
      terms: 'Credit 30 ວັນ, ສົ່ງສິນຄ້າຟຣີໃນນະຄອນຫຼວງ'
    },
    {
      id: 'sup_02',
      name: 'ບໍລິສັດ ລາວ ເຕັກໂນໂລຢີ ດິສຕຣິບິວເຕີ ຈຳກັດ',
      contactPerson: 'ທ່ານ ບຸນມີ ພົມມະຈັນ',
      phone: '021 334 455',
      email: 'order@lao-tech-dist.la',
      address: 'ເຂດເສດຖະກິດພິເສດ ບຶງທາດຫຼວງ, ນະຄອນຫຼວງວຽງຈັນ',
      terms: 'ຊຳລະກ່ອນ 50%, ຮັບສິນຄ້າຊຳລະ 50%'
    },
    {
      id: 'sup_03',
      name: 'Bangkok Network Solutions Co., Ltd',
      contactPerson: 'Mr. Somchai Prasert',
      phone: '+66 81 234 5678',
      email: 'export@bkk-network.co.th',
      address: 'Bangkok, Thailand',
      terms: 'T/T Advance, ສົ່ງຂ້າມຂົວມິດຕະພາບ 1'
    }
  ],

  // Products with Model, SN/MAC, Supplier, Cost, Profit %, Sale Price
  products: [
    {
      id: 'prod_01',
      sku: 'CCTV-0001',
      name: 'ກ້ອງວົງຈອນປິດ Hikvision 2MP IP ColorVu',
      model: 'DS-2CD1027G0-L',
      snOrMac: 'SN-HK2MP-8801',
      categoryId: 'cat_cctv',
      brandId: 'br_hik',
      supplierId: 'sup_01',
      supplierName: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      costPrice: 420000,
      profitMargin: 54.76, // %
      salePrice: 650000,
      minStock: 2,
      unit: 'ໜ່ວຍ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200',
      description: 'ກ້ອງ IP ຄວາມລະອຽດ 2MP ພາບສີ 24 ຊົ່ວໂມງ, ກັນນ້ຳ IP67'
    },
    {
      id: 'prod_02',
      sku: 'CCTV-0002',
      name: 'ເຄື່ອງບັນທຶກ NVR Hikvision 8 Channel 4K PoE',
      model: 'DS-7608NI-Q1/8P',
      snOrMac: 'MAC: 48:EA:63:77:22:11',
      categoryId: 'cat_cctv',
      brandId: 'br_hik',
      supplierId: 'sup_01',
      supplierName: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      costPrice: 1450000,
      profitMargin: 48.28,
      salePrice: 2150000,
      minStock: 1,
      unit: 'ເຄື່ອງ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200',
      description: 'ຮອງຮັບກ້ອງ 8 ຊ່ອງ, ມີ 8 PoE Ports'
    },
    {
      id: 'prod_03',
      sku: 'NET-0001',
      name: 'Ubiquiti UniFi 6 Pro Access Point Wi-Fi 6',
      model: 'U6-Pro',
      snOrMac: 'MAC: 68:D7:9A:88:55:01',
      categoryId: 'cat_net',
      brandId: 'br_ubnt',
      supplierId: 'sup_01',
      supplierName: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      costPrice: 2350000,
      profitMargin: 36.17,
      salePrice: 3200000,
      minStock: 2,
      unit: 'ໜ່ວຍ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
      description: 'Dual-band Wi-Fi 6, ຄວາມໄວສູງສຸດ 5.3 Gbps'
    },
    {
      id: 'prod_04',
      sku: 'NET-0002',
      name: 'Cisco CBS250 24-Port Gigabit PoE Switch',
      model: 'CBS250-24P-4G',
      snOrMac: 'SN: FDO24320XYZ',
      categoryId: 'cat_net',
      brandId: 'br_cisco',
      supplierId: 'sup_02',
      supplierName: 'ບໍລິສັດ ລາວ ເຕັກໂນໂລຢີ ດິສຕຣິບິວເຕີ ຈຳກັດ',
      costPrice: 4800000,
      profitMargin: 37.5,
      salePrice: 6600000,
      minStock: 1,
      unit: 'ເຄື່ອງ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200',
      description: '24-Port PoE+ 195W, 4x Gigabit SFP'
    },
    {
      id: 'prod_05',
      sku: 'NET-0003',
      name: 'MikroTik hEX RB750Gr3 Gigabit Router',
      model: 'RB750Gr3',
      snOrMac: 'MAC: B8:69:F4:33:11:00',
      categoryId: 'cat_net',
      brandId: 'br_mikrotik',
      supplierId: 'sup_02',
      supplierName: 'ບໍລິສັດ ລາວ ເຕັກໂນໂລຢີ ດິສຕຣິບິວເຕີ ຈຳກັດ',
      costPrice: 850000,
      profitMargin: 47.06,
      salePrice: 1250000,
      minStock: 2,
      unit: 'ໜ່ວຍ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200',
      description: '5-Port Gigabit Ethernet Router, CPU Dual-Core 880MHz'
    },
    {
      id: 'prod_06',
      sku: 'SRV-0001',
      name: 'Dell PowerEdge T150 Tower Server',
      model: 'T150-E2314-16G-2TB',
      snOrMac: 'Service Tag: 8XYZ123',
      categoryId: 'cat_srv',
      brandId: 'br_dell',
      supplierId: 'sup_01',
      supplierName: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      costPrice: 16800000,
      profitMargin: 33.93,
      salePrice: 22500000,
      minStock: 1,
      unit: 'ເຄື່ອງ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=200',
      description: 'Xeon E-2314 2.8GHz, 16GB ECC DDR4, 2TB Enterprise SATA'
    },
    {
      id: 'prod_07',
      sku: 'POS-0001',
      name: 'Sunmi T2 Lite Dual Screen Android POS',
      model: 'T2 Lite 15.6"+10.1"',
      snOrMac: 'SN: SM-T2-2026-8811',
      categoryId: 'cat_pos',
      brandId: 'br_sunmi',
      supplierId: 'sup_03',
      supplierName: 'Bangkok Network Solutions Co., Ltd',
      costPrice: 4900000,
      profitMargin: 38.78,
      salePrice: 6800000,
      minStock: 1,
      unit: 'ຊຸດ',
      hasSn: 1,
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=200',
      description: 'Dual screen 15.6" + 10.1", Octa-core CPU'
    },
    {
      id: 'prod_08',
      sku: 'CAB-0001',
      name: 'ສາຍ LAN LINK CAT6 UTP Outdoor Double Jacket 305M',
      model: 'US-9106OUT',
      snOrMac: 'LOT: 2026-08',
      categoryId: 'cat_cab',
      brandId: 'br_cisco',
      supplierId: 'sup_02',
      supplierName: 'ບໍລິສັດ ລາວ ເຕັກໂນໂລຢີ ດິສຕຣິບິວເຕີ ຈຳກັດ',
      costPrice: 1250000,
      profitMargin: 32.0,
      salePrice: 1650000,
      minStock: 4,
      unit: 'ກ່ອງ',
      hasSn: 0,
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200',
      description: 'ສາຍແລນຄຸນນະພາບສູງ ທົນແດດ ທົນຝົນ'
    }
  ],

  // Serial Numbers
  productSerials: [
    {
      id: 'sn_01',
      productId: 'prod_01',
      serialNumber: 'SN-HK2MP-2026-001',
      macAddress: '48:EA:63:12:34:56',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 24,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ A1',
      receivedDate: '2026-08-15',
      notes: 'ສະພາບສົມບູນ 100%'
    },
    {
      id: 'sn_02',
      productId: 'prod_01',
      serialNumber: 'SN-HK2MP-2026-002',
      macAddress: '48:EA:63:12:34:57',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 24,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ A1',
      receivedDate: '2026-08-15',
      notes: 'ສະພາບສົມບູນ 100%'
    },
    {
      id: 'sn_03',
      productId: 'prod_01',
      serialNumber: 'SN-HK2MP-2026-003',
      macAddress: '48:EA:63:12:34:58',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 24,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ A1',
      receivedDate: '2026-08-15',
      notes: 'ສະພາບສົມບູນ 100%'
    },
    {
      id: 'sn_04',
      productId: 'prod_02',
      serialNumber: 'SN-NVR8CH-9941',
      macAddress: '48:EA:63:77:22:11',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 24,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ A2',
      receivedDate: '2026-08-15',
      notes: 'Firmware Update ແລ້ວ'
    },
    {
      id: 'sn_05',
      productId: 'prod_03',
      serialNumber: 'SN-U6PRO-5501',
      macAddress: '68:D7:9A:88:55:01',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 12,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ B1',
      receivedDate: '2026-08-20',
      notes: 'ພ້ອມຊຸດຍຶດ'
    },
    {
      id: 'sn_06',
      productId: 'prod_04',
      serialNumber: 'SN-CISCO-24P-7721',
      macAddress: '00:1E:13:99:AA:BB',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 36,
      location: 'ຫ້ອງ Server Room A',
      receivedDate: '2026-08-10',
      notes: 'Switch 24 PoE'
    },
    {
      id: 'sn_07',
      productId: 'prod_05',
      serialNumber: 'SN-MIK-HEX-3311',
      macAddress: 'B8:69:F4:33:11:00',
      status: 'in_stock',
      purchaseOrderId: 'po_01',
      invoiceId: null,
      warrantyMonths: 12,
      location: 'ສາງໃຫຍ່ ຊັ້ນວາງ B2',
      receivedDate: '2026-08-22',
      notes: 'RouterOS Tested'
    },
    {
      id: 'sn_08',
      productId: 'prod_01',
      serialNumber: 'SN-HK2MP-OLD-01',
      macAddress: '48:EA:63:00:11:22',
      status: 'sold',
      purchaseOrderId: 'po_00',
      invoiceId: 'doc_inv_01',
      warrantyMonths: 24,
      location: 'ສົ່ງມອບແລ້ວ',
      receivedDate: '2026-07-01',
      soldDate: '2026-08-10',
      notes: 'ຕິດຕັ້ງໃຫ້ ລາວ ພາຊາ ຜູກໃບເກັບເງິນ INV-2026-0042'
    }
  ],

  // Purchase Orders
  purchaseOrders: [
    {
      id: 'po_01',
      poNumber: 'PO-2026-001',
      supplierId: 'sup_01',
      supplierName: 'ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ ຈຳກັດ',
      orderDate: '2026-08-10',
      expectedDate: '2026-08-15',
      status: 'received',
      totalAmount: 18500000,
      shippingCost: 150000,
      notes: 'ສັ່ງຊື້ກ້ອງ CCTV ແລະ ອຸປະກອນ Network ເຂົ້າສາງໃຫຍ່',
      items: [
        { productId: 'prod_01', productName: 'ກ້ອງວົງຈອນປິດ Hikvision 2MP', qty: 3, unitPrice: 420000, total: 1260000 },
        { productId: 'prod_02', productName: 'ເຄື່ອງບັນທຶກ NVR Hikvision 8CH', qty: 1, unitPrice: 1450000, total: 1450000 },
        { productId: 'prod_03', productName: 'Ubiquiti UniFi 6 Pro Access Point', qty: 2, unitPrice: 2350000, total: 4700000 }
      ]
    },
    {
      id: 'po_02',
      poNumber: 'PO-2026-002',
      supplierId: 'sup_02',
      supplierName: 'ບໍລິສັດ ລາວ ເຕັກໂນໂລຢີ ດິສຕຣິບິວເຕີ ຈຳກັດ',
      orderDate: '2026-09-18',
      expectedDate: '2026-09-28',
      status: 'ordered',
      totalAmount: 14200000,
      shippingCost: 200000,
      notes: 'ສັ່ງຊື້ Router MikroTik 10 ໜ່ວຍ + ສາຍ LAN LINK 5 ກ່ອງ (ກຳລັງຂົນສົ່ງ)',
      items: [
        { productId: 'prod_05', productName: 'MikroTik hEX RB750Gr3', qty: 10, unitPrice: 850000, total: 8500000 },
        { productId: 'prod_08', productName: 'ສາຍ LAN LINK CAT6 UTP Outdoor', qty: 5, unitPrice: 1140000, total: 5700000 }
      ]
    }
  ],

  // Documents
  documents: [
    {
      id: 'doc_qt_01',
      docNumber: 'QT-2026-0089',
      docType: 'quotation',
      refDocId: null,
      customerId: 'cust_01',
      customerName: 'ທະນາຄານຮ່ວມພັດທະນາ (JDB Bank)',
      date: '2026-09-20',
      dueDate: '2026-10-20',
      status: 'sent',
      subtotal: 12500000,
      taxRate: 7,
      taxAmount: 875000,
      discount: 375000,
      grandTotal: 13000000,
      notes: 'ໃບສະເໜີລາຄາຕິດຕັ້ງລະບົບ Network Backup & Firewall ປະຈຳສຳນັກງານ',
      items: [
        { sku: 'NET-0002', name: 'Cisco CBS250 24-Port Gigabit PoE Switch', qty: 1, unitPrice: 6600000, total: 6600000 },
        { sku: 'NET-0003', name: 'MikroTik hEX RB750Gr3 Gigabit Router', qty: 2, unitPrice: 1250000, total: 2500000 },
        { sku: 'SRV-CUSTOM', name: 'ຄ່າບໍລິການຕິດຕັ້ງ ແລະ Config ລະບົບ Network VLAN', qty: 1, unitPrice: 3400000, total: 3400000 }
      ],
      createdBy: 'ສົມສັກ ແກ້ວມະນີ'
    },
    {
      id: 'doc_inv_01',
      docNumber: 'INV-2026-0042',
      docType: 'invoice',
      refDocId: 'QT-2026-0089',
      customerId: 'cust_02',
      customerName: 'ໂຮງແຮມ ລາວ ພາຊາ (Lao Plaza Hotel)',
      date: '2026-09-10',
      dueDate: '2026-09-25',
      status: 'paid',
      subtotal: 19800000,
      taxRate: 7,
      taxAmount: 1386000,
      discount: 686000,
      grandTotal: 20500000,
      notes: 'ຄ່າງວດທີ 1: ຕິດຕັ້ງລະບົບ Wi-Fi UniFi ຊັ້ນ 1-3',
      items: [
        { sku: 'NET-0001', name: 'Ubiquiti UniFi 6 Pro Access Point Wi-Fi 6', qty: 4, unitPrice: 3200000, total: 12800000 },
        { sku: 'CAB-0001', name: 'ສາຍ LAN LINK CAT6 UTP Outdoor', qty: 2, unitPrice: 1650000, total: 3300000 },
        { sku: 'SRV-CUSTOM', name: 'ຄ່າແຮງງານຕິດຕັ້ງ ແລະ ຕັ້ງຄ່າ UniFi Controller', qty: 1, unitPrice: 3700000, total: 3700000 }
      ],
      createdBy: 'ຈຳປາ ວົງວິໄລ'
    },
    {
      id: 'doc_pos_01',
      docNumber: 'POS-2026-0155',
      docType: 'pos',
      refDocId: null,
      customerId: 'cust_04',
      customerName: 'ທ່ານ ສົມສັກ ວົງສາ',
      date: '2026-09-23',
      dueDate: '2026-09-23',
      status: 'paid',
      subtotal: 2600000,
      taxRate: 0,
      taxAmount: 0,
      discount: 100000,
      grandTotal: 2500000,
      notes: 'ຊື້ກ້ອງວົງຈອນປິດ 4 ໜ່ວຍ',
      items: [
        { sku: 'CCTV-0001', name: 'ກ້ອງວົງຈອນປິດ Hikvision 2MP IP ColorVu', qty: 4, unitPrice: 650000, total: 2600000 }
      ],
      createdBy: 'ຄຳຫຼ້າ ສຸລິຍະ'
    },
    {
      id: 'doc_del_01',
      docNumber: 'DO-2026-0015',
      docType: 'delivery',
      refDocId: 'QT-2026-0089',
      customerId: 'cust_01',
      customerName: 'ທະນາຄານຮ່ວມພັດທະນາ (JDB Bank)',
      date: '2026-09-22',
      status: 'delivered',
      deliveryAddress: 'ສຳນັກງານໃຫຍ່ JDB, ຖະໜົນລ້ານຊ້າງ, ນະຄອນຫຼວງວຽງຈັນ',
      phone: '020 5551 2345',
      driver: 'ສຸກສະຫວັນ ແສງຈັນ (ຊ່າງເຕັກນິກ)',
      vehicle: 'ກຳແພງນະຄອນ ບກ 4821',
      notes: 'ຈັດສົ່ງອຸປະກອນ Network Backup & Firewall ຄົບຖ້ວນຮຽບຮ້ອຍ',
      grandTotal: 13000000,
      items: [
        { name: 'Cisco CBS250 24-Port Gigabit PoE Switch', model: 'CBS250-24P-4G', qty: 1, unit: 'ໜ່ວຍ', remarks: 'ກວດສອບເຄື່ອງໃໝ່ 100%' },
        { name: 'MikroTik hEX RB750Gr3 Gigabit Router', model: 'RB750Gr3', qty: 2, unit: 'ໜ່ວຍ', remarks: 'ພ້ອມ Adapter ຄົບຊຸດ' },
        { name: 'ສາຍ Patch Cord Cat6 3m', model: 'AMP Cat6', qty: 5, unit: 'ເສັ້ນ', remarks: 'ສາຍສຳເລັດຮູບ' }
      ],
      createdBy: 'ສົມສັກ ແກ້ວມະນີ'
    }
  ],

  // Project Categories (ໝວດງານໂຄງການໄອທີ)
  projectCategories: [
    { id: 'pcat_01', name: 'Network & Security', description: 'ຕິດຕັ້ງລະບົບເຄືອຂ່າຍ ແລະ ຄວາມປອດໄພ' },
    { id: 'pcat_02', name: 'CCTV Installation', description: 'ຕິດຕັ້ງກ້ອງວົງຈອນປິດ' },
    { id: 'pcat_03', name: 'Server & Cloud', description: 'ເຊີບເວີ ແລະ ລະບົບ Cloud' },
    { id: 'pcat_04', name: 'Software & POS', description: 'ພັດທະນາລະບົບ ແລະ ຕິດຕັ້ງ POS' },
    { id: 'pcat_05', name: 'IT Infrastructure', description: 'ໂຄງສ້າງພື້ນຖານລະບົບໄອທີ' }
  ],

  // Projects
  projects: [
    {
      id: 'proj_01',
      code: 'PRJ-2026-01',
      title: 'ຕິດຕັ້ງລະບົບ Network Wi-Fi & CCTV ໂຮງແຮມ ລາວ ພາຊາ',
      customerId: 'cust_02',
      customerName: 'ໂຮງແຮມ ລາວ ພາຊາ',
      category: 'Network & Security',
      leaderId: 'emp_02',
      leaderName: 'ສົມໄຊ ໄຊຍະວົງ',
      quotationDocNumber: 'QT-2026-0089',
      invoiceDocNumber: 'INV-2026-0042',
      startDate: '2026-09-01',
      deadline: '2026-10-15',
      budget: 78000000,
      progress: 75,
      status: 'in_progress',
      notes: 'ລວມຕິດຕັ້ງ UniFi AP 18 ຈຸດ + ກ້ອງ IP 32 ຈຸດ',
      milestones: [
        { id: 'm_01_1', name: 'ງວດທີ 1: ມັດຈຳເລີ່ມໂຄງການ', percent: 30, amount: 23400000, status: 'paid', invoiceDocNumber: 'INV-2026-0042', paidDate: '2026-09-02' },
        { id: 'm_01_2', name: 'ງວດທີ 2: ສົ່ງມອບອຸປະກອນ & ຕິດຕັ້ງ Hardware', percent: 50, amount: 39000000, status: 'invoiced', invoiceDocNumber: 'INV-2026-0043', paidDate: null },
        { id: 'm_01_3', name: 'ງວດທີ 3: ທົດສອບລະບົບ & ສົ່ງມອບວຽກຂັ້ນສຸດທ້າຍ', percent: 20, amount: 15600000, status: 'pending', invoiceDocNumber: null, paidDate: null }
      ]
    },
    {
      id: 'proj_02',
      code: 'PRJ-2026-02',
      title: 'ພັດທະນາ ແລະ ຕິດຕັ້ງລະບົບ ERP ສາງສິນຄ້າ & POS 3 ສາຂາ',
      customerId: 'cust_03',
      customerName: 'ຮ້ານກາເຟ ອາມາໂຊນ ສາຂາ ດົງໂດກ',
      category: 'Software & POS',
      leaderId: 'emp_01',
      leaderName: 'ສົມສັກ ແກ້ວມະນີ',
      quotationDocNumber: 'QT-2026-0075',
      invoiceDocNumber: '',
      startDate: '2026-08-15',
      deadline: '2026-09-30',
      budget: 35000000,
      progress: 90,
      status: 'in_progress',
      notes: 'ກຳລັງທົດສອບລະບົບ POS ແລະ Train ພະນັກງານ',
      milestones: [
        { id: 'm_02_1', name: 'ງວດທີ 1: ມັດຈຳເລີ່ມພັດທະນາ Software', percent: 40, amount: 14000000, status: 'paid', invoiceDocNumber: 'INV-2026-0038', paidDate: '2026-08-16' },
        { id: 'm_02_2', name: 'ງວດທີ 2: ສົ່ງມອບລະບົບ & Train ພະນັກງານ 3 ສາຂາ', percent: 60, amount: 21000000, status: 'pending', invoiceDocNumber: null, paidDate: null }
      ]
    },
    {
      id: 'proj_03',
      code: 'PRJ-2026-03',
      title: 'ຍົກລະດັບ Server Rack & Data Backup ທະນາຄານຮ່ວມພັດທະນາ',
      customerId: 'cust_01',
      customerName: 'ທະນາຄານຮ່ວມພັດທະນາ (JDB Bank)',
      category: 'Server & Cloud',
      leaderId: 'emp_02',
      leaderName: 'ສົມໄຊ ໄຊຍະວົງ',
      quotationDocNumber: 'QT-2026-0060',
      invoiceDocNumber: 'INV-2026-0030',
      startDate: '2026-07-01',
      deadline: '2026-08-30',
      budget: 45000000,
      progress: 100,
      status: 'completed',
      notes: 'ສົ່ງມອບວຽກຮຽບຮ້ອຍ ມີໃບກວດຮັບວຽກແລ້ວ',
      milestones: [
        { id: 'm_03_1', name: 'ງວດທີ 1: ມັດຈຳ 50%', percent: 50, amount: 22500000, status: 'paid', invoiceDocNumber: 'INV-2026-0029', paidDate: '2026-07-02' },
        { id: 'm_03_2', name: 'ງວດທີ 2: ສຳເລັດການຕິດຕັ້ງ & ສົ່ງມອບ 50%', percent: 50, amount: 22500000, status: 'paid', invoiceDocNumber: 'INV-2026-0030', paidDate: '2026-08-28' }
      ]
    }
  ],

  // Project checklist tasks
  tasks: [
    { id: 'task_01', projectId: 'proj_01', title: 'ລາກສາຍ LAN CAT6 ຊັ້ນ 3-4', assignedTo: 'ສົມໄຊ ໄຊຍະວົງ', status: 'done', deadline: '2026-09-20' },
    { id: 'task_02', projectId: 'proj_01', title: 'ຕັ້ງຄ່າ UniFi Cloud Gateway & SSID Guest', assignedTo: 'ສົມໄຊ ໄຊຍະວົງ', status: 'in_progress', deadline: '2026-09-26' },
    { id: 'task_03', projectId: 'proj_01', title: 'ທົດສອບຄວາມໄວສັນຍານ Wi-Fi ທຸກມຸມຫ້ອງ', assignedTo: 'ສົມໄຊ ໄຊຍະວົງ', status: 'todo', deadline: '2026-10-02' }
  ],

  // IT Job Categories (ປະເພດວຽກໄອທີ: Onsite Support, ແປງຄອມ, ແປງປຣິນເຕີ, ລົງ Windows/Software)
  itJobCategories: [
    { id: 'cat_onsite', key: 'onsite', name: 'Onsite Support', description: 'ລົງກວດເຊັກໜ້າວຽກຕົວຈິງ', color: 'cyan' },
    { id: 'cat_repair_pc', key: 'repair_pc', name: 'ວຽກແປງຄອມ', description: 'ສ້ອມແປງ PC / Desktop / Laptop', color: 'amber' },
    { id: 'cat_printer', key: 'printer', name: 'ແປງປຣິນເຕີ', description: 'ສ້ອມແປງ Printer / Scanner / POS', color: 'purple' },
    { id: 'cat_network', key: 'network', name: 'ວາງສາຍ Network', description: 'ຕິດຕັ້ງ Wi-Fi / LAN / CCTV', color: 'emerald' },
    { id: 'cat_software', key: 'software', name: 'Software / Windows', description: 'ລົງ Windows / License / ແກ້ໄວຣັສ', color: 'rose' }
  ],

  // IT SERVICE JOBS (ໜ້າວຽກໄອທີ: Onsite Support, ແປງຄອມ, ແປງປຣິນເຕີ, ລົງ Windows/Software)
  itJobs: [
    {
      id: 'job_01',
      jobCode: 'JOB-2026-001',
      customerName: 'ໂຮງແຮມ ລາວ ພາຊາ (Lao Plaza Hotel)',
      customerPhone: '021 218 800',
      jobType: 'onsite', // onsite, repair_pc, printer, network, software
      deviceModel: 'UniFi Switch 24 PoE / AP WiFi',
      serialOrMac: 'MAC: 00:1E:13:99:AA:BB',
      issueDescription: 'Port 12-16 ໄຟ PoE ບໍ່ຈ່າຍໃຫ້ກ້ອງ, ສັນຍານຫຼຸດ, ຕ້ອງການກວດເຊັກ Onsite ດ່ວນ',
      resolution: 'ກວດເຊັກແລ້ວພົບສາຍ CAT6 ເດີນໃຕ້ເພດານຖືກໜູກັດຂາດ, ໄດ້ທຳການສ້ອມຕໍ່ສາຍ ແລະ ປ່ຽນຫົວ RJ45 ໃໝ່ 4 ຫົວ, ທົດສອບ Link 1Gbps ແລະ PoE ຈ່າຍໄຟປົກກະຕິ',
      technicianId: 'emp_02',
      technicianName: 'ສົມໄຊ ໄຊຍະວົງ',
      serviceFee: 450000,
      partsReplaced: 'ຫົວ Jack RJ45 x4, Patch Cord CAT6',
      status: 'in_progress', // pending, in_progress, completed, delivered
      receivedDate: '2026-09-24',
      completedDate: null,
      notes: 'ນັດໝາຍເຂົ້າໜ້າວຽກເວລາ 10:00 ໂມງ'
    },
    {
      id: 'job_02',
      jobCode: 'JOB-2026-002',
      customerName: 'ທ່ານ ສົມສັກ ວົງສາ',
      customerPhone: '020 9911 4455',
      jobType: 'repair_pc',
      deviceModel: 'PC Desktop Gaming Core i7',
      serialOrMac: 'SN: PC-2026-CUSTOM',
      issueDescription: 'ເປີດຕິດບໍ່ຂຶ້ນພາບ, ພັດລົມໝຸນແລ້ວດັບ, ຕ້ອງການປ່ຽນ Power Supply 750W 80+ Bronze',
      resolution: 'ທົດສອບແລ້ວພົບ Power Supply ເສຍຈ່າຍໄຟ 12V ບໍ່ອອກ, ໄດ້ປ່ຽນ Power Supply Corsair CV750 750W ໃໝ່, ທົດສອບ Stress Test 1 ຊົ່ວໂມງ ຜ່ານ 100%',
      technicianId: 'emp_02',
      technicianName: 'ສົມໄຊ ໄຊຍະວົງ',
      serviceFee: 250000,
      partsReplaced: 'Power Supply Corsair CV750 750W',
      status: 'pending',
      receivedDate: '2026-09-25',
      completedDate: null,
      notes: 'ລູກຄ້າຝາກເຄື່ອງໄວ້ໜ້າຮ້ານ'
    },
    {
      id: 'job_03',
      jobCode: 'JOB-2026-003',
      customerName: 'ຮ້ານກາເຟ ອາມາໂຊນ ດົງໂດກ',
      customerPhone: '020 5511 2233',
      jobType: 'printer',
      deviceModel: 'Epson TM-T82X Thermal POS Printer',
      serialOrMac: 'SN: EP-T82-99124',
      issueDescription: 'ຫົວພິມຕິດຂັດ, ຕັດເຈ້ຍບໍ່ໄດ້, ໄຟ Error ສີແດງກະພິບ',
      resolution: 'ຖອດຊຸດໃບມີດຕັດເຈ້ຍອອກມາລ້າງຄາບຝຸ່ນ ແລະ ປ່ຽນຊຸດ Cutter Blade Assembly ໃໝ່, ທົດສອບພິມ Slip 10 ຄັ້ງ ຕັດເຈ້ຍຄົມຊັດປົກກະຕິ',
      technicianId: 'emp_04',
      technicianName: 'ຄຳຫຼ້າ ສຸລິຍະ',
      serviceFee: 150000,
      partsReplaced: 'Cutter Blade & Gear Assembly',
      status: 'completed',
      receivedDate: '2026-09-22',
      completedDate: '2026-09-23',
      notes: 'ທົດສອບພິມໃບບິນ 10 ຄັ້ງ ໃຊ້ງານປົກກະຕິແລ້ວ'
    },
    {
      id: 'job_04',
      jobCode: 'JOB-2026-004',
      customerName: 'ທ່ານ ນາງ ແສງເດືອນ ມະນີວົງ',
      customerPhone: '020 5544 3322',
      jobType: 'software',
      deviceModel: 'Asus ZenBook 14 OLED',
      serialOrMac: 'SN: N1N0CV00812345',
      issueDescription: 'ຕິດໄວຣັສ, ເຄື່ອງຊ້າ, ຕ້ອງການລົງ Windows 11 Pro ແທ້ + MS Office 365 + Backup ຂໍ້ມູນ',
      resolution: 'Format Clean Install Windows 11 Pro 64-bit, ລົງ Driver ຄົບ, ລົງ Microsoft Office 365, Restore ຂໍ້ມູນ Desktop/Documents ຂອງລູກຄ້າຄືນຄົບຖ້ວນ',
      technicianId: 'emp_02',
      technicianName: 'ສົມໄຊ ໄຊຍະວົງ',
      serviceFee: 180000,
      partsReplaced: 'None (Clean Install)',
      status: 'delivered',
      receivedDate: '2026-09-20',
      completedDate: '2026-09-21',
      notes: 'ລູກຄ້າມາຮັບເຄື່ອງ ແລະ ຊຳລະເງິນແລ້ວ'
    }
  ],

  // Transactions
  transactions: [
    {
      id: 'tx_01',
      type: 'income',
      category: 'service_fee',
      amount: 20500000,
      date: '2026-09-10',
      refDoc: 'INV-2026-0042',
      description: 'ຮັບຊຳລະເງິນຄ່າງວດຕິດຕັ້ງ Wi-Fi ໂຮງແຮມ ລາວ ພາຊາ',
      paymentMethod: 'ເງີນໂອນ (Transfer)',
      recordedBy: 'ຈຳປາ ວົງວິໄລ'
    },
    {
      id: 'tx_02',
      type: 'income',
      category: 'product_sale',
      amount: 2500000,
      date: '2026-09-23',
      refDoc: 'POS-2026-0155',
      description: 'ຂາຍກ້ອງວົງຈອນປິດໜ້າຮ້ານ 4 ໜ່ວຍ ໃຫ້ ທ່ານ ສົມສັກ',
      paymentMethod: 'ເງິນສົດ (Cash)',
      recordedBy: 'ຄຳຫຼ້າ ສຸລິຍະ'
    },
    {
      id: 'tx_03',
      type: 'expense',
      category: 'cost_of_goods',
      amount: 18500000,
      date: '2026-08-15',
      refDoc: 'PO-2026-001',
      description: 'ຊຳລະຄ່າສິນຄ້າສັ່ງເຂົ້າສາງ ໃຫ້ ບໍລິສັດ ວຽງຈັນ ໄອທີ ຊັບພລາຍ',
      paymentMethod: 'ເງີນໂອນ (Transfer)',
      recordedBy: 'ຈຳປາ ວົງວິໄລ'
    },
    {
      id: 'tx_04',
      type: 'expense',
      category: 'salary',
      amount: 14000000,
      date: '2026-09-01',
      refDoc: 'PAYROLL-09-26',
      description: 'ຈ່າຍເງິນເດືອນພະນັກງານໄອທີ ແລະ ຊ່າງ ປະຈຳເດືອນ 8/2026',
      paymentMethod: 'ເງີນໂອນ (Transfer)',
      recordedBy: 'ຈຳປາ ວົງວິໄລ'
    },
    {
      id: 'tx_05',
      type: 'expense',
      category: 'utility_rent',
      amount: 3500000,
      date: '2026-09-05',
      refDoc: 'RENT-09',
      description: 'ຄ່າເຊົ່າສະຖານທີ່ຮ້ານ ແລະ ຄ່ານ້ຳ-ຄ່າໄຟຟ້າ',
      paymentMethod: 'ໂອນຜ່ານບັນຊີ',
      recordedBy: 'ຈຳປາ ວົງວິໄລ'
    }
  ],

  // Client Systems
  clientSystems: [
    {
      id: 'sys_01',
      systemName: 'ລະບົບ ERP & ສາງສິນຄ້າອອນລາຍ',
      customerId: 'cust_03',
      customerName: 'ຮ້ານກາເຟ ອາມາໂຊນ ສາຂາ ດົງໂດກ',
      domainUrl: 'https://pos-dongdok.lao-amazon.la',
      hostingProvider: 'Cloudflare Workers + D1 Database',
      launchDate: '2026-05-10',
      expiryDate: '2027-05-10',
      slaType: 'SLA Gold 24/7',
      status: 'active',
      price: 35000000,
      techStack: 'TailwindCSS, SQLite, Node.js, Cloudflare',
      notes: 'ສັນຍາ Support 1 ປີ, Backup ຂໍ້ມູນທຸກໆອາທິດ'
    },
    {
      id: 'sys_02',
      systemName: 'ລະບົບ Captive Portal Wi-Fi ໂຮງແຮມ',
      customerId: 'cust_02',
      customerName: 'ໂຮງແຮມ ລາວ ພາຊາ',
      domainUrl: 'https://wifi-portal.laoplazahotel.la',
      hostingProvider: 'On-premise UniFi Cloud Key Enterprise',
      launchDate: '2026-09-05',
      expiryDate: '2027-09-05',
      slaType: 'SLA Platinum',
      status: 'active',
      price: 25000000,
      techStack: 'UniFi Network API, OAuth, RADIUS Server',
      notes: 'ເຊື່ອມຕໍ່ລະບົບຈອງຫ້ອງພັກ Hotel PMS'
    }
  ],

  activityLogs: []
};

// ----------------------------------------------------------------------------
// DATABASE MANAGER CLASS
// ----------------------------------------------------------------------------
class DatabaseManager {
  constructor() {
    this.data = this.loadLocal();
    this.connectionStatus = 'offline';
    this.listeners = [];
  }

  loadLocal() {
    try {
      const stored = localStorage.getItem(DB_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.employees && Array.isArray(parsed.employees)) {
          const adminEmp = parsed.employees.find(e => e.username && e.username.toLowerCase() === 'admin');
          // If admin has old default password or its hash, upgrade to p@ss4admin
          if (adminEmp && (adminEmp.password === 'admin123' || adminEmp.password === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')) {
            adminEmp.password = 'p@ss4admin';
            delete adminEmp.passwordHash;
          }
        }
        return {
          ...DEFAULT_DATABASE,
          ...parsed,
          settings: { ...DEFAULT_DATABASE.settings, ...(parsed.settings || {}) },
          itJobs: parsed.itJobs || DEFAULT_DATABASE.itJobs,
          itJobCategories: (parsed.itJobCategories && parsed.itJobCategories.length > 0) ? parsed.itJobCategories : DEFAULT_DATABASE.itJobCategories,
          projectCategories: (parsed.projectCategories && parsed.projectCategories.length > 0) ? parsed.projectCategories : DEFAULT_DATABASE.projectCategories,
          clientSystems: (parsed.clientSystems && parsed.clientSystems.length > 0) ? parsed.clientSystems : DEFAULT_DATABASE.clientSystems
        };
      }
    } catch (e) {
      console.error('Failed to parse local database:', e);
    }
    this.saveLocal(DEFAULT_DATABASE);
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE));
  }

  saveLocal(data) {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(data || this.data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  notify() {
    this.saveLocal();
    this.listeners.forEach(fn => fn(this.data));
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  // --------------------------------------------------------------------------
  // CONTINUOUS SKU GENERATOR (SKU Generator ອັດຕະໂນມັດແບບຕໍ່ເນື່ອງ)
  // --------------------------------------------------------------------------
  generateNextSku(categoryId = null) {
    const products = this.data.products || [];
    let prefix = 'IT';

    if (categoryId) {
      const cat = this.data.categories.find(c => c.id === categoryId);
      if (cat && cat.code) {
        prefix = cat.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
      }
    }

    // Filter products matching this prefix
    let maxNum = 0;
    const regex = new RegExp(`^${prefix}-(\\d+)`, 'i');

    products.forEach(p => {
      const match = (p.sku || '').match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}-${nextNum.toString().padStart(4, '0')}`;
  }

  // --------------------------------------------------------------------------
  // CLOUDFLARE D1 SYNC
  // --------------------------------------------------------------------------
  async testConnection(workerUrl = null) {
    let targetUrl = (workerUrl || this.data.settings.d1WorkerUrl || '').trim();
    this.connectionStatus = 'loading';
    this.updateStatusDot('loading');

    if (!targetUrl) {
      this.connectionStatus = 'offline';
      this.updateStatusDot('offline');
      return {
        online: false,
        mode: 'local_database',
        message: 'ຍັງບໍ່ທັນມີ Cloudflare Worker URL. ລະບົບກຳລັງໃຊ້ງານ Local Database (Offline).',
        latency: 0,
        sqlite_version: 'Local Browser Engine'
      };
    }

    try {
      const startTime = performance.now();
      const endpoint = targetUrl.replace(/\/+$/, '') + '/api/ping';
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });
      const latency = Math.round(performance.now() - startTime);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('URL ທີ່ປ້ອນແມ່ນ URL ຂອງໜ້າເວັບ (Frontend), ບໍ່ແມ່ນ Worker API.');
        }
        const result = await response.json();
        this.connectionStatus = 'online';
        this.updateStatusDot('online');
        return {
          online: true,
          mode: 'cloudflare_d1',
          message: 'Cloudflare D1 ເຊື່ອມຕໍ່ສຳເລັດແລ້ວ! ຖານຂໍ້ມູນພ້ອມໃຊ້ງານ.',
          latency,
          server_time: result.server_time,
          sqlite_version: result.sqlite_version || 'Cloudflare D1 SQLite Engine'
        };
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err) {
      this.connectionStatus = 'offline';
      this.updateStatusDot('offline');
      return {
        online: false,
        error: err.message,
        message: `ບໍ່ສາມາດເຊື່ອມຕໍ່ Cloudflare D1 ໄດ້ (${err.message})`
      };
    }
  }

  async syncToCloudflare() {
    const targetUrl = (this.data.settings.d1WorkerUrl || '').trim();
    if (!targetUrl) {
      return { success: false, message: 'ກະລຸນາໃສ່ Cloudflare Worker URL ໃນໜ້າຕັ້ງຄ່າກ່ອນ' };
    }

    try {
      this.updateStatusDot('loading');
      const endpoint = targetUrl.replace(/\/+$/, '') + '/api/sync';
      const tablesToSync = ['products', 'productSerials', 'customers', 'documents', 'projects', 'itJobs', 'transactions'];
      for (const table of tablesToSync) {
        const rows = this.data[table] || [];
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, rows })
        });
      }

      this.data.settings.lastSync = new Date().toISOString();
      this.saveLocal();
      this.updateStatusDot('online');
      return { success: true, message: 'ຊິ້ງຂໍ້ມູນທັງໝົດຂຶ້ນ Cloudflare D1 ສຳເລັດແລ້ວ!' };
    } catch (err) {
      this.updateStatusDot('offline');
      return { success: false, error: err.message };
    }
  }

  updateStatusDot(status) {
    const dot = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (!dot) return;

    dot.className = `status-dot ${status}`;
    if (text) {
      if (status === 'online') text.textContent = 'D1 Online';
      else if (status === 'offline') text.textContent = 'D1 Offline (Local)';
      else if (status === 'loading') text.textContent = 'ກຳລັງກວດສອບ...';
    }
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------------------------------
  getCurrentUser() {
    const userStr = sessionStorage.getItem('netd_current_user');
    if (userStr) {
      try { return JSON.parse(userStr); } catch (e) {}
    }
    return null;
  }

  async login(username, password) {
    const cleanUser = username.trim().toLowerCase();
    const hash = await this.hashPassword(password);

    const emp = this.data.employees.find(e => 
      e.username.toLowerCase() === cleanUser &&
      (e.password === password || e.password === hash || (e.passwordHash && e.passwordHash === hash))
    );
    if (emp) {
      if (emp.status === 'resigned') {
        return { success: false, message: 'ບັນຊີນີ້ຖືກປິດການໃຊ້ງານແລ້ວ (ພະນັກງານລາອອກ)' };
      }
      // Upgrade plain text password to SHA-256 hash automatically
      if (emp.password === password) {
        emp.password = hash;
        this.saveLocal();
      }
      sessionStorage.setItem('netd_current_user', JSON.stringify(emp));
      this.logActivity(emp.name, 'ເຂົ້າສູ່ລະບົບ', 'ຄວາມປອດໄພ', `ເຂົ້າສູ່ລະບົບສຳເລັດ (SHA-256 Verified)`);
      return { success: true, user: emp };
    }
    return { success: false, message: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!' };
  }

  logout() {
    const user = this.getCurrentUser();
    if (user) {
      this.logActivity(user.name, 'ອອກຈາກລະບົບ', 'ຄວາມປອດໄພ', `ອອກຈາກລະບົບ`);
    }
    sessionStorage.removeItem('netd_current_user');
  }

  async changePassword(userId, oldPassword, newPassword) {
    const emp = this.data.employees.find(e => e.id === userId);
    if (!emp) return { success: false, message: 'ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້ງານ' };

    const oldHash = await this.hashPassword(oldPassword);
    const isValid = (emp.password === oldPassword || emp.password === oldHash || emp.passwordHash === oldHash);
    if (!isValid) {
      return { success: false, message: 'ລະຫັດຜ່ານເດີມບໍ່ຖືກຕ້ອງ!' };
    }

    const newHash = await this.hashPassword(newPassword);
    emp.password = newHash;
    emp.passwordHash = newHash;
    this.saveLocal();
    this.notify();
    this.logActivity(emp.name, 'ປ່ຽນລະຫັດຜ່ານ', 'ຄວາມປອດໄພ', 'ປ່ຽນລະຫັດຜ່ານສຳເລັດ');
    return { success: true, message: 'ປ່ຽນລະຫັດຜ່ານສຳເລັດຮຽບຮ້ອຍແລ້ວ!' };
  }

  logActivity(user, action, module, details) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    this.data.activityLogs.unshift({
      id: 'act_' + Date.now(),
      user: user || 'ລະບົບ',
      action,
      module,
      details,
      time: `ມື້ນີ້ ${timeStr}`
    });
    if (this.data.activityLogs.length > 30) this.data.activityLogs.pop();
    this.saveLocal();
  }

  // --------------------------------------------------------------------------
  // PRODUCTS & INVENTORY CRUD
  // --------------------------------------------------------------------------
  getCategories() {
    return this.data.categories;
  }

  addCategory(category) {
    category.id = 'cat_' + Date.now();
    this.data.categories.push(category);
    this.notify();
    return category;
  }

  updateCategory(id, updated) {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.categories[idx] = { ...this.data.categories[idx], ...updated };
      this.notify();
    }
  }

  deleteCategory(id) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.notify();
  }

  getProducts() {
    return this.data.products;
  }

  getProductById(id) {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(product) {
    product.id = 'prod_' + Date.now();
    // Calculate profit margin if not set
    if (product.costPrice > 0 && product.salePrice > 0 && !product.profitMargin) {
      product.profitMargin = parseFloat((((product.salePrice - product.costPrice) / product.costPrice) * 100).toFixed(2));
    }
    this.data.products.push(product);
    this.notify();
    return product;
  }

  updateProduct(id, updated) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      if (updated.costPrice > 0 && updated.salePrice > 0 && updated.profitMargin === undefined) {
        updated.profitMargin = parseFloat((((updated.salePrice - updated.costPrice) / updated.costPrice) * 100).toFixed(2));
      }
      this.data.products[idx] = { ...this.data.products[idx], ...updated };
      this.notify();
    }
  }

  deleteProduct(id) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.data.productSerials = this.data.productSerials.filter(s => s.productId !== id);
    this.notify();
  }

  // SERIAL NUMBERS CRUD
  getSerialsByProduct(productId) {
    return this.data.productSerials.filter(s => s.productId === productId);
  }

  getSerialsInStock(productId) {
    return this.data.productSerials.filter(s => s.productId === productId && s.status === 'in_stock');
  }

  addSerial(serialData) {
    const serial = {
      id: 'sn_' + Date.now() + Math.random().toString(36).substr(2, 4),
      status: 'in_stock',
      receivedDate: new Date().toISOString().split('T')[0],
      ...serialData
    };
    this.data.productSerials.push(serial);
    this.notify();
    return serial;
  }

  updateSerial(id, updated) {
    const idx = this.data.productSerials.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.productSerials[idx] = { ...this.data.productSerials[idx], ...updated };
      this.notify();
    }
  }

  deleteSerial(id) {
    this.data.productSerials = this.data.productSerials.filter(s => s.id !== id);
    this.notify();
  }

  stockInSerials(productId, serialNumbers = [], details = {}) {
    const now = new Date().toISOString().split('T')[0];
    const created = [];
    serialNumbers.forEach(sn => {
      const cleanSn = sn.trim();
      if (!cleanSn) return;
      const serial = {
        id: 'sn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        productId,
        serialNumber: cleanSn,
        macAddress: details.macAddress || '',
        status: 'in_stock',
        purchaseOrderId: details.purchaseOrderId || null,
        warrantyMonths: details.warrantyMonths || 12,
        location: details.location || 'ສາງໃຫຍ່',
        receivedDate: details.receivedDate || now,
        notes: details.notes || 'ນຳເຂົ້າສາງ'
      };
      this.data.productSerials.push(serial);
      created.push(serial);
    });
    this.notify();
    return created;
  }

  stockOutSerial(serialId, reason = 'sold', invoiceId = null) {
    const serial = this.data.productSerials.find(s => s.id === serialId);
    if (serial) {
      serial.status = reason;
      serial.invoiceId = invoiceId;
      serial.soldDate = new Date().toISOString().split('T')[0];
      this.notify();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // WARRANTY & SERIAL NUMBER LOOKUP
  // --------------------------------------------------------------------------
  getWarrantyInfo(keyword) {
    if (!keyword) return null;
    const cleanKw = keyword.trim().toLowerCase();

    // 1. Search in productSerials by serialNumber or macAddress
    const serial = this.data.productSerials.find(s => 
      (s.serialNumber && s.serialNumber.toLowerCase() === cleanKw) ||
      (s.macAddress && s.macAddress.toLowerCase() === cleanKw) ||
      (s.id && s.id.toLowerCase() === cleanKw)
    );

    let product = null;
    let customer = null;
    let supplier = null;
    let invoice = null;
    let po = null;

    if (serial) {
      product = this.data.products.find(p => p.id === serial.productId);
      if (serial.invoiceId) {
        invoice = this.data.documents.find(d => d.id === serial.invoiceId || d.docNumber === serial.invoiceId);
      }
      if (serial.purchaseOrderId) {
        po = this.data.purchaseOrders.find(p => p.id === serial.purchaseOrderId || p.poNumber === serial.purchaseOrderId);
      }
      if (invoice && invoice.customerId) {
        customer = this.data.customers.find(c => c.id === invoice.customerId);
      }
      if (po && po.supplierId) {
        supplier = this.data.suppliers.find(s => s.id === po.supplierId);
      } else if (product && product.supplierId) {
        supplier = this.data.suppliers.find(s => s.id === product.supplierId);
      }

      const warrantyMonths = Number(serial.warrantyMonths || (product ? 12 : 12));
      const startDateStr = serial.soldDate || serial.receivedDate || (invoice ? invoice.date : null) || (po ? po.orderDate : null);

      let expiryDate = null;
      let daysRemaining = 0;
      let isExpired = false;

      if (startDateStr) {
        const start = new Date(startDateStr);
        const exp = new Date(start);
        exp.setMonth(exp.getMonth() + warrantyMonths);
        expiryDate = exp.toISOString().split('T')[0];

        const now = new Date();
        const diffMs = exp.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining < 0;
      }

      return {
        foundType: 'serial',
        serial,
        product,
        customer: customer || (invoice ? { name: invoice.customerName, phone: invoice.customerPhone } : null),
        supplier: supplier || (po ? { name: po.supplierName } : null),
        invoice,
        purchaseOrder: po,
        startDate: startDateStr,
        warrantyMonths,
        expiryDate,
        daysRemaining,
        isExpired
      };
    }

    // 2. Search in products by SKU, model, or name
    product = this.data.products.find(p => 
      (p.sku && p.sku.toLowerCase() === cleanKw) ||
      (p.model && p.model.toLowerCase() === cleanKw) ||
      (p.name && p.name.toLowerCase().includes(cleanKw))
    );

    if (product) {
      if (product.supplierId) {
        supplier = this.data.suppliers.find(s => s.id === product.supplierId);
      }
      const serials = this.data.productSerials.filter(s => s.productId === product.id);
      return {
        foundType: 'product',
        product,
        supplier,
        serialsCount: serials.length,
        inStockCount: serials.filter(s => s.status === 'in_stock').length,
        soldCount: serials.filter(s => s.status === 'sold').length,
        serials
      };
    }

    return null;
  }


  dispatchSerial(productId, invoiceId = null) {
    const serial = this.data.productSerials.find(s => s.productId === productId && s.status === 'in_stock');
    if (serial) {
      serial.status = 'sold';
      serial.invoiceId = invoiceId;
      serial.soldDate = new Date().toISOString().split('T')[0];
      this.notify();
      return serial;
    }
    return null;
  }

  deductProductStock(productId, qty = 1, refDoc = null) {
    const prod = this.getProductById(productId);
    if (!prod) return false;

    if (prod.hasSn) {
      let count = 0;
      for (let i = 0; i < qty; i++) {
        const s = this.dispatchSerial(productId, refDoc);
        if (s) count++;
      }
      return count > 0;
    } else {
      const current = prod.stock !== undefined ? prod.stock : 10;
      prod.stock = Math.max(0, current - qty);
      this.notify();
      return true;
    }
  }

  getProductStock(productId) {
    const prod = this.getProductById(productId);
    if (!prod) return 0;
    if (prod.hasSn) {
      return this.data.productSerials.filter(s => s.productId === prod.id && s.status === 'in_stock').length;
    }
    return prod.stock !== undefined ? prod.stock : 10;
  }

  getCategoryStats(categoryId) {
    const catProducts = this.data.products.filter(p => p.categoryId === categoryId);
    const skuCount = catProducts.length;
    let stockQty = 0;
    let valuation = 0;

    catProducts.forEach(prod => {
      if (prod.hasSn) {
        const inStockSerials = this.data.productSerials.filter(
          s => s.productId === prod.id && s.status === 'in_stock'
        );
        stockQty += inStockSerials.length;
        valuation += inStockSerials.length * prod.costPrice;
      } else {
        const qty = prod.stock !== undefined ? prod.stock : 10;
        stockQty += qty;
        valuation += qty * prod.costPrice;
      }
    });

    return { skuCount, stockQty, valuation };
  }

  // --------------------------------------------------------------------------
  // PURCHASE ORDERS CRUD
  // --------------------------------------------------------------------------
  getPurchaseOrders() {
    return this.data.purchaseOrders;
  }

  addPurchaseOrder(po) {
    po.id = po.id || ('po_' + Date.now());
    this.data.purchaseOrders.unshift(po);

    // Also save as a document file so it can be managed & viewed just like quotation & invoice
    const docPo = {
      id: po.id,
      docNumber: po.poNumber,
      docType: 'po',
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      customerName: po.supplierName,
      date: po.orderDate,
      dueDate: po.expectedDate || null,
      status: po.status || 'ordered',
      shippingCost: po.shippingCost || 0,
      subtotal: (po.items || []).reduce((acc, it) => acc + (it.total || ((it.qty || 1) * (it.unitCost || it.unitPrice || 0))), 0),
      grandTotal: po.totalAmount,
      notes: po.notes || '',
      items: (po.items || []).map(it => ({
        productId: it.productId,
        sku: it.sku || '',
        name: it.productName || it.name,
        qty: it.qty || it.quantity || 1,
        unitPrice: it.unitCost || it.unitPrice || 0,
        total: it.total || ((it.qty || it.quantity || 1) * (it.unitCost || it.unitPrice || 0))
      })),
      createdBy: po.createdBy || 'Admin'
    };

    const existingDocIdx = this.data.documents.findIndex(d => d.id === po.id || d.docNumber === po.poNumber);
    if (existingDocIdx !== -1) {
      this.data.documents[existingDocIdx] = { ...this.data.documents[existingDocIdx], ...docPo };
    } else {
      this.data.documents.unshift(docPo);
    }

    this.notify();
    return po;
  }

  updatePurchaseOrder(id, updated) {
    const idx = this.data.purchaseOrders.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.purchaseOrders[idx] = { ...this.data.purchaseOrders[idx], ...updated };
      
      const dIdx = this.data.documents.findIndex(d => d.id === id || d.docNumber === this.data.purchaseOrders[idx].poNumber);
      if (dIdx !== -1) {
        if (updated.status) this.data.documents[dIdx].status = updated.status;
        if (updated.totalAmount) this.data.documents[dIdx].grandTotal = updated.totalAmount;
        if (updated.notes) this.data.documents[dIdx].notes = updated.notes;
        if (updated.orderDate) this.data.documents[dIdx].date = updated.orderDate;
        if (updated.items) this.data.documents[dIdx].items = updated.items;
      }
      this.notify();
    }
  }

  deletePurchaseOrder(id) {
    const po = this.data.purchaseOrders.find(p => p.id === id);
    this.data.purchaseOrders = this.data.purchaseOrders.filter(p => p.id !== id);
    if (po) {
      this.data.documents = this.data.documents.filter(d => d.id !== id && d.docNumber !== po.poNumber);
    }
    this.notify();
  }

  receivePurchaseOrder(poId) {
    const po = this.data.purchaseOrders.find(p => p.id === poId);
    if (po) {
      po.status = 'received';
      const d = this.data.documents.find(doc => doc.id === poId || doc.docNumber === po.poNumber);
      if (d) d.status = 'received';
      this.notify();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // DOCUMENTS CRUD
  // --------------------------------------------------------------------------
  getDocuments(type = null) {
    if (!type || type === 'all') return this.data.documents;
    return this.data.documents.filter(d => d.docType === type);
  }

  getDocumentById(id) {
    return this.data.documents.find(d => d.id === id) || 
           this.data.purchaseOrders.find(p => p.id === id);
  }

  getDocumentByNumber(docNumber) {
    if (!docNumber) return null;
    return this.data.documents.find(d => d.docNumber === docNumber) || 
           this.data.purchaseOrders.find(p => p.poNumber === docNumber) || null;
  }

  addDocument(doc) {
    doc.id = 'doc_' + Date.now();
    this.data.documents.unshift(doc);
    
    // Automatically record income transaction ONLY IF status is paid
    if (doc.status === 'paid' && (doc.docType === 'invoice' || doc.docType === 'pos')) {
      const exists = this.data.transactions.some(t => t.refDoc === doc.docNumber);
      if (!exists) {
        this.addTransaction({
          type: 'income',
          category: doc.docType === 'pos' ? 'pos_sale' : 'product_sale',
          amount: doc.grandTotal || doc.totalAmount || 0,
          date: doc.date,
          refDoc: doc.docNumber,
          description: doc.docType === 'pos' ? `ບິນຂາຍໜ້າຮ້ານ POS: ${doc.docNumber}` : `ຮັບເງິນຕາມໃບເກັບເງິນ ${doc.docNumber} (${doc.customerName})`,
          paymentMethod: doc.paymentMethod || 'ເງີນໂອນ (Transfer)',
          notes: doc.notes || '',
          recordedBy: doc.createdBy || 'Admin'
        });
      }
    }

    this.notify();
    return doc;
  }

  updateDocument(id, updated) {
    const idx = this.data.documents.findIndex(d => d.id === id);
    if (idx !== -1) {
      const prevDoc = this.data.documents[idx];
      this.data.documents[idx] = { ...prevDoc, ...updated };
      const doc = this.data.documents[idx];

      // Auto-sync income transaction strictly based on paid status
      if (doc.docType === 'invoice' || doc.docType === 'pos') {
        if (doc.status === 'paid') {
          const tx = this.data.transactions.find(t => t.refDoc === doc.docNumber);
          if (tx) {
            tx.amount = doc.grandTotal || doc.totalAmount || tx.amount;
            tx.date = doc.date || tx.date;
            if (doc.notes) tx.notes = doc.notes;
            if (doc.paymentMethod) tx.paymentMethod = doc.paymentMethod;
          } else {
            this.addTransaction({
              type: 'income',
              category: doc.docType === 'pos' ? 'pos_sale' : 'product_sale',
              amount: doc.grandTotal || doc.totalAmount || 0,
              date: doc.date,
              refDoc: doc.docNumber,
              description: doc.docType === 'pos' ? `ບິນຂາຍໜ້າຮ້ານ POS: ${doc.docNumber}` : `ຮັບເງິນຕາມໃບເກັບເງິນ ${doc.docNumber} (${doc.customerName})`,
              paymentMethod: doc.paymentMethod || 'ເງີນໂອນ (Transfer)',
              notes: doc.notes || '',
              recordedBy: doc.createdBy || 'Admin'
            });
          }
        } else {
          // If status is NOT paid (unpaid, draft, cancelled, etc.), remove from income transactions
          this.data.transactions = this.data.transactions.filter(t => t.refDoc !== doc.docNumber);
        }
      }

      this.notify();
    }
  }

  deleteDocument(id) {
    const doc = this.data.documents.find(d => d.id === id);
    if (doc) {
      this.data.transactions = this.data.transactions.filter(t => t.refDoc !== doc.docNumber);
    }
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // PROJECTS & TASKS CRUD
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // PROJECT CATEGORIES CRUD (ໝວດງານໂຄງການໄອທີ)
  // --------------------------------------------------------------------------
  getProjectCategories() {
    return this.data.projectCategories || [];
  }

  addProjectCategory(cat) {
    if (!this.data.projectCategories) this.data.projectCategories = [];
    cat.id = cat.id || ('pcat_' + Date.now());
    this.data.projectCategories.push(cat);
    this.notify();
    return cat;
  }

  updateProjectCategory(id, updated) {
    if (!this.data.projectCategories) this.data.projectCategories = [];
    const idx = this.data.projectCategories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.projectCategories[idx] = { ...this.data.projectCategories[idx], ...updated };
      this.notify();
      return this.data.projectCategories[idx];
    }
    return null;
  }

  deleteProjectCategory(id) {
    if (!this.data.projectCategories) return;
    this.data.projectCategories = this.data.projectCategories.filter(c => c.id !== id);
    this.notify();
  }

  getProjects() {
    return this.data.projects;
  }

  addProject(project) {
    project.id = 'proj_' + Date.now();
    project.progress = project.progress || 0;
    project.status = project.status || 'in_progress';
    this.data.projects.unshift(project);
    this.notify();
    return project;
  }

  updateProject(id, updated) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.data.projects[idx] = { ...this.data.projects[idx], ...updated };
      this.notify();
    }
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.data.tasks = this.data.tasks.filter(t => t.projectId !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // PROJECT MILESTONES & PARTIAL PAYMENTS
  // --------------------------------------------------------------------------
  getProjectMilestones(projectId) {
    const proj = this.data.projects.find(p => p.id === projectId);
    return (proj && proj.milestones) ? proj.milestones : [];
  }

  addProjectMilestone(projectId, milestone) {
    const proj = this.data.projects.find(p => p.id === projectId);
    if (!proj) return null;
    if (!proj.milestones) proj.milestones = [];
    milestone.id = milestone.id || ('m_' + Date.now());
    milestone.status = milestone.status || 'pending';
    proj.milestones.push(milestone);
    this.notify();
    return milestone;
  }

  updateProjectMilestone(projectId, milestoneId, updated) {
    const proj = this.data.projects.find(p => p.id === projectId);
    if (!proj || !proj.milestones) return false;
    const idx = proj.milestones.findIndex(m => m.id === milestoneId);
    if (idx !== -1) {
      proj.milestones[idx] = { ...proj.milestones[idx], ...updated };
      this.notify();
      return true;
    }
    return false;
  }

  deleteProjectMilestone(projectId, milestoneId) {
    const proj = this.data.projects.find(p => p.id === projectId);
    if (!proj || !proj.milestones) return false;
    proj.milestones = proj.milestones.filter(m => m.id !== milestoneId);
    this.notify();
    return true;
  }

  createMilestoneInvoice(projectId, milestoneId) {
    const proj = this.data.projects.find(p => p.id === projectId);
    if (!proj || !proj.milestones) return null;
    const ms = proj.milestones.find(m => m.id === milestoneId);
    if (!ms) return null;

    const newDocNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
    const newDoc = {
      id: 'doc_' + Date.now(),
      docNumber: newDocNum,
      docType: 'invoice',
      refDocId: proj.code,
      customerId: proj.customerId,
      customerName: proj.customerName,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: ms.status === 'paid' ? 'paid' : 'sent',
      subtotal: ms.amount,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      grandTotal: ms.amount,
      notes: `ໃບເກັບເງິນງວດໂຄງການ: ${proj.code} - ${proj.title} (${ms.name})`,
      items: [
        { sku: 'SRV-PROJECT', name: `${proj.title} - ${ms.name} (${ms.percent}%)`, qty: 1, unitPrice: ms.amount, total: ms.amount }
      ],
      createdBy: this.getCurrentUser()?.name || 'Admin'
    };

    this.addDocument(newDoc);
    ms.invoiceDocNumber = newDocNum;
    ms.status = ms.status === 'paid' ? 'paid' : 'invoiced';
    this.notify();
    return newDoc;
  }


  getTasks(projectId = null) {
    if (!projectId) return this.data.tasks;
    return this.data.tasks.filter(t => t.projectId === projectId);
  }

  addTask(task) {
    task.id = 'task_' + Date.now();
    task.status = task.status || 'todo';
    this.data.tasks.push(task);
    this.notify();
    return task;
  }

  updateTask(id, updated) {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.tasks[idx] = { ...this.data.tasks[idx], ...updated };
      this.notify();
    }
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // IT SERVICE JOBS CRUD (ໜ້າວຽກໄອທີ: Onsite Support, ແປງຄອມ, ແປງປຣິນເຕີ)
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // IT JOB CATEGORIES CRUD (ປະເພດວຽກໄອທີ)
  // --------------------------------------------------------------------------
  getItJobCategories() {
    return this.data.itJobCategories || [];
  }

  addItJobCategory(cat) {
    if (!this.data.itJobCategories) this.data.itJobCategories = [];
    cat.id = cat.id || ('itcat_' + Date.now());
    cat.key = cat.key || cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.data.itJobCategories.push(cat);
    this.notify();
    return cat;
  }

  updateItJobCategory(id, updated) {
    if (!this.data.itJobCategories) this.data.itJobCategories = [];
    const idx = this.data.itJobCategories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.itJobCategories[idx] = { ...this.data.itJobCategories[idx], ...updated };
      this.notify();
      return this.data.itJobCategories[idx];
    }
    return null;
  }

  deleteItJobCategory(id) {
    if (!this.data.itJobCategories) return;
    this.data.itJobCategories = this.data.itJobCategories.filter(c => c.id !== id);
    this.notify();
  }

  getItJobs() {
    return this.data.itJobs || [];
  }

  addItJob(job) {
    job.id = 'job_' + Date.now();
    job.status = job.status || 'pending';
    job.receivedDate = job.receivedDate || new Date().toISOString().split('T')[0];
    if (!this.data.itJobs) this.data.itJobs = [];
    this.data.itJobs.unshift(job);
    this.notify();
    return job;
  }

  updateItJob(id, updated) {
    if (!this.data.itJobs) this.data.itJobs = [];
    const idx = this.data.itJobs.findIndex(j => j.id === id);
    if (idx !== -1) {
      this.data.itJobs[idx] = { ...this.data.itJobs[idx], ...updated };
      this.notify();
    }
  }

  deleteItJob(id) {
    if (!this.data.itJobs) return;
    this.data.itJobs = this.data.itJobs.filter(j => j.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // EMPLOYEES CRUD
  // --------------------------------------------------------------------------
  getEmployees() {
    return this.data.employees;
  }

  addEmployee(emp) {
    emp.id = 'emp_' + Date.now();
    emp.joinedDate = emp.joinedDate || new Date().toISOString().split('T')[0];
    emp.status = emp.status || 'active';
    this.data.employees.push(emp);
    this.notify();
    return emp;
  }

  updateEmployee(id, updated) {
    const idx = this.data.employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.data.employees[idx] = { ...this.data.employees[idx], ...updated };
      this.notify();
    }
  }

  deleteEmployee(id) {
    this.data.employees = this.data.employees.filter(e => e.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // CUSTOMERS CRUD
  // --------------------------------------------------------------------------
  getCustomers() {
    return this.data.customers;
  }

  addCustomer(customer) {
    customer.id = 'cust_' + Date.now();
    customer.totalSpent = customer.totalSpent || 0;
    this.data.customers.push(customer);
    this.notify();
    return customer;
  }

  updateCustomer(id, updated) {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.customers[idx] = { ...this.data.customers[idx], ...updated };
      this.notify();
    }
  }

  deleteCustomer(id) {
    this.data.customers = this.data.customers.filter(c => c.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // TRANSACTIONS CRUD
  // --------------------------------------------------------------------------
  getTransactions() {
    // Return transactions, ensuring any income transaction tied to a document ONLY appears if the document is PAID
    return this.data.transactions.filter(t => {
      if (t.type === 'income' && t.refDoc) {
        const doc = this.data.documents.find(d => d.docNumber === t.refDoc || d.id === t.refDoc);
        if (doc && doc.status && doc.status !== 'paid') {
          return false;
        }
      }
      return true;
    });
  }

  addTransaction(tx) {
    if (tx.refDoc) {
      const existing = this.data.transactions.find(t => t.refDoc === tx.refDoc);
      if (existing) {
        Object.assign(existing, tx);
        this.notify();
        return existing;
      }
    }
    tx.id = 'tx_' + Date.now() + Math.floor(Math.random() * 100);
    this.data.transactions.unshift(tx);
    this.notify();
    return tx;
  }

  deleteTransaction(id) {
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.notify();
  }

  updateTransaction(id, updated) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = { ...this.data.transactions[idx], ...updated };
      this.notify();
      return this.data.transactions[idx];
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // BRANDS & SUPPLIERS
  // --------------------------------------------------------------------------
  getBrands() {
    return this.data.brands;
  }

  addBrand(brand) {
    brand.id = 'br_' + Date.now();
    this.data.brands.push(brand);
    this.notify();
    return brand;
  }

  updateBrand(id, updated) {
    const idx = this.data.brands.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.data.brands[idx] = { ...this.data.brands[idx], ...updated };
      this.notify();
      return this.data.brands[idx];
    }
    return null;
  }

  deleteBrand(id) {
    this.data.brands = this.data.brands.filter(b => b.id !== id);
    this.notify();
  }

  getSuppliers() {
    return this.data.suppliers;
  }

  addSupplier(sup) {
    sup.id = 'sup_' + Date.now();
    this.data.suppliers.push(sup);
    this.notify();
    return sup;
  }

  updateSupplier(id, updated) {
    const idx = this.data.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updated };
      this.notify();
      return this.data.suppliers[idx];
    }
    return null;
  }

  deleteSupplier(id) {
    this.data.suppliers = this.data.suppliers.filter(s => s.id !== id);
    this.notify();
  }

  calculateQuotationCost(quotationDocNumber) {
    const doc = this.data.documents.find(d => d.docNumber === quotationDocNumber);
    if (!doc || !doc.items || !doc.items.length) {
      return { totalCost: 0, totalRevenue: 0, profit: 0, profitMargin: 0, items: [] };
    }

    let totalCost = 0;
    let totalRevenue = doc.totalAmount || doc.subtotal || 0;

    const itemsCostBreakdown = doc.items.map(it => {
      const prod = this.data.products.find(p => p.id === it.productId || p.name === it.name);
      // If product exists in catalog, use its costPrice; otherwise estimate 70% of quoted price
      const unitCost = prod ? prod.costPrice : Math.round((it.price || 0) * 0.7);
      const qty = it.qty || 1;
      const itemCost = unitCost * qty;
      const itemRevenue = (it.price * qty) - (it.discount || 0);
      const itemProfit = itemRevenue - itemCost;

      totalCost += itemCost;
      return {
        name: it.name,
        qty: qty,
        unitCost: unitCost,
        itemCost: itemCost,
        price: it.price,
        itemRevenue: itemRevenue,
        itemProfit: itemProfit
      };
    });

    if (!totalRevenue) {
      totalRevenue = itemsCostBreakdown.reduce((sum, i) => sum + i.itemRevenue, 0);
    }

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0;

    return {
      totalCost,
      totalRevenue,
      profit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      items: itemsCostBreakdown
    };
  }


  // --------------------------------------------------------------------------
  // CLIENT SYSTEMS
  // --------------------------------------------------------------------------
  getClientSystems() {
    return this.data.clientSystems;
  }

  addClientSystem(sys) {
    sys.id = 'sys_' + Date.now();
    sys.status = sys.status || 'active';
    this.data.clientSystems.push(sys);
    this.notify();
    return sys;
  }

  updateClientSystem(id, updated) {
    const idx = this.data.clientSystems.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.clientSystems[idx] = { ...this.data.clientSystems[idx], ...updated };
      this.notify();
    }
  }

  deleteClientSystem(id) {
    this.data.clientSystems = this.data.clientSystems.filter(s => s.id !== id);
    this.notify();
  }

  // --------------------------------------------------------------------------
  // SETTINGS & BACKUP
  // --------------------------------------------------------------------------
  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.notify();
  }

  exportBackupJson() {
    return JSON.stringify(this.data, null, 2);
  }

  importBackupJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.categories && parsed.products) {
        this.data = parsed;
        this.saveLocal();
        this.notify();
        return { success: true };
      }
      return { success: false, error: 'ຮູບແບບໄຟລ໌ JSON ບໍ່ຖືກຕ້ອງ' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --------------------------------------------------------------------------
  // CLOUDFLARE D1 SYNC & SECURITY
  // --------------------------------------------------------------------------
  async hashPassword(password) {
    if (!password) return '';
    try {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return btoa(password);
    }
  }

  async syncWithCloudflareD1() {
    const settings = this.getSettings();
    let workerUrl = (settings.d1WorkerUrl || settings.workerUrl || '').trim();
    if (!workerUrl) {
      if (window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        workerUrl = window.location.origin;
      }
    }
    if (!workerUrl) {
      return { success: false, error: 'ກະລຸນາໃສ່ Cloudflare Worker URL ໃນໜ້າຕັ້ງຄ່າກ່ອນ' };
    }

    try {
      // 1. Ping test
      const pingUrl = workerUrl.replace(/\/+$/, '') + '/api/ping';
      const pingRes = await fetch(pingUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!pingRes.ok) {
        throw new Error(`Cloudflare D1 Ping ລົ້ມເຫຼວ (HTTP ${pingRes.status})`);
      }
      const pingContentType = pingRes.headers.get('content-type') || '';
      if (!pingContentType.includes('application/json')) {
        throw new Error('URL ທີ່ປ້ອນແມ່ນ URL ຂອງໜ້າເວັບ (Frontend), ບໍ່ແມ່ນ Worker API.');
      }
      const pingData = await pingRes.json();
      if (!pingData.success) {
        throw new Error(pingData.error || 'Cloudflare D1 ບໍ່ພ້ອມໃຊ້ງານ');
      }

      // 2. Full Sync to D1
      const syncUrl = workerUrl.replace(/\/+$/, '') + '/api/sync-all';
      const syncRes = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'netd_client',
          timestamp: new Date().toISOString(),
          data: this.data
        })
      });

      if (!syncRes.ok) {
        throw new Error(`Sync ຂຶ້ນ Cloudflare D1 ບໍ່ສຳເລັດ (HTTP ${syncRes.status})`);
      }
      const syncResult = await syncRes.json();

      this.data.settings.lastSyncTime = new Date().toISOString();
      this.saveLocal();
      this.notify();

      return {
        success: true,
        message: 'Sync ຂໍ້ມູນກັບ Cloudflare D1 ສຳເລັດແລ້ວ',
        serverTime: pingData.server_time,
        sqliteVer: pingData.sqlite_version,
        syncedCount: syncResult.syncedCount || 'All'
      };
    } catch (err) {
      console.warn('Cloudflare D1 Sync error:', err);
      return { success: false, error: err.message };
    }
  }

  async pullFromCloudflareD1() {
    const settings = this.getSettings();
    let workerUrl = (settings.d1WorkerUrl || settings.workerUrl || '').trim();
    if (!workerUrl) {
      if (window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        workerUrl = window.location.origin;
      }
    }
    if (!workerUrl) {
      return { success: false, error: 'ກະລຸນາໃສ່ Cloudflare Worker URL ໃນໜ້າຕັ້ງຄ່າກ່ອນ' };
    }

    try {
      const pullUrl = workerUrl.replace(/\/+$/, '') + '/api/pull-all';
      const pullRes = await fetch(pullUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!pullRes.ok) {
        throw new Error(`ດຶງຂໍ້ມູນຈາກ Cloudflare D1 ບໍ່ສຳເລັດ (HTTP ${pullRes.status})`);
      }
      const result = await pullRes.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'ຮູບແບບຂໍ້ມູນທີ່ໄດ້ຮັບຈາກ D1 ບໍ່ຖືກຕ້ອງ');
      }

      const pData = result.data;
      if (pData.settings && Object.keys(pData.settings).length > 0) {
        this.data.settings = { ...this.data.settings, ...pData.settings };
      }

      const tableKeys = [
        'employees', 'customers', 'categories', 'brands', 'suppliers', 
        'products', 'productSerials', 'purchaseOrders', 'documents', 
        'projectCategories', 'projects', 'tasks', 'itJobCategories', 
        'itJobs', 'transactions', 'clientSystems', 'activityLogs'
      ];

      tableKeys.forEach(tk => {
        if (Array.isArray(pData[tk]) && pData[tk].length > 0) {
          this.data[tk] = pData[tk];
        }
      });

      this.data.settings.lastSyncTime = new Date().toISOString();
      this.saveLocal();
      this.notify();

      return {
        success: true,
        message: 'ດຶງຂໍ້ມູນຫຼ້າສຸດຈາກ Cloudflare D1 ສຳເລັດແລ້ວ',
        timestamp: result.timestamp
      };
    } catch (err) {
      console.warn('Cloudflare D1 Pull error:', err);
      return { success: false, error: err.message };
    }
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATABASE));
    this.saveLocal();
    this.notify();
  }
}

// Global DB Singleton instance
window.db = new DatabaseManager();
