/**
 * NETD IT WEBAPP - CORE APPLICATION CONTROLLER (v2.5)
 * Dual Theme (Cyber Dark & Clean Light), Monthly Dashboard Filter, Continuous SKU Generator,
 * Profit Margin Calculator, IT Service Jobs, and Full CRUD.
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentView: 'dashboard',
  currentUser: null,
  currentTheme: 'dark',
  selectedDashboardMonth: new Date().toISOString().substring(0, 7), // 'YYYY-MM'
  selectedChartYear: new Date().getFullYear().toString(),
  docSearchQuery: '',
  docFilterTab: 'all',
  docFilterMonth: new Date().toISOString().substring(0, 7), // 'YYYY-MM' or 'all'
  productFilterTab: 'in_stock',
  productSearchQuery: '',
  txSearchQuery: '',
  selectedCategoryId: 'all',
  supplierTab: 'products', // 'products' or 'suppliers'
  itJobFilterStatus: 'all',
  itJobFilterType: 'all',
  charts: {},
  cardFilters: {
    projects: 'all',
    itJobs: 'all',
    docs: 'all',
    income: 'month',
    expense: 'month',
    stock: 'all',
    po: 'all'
  },

  setDocMonth(m) {
    this.docFilterMonth = m;
    this.renderCurrentView();
  },

  setDocSearch(q) {
    this.docSearchQuery = q;
    this.renderCurrentView();
  },

  filterOverdueDocs() {
    this.docFilterTab = 'invoice';
    this.docFilterMonth = 'all';
    this.docSearchQuery = '';
    this.switchView('documents');
  },

  setProductSearch(q) {
    this.productSearchQuery = q;
    const tableContainer = document.getElementById('product-table-container');
    if (tableContainer) {
      tableContainer.innerHTML = this.renderProductTableContent();
    } else {
      this.renderCurrentView();
    }
  },

  setTxSearch(q) {
    this.txSearchQuery = q;
    this.renderCurrentView();
  },

  setCardFilter(cardKey, val) {
    this.cardFilters[cardKey] = val;
    this.renderDashboard(document.getElementById('main-content-view'));
  },

  setFinancialFilter(val) {
    this.cardFilters.income = val;
    this.cardFilters.expense = val;
    this.renderDashboard(document.getElementById('main-content-view'));
  },

  init() {
    if (typeof Chart !== 'undefined') {
      const laoFont = "'Noto Sans Lao', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
      Chart.defaults.font.family = laoFont;
      Chart.defaults.font.size = 12;
      if (Chart.defaults.plugins) {
        if (Chart.defaults.plugins.tooltip) {
          Chart.defaults.plugins.tooltip.titleFont = { family: laoFont, weight: '600' };
          Chart.defaults.plugins.tooltip.bodyFont = { family: laoFont };
        }
        if (Chart.defaults.plugins.legend && Chart.defaults.plugins.legend.labels) {
          Chart.defaults.plugins.legend.labels.font = { family: laoFont, size: 12 };
        }
      }
    }
    this.initTheme();
    this.checkAuth();
    this.bindGlobalEvents();
    this.updateLiveHeader();
    this.testDbConnectionQuietly();
    this.renderCurrentView();

    // 1. Subscribe to DB updates so UI re-renders automatically when data changes or syncs
    window.db.subscribe(() => {
      this.updateLiveHeader();
      this.renderCurrentView();
    });

    // 2. Initial silent pull from Cloudflare D1 so any new browser loads fresh cloud data on open
    this.pullLatestDataQuietly();

    // 3. Continuous Auto-pull interval every 15 seconds so multiple browsers stay in sync in real-time
    setInterval(() => {
      if (navigator.onLine) {
        this.pullLatestDataQuietly();
      }
    }, 15000);

    // 4. Auto-pull whenever user switches or clicks on this browser tab (Focus sync)
    window.addEventListener('focus', () => {
      if (navigator.onLine) {
        this.pullLatestDataQuietly();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        this.pullLatestDataQuietly();
      }
    });

    setInterval(() => this.updateLiveHeader(), 60000);
  },

  async pullLatestDataQuietly() {
    if (!navigator.onLine || !window.db) return;
    try {
      const res = await window.db.pullFromCloudflareD1();
      if (res && res.success) {
        window.db.updateStatusDot('online');
      }
    } catch (e) {
      // quiet catch
    }
  },

  // --------------------------------------------------------------------------
  // THEME MANAGEMENT (ໂໝດທຳມະດາ / ໂໝດດາກ)
  // --------------------------------------------------------------------------
  initTheme() {
    const savedTheme = localStorage.getItem('netd_theme') || window.db.getSettings().theme || 'dark';
    this.applyTheme(savedTheme);
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    window.db.updateSettings({ theme: nextTheme });
    localStorage.setItem('netd_theme', nextTheme);
    this.renderCurrentView();
  },

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon text-amber-400' : 'fa-solid fa-sun text-amber-500';
    }
    if (text) {
      text.textContent = theme === 'dark' ? 'ໂໝດດາກ' : 'ໂໝດສະຫວ່າງ';
    }
  },

  // --------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN
  // --------------------------------------------------------------------------
  checkAuth() {
    const user = window.db.getCurrentUser();
    if (!user) {
      this.showLoginModal();
    } else {
      this.currentUser = user;
      this.updateUserUI();
    }
  },

  showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  async handleLogin(username, password) {
    const res = await window.db.login(username, password);
    if (res.success) {
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideLoginModal();
      Swal.fire({
        title: 'ຍິນດີຕ້ອນຮັບ!',
        text: `ສະບາຍດີ ${res.user.name} (${res.user.roleName})`,
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
        customClass: { popup: 'swal-glass' }
      });
      this.renderCurrentView();
    } else {
      Swal.fire({
        title: 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ',
        text: res.message,
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  handleLogout() {
    Swal.fire({
      title: 'ຢືນຢັນການອອກຈາກລະບົບ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ອອກຈາກລະບົບ',
      cancelButtonText: 'ຍົກເລີກ',
      confirmButtonColor: '#ef4444',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.logout();
        this.currentUser = null;
        this.showLoginModal();
      }
    });
  },

  updateUserUI() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('nav-user-name');
    const roleEl = document.getElementById('nav-user-role');
    const avatarEl = document.getElementById('nav-user-avatar');

    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (roleEl) roleEl.textContent = this.currentUser.roleName || this.currentUser.role;
    if (avatarEl && this.currentUser.avatar) avatarEl.src = this.currentUser.avatar;

    // RBAC: Show/Hide settings item in sidebar for non-admins
    const settingsLink = document.querySelector('.sidebar-link[data-view="settings"]');
    if (settingsLink) {
      if (this.currentUser.role !== 'admin') {
        settingsLink.style.display = 'none';
      } else {
        settingsLink.style.display = '';
      }
    }
  },

  async openChangePasswordModal(targetUserId = null) {
    const user = targetUserId 
      ? window.db.data.employees.find(e => e.id === targetUserId)
      : (this.currentUser || window.db.getCurrentUser() || window.db.data.employees[0]);

    if (!user) {
      Swal.fire({ title: 'ຜິດພາດ', text: 'ບໍ່ພົບຂໍ້ມູນບັນຊີຜູ້ໃຊ້ງານ', icon: 'error' });
      return;
    }

    const isAdminReset = this.currentUser && this.currentUser.role === 'admin' && targetUserId && targetUserId !== this.currentUser.id;

    const { value: formValues } = await Swal.fire({
      title: `<span class="text-white text-lg font-bold"><i class="fa-solid fa-key text-amber-400 mr-2"></i>ປ່ຽນລະຫັດຜ່ານ (${user.name})</span>`,
      html: `
        <div class="text-left space-y-3 text-xs pt-2">
          ${!isAdminReset ? `
            <div>
              <label class="block mb-1 font-bold text-slate-200">ລະຫັດຜ່ານປະຈຸບັນ *</label>
              <input type="password" id="swal-old-password" class="glass-input w-full px-3 py-2" placeholder="ລະຫັດຜ່ານປັດຈຸບັນ...">
            </div>
          ` : `
            <div class="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
              <i class="fa-solid fa-shield-halved mr-1"></i> <strong>Admin Reset:</strong> ກຳນົດລະຫັດຜ່ານໃໝ່ໃຫ້ບັນຊີນີ້ໂດຍກົງ
            </div>
          `}
          <div>
            <label class="block mb-1 font-bold text-slate-200">ລະຫັດຜ່ານໃໝ່ *</label>
            <input type="password" id="swal-new-password" class="glass-input w-full px-3 py-2" placeholder="ລະຫັດຜ່ານໃໝ່ (ຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ)...">
          </div>
          <div>
            <label class="block mb-1 font-bold text-slate-200">ຢືນຢັນລະຫັດຜ່ານໃໝ່ *</label>
            <input type="password" id="swal-confirm-password" class="glass-input w-full px-3 py-2" placeholder="ພິມລະຫັດຜ່ານໃໝ່ອີກຄັ້ງ...">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-check mr-1.5"></i> ບັນທຶກລະຫັດຜ່ານໃໝ່',
      cancelButtonText: 'ຍົກເລີກ',
      confirmButtonColor: '#0ea5e9',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const oldPass = !isAdminReset ? (document.getElementById('swal-old-password')?.value || '') : '';
        const newPass = document.getElementById('swal-new-password')?.value || '';
        const confirmPass = document.getElementById('swal-confirm-password')?.value || '';

        if (!isAdminReset && !oldPass) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ລະຫັດຜ່ານປະຈຸບັນ');
          return false;
        }
        if (!newPass || newPass.length < 4) {
          Swal.showValidationMessage('ລະຫັດຜ່ານໃໝ່ຕ້ອງມີຢ່າງໜ້ອຍ 4 ຕົວອັກສອນ');
          return false;
        }
        if (newPass !== confirmPass) {
          Swal.showValidationMessage('ລະຫັດຜ່ານໃໝ່ ແລະ ຢືນຢັນລະຫັດຜ່ານບໍ່ກົງກັນ!');
          return false;
        }
        return { oldPass, newPass };
      }
    });

    if (formValues) {
      if (isAdminReset) {
        const newHash = await window.db.hashPassword(formValues.newPass);
        user.password = newHash;
        user.passwordHash = newHash;
        window.db.saveLocal();
        window.db.notify();
        Swal.fire({
          title: 'ສຳເລັດ!',
          text: `ຣີເຊັດລະຫັດຜ່ານໃຫ້ ${user.name} ຮຽບຮ້ອຍແລ້ວ`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
      } else {
        const res = await window.db.changePassword(user.id, formValues.oldPass, formValues.newPass);
        if (res.success) {
          Swal.fire({
            title: 'ສຳເລັດ!',
            text: res.message,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'swal-glass' }
          });
        } else {
          Swal.fire({
            title: 'ຜິດພາດ!',
            text: res.message,
            icon: 'error',
            customClass: { popup: 'swal-glass' }
          });
        }
      }
    }
  },

  handleFileBrowse(inputElement, previewImgId, valueInputId) {
    const file = inputElement.files && inputElement.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      Swal.fire({
        title: 'ໄຟລ໌ໃຫຍ່ເກີນໄປ',
        text: 'ກະລຸນາເລືອກຮູບທີ່ມີຂະໜາດບໍ່ເກີນ 8MB',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 500;
        const maxHeight = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);

        const preview = document.getElementById(previewImgId);
        if (preview) {
          preview.src = resizedDataUrl;
          preview.classList.remove('hidden');
        }
        const valInput = document.getElementById(valueInputId);
        if (valInput) {
          valInput.value = resizedDataUrl;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },
  // HEADER & D1 CONNECTION STATUS
  // --------------------------------------------------------------------------
  updateLiveHeader() {
    const settings = window.db.getSettings();
    const shopNameEl = document.getElementById('header-shop-name');
    const shopInfoEl = document.getElementById('header-shop-info');
    const dateEl = document.getElementById('header-live-date');
    const logoEl = document.getElementById('sidebar-logo');

    if (logoEl && settings.logoUrl) logoEl.src = settings.logoUrl;
    if (shopNameEl) shopNameEl.textContent = settings.shopName;
    if (shopInfoEl) shopInfoEl.textContent = `📞 ${settings.phone} | 📍 ${settings.address}`;

    if (dateEl) {
      const now = new Date();
      const laoDays = ['ວັນອາທິດ', 'ວັນຈັນ', 'ວັນອັງຄານ', 'ວັນພຸດ', 'ວັນພະຫັດ', 'ວັນສຸກ', 'ວັນເສົາ'];
      const laoMonths = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
      dateEl.textContent = `${laoDays[now.getDay()]}, ${now.getDate()} ${laoMonths[now.getMonth()]} ${now.getFullYear()}`;
    }
  },

  async testDbConnectionQuietly() {
    await window.db.testConnection();
  },

  async handleManualTestConnection() {
    const workerUrl = (window.db.data.settings.d1WorkerUrl || '').trim();
    if (!workerUrl) {
      Swal.fire({
        title: 'ຍັງບໍ່ທັນເຊື່ອມຕໍ່ Cloudflare D1',
        html: `
          <div class="text-left text-xs space-y-2.5">
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <i class="fa-solid fa-circle-info mr-1"></i> <strong>ລະບົບກຳລັງໃຊ້ງານ Local Mode (ໃນເຄື່ອງ)</strong>
            </div>
            <p class="opacity-80">
              ສາເຫດທີ່ຂຶ້ນ <strong>D1 Offline</strong> ເນື່ອງຈາກທ່ານຍັງບໍ່ທັນໄດ້ນຳເອົາ <strong>Cloudflare Worker API URL</strong> ມາໃສ່ໃນລະບົບເທື່ອ.
            </p>
            <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <p class="font-bold text-sky-400">ວິທີເຮັດໃຫ້ Online:</p>
              <p>1. Deploy Worker & D1 ໄປທີ່ Cloudflare</p>
              <p>2. ເອົາ URL ທີ່ໄດ້ມາວາງໃສ່ໃນໜ້າ <strong>"ຕັ້ງຄ່າລະບົບ" (Settings)</strong></p>
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-gear mr-1"></i> ໄປໜ້າຕັ້ງຄ່າລະບົບ',
        cancelButtonText: 'ເຂົ້າໃຈແລ້ວ',
        confirmButtonColor: '#0ea5e9',
        customClass: { popup: 'swal-glass' }
      }).then(r => {
        if (r.isConfirmed) {
          this.switchView('settings');
        }
      });
      return;
    }

    Swal.fire({
      title: 'ກຳລັງທົດສອບ Cloudflare D1...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: { popup: 'swal-glass' }
    });

    const res = await window.db.testConnection();
    if (res.online) {
      Swal.fire({
        title: 'ເຊື່ອມຕໍ່ສຳເລັດ! (Online)',
        html: `
          <div class="text-left text-xs space-y-1">
            <p>✅ ສະຖານະ: <strong>Online ປົກກະຕິ</strong></p>
            <p>⚡ ຄວາມໄວ (Latency): <strong>${res.latency} ms</strong></p>
            <p>💾 Engine: <strong>${res.sqlite_version || 'D1 SQLite'}</strong></p>
            <p class="text-slate-400 mt-2">${res.message}</p>
          </div>
        `,
        icon: 'success',
        customClass: { popup: 'swal-glass' }
      });
    } else {
      Swal.fire({
        title: 'ເຊື່ອມຕໍ່ບໍ່ສຳເລັດ',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="text-rose-400 font-bold">⚠️ ${res.message}</p>
            <p class="opacity-80">ກະລຸນາກວດສອບວ່າ Worker URL ຖືກຕ້ອງ ແລະ ເປີດໃຊ້ງານຢູ່ໃນ Cloudflare ຫຼື ບໍ່.</p>
          </div>
        `,
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  saveD1Endpoint() {
    const url = document.getElementById('cfg-worker-url')?.value?.trim();
    window.db.updateSettings({ d1WorkerUrl: url });
    Swal.fire({
      title: 'ບັນທຶກ URL ສຳເລັດ!',
      text: 'Cloudflare Worker API Endpoint ໄດ້ຮັບການບັນທຶກແລ້ວ',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
      customClass: { popup: 'swal-glass' }
    });
  },

  async syncAllDataToCloudflare() {
    Swal.fire({
      title: 'ກຳລັງຊິ້ງຂໍ້ມູນຂຶ້ນ Cloudflare D1...',
      text: 'ກຳລັງອັບໂຫຼດຖານຂໍ້ມູນຂຶ້ນ Cloudflare D1 SQLite Engine...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: { popup: 'swal-glass' }
    });

    const res = await window.db.syncWithCloudflareD1();
    if (res.success) {
      Swal.fire({
        title: 'ຊິ້ງຂໍ້ມູນຂຶ້ນ D1 ສຳເລັດ!',
        html: `
          <div class="text-left text-xs space-y-1">
            <p>✅ <strong>${res.message}</strong></p>
            <p>📊 ຈຳນວນລາຍການ: <strong>${res.syncedCount}</strong> ລາຍການ</p>
            <p>🕒 Server Time: <strong>${res.serverTime || new Date().toLocaleString()}</strong></p>
            <p>💾 Engine: <strong>${res.sqliteVer || 'Cloudflare D1'}</strong></p>
          </div>
        `,
        icon: 'success',
        customClass: { popup: 'swal-glass' }
      });
      this.updateLiveHeader();
    } else {
      Swal.fire({
        title: 'ເກີດຂໍ້ຜິດພາດໃນການຊິ້ງ',
        text: res.error || 'ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບ Cloudflare Worker ໄດ້',
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  async pullAllDataFromCloudflare() {
    Swal.fire({
      title: 'ກຳລັງດຶງຂໍ້ມູນຈາກ Cloudflare D1...',
      text: 'ກຳລັງໂຫຼດຖານຂໍ້ມູນຫຼ້າສຸດຈາກ Cloudflare D1 ລົງມາທີ່ເຄື່ອງ...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: { popup: 'swal-glass' }
    });

    const res = await window.db.pullFromCloudflareD1();
    if (res.success) {
      Swal.fire({
        title: 'ດຶງຂໍ້ມູນສຳເລັດ!',
        text: 'ຖານຂໍ້ມູນທັງໝົດໄດ້ຮັບການອັບເດດຈາກ Cloudflare D1 ຮຽບຮ້ອຍແລ້ວ',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
        customClass: { popup: 'swal-glass' }
      });
      this.updateLiveHeader();
      this.renderCurrentView();
    } else {
      Swal.fire({
        title: 'ເກີດຂໍ້ຜິດພາດໃນການດຶງຂໍ້ມູນ',
        text: res.error || 'ບໍ່ສາມາດດຶງຂໍ້ມູນຈາກ Cloudflare D1 ໄດ້',
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  // --------------------------------------------------------------------------
  // ROLE-BASED ACCESS CONTROL (RBAC) PERMISSIONS
  // --------------------------------------------------------------------------
  getUserRole() {
    return (this.currentUser && this.currentUser.role) ? this.currentUser.role.toLowerCase() : 'admin';
  },

  isAdmin() {
    return this.getUserRole() === 'admin';
  },

  isTechnician() {
    return this.getUserRole() === 'technician';
  },

  isOfficer() {
    return this.getUserRole() === 'officer';
  },

  // Technician can manage only projects and it-jobs; read-only elsewhere.
  // Officer can manage everything except settings.
  // Admin can manage everything.
  canManage(viewName) {
    const role = this.getUserRole();
    if (role === 'admin') return true;
    if (role === 'officer') {
      return viewName !== 'settings';
    }
    if (role === 'technician') {
      return viewName === 'projects' || viewName === 'it-jobs';
    }
    return false;
  },

  canAccessView(viewName) {
    const role = this.getUserRole();
    if (viewName === 'settings' && role !== 'admin') {
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // SPA ROUTING
  // --------------------------------------------------------------------------
  switchView(viewName) {
    if (!this.canAccessView(viewName)) {
      Swal.fire({
        title: 'ບໍ່ມີສິດເຂົ້າເຖິງ',
        text: 'ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເຂົ້າໜ້າຕັ້ງຄ່າລະບົບໄດ້',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    this.currentView = viewName;
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === viewName);
    });

    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 1024) {
      sidebar.classList.add('-translate-x-full');
    }

    this.renderCurrentView();
  },

  renderCurrentView() {
    const container = document.getElementById('main-content-view');
    if (!container) return;

    Object.values(this.charts).forEach(c => {
      try { c.destroy(); } catch (e) {}
    });
    this.charts = {};

    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard(container);
        break;
      case 'products':
        this.renderProducts(container);
        break;
      case 'projects':
        this.renderProjects(container);
        break;
      case 'it-jobs':
        this.renderItJobs(container);
        break;
      case 'documents':
        this.renderDocuments(container);
        break;
      case 'employees':
        this.renderEmployees(container);
        break;
      case 'customers':
        this.renderCustomers(container);
        break;
      case 'transactions':
        this.renderTransactions(container);
        break;
      case 'suppliers':
        this.renderSuppliers(container);
        break;
      case 'client-systems':
        this.renderClientSystems(container);
        break;
      case 'settings':
        this.renderSettings(container);
        break;
      default:
        this.renderDashboard(container);
    }
  },

  // --------------------------------------------------------------------------
  // VIEW 1: DASHBOARD (ພ້ອມຕົວກອງເດືອນ 1 ຫາ 12 ແລະ ຕົວກອງປີສຳລັບກຣາຟ)
  // --------------------------------------------------------------------------
  renderDashboard(container) {
    const data = window.db.data;
    const currentYr = new Date().getFullYear();
    const currentMo = String(new Date().getMonth() + 1).padStart(2, '0');
    const laoMonthNames = [
      'ມັງກອນ (1)', 'ກຸມພາ (2)', 'ມີນາ (3)', 'ເມສາ (4)', 'ພຶດສະພາ (5)', 'ມິຖຸນາ (6)',
      'ກໍລະກົດ (7)', 'ສິງຫາ (8)', 'ກັນຍາ (9)', 'ຕຸລາ (10)', 'ພະຈິກ (11)', 'ທັນວາ (12)'
    ];

    // Helper to build 1-12 month select options
    const buildMonthOptions = (selectedVal) => {
      let opts = `<option value="all" ${selectedVal === 'all' ? 'selected' : ''}>ທັງໝົດ</option>`;
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const val = `${currentYr}-${mStr}`;
        const isSel = selectedVal === val;
        opts += `<option value="${val}" ${isSel ? 'selected' : ''}>ເດືອນ ${m} (${laoMonthNames[m - 1].split(' ')[0]})</option>`;
      }
      return opts;
    };

    // Ensure default card filters for cards 1-5 are set to current month if not already defined or defaulted
    const defaultMonthVal = `${currentYr}-${currentMo}`;
    const cf = this.cardFilters;
    ['projects', 'itJobs', 'docs', 'income', 'expense'].forEach(k => {
      if (!cf[k] || cf[k] === 'month') {
        cf[k] = defaultMonthVal;
      }
    });

    // Helper to check if record date matches selected filter
    const matchesMonth = (dateStr, filterVal) => {
      if (!filterVal || filterVal === 'all') return true;
      return (dateStr || '').startsWith(filterVal);
    };

    // --- CARD 1: Projects (ກອງເດືອນ 1-12) ---
    let card1Projects = data.projects;
    if (cf.projects !== 'all') {
      card1Projects = card1Projects.filter(p => matchesMonth(p.startDate, cf.projects));
    }
    const c1Total = card1Projects.length;
    const c1Completed = card1Projects.filter(p => p.status === 'completed').length;
    const c1InProgress = card1Projects.filter(p => p.status === 'in_progress').length;

    // --- CARD 2: IT Service Jobs (ກອງເດືອນ 1-12) ---
    const allItJobs = data.itJobs || [];
    let card2Jobs = allItJobs;
    if (cf.itJobs !== 'all') {
      card2Jobs = card2Jobs.filter(j => matchesMonth(j.receivedDate || j.createdAt, cf.itJobs));
    }
    const c2Total = card2Jobs.length;
    const c2Completed = card2Jobs.filter(j => j.status === 'completed' || j.status === 'delivered').length;
    const c2Pending = card2Jobs.filter(j => j.status === 'pending' || j.status === 'in_progress').length;

    // --- CARD 3: Documents & Billing (ກອງເດືອນ 1-12) ---
    let card3Docs = data.documents;
    if (cf.docs !== 'all') {
      card3Docs = card3Docs.filter(d => matchesMonth(d.date, cf.docs));
    }
    const c3Total = card3Docs.length;
    const c3Invoices = card3Docs.filter(d => d.docType === 'invoice' || d.docType === 'pos').length;
    const c3Quotations = card3Docs.filter(d => d.docType === 'quotation').length;

    // --- CARD 4: Income (ກອງເດືອນ 1-12) ---
    let incomeTxs = data.transactions.filter(t => t.type === 'income');
    if (cf.income !== 'all') {
      incomeTxs = incomeTxs.filter(t => matchesMonth(t.date, cf.income));
    }
    let totalIncome = 0, serviceIncome = 0, productIncome = 0;
    incomeTxs.forEach(t => {
      totalIncome += t.amount;
      if (t.category === 'service_fee') serviceIncome += t.amount;
      else productIncome += t.amount;
    });

    // --- CARD 5: Expenses (ກອງເດືອນ 1-12) ---
    let expenseTxs = data.transactions.filter(t => t.type === 'expense');
    if (cf.expense !== 'all') {
      expenseTxs = expenseTxs.filter(t => matchesMonth(t.date, cf.expense));
    }
    let totalExpense = 0, cogsExpense = 0, otherExpense = 0;
    expenseTxs.forEach(t => {
      totalExpense += t.amount;
      if (t.category === 'cost_of_goods' || t.category === 'stock_purchase') cogsExpense += t.amount;
      else otherExpense += t.amount;
    });

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

    // --- CARD 6: Stock Items (ບໍ່ຕ້ອງມີການກອງ) ---
    let totalStockQty = 0;
    data.products.forEach(p => {
      const inStock = p.hasSn 
        ? data.productSerials.filter(s => s.productId === p.id && s.status === 'in_stock').length 
        : 10;
      totalStockQty += inStock;
    });

    // --- CARD 7: Purchase Orders (PO) (ບໍ່ຕ້ອງມີການກອງ) ---
    const card7POs = data.purchaseOrders;
    const poOrderedCount = card7POs.filter(po => po.status === 'ordered').length;
    const poReceivedCount = card7POs.filter(po => po.status === 'received').length;

    // --- CARD 8: Stock Valuation (ບໍ່ຕ້ອງມີການກອງ) ---
    let totalStockValue = 0;
    data.products.forEach(p => {
      const inStock = p.hasSn 
        ? data.productSerials.filter(s => s.productId === p.id && s.status === 'in_stock').length 
        : 10;
      totalStockValue += (inStock * p.costPrice);
    });

    // Alert Banner Calculations
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];
    const next30DaysStr = new Date(todayObj.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

    // 1. Overdue Invoices
    const overdueInvoices = (data.documents || []).filter(d => 
      (d.docType === 'invoice' || d.docType === 'pos') && 
      d.status !== 'paid' && 
      d.status !== 'cancelled' && 
      d.dueDate && 
      d.dueDate < todayStr
    );
    const overdueTotal = overdueInvoices.reduce((sum, d) => sum + (d.grandTotal || d.totalAmount || 0), 0);

    // 2. Expiring Client Systems (Domain / Hosting / SLA expiring within 30 days)
    const expiringSystems = (data.clientSystems || []).filter(s => {
      if (s.status === 'expired' || !s.expiryDate) return false;
      return s.expiryDate <= next30DaysStr;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Dashboard Top Header Bar (ເອົາປຸ່ມທີ່ໝາຍຄູນອອກຕາມຮູບ) -->
        <div class="glass-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black tracking-tight flex items-center gap-3">
              <i class="fa-solid fa-chart-pie text-sky-400"></i>
              ສະຫຼຸບພາບລວມຂອງທຸລະກິດ (Dashboard)
            </h1>
            <p class="text-xs opacity-75 mt-0.5">ລາຍງານການເງິນ, ໂຄງການໄອທີ, ໜ້າວຽກໄອທີ, ໃບບິນ ແລະ ສາງສິນຄ້າ</p>
          </div>
        </div>

        <!-- Real-time Alerts: Overdue Invoices & Expiring Client Systems -->
        ${overdueInvoices.length > 0 || expiringSystems.length > 0 ? `
          <div class="space-y-3">
            ${overdueInvoices.length > 0 ? `
              <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-transparent border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 text-lg border border-rose-500/30">
                    <i class="fa-solid fa-triangle-exclamation animate-bounce"></i>
                  </div>
                  <div>
                    <h4 class="font-black text-rose-300 text-sm flex items-center gap-2">
                      ແຈ້ງເຕືອນ: ມີໃບເກັບເງິນກາຍກຳນົດຊຳລະ ${overdueInvoices.length} ສະບັບ!
                    </h4>
                    <p class="text-xs text-rose-200/80 mt-0.5">
                      ຍອດເງິນທີ່ລໍຖ້າຮັບທັງໝົດ: <strong class="text-white font-mono font-bold">${overdueTotal.toLocaleString()} ₭</strong> (ກະລຸນາກວດສອບ ແລະ ຕິດຕາມລູກຄ້າ)
                    </p>
                  </div>
                </div>
                <button onclick="App.filterOverdueDocs()" class="btn-glass-danger text-xs py-1.5 px-3.5 whitespace-nowrap self-end sm:self-auto flex items-center gap-1.5 shadow-sm">
                  <span>ກວດເບິ່ງໃບບິນທີ່ກາຍກຳນົດ</span>
                  <i class="fa-solid fa-arrow-right text-[11px]"></i>
                </button>
              </div>
            ` : ''}

            ${expiringSystems.length > 0 ? `
              <div class="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 text-lg border border-amber-500/30">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                  </div>
                  <div>
                    <h4 class="font-black text-amber-300 text-sm flex items-center gap-2">
                      ແຈ້ງເຕືອນ: ລະບົບລູກຄ້າ (Domain / Hosting / SLA) ໃກ້ຈະໝົດອາຍຸ ${expiringSystems.length} ລະບົບ!
                    </h4>
                    <p class="text-xs text-amber-200/80 mt-0.5">
                      ລະບົບທີ່ມີກຳນົດຕໍ່ອາຍຸພາຍໃນ 30 ວັນ: <strong>${expiringSystems.map(s => s.systemName).slice(0, 3).join(', ')}${expiringSystems.length > 3 ? '...' : ''}</strong>
                    </p>
                  </div>
                </div>
                <button onclick="App.switchView('client-systems')" class="btn-glass-secondary border-amber-400/40 text-amber-300 hover:bg-amber-500/20 text-xs py-1.5 px-3.5 whitespace-nowrap self-end sm:self-auto flex items-center gap-1.5 shadow-sm">
                  <span>ຈັດການລະບົບທີ່ໃກ້ໝົດອາຍຸ</span>
                  <i class="fa-solid fa-arrow-right text-[11px]"></i>
                </button>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 9 STAT CARDS: ROWS 1 & 2 FILTERED BY MONTH 1-12 (INCOME, EXPENSE, NET PROFIT SYNCED), ROW 3 REALTIME INVENTORY -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <!-- Card 1: ໂຄງການໄອທີ (Projects) - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-diagram-project text-sky-400"></i> ໂຄງການໄອທີ
                </span>
                <select onchange="App.setCardFilter('projects', this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold">
                  ${buildMonthOptions(cf.projects)}
                </select>
              </div>
              <div class="text-3xl font-black">${c1Total} <span class="text-xs font-normal opacity-70">ໂຄງການ</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span class="text-emerald-400 font-bold">ສຳເລັດ: ${c1Completed}</span>
              <span class="text-amber-400 font-bold">ກຳລັງເຮັດ: ${c1InProgress}</span>
            </div>
          </div>

          <!-- Card 2: ໜ້າວຽກໄອທີ (IT Service Jobs) - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between border-teal-500/20">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-wrench text-teal-400"></i> ໜ້າວຽກໄອທີ
                </span>
                <select onchange="App.setCardFilter('itJobs', this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold">
                  ${buildMonthOptions(cf.itJobs)}
                </select>
              </div>
              <div class="text-3xl font-black text-teal-400">${c2Total} <span class="text-xs font-normal opacity-70 text-slate-300">Jobs</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between items-center text-xs">
              <span class="text-emerald-400 font-bold">ສຳເລັດ: ${c2Completed}</span>
              <span class="text-sky-400 cursor-pointer hover:underline font-bold" onclick="App.switchView('it-jobs')">ເບິ່ງວຽກ →</span>
            </div>
          </div>

          <!-- Card 3: ໃບບິນ ແລະ ເອກະສານ - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice-dollar text-purple-400"></i> ໃບບິນ/ເອກະສານ
                </span>
                <select onchange="App.setCardFilter('docs', this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold">
                  ${buildMonthOptions(cf.docs)}
                </select>
              </div>
              <div class="text-3xl font-black">${c3Total} <span class="text-xs font-normal opacity-70">ສະບັບ</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span class="text-emerald-400 font-bold">ບິນຮັບ: ${c3Invoices}</span>
              <span class="text-sky-400 font-bold">ໃບສະເໜີ: ${c3Quotations}</span>
            </div>
          </div>

          <!-- Card 4: ລວມຍອດລາຍຮັບ - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between border-emerald-500/25">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-arrow-trend-up text-emerald-400"></i> ລວມຍອດລາຍຮັບ
                </span>
                <select onchange="App.setFinancialFilter(this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold text-emerald-400">
                  ${buildMonthOptions(cf.income)}
                </select>
              </div>
              <div class="text-2xl font-black text-emerald-400">${totalIncome.toLocaleString()} <span class="text-xs font-normal opacity-70">₭</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span>ບໍລິການ: <strong>${serviceIncome.toLocaleString()}</strong></span>
              <span>ຂາຍ: <strong>${productIncome.toLocaleString()}</strong></span>
            </div>
          </div>

          <!-- Card 5: ຍອດລາຍຈ່າຍລວມ - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between border-rose-500/25">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-arrow-trend-down text-rose-400"></i> ຍອດລາຍຈ່າຍລວມ
                </span>
                <select onchange="App.setFinancialFilter(this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold text-rose-400">
                  ${buildMonthOptions(cf.expense)}
                </select>
              </div>
              <div class="text-2xl font-black text-rose-400">${totalExpense.toLocaleString()} <span class="text-xs font-normal opacity-70">₭</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span>ຕົ້ນທຶນ/PO: <strong>${cogsExpense.toLocaleString()}</strong></span>
              <span>ອື່ນໆ: <strong>${otherExpense.toLocaleString()}</strong></span>
            </div>
          </div>

          <!-- Card 6: ກຳໄລສຸດທິ (Net Profit) - ກອງເດືອນ 1 ຫາ 12 -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between ${netProfit >= 0 ? 'border-sky-500/30' : 'border-rose-500/30'}">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-scale-balanced ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}"></i> ກຳໄລສຸດທິ (Net Profit)
                </span>
                <select onchange="App.setFinancialFilter(this.value)" class="glass-input py-0.5 px-1.5 text-[11px] font-bold text-sky-400">
                  ${buildMonthOptions(cf.income)}
                </select>
              </div>
              <div class="text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                ${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} <span class="text-xs font-normal opacity-70">₭</span>
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span>Margin: <strong>${profitMargin}%</strong></span>
              <span class="${netProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}">
                ${netProfit >= 0 ? '✓ ມີກຳໄລ' : '⚠️ ຂາດທຶນ'}
              </span>
            </div>
          </div>

          <!-- Card 7: ສິນຄ້າໃນສະຕອກ (Realtime ບໍ່ຕ້ອງມີການກອງ) -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-boxes-stacked text-amber-400"></i> ສິນຄ້າໃນສະຕອກ
                </span>
                <span class="badge-glass-amber text-[10px] px-2 py-0.5 rounded font-bold">Realtime</span>
              </div>
              <div class="text-3xl font-black">${totalStockQty} <span class="text-xs font-normal opacity-70">ຊິ້ນ</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span>${data.products.length} SKU</span>
              <span class="text-amber-400 cursor-pointer hover:underline font-bold" onclick="App.switchView('products')">ຈັດການ →</span>
            </div>
          </div>

          <!-- Card 8: ສິນຄ້າກຳລັງສັ່ງຊື້ (PO) (Realtime ບໍ່ຕ້ອງມີການກອງ) -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-truck-fast text-indigo-400"></i> ກຳລັງສັ່ງຊື້ (PO)
                </span>
                <span class="badge-glass-cyan text-[10px] px-2 py-0.5 rounded font-bold">Realtime</span>
              </div>
              <div class="text-3xl font-black text-indigo-400">${card7POs.length} <span class="text-xs font-normal opacity-70 text-slate-300">ໃບສັ່ງຊື້</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span class="text-amber-400 font-bold">ສັ່ງຊື້: ${poOrderedCount} | ຮັບ: ${poReceivedCount}</span>
              <span class="text-sky-400 cursor-pointer hover:underline font-bold" onclick="App.setDocTab('po'); App.switchView('documents')">ເບິ່ງ PO →</span>
            </div>
          </div>

          <!-- Card 9: ມູນຄ່າສິນຄ້າລວມໃນສາງ (Realtime ບໍ່ຕ້ອງມີການກອງ) -->
          <div class="glass-panel glass-panel-hover p-4 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-1 mb-2">
                <span class="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <i class="fa-solid fa-vault text-cyan-400"></i> ມູນຄ່າສິນຄ້າໃນສາງ
                </span>
                <span class="badge-glass-cyan text-[10px] px-2 py-0.5 rounded font-mono font-bold">ຕົ້ນທຶນຕົວຈິງ</span>
              </div>
              <div class="text-2xl font-black text-cyan-400">${totalStockValue.toLocaleString()} <span class="text-xs font-normal opacity-70">₭</span></div>
            </div>
            <div class="mt-3 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span class="opacity-75">ມູນຄ່າລວມສາງ</span>
              <span class="text-emerald-400 cursor-pointer hover:underline font-bold" onclick="App.switchView('products')">ເບິ່ງລາຍລະອຽດ →</span>
            </div>
          </div>

        </div>


        <!-- 4 CHARTS (ພ້ອມຕົວກອງປີສະເພາະກຣາຟລາຍຮັບ-ລາຍຈ່າຍ) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Graph 1: ລາຍຮັບ-ລາຍຈ່າຍແຕ່ລະເດືອນ ພ້ອມຕົວກອງປີ -->
          <div class="glass-panel p-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 class="text-sm font-bold flex items-center gap-2">
                <i class="fa-solid fa-chart-column text-emerald-400"></i>
                ຍອດລາຍຮັບ-ລາຍຈ່າຍແຕ່ລະເດືອນ (ຮັບ: ສີຂຽວ | ຈ່າຍ: ສີແດງ)
              </h3>
              <div class="flex items-center gap-1.5">
                <span class="text-xs opacity-75">ເລືອກປີ:</span>
                <select id="chart-year-select" onchange="App.setChartYear(this.value)" class="glass-input py-0.5 px-2 text-xs font-bold">
                  <option value="2026" ${this.selectedChartYear === '2026' ? 'selected' : ''}>2026</option>
                  <option value="2025" ${this.selectedChartYear === '2025' ? 'selected' : ''}>2025</option>
                  <option value="2024" ${this.selectedChartYear === '2024' ? 'selected' : ''}>2024</option>
                </select>
              </div>
            </div>
            <div class="h-64">
              <canvas id="chart-monthly-income-expense"></canvas>
            </div>
          </div>

          <!-- Graph 2: ມູນຄ່າສິນຄ້າຕາມໝວດ -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-sky-400"></i>
                ຍອດມູນຄ່າສີນຄ້າໃນສະຕອກຕາມໝວດໝູ່
              </h3>
              <span class="badge-glass-purple text-xs px-2 py-0.5 rounded-full font-bold">ສາງສິນຄ້າ</span>
            </div>
            <div class="h-64 flex items-center justify-center">
              <canvas id="chart-stock-by-category"></canvas>
            </div>
          </div>

          <!-- Graph 3: Top 5 ສິນຄ້າໃນສາງ -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold flex items-center gap-2">
                <i class="fa-solid fa-ranking-star text-amber-400"></i>
                ສິນຄ້າໃນສະຕ໋ອກທີ່ມີຫຼາຍທີ່ສຸດ (Top 5)
              </h3>
              <span class="badge-glass-amber text-xs px-2 py-0.5 rounded-full font-bold">Qty</span>
            </div>
            <div class="h-64">
              <canvas id="chart-top-stock"></canvas>
            </div>
          </div>

          <!-- Graph 4: ປະເພດລູກຄ້າ -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold flex items-center gap-2">
                <i class="fa-solid fa-user-group text-teal-400"></i>
                ອັດຕາສ່ວນລູກຄ້າ: ບຸກຄົນ vs ອົງກອນ
              </h3>
              <span class="badge-glass-emerald text-xs px-2 py-0.5 rounded-full font-bold">Clients</span>
            </div>
            <div class="h-64 flex items-center justify-center">
              <canvas id="chart-customer-types"></canvas>
            </div>
          </div>
        </div>

        <!-- 3 BOTTOM WIDGETS -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Low stock -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 class="text-sm font-bold text-rose-400 flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation"></i> ສີນຄ້າທີ່ຕ້ອງຊື້ດ່ວນ
              </h3>
              <span class="badge-glass-rose text-xs px-2 py-0.5 rounded-full font-bold">Low Stock</span>
            </div>
            <div class="space-y-2.5 max-h-64 overflow-y-auto">
              ${this.renderLowStockList(data)}
            </div>
          </div>

          <!-- Deadlines -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 class="text-sm font-bold text-amber-400 flex items-center gap-2">
                <i class="fa-solid fa-hourglass-half"></i> Dead Line ງານ ແລະ ໂຄງການ
              </h3>
              <span class="badge-glass-amber text-xs px-2 py-0.5 rounded-full font-bold">Upcoming</span>
            </div>
            <div class="space-y-2.5 max-h-64 overflow-y-auto">
              ${this.renderProjectDeadlines(data)}
            </div>
          </div>

          <!-- Activity logs -->
          <div class="glass-panel p-5">
            <div class="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <h3 class="text-sm font-bold text-sky-400 flex items-center gap-2">
                <i class="fa-solid fa-clock-rotate-left"></i> ການເຄື່ອນໄຫວລ່າສຸດ
              </h3>
              <span class="badge-glass-cyan text-xs px-2 py-0.5 rounded-full font-bold">Live</span>
            </div>
            <div class="space-y-2.5 max-h-64 overflow-y-auto">
              ${this.renderActivityLogs(data)}
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => this.initDashboardCharts(data), 50);

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (this.currentView === 'dashboard' && this.charts) {
          Object.values(this.charts).forEach(c => {
            try { c.update(); } catch (e) {}
          });
        }
      });
    }
  },

  setDashboardMonth(month) {
    this.selectedDashboardMonth = month;
    this.renderCurrentView();
  },

  setAllCardFiltersToCurrentMonth() {
    const currentYr = new Date().getFullYear();
    const currentMo = String(new Date().getMonth() + 1).padStart(2, '0');
    const defaultVal = `${currentYr}-${currentMo}`;
    ['projects', 'itJobs', 'docs', 'income', 'expense'].forEach(k => {
      this.cardFilters[k] = defaultVal;
    });
    this.renderCurrentView();
  },

  setChartYear(year) {
    this.selectedChartYear = year;
    this.renderCurrentView();
  },

  renderLowStockList(data) {
    const lowItems = [];
    data.products.forEach(p => {
      const inStock = p.hasSn ? data.productSerials.filter(s => s.productId === p.id && s.status === 'in_stock').length : (p.stock !== undefined ? p.stock : 10);
      if (inStock <= p.minStock) lowItems.push({ ...p, inStock });
    });

    if (lowItems.length === 0) return `<div class="text-center py-6 opacity-60 text-xs">ບໍ່ມີສິນຄ້າໃກ້ໝົດສະຕອກ</div>`;

    return lowItems.map(item => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
        <div>
          <div class="text-xs font-bold line-clamp-1">${item.name}</div>
          <div class="text-[11px] opacity-70">SKU: ${item.sku} | ເຫຼືອ: <strong class="text-rose-400">${item.inStock}</strong></div>
        </div>
        <button onclick="App.openCreatePOModal('${item.id}')" class="btn-glass-secondary text-xs py-1 px-2.5">
          ສັ່ງຊື້
        </button>
      </div>
    `).join('');
  },

  renderProjectDeadlines(data) {
    const active = data.projects.filter(p => p.status !== 'completed');
    if (active.length === 0) return `<div class="text-center py-6 opacity-60 text-xs">ບໍ່ມີໂຄງການຄ້າງສົ່ງ</div>`;

    return active.map(p => `
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
        <div class="flex justify-between items-baseline mb-1">
          <span class="font-bold text-sky-400">${p.code}</span>
          <span class="font-semibold text-amber-400"><i class="fa-regular fa-clock"></i> ${p.deadline}</span>
        </div>
        <div class="font-bold line-clamp-1 mb-1.5">${p.title}</div>
        <div class="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
          <div class="bg-gradient-to-r from-sky-400 to-emerald-400 h-1.5" style="width: ${p.progress}%"></div>
        </div>
      </div>
    `).join('');
  },

  renderActivityLogs(data) {
    const logs = data.activityLogs || [];
    if (logs.length === 0) return `<div class="text-center py-6 opacity-60 text-xs">ບໍ່ມີປະຫວັດການເຄື່ອນໄຫວ</div>`;

    return logs.slice(0, 5).map(l => `
      <div class="p-2 rounded-xl bg-white/5 border border-white/10 text-xs">
        <div class="flex justify-between items-baseline">
          <span class="font-bold text-sky-400">${l.user}</span>
          <span class="text-[10px] opacity-70">${l.time}</span>
        </div>
        <div class="text-[11px] opacity-90">${l.action} - ${l.details}</div>
      </div>
    `).join('');
  },

  initDashboardCharts(data) {
    if (typeof Chart === 'undefined') return;

    const laoFont = "'Noto Sans Lao', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    Chart.defaults.font.family = laoFont;
    Chart.defaults.font.size = 12;

    const textColor = this.currentTheme === 'dark' ? '#cbd5e1' : '#334155';
    const gridColor = this.currentTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Chart 1: Monthly Income vs Expense for selected Year
    const ctxMonthly = document.getElementById('chart-monthly-income-expense')?.getContext('2d');
    if (ctxMonthly) {
      const year = this.selectedChartYear;
      const monthIncomes = Array(12).fill(0);
      const monthExpenses = Array(12).fill(0);

      data.transactions.forEach(t => {
        if ((t.date || '').startsWith(year)) {
          const m = parseInt(t.date.split('-')[1], 10) - 1;
          if (m >= 0 && m < 12) {
            if (t.type === 'income') monthIncomes[m] += t.amount;
            else monthExpenses[m] += t.amount;
          }
        }
      });

      // Default mock if empty
      if (monthIncomes.every(v => v === 0)) {
        [15000000, 18000000, 22000000, 20000000, 28000000, 24000000, 31000000, 29000000, 35000000].forEach((v, i) => monthIncomes[i] = v);
        [11000000, 12500000, 16000000, 14000000, 19000000, 17500000, 22000000, 21000000, 23000000].forEach((v, i) => monthExpenses[i] = v);
      }

      this.charts.monthly = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
          labels: ['ມ.ກ', 'ກ.ພ', 'ມ.ນ', 'ເມ.ສ', 'ພ.ພ', 'ມິ.ຖ', 'ກ.ລ', 'ສ.ຫ', 'ກ.ຍ', 'ຕ.ລ', 'ພ.ຈ', 'ທ.ວ'],
          datasets: [
            { label: 'ລາຍຮັບ (Income)', data: monthIncomes, backgroundColor: '#10b981', borderRadius: 6 },
            { label: 'ລາຍຈ່າຍ (Expense)', data: monthExpenses, backgroundColor: '#ef4444', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: textColor,
                font: { family: laoFont, size: 12, weight: '600' }
              }
            },
            tooltip: {
              titleFont: { family: laoFont, weight: '600' },
              bodyFont: { family: laoFont }
            }
          },
          scales: {
            x: {
              ticks: {
                color: textColor,
                font: { family: laoFont, size: 12, weight: '600' }
              },
              grid: { color: gridColor }
            },
            y: {
              ticks: {
                color: textColor,
                font: { family: laoFont, size: 11 }
              },
              grid: { color: gridColor }
            }
          }
        }
      });
    }

    // Chart 2: Category Valuation
    const ctxStockCat = document.getElementById('chart-stock-by-category')?.getContext('2d');
    if (ctxStockCat) {
      const catLabels = data.categories.map(c => c.name.split(' (')[0]);
      const catValues = data.categories.map(c => window.db.getCategoryStats(c.id).valuation || 2000000);

      this.charts.stockCat = new Chart(ctxStockCat, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: ['#0284c7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
            borderWidth: 2,
            borderColor: this.currentTheme === 'dark' ? '#0f172a' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                font: { family: laoFont, size: 11, weight: '500' }
              }
            },
            tooltip: {
              titleFont: { family: laoFont, weight: '600' },
              bodyFont: { family: laoFont }
            }
          }
        }
      });
    }

    // Chart 3: Top Stock
    const ctxTopStock = document.getElementById('chart-top-stock')?.getContext('2d');
    if (ctxTopStock) {
      const topItems = data.products.map(p => {
        const count = p.hasSn ? data.productSerials.filter(s => s.productId === p.id && s.status === 'in_stock').length : 10;
        return { name: p.name.substring(0, 18) + '...', count };
      }).sort((a, b) => b.count - a.count).slice(0, 5);

      this.charts.topStock = new Chart(ctxTopStock, {
        type: 'bar',
        indexAxis: 'y',
        data: {
          labels: topItems.map(i => i.name),
          datasets: [{ label: 'ຈຳນວນ', data: topItems.map(i => i.count), backgroundColor: '#38bdf8', borderRadius: 6 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              titleFont: { family: laoFont, weight: '600' },
              bodyFont: { family: laoFont }
            }
          },
          scales: {
            x: {
              ticks: { color: textColor, font: { family: laoFont, size: 11 } },
              grid: { color: gridColor }
            },
            y: {
              ticks: { color: textColor, font: { family: laoFont, size: 12, weight: '500' } },
              grid: { display: false }
            }
          }
        }
      });
    }

    // Chart 4: Customers
    const ctxCustomer = document.getElementById('chart-customer-types')?.getContext('2d');
    if (ctxCustomer) {
      const corp = data.customers.filter(c => c.type === 'corporate').length;
      const ind = data.customers.filter(c => c.type === 'individual').length;

      this.charts.customers = new Chart(ctxCustomer, {
        type: 'pie',
        data: {
          labels: ['ລູກຄ້າອົງກອນ (Corporate)', 'ບຸກຄົນທົ່ວໄປ (Individual)'],
          datasets: [{
            data: [corp, ind],
            backgroundColor: ['#0284c7', '#10b981'],
            borderWidth: 2,
            borderColor: this.currentTheme === 'dark' ? '#0f172a' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: textColor,
                font: { family: laoFont, size: 11, weight: '500' }
              }
            },
            tooltip: {
              titleFont: { family: laoFont, weight: '600' },
              bodyFont: { family: laoFont }
            }
          }
        }
      });
    }
  },

  // --------------------------------------------------------------------------
  // VIEW 2: ການຈັດການສີນຄ້າ (INVENTORY & PRODUCTS)
  // --------------------------------------------------------------------------
  renderProducts(container) {
    const categories = window.db.getCategories();
    const products = window.db.getProducts();

    const categoryCardsHtml = categories.map(cat => {
      const stats = window.db.getCategoryStats(cat.id);
      const isSelected = this.selectedCategoryId === cat.id;
      return `
        <div onclick="App.filterCategory('${cat.id}')" 
             class="glass-panel glass-panel-hover p-4 cursor-pointer relative border ${isSelected ? 'border-sky-400 bg-sky-500/20' : 'border-white/10'}">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-bold line-clamp-1">${cat.name}</h4>
            <span class="badge-glass-cyan text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
              ${stats.skuCount} SKU
            </span>
          </div>
          <div class="text-xs opacity-80 mb-1">
            ຈຳນວນໃນສະຕອກ: <strong class="text-emerald-400 text-sm">${stats.stockQty}</strong>
          </div>
          <div class="text-xs opacity-80">
            ມູນຄ່າລວມ: <strong class="text-sky-400 font-bold">${stats.valuation.toLocaleString()} ₭</strong>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-boxes-stacked text-amber-400"></i>
              ການຈັດການສີນຄ້າ ແລະ ສາງ (Inventory)
            </h1>
            <p class="text-xs opacity-75 mt-1">ຄຸ້ມຄອງໝວດ, SKU ອັດຕະໂນມັດ, ລາຄາຂາຍ/ກຳໄລ %, SN/MAC, ແລະ ເບີກ-ຮັບສິນຄ້າ</p>
          </div>

          ${this.canManage('products') ? `
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="App.openCategoryModal()" class="btn-glass-secondary text-xs">
                <i class="fa-solid fa-folder-plus text-sky-400"></i> ຈັດການໝວດສີນຄ້າ
              </button>
              <button onclick="App.openAddProductModal()" class="btn-glass-primary text-xs">
                <i class="fa-solid fa-plus-circle"></i> ເພີ່ມສີນຄ້າໃໝ່ (Auto SKU)
              </button>
              <button onclick="App.openStockInModal()" class="btn-glass-success text-xs">
                <i class="fa-solid fa-arrow-down-to-bracket"></i> ນຳສີນຄ້າເຂົ້າສະຕອ໋ກ
              </button>
              <button onclick="App.openStockOutModal()" class="btn-glass-danger text-xs">
                <i class="fa-solid fa-arrow-up-from-bracket"></i> ເບີກສີນຄ້າອອກ
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2">
              <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ (Technician Read-Only)</span>
            </div>
          `}
        </div>

        <!-- Categories Overview -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider opacity-80">ໝວດສີນຄ້າ (Categories)</h3>
            ${this.selectedCategoryId !== 'all' ? `
              <button onclick="App.filterCategory('all')" class="text-xs text-sky-400 hover:underline">
                <i class="fa-solid fa-rotate-left"></i> ສະແດງທຸກໝວດ
              </button>
            ` : ''}
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            ${categoryCardsHtml}
          </div>
        </div>

        <!-- Filter Tabs & Actions -->
        <div class="glass-panel p-4">
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div class="flex items-center gap-2 overflow-x-auto text-xs font-bold shrink-0">
              <button onclick="App.setProductTab('in_stock')" 
                      class="px-4 py-2 rounded-xl transition ${this.productFilterTab === 'in_stock' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-white/5 opacity-75 hover:opacity-100'}">
                <i class="fa-solid fa-box-open mr-1"></i> ສີນຄ້າທີ່ມີໃນສະຕອ໋ກ
              </button>
              <button onclick="App.setProductTab('ordered')" 
                      class="px-4 py-2 rounded-xl transition ${this.productFilterTab === 'ordered' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 opacity-75 hover:opacity-100'}">
                <i class="fa-solid fa-truck-fast mr-1"></i> ສີນຄ້າກຳລັງສັ່ງຊື້
              </button>
              <button onclick="App.setProductTab('dispatched')" 
                      class="px-4 py-2 rounded-xl transition ${this.productFilterTab === 'dispatched' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 opacity-75 hover:opacity-100'}">
                <i class="fa-solid fa-clipboard-check mr-1"></i> ສີນຄ້າທີ່ມີການເບີກຈ່າຍແລ້ວ
              </button>
            </div>

            <!-- Search Bar & Actions -->
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="relative flex-1 sm:w-72">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 opacity-60 text-xs"></i>
                <input type="text" 
                       placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ, SKU, Model, SN, ຜູ້ສະໜອງ..." 
                       value="${this.productSearchQuery || ''}" 
                       oninput="App.setProductSearch(this.value)" 
                       class="glass-input pl-8 pr-7 py-1.5 text-xs w-full">
                ${this.productSearchQuery ? `
                  <button onclick="App.setProductSearch('')" class="absolute right-2.5 top-2 text-xs opacity-60 hover:opacity-100 text-slate-400">
                    <i class="fa-solid fa-circle-xmark"></i>
                  </button>
                ` : ''}
              </div>

              <button onclick="ExportService.exportProductsToExcel()" class="btn-glass-secondary text-xs">
                <i class="fa-solid fa-file-excel text-emerald-400"></i> Excel
              </button>
              <button onclick="ExportService.exportSerialsToExcel()" class="btn-glass-secondary text-xs">
                <i class="fa-solid fa-barcode text-sky-400"></i> Export SNs
              </button>
            </div>
          </div>

          <div id="product-table-container" class="mt-4 overflow-x-auto">
            ${this.renderProductTableContent()}
          </div>
        </div>
      </div>
    `;
  },

  filterCategory(catId) {
    this.selectedCategoryId = catId;
    this.renderCurrentView();
  },

  setProductTab(tab) {
    this.productFilterTab = tab;
    this.renderCurrentView();
  },

  renderProductTableContent() {
    const data = window.db.data;

    // Tab 1: In Stock
    if (this.productFilterTab === 'in_stock') {
      let filtered = data.products;
      if (this.selectedCategoryId !== 'all') {
        filtered = filtered.filter(p => p.categoryId === this.selectedCategoryId);
      }
      if (this.productSearchQuery) {
        const q = this.productSearchQuery.trim().toLowerCase();
        filtered = filtered.filter(p => 
          (p.name || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.model || '').toLowerCase().includes(q) ||
          (p.snOrMac || '').toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q) ||
          (p.hasSn && data.productSerials.some(s => s.productId === p.id && (s.serialNumber || '').toLowerCase().includes(q)))
        );
      }

      if (filtered.length === 0) return `<div class="text-center py-12 opacity-60 text-sm">ບໍ່ພົບສິນຄ້າທີ່ກົງກັບການຄົ້ນຫາ</div>`;

      return `
        <table class="glass-table">
          <thead>
            <tr>
              <th style="width: 45px;" class="text-center">ລ/ດ</th>
              <th style="width: 120px;">ລະຫັດ SKU</th>
              <th>ຊື່ສິນຄ້າ & Model</th>
              <th>ຜູ້ສະໜອງ</th>
              <th style="width: 110px;" class="text-right">ຕົ້ນທຶນ (₭)</th>
              <th style="width: 90px;" class="text-center">ກຳໄລ %</th>
              <th style="width: 120px;" class="text-right">ລາຄາຂາຍ (₭)</th>
              <th style="width: 110px;" class="text-center">ໃນສາງ</th>
              <th style="width: 170px;" class="text-right pr-4">ການຈັດການ</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p, idx) => {
              const inStockSerials = p.hasSn ? data.productSerials.filter(s => s.productId === p.id && s.status === 'in_stock') : [];
              const inStockQty = p.hasSn ? inStockSerials.length : (p.stock !== undefined ? p.stock : 10);
              return `
                <tr>
                  <td class="text-center opacity-60">${idx + 1}</td>
                  <td><span class="badge-glass-cyan text-xs font-mono font-bold px-2 py-0.5 rounded">${p.sku}</span></td>
                  <td>
                    <div class="font-bold">${p.name}</div>
                    <div class="text-[11px] opacity-70">Model: <strong>${p.model || '-'}</strong> | SN/MAC: ${p.snOrMac || '-'}</div>
                  </td>
                  <td class="text-xs opacity-80">${p.supplierName || '-'}</td>
                  <td class="text-right opacity-80">${p.costPrice.toLocaleString()}</td>
                  <td class="text-center font-bold text-emerald-400">+${p.profitMargin || 0}%</td>
                  <td class="text-right font-black text-sky-400">${p.salePrice.toLocaleString()}</td>
                  <td class="text-center">
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold ${inStockQty > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">
                      ${inStockQty} ${p.unit || 'ໜ່ວຍ'}
                    </span>
                  </td>
                  <td class="text-right pr-3">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="ExportService.printProductBarcodeLabel('${p.id}')" class="p-1.5 text-amber-400 hover:text-amber-300 transition" title="ພິມສະຕິກເກີບາໂຄ້ດ (Barcode Label)">
                        <i class="fa-solid fa-barcode"></i>
                      </button>
                      ${p.hasSn ? `
                        <button onclick="App.viewProductSerials('${p.id}')" class="btn-glass-primary text-[11px] py-1 px-2" title="ເບິ່ງ SN">
                          <i class="fa-solid fa-barcode mr-1"></i>SN (${inStockSerials.length})
                        </button>
                      ` : ''}
                      ${this.canManage('products') ? `
                        <button onclick="App.openEditProductModal('${p.id}')" class="p-1.5 text-sky-400 hover:text-sky-300 transition" title="ແກ້ໄຂ">
                          <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="App.deleteProduct('${p.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 transition" title="ລຶບ">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      ` : `
                        <span class="text-[10px] opacity-50"><i class="fa-solid fa-lock" title="Read Only"></i></span>
                      `}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // Tab 2: Ordered (POs) with Edit & Delete
    if (this.productFilterTab === 'ordered') {
      let pos = data.purchaseOrders.filter(po => po.status === 'ordered');
      if (this.productSearchQuery) {
        const q = this.productSearchQuery.trim().toLowerCase();
        pos = pos.filter(po => 
          (po.poNumber || '').toLowerCase().includes(q) ||
          (po.supplierName || '').toLowerCase().includes(q) ||
          (po.items && po.items.some(it => (it.productName || it.name || '').toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q)))
        );
      }
      if (pos.length === 0) return `<div class="text-center py-12 opacity-60 text-sm">ບໍ່ມີລາຍການສິນຄ້າກຳລັງສັ່ງຊື້ທີ່ກົງກັບການຄົ້ນຫາ</div>`;

      return pos.map(po => `
        <div class="glass-card p-4 mb-3">
          <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2 border-b border-white/10 pb-2">
            <div>
              <span class="badge-glass-amber text-xs font-mono font-bold px-2 py-0.5 rounded mr-2">${po.poNumber}</span>
              <span class="badge-glass-amber text-xs px-2 py-0.5 rounded mr-2"><i class="fa-solid fa-truck"></i> ສັ່ງຊື້ແລ້ວ/ກຳລັງຂົນສົ່ງ</span>
              <span class="font-bold text-sm">ຜູ້ສະໜອງ: ${po.supplierName || '-'}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs opacity-75">ວັນທີສັ່ງ: ${po.orderDate} | ກຳນົດສົ່ງ: ${po.expectedDate || '-'}</span>
              <button onclick="App.stockInFromPO('${po.id}')" class="btn-glass-success text-xs py-1 px-2.5">
                <i class="fa-solid fa-box-check"></i> ຮັບເຂົ້າສາງ
              </button>
              <button onclick="App.openEditPOModal('${po.id}')" class="p-1 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ PO"><i class="fa-solid fa-pen"></i></button>
              <button onclick="App.deletePO('${po.id}')" class="p-1 text-rose-400 hover:opacity-80" title="ລຶບ PO"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            ${po.items.map(it => `
              <div class="p-2 rounded bg-white/5 flex justify-between">
                <span>${it.productName || it.name} (x${it.qty})</span>
                <strong class="text-amber-400">${(it.total || 0).toLocaleString()} ₭</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    // Tab 3: Dispatched Items with Edit Notes & Delete/Revoke
    if (this.productFilterTab === 'dispatched') {
      let sold = data.productSerials.filter(s => s.status === 'sold');
      if (this.productSearchQuery) {
        const q = this.productSearchQuery.trim().toLowerCase();
        sold = sold.filter(s => {
          const p = data.products.find(pr => pr.id === s.productId);
          return (s.serialNumber || '').toLowerCase().includes(q) ||
                 (s.macAddress || '').toLowerCase().includes(q) ||
                 (s.invoiceId || '').toLowerCase().includes(q) ||
                 (s.notes || '').toLowerCase().includes(q) ||
                 (p && (p.name || '').toLowerCase().includes(q));
        });
      }
      if (sold.length === 0) return `<div class="text-center py-12 opacity-60 text-sm">ຍັງບໍ່ມີປະຫວັດການເບີກຈ່າຍສິນຄ້າທີ່ກົງກັບການຄົ້ນຫາ</div>`;

      return `
        <table class="glass-table">
          <thead>
            <tr>
              <th style="width: 45px;" class="text-center">ລ/ດ</th>
              <th>Serial Number (SN)</th>
              <th>MAC Address</th>
              <th>ຊື່ສິນຄ້າ</th>
              <th style="width: 125px;" class="whitespace-nowrap">ວັນທີເບີກຈ່າຍ</th>
              <th>ຜູກໃບບິນ</th>
              <th>ໝາຍເຫດ</th>
              <th style="width: 120px;" class="text-right pr-4">ຈັດການ</th>
            </tr>
          </thead>
          <tbody>
            ${sold.map((s, idx) => {
              const p = data.products.find(pr => pr.id === s.productId);
              return `
                <tr>
                  <td class="text-center opacity-60">${idx + 1}</td>
                  <td><span class="font-mono font-bold text-rose-400">${s.serialNumber}</span></td>
                  <td class="font-mono text-xs opacity-75">${s.macAddress || '-'}</td>
                  <td>${p ? p.name : '-'}</td>
                  <td class="font-mono text-xs whitespace-nowrap">${s.soldDate || '-'}</td>
                  <td><span class="badge-glass-cyan text-xs font-mono">${s.invoiceId || 'ຂາຍໜ້າຮ້ານ'}</span></td>
                  <td class="text-xs opacity-75">${s.notes || '-'}</td>
                  <td class="text-right pr-3">
                    <div class="flex items-center justify-end gap-1.5">
                      <button onclick="App.openEditDispatchedModal('${s.id}')" class="p-1.5 text-sky-400 hover:text-sky-300 transition" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                      <button onclick="App.revokeDispatchedItem('${s.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 transition" title="ຍົກເລີກການເບີກ / ຄືນສາງ"><i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // PRODUCT & CATEGORY MODALS WITH CONTINUOUS SKU & PROFIT MARGIN 2-WAY CALC
  // --------------------------------------------------------------------------
  openAddProductModal() {
    const cats = window.db.getCategories();
    const brands = window.db.getBrands();
    const suppliers = window.db.getSuppliers();

    const defaultCatId = cats[0]?.id || '';
    const suggestedSku = window.db.generateNextSku(defaultCatId);

    const catOptions = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const brandOptions = brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    const supOptions = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    Swal.fire({
      title: 'ເພີ່ມສິນຄ້າໃໝ່ (Auto Continuous SKU)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດສິນຄ້າ *</label>
              <select id="p-modal-cat" onchange="App.handleCategoryChangeForSku(this.value)" class="glass-input w-full">${catOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ລະຫັດ SKU (Auto Generated) *</label>
              <input type="text" id="p-modal-sku" class="glass-input w-full font-mono font-bold uppercase text-sky-400" value="${suggestedSku}">
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຊື່ສິນຄ້າ *</label>
            <input type="text" id="p-modal-name" class="glass-input w-full" placeholder="ເຊັ່ນ: ກ້ອງວົງຈອນປິດ Hikvision 4MP">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">Model (ຮຸ່ນ) *</label>
              <input type="text" id="p-modal-model" class="glass-input w-full" placeholder="ເຊັ່ນ: DS-2CD1047G0-L">
            </div>
            <div>
              <label class="block mb-1">SN / MAC Address</label>
              <input type="text" id="p-modal-snmac" class="glass-input w-full font-mono" placeholder="SN: xxxx / MAC: xx:xx:xx">
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label class="block mb-1 font-bold">ຕົ້ນທຶນ (Cost ₭) *</label>
              <input type="number" id="p-modal-cost" oninput="App.calcFromMargin()" class="glass-input w-full font-bold" value="500000">
            </div>
            <div>
              <label class="block mb-1 font-bold text-emerald-400">ກຳໄລ % (Margin)</label>
              <input type="number" id="p-modal-margin" oninput="App.calcFromMargin()" class="glass-input w-full font-bold text-emerald-400" value="30">
            </div>
            <div>
              <label class="block mb-1 font-bold text-sky-400">ລາຄາຂາຍ (Sale ₭) *</label>
              <input type="number" id="p-modal-sale" oninput="App.calcFromSale()" class="glass-input w-full font-bold text-sky-400" value="650000">
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block mb-1">ແບຣນ</label>
              <select id="p-modal-brand" class="glass-input w-full">${brandOptions}</select>
            </div>
            <div>
              <label class="block mb-1">ຜູ້ສະໜອງ</label>
              <select id="p-modal-sup" class="glass-input w-full">${supOptions}</select>
            </div>
            <div>
              <label class="block mb-1">ຫົວໜ່ວຍ</label>
              <input type="text" id="p-modal-unit" class="glass-input w-full" value="ໜ່ວຍ">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">ຈຳນວນຂັ້ນຕ່ຳ (Min Stock)</label>
              <input type="number" id="p-modal-min" class="glass-input w-full" value="2">
            </div>
            <div>
              <label class="block mb-1">ຕິດຕາມ Serial Number (SN)</label>
              <select id="p-modal-hassn" class="glass-input w-full" onchange="const sw = document.getElementById('p-modal-stock-wrap'); if(sw) sw.style.display = (this.value === '0' ? 'block' : 'none');">
                <option value="1">ແມ່ນ (ຕິດຕາມ SN/MAC ແຍກໜ່ວຍ)</option>
                <option value="0">ບໍ່ (ນັບຕາມຈຳນວນ)</option>
              </select>
            </div>
          </div>
          <div id="p-modal-stock-wrap" style="display: none;" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <label class="block mb-1 font-bold text-amber-400">ຈຳນວນໃນສາງເລີ່ມຕົ້ນ (Initial Stock)</label>
            <input type="number" id="p-modal-stock" class="glass-input w-full font-bold text-amber-400" value="0" min="0">
            <span class="text-[11px] text-amber-300/80">ສິນຄ້າທີ່ບໍ່ມີ SN ຈະໃຊ້ຍອດສະຕັອກນີ້ໃນການຂາຍ ແລະ ຕັດສະຕັອກ</span>
          </div>
          <!-- Product Image Browse / URL -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບພາບສິນຄ້າ (Product Image)</label>
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
                <img id="p-modal-preview" src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200" class="w-full h-full object-cover rounded-lg">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="p-modal-img" class="glass-input w-full py-1 text-xs" 
                       placeholder="ໃສ່ Link ຮູບ ຫຼື ກົດ Browse ຈາກເຄື່ອງ"
                       oninput="document.getElementById('p-modal-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="p-modal-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'p-modal-preview', 'p-modal-img')">
                  <button type="button" onclick="document.getElementById('p-modal-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-folder-open text-sky-400"></i> Browse ຮູບສິນຄ້າ...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ JPG, PNG, WebP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກສິນຄ້າ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const sku = document.getElementById('p-modal-sku')?.value?.trim();
        const name = document.getElementById('p-modal-name')?.value?.trim();
        const costPrice = parseFloat(document.getElementById('p-modal-cost')?.value || '0');
        const profitMargin = parseFloat(document.getElementById('p-modal-margin')?.value || '0');
        const salePrice = parseFloat(document.getElementById('p-modal-sale')?.value || '0');

        if (!sku || !name || salePrice <= 0) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ SKU, ຊື່ສິນຄ້າ ແລະ ລາຄາຂາຍ');
          return false;
        }

        const supId = document.getElementById('p-modal-sup')?.value;
        const sup = window.db.getSuppliers().find(s => s.id === supId);

        return {
          sku,
          name,
          model: document.getElementById('p-modal-model')?.value?.trim() || '',
          snOrMac: document.getElementById('p-modal-snmac')?.value?.trim() || '',
          categoryId: document.getElementById('p-modal-cat')?.value,
          brandId: document.getElementById('p-modal-brand')?.value,
          supplierId: supId,
          supplierName: sup ? sup.name : '',
          costPrice,
          profitMargin,
          salePrice,
          unit: document.getElementById('p-modal-unit')?.value || 'ໜ່ວຍ',
          minStock: parseInt(document.getElementById('p-modal-min')?.value || '2', 10),
          hasSn: parseInt(document.getElementById('p-modal-hassn')?.value || '1', 10),
          stock: parseInt(document.getElementById('p-modal-stock')?.value || '0', 10),
          imageUrl: document.getElementById('p-modal-img')?.value?.trim() || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addProduct(res.value);
        Swal.fire({ title: 'ເພີ່ມສິນຄ້າສຳເລັດ!', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'swal-glass' } });
        this.renderCurrentView();
      }
    });
  },

  handleCategoryChangeForSku(catId) {
    const skuInput = document.getElementById('p-modal-sku');
    if (skuInput) {
      skuInput.value = window.db.generateNextSku(catId);
    }
  },

  // 2-Way Cost / Margin / Sale Price Calculator
  calcFromMargin() {
    const cost = parseFloat(document.getElementById('p-modal-cost')?.value || '0');
    const margin = parseFloat(document.getElementById('p-modal-margin')?.value || '0');
    const saleInput = document.getElementById('p-modal-sale');
    if (cost > 0 && saleInput) {
      const sale = Math.round(cost * (1 + margin / 100));
      saleInput.value = sale;
    }
  },

  calcFromSale() {
    const cost = parseFloat(document.getElementById('p-modal-cost')?.value || '0');
    const sale = parseFloat(document.getElementById('p-modal-sale')?.value || '0');
    const marginInput = document.getElementById('p-modal-margin');
    if (cost > 0 && sale > 0 && marginInput) {
      const margin = (((sale - cost) / cost) * 100).toFixed(2);
      marginInput.value = margin;
    }
  },

  openEditProductModal(productId) {
    const p = window.db.getProductById(productId);
    if (!p) return;

    const cats = window.db.getCategories();
    const brands = window.db.getBrands();
    const suppliers = window.db.getSuppliers();

    const catOptions = cats.map(c => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');
    const brandOptions = brands.map(b => `<option value="${b.id}" ${b.id === p.brandId ? 'selected' : ''}>${b.name}</option>`).join('');
    const supOptions = suppliers.map(s => `<option value="${s.id}" ${s.id === p.supplierId ? 'selected' : ''}>${s.name}</option>`).join('');

    Swal.fire({
      title: `ແກ້ໄຂສິນຄ້າ: ${p.sku}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລະຫັດ SKU</label>
              <input type="text" id="p-edit-sku" class="glass-input w-full font-mono uppercase" value="${p.sku}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ໝວດສິນຄ້າ</label>
              <select id="p-edit-cat" class="glass-input w-full">${catOptions}</select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ຊື່ສິນຄ້າ</label>
            <input type="text" id="p-edit-name" class="glass-input w-full" value="${p.name}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">Model (ຮຸ່ນ)</label>
              <input type="text" id="p-edit-model" class="glass-input w-full" value="${p.model || ''}">
            </div>
            <div>
              <label class="block mb-1">SN / MAC</label>
              <input type="text" id="p-edit-snmac" class="glass-input w-full font-mono" value="${p.snOrMac || ''}">
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label class="block mb-1 font-bold">ຕົ້ນທຶນ (₭)</label>
              <input type="number" id="p-edit-cost" class="glass-input w-full font-bold" value="${p.costPrice}">
            </div>
            <div>
              <label class="block mb-1 font-bold text-emerald-400">ກຳໄລ %</label>
              <input type="number" id="p-edit-margin" class="glass-input w-full font-bold text-emerald-400" value="${p.profitMargin || 30}">
            </div>
            <div>
              <label class="block mb-1 font-bold text-sky-400">ລາຄາຂາຍ (₭)</label>
              <input type="number" id="p-edit-sale" class="glass-input w-full font-bold text-sky-400" value="${p.salePrice}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">ຜູ້ສະໜອງ</label>
              <select id="p-edit-sup" class="glass-input w-full">${supOptions}</select>
            </div>
            <div>
              <label class="block mb-1">ແບຣນ</label>
              <select id="p-edit-brand" class="glass-input w-full">${brandOptions}</select>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block mb-1">ຫົວໜ່ວຍ</label>
              <input type="text" id="p-edit-unit" class="glass-input w-full" value="${p.unit || 'ໜ່ວຍ'}">
            </div>
            <div>
              <label class="block mb-1">ແຈ້ງເຕືອນສະຕັອກຂັ້ນຕ່ຳ</label>
              <input type="number" id="p-edit-min" class="glass-input w-full" value="${p.minStock || 2}">
            </div>
            ${!p.hasSn ? `
              <div>
                <label class="block mb-1 font-bold text-amber-400">ຈຳນວນໃນສາງ (Stock)</label>
                <input type="number" id="p-edit-stock" class="glass-input w-full font-bold text-amber-400" value="${p.stock !== undefined ? p.stock : 10}">
              </div>
            ` : ''}
          </div>
          <!-- Product Image Browse / URL -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບພາບສິນຄ້າ (Product Image)</label>
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
                <img id="p-edit-preview" src="${p.imageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200'}" class="w-full h-full object-cover rounded-lg">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="p-edit-img" class="glass-input w-full py-1 text-xs" 
                       value="${p.imageUrl || ''}" 
                       placeholder="ໃສ່ Link ຮູບ ຫຼື ກົດ Browse ຈາກເຄື່ອງ"
                       oninput="document.getElementById('p-edit-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="p-edit-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'p-edit-preview', 'p-edit-img')">
                  <button type="button" onclick="document.getElementById('p-edit-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-folder-open text-sky-400"></i> Browse ຮູບສິນຄ້າ...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ JPG, PNG, WebP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກການແກ້ໄຂ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const supId = document.getElementById('p-edit-sup')?.value;
        const sup = window.db.getSuppliers().find(s => s.id === supId);
        return {
          sku: document.getElementById('p-edit-sku')?.value?.trim(),
          name: document.getElementById('p-edit-name')?.value?.trim(),
          model: document.getElementById('p-edit-model')?.value?.trim(),
          snOrMac: document.getElementById('p-edit-snmac')?.value?.trim(),
          categoryId: document.getElementById('p-edit-cat')?.value,
          brandId: document.getElementById('p-edit-brand')?.value,
          supplierId: supId,
          supplierName: sup ? sup.name : '',
          costPrice: parseFloat(document.getElementById('p-edit-cost')?.value || '0'),
          profitMargin: parseFloat(document.getElementById('p-edit-margin')?.value || '0'),
          salePrice: parseFloat(document.getElementById('p-edit-sale')?.value || '0'),
          unit: document.getElementById('p-edit-unit')?.value?.trim() || p.unit || 'ໜ່ວຍ',
          minStock: parseInt(document.getElementById('p-edit-min')?.value || '2', 10),
          stock: document.getElementById('p-edit-stock') ? parseInt(document.getElementById('p-edit-stock').value || '0', 10) : p.stock,
          imageUrl: document.getElementById('p-edit-img')?.value?.trim() || p.imageUrl || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateProduct(productId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteProduct(productId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບສິນຄ້າ?',
      text: 'ລາຍການສິນຄ້າ ແລະ Serial Numbers ທີ່ກ່ຽວຂ້ອງຈະຖືກລຶບອອກ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບເລີຍ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteProduct(productId);
        this.renderCurrentView();
      }
    });
  },

  // CATEGORY MODALS WITH EDIT
  openCategoryModal() {
    const cats = window.db.getCategories();
    Swal.fire({
      title: 'ຈັດການໝວດສິນຄ້າ (Categories)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="flex gap-2">
            <input type="text" id="new-cat-code" class="glass-input w-24 font-mono uppercase" placeholder="Code (CCTV)">
            <input type="text" id="new-cat-name" class="glass-input flex-1" placeholder="ຊື່ໝວດສິນຄ້າໃໝ່">
            <button onclick="App.quickAddCategory()" class="btn-glass-primary py-1 px-3">
              <i class="fa-solid fa-plus"></i> ເພີ່ມ
            </button>
          </div>

          <div class="max-h-60 overflow-y-auto space-y-1.5 mt-3">
            ${cats.map(c => `
              <div class="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <span class="badge-glass-cyan text-[11px] font-mono px-1.5 py-0.5 rounded font-bold mr-1.5">${c.code}</span>
                  <span class="font-bold">${c.name}</span>
                </div>
                <div class="flex items-center gap-1">
                  <button onclick="App.openEditCategoryPrompt('${c.id}')" class="p-1 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                  <button onclick="App.deleteCategory('${c.id}')" class="p-1 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      confirmButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' }
    });
  },

  quickAddCategory() {
    const code = document.getElementById('new-cat-code')?.value?.trim();
    const name = document.getElementById('new-cat-name')?.value?.trim();
    if (!name) return;

    window.db.addCategory({
      code: (code || name.substring(0, 4)).toUpperCase(),
      name
    });
    this.openCategoryModal();
    this.renderCurrentView();
  },

  openEditCategoryPrompt(catId) {
    const c = window.db.getCategories().find(cat => cat.id === catId);
    if (!c) return;

    Swal.fire({
      title: 'ແກ້ໄຂໝວດສິນຄ້າ',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ລະຫັດໝວດ (Code)</label>
            <input type="text" id="edit-cat-code" class="glass-input w-full font-mono uppercase" value="${c.code}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ຊື່ໝວດສິນຄ້າ</label>
            <input type="text" id="edit-cat-name" class="glass-input w-full" value="${c.name}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        code: document.getElementById('edit-cat-code')?.value?.trim()?.toUpperCase(),
        name: document.getElementById('edit-cat-name')?.value?.trim()
      })
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateCategory(catId, res.value);
        this.openCategoryModal();
        this.renderCurrentView();
      }
    });
  },

  deleteCategory(catId) {
    window.db.deleteCategory(catId);
    this.openCategoryModal();
    this.renderCurrentView();
  },

  // --------------------------------------------------------------------------
  // STOCK IN MODAL (ດຶງໃບສັ່ງຊື້ PO, ເລືອກໝວດກ່ອນກອງສິນຄ້າ, ຄ່າຂົນສົ່ງ, ຜູ້ສະໜອງ)
  // --------------------------------------------------------------------------
  openStockInModal() {
    const pos = window.db.getPurchaseOrders().filter(p => p.status === 'ordered');
    const categories = window.db.getCategories();
    const suppliers = window.db.getSuppliers();

    const poOptions = pos.map(p => `<option value="${p.id}">${p.poNumber} - ${p.supplierName} (${p.totalAmount.toLocaleString()} ₭)</option>`).join('');
    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const supOptions = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    Swal.fire({
      title: 'ນຳສິນຄ້າເຂົ້າສະຕອກ (Stock In)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- Option 1: Select Purchase Order -->
          <div class="p-3 rounded-xl bg-sky-900/30 border border-sky-500/30">
            <label class="block mb-1 font-bold text-sky-400">
              <i class="fa-solid fa-file-invoice mr-1"></i> ດຶງຂໍ້ມູນຈາກໃບສັ່ງຊື້ສິນຄ້າ (PO) ຖ້າມີ
            </label>
            <div class="flex gap-2">
              <select id="stockin-po-select" class="glass-input flex-1">
                <option value="">-- ເລືອກໃບສັ່ງຊື້ສິນຄ້າ --</option>
                ${poOptions}
              </select>
              <button type="button" onclick="App.handleLoadPOToStockIn()" class="btn-glass-primary py-1 px-3">
                ດຶງຂໍ້ມູນ PO
              </button>
            </div>
          </div>

          <!-- Option 2: Filter by Category First -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold text-amber-400">1. ເລືອກໝວດສິນຄ້າກ່ອນ *</label>
              <select id="stockin-cat-filter" onchange="App.handleStockInCatFilter(this.value)" class="glass-input w-full">
                <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                ${catOptions}
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold text-sky-400">2. ເລືອກສິນຄ້າ *</label>
              <select id="stockin-prod-select" class="glass-input w-full">
                <!-- Dynamically loaded -->
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຈຳນວນທີ່ນຳເຂົ້າ *</label>
              <input type="number" id="stockin-qty" class="glass-input w-full font-bold" value="3" min="1">
            </div>
            <div>
              <label class="block mb-1">ຄ່າຂົນສົ່ງ (Shipping ₭)</label>
              <input type="number" id="stockin-shipping" class="glass-input w-full" value="0">
            </div>
            <div>
              <label class="block mb-1">ຜູ້ສະໜອງ</label>
              <select id="stockin-sup-select" class="glass-input w-full">${supOptions}</select>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">Serial Numbers (ແຍກແຕ່ລະແຖວ ສຳລັບແຕ່ລະໜ່ວຍ)</label>
            <textarea id="stockin-sns" rows="3" class="glass-input w-full font-mono text-xs" placeholder="SN-2026-001&#10;SN-2026-002&#10;SN-2026-003"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">ສະຖານທີ່ເກັບ</label>
              <input type="text" id="stockin-loc" class="glass-input w-full" value="ສາງໃຫຍ່ ຊັ້ນວາງ A1">
            </div>
            <div>
              <label class="block mb-1">ໄລຍະຮັບປະກັນ (ເດືອນ)</label>
              <input type="number" id="stockin-war" class="glass-input w-full" value="24">
            </div>
          </div>
        </div>
      `,
      width: '660px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກເຂົ້າສາງ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      didOpen: () => {
        App.handleStockInCatFilter('');
      },
      preConfirm: () => {
        const prodId = document.getElementById('stockin-prod-select')?.value;
        const qty = parseInt(document.getElementById('stockin-qty')?.value || '1', 10);
        const rawSns = document.getElementById('stockin-sns')?.value || '';
        const lines = rawSns.split('\n').map(s => s.trim()).filter(Boolean);

        if (!prodId) {
          Swal.showValidationMessage('ກະລຸນາເລືອກສິນຄ້າ');
          return false;
        }

        return {
          productId: prodId,
          qty,
          lines,
          poId: document.getElementById('stockin-po-select')?.value || null,
          shippingCost: parseFloat(document.getElementById('stockin-shipping')?.value || '0'),
          location: document.getElementById('stockin-loc')?.value || 'ສາງໃຫຍ່',
          warrantyMonths: parseInt(document.getElementById('stockin-war')?.value || '12', 10)
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        let finalSns = res.value.lines;
        if (finalSns.length === 0) {
          for (let i = 1; i <= res.value.qty; i++) {
            finalSns.push(`SN-${Date.now().toString(36).toUpperCase()}-${i}`);
          }
        }

        window.db.stockInSerials(res.value.productId, finalSns, {
          purchaseOrderId: res.value.poId,
          location: res.value.location,
          warrantyMonths: res.value.warrantyMonths
        });

        if (res.value.poId) {
          window.db.receivePurchaseOrder(res.value.poId);
        }

        Swal.fire({ title: 'ນຳສິນຄ້າເຂົ້າສາງຮຽບຮ້ອຍ!', icon: 'success', customClass: { popup: 'swal-glass' } });
        this.renderCurrentView();
      }
    });
  },

  handleStockInCatFilter(catId) {
    const sel = document.getElementById('stockin-prod-select');
    if (!sel) return;

    let prods = window.db.getProducts();
    if (catId) {
      prods = prods.filter(p => p.categoryId === catId);
    }

    sel.innerHTML = prods.map(p => `
      <option value="${p.id}">${p.sku} - ${p.name} (${p.model || ''})</option>
    `).join('') || '<option value="">-- ບໍ່ມີສິນຄ້າໃນໝວດນີ້ --</option>';
  },

  handleLoadPOToStockIn() {
    const poId = document.getElementById('stockin-po-select')?.value;
    if (!poId) return;

    const po = window.db.getPurchaseOrders().find(p => p.id === poId);
    if (!po) return;

    const supSel = document.getElementById('stockin-sup-select');
    const shippingInput = document.getElementById('stockin-shipping');
    const qtyInput = document.getElementById('stockin-qty');

    if (supSel && po.supplierId) supSel.value = po.supplierId;
    if (shippingInput) shippingInput.value = po.shippingCost || 0;

    if (po.items && po.items.length > 0) {
      const firstItem = po.items[0];
      if (qtyInput) qtyInput.value = firstItem.qty;
      const prodSel = document.getElementById('stockin-prod-select');
      if (prodSel && firstItem.productId) {
        prodSel.value = firstItem.productId;
      }
    }
  },

  // --------------------------------------------------------------------------
  // STOCK OUT MODAL (ເລືອກໝວດກ່ອນ, ຜູກໃບເກັບເງິນ ຫຼື ໃບບີນຂາຍໜ້າຮ້ານ)
  // --------------------------------------------------------------------------
  openStockOutModal() {
    const categories = window.db.getCategories();
    const invoices = window.db.getDocuments().filter(d => d.docType === 'invoice' || d.docType === 'pos');

    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const docOptions = invoices.map(d => `<option value="${d.docNumber}">${d.docNumber} - ${d.customerName} (${d.grandTotal.toLocaleString()} ₭)</option>`).join('');

    Swal.fire({
      title: 'ເບີກສິນຄ້າອອກ (Stock Out)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- 1. Category Filter First -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold text-amber-400">1. ເລືອກໝວດສິນຄ້າກ່ອນ *</label>
              <select id="stockout-cat-filter" onchange="App.handleStockOutCatFilter(this.value)" class="glass-input w-full">
                <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                ${catOptions}
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold text-sky-400">2. ເລືອກສິນຄ້າ *</label>
              <select id="stockout-prod-select" onchange="App.loadSerialsForStockOut(this.value)" class="glass-input w-full">
                <!-- Loaded dynamically -->
              </select>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">3. ເລືອກ Serial Number (SN) ທີ່ຈະເບີກ *</label>
            <select id="stockout-sn-select" class="glass-input w-full font-mono font-bold">
              <!-- Loaded dynamically -->
            </select>
          </div>

          <!-- Link to Invoice / POS Receipt -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10">
            <label class="block mb-1 font-bold text-purple-400">
              <i class="fa-solid fa-link mr-1"></i> ຜູກກັບໃບເກັບເງິນ ຫຼື ໃບບີນຂາຍໜ້າຮ້ານ
            </label>
            <select id="stockout-doc-select" class="glass-input w-full">
              <option value="">-- ບໍ່ຜູກໃບບິນ (ເບີກໃຊ້ທົ່ວໄປ) --</option>
              ${docOptions}
            </select>
          </div>

          <div>
            <label class="block mb-1">ເຫດຜົນໃນການເບີກ</label>
            <select id="stockout-reason" class="glass-input w-full">
              <option value="sold">ຂາຍໃຫ້ລູກຄ້າ</option>
              <option value="project">ນຳໄປຕິດຕັ້ງໂຄງການໄອທີ</option>
              <option value="maintenance">ເຄມສິນຄ້າ / ສ້ອມແປງ</option>
            </select>
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ຢືນຢັນການເບີກອອກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      didOpen: () => {
        App.handleStockOutCatFilter('');
      },
      preConfirm: () => {
        const snId = document.getElementById('stockout-sn-select')?.value;
        const reason = document.getElementById('stockout-reason')?.value;
        const docRef = document.getElementById('stockout-doc-select')?.value;

        if (!snId) {
          Swal.showValidationMessage('ກະລຸນາເລືອກ Serial Number ທີ່ຈະເບີກ');
          return false;
        }

        return { snId, reason, docRef };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.stockOutSerial(res.value.snId, res.value.reason, res.value.docRef);
        Swal.fire({ title: 'ເບີກສິນຄ້າສຳເລັດ!', icon: 'success', customClass: { popup: 'swal-glass' } });
        this.renderCurrentView();
      }
    });
  },

  handleStockOutCatFilter(catId) {
    const sel = document.getElementById('stockout-prod-select');
    if (!sel) return;

    let prods = window.db.getProducts().filter(p => p.hasSn);
    if (catId) prods = prods.filter(p => p.categoryId === catId);

    sel.innerHTML = prods.map(p => `
      <option value="${p.id}">${p.sku} - ${p.name}</option>
    `).join('') || '<option value="">-- ບໍ່ມີສິນຄ້າ --</option>';

    if (prods.length > 0) {
      this.loadSerialsForStockOut(prods[0].id);
    }
  },

  loadSerialsForStockOut(productId) {
    const sel = document.getElementById('stockout-sn-select');
    if (!sel || !productId) return;

    const inStock = window.db.getSerialsInStock(productId);
    sel.innerHTML = inStock.length > 0
      ? inStock.map(s => `<option value="${s.id}">${s.serialNumber} (${s.location})</option>`).join('')
      : '<option value="">-- ບໍ່ມີ Serial Number ໃນສາງ --</option>';
  },

  viewProductSerials(productId) {
    const prod = window.db.getProductById(productId);
    if (!prod) return;

    const serials = window.db.getSerialsByProduct(productId);
    Swal.fire({
      title: `Serial Numbers: ${prod.sku}`,
      html: `
        <div class="text-left text-xs space-y-2 max-h-80 overflow-y-auto pr-1">
          <p class="font-bold opacity-80">${prod.name}</p>
          ${serials.map((s, i) => `
            <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
              <div>
                <span class="font-mono font-bold text-sky-400">#${i + 1} ${s.serialNumber}</span>
                <span class="text-[11px] opacity-70 ml-2">(${s.status === 'in_stock' ? 'ຢູ່ໃນສາງ' : 'ເບີກແລ້ວ'})</span>
                <div class="text-[10px] opacity-60">MAC: ${s.macAddress || '-'} | ບ່ອນເກັບ: ${s.location}</div>
              </div>
              <div class="flex items-center gap-1">
                <button onclick="App.deleteSerialItem('${s.id}')" class="text-rose-400 p-1" title="ລຶບ SN"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '+ ເພີ່ມ SN ໃໝ່',
      cancelButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) App.openAddSerialModal(productId);
    });
  },

  openAddSerialModal(productId) {
    Swal.fire({
      title: 'ເພີ່ມ Serial Number',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1">Serial Number (ແຍກແຖວລະ 1 SN)</label>
            <textarea id="quick-add-sns" rows="3" class="glass-input w-full font-mono" placeholder="SN-001&#10;SN-002"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const lines = (document.getElementById('quick-add-sns')?.value || '').split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length === 0) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ SN');
          return false;
        }
        return lines;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.stockInSerials(productId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteSerialItem(serialId) {
    window.db.deleteSerial(serialId);
    Swal.close();
    this.renderCurrentView();
  },

  revokeDispatchedItem(serialId) {
    window.db.updateSerial(serialId, { status: 'in_stock', invoiceId: null, soldDate: null });
    this.renderCurrentView();
  },

  openEditDispatchedModal(serialId) {
    const s = window.db.data.productSerials.find(it => it.id === serialId);
    if (!s) return;

    Swal.fire({
      title: `ແກ້ໄຂການເບີກ: ${s.serialNumber}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ໝາຍເລກໃບບິນທີ່ຜູກ</label>
            <input type="text" id="edit-disp-inv" class="glass-input w-full" value="${s.invoiceId || ''}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ໝາຍເຫດ</label>
            <input type="text" id="edit-disp-notes" class="glass-input w-full" value="${s.notes || ''}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        invoiceId: document.getElementById('edit-disp-inv')?.value,
        notes: document.getElementById('edit-disp-notes')?.value
      })
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateSerial(serialId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deletePO(poId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບໃບສັ່ງຊື້ (PO)?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deletePurchaseOrder(poId);
        this.renderCurrentView();
      }
    });
  },

  openEditPOModal(poId) {
    const po = window.db.getPurchaseOrders().find(p => p.id === poId);
    if (!po) return;

    Swal.fire({
      title: `ແກ້ໄຂ PO: ${po.poNumber}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ວັນທີສັ່ງຊື້</label>
            <input type="date" id="edit-po-date" class="glass-input w-full" value="${po.orderDate}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ສະຖານະ PO</label>
            <select id="edit-po-status" class="glass-input w-full font-bold">
              <option value="ordered" ${po.status === 'ordered' ? 'selected' : ''}>ສັ່ງຊື້ແລ້ວ/ກຳລັງຂົນສົ່ງ</option>
              <option value="received" ${po.status === 'received' ? 'selected' : ''}>ໄດ້ຮັບເຄື່ອງແລ້ວ</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-bold">ຄ່າຂົນສົ່ງ (₭)</label>
            <input type="number" id="edit-po-ship" class="glass-input w-full" value="${po.shippingCost || 0}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ໝາຍເຫດ</label>
            <input type="text" id="edit-po-notes" class="glass-input w-full" value="${po.notes || ''}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        orderDate: document.getElementById('edit-po-date')?.value,
        status: document.getElementById('edit-po-status')?.value,
        shippingCost: parseFloat(document.getElementById('edit-po-ship')?.value || '0'),
        notes: document.getElementById('edit-po-notes')?.value
      })
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updatePurchaseOrder(poId, res.value);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // VIEW 3: ໂຄງການໄອທີ (PROJECTS) - WITH VIEW DETAILS, EDIT, DELETE, LINK QT/INV
  // --------------------------------------------------------------------------
  renderProjects(container) {
    const projects = window.db.getProjects();

    const cards = projects.map(p => {
      // Calculate cost & profit if quotation is linked
      let costInfo = null;
      if (p.quotationDocNumber) {
        costInfo = window.db.calculateQuotationCost(p.quotationDocNumber);
      }
      const budget = p.budget || 0;
      const cost = p.costPrice || (costInfo ? costInfo.totalCost : 0);
      const profit = p.expectedProfit !== undefined ? p.expectedProfit : (costInfo ? costInfo.profit : (cost > 0 ? (budget - cost) : 0));
      const margin = p.profitMargin !== undefined ? p.profitMargin : (costInfo ? costInfo.profitMargin : (budget > 0 ? Math.round((profit / budget) * 100) : 0));

      return `
        <div class="glass-panel glass-panel-hover p-5 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="badge-glass-cyan text-xs font-mono font-bold px-2 py-0.5 rounded">${p.code}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                ${p.status === 'completed' ? 'ສຳເລັດ' : 'ດຳເນີນການ'}
              </span>
            </div>
            <h3 class="text-base font-bold line-clamp-1 mb-1">${p.title}</h3>
            <p class="text-xs text-sky-400 mb-2">ລູກຄ້າ: ${p.customerName}</p>

            <div class="mb-3">
              <div class="flex justify-between text-xs mb-1">
                <span class="opacity-75">ຄວາມຄືບໜ້າ</span>
                <span class="font-bold text-emerald-400">${p.progress}%</span>
              </div>
              <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div class="bg-gradient-to-r from-sky-400 to-emerald-400 h-2 rounded-full" style="width: ${p.progress}%"></div>
              </div>
            </div>

            <div class="text-xs opacity-90 space-y-1.5 mb-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <div class="flex justify-between"><span>👤 ຫົວໜ້າໂຄງການ:</span> <strong>${p.leaderName}</strong></div>
              <div class="flex justify-between"><span>📅 ກຳນົດສົ່ງ:</span> <strong>${p.deadline}</strong></div>
              <div class="flex justify-between font-bold text-sky-400"><span>💰 ມູນຄ່າຂາຍ:</span> <span>${budget.toLocaleString()} ₭</span></div>
              ${cost > 0 ? `
                <div class="flex justify-between text-amber-400 font-bold">
                  <span>📦 ຕົ້ນທຶນສິນຄ້າ:</span>
                  <span>${cost.toLocaleString()} ₭</span>
                </div>
                <div class="flex justify-between text-emerald-400 font-black pt-1 border-t border-white/10">
                  <span>📈 ກຳໄລຄາດຄະເນ:</span>
                  <span>+${profit.toLocaleString()} ₭ (${margin}%)</span>
                </div>
              ` : ''}
              ${p.quotationDocNumber ? `<div>📄 ໃບສະເໜີລາຄາ: <strong class="text-sky-400">${p.quotationDocNumber}</strong></div>` : ''}
              ${p.invoiceDocNumber ? `<div>🧾 ໃບເກັບເງິນ: <strong class="text-emerald-400">${p.invoiceDocNumber}</strong></div>` : ''}
            </div>
          </div>

          <div class="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
            <button onclick="App.viewProjectDetails('${p.id}')" class="btn-glass-primary py-1 px-2.5 text-[11px]">
              <i class="fa-solid fa-list-check mr-1"></i> ລາຍລະອຽດ & Checklist
            </button>
            <div class="flex items-center gap-1.5">
              <button onclick="App.openEditProjectModal('${p.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
              <button onclick="App.deleteProject('${p.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-diagram-project text-purple-400"></i>
              ໂຄງການໄອທີ (IT Projects)
            </h1>
            <p class="text-xs opacity-75 mt-1">ຄຸ້ມຄອງໂຄງການ, ຜູກໃບສະເໜີລາຄາຄຳນວນຕົ້ນທຶນ/ກຳໄລອັດຕະໂນມັດ ແລະ ຈັດການ Checklist</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="App.openManageProjectCategoriesModal()" class="btn-glass-secondary text-xs">
              <i class="fa-solid fa-tags text-purple-400"></i> ຈັດການໝວດງານ
            </button>
            <button onclick="App.openAddProjectModal()" class="btn-glass-primary text-xs">
              <i class="fa-solid fa-plus-circle"></i> ເພີ່ມໂຄງການໃໝ່
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${cards}
        </div>
      </div>
    `;
  },

  handleProjectQuotationSelected(docNumber) {
    const box = document.getElementById('prj-quotation-cost-preview');
    const budgetInput = document.getElementById('new-prj-budget') || document.getElementById('edit-prj-budget');
    if (!docNumber) {
      if (box) box.innerHTML = '';
      return;
    }

    const costData = window.db.calculateQuotationCost(docNumber);
    if (budgetInput && costData.totalRevenue > 0) {
      budgetInput.value = costData.totalRevenue;
    }

    if (box) {
      box.innerHTML = `
        <div class="mt-2.5 p-3 rounded-xl bg-white/5 border border-sky-400/30 text-xs space-y-1.5">
          <div class="flex items-center justify-between font-bold">
            <span class="opacity-80">💰 ມູນຄ່າຂາຍຕາມໃບສະເໜີ (Revenue):</span>
            <span class="text-sky-400 font-mono font-bold">${costData.totalRevenue.toLocaleString()} ₭</span>
          </div>
          <div class="flex items-center justify-between font-bold">
            <span class="opacity-80">📦 ຕົ້ນທຶນສິນຄ້າໃນສະຕອກ (Cost Price):</span>
            <span class="text-amber-400 font-mono font-bold">${costData.totalCost.toLocaleString()} ₭</span>
          </div>
          <div class="flex items-center justify-between font-black pt-1.5 border-t border-white/10 text-sm">
            <span>📈 ກຳໄລຄາດຄະເນ (Gross Profit):</span>
            <span class="text-emerald-400 font-mono font-bold">+${costData.profit.toLocaleString()} ₭ (${costData.profitMargin}%)</span>
          </div>
        </div>
      `;
    }
  },

  viewProjectDetails(projId) {
    const p = window.db.getProjects().find(pr => pr.id === projId);
    if (!p) return;

    let costInfo = null;
    if (p.quotationDocNumber) {
      costInfo = window.db.calculateQuotationCost(p.quotationDocNumber);
    }
    const budget = p.budget || 0;
    const cost = p.costPrice || (costInfo ? costInfo.totalCost : 0);
    const profit = p.expectedProfit !== undefined ? p.expectedProfit : (costInfo ? costInfo.profit : (cost > 0 ? (budget - cost) : 0));
    const margin = p.profitMargin !== undefined ? p.profitMargin : (costInfo ? costInfo.profitMargin : (budget > 0 ? Math.round((profit / budget) * 100) : 0));

    const tasks = window.db.getTasks(projId);
    const milestones = window.db.getProjectMilestones(projId);
    const totalCollected = milestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + (m.amount || 0), 0);
    const collectedPercent = budget > 0 ? Math.min(100, Math.round((totalCollected / budget) * 100)) : 0;
    const remainingBalance = Math.max(0, budget - totalCollected);

    Swal.fire({
      title: `ລາຍລະອຽດ: ${p.code}`,
      html: `
        <div class="space-y-3.5 text-left text-xs">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-sm text-sky-400">${p.title}</h3>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
              ${p.status === 'completed' ? 'ສຳເລັດແລ້ວ' : 'ກຳລັງດຳເນີນການ'}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
            <div>ລູກຄ້າ: <strong>${p.customerName}</strong></div>
            <div>ໝວດງານ: <strong>${p.category}</strong></div>
            <div>ເລີ່ມຕົ້ນ: <strong>${p.startDate || '-'}</strong></div>
            <div>ກຳນົດສົ່ງ: <strong>${p.deadline}</strong></div>
            <div>ຫົວໜ້າໂຄງການ: <strong>${p.leaderName}</strong></div>
            <div>ຄວາມຄືບໜ້າ: <strong class="text-emerald-400 font-bold">${p.progress}%</strong></div>
            <div>ໃບສະເໜີລາຄາ: <strong class="text-sky-400">${p.quotationDocNumber || '-'}</strong></div>
            <div>ໃບເກັບເງິນ: <strong class="text-emerald-400">${p.invoiceDocNumber || '-'}</strong></div>
          </div>

          <!-- Cost vs Revenue vs Profit Analysis Box -->
          <div class="p-3 rounded-xl bg-white/5 border border-sky-400/30 space-y-1.5">
            <div class="font-bold text-sky-400 flex items-center gap-1.5 mb-1">
              <i class="fa-solid fa-calculator"></i> ການວິເຄາະຕົ້ນທຶນ ແລະ ກຳໄລໂຄງການ:
            </div>
            <div class="flex justify-between">
              <span class="opacity-80">💰 ມູນຄ່າໂຄງການ (ຂາຍ):</span>
              <strong class="text-sky-400 font-mono">${budget.toLocaleString()} ₭</strong>
            </div>
            <div class="flex justify-between">
              <span class="opacity-80">📦 ຕົ້ນທຶນສິນຄ້າ/ອຸປະກອນ:</span>
              <strong class="text-amber-400 font-mono">${cost.toLocaleString()} ₭</strong>
            </div>
            <div class="flex justify-between font-black pt-1 border-t border-white/10 text-sm">
              <span>📈 ກຳໄລຄາດຄະເນ:</span>
              <strong class="text-emerald-400 font-mono">+${profit.toLocaleString()} ₭ (${margin}%)</strong>
            </div>
          </div>

          <!-- Payment Milestones (ງວດການຊຳລະເງິນແບບແບ່ງງວດ) -->
          <div class="border-t border-white/10 pt-2.5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-300 flex items-center gap-1.5">
                <i class="fa-solid fa-money-check-dollar text-emerald-400"></i> ງວດການຊຳລະເງິນ (Payment Milestones):
              </span>
              <button type="button" onclick="App.openAddMilestoneModal('${projId}')" class="btn-glass-primary text-[11px] py-1 px-2.5">
                <i class="fa-solid fa-plus mr-1"></i> ເພີ່ມງວດ
              </button>
            </div>

            <!-- Milestone Progress bar -->
            <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div class="flex justify-between text-[11px]">
                <span>ເກັບແລ້ວ: <strong class="text-emerald-400 font-mono">${totalCollected.toLocaleString()} ₭ (${collectedPercent}%)</strong></span>
                <span>ຍັງເຫຼືອ: <strong class="text-rose-400 font-mono">${remainingBalance.toLocaleString()} ₭</strong></span>
              </div>
              <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div class="bg-gradient-to-r from-sky-400 to-emerald-400 h-2 transition-all duration-300" style="width: ${collectedPercent}%"></div>
              </div>
            </div>

            <!-- Milestones List -->
            <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              ${milestones.length > 0 ? milestones.map((m, idx) => `
                <div class="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10 flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="font-bold truncate text-[11px] text-sky-300">${m.name}</div>
                    <div class="text-[10px] opacity-75 font-mono">
                      <span>${Number(m.amount).toLocaleString()} ₭</span> (${m.percent}%)
                      ${m.invoiceDocNumber ? ` | ບິນ: <span class="text-emerald-400 underline cursor-pointer" onclick="App.viewTransactionBill('${m.invoiceDocNumber}')">${m.invoiceDocNumber}</span>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      m.status === 'invoiced' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }">
                      ${m.status === 'paid' ? '✓ ຊຳລະແລ້ວ' : m.status === 'invoiced' ? '📄 ອອກບິນແລ້ວ' : '⏳ ລໍຖ້າ'}
                    </span>
                    ${m.status === 'pending' ? `
                      <button type="button" onclick="App.createMilestoneInvoice('${projId}', '${m.id}')" class="btn-glass-primary text-[10px] py-0.5 px-2" title="ອອກໃບເກັບເງິນງວດນີ້">
                        <i class="fa-solid fa-file-invoice mr-1"></i> ອອກບິນ
                      </button>
                    ` : m.status === 'invoiced' ? `
                      <button type="button" onclick="App.markMilestonePaid('${projId}', '${m.id}')" class="btn-glass-success text-[10px] py-0.5 px-2" title="ບັນທຶກວ່າໄດ້ຮັບເງິນແລ້ວ">
                        <i class="fa-solid fa-check mr-1"></i> ຮັບເງິນ
                      </button>
                    ` : ''}
                    <button type="button" onclick="App.deleteProjectMilestone('${projId}', '${m.id}')" class="p-1 text-rose-400 hover:text-rose-300" title="ລຶບງວດ"><i class="fa-solid fa-trash text-xs"></i></button>
                  </div>
                </div>
              `).join('') : `
                <div class="text-center py-2 opacity-60 italic text-[11px] bg-white/5 rounded-xl">ຍັງບໍ່ມີການແບ່ງງວດຊຳລະເງິນ</div>
              `}
            </div>
          </div>

          <!-- Interactive Tasks Checklist -->
          <div class="border-t border-white/10 pt-2.5">
            <div class="flex items-center justify-between font-bold mb-2">
              <span class="text-slate-300 flex items-center gap-1.5">
                <i class="fa-solid fa-list-check text-purple-400"></i> Checklist ໜ້າວຽກຍ່ອຍ (${tasks.filter(t => t.status === 'done').length}/${tasks.length}):
              </span>
            </div>

            <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1" id="project-tasks-list">
              ${tasks.length > 0 ? tasks.map(t => `
                <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5">
                  <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" ${t.status === 'done' ? 'checked' : ''} 
                            onchange="App.toggleProjectTask('${t.id}', '${projId}', this.checked)"
                            class="w-4 h-4 rounded text-sky-500 focus:ring-0">
                    <span class="truncate ${t.status === 'done' ? 'line-through opacity-50 text-slate-400' : 'font-medium'}">${t.title}</span>
                  </label>
                  <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="App.editProjectTask('${t.id}', '${projId}')" class="p-1 text-sky-400 hover:text-sky-300" title="ແກ້ໄຂຊື່ວຽກ"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button type="button" onclick="App.deleteProjectTask('${t.id}', '${projId}')" class="p-1 text-rose-400 hover:text-rose-300" title="ລຶບວຽກ"><i class="fa-solid fa-trash text-xs"></i></button>
                  </div>
                </div>
              `).join('') : `
                <div class="text-center py-3 opacity-60 italic bg-white/5 rounded-xl">ຍັງບໍ່ມີໜ້າວຽກຍ່ອຍ, ເພີ່ມໄດ້ດ້ານລຸ່ມ</div>
              `}
            </div>

            <!-- Inline Add Task Row -->
            <div class="flex items-center gap-2 mt-2.5">
              <input type="text" id="prj-new-task-title" class="glass-input flex-1 py-1.5 px-3 text-xs" placeholder="ພິມໜ້າວຽກຍ່ອຍໃໝ່ ເຊັ່ນ: ເດີນສາຍ LAN ຊັ້ນ 1...">
              <button type="button" onclick="App.addProjectTask('${projId}')" class="btn-glass-primary py-1.5 px-3 text-xs shrink-0">
                <i class="fa-solid fa-plus mr-1"></i> ເພີ່ມວຽກ
              </button>
            </div>
          </div>
        </div>
      `,
      width: '650px',
      confirmButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' }
    });
  },

  toggleProjectTask(taskId, projId, isDone) {
    window.db.updateTask(taskId, { status: isDone ? 'done' : 'todo' });
    this.recalculateProjectProgress(projId);
    this.viewProjectDetails(projId);
  },

  addProjectTask(projId) {
    const input = document.getElementById('prj-new-task-title');
    const title = input?.value?.trim();
    if (!title) return;

    window.db.addTask({
      projectId: projId,
      title: title,
      status: 'todo'
    });
    this.recalculateProjectProgress(projId);
    this.viewProjectDetails(projId);
  },

  editProjectTask(taskId, projId) {
    const task = window.db.getTasks(projId).find(t => t.id === taskId);
    if (!task) return;

    Swal.fire({
      title: 'ແກ້ໄຂຊື່ໜ້າວຽກຍ່ອຍ',
      input: 'text',
      inputValue: task.title,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: (newVal) => {
        if (!newVal || !newVal.trim()) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ໜ້າວຽກ');
          return false;
        }
        return newVal.trim();
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateTask(taskId, { title: res.value });
        this.viewProjectDetails(projId);
      } else {
        this.viewProjectDetails(projId);
      }
    });
  },

  deleteProjectTask(taskId, projId) {
    window.db.deleteTask(taskId);
    this.recalculateProjectProgress(projId);
    this.viewProjectDetails(projId);
  },

  recalculateProjectProgress(projId) {
    const tasks = window.db.getTasks(projId);
    if (tasks.length === 0) return;
    const done = tasks.filter(t => t.status === 'done').length;
    const progress = Math.round((done / tasks.length) * 100);
    window.db.updateProject(projId, {
      progress,
      status: progress >= 100 ? 'completed' : 'in_progress'
    });
    this.renderCurrentView();
  },

  openAddMilestoneModal(projId) {
    const proj = window.db.getProjects().find(p => p.id === projId);
    if (!proj) return;

    Swal.fire({
      title: 'ເພີ່ມງວດການຊຳລະເງິນ (Add Milestone)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ງວດ / ລາຍລະອຽດ *</label>
            <input type="text" id="new-ms-name" class="glass-input w-full" placeholder="ເຊັ່ນ: ງວດ 1: ມັດຈຳເລີ່ມວຽກ (30%)">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເປີເຊັນ (%)</label>
              <input type="number" id="new-ms-pct" oninput="App.calculateMilestoneAmountFromPct(${proj.budget || 0})" class="glass-input w-full font-bold" value="30" min="1" max="100">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຈຳນວນເງິນ (₭)</label>
              <input type="number" id="new-ms-amt" class="glass-input w-full font-bold text-emerald-400" value="${Math.round((proj.budget || 0) * 0.3)}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກງວດ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('new-ms-name')?.value?.trim();
        const pct = parseFloat(document.getElementById('new-ms-pct')?.value || '0');
        const amt = parseFloat(document.getElementById('new-ms-amt')?.value || '0');
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ງວດການຊຳລະ');
          return false;
        }
        if (amt <= 0) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຈຳນວນເງິນທີ່ຖືກຕ້ອງ');
          return false;
        }
        return { name, percent: pct, amount: amt, status: 'pending', invoiceDocNumber: null, paidDate: null };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addProjectMilestone(projId, res.value);
        this.viewProjectDetails(projId);
      } else {
        this.viewProjectDetails(projId);
      }
    });
  },

  calculateMilestoneAmountFromPct(budget) {
    const pct = parseFloat(document.getElementById('new-ms-pct')?.value || '0');
    const amtEl = document.getElementById('new-ms-amt');
    if (amtEl && budget > 0) {
      amtEl.value = Math.round(budget * (pct / 100));
    }
  },

  createMilestoneInvoice(projId, milestoneId) {
    Swal.fire({
      title: 'ຢືນຢັນການອອກໃບເກັບເງິນງວດນີ້?',
      text: 'ລະບົບຈະສ້າງໃບເກັບເງິນ (Invoice) ແລະ ຜູກກັບໂຄງການນີ້ອັດຕະໂນມັດ',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ອອກໃບເກັບເງິນ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        const doc = window.db.createMilestoneInvoice(projId, milestoneId);
        if (doc) {
          Swal.fire({
            title: 'ອອກໃບເກັບເງິນສຳເລັດ!',
            text: `ເລກທີ: ${doc.docNumber} | ມູນຄ່າ: ${doc.grandTotal.toLocaleString()} ₭`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🖨️ ພິມ / ເບິ່ງໃບເກັບເງິນ',
            cancelButtonText: 'ສຳເລັດ',
            customClass: { popup: 'swal-glass' }
          }).then(pRes => {
            if (pRes.isConfirmed) {
              ExportService.printDocument(doc.id);
            }
            this.viewProjectDetails(projId);
          });
        }
      } else {
        this.viewProjectDetails(projId);
      }
    });
  },

  markMilestonePaid(projId, milestoneId) {
    const proj = window.db.getProjects().find(p => p.id === projId);
    const ms = proj ? (proj.milestones || []).find(m => m.id === milestoneId) : null;
    if (!ms) return;

    Swal.fire({
      title: 'ບັນທຶກການຮັບຊຳລະເງິນງວດ?',
      text: `ຢືນຢັນຮັບຊຳລະເງິນງວດ: ${ms.name} (ຍອດເງິນ: ${Number(ms.amount).toLocaleString()} ₭)`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✓ ແມ່ນ, ໄດ້ຮັບເງິນແລ້ວ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        const today = new Date().toISOString().split('T')[0];
        window.db.updateProjectMilestone(projId, milestoneId, {
          status: 'paid',
          paidDate: today
        });

        // Record income transaction
        window.db.addTransaction({
          date: today,
          type: 'income',
          category: 'project_income',
          amount: ms.amount,
          refDoc: ms.invoiceDocNumber || proj.code,
          description: `ລາຍຮັບງວດໂຄງການ ${proj.code}: ${ms.name}`,
          paymentMethod: 'ເງີນໂອນ (Transfer)'
        });

        // If invoice exists, mark invoice as paid
        if (ms.invoiceDocNumber) {
          const inv = window.db.getDocumentByNumber(ms.invoiceDocNumber);
          if (inv) inv.status = 'paid';
        }

        Swal.fire({
          title: 'ບັນທຶກຮັບເງິນສຳເລັດ!',
          text: `ບັນທຶກລົງບັນຊີລາຍຮັບຮຽບຮ້ອຍແລ້ວ`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        }).then(() => {
          this.viewProjectDetails(projId);
          this.renderCurrentView();
        });
      } else {
        this.viewProjectDetails(projId);
      }
    });
  },

  deleteProjectMilestone(projId, milestoneId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບງວດນີ້?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteProjectMilestone(projId, milestoneId);
      }
      this.viewProjectDetails(projId);
    });
  },

  // --------------------------------------------------------------------------
  // PROJECT CATEGORIES MANAGEMENT (ຈັດການໝວດງານໂຄງການໄອທີ)
  // --------------------------------------------------------------------------
  openManageProjectCategoriesModal() {
    const renderCategoryList = () => {
      const cats = window.db.getProjectCategories();
      const rows = cats.map((c, idx) => `
        <tr class="border-b border-white/10">
          <td class="p-2.5 text-center opacity-60">${idx + 1}</td>
          <td class="p-2.5 font-bold text-sky-400">${c.name}</td>
          <td class="p-2.5 opacity-80 text-xs">${c.description || '-'}</td>
          <td class="p-2.5 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="App.openEditProjectCategoryModal('${c.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
              <button onclick="App.deleteProjectCategory('${c.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');

      return `
        <div class="space-y-4 text-left text-xs">
          <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="opacity-75 font-semibold">ລາຍການໝວດງານໂຄງການທັງໝົດ (${cats.length})</span>
            <button onclick="App.openAddProjectCategoryModal()" class="btn-glass-primary text-xs py-1 px-3">
              <i class="fa-solid fa-plus mr-1"></i> ເພີ່ມໝວດງານໃໝ່
            </button>
          </div>
          <div class="max-h-60 overflow-y-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[11px] opacity-75 border-b border-white/10">
                  <th class="p-2 text-center" style="width: 40px;">ລ/ດ</th>
                  <th class="p-2">ຊື່ໝວດງານໂຄງການ</th>
                  <th class="p-2">ລາຍລະອຽດ</th>
                  <th class="p-2 text-center" style="width: 90px;">ຈັດການ</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    };

    Swal.fire({
      title: 'ຈັດການໝວດງານໂຄງການໄອທີ',
      html: renderCategoryList(),
      width: '600px',
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: 'swal-glass' }
    });
  },

  openAddProjectCategoryModal() {
    Swal.fire({
      title: 'ເພີ່ມໝວດງານໂຄງການໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ໝວດງານໂຄງການ *</label>
            <input type="text" id="new-pcat-name" class="glass-input w-full" placeholder="ເຊັ່ນ: Fiber Optic & Cabling">
          </div>
          <div>
            <label class="block mb-1 font-bold">ຄຳອະທິບາຍ</label>
            <input type="text" id="new-pcat-desc" class="glass-input w-full" placeholder="ເຊັ່ນ: ວຽກຕິດຕັ້ງສາຍໄຍແກ້ວນຳແສງ ແລະ ເຊື່ອມຕໍ່ເຄືອຂ່າຍ">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('new-pcat-name')?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ໝວດງານ');
          return false;
        }
        return {
          name,
          description: document.getElementById('new-pcat-desc')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addProjectCategory(res.value);
        this.openManageProjectCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  openEditProjectCategoryModal(catId) {
    const c = window.db.getProjectCategories().find(cat => cat.id === catId);
    if (!c) return;

    Swal.fire({
      title: 'ແກ້ໄຂໝວດງານໂຄງການ',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ໝວດງານໂຄງການ *</label>
            <input type="text" id="edit-pcat-name" class="glass-input w-full" value="${c.name}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ຄຳອະທິບາຍ</label>
            <input type="text" id="edit-pcat-desc" class="glass-input w-full" value="${c.description || ''}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('edit-pcat-name')?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ໝວດງານ');
          return false;
        }
        return {
          name,
          description: document.getElementById('edit-pcat-desc')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateProjectCategory(catId, res.value);
        this.openManageProjectCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  deleteProjectCategory(catId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບໝວດງານໂຄງການ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteProjectCategory(catId);
        this.openManageProjectCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  openEditProjectModal(projId) {
    const p = window.db.getProjects().find(pr => pr.id === projId);
    if (!p) return;

    const customers = window.db.getCustomers();
    const quotations = window.db.getDocuments('quotation');
    const invoices = window.db.getDocuments('invoice');
    const pCats = window.db.getProjectCategories();

    const custOptions = customers.map(c => `<option value="${c.id}" ${c.id === p.customerId ? 'selected' : ''}>${c.name}</option>`).join('');
    const qtOptions = quotations.map(q => `<option value="${q.docNumber}" ${q.docNumber === p.quotationDocNumber ? 'selected' : ''}>${q.docNumber} - ${q.customerName}</option>`).join('');
    const invOptions = invoices.map(i => `<option value="${i.docNumber}" ${i.docNumber === p.invoiceDocNumber ? 'selected' : ''}>${i.docNumber}</option>`).join('');
    const pCatOptions = pCats.map(c => `<option value="${c.name}" ${c.name === p.category ? 'selected' : ''}>${c.name}</option>`).join('');

    Swal.fire({
      title: `ແກ້ໄຂໂຄງການ: ${p.code}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ໂຄງການ *</label>
            <input type="text" id="edit-prj-title" class="glass-input w-full" value="${p.title}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດງານ</label>
              <select id="edit-prj-cat" class="glass-input w-full">${pCatOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ</label>
              <select id="edit-prj-cust" class="glass-input w-full">${custOptions}</select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ງົບປະມານ/ມູນຄ່າຂາຍ (₭)</label>
              <input type="number" id="edit-prj-budget" class="glass-input w-full font-bold" value="${p.budget}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ກຳນົດສົ່ງ</label>
              <input type="date" id="edit-prj-deadline" class="glass-input w-full" value="${p.deadline}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຄວາມຄືບໜ້າ (%)</label>
              <input type="number" id="edit-prj-progress" class="glass-input w-full" value="${p.progress}" min="0" max="100">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະ</label>
              <select id="edit-prj-status" class="glass-input w-full">
                <option value="in_progress" ${p.status === 'in_progress' ? 'selected' : ''}>ກຳລັງດຳເນີນງານ</option>
                <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>ສຳເລັດແລ້ວ</option>
                <option value="on_hold" ${p.status === 'on_hold' ? 'selected' : ''}>ພັກໄວ້ຊົ່ວຄາວ</option>
              </select>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div>
              <label class="block mb-1 text-sky-400 font-bold">ຜູກໃບສະເໜີລາຄາ (Quotation) - ຄຳນວນຕົ້ນທຶນ/ກຳໄລ</label>
              <select id="edit-prj-qt" onchange="App.handleProjectQuotationSelected(this.value)" class="glass-input w-full">
                <option value="">-- ບໍ່ຜູກ --</option>
                ${qtOptions}
              </select>
            </div>
            <div id="prj-quotation-cost-preview"></div>
            <div>
              <label class="block mb-1 text-emerald-400 font-bold">ຜູກໃບເກັບເງິນ (Invoice)</label>
              <select id="edit-prj-inv" class="glass-input w-full">
                <option value="">-- ບໍ່ຜູກ --</option>
                ${invOptions}
              </select>
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        if (p.quotationDocNumber) {
          this.handleProjectQuotationSelected(p.quotationDocNumber);
        }
      },
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກການແກ້ໄຂ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const custId = document.getElementById('edit-prj-cust')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const prog = parseInt(document.getElementById('edit-prj-progress')?.value || '0', 10);
        const qtDoc = document.getElementById('edit-prj-qt')?.value || '';
        const costData = qtDoc ? window.db.calculateQuotationCost(qtDoc) : null;
        const budgetVal = parseFloat(document.getElementById('edit-prj-budget')?.value || '0');

        return {
          title: document.getElementById('edit-prj-title')?.value,
          category: document.getElementById('edit-prj-cat')?.value || p.category,
          customerId: custId,
          customerName: cust ? cust.name : p.customerName,
          deadline: document.getElementById('edit-prj-deadline')?.value,
          budget: budgetVal,
          costPrice: costData ? costData.totalCost : p.costPrice,
          expectedProfit: costData ? costData.profit : (budgetVal - (p.costPrice || 0)),
          profitMargin: costData ? costData.profitMargin : p.profitMargin,
          progress: prog,
          status: document.getElementById('edit-prj-status')?.value || (prog >= 100 ? 'completed' : 'in_progress'),
          quotationDocNumber: qtDoc,
          invoiceDocNumber: document.getElementById('edit-prj-inv')?.value || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateProject(projId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteProject(projId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບໂຄງການ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບເລີຍ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteProject(projId);
        this.renderCurrentView();
      }
    });
  },

  openAddProjectModal() {
    const customers = window.db.getCustomers();
    const employees = window.db.getEmployees();
    const quotations = window.db.getDocuments('quotation');
    const pCats = window.db.getProjectCategories();

    const custOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const empOptions = employees.map(e => `<option value="${e.id}">${e.name} (${e.roleName || e.role})</option>`).join('');
    const qtOptions = quotations.map(q => `<option value="${q.docNumber}">${q.docNumber} - ${q.customerName}</option>`).join('');
    const pCatOptions = pCats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    const newCode = 'PRJ-' + new Date().getFullYear() + '-' + Math.floor(10 + Math.random() * 90);

    Swal.fire({
      title: 'ເພີ່ມໂຄງການໄອທີໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລະຫັດໂຄງການ</label>
              <input type="text" id="new-prj-code" class="glass-input w-full font-mono font-bold" value="${newCode}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ໝວດງານ</label>
              <select id="new-prj-cat" class="glass-input w-full">${pCatOptions}</select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ຊື່ໂຄງການ *</label>
            <input type="text" id="new-prj-title" class="glass-input w-full" placeholder="ເຊັ່ນ: ຕິດຕັ້ງລະບົບ Wi-Fi ໂຮງແຮມ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ *</label>
              <select id="new-prj-cust" class="glass-input w-full">${custOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຫົວໜ້າໂຄງການ *</label>
              <select id="new-prj-emp" class="glass-input w-full">${empOptions}</select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ງົບປະມານ/ມູນຄ່າຂາຍ (₭)</label>
              <input type="number" id="new-prj-budget" class="glass-input w-full font-bold" value="15000000">
            </div>
            <div>
              <label class="block mb-1 font-bold">ກຳນົດສົ່ງ</label>
              <input type="date" id="new-prj-deadline" class="glass-input w-full" value="${new Date(Date.now() + 30*86400000).toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div>
              <label class="block mb-1 text-sky-400 font-bold">ຜູກກັບໃບສະເໜີລາຄາ (Quotation) - ຄຳນວນຕົ້ນທຶນ/ກຳໄລ</label>
              <select id="new-prj-qt" onchange="App.handleProjectQuotationSelected(this.value)" class="glass-input w-full">
                <option value="">-- ບໍ່ຜູກ --</option>
                ${qtOptions}
              </select>
            </div>
            <div id="prj-quotation-cost-preview"></div>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກໂຄງການ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const title = document.getElementById('new-prj-title')?.value?.trim();
        const custId = document.getElementById('new-prj-cust')?.value;
        const leaderId = document.getElementById('new-prj-emp')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const emp = window.db.getEmployees().find(e => e.id === leaderId);
        const qtDoc = document.getElementById('new-prj-qt')?.value || '';
        const costData = qtDoc ? window.db.calculateQuotationCost(qtDoc) : null;
        const budgetVal = parseFloat(document.getElementById('new-prj-budget')?.value || '0');

        if (!title) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ໂຄງການ');
          return false;
        }

        return {
          code: document.getElementById('new-prj-code')?.value,
          title,
          category: document.getElementById('new-prj-cat')?.value,
          customerId: custId,
          customerName: cust ? cust.name : '-',
          leaderId,
          leaderName: emp ? emp.name : '-',
          budget: budgetVal,
          costPrice: costData ? costData.totalCost : 0,
          expectedProfit: costData ? costData.profit : (budgetVal > 0 ? budgetVal : 0),
          profitMargin: costData ? costData.profitMargin : 0,
          deadline: document.getElementById('new-prj-deadline')?.value,
          quotationDocNumber: qtDoc,
          invoiceDocNumber: '',
          progress: 10,
          status: 'in_progress'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const newProj = window.db.addProject(res.value);
        // Create default checklist tasks for new project
        window.db.addTask({ projectId: newProj.id, title: 'ສຳຫຼວດພື້ນທີ່ ແລະ ວາງແຜນອອກແບບ', status: 'done' });
        window.db.addTask({ projectId: newProj.id, title: 'ສັ່ງຊື້ ແລະ ກະກຽມອຸປະກອນ', status: 'todo' });
        window.db.addTask({ projectId: newProj.id, title: 'ຕິດຕັ້ງ ແລະ ຕັ້ງຄ່າລະບົບຕົວຈິງ', status: 'todo' });
        window.db.addTask({ projectId: newProj.id, title: 'ທົດສອບລະບົບ (UAT) ແລະ ສົ່ງມອບ', status: 'todo' });
        this.renderCurrentView();
      }
    });
  },


  // --------------------------------------------------------------------------
  // IT JOB CATEGORIES MANAGEMENT (ຈັດການປະເພດວຽກໄອທີ & ສ້ອມແປງ)
  // --------------------------------------------------------------------------
  openManageItJobCategoriesModal() {
    const renderCategoryList = () => {
      const cats = window.db.getItJobCategories();
      const rows = cats.map((c, idx) => `
        <tr class="border-b border-white/10">
          <td class="p-2.5 text-center opacity-60">${idx + 1}</td>
          <td class="p-2.5 font-bold">
            <span class="badge-glass-${c.color || 'cyan'} text-xs font-bold px-2 py-0.5 rounded">${c.name}</span>
          </td>
          <td class="p-2.5 font-mono text-xs opacity-75">${c.key || c.id}</td>
          <td class="p-2.5 opacity-80 text-xs">${c.description || '-'}</td>
          <td class="p-2.5 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="App.openEditItJobCategoryModal('${c.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
              <button onclick="App.deleteItJobCategory('${c.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');

      return `
        <div class="space-y-4 text-left text-xs">
          <div class="flex justify-between items-center pb-2 border-b border-white/10">
            <span class="opacity-75 font-semibold">ລາຍການປະເພດວຽກໄອທີທັງໝົດ (${cats.length})</span>
            <button onclick="App.openAddItJobCategoryModal()" class="btn-glass-primary text-xs py-1 px-3">
              <i class="fa-solid fa-plus mr-1"></i> ເພີ່ມປະເພດວຽກໃໝ່
            </button>
          </div>
          <div class="max-h-60 overflow-y-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[11px] opacity-75 border-b border-white/10">
                  <th class="p-2 text-center" style="width: 40px;">ລ/ດ</th>
                  <th class="p-2">ຊື່ປະເພດວຽກ</th>
                  <th class="p-2">Key</th>
                  <th class="p-2">ລາຍລະອຽດ</th>
                  <th class="p-2 text-center" style="width: 90px;">ຈັດການ</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `;
    };

    Swal.fire({
      title: 'ຈັດການປະເພດວຽກໄອທີ & ສ້ອມແປງ',
      html: renderCategoryList(),
      width: '640px',
      showConfirmButton: false,
      showCloseButton: true,
      customClass: { popup: 'swal-glass' }
    });
  },

  openAddItJobCategoryModal() {
    Swal.fire({
      title: 'ເພີ່ມປະເພດວຽກໄອທີໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ປະເພດວຽກ *</label>
            <input type="text" id="new-itcat-name" class="glass-input w-full" placeholder="ເຊັ່ນ: CCTV Maintenance / ແປງກ້ອງ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ສີ Badge</label>
              <select id="new-itcat-color" class="glass-input w-full">
                <option value="cyan">Cyan (ຟ້າອ່ອນ)</option>
                <option value="emerald">Emerald (ຂຽວ)</option>
                <option value="amber">Amber (ສົ້ມ/ເຫຼືອງ)</option>
                <option value="purple">Purple (ມ່ວງ)</option>
                <option value="rose">Rose (ແດງ/ບົວ)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຄຳອະທິບາຍ</label>
              <input type="text" id="new-itcat-desc" class="glass-input w-full" placeholder="ລາຍລະອຽດໂດຍຫຍໍ້">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('new-itcat-name')?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ປະເພດວຽກ');
          return false;
        }
        return {
          name,
          color: document.getElementById('new-itcat-color')?.value || 'cyan',
          description: document.getElementById('new-itcat-desc')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addItJobCategory(res.value);
        this.openManageItJobCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  openEditItJobCategoryModal(catId) {
    const c = window.db.getItJobCategories().find(cat => cat.id === catId);
    if (!c) return;

    Swal.fire({
      title: 'ແກ້ໄຂປະເພດວຽກໄອທີ',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ປະເພດວຽກ *</label>
            <input type="text" id="edit-itcat-name" class="glass-input w-full" value="${c.name}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ສີ Badge</label>
              <select id="edit-itcat-color" class="glass-input w-full">
                <option value="cyan" ${c.color === 'cyan' ? 'selected' : ''}>Cyan (ຟ້າອ່ອນ)</option>
                <option value="emerald" ${c.color === 'emerald' ? 'selected' : ''}>Emerald (ຂຽວ)</option>
                <option value="amber" ${c.color === 'amber' ? 'selected' : ''}>Amber (ສົ້ມ/ເຫຼືອງ)</option>
                <option value="purple" ${c.color === 'purple' ? 'selected' : ''}>Purple (ມ່ວງ)</option>
                <option value="rose" ${c.color === 'rose' ? 'selected' : ''}>Rose (ແດງ/ບົວ)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຄຳອະທິບາຍ</label>
              <input type="text" id="edit-itcat-desc" class="glass-input w-full" value="${c.description || ''}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('edit-itcat-name')?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ປະເພດວຽກ');
          return false;
        }
        return {
          name,
          color: document.getElementById('edit-itcat-color')?.value || 'cyan',
          description: document.getElementById('edit-itcat-desc')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateItJobCategory(catId, res.value);
        this.openManageItJobCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  deleteItJobCategory(catId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບປະເພດວຽກ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteItJobCategory(catId);
        this.openManageItJobCategoriesModal();
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // VIEW 4: ໜ້າວຽກໄອທີ (IT SERVICE JOBS: Onsite Support, ແປງຄອມ, ແປງປຣິນເຕີ)
  // --------------------------------------------------------------------------
  renderItJobs(container) {
    const jobs = window.db.getItJobs();
    const jobCategories = window.db.getItJobCategories();

    // Filters
    let filtered = jobs;
    if (this.itJobFilterStatus !== 'all') {
      filtered = filtered.filter(j => j.status === this.itJobFilterStatus);
    }
    if (this.itJobFilterType !== 'all') {
      filtered = filtered.filter(j => j.jobType === this.itJobFilterType);
    }

    const getJobCategoryBadge = (typeKey) => {
      const cat = jobCategories.find(c => c.key === typeKey || c.id === typeKey || c.name === typeKey);
      if (!cat) return `<span class="badge-glass-cyan text-xs font-bold px-2 py-0.5 rounded">${typeKey}</span>`;
      return `<span class="badge-glass-${cat.color || 'cyan'} text-xs font-bold px-2 py-0.5 rounded">${cat.name}</span>`;
    };

    const statusBadges = {
      pending: '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">ລໍຖ້າກວດເຊັກ</span>',
      in_progress: '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400">ກຳລັງແປງ/ດຳເນີນການ</span>',
      completed: '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">ສຳເລັດແລ້ວ</span>',
      delivered: '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">ສົ່ງມອບລູກຄ້າແລ້ວ</span>'
    };

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-wrench text-teal-400"></i>
              ໜ້າວຽກໄອທີ & ສ້ອມແປງ (IT Service Jobs)
            </h1>
            <p class="text-xs opacity-75 mt-1">ຈັດການວຽກ Onsite Support, ວຽກແປງຄອມ, ແປງປຣິນເຕີ, ລົງ Windows ແລະ ບັນທຶກວິທີແກ້ໄຂບັນຫາ (Resolutions)</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="App.openManageItJobCategoriesModal()" class="btn-glass-secondary text-xs">
              <i class="fa-solid fa-tags text-teal-400"></i> ຈັດການປະເພດວຽກ
            </button>
            <button onclick="App.openAddItJobModal()" class="btn-glass-primary text-xs">
              <i class="fa-solid fa-plus-circle"></i> ເປີດ Job ວຽກໄອທີໃໝ່
            </button>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="glass-panel p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-bold opacity-75">ປະເພດວຽກ:</span>
            <select onchange="App.itJobFilterType = this.value; App.renderCurrentView()" class="glass-input py-1 px-2.5">
              <option value="all" ${this.itJobFilterType === 'all' ? 'selected' : ''}>ທຸກປະເພດ</option>
              ${jobCategories.map(c => `<option value="${c.key || c.id}" ${this.itJobFilterType === (c.key || c.id) ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-bold opacity-75">ສະຖານະ:</span>
            <select onchange="App.itJobFilterStatus = this.value; App.renderCurrentView()" class="glass-input py-1 px-2.5">
              <option value="all" ${this.itJobFilterStatus === 'all' ? 'selected' : ''}>ທຸກສະຖານະ</option>
              <option value="pending" ${this.itJobFilterStatus === 'pending' ? 'selected' : ''}>ລໍຖ້າກວດເຊັກ</option>
              <option value="in_progress" ${this.itJobFilterStatus === 'in_progress' ? 'selected' : ''}>ກຳລັງດຳເນີນການ</option>
              <option value="completed" ${this.itJobFilterStatus === 'completed' ? 'selected' : ''}>ສຳເລັດ</option>
              <option value="delivered" ${this.itJobFilterStatus === 'delivered' ? 'selected' : ''}>ສົ່ງມອບແລ້ວ</option>
            </select>
          </div>
        </div>

        <!-- Jobs Table -->
        <div class="glass-panel p-4 overflow-x-auto">
          <table class="glass-table">
            <thead>
              <tr>
                <th style="width: 45px;" class="text-center">ລ/ດ</th>
                <th style="width: 120px;">ເລກທີ Job</th>
                <th>ລູກຄ້າ / ເບີໂທ</th>
                <th style="width: 130px;">ປະເພດວຽກ</th>
                <th>ອຸປະກອນ & ລາຍລະອຽດບັນຫາ / ວິທີແກ້ໄຂ (Resolution)</th>
                <th>ຊ່າງຜູ້ຮັບຜິດຊອບ</th>
                <th style="width: 120px;" class="text-right">ຄ່າແຮງ/ບໍລິການ</th>
                <th style="width: 140px;" class="text-center">ສະຖານະ</th>
                <th style="width: 120px;" class="text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? filtered.map((j, idx) => `
                <tr>
                  <td class="text-center opacity-60">${idx + 1}</td>
                  <td><span class="badge-glass-cyan text-xs font-mono font-bold px-2 py-0.5 rounded">${j.jobCode}</span></td>
                  <td>
                    <div class="font-bold">${j.customerName}</div>
                    <div class="text-[11px] opacity-70">📞 ${j.customerPhone || '-'}</div>
                  </td>
                  <td>${getJobCategoryBadge(j.jobType)}</td>
                  <td>
                    <div class="font-bold text-xs">${j.deviceModel || '-'} ${j.serialOrMac ? `<span class="opacity-60 font-mono text-[11px]">(${j.serialOrMac})</span>` : ''}</div>
                    <div class="text-[11px] opacity-80 mt-0.5"><span class="text-amber-400 font-bold">⚠️ ອາການ:</span> ${j.issueDescription}</div>
                    ${j.resolution ? `
                      <div class="text-[11px] text-teal-300 font-medium mt-1 bg-teal-500/10 p-1.5 rounded-lg border border-teal-500/20">
                        <i class="fa-solid fa-circle-check text-teal-400 mr-1"></i><strong>ວິທີແກ້ໄຂ:</strong> ${j.resolution}
                      </div>
                    ` : ''}
                  </td>
                  <td class="text-xs font-bold text-sky-400">${j.technicianName}</td>
                  <td class="text-right font-black text-emerald-400">${j.serviceFee.toLocaleString()} ₭</td>
                  <td class="text-center">${statusBadges[j.status] || j.status}</td>
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button onclick="ExportService.printItJobTag('${j.id}')" class="p-1.5 text-amber-400 hover:text-amber-300 transition" title="ພິມສະຕິກເກີຕິດເຄື່ອງ (Service Tag Sticker)"><i class="fa-solid fa-tag"></i></button>
                      <button onclick="App.sendWhatsAppNotification('${j.id}')" class="p-1.5 text-emerald-400 hover:text-emerald-300 transition" title="ແຈ້ງເຕືອນລູກຄ້າຜ່ານ WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                      <button onclick="ExportService.printServiceJobSheet('${j.id}')" class="p-1.5 text-teal-400 hover:text-teal-300 transition" title="ພິມໃບຮັບເຄື່ອງສ້ອມ / ໃບມອບວຽກ (Work Order)"><i class="fa-solid fa-print"></i></button>
                      <button onclick="App.openEditItJobModal('${j.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                      <button onclick="App.deleteItJob('${j.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="9" class="text-center py-10 opacity-60">ບໍ່ມີລາຍການວຽກໄອທີໃນໝວດນີ້</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAddItJobModal() {
    const employees = window.db.getEmployees();
    const jobCategories = window.db.getItJobCategories();
    const empOptions = employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    const catOptions = jobCategories.map(c => `<option value="${c.key || c.id}">${c.name}</option>`).join('');
    const newCode = 'JOB-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    Swal.fire({
      title: 'ເປີດ Job ວຽກໄອທີ / ແປງຄອມໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີ Job</label>
              <input type="text" id="job-code" class="glass-input w-full font-mono font-bold" value="${newCode}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ປະເພດວຽກ *</label>
              <select id="job-type" class="glass-input w-full">${catOptions}</select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຊື່ລູກຄ້າ *</label>
              <input type="text" id="job-cust" class="glass-input w-full" placeholder="ຊື່ລູກຄ້າ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="job-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1">ອຸປະກອນ / ຮຸ່ນ (Model)</label>
              <input type="text" id="job-model" class="glass-input w-full" placeholder="ເຊັ່ນ: PC Dell OptiPlex 7090">
            </div>
            <div>
              <label class="block mb-1">Serial / MAC</label>
              <input type="text" id="job-sn" class="glass-input w-full font-mono" placeholder="SN ຫຼື MAC Address">
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ອາການເສຍ / ລາຍລະອຽດວຽກ *</label>
            <textarea id="job-issue" rows="2" class="glass-input w-full" placeholder="ລະບຸອາການ ຫຼື ລາຍລະອຽດວຽກທີ່ຕ້ອງການ"></textarea>
          </div>
          <div>
            <label class="block mb-1 font-bold text-teal-300">ລາຍລະອຽດການແກ້ໄຂບັນຫາ (Resolutions / ວິທີແກ້ໄຂ)</label>
            <textarea id="job-resolution" rows="2" class="glass-input w-full" placeholder="ລະບຸວິທີການແກ້ໄຂ, ສາເຫດ ຫຼື ຜົນການດຳເນີນງານ (ຖ້າມີ)..."></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຊ່າງຜູ້ຮັບຜິດຊອບ *</label>
              <select id="job-tech" class="glass-input w-full">${empOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຄ່າແຮງ/ຄ່າບໍລິການ (₭)</label>
              <input type="number" id="job-fee" class="glass-input w-full font-bold text-emerald-400" value="200000">
            </div>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ Job ວຽກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const custName = document.getElementById('job-cust')?.value?.trim();
        const phone = document.getElementById('job-phone')?.value?.trim();
        const issue = document.getElementById('job-issue')?.value?.trim();
        const techId = document.getElementById('job-tech')?.value;
        const tech = window.db.getEmployees().find(e => e.id === techId);

        if (!custName || !issue) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ລູກຄ້າ ແລະ ລາຍລະອຽດວຽກ');
          return false;
        }

        return {
          jobCode: document.getElementById('job-code')?.value,
          jobType: document.getElementById('job-type')?.value,
          customerName: custName,
          customerPhone: phone,
          deviceModel: document.getElementById('job-model')?.value || '-',
          serialOrMac: document.getElementById('job-sn')?.value || '-',
          issueDescription: issue,
          resolution: document.getElementById('job-resolution')?.value?.trim() || '',
          technicianId: techId,
          technicianName: tech ? tech.name : 'ຊ່າງໄອທີ',
          serviceFee: parseFloat(document.getElementById('job-fee')?.value || '0'),
          status: 'pending'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addItJob(res.value);
        this.renderCurrentView();
      }
    });
  },

  openEditItJobModal(jobId) {
    const j = window.db.getItJobs().find(it => it.id === jobId);
    if (!j) return;

    const employees = window.db.getEmployees();
    const jobCategories = window.db.getItJobCategories();
    const empOptions = employees.map(e => `<option value="${e.id}" ${e.id === j.technicianId ? 'selected' : ''}>${e.name}</option>`).join('');
    const catOptions = jobCategories.map(c => `<option value="${c.key || c.id}" ${(c.key || c.id) === j.jobType ? 'selected' : ''}>${c.name}</option>`).join('');

    Swal.fire({
      title: `ແກ້ໄຂ Job: ${j.jobCode}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ປະເພດວຽກ</label>
              <select id="edit-job-type" class="glass-input w-full">${catOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະວຽກ</label>
              <select id="edit-job-status" class="glass-input w-full">
                <option value="pending" ${j.status === 'pending' ? 'selected' : ''}>ລໍຖ້າກວດເຊັກ</option>
                <option value="in_progress" ${j.status === 'in_progress' ? 'selected' : ''}>ກຳລັງດຳເນີນການ</option>
                <option value="completed" ${j.status === 'completed' ? 'selected' : ''}>ສຳເລັດ</option>
                <option value="delivered" ${j.status === 'delivered' ? 'selected' : ''}>ສົ່ງມອບແລ້ວ</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຄ່າບໍລິການ (₭)</label>
              <input type="number" id="edit-job-fee" class="glass-input w-full font-bold text-emerald-400" value="${j.serviceFee}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊ່າງຜູ້ຮັບຜິດຊອບ</label>
              <select id="edit-job-tech" class="glass-input w-full">${empOptions}</select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ອາການ / ລາຍລະອຽດ</label>
            <textarea id="edit-job-issue" rows="2" class="glass-input w-full">${j.issueDescription}</textarea>
          </div>
          <div>
            <label class="block mb-1 font-bold text-teal-300">ລາຍລະອຽດການແກ້ໄຂບັນຫາ (Resolutions / ວິທີແກ້ໄຂ)</label>
            <textarea id="edit-job-resolution" rows="2" class="glass-input w-full" placeholder="ລະບຸວິທີການແກ້ໄຂບັນຫາ, ສາເຫດ ຫຼື ຜົນການດຳເນີນງານ...">${j.resolution || ''}</textarea>
          </div>
          <div>
            <label class="block mb-1 font-bold">ອຸປະກອນທີ່ປ່ຽນ (ຖ້າມີ)</label>
            <input type="text" id="edit-job-parts" class="glass-input w-full" value="${j.partsReplaced || ''}">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const techId = document.getElementById('edit-job-tech')?.value;
        const tech = window.db.getEmployees().find(e => e.id === techId);
        return {
          jobType: document.getElementById('edit-job-type')?.value || j.jobType,
          status: document.getElementById('edit-job-status')?.value,
          serviceFee: parseFloat(document.getElementById('edit-job-fee')?.value || '0'),
          issueDescription: document.getElementById('edit-job-issue')?.value,
          resolution: document.getElementById('edit-job-resolution')?.value?.trim() || '',
          partsReplaced: document.getElementById('edit-job-parts')?.value,
          technicianId: techId,
          technicianName: tech ? tech.name : j.technicianName
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateItJob(jobId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteItJob(jobId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບ Job ວຽກໄອທີ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteItJob(jobId);
        this.renderCurrentView();
      }
    });
  },

  sendWhatsAppNotification(jobId) {
    const job = window.db.data.itJobs.find(j => j.id === jobId);
    if (!job) {
      Swal.fire({ title: 'ຜິດພາດ', text: 'ບໍ່ພົບຂໍ້ມູນວຽກບໍລິການໄອທີນີ້', icon: 'error' });
      return;
    }

    const rawPhone = (job.customerPhone || job.phone || '').trim();
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone) {
      Swal.fire({
        title: 'ບໍ່ມີເບີໂທລະສັບ',
        text: 'ກະລຸນາໃສ່ເບີໂທລະສັບລູກຄ້າກ່ອນສົ່ງຂໍ້ຄວາມ WhatsApp',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    // Convert Lao local phone format: 020... -> 85620... or 030... -> 85630...
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '856' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('856')) {
      cleanPhone = '856' + cleanPhone;
    }

    const settings = window.db.getSettings();
    const statusMap = {
      'pending': '⏳ ລໍຖ້າກວດເຊັກ',
      'in_progress': '⚙️ ກຳລັງດຳເນີນການສ້ອມແປງ',
      'completed': '✅ ສ້ອມແປງສຳເລັດແລ້ວ (ພ້ອມມອບເຄື່ອງ)',
      'delivered': '📦 ສົ່ງມອບເຄື່ອງໃຫ້ລູກຄ້າຮຽບຮ້ອຍ',
      'cancelled': '❌ ຍົກເລີກການສ້ອມແປງ'
    };
    const statusText = statusMap[job.status] || job.status;

    let msg = `ສະບາຍດີ ທ່ານ ${job.customerName || 'ລູກຄ້າ'},\n` +
      `ແຈ້ງເຕືອນສະຖານະວຽກບໍລິການໄອທີ ຈາກ ${settings.shopName || 'NETD IT SOLUTIONS'}:\n` +
      `--------------------------------\n` +
      `🔖 ເລກທີ Job: ${job.jobCode || '-'}\n` +
      `💻 ອຸປະກອນ: ${job.deviceModel || 'ອຸປະກອນໄອທີ'}\n` +
      `📊 ສະຖານະ: ${statusText}\n` +
      `💰 ຄ່າບໍລິການ: ${Number(job.serviceFee || 0).toLocaleString()} ₭\n`;

    if (job.resolution) {
      msg += `🔧 ຜົນການກວດເຊັກ/ແກ້ໄຂ: ${job.resolution}\n`;
    }
    msg += `--------------------------------\n` +
      `📞 ສອບຖາມເພີ່ມເຕີມ: ${settings.phone || '020 5555 1234'}\n` +
      `ຂອບໃຈທີ່ໃຊ້ບໍລິການກັບພວກເຮົາ! 🙏`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  },

  // --------------------------------------------------------------------------
  // VIEW 5: ເອກະສານ ແລະ ໃບບີນ (DOCUMENTS) - QUOTATION, INVOICE, POS, PO
  // --------------------------------------------------------------------------
  renderDocuments(container) {
    const isPoTab = this.docFilterTab === 'po';
    let docs = [];
    let pos = [];

    const currentYear = new Date().getFullYear();
    const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (this.docFilterMonth === undefined) {
      this.docFilterMonth = currentMonthStr;
    }

    const laoMonthNames = [
      'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
      'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
    ];

    // Collect available months from documents and POs (including all 12 months of current year)
    const docMonthsSet = new Set();
    for (let m = 1; m <= 12; m++) {
      docMonthsSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }
    const allDbDocs = window.db.getDocuments('all');
    const allDbPos = window.db.getPurchaseOrders();
    allDbDocs.forEach(d => { if (d.date && d.date.length >= 7) docMonthsSet.add(d.date.slice(0, 7)); });
    allDbPos.forEach(p => { if (p.orderDate && p.orderDate.length >= 7) docMonthsSet.add(p.orderDate.slice(0, 7)); });
    const docMonthsList = Array.from(docMonthsSet).sort().reverse();

    if (isPoTab) {
      pos = window.db.getPurchaseOrders();
      if (this.docFilterMonth && this.docFilterMonth !== 'all') {
        pos = pos.filter(p => (p.orderDate || '').startsWith(this.docFilterMonth));
      }
      if (this.docSearchQuery) {
        const q = this.docSearchQuery.toLowerCase();
        pos = pos.filter(p => 
          (p.poNumber || '').toLowerCase().includes(q) ||
          (p.supplierName || '').toLowerCase().includes(q) ||
          (p.orderDate || '').includes(q)
        );
      }
    } else {
      docs = window.db.getDocuments(this.docFilterTab);
      if (this.docFilterMonth && this.docFilterMonth !== 'all') {
        docs = docs.filter(d => (d.date || '').startsWith(this.docFilterMonth));
      }
      if (this.docSearchQuery) {
        const q = this.docSearchQuery.toLowerCase();
        docs = docs.filter(d => 
          (d.docNumber || '').toLowerCase().includes(q) ||
          (d.customerName || '').toLowerCase().includes(q) ||
          (d.date || '').includes(q)
        );
      }
    }

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-file-invoice text-emerald-400"></i>
              ເອກະສານ ແລະ ໃບບີນ (Documents & Billing)
            </h1>
            <p class="text-xs opacity-75 mt-1">ໃບສະເໜີລາຄາ, ໃບເກັບເງິນ (Invoice), ໃບສົ່ງເຄື່ອງ (Delivery), ບິນຂາຍໜ້າຮ້ານ (POS) ແລະ ໃບສັ່ງຊື້ສິນຄ້າ (PO)</p>
          </div>

          ${this.canManage('documents') ? `
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="App.openMultiItemQuotationModal()" class="btn-glass-primary text-xs">
                <i class="fa-solid fa-file-lines"></i> + ສ້າງໃບສະເໜີລາຄາ
              </button>
              <button onclick="App.openCreateInvoiceModal()" class="btn-glass-success text-xs">
                <i class="fa-solid fa-receipt"></i> + ສ້າງໃບເກັບເງີນ
              </button>
              <button onclick="App.openCreateDeliveryModal()" class="btn-glass-secondary text-xs border-purple-400/40 text-purple-300">
                <i class="fa-solid fa-truck-ramp-box text-purple-400"></i> + ສ້າງໃບສົ່ງເຄື່ອງ
              </button>
              <button onclick="App.openCreatePOSModal()" class="btn-glass-secondary text-xs">
                <i class="fa-solid fa-cash-register text-amber-400"></i> + ບີນຂາຍໜ້າຮ້ານ (POS)
              </button>
              <button onclick="App.openCreatePOModal()" class="btn-glass-secondary text-xs border-indigo-400/40 text-indigo-300">
                <i class="fa-solid fa-cart-shopping text-indigo-400"></i> + ສ້າງໃບສັ່ງຊື້ (PO)
              </button>
              <button onclick="ExportService.exportDocumentsToExcel()" class="btn-glass-secondary text-xs flex items-center gap-1.5" title="Export ລາຍການເອກະສານເປັນ Excel">
                <i class="fa-solid fa-file-excel text-emerald-400"></i> Export Excel
              </button>
            </div>
          ` : `
            <div class="flex items-center gap-2">
              <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ (Technician Read-Only)</span>
            </div>
          `}
        </div>

        <!-- Filter tabs & Search Bar -->
        <div class="glass-panel p-4">
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div class="flex items-center gap-1.5 overflow-x-auto text-xs font-bold shrink-0">
              <button onclick="App.setDocTab('all')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'all' ? 'bg-sky-500 text-white shadow' : 'bg-white/5 opacity-75'}">ທັງໝົດ</button>
              <button onclick="App.setDocTab('quotation')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'quotation' ? 'bg-sky-500 text-white shadow' : 'bg-white/5 opacity-75'}">ໃບສະເໜີລາຄາ</button>
              <button onclick="App.setDocTab('invoice')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'invoice' ? 'bg-emerald-500 text-white shadow' : 'bg-white/5 opacity-75'}">ໃບເກັບເງີນ</button>
              <button onclick="App.setDocTab('delivery')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'delivery' ? 'bg-purple-600 text-white shadow' : 'bg-white/5 opacity-75'}">ໃບສົ່ງເຄື່ອງ (Delivery)</button>
              <button onclick="App.setDocTab('pos')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'pos' ? 'bg-amber-500 text-white shadow' : 'bg-white/5 opacity-75'}">ບີນຂາຍໜ້າຮ້ານ (POS)</button>
              <button onclick="App.setDocTab('po')" class="px-3.5 py-1.5 rounded-xl ${this.docFilterTab === 'po' ? 'bg-indigo-500 text-white shadow' : 'bg-white/5 opacity-75'}">ໃບສັ່ງຊື້ສິນຄ້າ (PO)</button>
            </div>

            <!-- Month Filter & Search Input -->
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="flex items-center gap-1.5">
                <label class="text-xs font-bold text-sky-400 shrink-0"><i class="fa-solid fa-calendar mr-1"></i>ແຍກເດືອນ:</label>
                <select onchange="App.setDocMonth(this.value)" class="glass-input py-1.5 px-2.5 text-xs font-bold">
                  <option value="all" ${this.docFilterMonth === 'all' ? 'selected' : ''}>-- ທຸກເດືອນ (ທັງໝົດ) --</option>
                  ${docMonthsList.map(m => {
                    const [yr, mo] = m.split('-');
                    const moNum = parseInt(mo, 10);
                    const laoName = laoMonthNames[moNum - 1] || m;
                    return `<option value="${m}" ${this.docFilterMonth === m ? 'selected' : ''}>${m === currentMonthStr ? '⭐ ' : ''}ເດືອນ ${moNum} (${laoName}) ${yr}</option>`;
                  }).join('')}
                </select>
              </div>

              <!-- Search Input -->
              <div class="relative w-full sm:w-64">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 opacity-60 text-xs"></i>
                <input type="text" placeholder="ຄົ້ນຫາເລກທີບິນ, ລູກຄ້າ, ວັນທີ..." 
                       value="${this.docSearchQuery || ''}" 
                       oninput="App.setDocSearch(this.value)" 
                       class="glass-input pl-8 pr-7 py-1.5 text-xs w-full">
                ${this.docSearchQuery ? `
                  <button onclick="App.setDocSearch('')" class="absolute right-2.5 top-2 text-xs opacity-60 hover:opacity-100 text-slate-400">
                    <i class="fa-solid fa-circle-xmark"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Table Content -->
          <div class="mt-4 overflow-x-auto">
            ${isPoTab ? `
              <!-- Purchase Orders (PO) Table -->
              <table class="glass-table">
                <thead>
                  <tr>
                    <th style="width: 45px;" class="text-center">ລ/ດ</th>
                    <th style="width: 140px;">ເລກທີ PO</th>
                    <th>ຜູ້ສະໜອງສິນຄ້າ (Supplier)</th>
                    <th style="width: 125px;" class="whitespace-nowrap">ວັນທີສັ່ງ</th>
                    <th style="width: 120px;" class="text-right">ຄ່າຂົນສົ່ງ</th>
                    <th style="width: 130px;" class="text-right">ຍອດລວມ</th>
                    <th style="width: 130px;" class="text-center">ສະຖານະ</th>
                    <th style="width: 170px;" class="text-right pr-4">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody>
                  ${pos.length > 0 ? pos.map((p, idx) => `
                    <tr>
                      <td class="text-center opacity-60">${idx + 1}</td>
                      <td><span class="badge-glass-cyan text-xs font-mono font-bold px-2 py-0.5 rounded">${p.poNumber}</span></td>
                      <td class="font-bold">${p.supplierName}</td>
                      <td class="font-mono text-xs whitespace-nowrap">${p.orderDate}</td>
                      <td class="text-right opacity-80">${(p.shippingCost || 0).toLocaleString()} ₭</td>
                      <td class="text-right font-black text-indigo-400">${(p.totalAmount || 0).toLocaleString()} ₭</td>
                      <td class="text-center">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${p.status === 'received' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}">
                          ${p.status === 'received' ? '✓ ໄດ້ຮັບເຄື່ອງແລ້ວ' : '⏳ ສັ່ງຊື້ແລ້ວ/ກຳລັງຂົນສົ່ງ'}
                        </span>
                      </td>
                      <td class="text-right pr-3">
                        <div class="flex items-center justify-end gap-1.5">
                          ${this.canManage('documents') ? `
                            ${p.status !== 'received' ? `
                              <button onclick="App.receivePO('${p.id}')" class="btn-glass-success text-[11px] py-1 px-2" title="ກົດຮັບສິນຄ້າເຂົ້າສາງ"><i class="fa-solid fa-box-open mr-1"></i> ຮັບເຂົ້າສາງ</button>
                            ` : ''}
                            <button onclick="ExportService.printPurchaseOrder('${p.id}')" class="p-1.5 text-indigo-400 hover:text-indigo-300 transition" title="ເບິ່ງ/ພິມໃບສັ່ງຊື້ (PO)"><i class="fa-solid fa-file-invoice"></i></button>
                            <button onclick="App.openEditPOModal('${p.id}')" class="p-1.5 text-sky-400 hover:text-sky-300 transition" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="App.deletePO('${p.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 transition" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                          ` : `
                            <span class="text-[10px] opacity-50"><i class="fa-solid fa-lock" title="Read Only"></i></span>
                          `}
                        </div>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="8" class="text-center py-8 opacity-60">ບໍ່ມີໃບສັ່ງຊື້ສິນຄ້າ (PO)</td></tr>
                  `}
                </tbody>
              </table>
            ` : `
              <!-- General Documents Table (Quotation, Invoice, Delivery, POS) -->
              <table class="glass-table">
                <thead>
                  <tr>
                    <th style="width: 45px;" class="text-center">ລ/ດ</th>
                    <th style="width: 140px;">ເລກທີເອກະສານ</th>
                    <th style="width: 110px;">ປະເພດ</th>
                    <th>ຊື່ລູກຄ້າ</th>
                    <th style="width: 125px;" class="whitespace-nowrap">ວັນທີ</th>
                    <th style="width: 130px;" class="text-right">ຍອດລວມ</th>
                    <th style="width: 140px;" class="text-center">ສະຖານະ</th>
                    <th style="width: 180px;" class="text-right pr-4">ຈັດການ</th>
                  </tr>
                </thead>
                <tbody>
                  ${docs.length > 0 ? docs.map((d, idx) => {
                    let badgeHtml = '';
                    if (d.docType === 'quotation') {
                      if (d.status === 'accepted') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ລູກຄ້າເຊັນຮັບແລ້ວ (Accept)</span>';
                      else if (d.status === 'rejected') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">✗ ລູກຄ້າປະຕິເສດ (Reject)</span>';
                      else if (d.status === 'draft') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">ຮ່າງໄວ້ (Draft)</span>';
                      else badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">ສົ່ງແລ້ວ (Sent)</span>';
                    } else if (d.docType === 'invoice') {
                      const isOverdue = d.status !== 'paid' && d.status !== 'cancelled' && d.dueDate && d.dueDate < new Date().toISOString().split('T')[0];
                      if (d.status === 'paid') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ຊຳລະແລ້ວ (Paid)</span>';
                      else if (d.status === 'draft') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">ຮ່າງໄວ້ (Draft)</span>';
                      else if (isOverdue) badgeHtml = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i>ກາຍກຳນົດ (${d.dueDate})</span>`;
                      else badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">⏳ ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</span>';
                    } else if (d.docType === 'delivery') {
                      if (d.status === 'delivered') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ສົ່ງຮອດແລ້ວ (Delivered)</span>';
                      else if (d.status === 'cancelled') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">✗ ຍົກເລີກ (Cancelled)</span>';
                      else badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">🚚 ກຳລັງຈັດສົ່ງ (In Transit)</span>';
                    } else if (d.docType === 'pos') {
                      if (d.status === 'unpaid') badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">⏳ ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</span>';
                      else badgeHtml = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ຊຳລະແລ້ວ (Paid)</span>';
                    } else {
                      badgeHtml = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300">${d.status}</span>`;
                    }

                    return `
                    <tr>
                      <td class="text-center opacity-60">${idx + 1}</td>
                      <td><span class="badge-glass-cyan text-xs font-mono font-bold px-2 py-0.5 rounded">${d.docNumber}</span></td>
                      <td>
                        <span class="text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                          d.docType === 'invoice' ? 'bg-emerald-500/20 text-emerald-400' :
                          d.docType === 'delivery' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          d.docType === 'pos' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400'
                        }">
                          ${d.docType === 'invoice' ? 'ໃບເກັບເງິນ' : d.docType === 'delivery' ? 'ໃບສົ່ງເຄື່ອງ' : d.docType === 'pos' ? 'ບິນ POS' : 'ໃບສະເໜີ'}
                        </span>
                      </td>
                      <td class="font-bold">
                        <div>${d.customerName}</div>
                        ${d.refDocId ? `<div class="text-[10px] opacity-70 font-mono text-purple-300">ອ້າງອີງ: ${d.refDocId}</div>` : ''}
                      </td>
                      <td class="font-mono text-xs whitespace-nowrap">
                        <div>${d.date}</div>
                        ${d.dueDate ? `<div class="text-[10px] ${d.dueDate < new Date().toISOString().split('T')[0] && d.status !== 'paid' ? 'text-rose-400 font-bold' : 'opacity-60'}">ຄົບ: ${d.dueDate}</div>` : ''}
                      </td>
                      <td class="text-right font-black ${d.docType === 'delivery' ? 'text-purple-300' : 'text-sky-400'}">${(d.grandTotal || d.totalAmount || 0).toLocaleString()} ₭</td>
                      <td class="text-center">
                        ${badgeHtml}
                      </td>
                      <td class="text-right pr-3">
                        <div class="flex items-center justify-end gap-1.5">
                          ${d.docType === 'quotation' && this.canManage('documents') ? `
                            <button onclick="App.openCreateDeliveryModal('${d.docNumber}')" class="btn-glass-secondary text-[11px] py-1 px-2 border-purple-500/30 text-purple-300" title="ສ້າງໃບສົ່ງເຄື່ອງຈາກໃບສະເໜີນີ້"><i class="fa-solid fa-truck-ramp-box mr-1"></i>DO</button>
                          ` : ''}
                          ${d.docType === 'pos' ? `
                            <button onclick="ExportService.printPosThermalReceipt('${d.id}', '80mm')" class="btn-glass-warning text-[11px] py-1 px-2 text-amber-400 font-bold" title="ເບິ່ງ/ພິມໃບບິນ Slip 80ມມ"><i class="fa-solid fa-receipt mr-1"></i>80ມມ</button>
                          ` : ''}
                          ${d.docType === 'delivery' ? `
                            <button onclick="ExportService.printDeliveryNote('${d.id}')" class="btn-glass-secondary text-[11px] py-1 px-2 border-purple-500/40 text-purple-300" title="ພິມໃບສົ່ງເຄື່ອງ (Delivery Note A4)"><i class="fa-solid fa-truck-ramp-box mr-1"></i>ພິມ DO</button>
                          ` : `
                            <button onclick="ExportService.printDocument('${d.id}')" class="btn-glass-primary text-[11px] py-1 px-2" title="ພິມ/PDF A4"><i class="fa-solid fa-print"></i></button>
                          `}
                          ${this.canManage('documents') ? `
                            <button onclick="App.openEditDocumentModal('${d.id}')" class="p-1.5 text-sky-400 hover:text-sky-300 transition" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                            <button onclick="App.deleteDocument('${d.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 transition" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `}).join('') : `
                    <tr><td colspan="8" class="text-center py-8 opacity-60">ບໍ່ມີເອກະສານທີ່ຕົງກັບການຄົ້ນຫາ</td></tr>
                  `}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;
  },

  setDocTab(tab) {
    this.docFilterTab = tab;
    this.renderCurrentView();
  },

  // --------------------------------------------------------------------------
  // CREATE INVOICE MODAL (ໃບເກັບເງິນ)
  // --------------------------------------------------------------------------
  openCreateInvoiceModal() {
    const customers = window.db.getCustomers();
    const quotations = window.db.getDocuments('quotation');
    const projects = window.db.getProjects();
    const categories = window.db.getCategories();
    const products = window.db.getProducts();

    const custOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const qtOptions = quotations.map(q => `<option value="${q.docNumber}">${q.docNumber} - ${q.customerName} (${(q.grandTotal || 0).toLocaleString()} ₭)</option>`).join('');
    const newDocNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    window._invoiceItems = [];

    Swal.fire({
      title: 'ສ້າງໃບເກັບເງິນ (Invoice)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີໃບເກັບເງິນ</label>
              <input type="text" id="inv-num" class="glass-input w-full font-mono font-bold" value="${newDocNumber}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີອອກບິນ</label>
              <input type="date" id="inv-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ *</label>
              <select id="inv-cust" class="glass-input w-full">${custOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ກຳນົດຊຳລະ (Due Date)</label>
              <input type="date" id="inv-due-date" class="glass-input w-full" value="${new Date(Date.now() + 15*86400000).toISOString().split('T')[0]}">
            </div>
          </div>

          <!-- Pull from Quotation Selector -->
          <div class="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/20">
            <label class="block mb-1 text-sky-400 font-bold"><i class="fa-solid fa-file-import mr-1"></i> ດຶງລາຍການຈາກໃບສະເໜີລາຄາ (Quotation):</label>
            <select id="inv-pull-qt" onchange="App.handleCopyQuotationToInvoice(this.value)" class="glass-input w-full">
              <option value="">-- ເລືອກໃບສະເໜີລາຄາເພື່ອດຶງຂໍ້ມູນອັດຕະໂນມັດ --</option>
              ${qtOptions}
            </select>
          </div>

          <!-- Add Item Row with Category Filter -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="font-bold text-emerald-400 flex items-center justify-between">
              <span>ລາຍການສິນຄ້າ / ຄ່າບໍລິການ</span>
              <span class="text-[11px] opacity-75 font-normal">ເລືອກໝວດສິນຄ້າກ່ອນເພື່ອຊອກຫາງ່າຍ</span>
            </div>

            <div class="grid grid-cols-2 gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
              <div>
                <label class="block text-[11px] font-bold text-amber-400 mb-0.5">1. ເລືອກໝວດສິນຄ້າ (ເພື່ອກອງ):</label>
                <select id="inv-cat-filter" onchange="App.handleInvoiceCatFilter(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                  ${catOptions}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-emerald-400 mb-0.5">2. ເລືອກສິນຄ້າຈາກສາງ:</label>
                <select id="inv-stock-picker" onchange="App.handlePickFromStockToInvoice(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ເລືອກສິນຄ້າຈາກສາງ --</option>
                  ${products.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">${p.name} - ${p.model || p.sku} (${p.salePrice.toLocaleString()} ₭)</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <input type="text" id="inv-item-name" class="glass-input col-span-2" placeholder="ພິມຊື່ລາຍການ/ບໍລິການ...">
              <input type="number" id="inv-item-qty" class="glass-input text-center" value="1" placeholder="ຈຳນວນ">
              <input type="number" id="inv-item-price" class="glass-input text-right" placeholder="ລາຄາ (₭)">
            </div>
            <div class="flex justify-end items-center">
              <button type="button" onclick="App.addInvoiceItemRow()" class="btn-glass-primary py-1 px-3">
                <i class="fa-solid fa-plus"></i> ເພີ່ມລົງບິນ
              </button>
            </div>

            <!-- Items Table -->
            <div class="max-h-36 overflow-y-auto mt-2 border-t border-white/10 pt-2">
              <table class="w-full text-[11px]">
                <thead><tr class="opacity-60 text-left"><th class="py-1">ລາຍການ</th><th class="text-center py-1">ຈຳນວນ</th><th class="text-right py-1">ລາຄາ</th><th class="text-right py-1">ລວມ</th><th></th></tr></thead>
                <tbody id="inv-items-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Payment status and method -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ສະຖານະການຊຳລະ</label>
              <select id="inv-status" class="glass-input w-full font-bold">
                <option value="unpaid">⏳ ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</option>
                <option value="paid">✓ ຊຳລະແລ້ວ (Paid)</option>
                <option value="draft">📝 ຮ່າງໄວ້ (Draft)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຮູບແບບການຊຳລະ</label>
              <select id="inv-method" class="glass-input w-full">
                <option value="transfer">💳 ເງີນໂອນ (Transfer)</option>
                <option value="cash">💵 ເງິນສົດ (Cash)</option>
              </select>
            </div>
          </div>

          <!-- Discount and Total Summary -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block mb-1 font-bold text-slate-300">ສ່ວນຫຼຸດ (Discount ₭):</label>
                <input type="number" id="inv-discount" oninput="App.updateInvoiceItemsUI()" class="glass-input w-full text-right font-bold text-rose-400" value="0" placeholder="0">
              </div>
              <div class="flex flex-col justify-end text-right">
                <span class="text-[11px] opacity-75">ຍອດລວມໃບເກັບເງິນ:</span>
                <span id="inv-grand-total" class="font-black text-lg text-emerald-400">0 ₭</span>
              </div>
            </div>
          </div>

          <!-- Notes & Terms -->
          <div>
            <label class="block mb-1 font-bold text-slate-200 flex items-center justify-between">
              <span>ໝາຍເຫດ ແລະ ເງື່ອນໄຂ (Notes & Terms)</span>
              <span class="text-[10px] text-emerald-400 font-normal">ສາມາດພິມ/ແກ້ໄຂເອງໄດ້</span>
            </label>
            <textarea id="inv-notes" rows="2" class="glass-input w-full text-xs py-2 leading-relaxed" placeholder="ພິມໝາຍເຫດ ແລະ ເງື່ອນໄຂໃບເກັບເງິນ...">ກະລຸນາຊຳລະເງິນຕາມກຳນົດເວລາ ແລະ ອ້າງອີງເລກທີໃບເກັບເງິນທຸກຄັ້ງທີ່ໂອນ.</textarea>
          </div>
        </div>
      `,
      width: '680px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ ແລະ ສ້າງໃບເກັບເງິນ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        if (!window._invoiceItems || window._invoiceItems.length === 0) {
          Swal.showValidationMessage('ກະລຸນາເພີ່ມລາຍການຢ່າງໜ້ອຍ 1 ລາຍການ');
          return false;
        }

        const custId = document.getElementById('inv-cust')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const subtotal = window._invoiceItems.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
        const discount = parseFloat(document.getElementById('inv-discount')?.value || '0');
        const grandTotal = Math.max(0, subtotal - discount);
        const status = document.getElementById('inv-status')?.value;
        const docNumber = document.getElementById('inv-num')?.value;
        const date = document.getElementById('inv-date')?.value;

        return {
          docNumber,
          docType: 'invoice',
          customerId: custId,
          customerName: cust ? cust.name : 'ລູກຄ້າ',
          date,
          dueDate: document.getElementById('inv-due-date')?.value,
          status,
          paymentMethod: document.getElementById('inv-method')?.value,
          subtotal,
          discount,
          grandTotal,
          items: window._invoiceItems,
          notes: document.getElementById('inv-notes')?.value?.trim() || '',
          createdBy: App.currentUser ? App.currentUser.name : 'Admin'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addDocument(res.value);
        // If marked paid, automatically record income transaction & deduct inventory stock
        if (res.value.status === 'paid') {
          window.db.addTransaction({
            date: res.value.date,
            type: 'income',
            category: 'service_fee',
            amount: res.value.grandTotal,
            refDoc: res.value.docNumber,
            description: `ຮັບເງິນຕາມໃບເກັບເງິນ ${res.value.docNumber} (${res.value.customerName})`,
            paymentMethod: res.value.paymentMethod
          });

          if (res.value.items && res.value.items.length > 0) {
            res.value.items.forEach(it => {
              if (it.productId) {
                const qty = it.qty || 1;
                window.db.deductProductStock(it.productId, qty, res.value.docNumber);
              }
            });
          }
        }
        Swal.fire({
          title: 'ສ້າງໃບເກັບເງິນສຳເລັດ!',
          text: `ເລກທີ: ${res.value.docNumber}`,
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
        this.renderCurrentView();
      }
    });
  },

  handleInvoiceCatFilter(catId) {
    const sel = document.getElementById('inv-stock-picker');
    if (!sel) return;
    let prods = window.db.getProducts();
    if (catId) {
      prods = prods.filter(p => p.categoryId === catId);
    }
    sel.innerHTML = '<option value="">-- ເລືອກສິນຄ້າຈາກສາງ --</option>' + prods.map(p => `
      <option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">
        ${p.name} - ${p.model || p.sku} (${p.salePrice.toLocaleString()} ₭)
      </option>
    `).join('');
  },

  handleCopyQuotationToInvoice(docNumber) {
    if (!docNumber) return;
    const doc = window.db.getDocumentByNumber(docNumber) || window.db.getDocuments().find(d => d.docNumber === docNumber);
    if (!doc || !doc.items) return;

    window._invoiceItems = doc.items.map(it => {
      const qty = it.qty || it.quantity || 1;
      const unitPrice = it.unitPrice !== undefined ? it.unitPrice : (it.price || 0);
      return {
        name: it.name || it.productName || 'ສິນຄ້າ/ບໍລິການ',
        qty: qty,
        unitPrice: unitPrice,
        total: qty * unitPrice
      };
    });

    if (doc.customerId) {
      const custSelect = document.getElementById('inv-cust');
      if (custSelect) custSelect.value = doc.customerId;
    }

    if (doc.discount) {
      const discInput = document.getElementById('inv-discount');
      if (discInput) discInput.value = doc.discount;
    }

    if (doc.notes) {
      const notesInput = document.getElementById('inv-notes');
      if (notesInput) notesInput.value = doc.notes;
    }

    this.updateInvoiceItemsUI();
  },

  handlePickFromStockToInvoice(prodId) {
    if (!prodId) return;
    const p = window.db.getProductById(prodId);
    if (!p) return;

    window._pickedInvoiceProductId = p.id;
    const inStockSerials = window.db.getSerialsInStock ? window.db.getSerialsInStock(p.id) : [];
    const snText = inStockSerials.length > 0 ? ` (${inStockSerials[0].serialNumber})` : (p.serialNumber ? ` (${p.serialNumber})` : '');
    const modelText = p.model ? ` - ${p.model}` : '';
    const formattedName = `${p.name}${modelText}${snText}`;

    const nameInput = document.getElementById('inv-item-name');
    const priceInput = document.getElementById('inv-item-price');
    if (nameInput) nameInput.value = formattedName;
    if (priceInput) priceInput.value = p.salePrice;
  },

  addInvoiceItemRow() {
    const name = document.getElementById('inv-item-name')?.value?.trim();
    const qty = parseInt(document.getElementById('inv-item-qty')?.value || '1', 10);
    const price = parseFloat(document.getElementById('inv-item-price')?.value || '0');

    if (!name || price <= 0 || qty <= 0) return;

    const productId = window._pickedInvoiceProductId || null;
    window._invoiceItems = window._invoiceItems || [];
    window._invoiceItems.push({ productId, name, qty, unitPrice: price, total: qty * price });
    window._pickedInvoiceProductId = null;

    document.getElementById('inv-item-name').value = '';
    document.getElementById('inv-item-price').value = '';
    document.getElementById('inv-stock-picker').value = '';

    this.updateInvoiceItemsUI();
  },

  updateInvoiceItemsUI() {
    const tbody = document.getElementById('inv-items-tbody');
    const totalEl = document.getElementById('inv-grand-total');
    if (!tbody || !window._invoiceItems) return;

    let subtotal = 0;
    tbody.innerHTML = window._invoiceItems.map((it, i) => {
      subtotal += it.total;
      return `
        <tr class="border-b border-white/5">
          <td class="py-1">${it.name}</td>
          <td class="text-center py-1">${it.qty}</td>
          <td class="text-right py-1">${it.unitPrice.toLocaleString()}</td>
          <td class="text-right font-bold text-emerald-400 py-1">${it.total.toLocaleString()}</td>
          <td class="text-right"><button onclick="App.removeInvoiceItemRow(${i})" class="text-rose-400"><i class="fa-solid fa-xmark"></i></button></td>
        </tr>
      `;
    }).join('');

    const discount = parseFloat(document.getElementById('inv-discount')?.value || '0');
    const grandTotal = Math.max(0, subtotal - discount);
    if (totalEl) totalEl.textContent = grandTotal.toLocaleString() + ' ₭';
  },

  removeInvoiceItemRow(index) {
    if (window._invoiceItems) {
      window._invoiceItems.splice(index, 1);
      this.updateInvoiceItemsUI();
    }
  },

  // --------------------------------------------------------------------------
  // CREATE DELIVERY ORDER MODAL (ໃບສົ່ງເຄື່ອງ / ໃບມອບ-ຮັບສິນຄ້າ)
  // --------------------------------------------------------------------------
  openCreateDeliveryModal(fromQuotationDocNumber = null) {
    const customers = window.db.getCustomers();
    const quotations = window.db.getDocuments('quotation');

    const custOptions = customers.map(c => `<option value="${c.id}">${c.company ? `${c.company} (${c.name})` : c.name}</option>`).join('');
    const qtOptions = quotations.map(q => `<option value="${q.docNumber}" ${q.docNumber === fromQuotationDocNumber ? 'selected' : ''}>${q.docNumber} - ${q.customerName} (${(q.grandTotal || 0).toLocaleString()} ₭)</option>`).join('');
    const newDocNumber = 'DO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    window._deliveryItems = [];

    Swal.fire({
      title: 'ສ້າງໃບສົ່ງເຄື່ອງ (Delivery Order)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີໃບສົ່ງເຄື່ອງ</label>
              <input type="text" id="do-num" class="glass-input w-full font-mono font-bold text-purple-300" value="${newDocNumber}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີຈັດສົ່ງ</label>
              <input type="date" id="do-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>

          <!-- Pull from Quotation Selector -->
          <div class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-400/20">
            <label class="block mb-1 text-purple-300 font-bold"><i class="fa-solid fa-file-import mr-1"></i> ດຶງຂໍ້ມູນຈາກໃບສະເໜີລາຄາ (Quotation):</label>
            <select id="do-pull-qt" onchange="App.handleCopyQuotationToDelivery(this.value)" class="glass-input w-full">
              <option value="">-- ເລືອກໃບສະເໜີລາຄາເພື່ອດຶງຂໍ້ມູນສິນຄ້າອັດຕະໂນມັດ --</option>
              ${qtOptions}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ / ຜູ້ຮັບ *</label>
              <select id="do-cust" class="glass-input w-full" onchange="App.handleDeliveryCustomerSelect(this.value)">${custOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທຕິດຕໍ່</label>
              <input type="text" id="do-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ສະຖານທີ່ / ທີ່ຢູ່ຈັດສົ່ງ</label>
            <input type="text" id="do-address" class="glass-input w-full" placeholder="ບ້ານ, ເມືອງ, ແຂວງ ຫຼື ຈຸດໝາຍຈັດສົ່ງ">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ພະນັກງານຈັດສົ່ງ (Driver)</label>
              <input type="text" id="do-driver" class="glass-input w-full" placeholder="ຊື່ພະນັກງານຂົນສົ່ງ / ຊ່າງ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຍານພາຫະນະ / ທະບຽນລົດ</label>
              <input type="text" id="do-vehicle" class="glass-input w-full" placeholder="ເຊັ່ນ: ກຳແພງນະຄອນ ບກ 1234">
            </div>
          </div>

          <!-- Items Table & Adder -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="font-bold text-purple-300 flex items-center justify-between">
              <span><i class="fa-solid fa-boxes-packing mr-1"></i> ລາຍການສິນຄ້າ / ອຸປະກອນທີ່ຈັດສົ່ງ</span>
              <span id="do-items-count" class="text-[11px] opacity-75 font-normal">0 ລາຍການ</span>
            </div>

            <div class="grid grid-cols-12 gap-2">
              <input type="text" id="do-item-name" class="glass-input col-span-5" placeholder="ຊື່ສິນຄ້າ / ລາຍການ...">
              <input type="text" id="do-item-model" class="glass-input col-span-3" placeholder="Model / SN">
              <input type="number" id="do-item-qty" class="glass-input col-span-2 text-center" value="1" placeholder="ຈຳນວນ">
              <input type="text" id="do-item-unit" class="glass-input col-span-2 text-center" value="ອັນ" placeholder="ຫົວໜ່ວຍ">
            </div>
            <div class="flex items-center gap-2">
              <input type="text" id="do-item-remarks" class="glass-input flex-1" placeholder="ໝາຍເຫດ / ສະພາບສິນຄ້າ (ເຊັ່ນ: ສິນຄ້າໃໝ່ 100%, ຄົບກ່ອງ)">
              <button type="button" onclick="App.addDeliveryItemRow()" class="btn-glass-primary py-1 px-3 whitespace-nowrap text-purple-200">
                <i class="fa-solid fa-plus"></i> ເພີ່ມລົງ
              </button>
            </div>

            <!-- Items Table -->
            <div class="max-h-40 overflow-y-auto mt-2 border-t border-white/10 pt-2">
              <table class="w-full text-[11px]">
                <thead>
                  <tr class="opacity-60 text-left">
                    <th class="py-1">ລາຍການສິນຄ້າ</th>
                    <th class="py-1">Model/SN</th>
                    <th class="text-center py-1">ຈຳນວນ</th>
                    <th class="text-center py-1">ຫົວໜ່ວຍ</th>
                    <th class="py-1">ໝາຍເຫດ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="do-items-tbody"></tbody>
              </table>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ສະຖານະຈັດສົ່ງ</label>
              <select id="do-status" class="glass-input w-full font-bold">
                <option value="delivering">🚚 ກຳລັງຈັດສົ່ງ (In Transit)</option>
                <option value="delivered">✓ ສົ່ງຮອດແລ້ວ (Delivered)</option>
                <option value="cancelled">✗ ຍົກເລີກ (Cancelled)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold text-slate-200 flex items-center justify-between">
                <span>ໝາຍເຫດ ແລະ ເງື່ອນໄຂ (Notes & Terms)</span>
                <span class="text-[10px] text-purple-300 font-normal">ພິມ/ແກ້ໄຂເອງໄດ້</span>
              </label>
              <textarea id="do-notes" rows="2" class="glass-input w-full text-xs py-1.5 leading-relaxed" placeholder="ໝາຍເຫດ ແລະ ເງື່ອນໄຂການມອບ-ຮັບສິນຄ້າ...">ສິນຄ້າໄດ້ຮັບການກວດກາ ແລະ ສົ່ງມອບຄົບຖ້ວນຕາມລາຍການຂ້າງເທິງ.</textarea>
            </div>
          </div>
        </div>
      `,
      width: '680px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກໃບສົ່ງເຄື່ອງ',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'swal-glass' },
      didOpen: () => {
        if (fromQuotationDocNumber) {
          App.handleCopyQuotationToDelivery(fromQuotationDocNumber);
        } else {
          const custSelect = document.getElementById('do-cust');
          if (custSelect && custSelect.value) {
            App.handleDeliveryCustomerSelect(custSelect.value);
          }
        }
      },
      preConfirm: () => {
        const custId = document.getElementById('do-cust')?.value;
        const cust = customers.find(c => c.id === custId);
        if (!window._deliveryItems || window._deliveryItems.length === 0) {
          Swal.showValidationMessage('ກະລຸນາເພີ່ມລາຍການສິນຄ້າທີ່ຈັດສົ່ງຢ່າງໜ້ອຍ 1 ລາຍການ');
          return false;
        }

        const pullQtNum = document.getElementById('do-pull-qt')?.value;
        const linkedQt = pullQtNum ? quotations.find(q => q.docNumber === pullQtNum) : null;

        return {
          docType: 'delivery',
          docNumber: newDocNumber,
          refDocId: pullQtNum || null,
          customerId: custId,
          customerName: cust ? (cust.company || cust.name) : 'ລູກຄ້າ',
          date: document.getElementById('do-date')?.value || new Date().toISOString().split('T')[0],
          deliveryAddress: document.getElementById('do-address')?.value?.trim() || (cust ? cust.address : ''),
          phone: document.getElementById('do-phone')?.value?.trim() || (cust ? cust.phone : ''),
          driver: document.getElementById('do-driver')?.value?.trim() || '',
          vehicle: document.getElementById('do-vehicle')?.value?.trim() || '',
          status: document.getElementById('do-status')?.value || 'delivering',
          notes: document.getElementById('do-notes')?.value?.trim() || '',
          items: window._deliveryItems,
          grandTotal: linkedQt ? (linkedQt.grandTotal || 0) : 0,
          createdBy: App.currentUser ? App.currentUser.name : 'Admin'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const newDoc = window.db.addDocument(res.value);
        Swal.fire({
          title: 'ສ້າງໃບສົ່ງເຄື່ອງສຳເລັດ!',
          html: `
            <div class="text-xs space-y-2">
              <p>ເລກທີ: <strong class="text-purple-300 font-mono">${newDoc.docNumber}</strong></p>
              <p>ທ່ານສາມາດສັ່ງພິມໃບສົ່ງເຄື່ອງ A4 ໄດ້ທັນທີ:</p>
            </div>
          `,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: '<i class="fa-solid fa-print mr-1"></i> ພິມໃບສົ່ງເຄື່ອງ (A4)',
          cancelButtonText: 'ປິດ',
          confirmButtonColor: '#7c3aed',
          customClass: { popup: 'swal-glass' }
        }).then(res2 => {
          if (res2.isConfirmed) {
            ExportService.printDeliveryNote(newDoc.id);
          }
        });

        this.renderCurrentView();
      }
    });
  },

  handleDeliveryCustomerSelect(custId) {
    const cust = window.db.getCustomers().find(c => c.id === custId);
    if (!cust) return;
    const phoneInput = document.getElementById('do-phone');
    const addrInput = document.getElementById('do-address');
    if (phoneInput && !phoneInput.value) phoneInput.value = cust.phone || '';
    if (addrInput && !addrInput.value) addrInput.value = cust.address || '';
  },

  handleCopyQuotationToDelivery(docNumber) {
    if (!docNumber) return;
    const doc = window.db.getDocumentByNumber(docNumber) || window.db.getDocuments().find(d => d.docNumber === docNumber);
    if (!doc || !doc.items) return;

    window._deliveryItems = doc.items.map(it => ({
      name: it.name || it.productName || it.sku || 'ສິນຄ້າ',
      model: it.model || it.sku || '',
      sn: it.sn || it.serialNumber || '',
      qty: it.qty || it.quantity || 1,
      unit: it.unit || 'ອັນ/ຊຸດ',
      remarks: it.remarks || 'ສິນຄ້າໃໝ່ 100%'
    }));

    if (doc.customerId) {
      const custSelect = document.getElementById('do-cust');
      if (custSelect) custSelect.value = doc.customerId;
    }

    const cust = window.db.getCustomers().find(c => c.id === doc.customerId);
    const phoneInput = document.getElementById('do-phone');
    const addrInput = document.getElementById('do-address');
    if (phoneInput) phoneInput.value = doc.phone || (cust ? cust.phone : '');
    if (addrInput) addrInput.value = doc.deliveryAddress || (cust ? cust.address : '');
    if (doc.notes) {
      const notesInput = document.getElementById('do-notes');
      if (notesInput) notesInput.value = doc.notes;
    }

    this.updateDeliveryItemsUI();
  },

  addDeliveryItemRow() {
    const name = document.getElementById('do-item-name')?.value?.trim();
    const model = document.getElementById('do-item-model')?.value?.trim() || '';
    const qty = parseInt(document.getElementById('do-item-qty')?.value || '1');
    const unit = document.getElementById('do-item-unit')?.value?.trim() || 'ອັນ';
    const remarks = document.getElementById('do-item-remarks')?.value?.trim() || 'ສິນຄ້າໃໝ່ 100%';

    if (!name || qty <= 0) return;

    window._deliveryItems = window._deliveryItems || [];
    window._deliveryItems.push({ name, model, qty, unit, remarks });

    document.getElementById('do-item-name').value = '';
    document.getElementById('do-item-model').value = '';
    document.getElementById('do-item-qty').value = '1';
    document.getElementById('do-item-remarks').value = '';

    this.updateDeliveryItemsUI();
  },

  removeDeliveryItemRow(index) {
    if (window._deliveryItems) {
      window._deliveryItems.splice(index, 1);
      this.updateDeliveryItemsUI();
    }
  },

  updateDeliveryItemsUI() {
    const tbody = document.getElementById('do-items-tbody');
    const countEl = document.getElementById('do-items-count');
    if (!tbody || !window._deliveryItems) return;

    if (countEl) countEl.textContent = `${window._deliveryItems.length} ລາຍການ`;

    tbody.innerHTML = window._deliveryItems.map((it, i) => `
      <tr class="border-b border-white/5">
        <td class="py-1 font-bold text-slate-200">${it.name}</td>
        <td class="py-1 text-sky-300 font-mono text-[10px]">${it.model || '-'}</td>
        <td class="text-center py-1 font-bold">${it.qty}</td>
        <td class="text-center py-1 opacity-80">${it.unit || 'ອັນ'}</td>
        <td class="py-1 opacity-70 text-[10px]">${it.remarks || '-'}</td>
        <td class="text-right py-1">
          <button type="button" onclick="App.removeDeliveryItemRow(${i})" class="text-rose-400 hover:text-rose-300"><i class="fa-solid fa-xmark"></i></button>
        </td>
      </tr>
    `).join('');
  },

  // --------------------------------------------------------------------------
  // CREATE POS CASHIER MODAL (ບິນຂາຍໜ້າຮ້ານ - With Category Filter)
  // --------------------------------------------------------------------------
  openPOSModal() {
    this.openCreatePOSModal();
  },

  openCreatePOSModal() {
    const categories = window.db.getCategories();
    const products = window.db.getProducts();
    const newDocNumber = 'POS-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    window._posCart = [];

    Swal.fire({
      title: 'ບີນຂາຍໜ້າຮ້ານ (POS Checkout)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີໃບຮັບເງິນ POS</label>
              <input type="text" id="pos-num" class="glass-input w-full font-mono font-bold" value="${newDocNumber}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊື່ລູກຄ້າ</label>
              <input type="text" id="pos-cust-name" class="glass-input w-full" value="ລູກຄ້າທົ່ວໄປ">
            </div>
          </div>

          <!-- Fast Barcode / SN Scanner Input (ຍິງບາໂຄດໂດຍກົງ) -->
          <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 shadow-inner">
            <i class="fa-solid fa-barcode text-amber-400 text-lg shrink-0"></i>
            <input type="text" id="pos-barcode-scanner" 
                   onkeydown="App.handlePosBarcodeScanner(event)"
                   placeholder="⚡ ຍິງ Barcode / SN / SKU ຫຼື ພິມລະຫັດແລ້ວກົດ Enter..." 
                   class="glass-input w-full py-1.5 px-3 text-xs font-mono font-bold text-amber-300 placeholder:text-amber-300/50" autofocus>
            <button type="button" onclick="App.triggerBarcodeScanSubmit()" class="btn-glass-primary py-1.5 px-3 text-xs shrink-0 font-bold">
              <i class="fa-solid fa-plus"></i> ເພີ່ມ
            </button>
          </div>

          <!-- Fast Product Picker with Category Filter -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="font-bold text-amber-400 flex items-center justify-between">
              <span class="flex items-center gap-1.5"><i class="fa-solid fa-boxes-stacked"></i> ຫຼື ເລືອກສິນຄ້າຕາມໝວດ:</span>
              <span class="text-[11px] opacity-75 font-normal text-slate-300">ເລືອກໝວດກ່ອນເພື່ອກອງ</span>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label class="block text-[11px] font-bold text-amber-400 mb-0.5">1. ເລືອກໝວດສິນຄ້າ (ເພື່ອກອງ):</label>
                <select id="pos-cat-filter" onchange="App.handlePosCatFilter(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                  ${catOptions}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-sky-400 mb-0.5">2. ເລືອກສິນຄ້າ:</label>
                <select id="pos-product-select" class="glass-input w-full py-1 text-xs">
                  ${products.map(p => {
                    const st = window.db.getProductStock ? window.db.getProductStock(p.id) : 10;
                    return `
                      <option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">
                        ${p.sku} - ${p.name} | ຂາຍ: ${p.salePrice.toLocaleString()} ₭ [ເຫຼືອ: ${st} ${p.unit || 'ໜ່ວຍ'}]
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>
            </div>

            <div class="flex justify-end">
              <button type="button" onclick="App.addPosCartItem()" class="btn-glass-primary py-1.5 px-3">
                <i class="fa-solid fa-cart-plus mr-1"></i> ເພີ່ມລົງບິນ POS
              </button>
            </div>

            <!-- Cart Table -->
            <div class="max-h-40 overflow-y-auto mt-2 border-t border-white/10 pt-2">
              <table class="w-full text-[11px]">
                <thead><tr class="opacity-60 text-left"><th class="py-1">ສິນຄ້າ</th><th class="text-center py-1">ຈຳນວນ</th><th class="text-right py-1">ລາຄາ</th><th class="text-right py-1">ລວມ</th><th></th></tr></thead>
                <tbody id="pos-cart-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Total & Change Calculation -->
          <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <div>
              <label class="block mb-1 font-bold">ຈຳນວນເງິນທີ່ຮັບ (₭)</label>
              <input type="number" id="pos-cash-given" oninput="App.calculatePosChange()" class="glass-input w-full font-bold text-base text-emerald-400" placeholder="ໃສ່ຈຳນວນເງິນຮັບ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເງິນທອນ (₭)</label>
              <div id="pos-change-display" class="font-black text-lg text-rose-400 pt-1.5">0 ₭</div>
            </div>
          </div>

          <div class="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10 gap-3">
            <div class="flex items-center gap-2">
              <div>
                <label class="block text-[11px] font-bold opacity-75">ສະຖານະ</label>
                <select id="pos-status" class="glass-input py-1 text-xs font-bold">
                  <option value="paid">✓ ຊຳລະແລ້ວ (Paid)</option>
                  <option value="unpaid">⏳ ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold opacity-75">ຊ່ອງທາງຮັບເງິນ</label>
                <select id="pos-pay-method" class="glass-input py-1 text-xs font-bold">
                  <option value="transfer">💳 ເງີນໂອນ (Transfer)</option>
                  <option value="cash">💵 ເງິນສົດ (Cash)</option>
                </select>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs opacity-75">ຍອດເງິນທີ່ຕ້ອງຊຳລະ:</div>
              <div id="pos-total-display" class="font-black text-xl text-amber-400">0 ₭</div>
            </div>
          </div>

          <!-- POS Notes & Terms -->
          <div>
            <label class="block mb-1 font-bold text-slate-300 flex items-center justify-between text-xs">
              <span>ໝາຍເຫດ / ເງື່ອນໄຂທ້າຍບິນ (Notes & Terms)</span>
              <span class="text-[10px] text-amber-400 font-normal">ພິມ/ແກ້ໄຂເອງໄດ້</span>
            </label>
            <input type="text" id="pos-notes" class="glass-input w-full text-xs py-1.5" value="ສິນຄ້າຮັບປະກັນຕາມເງື່ອນໄຂຂອງຮ້ານ. ກະລຸນາເກັບໃບບິນໄວ້ເປັນຫຼັກຖານ" placeholder="ພິມໝາຍເຫດທ້າຍບິນ...">
          </div>
        </div>
      `,
      didOpen: () => {
        setTimeout(() => document.getElementById('pos-barcode-scanner')?.focus(), 100);
      },
      width: '640px',
      showCancelButton: true,
      confirmButtonText: '✓ ຢືນຢັນຂາຍ & ອອກບິນ POS',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        if (!window._posCart || window._posCart.length === 0) {
          Swal.showValidationMessage('ກະລຸນາເພີ່ມສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ');
          return false;
        }

        const total = window._posCart.reduce((acc, it) => acc + it.total, 0);
        const cashGiven = parseFloat(document.getElementById('pos-cash-given')?.value || total.toString());
        const docNumber = document.getElementById('pos-num')?.value;
        const customerName = document.getElementById('pos-cust-name')?.value || 'ລູກຄ້າທົ່ວໄປ';
        const method = document.getElementById('pos-pay-method')?.value || 'cash';
        const status = document.getElementById('pos-status')?.value || 'paid';
        const notes = document.getElementById('pos-notes')?.value?.trim() || '';

        return {
          docNumber,
          docType: 'pos',
          customerName,
          date: new Date().toISOString().split('T')[0],
          grandTotal: total,
          subtotal: total,
          cashReceived: cashGiven,
          change: Math.max(0, cashGiven - total),
          status,
          paymentMethod: method,
          items: window._posCart,
          notes,
          createdBy: App.currentUser ? App.currentUser.name : 'Cashier'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        const newDoc = window.db.addDocument(res.value);

        // Record income transaction automatically if paid
        if (res.value.status === 'paid') {
          window.db.addTransaction({
            date: res.value.date,
            type: 'income',
            category: 'pos_sale',
            amount: res.value.grandTotal,
            refDoc: res.value.docNumber,
            description: `ບິນຂາຍໜ້າຮ້ານ POS: ${res.value.docNumber}`,
            paymentMethod: res.value.paymentMethod
          });
        }

        // Deduct inventory stock for sold products (multi-qty & both SN and non-SN)
        res.value.items.forEach(it => {
          if (it.productId) {
            const qty = it.qty || 1;
            window.db.deductProductStock(it.productId, qty, res.value.docNumber);
          }
        });

        Swal.fire({
          title: 'ຂາຍສຳເລັດ!',
          html: `
            <div class="text-xs space-y-2 mb-3 text-left bg-white/5 p-3 rounded-xl border border-white/10">
              <p>ເລກທີບິນ POS: <strong class="text-amber-400 font-mono font-bold">${res.value.docNumber}</strong></p>
              <p>ລູກຄ້າ: <strong class="text-white">${res.value.customerName}</strong></p>
              <p>ຍອດລວມ: <strong class="text-emerald-400 text-sm font-black font-mono">${res.value.grandTotal.toLocaleString()} ₭</strong> | ເງິນທອນ: <strong class="text-rose-400 font-bold font-mono">${res.value.change.toLocaleString()} ₭</strong></p>
            </div>
            <p class="text-xs text-slate-300">ເລືອກຮູບແບບການພິມໃບບິນ:</p>
          `,
          icon: 'success',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: '<i class="fa-solid fa-receipt mr-1"></i> ພິມໃບບິນ Slip 80ມມ',
          denyButtonText: '<i class="fa-solid fa-print mr-1"></i> ພິມໃບຮັບເງິນ A4',
          cancelButtonText: 'ປິດໜ້າຕ່າງ',
          confirmButtonColor: '#f59e0b',
          denyButtonColor: '#0284c7',
          customClass: { popup: 'swal-glass' }
        }).then(res2 => {
          if (res2.isConfirmed) {
            ExportService.printPosThermalReceipt(newDoc.id, '80mm');
          } else if (res2.isDenied) {
            ExportService.printDocument(newDoc.id);
          }
        });

        this.renderCurrentView();
      }
    });
  },

  handlePosCatFilter(catId) {
    const sel = document.getElementById('pos-product-select');
    if (!sel) return;
    let prods = window.db.getProducts();
    if (catId) {
      prods = prods.filter(p => p.categoryId === catId);
    }
    sel.innerHTML = prods.map(p => {
      const st = window.db.getProductStock ? window.db.getProductStock(p.id) : 10;
      return `
        <option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">
          ${p.sku} - ${p.name} | ຂາຍ: ${p.salePrice.toLocaleString()} ₭ [ເຫຼືອ: ${st} ${p.unit || 'ໜ່ວຍ'}]
        </option>
      `;
    }).join('') || '<option value="">-- ບໍ່ມີສິນຄ້າໃນໝວດນີ້ --</option>';
  },

  handlePosBarcodeScanner(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.triggerBarcodeScanSubmit();
    }
  },

  triggerBarcodeScanSubmit() {
    const input = document.getElementById('pos-barcode-scanner');
    if (!input || !input.value.trim()) return;

    const raw = input.value.trim();
    const clean = raw.toLowerCase();

    // 1. Look up directly in products by SKU, model, or snOrMac
    let prod = window.db.getProducts().find(p => 
      (p.sku && p.sku.toLowerCase() === clean) ||
      (p.model && p.model.toLowerCase() === clean) ||
      (p.snOrMac && p.snOrMac.toLowerCase().includes(clean)) ||
      (p.name && p.name.toLowerCase() === clean)
    );

    // 2. If not found, look up in productSerials by serialNumber or macAddress
    if (!prod) {
      const serial = window.db.data.productSerials.find(s => 
        (s.serialNumber && s.serialNumber.toLowerCase() === clean) ||
        (s.macAddress && s.macAddress.toLowerCase() === clean)
      );
      if (serial) {
        prod = window.db.getProducts().find(p => p.id === serial.productId);
      }
    }

    if (prod) {
      const availableStock = window.db.getProductStock ? window.db.getProductStock(prod.id) : 10;
      if (availableStock <= 0) {
        Swal.showValidationMessage(`⚠️ ສິນຄ້າ "${prod.name}" ໝົດສະຕັອກໃນສາງແລ້ວ!`);
        setTimeout(() => Swal.resetValidationMessage(), 2500);
        input.select();
        return;
      }

      window._posCart = window._posCart || [];
      const exist = window._posCart.find(c => c.productId === prod.id);
      if (exist) {
        if (exist.qty >= availableStock) {
          Swal.showValidationMessage(`⚠️ ສິນຄ້າ "${prod.name}" ໃນສາງມີພຽງ ${availableStock} ໜ່ວຍ!`);
          setTimeout(() => Swal.resetValidationMessage(), 2500);
          input.select();
          return;
        }
        exist.qty += 1;
        exist.total = exist.qty * exist.unitPrice;
      } else {
        window._posCart.push({
          productId: prod.id,
          name: prod.name,
          qty: 1,
          unitPrice: prod.salePrice,
          total: prod.salePrice
        });
      }
      this.updatePosCartUI();

      // Clear input and keep focus for next scan
      input.value = '';
      input.focus();

      // Audio feedback (Web Audio beep)
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 1200;
        gain.gain.value = 0.08;
        osc.start();
        setTimeout(() => osc.stop(), 80);
      } catch (e) {}

      // Temporary visual flash on the cart
      const cartTbody = document.getElementById('pos-cart-tbody');
      if (cartTbody) {
        cartTbody.classList.add('bg-amber-500/10');
        setTimeout(() => cartTbody.classList.remove('bg-amber-500/10'), 250);
      }
    } else {
      Swal.showValidationMessage(`⚠️ ບໍ່ພົບສິນຄ້າທີ່ມີລະຫັດ ຫຼື Barcode: "${raw}"`);
      setTimeout(() => Swal.resetValidationMessage(), 2500);
      input.select();
    }
  },

  addPosCartItem() {
    const sel = document.getElementById('pos-product-select');
    if (!sel || !sel.value) return;

    const opt = sel.options[sel.selectedIndex];
    const productId = sel.value;
    const name = opt.getAttribute('data-name');
    const price = parseFloat(opt.getAttribute('data-price') || '0');

    const availableStock = window.db.getProductStock ? window.db.getProductStock(productId) : 10;
    if (availableStock <= 0) {
      Swal.showValidationMessage(`⚠️ ສິນຄ້າ "${name}" ໝົດສະຕັອກໃນສາງແລ້ວ!`);
      setTimeout(() => Swal.resetValidationMessage(), 2500);
      return;
    }

    window._posCart = window._posCart || [];
    const exist = window._posCart.find(c => c.productId === productId);
    if (exist) {
      if (exist.qty >= availableStock) {
        Swal.showValidationMessage(`⚠️ ສິນຄ້າ "${name}" ໃນສາງມີພຽງ ${availableStock} ໜ່ວຍ!`);
        setTimeout(() => Swal.resetValidationMessage(), 2500);
        return;
      }
      exist.qty += 1;
      exist.total = exist.qty * exist.unitPrice;
    } else {
      window._posCart.push({
        productId,
        name,
        qty: 1,
        unitPrice: price,
        total: price
      });
    }

    this.updatePosCartUI();
  },

  updatePosCartUI() {
    const tbody = document.getElementById('pos-cart-tbody');
    const totalDisplay = document.getElementById('pos-total-display');
    if (!tbody || !window._posCart) return;

    let subtotal = 0;
    tbody.innerHTML = window._posCart.map((it, i) => {
      subtotal += it.total;
      return `
        <tr class="border-b border-white/5">
          <td class="py-1 font-bold">${it.name}</td>
          <td class="text-center py-1">
            <button onclick="App.changePosQty(${i}, -1)" class="px-1 text-slate-400 hover:text-white">-</button>
            <span class="px-1.5 font-bold">${it.qty}</span>
            <button onclick="App.changePosQty(${i}, 1)" class="px-1 text-slate-400 hover:text-white">+</button>
          </td>
          <td class="text-right py-1">${it.unitPrice.toLocaleString()}</td>
          <td class="text-right font-bold text-amber-400 py-1">${it.total.toLocaleString()}</td>
          <td class="text-right"><button onclick="App.removePosCartItem(${i})" class="text-rose-400"><i class="fa-solid fa-xmark"></i></button></td>
        </tr>
      `;
    }).join('');

    if (totalDisplay) totalDisplay.textContent = subtotal.toLocaleString() + ' ₭';
    this.calculatePosChange();
  },

  changePosQty(idx, delta) {
    if (!window._posCart || !window._posCart[idx]) return;
    window._posCart[idx].qty += delta;
    if (window._posCart[idx].qty <= 0) {
      window._posCart.splice(idx, 1);
    } else {
      window._posCart[idx].total = window._posCart[idx].qty * window._posCart[idx].unitPrice;
    }
    this.updatePosCartUI();
  },

  removePosCartItem(idx) {
    if (window._posCart) {
      window._posCart.splice(idx, 1);
      this.updatePosCartUI();
    }
  },

  calculatePosChange() {
    const total = (window._posCart || []).reduce((acc, it) => acc + it.total, 0);
    const cash = parseFloat(document.getElementById('pos-cash-given')?.value || '0');
    const changeDisplay = document.getElementById('pos-change-display');
    const change = cash - total;
    if (changeDisplay) {
      if (change >= 0) {
        changeDisplay.textContent = change.toLocaleString() + ' ₭';
        changeDisplay.className = 'font-black text-lg text-emerald-400 pt-1.5';
      } else {
        changeDisplay.textContent = 'ຍັງຂາດ ' + Math.abs(change).toLocaleString() + ' ₭';
        changeDisplay.className = 'font-bold text-sm text-rose-400 pt-1.5';
      }
    }
  },

  // --------------------------------------------------------------------------
  // CREATE PURCHASE ORDER MODAL (ສ້າງໃບສັ່ງຊື້ສິນຄ້າ PO - Multi-Item)
  // --------------------------------------------------------------------------
  openCreatePOModal() {
    const suppliers = window.db.getSuppliers();
    const categories = window.db.getCategories();
    const products = window.db.getProducts();

    const supOptions = suppliers.map(s => `<option value="${s.id}">${s.name} (${s.contactPerson})</option>`).join('');
    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const newPoNumber = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    window._poItems = [];

    Swal.fire({
      title: 'ສ້າງໃບສັ່ງຊື້ສິນຄ້າ (Purchase Order - PO)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີໃບສັ່ງຊື້ (PO Number)</label>
              <input type="text" id="new-po-num" class="glass-input w-full font-mono font-bold" value="${newPoNumber}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີສັ່ງຊື້</label>
              <input type="date" id="new-po-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຜູ້ສະໜອງສິນຄ້າ (Supplier) *</label>
            <select id="new-po-sup" class="glass-input w-full">${supOptions}</select>
          </div>

          <!-- Multi-item PO Section with Category Filter -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
            <div class="font-bold text-indigo-400 flex items-center justify-between">
              <span><i class="fa-solid fa-cart-plus mr-1"></i> ເພີ່ມລາຍການສິນຄ້າສັ່ງຊື້</span>
              <span class="text-[11px] opacity-75 font-normal">ເລືອກໝວດກ່ອນເພື່ອຊອກຫາງ່າຍ</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-amber-400 mb-0.5">1. ເລືອກໝວດສິນຄ້າ:</label>
                <select id="new-po-cat" onchange="App.handlePOCatFilter(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                  ${catOptions}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-sky-400 mb-0.5">2. ເລືອກສິນຄ້າ:</label>
                <select id="new-po-prod" onchange="App.handlePOProductSelect(this.value)" class="glass-input w-full py-1 text-xs">
                  ${products.map(p => `<option value="${p.id}" data-sku="${p.sku}" data-name="${p.name}" data-cost="${p.costPrice}">${p.sku} - ${p.name}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 items-end">
              <div>
                <label class="block text-[11px] font-bold mb-0.5">ຈຳນວນ (Qty):</label>
                <input type="number" id="new-po-item-qty" class="glass-input w-full py-1 text-xs text-center font-bold" value="5" min="1">
              </div>
              <div>
                <label class="block text-[11px] font-bold mb-0.5">ຕົ້ນທຶນຕໍ່ໜ່ວຍ (₭):</label>
                <input type="number" id="new-po-item-cost" class="glass-input w-full py-1 text-xs text-right font-bold text-amber-400" value="${products[0]?.costPrice || 0}">
              </div>
              <div>
                <button type="button" onclick="App.addPOItemRow()" class="btn-glass-primary w-full py-1.5 px-2 text-xs">
                  <i class="fa-solid fa-plus"></i> ເພີ່ມລົງ PO
                </button>
              </div>
            </div>

            <!-- Table of Items in PO -->
            <div class="max-h-36 overflow-y-auto mt-2 border-t border-white/10 pt-2">
              <table class="w-full text-[11px]">
                <thead>
                  <tr class="opacity-60 text-left border-b border-white/10">
                    <th class="py-1">ສິນຄ້າ</th>
                    <th class="text-center py-1">ຈຳນວນ</th>
                    <th class="text-right py-1">ຕົ້ນທຶນ/ໜ່ວຍ</th>
                    <th class="text-right py-1">ລວມ</th>
                    <th class="w-6"></th>
                  </tr>
                </thead>
                <tbody id="new-po-items-tbody"></tbody>
              </table>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຄ່າຂົນສົ່ງ (Shipping ₭)</label>
              <input type="number" id="new-po-ship" class="glass-input w-full" value="0" oninput="App.calcPoGrandTotal()">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະ PO</label>
              <select id="new-po-status" class="glass-input w-full font-bold">
                <option value="ordered">ສັ່ງຊື້ແລ້ວ/ກຳລັງຂົນສົ່ງ</option>
                <option value="received">ໄດ້ຮັບເຄື່ອງແລ້ວ</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold text-slate-200 flex items-center justify-between">
              <span>ໝາຍເຫດ ແລະ ເງື່ອນໄຂການສັ່ງຊື້ (Terms & Notes)</span>
              <span class="text-[10px] text-indigo-400 font-normal">ສາມາດພິມ/ແກ້ໄຂເອງໄດ້</span>
            </label>
            <textarea id="new-po-notes" rows="2" class="glass-input w-full text-xs py-2 leading-relaxed" placeholder="ພິມໝາຍເຫດ ແລະ ເງື່ອນໄຂການສັ່ງຊື້...">ສິນຄ້າຕ້ອງຢູ່ໃນສະພາບໃໝ່ 100% ພ້ອມກ່ອງ ແລະ ອຸປະກອນຄົບຊຸດ, ຮັບປະກັນຕາມມາດຕະຖານ.</textarea>
          </div>

          <div class="flex justify-between items-center p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
            <span class="font-bold text-sm">ມູນຄ່າໃບສັ່ງຊື້ລວມ:</span>
            <span id="new-po-grand-total" class="font-black text-lg text-indigo-400">0 ₭</span>
          </div>
        </div>
      `,
      didOpen: () => {
        App.handlePOProductSelect(document.getElementById('new-po-prod')?.value);
        App.updatePOItemsUI();
      },
      width: '680px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກໃບສັ່ງຊື້ (PO)',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        if (!window._poItems || window._poItems.length === 0) {
          Swal.showValidationMessage('ກະລຸນາເພີ່ມສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການລົງໃນໃບສັ່ງຊື້');
          return false;
        }

        const supId = document.getElementById('new-po-sup')?.value;
        const sup = window.db.getSuppliers().find(s => s.id === supId);
        const shipping = parseFloat(document.getElementById('new-po-ship')?.value || '0');
        const itemsTotal = window._poItems.reduce((acc, it) => acc + it.total, 0);
        const grandTotal = itemsTotal + shipping;

        return {
          poNumber: document.getElementById('new-po-num')?.value,
          supplierId: supId,
          supplierName: sup ? sup.name : 'Supplier',
          orderDate: document.getElementById('new-po-date')?.value,
          expectedDate: new Date(Date.now() + 7*86400000).toISOString().split('T')[0],
          shippingCost: shipping,
          totalAmount: grandTotal,
          items: window._poItems,
          notes: document.getElementById('new-po-notes')?.value?.trim() || '',
          status: document.getElementById('new-po-status')?.value || 'ordered'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addPurchaseOrder(res.value);
        Swal.fire({
          title: 'ສ້າງໃບສັ່ງຊື້ສຳເລັດ!',
          html: `
            <div class="text-xs text-left space-y-2">
              <p>ເລກທີ PO: <strong class="text-indigo-400 font-mono">${res.value.poNumber}</strong> (${res.value.items.length} ລາຍການ)</p>
              <p class="text-emerald-300">✓ ເອກະສານໃບສັ່ງຊື້ໄດ້ຖືກບັນທຶກເກັບໄວ້ໃນລະບົບຮຽບຮ້ອຍແລ້ວ.</p>
            </div>
          `,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: '🖨️ ເບິ່ງໃບສັ່ງຊື້ / ພິມ PDF',
          cancelButtonText: 'ສຳເລັດ',
          customClass: { popup: 'swal-glass' }
        }).then(pRes => {
          if (pRes.isConfirmed) {
            ExportService.printPurchaseOrder(res.value.poNumber);
          }
          this.renderCurrentView();
        });
      }
    });
  },

  handlePOCatFilter(catId) {
    const sel = document.getElementById('new-po-prod');
    if (!sel) return;
    let prods = window.db.getProducts();
    if (catId) {
      prods = prods.filter(p => p.categoryId === catId);
    }
    sel.innerHTML = prods.map(p => `
      <option value="${p.id}" data-sku="${p.sku}" data-name="${p.name}" data-cost="${p.costPrice}">
        ${p.sku} - ${p.name}
      </option>
    `).join('') || '<option value="">-- ບໍ່ມີສິນຄ້າໃນໝວດນີ້ --</option>';

    if (prods.length > 0) {
      this.handlePOProductSelect(prods[0].id);
    }
  },

  handlePOProductSelect(prodId) {
    if (!prodId) return;
    const prod = window.db.getProductById(prodId);
    if (!prod) return;
    const costInput = document.getElementById('new-po-item-cost');
    if (costInput) costInput.value = prod.costPrice;
  },

  addPOItemRow() {
    const sel = document.getElementById('new-po-prod');
    if (!sel || !sel.value) return;

    const opt = sel.options[sel.selectedIndex];
    const productId = sel.value;
    const sku = opt.getAttribute('data-sku') || '';
    const name = opt.getAttribute('data-name') || '';
    const qty = parseInt(document.getElementById('new-po-item-qty')?.value || '1', 10);
    const unitCost = parseFloat(document.getElementById('new-po-item-cost')?.value || '0');

    if (qty <= 0 || unitCost <= 0) {
      Swal.showValidationMessage('ກະລຸນາໃສ່ຈຳນວນ ແລະ ຕົ້ນທຶນໃຫ້ຖືກຕ້ອງ');
      return;
    }

    window._poItems = window._poItems || [];
    const exist = window._poItems.find(it => it.productId === productId);
    if (exist) {
      exist.qty += qty;
      exist.unitCost = unitCost;
      exist.total = exist.qty * unitCost;
    } else {
      window._poItems.push({
        productId,
        sku,
        productName: name,
        name,
        qty,
        unitCost,
        unitPrice: unitCost,
        total: qty * unitCost
      });
    }

    this.updatePOItemsUI();
  },

  updatePOItemsUI() {
    const tbody = document.getElementById('new-po-items-tbody');
    if (!tbody) return;

    if (!window._poItems || window._poItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 opacity-50">ຍັງບໍ່ມີລາຍການສິນຄ້າ, ກະລຸນາກົດປຸ່ມເພີ່ມດ້ານເທິງ</td></tr>';
      this.calcPoGrandTotal();
      return;
    }

    tbody.innerHTML = window._poItems.map((it, i) => `
      <tr class="border-b border-white/5">
        <td class="py-1">
          <span class="badge-glass-cyan text-[10px] font-mono px-1 py-0.5 rounded mr-1">${it.sku || ''}</span>
          <span class="font-bold">${it.productName || it.name}</span>
        </td>
        <td class="text-center py-1 font-bold">${it.qty}</td>
        <td class="text-right py-1 text-amber-400 font-mono">${it.unitCost.toLocaleString()} ₭</td>
        <td class="text-right py-1 font-black text-indigo-400 font-mono">${it.total.toLocaleString()} ₭</td>
        <td class="text-right"><button type="button" onclick="App.removePOItemRow(${i})" class="text-rose-400 hover:text-rose-300 p-0.5"><i class="fa-solid fa-xmark"></i></button></td>
      </tr>
    `).join('');

    this.calcPoGrandTotal();
  },

  removePOItemRow(index) {
    if (window._poItems) {
      window._poItems.splice(index, 1);
      this.updatePOItemsUI();
    }
  },

  calcPoGrandTotal() {
    const itemsTotal = (window._poItems || []).reduce((acc, it) => acc + it.total, 0);
    const shipping = parseFloat(document.getElementById('new-po-ship')?.value || '0');
    const grand = itemsTotal + shipping;
    const totalEl = document.getElementById('new-po-grand-total');
    if (totalEl) totalEl.textContent = grand.toLocaleString() + ' ₭';
  },

  receivePO(poId) {
    const po = window.db.getPurchaseOrders().find(p => p.id === poId);
    if (!po) return;

    const items = (po.items && po.items.length > 0) 
      ? po.items 
      : [{ productId: po.productId, productName: po.productName || 'ສິນຄ້າ', qty: po.quantity || 1 }];

    const totalQty = items.reduce((acc, it) => acc + (it.qty || it.quantity || 1), 0);

    Swal.fire({
      title: 'ຢືນຢັນການຮັບສິນຄ້າເຂົ້າສາງ?',
      html: `
        <div class="text-xs text-left space-y-2">
          <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div class="flex justify-between"><span>ເລກທີ PO:</span> <strong class="font-mono text-sky-400">${po.poNumber}</strong></div>
            <div class="flex justify-between"><span>ຜູ້ສະໜອງ:</span> <strong>${po.supplierName}</strong></div>
            <div class="flex justify-between"><span>ຈຳນວນລາຍການ:</span> <strong>${items.length} ລາຍການ (ລວມ ${totalQty} ໜ່ວຍ)</strong></div>
            <div class="flex justify-between font-bold text-rose-400 pt-1 border-t border-white/10">
              <span>ມູນຄ່າລວມ (ຈະບັນທຶກເປັນລາຍຈ່າຍ):</span>
              <span>${(po.totalAmount || 0).toLocaleString()} ₭</span>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <i class="fa-solid fa-circle-check mr-1"></i> ລະບົບຈະເພີ່ມສິນຄ້າທັງໝົດ ${totalQty} ໜ່ວຍ ເຂົ້າສະຕອ໋ກອັດຕະໂນມັດ ແລະ ບັນທຶກລາຍຈ່າຍລົງບັນຊີໃຫ້ທັນທີ.
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✓ ຮັບເຂົ້າສາງ & ບັນທຶກລາຍຈ່າຍ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.updatePurchaseOrder(poId, { status: 'received' });
        
        const createdSerials = [];
        const now = new Date().toISOString().split('T')[0];

        // 1. Add Stock Serials or Update Non-SN Stock
        items.forEach(it => {
          const qty = it.qty || it.quantity || 1;
          const pId = it.productId;
          const p = window.db.getProductById(pId);
          if (p && !p.hasSn) {
            p.stock = (p.stock !== undefined ? p.stock : 10) + qty;
            window.db.notify();
          } else {
            for (let i = 1; i <= qty; i++) {
              const tempSn = (p ? (p.sku + '-') : 'SN-') + Math.floor(100000 + Math.random() * 900000);
              const snObj = window.db.addSerial({
                productId: pId,
                serialNumber: tempSn,
                macAddress: '',
                status: 'in_stock',
                supplierId: po.supplierId,
                purchaseOrderId: po.id,
                warrantyMonths: 12,
                location: 'ສາງໃຫຍ່',
                receivedDate: now,
                notes: `ຮັບອັດຕະໂນມັດຈາກ PO: ${po.poNumber}`
              });
              createdSerials.push({
                ...snObj,
                productName: it.productName || (p ? p.name : 'ສິນຄ້າ'),
                sku: p ? p.sku : ''
              });
            }
          }
        });

        // 2. Automatically Record as Expense Transaction (ນຳເປັນລາຍການລາຍຈ່າຍ)
        window.db.addTransaction({
          type: 'expense',
          category: 'stock_purchase',
          amount: po.totalAmount,
          date: now,
          refDoc: po.poNumber,
          description: `ຊຳລະຄ່າສັ່ງຊື້ສິນຄ້າເຂົ້າສາງຕາມໃບສັ່ງຊື້ ${po.poNumber} (${po.supplierName})`,
          paymentMethod: 'ເງີນໂອນ (Transfer)',
          recordedBy: App.currentUser ? App.currentUser.name : 'Admin'
        });

        // 3. Prompt to view PO document or edit SNs
        window._recentReceivedSerials = createdSerials;
        Swal.fire({
          title: 'ຮັບສິນຄ້າເຂົ້າສາງຮຽບຮ້ອຍ!',
          html: `
            <div class="text-xs text-left space-y-2.5">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <i class="fa-solid fa-circle-check mr-1"></i> ເພີ່ມສິນຄ້າເຂົ້າສາງແລ້ວ <strong>${createdSerials.length} ໜ່ວຍ</strong> ພ້ອມບັນທຶກລາຍຈ່າຍ <strong>${(po.totalAmount || 0).toLocaleString()} ₭</strong> ລົງບັນຊີແລ້ວ!
              </div>
              <p class="opacity-80">ລະບົບໄດ້ສ້າງ Serial Number ອັດຕະໂນມັດໃຫ້ແລ້ວ ທ່ານສາມາດກົດເບິ່ງໃບສັ່ງຊື້ ຫຼື ແກ້ໄຂ SN ໄດ້ທັນທີ:</p>
              <div class="flex gap-2 pt-2">
                <button onclick="ExportService.printPurchaseOrder('${po.id}')" class="btn-glass-secondary flex-1 py-1.5 text-xs text-indigo-300">
                  <i class="fa-solid fa-file-invoice mr-1"></i> 🖨️ ເບິ່ງໃບສັ່ງຊື້ (PO)
                </button>
                <button onclick="App.openBatchEditSerialsModal(window._recentReceivedSerials, '${po.poNumber}')" class="btn-glass-primary flex-1 py-1.5 text-xs">
                  <i class="fa-solid fa-pen mr-1"></i> ✏️ ແກ້ໄຂ SN / MAC
                </button>
              </div>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'ສຳເລັດ',
          customClass: { popup: 'swal-glass' }
        }).then(() => {
          App.renderCurrentView();
        });
      }
    });
  },

  openBatchEditSerialsModal(createdSerials, poNumber) {
    if (!createdSerials || createdSerials.length === 0) return;

    Swal.fire({
      title: `ແກ້ໄຂ SN / MAC ຈາກ ${poNumber}`,
      html: `
        <div class="text-left text-xs space-y-3">
          <p class="opacity-75">ກວດສອບ ແລະ ປ້ອນ Serial Number / MAC Address ທີ່ແທ້ຈິງຂອງແຕ່ລະໜ່ວຍ:</p>
          <div class="max-h-72 overflow-y-auto space-y-2 pr-1">
            ${createdSerials.map((s, idx) => `
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5" data-sn-id="${s.id}">
                <div class="font-bold text-sky-400 flex items-center justify-between">
                  <span>#${idx + 1} ${s.productName || s.sku || 'ສິນຄ້າ'}</span>
                  <span class="text-[10px] font-mono opacity-60">ID: ${s.id.slice(-6)}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[10px] opacity-75 mb-0.5">Serial Number (SN) *</label>
                    <input type="text" class="glass-input w-full py-1 text-xs font-mono sn-input" value="${s.serialNumber}">
                  </div>
                  <div>
                    <label class="block text-[10px] opacity-75 mb-0.5">MAC Address (ຖ້າມີ)</label>
                    <input type="text" class="glass-input w-full py-1 text-xs font-mono mac-input" value="${s.macAddress || ''}" placeholder="xx:xx:xx:xx:xx:xx">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ SN ທັງໝົດ',
      cancelButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const rows = document.querySelectorAll('[data-sn-id]');
        const updates = [];
        rows.forEach(r => {
          const id = r.getAttribute('data-sn-id');
          const sn = r.querySelector('.sn-input')?.value?.trim();
          const mac = r.querySelector('.mac-input')?.value?.trim();
          if (id && sn) {
            updates.push({ id, serialNumber: sn, macAddress: mac });
          }
        });
        return updates;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        res.value.forEach(u => {
          window.db.updateSerial(u.id, {
            serialNumber: u.serialNumber,
            macAddress: u.macAddress
          });
        });
        Swal.fire({
          title: 'ບັນທຶກ Serial Numbers ສຳເລັດ!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
        App.renderCurrentView();
      }
    });
  },

  // MULTI-ITEM QUOTATION WITH FREE-FORM CUSTOM TYPING & INVENTORY PICKER WITH CATEGORY FILTER
  openMultiItemQuotationModal() {
    const customers = window.db.getCustomers();
    const categories = window.db.getCategories();
    const products = window.db.getProducts();

    const custOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const newDocNumber = 'QT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    window._multiItems = [];

    Swal.fire({
      title: 'ສ້າງໃບສະເໜີລາຄາ (Quotation)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block mb-1 font-bold">ເລກທີໃບສະເໜີລາຄາ</label>
              <input type="text" id="mq-num" class="glass-input w-full font-mono font-bold" value="${newDocNumber}" readonly>
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີສ້າງ</label>
              <input type="date" id="mq-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະ</label>
              <select id="mq-status" class="glass-input w-full font-bold">
                <option value="sent">ສົ່ງແລ້ວ (Sent)</option>
                <option value="draft">ຮ່າງໄວ້ (Draft)</option>
                <option value="accepted">ລູກຄ້າເຊັນຮັບແລ້ວ (Accept)</option>
                <option value="rejected">ລູກຄ້າປະຕິເສດ (Reject)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ກຳນົດນຳໃຊ້ໄດ້ເຖິງ (Valid Until)</label>
              <input type="date" id="mq-due-date" class="glass-input w-full" value="${new Date(Date.now() + 30*86400000).toISOString().split('T')[0]}">
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="font-bold">ຂໍ້ມູນລູກຄ້າ</label>
                <button type="button" onclick="App.quickAddNewCustomerPrompt()" class="text-sky-400 hover:underline text-[11px]">+ ເພີ່ມລູກຄ້າໃໝ່</button>
              </div>
              <select id="mq-cust" class="glass-input w-full">${custOptions}</select>
            </div>
          </div>

          <!-- Add Item Form (Stock or Free text) -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div class="font-bold text-sky-400 flex justify-between items-center">
              <span>ເພີ່ມລາຍການສິນຄ້າ ຫຼື ພິມຊື່ບໍລິການເອງ</span>
              <span class="text-[11px] opacity-75 font-normal">ເລືອກໝວດສິນຄ້າກ່ອນເພື່ອຊອກຫາງ່າຍ</span>
            </div>

            <!-- Category filter + Stock Picker -->
            <div class="grid grid-cols-2 gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
              <div>
                <label class="block text-[11px] font-bold text-amber-400 mb-0.5">1. ເລືອກໝວດສິນຄ້າ (ເພື່ອກອງ):</label>
                <select id="mq-cat-filter" onchange="App.handleQuotationCatFilter(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ທຸກໝວດສິນຄ້າ --</option>
                  ${catOptions}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-sky-400 mb-0.5">2. ເລືອກສິນຄ້າຈາກສາງ:</label>
                <select id="mq-stock-picker" onchange="App.handlePickFromStockToQuotation(this.value)" class="glass-input w-full py-1 text-xs">
                  <option value="">-- ເລືອກສິນຄ້າ --</option>
                  ${products.map(p => `<option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">${p.name} - ${p.model || p.sku} (${p.salePrice.toLocaleString()} ₭)</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <input type="text" id="mq-item-name" class="glass-input col-span-2" placeholder="ພິມຊື່ສິນຄ້າ/ຄ່າແຮງງານຕິດຕັ້ງ...">
              <input type="number" id="mq-item-qty" class="glass-input text-center" value="1" placeholder="ຈຳນວນ">
              <input type="number" id="mq-item-price" class="glass-input text-right" placeholder="ລາຄາ (₭)">
            </div>
            <div class="flex justify-end items-center">
              <button type="button" onclick="App.addMultiItemRow()" class="btn-glass-primary py-1 px-3">
                <i class="fa-solid fa-plus"></i> ເພີ່ມລົງລາຍການ
              </button>
            </div>

            <!-- Items List -->
            <div class="max-h-36 overflow-y-auto mt-2 border-t border-white/10 pt-2">
              <table class="w-full text-[11px]">
                <thead><tr class="opacity-60 text-left"><th class="py-1">ລາຍການ</th><th class="text-center py-1">ຈຳນວນ</th><th class="text-right py-1">ລາຄາ</th><th class="text-right py-1">ລວມ</th><th></th></tr></thead>
                <tbody id="mq-items-tbody"></tbody>
              </table>
            </div>
          </div>

          <!-- Discount and Total Summary -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block mb-1 font-bold text-slate-300">ສ່ວນຫຼຸດ (Discount ₭):</label>
                <input type="number" id="mq-discount" oninput="App.updateMultiItemsUI()" class="glass-input w-full text-right font-bold text-rose-400" value="0" placeholder="0">
              </div>
              <div class="flex flex-col justify-end text-right">
                <span class="text-[11px] opacity-75">ຍອດລວມທັງໝົດ (Grand Total):</span>
                <span id="mq-grand-total" class="font-black text-lg text-sky-400">0 ₭</span>
              </div>
            </div>
          </div>

          <!-- Notes & Terms -->
          <div>
            <label class="block mb-1 font-bold text-slate-200 flex items-center justify-between">
              <span>ໝາຍເຫດ ແລະ ເງື່ອນໄຂ (Notes & Terms)</span>
              <span class="text-[10px] text-sky-400 font-normal">ສາມາດພິມ/ແກ້ໄຂເອງໄດ້</span>
            </label>
            <textarea id="mq-notes" rows="2" class="glass-input w-full text-xs py-2 leading-relaxed" placeholder="ພິມໝາຍເຫດ ແລະ ເງື່ອນໄຂໃບສະເໜີລາຄາ...">ສິນຄ້າຮັບປະກັນຕາມນະໂຍບາຍຂອງສູນ. ໃບສະເໜີລາຄານີ້ມີກຳນົດ 30 ວັນ.</textarea>
          </div>
        </div>
      `,
      width: '680px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ ແລະ ສ້າງໃບສະເໜີລາຄາ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        if (!window._multiItems || window._multiItems.length === 0) {
          Swal.showValidationMessage('ກະລຸນາເພີ່ມສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ');
          return false;
        }

        const custId = document.getElementById('mq-cust')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const subtotal = window._multiItems.reduce((acc, it) => acc + (it.qty * it.unitPrice), 0);
        const discount = parseFloat(document.getElementById('mq-discount')?.value || '0');
        const grandTotal = Math.max(0, subtotal - discount);

        return {
          docNumber: document.getElementById('mq-num')?.value,
          docType: 'quotation',
          customerId: custId,
          customerName: cust ? cust.name : 'ລູກຄ້າ',
          date: document.getElementById('mq-date')?.value,
          dueDate: document.getElementById('mq-due-date')?.value || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
          validUntil: document.getElementById('mq-due-date')?.value,
          status: document.getElementById('mq-status')?.value || 'sent',
          subtotal,
          discount,
          grandTotal,
          items: window._multiItems,
          notes: document.getElementById('mq-notes')?.value?.trim() || '',
          createdBy: App.currentUser ? App.currentUser.name : 'Admin'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addDocument(res.value);
        this.renderCurrentView();
      }
    });
  },

  handleQuotationCatFilter(catId) {
    const sel = document.getElementById('mq-stock-picker');
    if (!sel) return;
    let prods = window.db.getProducts();
    if (catId) {
      prods = prods.filter(p => p.categoryId === catId);
    }
    sel.innerHTML = '<option value="">-- ເລືອກສິນຄ້າ --</option>' + prods.map(p => `
      <option value="${p.id}" data-name="${p.name}" data-price="${p.salePrice}">
        ${p.name} - ${p.model || p.sku} (${p.salePrice.toLocaleString()} ₭)
      </option>
    `).join('');
  },

  handlePickFromStockToQuotation(prodId) {
    if (!prodId) return;
    const p = window.db.getProductById(prodId);
    if (!p) return;

    const inStockSerials = window.db.getSerialsInStock ? window.db.getSerialsInStock(p.id) : [];
    const snText = inStockSerials.length > 0 ? ` (${inStockSerials[0].serialNumber})` : (p.serialNumber ? ` (${p.serialNumber})` : '');
    const modelText = p.model ? ` - ${p.model}` : '';
    const formattedName = `${p.name}${modelText}${snText}`;

    const nameInput = document.getElementById('mq-item-name');
    const priceInput = document.getElementById('mq-item-price');
    if (nameInput) nameInput.value = formattedName;
    if (priceInput) priceInput.value = p.salePrice;
  },

  addMultiItemRow() {
    const name = document.getElementById('mq-item-name')?.value?.trim();
    const qty = parseInt(document.getElementById('mq-item-qty')?.value || '1', 10);
    const price = parseFloat(document.getElementById('mq-item-price')?.value || '0');

    if (!name || price <= 0 || qty <= 0) return;

    window._multiItems = window._multiItems || [];
    window._multiItems.push({ name, qty, unitPrice: price, total: qty * price });

    // Clear inputs
    document.getElementById('mq-item-name').value = '';
    document.getElementById('mq-item-price').value = '';
    document.getElementById('mq-stock-picker').value = '';

    this.updateMultiItemsUI();
  },

  updateMultiItemsUI() {
    const tbody = document.getElementById('mq-items-tbody');
    const totalEl = document.getElementById('mq-grand-total');
    if (!tbody || !window._multiItems) return;

    let subtotal = 0;
    tbody.innerHTML = window._multiItems.map((it, i) => {
      subtotal += it.total;
      return `
        <tr class="border-b border-white/5">
          <td class="py-1">${it.name}</td>
          <td class="text-center py-1">${it.qty}</td>
          <td class="text-right py-1">${it.unitPrice.toLocaleString()}</td>
          <td class="text-right font-bold text-sky-400 py-1">${it.total.toLocaleString()}</td>
          <td class="text-right"><button onclick="App.removeMultiItemRow(${i})" class="text-rose-400"><i class="fa-solid fa-xmark"></i></button></td>
        </tr>
      `;
    }).join('');

    const discount = parseFloat(document.getElementById('mq-discount')?.value || '0');
    const grandTotal = Math.max(0, subtotal - discount);
    if (totalEl) totalEl.textContent = grandTotal.toLocaleString() + ' ₭';
  },

  removeMultiItemRow(index) {
    if (window._multiItems) {
      window._multiItems.splice(index, 1);
      this.updateMultiItemsUI();
    }
  },

  openEditDocumentModal(docId) {
    const d = window.db.getDocumentById(docId);
    if (!d) return;

    let statusOptionsHtml = '';
    if (d.docType === 'quotation') {
      statusOptionsHtml = `
        <option value="draft" ${d.status === 'draft' ? 'selected' : ''}>ຮ່າງໄວ້ (Draft)</option>
        <option value="sent" ${d.status === 'sent' ? 'selected' : ''}>ສົ່ງແລ້ວ (Sent)</option>
        <option value="accepted" ${d.status === 'accepted' ? 'selected' : ''}>ລູກຄ້າເຊັນຮັບແລ້ວ (Accept)</option>
        <option value="rejected" ${d.status === 'rejected' ? 'selected' : ''}>ລູກຄ້າປະຕິເສດ (Reject)</option>
      `;
    } else if (d.docType === 'invoice') {
      statusOptionsHtml = `
        <option value="draft" ${d.status === 'draft' ? 'selected' : ''}>ຮ່າງໄວ້ (Draft)</option>
        <option value="unpaid" ${d.status === 'unpaid' || d.status === 'sent' || d.status === 'pending' ? 'selected' : ''}>ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</option>
        <option value="paid" ${d.status === 'paid' ? 'selected' : ''}>ຊຳລະແລ້ວ (Paid)</option>
      `;
    } else if (d.docType === 'delivery') {
      statusOptionsHtml = `
        <option value="delivering" ${d.status === 'delivering' ? 'selected' : ''}>🚚 ກຳລັງຈັດສົ່ງ (In Transit)</option>
        <option value="delivered" ${d.status === 'delivered' ? 'selected' : ''}>✓ ສົ່ງຮອດແລ້ວ (Delivered)</option>
        <option value="cancelled" ${d.status === 'cancelled' ? 'selected' : ''}>✗ ຍົກເລີກ (Cancelled)</option>
      `;
    } else if (d.docType === 'pos') {
      statusOptionsHtml = `
        <option value="paid" ${d.status === 'paid' ? 'selected' : ''}>ຊຳລະແລ້ວ (Paid)</option>
        <option value="unpaid" ${d.status === 'unpaid' ? 'selected' : ''}>ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</option>
      `;
    } else {
      statusOptionsHtml = `
        <option value="draft" ${d.status === 'draft' ? 'selected' : ''}>ຮ່າງໄວ້ (Draft)</option>
        <option value="sent" ${d.status === 'sent' ? 'selected' : ''}>ສົ່ງແລ້ວ (Sent)</option>
        <option value="paid" ${d.status === 'paid' ? 'selected' : ''}>ຊຳລະແລ້ວ (Paid)</option>
      `;
    }

    Swal.fire({
      title: `ແກ້ໄຂເອກະສານ: ${d.docNumber}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ລູກຄ້າ</label>
            <input type="text" id="edit-doc-cust" class="glass-input w-full font-bold" value="${d.customerName}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີ</label>
              <input type="date" id="edit-doc-date" class="glass-input w-full" value="${d.date}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະ</label>
              <select id="edit-doc-status" class="glass-input w-full">
                ${statusOptionsHtml}
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ຍອດລວມ (₭)</label>
            <input type="number" id="edit-doc-total" class="glass-input w-full font-bold text-sky-400" value="${d.grandTotal}">
          </div>
          <div>
            <label class="block mb-1 font-bold text-slate-200 flex items-center justify-between">
              <span>ໝາຍເຫດ ແລະ ເງື່ອນໄຂ (Notes & Terms)</span>
              <span class="text-[10px] text-sky-400 font-normal">ສາມາດພິມ/ແກ້ໄຂເອງໄດ້</span>
            </label>
            <textarea id="edit-doc-notes" rows="3" class="glass-input w-full text-xs py-2 leading-relaxed" placeholder="ພິມໝາຍເຫດ ແລະ ເງື່ອນໄຂເອກະສານ...">${d.notes || ''}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        customerName: document.getElementById('edit-doc-cust')?.value,
        date: document.getElementById('edit-doc-date')?.value,
        status: document.getElementById('edit-doc-status')?.value,
        grandTotal: parseFloat(document.getElementById('edit-doc-total')?.value || '0'),
        notes: document.getElementById('edit-doc-notes')?.value?.trim() || ''
      })
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateDocument(docId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteDocument(docId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບເອກະສານ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteDocument(docId);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // VIEW 6: ຂໍ້ມູນພະນັກງານ (EMPLOYEES) - WITH EMAIL, POSITION, ADDRESS, STATUS
  // --------------------------------------------------------------------------
  renderEmployees(container) {
    const employees = window.db.getEmployees();

    const statusBadges = {
      active: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ເຮັດວຽກປົກກະຕິ</span>',
      on_leave: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">ພັກວຽກ</span>',
      resigned: '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">ລາອອກແລ້ວ</span>'
    };

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-user-tie text-cyan-400"></i>
              ຂໍ້ມູນພະນັກງານ (Employees & Staff)
            </h1>
            <p class="text-xs opacity-75 mt-1">ບັນຊີຜູ້ໃຊ້, ຕຳແໜ່ງ, ອີເມວ, ວັນທີເຂົ້າເຮັດວຽກ, ທີ່ຢູ່ ແລະ ສະຖານະ</p>
          </div>
          ${this.canManage('employees') ? `
            <button onclick="App.openAddEmployeeModal()" class="btn-glass-primary text-xs">
              <i class="fa-solid fa-user-plus"></i> ເພີ່ມພະນັກງານໃໝ່
            </button>
          ` : `
            <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ (Read-Only)</span>
          `}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${employees.map(emp => `
            <div class="glass-panel glass-panel-hover p-5 flex flex-col justify-between">
              <div class="text-center">
                <img src="${emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" 
                     class="w-16 h-16 rounded-full mx-auto object-cover border-2 border-sky-400/50 mb-2 shadow-md">
                <h3 class="text-base font-bold">${emp.name}</h3>
                <div class="text-xs font-bold text-sky-400 mb-0.5">${emp.position || emp.roleName || emp.role}</div>
                <div class="mb-2">
                  <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${emp.role === 'admin' ? 'bg-purple-500/20 text-purple-300 font-bold' : (emp.role === 'technician' ? 'bg-teal-500/20 text-teal-300 font-bold' : 'bg-blue-500/20 text-blue-300 font-bold')}">
                    Role: ${emp.role}
                  </span>
                </div>
                <div>${statusBadges[emp.status] || emp.status}</div>

                <div class="text-xs opacity-80 text-left space-y-1 mt-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>👤 User: <strong class="font-mono text-sky-400">${emp.username}</strong></div>
                  <div>💼 ຕຳແໜ່ງ: <strong>${emp.position || '-'}</strong></div>
                  <div>✉️ Email: <strong>${emp.email || '-'}</strong></div>
                  <div>📞 ເບີໂທ: <strong>${emp.phone}</strong></div>
                  <div>📅 ເຂົ້າວຽກ: <strong>${emp.joinedDate || '-'}</strong></div>
                  <div class="line-clamp-1">📍 ທີ່ຢູ່: ${emp.address || '-'}</div>
                </div>
              </div>

              ${this.canManage('employees') ? `
                <div class="mt-3 pt-2 border-t border-white/10 flex justify-end gap-2">
                  <button onclick="App.openChangePasswordModal('${emp.id}')" class="btn-glass-secondary text-xs py-1 px-2.5 text-amber-300 hover:bg-amber-500/20" title="ປ່ຽນ / ຣີເຊັດລະຫັດຜ່ານ">
                    <i class="fa-solid fa-key"></i>
                  </button>
                  <button onclick="App.openEditEmployeeModal('${emp.id}')" class="btn-glass-secondary text-xs py-1 px-3">
                    <i class="fa-solid fa-pen"></i> ແກ້ໄຂ
                  </button>
                  <button onclick="App.deleteEmployee('${emp.id}')" class="btn-glass-danger text-xs py-1 px-2.5">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              ` : `
                <div class="mt-3 pt-2 border-t border-white/10 text-center text-[10px] opacity-60">
                  <i class="fa-solid fa-lock mr-1"></i> ສະເພາະ Admin/Officer
                </div>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  setEmpAvatarChoice(url) {
    const input = document.getElementById('emp-avatar-input') || document.getElementById('edit-emp-avatar');
    const preview = document.getElementById('emp-avatar-preview') || document.getElementById('edit-emp-avatar-preview');
    if (input) input.value = url;
    if (preview) preview.src = url;
  },

  handleAvatarFileUpload(fileInput, previewId, hiddenInputId) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'ໄຟລ໌ບໍ່ຖືກຕ້ອງ',
        text: 'ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (PNG, JPG, WEBP)',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const preview = document.getElementById(previewId);
      const hidden = document.getElementById(hiddenInputId);
      if (preview) preview.src = dataUrl;
      if (hidden) hidden.value = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  openAddEmployeeModal() {
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    Swal.fire({
      title: 'ເພີ່ມພະນັກງານໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- Avatar Upload & Preview -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບ Profile ພະນັກງານ (Upload ຮູບ ຫຼື ໃສ່ URL)</label>
            <div class="flex items-center gap-3">
              <img id="emp-avatar-preview" src="${defaultAvatar}" class="w-16 h-16 rounded-full object-cover border-2 border-sky-400 shrink-0 shadow-md">
              <div class="flex-1 space-y-2">
                <div>
                  <input type="file" id="emp-avatar-file" accept="image/*" 
                         onchange="App.handleAvatarFileUpload(this, 'emp-avatar-preview', 'emp-avatar-input')"
                         class="glass-input w-full py-1 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-500 file:text-white hover:file:bg-sky-600">
                  <span class="text-[10px] opacity-75 mt-0.5 block">📁 ຄລິກເລືອກຮູບຈາກເຄື່ອງ (Upload ບັນທຶກ Base64 ອັດຕະໂນມັດ)</span>
                </div>
                <input type="hidden" id="emp-avatar-input" value="${defaultAvatar}">
                <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span class="opacity-70">ຫຼື ເລືອກຮູບຕົວຢ່າງ:</span>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👩‍💼 ຜູ້ຈັດການ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👨‍🔧 ຊ່າງໄອທີ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">💼 ບັນຊີ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👨‍💻 ໄອທີ 2</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຊື່ ແລະ ນາມສະກຸນ *</label>
            <input type="text" id="emp-add-name" class="glass-input w-full" placeholder="ເຊັ່ນ: ທ້າວ ອາລຸນ ມະນີ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Username (ເຂົ້າສູ່ລະບົບ) *</label>
              <input type="text" id="emp-add-user" class="glass-input w-full font-mono" placeholder="aloun">
            </div>
            <div>
              <label class="block mb-1 font-bold">Password *</label>
              <input type="password" id="emp-add-pass" class="glass-input w-full" placeholder="123456">
            </div>
          </div>

          <!-- Position (Custom Text Input) & Role Selector -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຕຳແໜ່ງ (ພິມເອງ) *</label>
              <input type="text" id="emp-add-position" class="glass-input w-full" placeholder="ເຊັ່ນ: ຫົວໜ້າທີມ IT Support, ຜູ້ຊ່ວຍບັນຊີ" value="ຊ່າງເຕັກນິກໄອທີ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສິດການໃຊ້ງານ (Role) *</label>
              <select id="emp-add-role" class="glass-input w-full font-bold">
                <option value="admin">Admin - ສິດສູງສຸດ (ເຮັດໄດ້ທຸກຢ່າງ)</option>
                <option value="technician" selected>Technician - ຈັດການສະເພາະ Project & Service Job</option>
                <option value="officer">Officer - ຈັດການທຸກໜ້າ ຍົກເວັ້ນຕັ້ງຄ່າລະບົບ</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Email</label>
              <input type="email" id="emp-add-email" class="glass-input w-full" placeholder="aloun@netd-it.la">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="emp-add-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີເຂົ້າເຮັດວຽກ</label>
              <input type="date" id="emp-add-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະພະນັກງານ</label>
              <select id="emp-add-status" class="glass-input w-full">
                <option value="active">ເຮັດວຽກປົກກະຕິ (Active)</option>
                <option value="on_leave">ພັກວຽກ (On Leave)</option>
                <option value="resigned">ລາອອກ (Resigned)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ທີ່ຢູ່ປັດຈຸບັນ</label>
            <input type="text" id="emp-add-addr" class="glass-input w-full" placeholder="ບ້ານ, ເມືອງ, ແຂວງ">
          </div>
          <div>
            <label class="block mb-1 font-bold">ເງິນເດືອນພື້ນຖານ (₭)</label>
            <input type="number" id="emp-add-salary" class="glass-input w-full font-bold" value="6500000">
          </div>
        </div>
      `,
      width: '620px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກພະນັກງານ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('emp-add-name')?.value?.trim();
        const username = document.getElementById('emp-add-user')?.value?.trim();
        const password = document.getElementById('emp-add-pass')?.value;
        const role = document.getElementById('emp-add-role')?.value || 'technician';
        const position = document.getElementById('emp-add-position')?.value?.trim() || 'ພະນັກງານໄອທີ';

        if (!name || !username || !password) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່, Username ແລະ ລະຫັດຜ່ານ');
          return false;
        }

        const roleNames = {
          admin: 'Admin (ສິດສູງສຸດ)',
          technician: 'Technician (ຊ່າງໄອທີ)',
          officer: 'Officer (ພະນັກງານທົ່ວໄປ)'
        };

        return {
          name,
          username,
          password,
          position,
          email: document.getElementById('emp-add-email')?.value?.trim() || '',
          phone: document.getElementById('emp-add-phone')?.value?.trim() || '',
          role,
          roleName: `${roleNames[role] || role} - ${position}`,
          joinedDate: document.getElementById('emp-add-date')?.value,
          address: document.getElementById('emp-add-addr')?.value?.trim() || '',
          salary: parseFloat(document.getElementById('emp-add-salary')?.value || '0'),
          status: document.getElementById('emp-add-status')?.value || 'active',
          avatar: document.getElementById('emp-avatar-input')?.value || defaultAvatar
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addEmployee(res.value);
        this.renderCurrentView();
      }
    });
  },

  openEditEmployeeModal(empId) {
    const emp = window.db.getEmployees().find(e => e.id === empId);
    if (!emp) return;
    const currentAvatar = emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    const currentPosition = emp.position || emp.roleName || 'ພະນັກງານໄອທີ';
    const currentRole = emp.role || 'technician';

    Swal.fire({
      title: `ແກ້ໄຂພະນັກງານ: ${emp.name}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- Avatar Upload & Preview -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບ Profile ພະນັກງານ (Upload ຮູບ ຫຼື ເລືອກໃໝ່)</label>
            <div class="flex items-center gap-3">
              <img id="edit-emp-avatar-preview" src="${currentAvatar}" class="w-16 h-16 rounded-full object-cover border-2 border-sky-400 shrink-0 shadow-md">
              <div class="flex-1 space-y-2">
                <div>
                  <input type="file" id="edit-emp-avatar-file" accept="image/*" 
                         onchange="App.handleAvatarFileUpload(this, 'edit-emp-avatar-preview', 'edit-emp-avatar')"
                         class="glass-input w-full py-1 text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-500 file:text-white hover:file:bg-sky-600">
                  <span class="text-[10px] opacity-75 mt-0.5 block">📁 ອັບໂຫຼດຮູບໃໝ່ຈາກເຄື່ອງ (Upload Profile)</span>
                </div>
                <input type="hidden" id="edit-emp-avatar" value="${currentAvatar}">
                <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span class="opacity-70">ເລືອກຮູບໄວ:</span>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👩‍💼 ຜູ້ຈັດການ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👨‍🔧 ຊ່າງໄອທີ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">💼 ບັນຊີ</button>
                  <button type="button" onclick="App.setEmpAvatarChoice('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')" class="px-2 py-0.5 rounded bg-white/10 hover:bg-sky-500/20">👨‍💻 ໄອທີ 2</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຊື່ ແລະ ນາມສະກຸນ *</label>
            <input type="text" id="edit-emp-name" class="glass-input w-full" value="${emp.name}">
          </div>

          <!-- Position (Custom Text Input) & Role Selector -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຕຳແໜ່ງ (ພິມເອງ) *</label>
              <input type="text" id="edit-emp-position" class="glass-input w-full" value="${currentPosition}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສິດການໃຊ້ງານ (Role) *</label>
              <select id="edit-emp-role" class="glass-input w-full font-bold">
                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin - ສິດສູງສຸດ (ເຮັດໄດ້ທຸກຢ່າງ)</option>
                <option value="technician" ${currentRole === 'technician' ? 'selected' : ''}>Technician - ຈັດການສະເພາະ Project & Service Job</option>
                <option value="officer" ${currentRole === 'officer' ? 'selected' : ''}>Officer - ຈັດການທຸກໜ້າ ຍົກເວັ້ນຕັ້ງຄ່າລະບົບ</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Email</label>
              <input type="email" id="edit-emp-email" class="glass-input w-full" value="${emp.email || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ</label>
              <input type="text" id="edit-emp-phone" class="glass-input w-full" value="${emp.phone}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີເຂົ້າເຮັດວຽກ</label>
              <input type="date" id="edit-emp-date" class="glass-input w-full" value="${emp.joinedDate || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະ</label>
              <select id="edit-emp-status" class="glass-input w-full">
                <option value="active" ${emp.status === 'active' ? 'selected' : ''}>ເຮັດວຽກປົກກະຕິ</option>
                <option value="on_leave" ${emp.status === 'on_leave' ? 'selected' : ''}>ພັກວຽກ (On Leave)</option>
                <option value="resigned" ${emp.status === 'resigned' ? 'selected' : ''}>ລາອອກແລ້ວ (Resigned)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ທີ່ຢູ່ປັດຈຸບັນ</label>
            <input type="text" id="edit-emp-addr" class="glass-input w-full" value="${emp.address || ''}">
          </div>
          <div>
            <label class="block mb-1">ປ່ຽນລະຫັດຜ່ານ (ໃສ່ຖ້າຕ້ອງການປ່ຽນ)</label>
            <input type="password" id="edit-emp-pass" class="glass-input w-full" placeholder="ລະຫັດຜ່ານໃໝ່">
          </div>
        </div>
      `,
      width: '620px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const role = document.getElementById('edit-emp-role')?.value || currentRole;
        const position = document.getElementById('edit-emp-position')?.value?.trim() || currentPosition;
        const roleNames = {
          admin: 'Admin (ສິດສູງສຸດ)',
          technician: 'Technician (ຊ່າງໄອທີ)',
          officer: 'Officer (ພະນັກງານທົ່ວໄປ)'
        };

        const updated = {
          name: document.getElementById('edit-emp-name')?.value,
          role,
          position,
          roleName: `${roleNames[role] || role} - ${position}`,
          email: document.getElementById('edit-emp-email')?.value,
          phone: document.getElementById('edit-emp-phone')?.value,
          joinedDate: document.getElementById('edit-emp-date')?.value,
          status: document.getElementById('edit-emp-status')?.value,
          address: document.getElementById('edit-emp-addr')?.value,
          avatar: document.getElementById('edit-emp-avatar')?.value || currentAvatar
        };
        const pass = document.getElementById('edit-emp-pass')?.value;
        if (pass) updated.password = pass;
        return updated;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateEmployee(empId, res.value);
        this.renderCurrentView();
      }
    });
  },


  deleteEmployee(empId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບພະນັກງານ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteEmployee(empId);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // OTHER VIEWS (CUSTOMERS, TRANSACTIONS, SUPPLIERS, SYSTEMS, SETTINGS)
  // --------------------------------------------------------------------------
  renderCustomers(container) {
    const customers = window.db.getCustomers();
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-users text-blue-400"></i> ຂໍ້ມູນລູກຄ້າ
            </h1>
            <p class="text-xs opacity-75 mt-1">ລູກຄ້າອົງກອນ ແລະ ບຸກຄົນ, ຈັດການເພີ່ມ, ແກ້ໄຂ ແລະ ລຶບຂໍ້ມູນ</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="ExportService.exportCustomersToExcel()" class="btn-glass-secondary text-xs flex items-center gap-1.5" title="Export ລາຍຊື່ລູກຄ້າເປັນ Excel">
              <i class="fa-solid fa-file-excel text-emerald-400"></i> Export Excel
            </button>
            ${this.canManage('customers') ? `
              <button onclick="App.quickAddNewCustomerPrompt()" class="btn-glass-primary text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-user-plus"></i> ເພີ່ມລູກຄ້າໃໝ່
              </button>
            ` : `
              <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ</span>
            `}
          </div>
        </div>

        <div class="glass-panel p-4 overflow-x-auto">
          <table class="glass-table">
            <thead>
              <tr>
                <th style="width: 45px;" class="text-center">ລ/ດ</th>
                <th>ຊື່ລູກຄ້າ / ບໍລິສັດ</th>
                <th style="width: 140px;">ປະເພດ</th>
                <th>ເບີໂທ</th>
                <th>ທີ່ຢູ່</th>
                <th style="width: 130px;" class="text-right">ຍອດຊື້ສະສົມ</th>
                <th style="width: 120px;" class="text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map((c, i) => `
                <tr>
                  <td class="text-center opacity-60">${i + 1}</td>
                  <td>
                    <div class="font-bold">${c.name}</div>
                    <div class="text-[11px] opacity-70">${c.company || ''}</div>
                  </td>
                  <td><span class="badge-glass-cyan text-xs px-2 py-0.5 rounded">${c.type === 'corporate' ? 'ອົງກອນ' : 'ບຸກຄົນ'}</span></td>
                  <td>${c.phone}</td>
                  <td class="text-xs opacity-80">${c.address || '-'}</td>
                  <td class="text-right font-black text-emerald-400">${(c.totalSpent || 0).toLocaleString()} ₭</td>
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      ${this.canManage('customers') ? `
                        <button onclick="App.openEditCustomerModal('${c.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂຂໍ້ມູນ"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="App.deleteCustomer('${c.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບລູກຄ້າ"><i class="fa-solid fa-trash"></i></button>
                      ` : `
                        <span class="text-[10px] opacity-50"><i class="fa-solid fa-lock"></i></span>
                      `}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  toggleEditCustomerType(type) {
    const indDiv = document.getElementById('edit-cust-individual-fields');
    const corpDiv = document.getElementById('edit-cust-corporate-fields');
    if (!indDiv || !corpDiv) return;
    if (type === 'corporate') {
      indDiv.style.display = 'none';
      corpDiv.style.display = 'block';
    } else {
      indDiv.style.display = 'block';
      corpDiv.style.display = 'none';
    }
  },

  openEditCustomerModal(custId) {
    const c = window.db.getCustomers().find(cust => cust.id === custId);
    if (!c) return;
    const isCorp = c.type === 'corporate';

    Swal.fire({
      title: `ແກ້ໄຂຂໍ້ມູນລູກຄ້າ: ${c.name}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ປະເພດ</label>
            <select id="edit-cust-type" class="glass-input w-full" onchange="App.toggleEditCustomerType(this.value)">
              <option value="individual" ${!isCorp ? 'selected' : ''}>ບຸກຄົນທົ່ວໄປ</option>
              <option value="corporate" ${isCorp ? 'selected' : ''}>ອົງກອນ / ບໍລິສັດ</option>
            </select>
          </div>

          <!-- Individual fields (ບຸກຄົນທົ່ວໄປ: ຊື່ລູກຄ້າ, ເບີໂທລະສັບ, ທີ່ຢູ່) -->
          <div id="edit-cust-individual-fields" class="space-y-3" style="${isCorp ? 'display: none;' : ''}">
            <div>
              <label class="block mb-1 font-bold">ຊື່ລູກຄ້າ *</label>
              <input type="text" id="edit-cust-name" class="glass-input w-full font-bold" value="${c.name || ''}" placeholder="ຊື່ລູກຄ້າ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="edit-cust-phone-ind" class="glass-input w-full" value="${c.phone || ''}">
            </div>
            <div>
              <label class="block mb-1">ທີ່ຢູ່</label>
              <input type="text" id="edit-cust-addr-ind" class="glass-input w-full" value="${c.address || ''}">
            </div>
          </div>

          <!-- Corporate fields (ອົງກອນ/ບໍລິສັດ: ຊື່ອົງກອນ/ບໍລິສັດ, ຊື່ຜູ້ຕິດຕໍ່, ເບີໂທລະສັບ, ທີ່ຢູ່) -->
          <div id="edit-cust-corporate-fields" class="space-y-3" style="${!isCorp ? 'display: none;' : ''}">
            <div>
              <label class="block mb-1 font-bold">ຊື່ອົງກອນ / ບໍລິສັດ *</label>
              <input type="text" id="edit-cust-company" class="glass-input w-full font-bold" value="${c.company || c.name || ''}" placeholder="ຊື່ອົງກອນ / ບໍລິສັດ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊື່ຜູ້ຕິດຕໍ່</label>
              <input type="text" id="edit-cust-contact" class="glass-input w-full" value="${c.contactPerson || ''}" placeholder="ຊື່ຜູ້ຕິດຕໍ່">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="edit-cust-phone-corp" class="glass-input w-full" value="${c.phone || ''}">
            </div>
            <div>
              <label class="block mb-1">ທີ່ຢູ່</label>
              <input type="text" id="edit-cust-addr-corp" class="glass-input w-full" value="${c.address || ''}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກການແກ້ໄຂ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const type = document.getElementById('edit-cust-type')?.value;
        if (type === 'corporate') {
          const company = document.getElementById('edit-cust-company')?.value?.trim();
          const contact = document.getElementById('edit-cust-contact')?.value?.trim();
          const phone = document.getElementById('edit-cust-phone-corp')?.value?.trim();
          const addr = document.getElementById('edit-cust-addr-corp')?.value?.trim();
          if (!company || !phone) {
            Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ອົງກອນ/ບໍລິສັດ ແລະ ເບີໂທລະສັບ');
            return false;
          }
          return {
            type: 'corporate',
            name: company,
            company: company,
            contactPerson: contact,
            phone: phone,
            address: addr
          };
        } else {
          const name = document.getElementById('edit-cust-name')?.value?.trim();
          const phone = document.getElementById('edit-cust-phone-ind')?.value?.trim();
          const addr = document.getElementById('edit-cust-addr-ind')?.value?.trim();
          if (!name || !phone) {
            Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ລູກຄ້າ ແລະ ເບີໂທລະສັບ');
            return false;
          }
          return {
            type: 'individual',
            name: name,
            company: '',
            contactPerson: '',
            phone: phone,
            address: addr
          };
        }
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateCustomer(custId, res.value);
        Swal.fire({
          title: 'ແກ້ໄຂຂໍ້ມູນລູກຄ້າສຳເລັດ!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
        App.renderCurrentView();
      }
    });
  },

  deleteCustomer(id) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບລູກຄ້າ?',
      text: 'ຂໍ້ມູນລູກຄ້າຈະຖືກລຶບອອກຈາກລະບົບ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteCustomer(id);
        App.renderCurrentView();
      }
    });
  },

  toggleCustomerFormType(type) {
    const indDiv = document.getElementById('qc-individual-fields');
    const corpDiv = document.getElementById('qc-corporate-fields');
    if (!indDiv || !corpDiv) return;
    if (type === 'corporate') {
      indDiv.style.display = 'none';
      corpDiv.style.display = 'block';
    } else {
      indDiv.style.display = 'block';
      corpDiv.style.display = 'none';
    }
  },

  quickAddNewCustomerPrompt() {
    Swal.fire({
      title: 'ເພີ່ມຂໍ້ມູນລູກຄ້າໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ປະເພດ</label>
            <select id="qc-type" class="glass-input w-full" onchange="App.toggleCustomerFormType(this.value)">
              <option value="individual">ບຸກຄົນທົ່ວໄປ</option>
              <option value="corporate">ອົງກອນ / ບໍລິສັດ</option>
            </select>
          </div>

          <!-- Individual fields (ບຸກຄົນທົ່ວໄປ: ຊື່ລູກຄ້າ, ເບີໂທລະສັບ, ທີ່ຢູ່) -->
          <div id="qc-individual-fields" class="space-y-3">
            <div>
              <label class="block mb-1 font-bold">ຊື່ລູກຄ້າ *</label>
              <input type="text" id="qc-ind-name" class="glass-input w-full font-bold" placeholder="ເຊັ່ນ: ທ້າວ ສົມສັກ ວົງສາ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="qc-ind-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
            <div>
              <label class="block mb-1">ທີ່ຢູ່</label>
              <input type="text" id="qc-ind-addr" class="glass-input w-full" placeholder="ບ້ານ, ເມືອງ, ແຂວງ">
            </div>
          </div>

          <!-- Corporate fields (ອົງກອນ/ບໍລິສັດ: ຊື່ອົງກອນ/ບໍລິສັດ, ຊື່ຜູ້ຕິດຕໍ່, ເບີໂທລະສັບ, ທີ່ຢູ່) -->
          <div id="qc-corporate-fields" class="space-y-3" style="display: none;">
            <div>
              <label class="block mb-1 font-bold">ຊື່ອົງກອນ / ບໍລິສັດ *</label>
              <input type="text" id="qc-corp-company" class="glass-input w-full font-bold" placeholder="ເຊັ່ນ: ບໍລິສັດ ເນັດດີ ໄອທີ ຈຳກັດ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊື່ຜູ້ຕິດຕໍ່</label>
              <input type="text" id="qc-corp-contact" class="glass-input w-full" placeholder="ເຊັ່ນ: ທ່ານ ສົມພອນ (ຜູ້ຈັດການ)">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="qc-corp-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
            <div>
              <label class="block mb-1">ທີ່ຢູ່</label>
              <input type="text" id="qc-corp-addr" class="glass-input w-full" placeholder="ບ້ານ, ເມືອງ, ແຂວງ">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກລູກຄ້າ',
      cancelButtonText: 'Cancel',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const type = document.getElementById('qc-type')?.value;
        if (type === 'corporate') {
          const company = document.getElementById('qc-corp-company')?.value?.trim();
          const contact = document.getElementById('qc-corp-contact')?.value?.trim();
          const phone = document.getElementById('qc-corp-phone')?.value?.trim();
          const addr = document.getElementById('qc-corp-addr')?.value?.trim();
          if (!company || !phone) {
            Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ອົງກອນ/ບໍລິສັດ ແລະ ເບີໂທລະສັບ');
            return false;
          }
          return {
            type: 'corporate',
            name: company,
            company: company,
            contactPerson: contact,
            phone: phone,
            address: addr
          };
        } else {
          const name = document.getElementById('qc-ind-name')?.value?.trim();
          const phone = document.getElementById('qc-ind-phone')?.value?.trim();
          const addr = document.getElementById('qc-ind-addr')?.value?.trim();
          if (!name || !phone) {
            Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ລູກຄ້າ ແລະ ເບີໂທລະສັບ');
            return false;
          }
          return {
            type: 'individual',
            name: name,
            company: '',
            contactPerson: '',
            phone: phone,
            address: addr
          };
        }
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addCustomer(res.value);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // TRANSACTIONS VIEW (2 TABS: ລາຍຮັບ vs ລາຍຈ່າຍ, ແຍກຕາມເດືອນ)
  // --------------------------------------------------------------------------
  renderTransactions(container) {
    const allTxs = window.db.getTransactions();
    this.txTab = this.txTab || 'income'; // 'income' | 'expense'

    const laoMonthNames = [
      'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
      'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'
    ];

    // Calculate available months (current year 12 months + any other existing months)
    const currentYear = new Date().getFullYear();
    const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (this.txMonth === undefined) {
      this.txMonth = currentMonthStr;
    }

    const monthSet = new Set();
    for (let m = 1; m <= 12; m++) {
      monthSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }
    allTxs.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.slice(0, 7));
      }
    });
    const monthsList = Array.from(monthSet).sort().reverse();

    // Filter by selected month
    const monthTxs = allTxs.filter(t => !this.txMonth || (t.date && t.date.startsWith(this.txMonth)));
    const totalMonthIncome = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalMonthExpense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalMonthProfit = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + this.getTransactionProfit(t), 0);
    const netMonthBalance = totalMonthIncome - totalMonthExpense;

    // Filter by active tab (income or expense)
    let tabTxs = monthTxs.filter(t => t.type === this.txTab);
    if (this.txSearchQuery) {
      const q = this.txSearchQuery.trim().toLowerCase();
      tabTxs = tabTxs.filter(t => 
        (t.description || '').toLowerCase().includes(q) ||
        (t.refDoc || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.paymentMethod || '').toLowerCase().includes(q) ||
        (t.date || '').includes(q) ||
        String(t.amount || '').includes(q)
      );
    }

    // Format human-friendly month label for KPI cards
    let monthLabelText = 'ທັງໝົດ';
    if (this.txMonth) {
      const [yr, mo] = this.txMonth.split('-');
      const moNum = parseInt(mo, 10);
      const laoName = laoMonthNames[moNum - 1] || mo;
      monthLabelText = `ເດືອນ ${moNum} (${laoName} ${yr})`;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-wallet text-emerald-400"></i>
              ລາຍຮັບ-ລາຍຈ່າຍ (Income & Expenses)
            </h1>
            <p class="text-xs opacity-75 mt-1">ແຍກ Tab ລາຍຮັບ-ລາຍຈ່າຍ, ແຍກແຕ່ລະເດືອນ, ສະແດງກຳໄລແຕ່ລະບິນ ແລະ ສາມາດແກ້ໄຂ-ລຶບໄດ້</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="ExportService.exportTransactionsToExcel()" class="btn-glass-secondary text-xs flex items-center gap-1.5" title="Export ລາຍຮັບ-ລາຍຈ່າຍເປັນ Excel">
              <i class="fa-solid fa-file-excel text-emerald-400"></i> Export Excel
            </button>
            ${this.canManage('transactions') ? `
              <button onclick="App.openAddTransactionModal('income')" class="btn-glass-success text-xs">
                <i class="fa-solid fa-arrow-down-left mr-1"></i> + ບັນທຶກລາຍຮັບ
              </button>
              <button onclick="App.openAddTransactionModal('expense')" class="btn-glass-danger text-xs">
                <i class="fa-solid fa-arrow-up-right mr-1"></i> - ບັນທຶກລາຍຈ່າຍ
              </button>
            ` : `
              <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ</span>
            `}
          </div>
        </div>

        <!-- Monthly KPI Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Income Card -->
          <div class="glass-panel p-4 flex items-center justify-between border-emerald-500/30 bg-emerald-950/20">
            <div>
              <div class="text-xs opacity-75 mb-1 font-bold text-emerald-300">ຍອດລາຍຮັບ (${monthLabelText}):</div>
              <div class="text-xl font-black text-emerald-400 font-mono">+${totalMonthIncome.toLocaleString()} ₭</div>
              <div class="text-[11px] text-teal-300 font-semibold mt-0.5">ກຳໄລລວມ: +${totalMonthProfit.toLocaleString()} ₭</div>
            </div>
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">
              <i class="fa-solid fa-arrow-down-left"></i>
            </div>
          </div>

          <!-- Total Expense Card -->
          <div class="glass-panel p-4 flex items-center justify-between border-rose-500/30 bg-rose-950/20">
            <div>
              <div class="text-xs opacity-75 mb-1 font-bold text-rose-300">ຍອດລາຍຈ່າຍ (${monthLabelText}):</div>
              <div class="text-xl font-black text-rose-400 font-mono">-${totalMonthExpense.toLocaleString()} ₭</div>
            </div>
            <div class="w-11 h-11 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 text-lg">
              <i class="fa-solid fa-arrow-up-right"></i>
            </div>
          </div>

          <!-- Net Profit / Balance Card -->
          <div class="glass-panel p-4 flex items-center justify-between border-sky-500/30 bg-sky-950/20">
            <div>
              <div class="text-xs opacity-75 mb-1 font-bold text-sky-300">ກຳໄລສຸດທິ (Net Balance):</div>
              <div class="text-xl font-black ${netMonthBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-mono">
                ${netMonthBalance >= 0 ? '+' : ''}${netMonthBalance.toLocaleString()} ₭
              </div>
            </div>
            <div class="w-11 h-11 rounded-2xl ${netMonthBalance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} flex items-center justify-center text-lg">
              <i class="fa-solid fa-scale-balanced"></i>
            </div>
          </div>
        </div>

        <!-- Controls: Tabs + Quick Month Pills + Month Filter + Search -->
        <div class="glass-panel p-4 space-y-3">
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <!-- 2 Tabs: Income vs Expense -->
            <div class="flex items-center gap-2">
              <button onclick="App.setTxTab('income')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${this.txTab === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 opacity-70 hover:opacity-100'}">
                <i class="fa-solid fa-circle-down"></i>
                <span>ລາຍຮັບ (Income)</span>
                <span class="bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-mono">${monthTxs.filter(t => t.type === 'income').length}</span>
              </button>
              <button onclick="App.setTxTab('expense')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${this.txTab === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 opacity-70 hover:opacity-100'}">
                <i class="fa-solid fa-circle-up"></i>
                <span>ລາຍຈ່າຍ (Expense)</span>
                <span class="bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-mono">${monthTxs.filter(t => t.type === 'expense').length}</span>
              </button>
            </div>

            <!-- Month Filter & Search -->
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="flex items-center gap-1.5">
                <label class="text-xs font-bold text-sky-400 shrink-0"><i class="fa-solid fa-calendar mr-1"></i>ແຍກເດືອນ:</label>
                <select onchange="App.setTxMonth(this.value)" class="glass-input py-1.5 px-3 text-xs font-bold">
                  <option value="" ${this.txMonth === '' ? 'selected' : ''}>-- ທຸກເດືອນ (All Months) --</option>
                  ${monthsList.map(m => {
                    const [yr, mo] = m.split('-');
                    const moNum = parseInt(mo, 10);
                    const laoName = laoMonthNames[moNum - 1] || m;
                    return `
                      <option value="${m}" ${this.txMonth === m ? 'selected' : ''}>
                        ${m === currentMonthStr ? '⭐ ' : ''}ເດືອນ ${moNum} (${laoName}) ${yr}
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>

              <!-- Search Bar -->
              <div class="relative w-full sm:w-64">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 opacity-60 text-xs"></i>
                <input type="text" placeholder="ຄົ້ນຫາລາຍລະອຽດ, ເລກທີບິນ..." 
                       value="${this.txSearchQuery || ''}" 
                       oninput="App.setTxSearch(this.value)" 
                       class="glass-input pl-8 pr-7 py-1.5 text-xs w-full">
                ${this.txSearchQuery ? `
                  <button onclick="App.setTxSearch('')" class="absolute right-2.5 top-2 text-xs opacity-60 hover:opacity-100 text-slate-400">
                    <i class="fa-solid fa-circle-xmark"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="mt-4 overflow-x-auto">
            <table class="glass-table">
              <thead>
                <tr>
                  <th style="width: 45px;" class="text-center">ລ/ດ</th>
                  <th style="width: 125px;" class="whitespace-nowrap">ວັນທີ</th>
                  <th style="width: 120px;">ໝວດໝູ່</th>
                  <th>ລາຍລະອຽດ</th>
                  <th style="width: 135px;">ເລກທີອ້າງອີງ/ບິນ</th>
                  <th style="width: 125px;">ຊ່ອງທາງຊຳລະ</th>
                  <th style="width: 135px;" class="text-right">ຈຳນວນເງິນ</th>
                  ${this.txTab === 'income' ? '<th style="width: 135px;" class="text-right text-emerald-400">ກຳໄລ (Profit)</th>' : ''}
                  <th style="width: 100px;" class="text-right pr-4">ຈັດການ</th>
                </tr>
              </thead>
              <tbody>
                ${tabTxs.length > 0 ? tabTxs.map((t, i) => {
                  const profit = this.getTransactionProfit(t);
                  return `
                  <tr>
                    <td class="text-center opacity-60">${i + 1}</td>
                    <td class="font-mono text-xs whitespace-nowrap">${t.date || '-'}</td>
                    <td>
                      <span class="badge-glass-${t.type === 'income' ? 'emerald' : 'rose'} text-xs font-bold px-2 py-0.5 rounded">
                        ${this.formatTxCategory(t.category)}
                      </span>
                    </td>
                    <td class="font-bold">
                      <div>${t.description || '-'}</div>
                      ${t.notes ? `<div class="text-[11px] font-normal text-amber-300/80 mt-0.5"><i class="fa-solid fa-note-sticky mr-1"></i>${t.notes}</div>` : ''}
                    </td>
                    <td class="font-mono text-xs">
                      ${t.refDoc ? `
                        <button onclick="App.viewTransactionBill('${t.refDoc}')" 
                                class="badge-glass-cyan text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg hover:bg-sky-500/30 flex items-center gap-1.5 cursor-pointer text-sky-400 hover:text-white transition-all shadow-sm"
                                title="ກົດເພື່ອເບິ່ງໃບບິນ / ເອກະສານ">
                          <i class="fa-solid fa-file-invoice"></i>
                          <span>${t.refDoc}</span>
                        </button>
                      ` : '<span class="opacity-40">-</span>'}
                    </td>
                    <td class="text-xs">${t.paymentMethod || 'ເງີນໂອນ (Transfer)'}</td>
                    <td class="text-right font-black font-mono ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">
                      ${t.type === 'income' ? '+' : '-'}${Number(t.amount || 0).toLocaleString()} ₭
                    </td>
                    ${this.txTab === 'income' ? `
                      <td class="text-right font-black font-mono text-emerald-400">
                        +${profit.toLocaleString()} ₭
                      </td>
                    ` : ''}
                    <td class="text-right pr-3">
                      ${this.canManage('transactions') ? `
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="App.openEditTransactionModal('${t.id}')" class="p-1.5 text-sky-400 hover:text-sky-300 transition" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                          <button onclick="App.deleteTransaction('${t.id}')" class="p-1.5 text-rose-400 hover:text-rose-300 transition" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                        </div>
                      ` : `
                        <span class="text-[10px] opacity-50"><i class="fa-solid fa-lock"></i></span>
                      `}
                    </td>
                  </tr>
                `}).join('') : `
                  <tr>
                    <td colspan="${this.txTab === 'income' ? '9' : '8'}" class="text-center py-8 opacity-60">
                      <i class="fa-solid fa-inbox text-3xl mb-2 block opacity-40"></i>
                      ບໍ່ມີລາຍການ${this.txTab === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'} ໃນ ${this.txMonth ? monthLabelText : 'ລະບົບ'}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  getTransactionProfit(t) {
    if (t.type !== 'income') return 0;
    if (t.profit !== undefined && t.profit !== null && t.profit !== '') {
      return Number(t.profit);
    }

    if (t.refDoc) {
      const doc = (window.db.getDocumentByNumber && window.db.getDocumentByNumber(t.refDoc)) || 
                  (window.db.getDocuments && window.db.getDocuments().find(d => d.id === t.refDoc || d.docNumber === t.refDoc));
      if (doc && doc.items && doc.items.length > 0) {
        let totalCost = 0;
        let hasItemCost = false;
        doc.items.forEach(it => {
          const p = (it.productId && window.db.getProductById && window.db.getProductById(it.productId)) ||
                    (window.db.getProducts && window.db.getProducts().find(pr => pr.sku === it.sku || pr.name === it.name));
          if (p && p.costPrice !== undefined) {
            totalCost += Number(p.costPrice) * Number(it.qty || 1);
            hasItemCost = true;
          } else if (it.costPrice !== undefined) {
            totalCost += Number(it.costPrice) * Number(it.qty || 1);
            hasItemCost = true;
          }
        });
        if (hasItemCost) {
          return Math.max(0, (Number(doc.grandTotal) || Number(t.amount)) - totalCost);
        }
      }

      // Check if project
      const proj = window.db.getProjects && window.db.getProjects().find(p => p.code === t.refDoc || p.id === t.refDoc);
      if (proj) {
        if (proj.profit !== undefined) return Number(proj.profit);
        if (proj.contractValue && proj.budget) return Math.max(0, Number(proj.contractValue) - Number(proj.budget));
      }

      // Check if IT service job
      const itJob = window.db.getItJobs && window.db.getItJobs().find(j => j.jobCode === t.refDoc || j.id === t.refDoc);
      if (itJob) {
        return Number(itJob.serviceFee || t.amount);
      }
    }

    // If cost is specified on transaction:
    if (t.cost !== undefined && t.cost !== null) {
      return Math.max(0, Number(t.amount || 0) - Number(t.cost));
    }

    // Default: for service fee, pure service profit is typically the service fee amount
    if (t.category === 'service_fee' || t.category === 'project_income') {
      return Number(t.amount || 0);
    }

    // Or estimation based on 25% default margin
    return Math.round(Number(t.amount || 0) * 0.25);
  },

  openEditTransactionModal(id) {
    const t = window.db.getTransactions().find(tx => tx.id === id);
    if (!t) return;

    const isIncome = t.type === 'income';
    const currentProfit = this.getTransactionProfit(t);

    Swal.fire({
      title: isIncome ? 'ແກ້ໄຂລາຍການລາຍຮັບ' : 'ແກ້ໄຂລາຍການລາຍຈ່າຍ',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ລາຍການ / ລາຍລະອຽດ *</label>
            <input type="text" id="tx-edit-desc" class="glass-input w-full" value="${t.description || ''}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດໝູ່ *</label>
              <select id="tx-edit-cat" class="glass-input w-full">
                ${isIncome ? `
                  <option value="service_fee" ${t.category === 'service_fee' ? 'selected' : ''}>ຄ່າບໍລິການໄອທີ</option>
                  <option value="product_sale" ${t.category === 'product_sale' ? 'selected' : ''}>ຂາຍສິນຄ້າ / ອຸປະກອນ</option>
                  <option value="pos_sale" ${t.category === 'pos_sale' ? 'selected' : ''}>ບິນຂາຍໜ້າຮ້ານ (POS)</option>
                  <option value="project_income" ${t.category === 'project_income' ? 'selected' : ''}>ງວດເງິນໂຄງການ</option>
                  <option value="other" ${t.category === 'other' ? 'selected' : ''}>ລາຍຮັບອື່ນໆ</option>
                ` : `
                  <option value="stock_purchase" ${t.category === 'stock_purchase' ? 'selected' : ''}>ຊື້ສິນຄ້າເຂົ້າສາງ</option>
                  <option value="shipping_cost" ${t.category === 'shipping_cost' ? 'selected' : ''}>ຄ່າຂົນສົ່ງ</option>
                  <option value="salary" ${t.category === 'salary' ? 'selected' : ''}>ເງິນເດືອນ / ຄ່າແຮງງານ</option>
                  <option value="utility" ${t.category === 'utility' ? 'selected' : ''}>ຄ່ານ້ຳ, ໄຟ, ອິນເຕີເນັດ</option>
                  <option value="other" ${t.category === 'other' ? 'selected' : ''}>ລາຍຈ່າຍອື່ນໆ</option>
                `}
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຈຳນວນເງິນ (₭) *</label>
              <input type="number" id="tx-edit-amount" class="glass-input w-full font-bold text-amber-400" value="${t.amount || 0}">
            </div>
          </div>

          ${isIncome ? `
          <div>
            <label class="block mb-1 font-bold text-emerald-400">ກຳໄລຕາມບິນ (Profit ₭):</label>
            <input type="number" id="tx-edit-profit" class="glass-input w-full font-bold text-emerald-400" value="${currentProfit}">
            <div class="text-[10px] opacity-60 mt-0.5">ລະບົບຄຳນວນຈາກ ຍອດຂາຍ - ຕົ້ນທຶນສິນຄ້າ (ຫຼື ປັບປ່ຽນເອງຕາມຕົວຈິງ)</div>
          </div>` : ''}

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີ</label>
              <input type="date" id="tx-edit-date" class="glass-input w-full" value="${t.date || new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊ່ອງທາງການຊຳລະ</label>
              <select id="tx-edit-pay-method" class="glass-input w-full">
                <option value="ເງີນໂອນ (Transfer)" ${t.paymentMethod === 'ເງີນໂອນ (Transfer)' || t.paymentMethod === 'BCEL One QR' || t.paymentMethod === 'bcel_one' || t.paymentMethod === 'ໂອນຜ່ານທະນາຄານ' || t.paymentMethod === 'transfer' ? 'selected' : ''}>💳 ເງີນໂອນ (Transfer)</option>
                <option value="ເງິນສົດ (Cash)" ${t.paymentMethod === 'ເງິນສົດ (Cash)' || t.paymentMethod === 'cash' ? 'selected' : ''}>💵 ເງິນສົດ (Cash)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1">ເລກທີເອກະສານອ້າງອີງ (Ref Doc)</label>
            <input type="text" id="tx-edit-ref" class="glass-input w-full" value="${t.refDoc || ''}">
          </div>
          <div>
            <label class="block mb-1">ໝາຍເຫດ (Notes)</label>
            <input type="text" id="tx-edit-notes" class="glass-input w-full" value="${t.notes || ''}" placeholder="ໝາຍເຫດເພີ່ມເຕີມ (ຖ້າມີ)">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກການແກ້ໄຂ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const desc = document.getElementById('tx-edit-desc')?.value?.trim();
        const amount = parseFloat(document.getElementById('tx-edit-amount')?.value || '0');
        if (!desc || amount <= 0) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ລາຍລະອຽດ ແລະ ຈຳນວນເງິນ');
          return false;
        }

        const updated = {
          description: desc,
          category: document.getElementById('tx-edit-cat')?.value,
          amount,
          date: document.getElementById('tx-edit-date')?.value,
          paymentMethod: document.getElementById('tx-edit-pay-method')?.value,
          refDoc: document.getElementById('tx-edit-ref')?.value?.trim() || null,
          notes: document.getElementById('tx-edit-notes')?.value?.trim() || ''
        };

        if (isIncome) {
          const profitVal = document.getElementById('tx-edit-profit')?.value;
          if (profitVal !== undefined && profitVal !== '') {
            updated.profit = parseFloat(profitVal);
          }
        }

        return updated;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateTransaction(id, res.value);
        Swal.fire({
          title: 'ແກ້ໄຂສຳເລັດ!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
        App.renderCurrentView();
      }
    });
  },

  setTxTab(tab) {
    this.txTab = tab;
    this.renderCurrentView();
  },

  setTxMonth(month) {
    this.txMonth = month;
    this.renderCurrentView();
  },

  formatTxCategory(cat) {
    const map = {
      product_sale: 'ຂາຍສິນຄ້າ',
      pos_sale: 'ບິນຂາຍໜ້າຮ້ານ',
      service_fee: 'ຄ່າບໍລິການ',
      project_income: 'ລາຍຮັບໂຄງການ',
      stock_purchase: 'ສັ່ງຊື້ສິນຄ້າ',
      shipping_cost: 'ຄ່າຂົນສົ່ງ',
      salary: 'ເງິນເດືອນພະນັກງານ',
      utility: 'ຄ່ານ້ຳ-ຄ່າໄຟ',
      other: 'ອື່ນໆ'
    };
    return map[cat] || cat || 'ທົ່ວໄປ';
  },

  deleteTransaction(id) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບລາຍການບັນຊີ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteTransaction(id);
        App.renderCurrentView();
      }
    });
  },

  viewTransactionBill(refDoc) {
    if (!refDoc) return;
    const doc = window.db.getDocumentByNumber(refDoc);
    if (!doc) {
      const proj = window.db.getProjects().find(p => p.code === refDoc || p.id === refDoc);
      if (proj) {
        this.openProjectDetailsModal(proj.id);
        return;
      }

      Swal.fire({
        title: 'ບໍ່ພົບເອກະສານ',
        text: `ບໍ່ພົບຂໍ້ມູນເອກະສານ ຫຼື ໃບບິນເລກທີ "${refDoc}" ໃນລະບົບ`,
        icon: 'info',
        confirmButtonText: 'ຕົກລົງ',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    // Purchase Order Preview
    if (doc.docType === 'po' || doc.poNumber) {
      const items = doc.items || [];
      const itemsHtml = items.map((it, idx) => `
        <tr class="border-b border-white/5 text-xs">
          <td class="py-2 text-center opacity-60">${idx + 1}</td>
          <td class="py-2">
            <div class="font-bold">${it.productName || it.name || it.sku}</div>
            ${it.sku ? `<div class="text-[10px] opacity-60 font-mono">SKU: ${it.sku}</div>` : ''}
          </td>
          <td class="py-2 text-center font-bold">${it.qty || it.quantity || 1}</td>
          <td class="py-2 text-right font-mono">${Number(it.unitCost || it.unitPrice || 0).toLocaleString()} ₭</td>
          <td class="py-2 text-right font-bold font-mono text-indigo-400">${Number(it.total || ((it.qty || 1) * (it.unitCost || it.unitPrice || 0))).toLocaleString()} ₭</td>
        </tr>
      `).join('');

      Swal.fire({
        title: '',
        html: `
          <div class="text-left space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span class="badge-glass-cyan text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                  <i class="fa-solid fa-truck-ramp-box mr-1"></i> ${doc.poNumber || doc.docNumber}
                </span>
                <h3 class="text-lg font-black text-indigo-400 mt-1">ໃບສັ່ງຊື້ສິນຄ້າ (Purchase Order)</h3>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-bold ${doc.status === 'received' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}">
                ${doc.status === 'received' ? '✓ ຮັບສິນຄ້າແລ້ວ' : '⏳ ກຳລັງສັ່ງຊື້'}
              </span>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
              <div>
                <span class="opacity-70 block text-[11px]">ຜູ້ສະໜອງສິນຄ້າ (Supplier):</span>
                <strong class="text-sm font-bold text-sky-300">${doc.supplierName || '-'}</strong>
              </div>
              <div>
                <span class="opacity-70 block text-[11px]">ວັນທີສັ່ງຊື້:</span>
                <strong>${doc.orderDate || doc.date || '-'}</strong>
              </div>
              <div>
                <span class="opacity-70 block text-[11px]">ຄ່າຂົນສົ່ງ:</span>
                <strong>${Number(doc.shippingCost || 0).toLocaleString()} ₭</strong>
              </div>
              <div>
                <span class="opacity-70 block text-[11px]">ກຳນົດສົ່ງ:</span>
                <strong>${doc.expectedDate || doc.dueDate || '-'}</strong>
              </div>
            </div>

            <!-- Items -->
            <div>
              <div class="text-xs font-bold mb-1 opacity-80">ລາຍການສິນຄ້າໃນໃບສັ່ງຊື້:</div>
              <div class="max-h-48 overflow-y-auto border border-white/10 rounded-xl">
                <table class="w-full text-left">
                  <thead class="bg-white/5 text-[11px] opacity-75">
                    <tr>
                      <th class="p-2 text-center" style="width: 35px;">ລ/ດ</th>
                      <th class="p-2">ສິນຄ້າ</th>
                      <th class="p-2 text-center" style="width: 50px;">ຈຳນວນ</th>
                      <th class="p-2 text-right" style="width: 100px;">ຕົ້ນທຶນ</th>
                      <th class="p-2 text-right" style="width: 110px;">ລວມ</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
              </div>
            </div>

            <!-- Total -->
            <div class="flex justify-between items-center p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
              <span class="font-bold text-sm">ມູນຄ່າໃບສັ່ງຊື້ລວມ:</span>
              <span class="font-black text-xl text-indigo-400 font-mono">${Number(doc.totalAmount || doc.grandTotal || 0).toLocaleString()} ₭</span>
            </div>
            ${doc.notes ? `<div class="text-[11px] opacity-75 italic">ໝາຍເຫດ: ${doc.notes}</div>` : ''}
          </div>
        `,
        width: '640px',
        showCancelButton: true,
        confirmButtonText: '🖨️ ພິມ / ສົ່ງອອກ PDF',
        confirmButtonColor: '#4f46e5',
        cancelButtonText: 'ປິດ',
        customClass: { popup: 'swal-glass' }
      }).then(res => {
        if (res.isConfirmed) {
          ExportService.printPurchaseOrder(doc.id || doc.poNumber);
        }
      });
      return;
    }

    // Invoice, POS, or Quotation Preview
    const items = doc.items || [];
    const isInvoice = doc.docType === 'invoice';
    const isPos = doc.docType === 'pos';
    const docTitle = isInvoice ? 'ໃບເກັບເງິນ (Invoice)' : isPos ? 'ໃບຮັບເງິນໜ້າຮ້ານ (POS Receipt)' : 'ໃບສະເໜີລາຄາ (Quotation)';
    const colorClass = isInvoice ? 'text-emerald-400' : isPos ? 'text-amber-400' : 'text-sky-400';

    const itemsHtml = items.map((it, idx) => `
      <tr class="border-b border-white/5 text-xs">
        <td class="py-2 text-center opacity-60">${idx + 1}</td>
        <td class="py-2">
          <div class="font-bold">${it.name || it.sku}</div>
          ${it.sku ? `<div class="text-[10px] opacity-60 font-mono">SKU: ${it.sku}</div>` : ''}
        </td>
        <td class="py-2 text-center font-bold">${it.qty || 1}</td>
        <td class="py-2 text-right font-mono">${Number(it.unitPrice || 0).toLocaleString()} ₭</td>
        <td class="py-2 text-right font-bold font-mono ${colorClass}">${Number(it.total || ((it.qty || 1) * (it.unitPrice || 0))).toLocaleString()} ₭</td>
      </tr>
    `).join('');

    Swal.fire({
      title: '',
      html: `
        <div class="text-left space-y-4">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span class="badge-glass-cyan text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                <i class="fa-solid fa-file-invoice mr-1"></i> ${doc.docNumber}
              </span>
              <h3 class="text-lg font-black ${colorClass} mt-1">${docTitle}</h3>
            </div>
            ${(() => {
              if (doc.docType === 'quotation') {
                if (doc.status === 'accepted') return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ລູກຄ້າເຊັນຮັບແລ້ວ (Accept)</span>';
                if (doc.status === 'rejected') return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">✗ ລູກຄ້າປະຕິເສດ (Reject)</span>';
                if (doc.status === 'draft') return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">ຮ່າງໄວ້ (Draft)</span>';
                return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">ສົ່ງແລ້ວ (Sent)</span>';
              }
              if (doc.status === 'paid') return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ ຊຳລະແລ້ວ (Paid)</span>';
              if (doc.status === 'draft') return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">ຮ່າງໄວ້ (Draft)</span>';
              return '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">⏳ ຍັງບໍ່ໄດ້ຊຳລະ (Unpaid)</span>';
            })()}
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-2 gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
            <div>
              <span class="opacity-70 block text-[11px]">ຊື່ລູກຄ້າ:</span>
              <strong class="text-sm font-bold text-sky-300">${doc.customerName || '-'}</strong>
            </div>
            <div>
              <span class="opacity-70 block text-[11px]">ວັນທີອອກເອກະສານ:</span>
              <strong>${doc.date || '-'}</strong>
            </div>
            <div>
              <span class="opacity-70 block text-[11px]">ກຳນົດຊຳລະ:</span>
              <strong>${doc.dueDate || doc.date || '-'}</strong>
            </div>
            <div>
              <span class="opacity-70 block text-[11px]">ຜູ້ອອກເອກະສານ:</span>
              <strong>${doc.createdBy || 'Admin'}</strong>
            </div>
          </div>

          <!-- Items -->
          <div>
            <div class="text-xs font-bold mb-1 opacity-80">ລາຍການສິນຄ້າ / ບໍລິການ:</div>
            <div class="max-h-48 overflow-y-auto border border-white/10 rounded-xl">
              <table class="w-full text-left">
                <thead class="bg-white/5 text-[11px] opacity-75">
                  <tr>
                    <th class="p-2 text-center" style="width: 35px;">ລ/ດ</th>
                    <th class="p-2">ລາຍການ</th>
                    <th class="p-2 text-center" style="width: 50px;">ຈຳນວນ</th>
                    <th class="p-2 text-right" style="width: 100px;">ລາຄາ</th>
                    <th class="p-2 text-right" style="width: 110px;">ລວມ</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div class="flex justify-between opacity-80">
              <span>ຍອດລວມກ່ອນສ່ວນຫຼຸດ:</span>
              <span class="font-mono">${Number(doc.subtotal || doc.grandTotal || 0).toLocaleString()} ₭</span>
            </div>
            ${doc.discount ? `
              <div class="flex justify-between text-amber-400">
                <span>ສ່ວນຫຼຸດ:</span>
                <span class="font-mono">-${Number(doc.discount).toLocaleString()} ₭</span>
              </div>
            ` : ''}
            ${doc.taxAmount ? `
              <div class="flex justify-between opacity-80">
                <span>ອາກອນ/VAT:</span>
                <span class="font-mono">+${Number(doc.taxAmount).toLocaleString()} ₭</span>
              </div>
            ` : ''}
            <div class="flex justify-between items-center pt-2 border-t border-white/10">
              <span class="font-bold text-sm">ຍອດລວມທັງໝົດ:</span>
              <span class="font-black text-xl ${colorClass} font-mono">${Number(doc.grandTotal || 0).toLocaleString()} ₭</span>
            </div>
          </div>
          ${doc.notes ? `<div class="text-[11px] opacity-75 italic">ໝາຍເຫດ: ${doc.notes}</div>` : ''}
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      showDenyButton: isPos,
      confirmButtonText: isPos ? '<i class="fa-solid fa-receipt mr-1"></i> ພິມ Slip 80ມມ' : '🖨️ ພິມ / ສົ່ງອອກ PDF',
      confirmButtonColor: isPos ? '#f59e0b' : '#0284c7',
      denyButtonText: '<i class="fa-solid fa-print mr-1"></i> ພິມ A4',
      denyButtonColor: '#0284c7',
      cancelButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        if (isPos) {
          ExportService.printPosThermalReceipt(doc.id, '80mm');
        } else {
          ExportService.printDocument(doc.id);
        }
      } else if (res.isDenied) {
        ExportService.printDocument(doc.id);
      }
    });
  },

  openAddTransactionModal(type = 'income') {
    Swal.fire({
      title: type === 'income' ? 'ບັນທຶກລາຍຮັບ' : 'ບັນທຶກລາຍຈ່າຍ',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ລາຍການ *</label>
            <input type="text" id="tx-desc" class="glass-input w-full" placeholder="ລາຍລະອຽດການຮັບ / ຈ່າຍ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດໝູ່ *</label>
              <select id="tx-cat" class="glass-input w-full">
                ${type === 'income' ? `
                  <option value="service_fee">ຄ່າບໍລິການໄອທີ</option>
                  <option value="product_sale">ຂາຍສິນຄ້າ / ອຸປະກອນ</option>
                  <option value="project_income">ງວດເງິນໂຄງການ</option>
                  <option value="other">ລາຍຮັບອື່ນໆ</option>
                ` : `
                  <option value="stock_purchase">ຊື້ສິນຄ້າເຂົ້າສາງ</option>
                  <option value="shipping_cost">ຄ່າຂົນສົ່ງ</option>
                  <option value="salary">ເງິນເດືອນ / ຄ່າແຮງງານ</option>
                  <option value="utility">ຄ່ານ້ຳ, ໄຟ, ອິນເຕີເນັດ</option>
                  <option value="other">ລາຍຈ່າຍອື່ນໆ</option>
                `}
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ຈຳນວນເງິນ (₭) *</label>
              <input type="number" id="tx-amount" class="glass-input w-full font-bold text-amber-400" value="500000">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີ</label>
              <input type="date" id="tx-date" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຊ່ອງທາງການຊຳລະ</label>
              <select id="tx-pay-method" class="glass-input w-full">
                <option value="ເງີນໂອນ (Transfer)">💳 ເງີນໂອນ (Transfer)</option>
                <option value="ເງິນສົດ (Cash)">💵 ເງິນສົດ (Cash)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1">ເລກທີເອກະສານອ້າງອີງ (ຖ້າມີ)</label>
            <input type="text" id="tx-ref" class="glass-input w-full" placeholder="ເຊັ່ນ: INV-2026-001, PO-2026-002">
          </div>
          <div>
            <label class="block mb-1">ໝາຍເຫດ (Notes)</label>
            <input type="text" id="tx-notes" class="glass-input w-full" placeholder="ໝາຍເຫດເພີ່ມເຕີມ (ຖ້າມີ)">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const desc = document.getElementById('tx-desc')?.value?.trim();
        const amount = parseFloat(document.getElementById('tx-amount')?.value || '0');
        if (!desc || amount <= 0) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ລາຍລະອຽດ ແລະ ຈຳນວນເງິນ');
          return false;
        }
        return {
          type,
          category: document.getElementById('tx-cat')?.value,
          description: desc,
          amount,
          date: document.getElementById('tx-date')?.value,
          paymentMethod: document.getElementById('tx-pay-method')?.value,
          refDoc: document.getElementById('tx-ref')?.value?.trim() || null,
          notes: document.getElementById('tx-notes')?.value?.trim() || '',
          recordedBy: App.currentUser ? App.currentUser.name : 'Admin'
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addTransaction(res.value);
        Swal.fire({
          title: 'ບັນທຶກຮຽບຮ້ອຍ!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal-glass' }
        });
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // VIEW 7: ສີນຄ້າ ແລະ ຜູ້ສະໜອງ (2 TABS: ສິນຄ້າ/ແບຣນ & ຜູ້ສະໜອງ) - WITH IMAGE & CRUD
  // --------------------------------------------------------------------------
  renderSuppliers(container) {
    const brands = window.db.getBrands();
    const suppliers = window.db.getSuppliers();
    const currentTab = this.supplierTab || 'products';

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-handshake text-yellow-400"></i>
              ສີນຄ້າ ແລະ ຜູ້ສະໜອງ (Products & Suppliers)
            </h1>
            <p class="text-xs opacity-75 mt-1">ຄຸ້ມຄອງສິນຄ້າ, ໂລໂກ້ແບຣນ, ຕົວແທນຈຳໜ່າຍ ແລະ ຂໍ້ມູນຜູ້ສະໜອງ</p>
          </div>

          <!-- Top Action Buttons -->
          <div>
            ${this.canManage('suppliers') ? `
              ${currentTab === 'products' ? `
                <button onclick="App.openAddBrandModal()" class="btn-glass-primary text-xs">
                  <i class="fa-solid fa-plus-circle"></i> + ເພີ່ມສິນຄ້າ / ແບຣນໃໝ່
                </button>
              ` : `
                <button onclick="App.openAddSupplierModal()" class="btn-glass-primary text-xs">
                  <i class="fa-solid fa-user-plus"></i> + ເພີ່ມຜູ້ສະໜອງໃໝ່
                </button>
              `}
            ` : `
              <span class="badge-glass-cyan text-xs px-3 py-1.5 rounded-xl font-bold"><i class="fa-solid fa-eye mr-1"></i> ໂໝດອ່ານຢ່າງດຽວ</span>
            `}
          </div>
        </div>

        <!-- 2 Main Tabs -->
        <div class="glass-panel p-2 flex items-center gap-2 max-w-md">
          <button onclick="App.supplierTab = 'products'; App.renderCurrentView()" 
                  class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${currentTab === 'products' ? 'bg-sky-500 text-white shadow-md' : 'opacity-70 hover:opacity-100'}">
            <i class="fa-solid fa-boxes-stacked"></i> 1. ສິນຄ້າ ແລະ ແບຣນ (${brands.length})
          </button>
          <button onclick="App.supplierTab = 'suppliers'; App.renderCurrentView()" 
                  class="flex-1 py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${currentTab === 'suppliers' ? 'bg-amber-500 text-white shadow-md' : 'opacity-70 hover:opacity-100'}">
            <i class="fa-solid fa-truck-field"></i> 2. ຜູ້ສະໜອງສິນຄ້າ (${suppliers.length})
          </button>
        </div>

        ${currentTab === 'products' ? `
          <!-- TAB 1: ສິນຄ້າ ແລະ ແບຣນ (Products & Brands with Logo/Image) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${brands.map(b => {
              const logo = b.logoUrl || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200';
              return `
                <div class="glass-panel glass-panel-hover p-5 flex flex-col justify-between text-center relative group">
                  <div>
                    <!-- Product / Brand Image or Logo -->
                    <div class="w-20 h-20 mx-auto rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shadow-md mb-3 overflow-hidden">
                      <img src="${logo}" 
                           alt="${b.name}" 
                           class="max-h-full max-w-full object-contain"
                           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=0284c7&color=fff'">
                    </div>

                    <h3 class="font-extrabold text-base mb-0.5 truncate">${b.name}</h3>
                    <p class="text-xs text-sky-400 font-bold mb-2">${b.category || 'ອຸປະກອນໄອທີ'}</p>

                    <div class="text-xs opacity-80 space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/10 text-left">
                      <div>🤝 ຕົວແທນ: <span class="font-bold">${b.contact || 'Authorized Partner'}</span></div>
                      <div>🛡️ ການຮັບປະກັນ: <span class="text-amber-400 font-bold">${b.warranty || '12 ເດືອນ'}</span></div>
                    </div>
                  </div>

                  <div class="mt-4 pt-3 border-t border-white/10 flex justify-center gap-2">
                    ${this.canManage('suppliers') ? `
                      <button onclick="App.openEditBrandModal('${b.id}')" class="btn-glass-secondary text-xs py-1 px-3">
                        <i class="fa-solid fa-pen"></i> ແກ້ໄຂ
                      </button>
                      <button onclick="App.deleteBrand('${b.id}')" class="btn-glass-danger text-xs py-1 px-2.5">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    ` : `
                      <span class="text-[10px] opacity-60"><i class="fa-solid fa-lock mr-1"></i> Read-Only</span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- TAB 2: ຜູ້ສະໜອງ (Suppliers Table & Management) -->
          <div class="glass-panel p-4 overflow-x-auto">
            <table class="glass-table">
              <thead>
                <tr>
                  <th style="width: 45px;" class="text-center">ລ/ດ</th>
                  <th>ຊື່ບໍລິສັດຜູ້ສະໜອງ</th>
                  <th>ຜູ້ຕິດຕໍ່ (Contact Person)</th>
                  <th>ເບີໂທລະສັບ</th>
                  <th>ທີ່ຢູ່ / ສາງ</th>
                  <th>ສິນຄ້າທີ່ສະໜອງ</th>
                  <th style="width: 140px;" class="text-center">ຈັດການ</th>
                </tr>
              </thead>
              <tbody>
                ${suppliers.map((s, idx) => `
                  <tr>
                    <td class="text-center opacity-60">${idx + 1}</td>
                    <td>
                      <div class="font-bold text-sm text-sky-400">${s.name}</div>
                      <div class="text-[11px] opacity-75">${s.terms || 'Credit 30 ວັນ'}</div>
                    </td>
                    <td class="font-semibold">${s.contactPerson || '-'}</td>
                    <td class="font-mono">${s.phone}</td>
                    <td class="text-xs opacity-80">${s.address || '-'}</td>
                    <td>
                      <span class="badge-glass-cyan text-xs px-2 py-0.5 rounded font-bold">${s.productsSupplied || 'ອຸປະກອນໄອທີ'}</span>
                    </td>
                    <td class="text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        ${this.canManage('suppliers') ? `
                          <button onclick="App.openEditSupplierModal('${s.id}')" class="p-1.5 text-sky-400 hover:opacity-80" title="ແກ້ໄຂ"><i class="fa-solid fa-pen"></i></button>
                          <button onclick="App.deleteSupplier('${s.id}')" class="p-1.5 text-rose-400 hover:opacity-80" title="ລຶບ"><i class="fa-solid fa-trash"></i></button>
                        ` : `
                          <span class="text-[10px] opacity-50"><i class="fa-solid fa-lock"></i></span>
                        `}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // BRAND & PRODUCT MODALS (ADD, EDIT, DELETE)
  // --------------------------------------------------------------------------
  openAddBrandModal() {
    const defaultLogo = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200';

    Swal.fire({
      title: 'ເພີ່ມສິນຄ້າ / ແບຣນສິນຄ້າໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- Image/Logo URL & Live Preview -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບສິນຄ້າ ຫຼື ໂລໂກ້ແບຣນ (Image / Logo URL)</label>
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0">
                <img id="brand-logo-preview" src="${defaultLogo}" class="max-h-full max-w-full object-contain">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="brand-logo-input" class="glass-input w-full py-1 text-xs" 
                       value="${defaultLogo}" 
                       placeholder="ໃສ່ Link ຮູບ ຫຼື ໂລໂກ້"
                       oninput="document.getElementById('brand-logo-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="brand-logo-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'brand-logo-preview', 'brand-logo-input')">
                  <button type="button" onclick="document.getElementById('brand-logo-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-folder-open text-sky-400"></i> Browse ໂລໂກ້/ຮູບ...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ PNG, JPG, WebP</span>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span class="opacity-70">ໂລໂກ້ຕົວຢ່າງ:</span>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">UniFi</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Cisco</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Hikvision</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Dell</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຊື່ສິນຄ້າ ຫຼື ຊື່ແບຣນ *</label>
            <input type="text" id="brand-name" class="glass-input w-full" placeholder="ເຊັ່ນ: UniFi Cloud Gateway Ultra">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດໝູ່ສິນຄ້າ</label>
              <select id="brand-cat" class="glass-input w-full">
                <option value="Network & Wireless">Network & Wireless</option>
                <option value="CCTV & Security">CCTV & Security</option>
                <option value="Server & Storage">Server & Storage</option>
                <option value="POS Systems">POS Systems</option>
                <option value="Computer & Laptop">Computer & Laptop</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ໄລຍະເວລາຮັບປະກັນ</label>
              <input type="text" id="brand-warranty" class="glass-input w-full" value="ຮັບປະກັນ 24 ເດືອນ">
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຕົວແທນຈຳໜ່າຍ / ຜູ້ຕິດຕໍ່</label>
            <input type="text" id="brand-contact" class="glass-input w-full" placeholder="ເຊັ່ນ: UniFi Authorized Distributor Laos">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('brand-name')?.value?.trim();
        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ສິນຄ້າ ຫຼື ແບຣນ');
          return false;
        }

        return {
          name,
          logoUrl: document.getElementById('brand-logo-input')?.value || defaultLogo,
          category: document.getElementById('brand-cat')?.value,
          warranty: document.getElementById('brand-warranty')?.value,
          contact: document.getElementById('brand-contact')?.value
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addBrand(res.value);
        this.renderCurrentView();
      }
    });
  },

  setBrandLogoChoice(url) {
    const input = document.getElementById('brand-logo-input') || document.getElementById('edit-brand-logo');
    const preview = document.getElementById('brand-logo-preview') || document.getElementById('edit-brand-logo-preview');
    if (input) input.value = url;
    if (preview) preview.src = url;
  },

  openEditBrandModal(brandId) {
    const b = window.db.getBrands().find(br => br.id === brandId);
    if (!b) return;
    const currentLogo = b.logoUrl || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200';

    Swal.fire({
      title: `ແກ້ໄຂ: ${b.name}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <!-- Image/Logo URL & Live Preview -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400">ຮູບສິນຄ້າ ຫຼື ໂລໂກ້ແບຣນ</label>
            <div class="flex items-center gap-3">
              <div class="w-16 h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0">
                <img id="edit-brand-logo-preview" src="${currentLogo}" class="max-h-full max-w-full object-contain">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="edit-brand-logo" class="glass-input w-full py-1 text-xs" 
                       value="${currentLogo}" 
                       placeholder="ໃສ່ Link ຮູບ ຫຼື ໂລໂກ້"
                       oninput="document.getElementById('edit-brand-logo-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="edit-brand-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'edit-brand-logo-preview', 'edit-brand-logo')">
                  <button type="button" onclick="document.getElementById('edit-brand-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-folder-open text-sky-400"></i> Browse ໂລໂກ້/ຮູບ...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ PNG, JPG, WebP</span>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span class="opacity-70">ເລືອກຮູບໄວ:</span>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">UniFi</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Cisco</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Hikvision</button>
                  <button type="button" onclick="App.setBrandLogoChoice('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=200')" class="px-1.5 py-0.5 rounded bg-white/10">Dell</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຊື່ສິນຄ້າ / ແບຣນ *</label>
            <input type="text" id="edit-brand-name" class="glass-input w-full" value="${b.name}">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ໝວດໝູ່</label>
              <input type="text" id="edit-brand-cat" class="glass-input w-full" value="${b.category || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ການຮັບປະກັນ</label>
              <input type="text" id="edit-brand-warranty" class="glass-input w-full" value="${b.warranty || ''}">
            </div>
          </div>

          <div>
            <label class="block mb-1 font-bold">ຕົວແທນ / ຜູ້ຕິດຕໍ່</label>
            <input type="text" id="edit-brand-contact" class="glass-input w-full" value="${b.contact || ''}">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        name: document.getElementById('edit-brand-name')?.value?.trim(),
        logoUrl: document.getElementById('edit-brand-logo')?.value || currentLogo,
        category: document.getElementById('edit-brand-cat')?.value,
        warranty: document.getElementById('edit-brand-warranty')?.value,
        contact: document.getElementById('edit-brand-contact')?.value
      })
    }).then(res => {
      if (res.isConfirmed && res.value && res.value.name) {
        window.db.updateBrand(brandId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteBrand(brandId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteBrand(brandId);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // SUPPLIERS MODALS (ADD, EDIT, DELETE)
  // --------------------------------------------------------------------------
  openAddSupplierModal() {
    Swal.fire({
      title: 'ເພີ່ມຜູ້ສະໜອງສິນຄ້າໃໝ່ (New Supplier)',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ບໍລິສັດຜູ້ສະໜອງ *</label>
            <input type="text" id="sup-name" class="glass-input w-full" placeholder="ເຊັ່ນ: ບໍລິສັດ ເອັສໄອເອັສ ລາວ ຈຳກັດ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຊື່ຜູ້ຕິດຕໍ່ (Contact Person) *</label>
              <input type="text" id="sup-contact" class="glass-input w-full" placeholder="ເຊັ່ນ: ທ່ານ ສົມຈິດ ໄຊຍະສານ">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ *</label>
              <input type="text" id="sup-phone" class="glass-input w-full" placeholder="020 xxxx xxxx">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Email</label>
              <input type="email" id="sup-email" class="glass-input w-full" placeholder="sales@supplier.la">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເງື່ອນໄຂການຊຳລະ</label>
              <input type="text" id="sup-terms" class="glass-input w-full" value="Credit 30 ວັນ">
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ສິນຄ້າທີ່ສະໜອງ</label>
            <input type="text" id="sup-products" class="glass-input w-full" placeholder="ເຊັ່ນ: ອຸປະກອນ UniFi, MikroTik, ສາຍ LAN">
          </div>
          <div>
            <label class="block mb-1 font-bold">ທີ່ຢູ່ / ສາງສິນຄ້າ</label>
            <input type="text" id="sup-addr" class="glass-input w-full" placeholder="ບ້ານ, ເມືອງ, ແຂວງ">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກຜູ້ສະໜອງ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('sup-name')?.value?.trim();
        const contactPerson = document.getElementById('sup-contact')?.value?.trim();
        const phone = document.getElementById('sup-phone')?.value?.trim();

        if (!name || !contactPerson || !phone) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ບໍລິສັດ, ຜູ້ຕິດຕໍ່ ແລະ ເບີໂທລະສັບ');
          return false;
        }

        return {
          name,
          contactPerson,
          phone,
          email: document.getElementById('sup-email')?.value?.trim() || '',
          terms: document.getElementById('sup-terms')?.value?.trim() || '',
          productsSupplied: document.getElementById('sup-products')?.value?.trim() || 'ອຸປະກອນໄອທີ',
          address: document.getElementById('sup-addr')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addSupplier(res.value);
        this.renderCurrentView();
      }
    });
  },

  openEditSupplierModal(supId) {
    const s = window.db.getSuppliers().find(sp => sp.id === supId);
    if (!s) return;

    Swal.fire({
      title: `ແກ້ໄຂຜູ້ສະໜອງ: ${s.name}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ບໍລິສັດຜູ້ສະໜອງ</label>
            <input type="text" id="edit-sup-name" class="glass-input w-full" value="${s.name}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ຜູ້ຕິດຕໍ່</label>
              <input type="text" id="edit-sup-contact" class="glass-input w-full" value="${s.contactPerson || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ</label>
              <input type="text" id="edit-sup-phone" class="glass-input w-full" value="${s.phone}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Email</label>
              <input type="email" id="edit-sup-email" class="glass-input w-full" value="${s.email || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເງື່ອນໄຂການຊຳລະ</label>
              <input type="text" id="edit-sup-terms" class="glass-input w-full" value="${s.terms || ''}">
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">ສິນຄ້າທີ່ສະໜອງ</label>
            <input type="text" id="edit-sup-products" class="glass-input w-full" value="${s.productsSupplied || ''}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ທີ່ຢູ່</label>
            <input type="text" id="edit-sup-addr" class="glass-input w-full" value="${s.address || ''}">
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => ({
        name: document.getElementById('edit-sup-name')?.value?.trim(),
        contactPerson: document.getElementById('edit-sup-contact')?.value?.trim(),
        phone: document.getElementById('edit-sup-phone')?.value?.trim(),
        email: document.getElementById('edit-sup-email')?.value?.trim(),
        terms: document.getElementById('edit-sup-terms')?.value?.trim(),
        productsSupplied: document.getElementById('edit-sup-products')?.value?.trim(),
        address: document.getElementById('edit-sup-addr')?.value?.trim()
      })
    }).then(res => {
      if (res.isConfirmed && res.value && res.value.name) {
        window.db.updateSupplier(supId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteSupplier(supId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບຜູ້ສະໜອງ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteSupplier(supId);
        this.renderCurrentView();
      }
    });
  },


  // --------------------------------------------------------------------------
  // CLIENT SYSTEMS (ລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າ)
  // --------------------------------------------------------------------------
  renderClientSystems(container) {
    const systems = window.db.getClientSystems();
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-3">
              <i class="fa-solid fa-server text-indigo-400"></i>
              ລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າ (Client Systems)
            </h1>
            <p class="text-xs opacity-75 mt-1">ຄຸ້ມຄອງລະບົບ Web Apps, ERP, Mobile Apps, POS ແລະ Cloud Solutions ທີ່ພັດທະນາ ແລະ ຕິດຕັ້ງໃຫ້ລູກຄ້າ</p>
          </div>
          <button onclick="App.openAddClientSystemModal()" class="btn-glass-primary text-xs">
            <i class="fa-solid fa-plus-circle"></i> ເພີ່ມລະບົບລູກຄ້າໃໝ່
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${systems.length > 0 ? systems.map(s => `
            <div class="glass-panel p-5 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="badge-glass-cyan text-xs font-bold px-2 py-0.5 rounded">${s.slaType || 'SLA Standard'}</span>
                  <span class="text-xs font-bold ${s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}">
                    ● ${s.status === 'active' ? 'ເປີດໃຊ້ງານ' : (s.status === 'maintenance' ? 'ປັບປຸງ' : s.status)}
                  </span>
                </div>
                <h3 class="font-bold text-base mb-1">${s.systemName}</h3>
                <p class="text-xs text-sky-400 font-semibold mb-3">🏢 ລູກຄ້າ: ${s.customerName}</p>

                <!-- Sale / Contract Value -->
                <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3 flex justify-between items-center text-xs">
                  <span class="text-slate-300 font-medium">💰 ມູນຄ່າການຂາຍ:</span>
                  <span class="text-sm font-black text-emerald-400 font-mono">${(s.price || 0).toLocaleString()} ₭</span>
                </div>

                <div class="text-xs opacity-85 space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>🌐 Domain: <a href="${s.domainUrl}" target="_blank" class="text-sky-400 underline font-mono text-[11px]">${s.domainUrl || '-'}</a></div>
                  <div>☁️ Hosting: <span class="font-medium">${s.hostingProvider || '-'}</span></div>
                  <div>💻 Tech: <span class="opacity-75">${s.techStack || '-'}</span></div>
                  <div>📅 ວັນທີເລີ່ມ: <span>${s.launchDate || '-'}</span> | ໝົດອາຍຸ: <strong class="text-rose-400">${s.expiryDate || '-'}</strong></div>
                  ${s.notes ? `<div class="pt-1 border-t border-white/10 text-[11px] opacity-70">📝 ${s.notes}</div>` : ''}
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-white/10 flex justify-end gap-2">
                <button onclick="App.openEditClientSystemModal('${s.id}')" class="btn-glass-secondary text-xs py-1 px-3">
                  <i class="fa-solid fa-pen text-sky-400"></i> ແກ້ໄຂ
                </button>
                <button onclick="App.deleteClientSystem('${s.id}')" class="btn-glass-danger text-xs py-1 px-2.5">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('') : `
            <div class="col-span-full text-center py-12 glass-panel opacity-60">
              <i class="fa-solid fa-server text-4xl mb-2"></i>
              <p>ຍັງບໍ່ມີຂໍ້ມູນລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າ</p>
            </div>
          `}
        </div>
      </div>
    `;
  },

  openAddClientSystemModal() {
    const customers = window.db.getCustomers();
    const custOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    Swal.fire({
      title: 'ເພີ່ມລະບົບທີ່ພັດທະນາໃຫ້ລູກຄ້າໃໝ່',
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ລະບົບ / Application *</label>
            <input type="text" id="sys-name" class="glass-input w-full" placeholder="ເຊັ່ນ: ລະບົບ POS & ສາງສິນຄ້າອອນລາຍ">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ *</label>
              <select id="sys-cust" class="glass-input w-full">${custOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold text-emerald-400">ມູນຄ່າການຂາຍ / ສັນຍາ (₭) *</label>
              <input type="number" id="sys-price" class="glass-input w-full font-bold text-emerald-400" value="25000000">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Domain / URL ເວັບໄຊ</label>
              <input type="url" id="sys-domain" class="glass-input w-full font-mono" placeholder="https://app.customer.la">
            </div>
            <div>
              <label class="block mb-1 font-bold">Hosting / Cloud Provider</label>
              <input type="text" id="sys-hosting" class="glass-input w-full" placeholder="ເຊັ່ນ: Cloudflare Workers, AWS, VPS">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີເລີ່ມໃຊ້ງານ</label>
              <input type="date" id="sys-launch" class="glass-input w-full" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີໝົດສັນຍາ Support</label>
              <input type="date" id="sys-expiry" class="glass-input w-full" value="${new Date(Date.now() + 365*86400000).toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລະດັບ SLA Support</label>
              <select id="sys-sla" class="glass-input w-full">
                <option value="SLA Standard">SLA Standard (8x5)</option>
                <option value="SLA Gold 24/7">SLA Gold 24/7</option>
                <option value="SLA Platinum">SLA Platinum (Enterprise)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະລະບົບ</label>
              <select id="sys-status" class="glass-input w-full">
                <option value="active">Active (ເປີດໃຊ້ງານ)</option>
                <option value="maintenance">Maintenance (ປັບປຸງ)</option>
                <option value="suspended">Suspended (ພັກໃຊ້ງານ)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">Tech Stack ທີ່ໃຊ້</label>
            <input type="text" id="sys-tech" class="glass-input w-full" placeholder="ເຊັ່ນ: TailwindCSS, Cloudflare D1, Node.js">
          </div>
          <div>
            <label class="block mb-1 font-bold">ໝາຍເຫດ</label>
            <input type="text" id="sys-notes" class="glass-input w-full" placeholder="ລາຍລະອຽດສັນຍາ ຫຼື ຂໍ້ມູນເພີ່ມເຕີມ">
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກລະບົບ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('sys-name')?.value?.trim();
        const custId = document.getElementById('sys-cust')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const price = parseFloat(document.getElementById('sys-price')?.value || '0');

        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ລະບົບ');
          return false;
        }

        return {
          systemName: name,
          customerId: custId,
          customerName: cust ? cust.name : 'ລູກຄ້າ',
          price,
          domainUrl: document.getElementById('sys-domain')?.value?.trim() || '',
          hostingProvider: document.getElementById('sys-hosting')?.value?.trim() || '',
          launchDate: document.getElementById('sys-launch')?.value || '',
          expiryDate: document.getElementById('sys-expiry')?.value || '',
          slaType: document.getElementById('sys-sla')?.value || 'SLA Standard',
          status: document.getElementById('sys-status')?.value || 'active',
          techStack: document.getElementById('sys-tech')?.value?.trim() || '',
          notes: document.getElementById('sys-notes')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.addClientSystem(res.value);
        this.renderCurrentView();
      }
    });
  },

  openEditClientSystemModal(sysId) {
    const s = window.db.getClientSystems().find(sys => sys.id === sysId);
    if (!s) return;

    const customers = window.db.getCustomers();
    const custOptions = customers.map(c => `<option value="${c.id}" ${c.id === s.customerId ? 'selected' : ''}>${c.name}</option>`).join('');

    Swal.fire({
      title: `ແກ້ໄຂລະບົບ: ${s.systemName}`,
      html: `
        <div class="space-y-3 text-left text-xs">
          <div>
            <label class="block mb-1 font-bold">ຊື່ລະບົບ / Application *</label>
            <input type="text" id="edit-sys-name" class="glass-input w-full" value="${s.systemName}">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລູກຄ້າ *</label>
              <select id="edit-sys-cust" class="glass-input w-full">${custOptions}</select>
            </div>
            <div>
              <label class="block mb-1 font-bold text-emerald-400">ມູນຄ່າການຂາຍ / ສັນຍາ (₭) *</label>
              <input type="number" id="edit-sys-price" class="glass-input w-full font-bold text-emerald-400" value="${s.price || 0}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">Domain / URL ເວັບໄຊ</label>
              <input type="url" id="edit-sys-domain" class="glass-input w-full font-mono" value="${s.domainUrl || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">Hosting / Cloud Provider</label>
              <input type="text" id="edit-sys-hosting" class="glass-input w-full" value="${s.hostingProvider || ''}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ວັນທີເລີ່ມໃຊ້ງານ</label>
              <input type="date" id="edit-sys-launch" class="glass-input w-full" value="${s.launchDate || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ວັນທີໝົດສັນຍາ Support</label>
              <input type="date" id="edit-sys-expiry" class="glass-input w-full" value="${s.expiryDate || ''}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 font-bold">ລະດັບ SLA Support</label>
              <select id="edit-sys-sla" class="glass-input w-full">
                <option value="SLA Standard" ${s.slaType === 'SLA Standard' ? 'selected' : ''}>SLA Standard (8x5)</option>
                <option value="SLA Gold 24/7" ${s.slaType === 'SLA Gold 24/7' ? 'selected' : ''}>SLA Gold 24/7</option>
                <option value="SLA Platinum" ${s.slaType === 'SLA Platinum' ? 'selected' : ''}>SLA Platinum (Enterprise)</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 font-bold">ສະຖານະລະບົບ</label>
              <select id="edit-sys-status" class="glass-input w-full">
                <option value="active" ${s.status === 'active' ? 'selected' : ''}>Active (ເປີດໃຊ້ງານ)</option>
                <option value="maintenance" ${s.status === 'maintenance' ? 'selected' : ''}>Maintenance (ປັບປຸງ)</option>
                <option value="suspended" ${s.status === 'suspended' ? 'selected' : ''}>Suspended (ພັກໃຊ້ງານ)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-bold">Tech Stack ທີ່ໃຊ້</label>
            <input type="text" id="edit-sys-tech" class="glass-input w-full" value="${s.techStack || ''}">
          </div>
          <div>
            <label class="block mb-1 font-bold">ໝາຍເຫດ</label>
            <input type="text" id="edit-sys-notes" class="glass-input w-full" value="${s.notes || ''}">
          </div>
        </div>
      `,
      width: '640px',
      showCancelButton: true,
      confirmButtonText: 'ບັນທຶກ',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' },
      preConfirm: () => {
        const name = document.getElementById('edit-sys-name')?.value?.trim();
        const custId = document.getElementById('edit-sys-cust')?.value;
        const cust = window.db.getCustomers().find(c => c.id === custId);
        const price = parseFloat(document.getElementById('edit-sys-price')?.value || '0');

        if (!name) {
          Swal.showValidationMessage('ກະລຸນາໃສ່ຊື່ລະບົບ');
          return false;
        }

        return {
          systemName: name,
          customerId: custId,
          customerName: cust ? cust.name : s.customerName,
          price,
          domainUrl: document.getElementById('edit-sys-domain')?.value?.trim() || '',
          hostingProvider: document.getElementById('edit-sys-hosting')?.value?.trim() || '',
          launchDate: document.getElementById('edit-sys-launch')?.value || '',
          expiryDate: document.getElementById('edit-sys-expiry')?.value || '',
          slaType: document.getElementById('edit-sys-sla')?.value || 'SLA Standard',
          status: document.getElementById('edit-sys-status')?.value || 'active',
          techStack: document.getElementById('edit-sys-tech')?.value?.trim() || '',
          notes: document.getElementById('edit-sys-notes')?.value?.trim() || ''
        };
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        window.db.updateClientSystem(sysId, res.value);
        this.renderCurrentView();
      }
    });
  },

  deleteClientSystem(sysId) {
    Swal.fire({
      title: 'ຢືນຢັນການລຶບລະບົບລູກຄ້າ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, ລຶບ',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        window.db.deleteClientSystem(sysId);
        this.renderCurrentView();
      }
    });
  },

  // --------------------------------------------------------------------------
  // SETTINGS & CLOUDFLARE D1 (ຕັ້ງຄ່າລະບົບ, ໂລໂກ້ & ບັນຊີທະນາຄານ)
  // --------------------------------------------------------------------------
  renderSettings(container) {
    const s = window.db.getSettings();
    container.innerHTML = `
      <div class="space-y-6 max-w-4xl">
        <h1 class="text-2xl font-black flex items-center gap-3">
          <i class="fa-solid fa-gear text-slate-300"></i> ຕັ້ງຄ່າລະບົບ, ໂລໂກ້ & ບັນຊີທະນາຄານ
        </h1>

        <!-- D1 Box -->
        <div class="glass-panel p-5">
          <h3 class="font-bold mb-3 flex items-center gap-2">
            <i class="fa-brands fa-cloudflare text-orange-400 text-lg"></i> Cloudflare D1 Integration
          </h3>
          <div class="space-y-3 text-xs">
            <div>
              <label class="block mb-1 font-bold">Cloudflare Worker API Endpoint</label>
              <input type="url" id="cfg-worker-url" class="glass-input w-full font-mono" value="${s.d1WorkerUrl || ''}" placeholder="https://netd-webapp-api.your-subdomain.workers.dev">
            </div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button onclick="App.saveD1Endpoint()" class="btn-glass-primary">ບັນທຶກ URL</button>
              <button onclick="App.handleManualTestConnection()" class="btn-glass-secondary">🔗 ທົດສອບ D1</button>
              <button onclick="App.syncAllDataToCloudflare()" class="btn-glass-success">⬆️ ຊິ້ງຂຶ້ນ D1 (Upload)</button>
              <button onclick="App.pullAllDataFromCloudflare()" class="btn-glass-secondary text-cyan-300 border-cyan-400/40">⬇️ ດຶງຂໍ້ມູນຈາກ D1 (Download)</button>
            </div>
          </div>
        </div>

        <!-- Shop Profile & Logo -->
        <div class="glass-panel p-5 space-y-4">
          <h3 class="font-bold mb-1 flex items-center gap-2">
            <i class="fa-solid fa-store text-sky-400"></i> ຂໍ້ມູນຮ້ານໄອທີ & ໂລໂກ້ບໍລິສັດ
          </h3>

          <!-- Logo Browse & Preview -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-sky-400 text-xs">ໂລໂກ້ຮ້ານ / ບໍລິສັດ (Company Logo) - ໃຊ້ໃນໃບສະເໜີລາຄາ, ໃບເກັບເງິນ ແລະ ໃບບິນ</label>
            <div class="flex items-center gap-4">
              <div class="w-24 h-16 rounded-xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
                <img id="cfg-logo-preview" src="${s.logoUrl || 'Logo.png'}" class="max-h-full max-w-full object-contain" onerror="this.src='Logo.png'">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="cfg-logo" class="glass-input w-full py-1 text-xs" 
                       value="${s.logoUrl || 'Logo.png'}" 
                       placeholder="URL ໂລໂກ້ ຫຼື ກົດ Browse ຈາກເຄື່ອງ"
                       oninput="document.getElementById('cfg-logo-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="cfg-logo-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'cfg-logo-preview', 'cfg-logo')">
                  <button type="button" onclick="document.getElementById('cfg-logo-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-folder-open text-sky-400"></i> Browse ອັບໂຫຼດໂລໂກ້...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ PNG, JPG, WebP</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label class="block mb-1 font-bold">ຊື່ຮ້ານ / ບໍລິສັດ</label>
              <input type="text" id="cfg-name" class="glass-input w-full" value="${s.shopName || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ຄຳຂວັນ / ຄຳອະທິບາຍ (Subtitle)</label>
              <input type="text" id="cfg-subtitle" class="glass-input w-full" value="${s.shopSubtitle || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເບີໂທລະສັບ</label>
              <input type="text" id="cfg-phone" class="glass-input w-full" value="${s.phone || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ອີເມວ</label>
              <input type="email" id="cfg-email" class="glass-input w-full" value="${s.email || ''}">
            </div>
            <div class="md:col-span-2">
              <label class="block mb-1 font-bold">ທີ່ຢູ່ຮ້ານ</label>
              <input type="text" id="cfg-addr" class="glass-input w-full" value="${s.address || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ເລກປະຈຳຕົວຜູ້ເສຍພາສີ (Tax ID)</label>
              <input type="text" id="cfg-tax" class="glass-input w-full" value="${s.taxId || ''}">
            </div>
            <div>
              <label class="block mb-1 font-bold">ອັດຕາອາກອນມູນຄ່າເພີ່ມ VAT (%)</label>
              <input type="number" id="cfg-taxrate" class="glass-input w-full" value="${s.taxRate || 7}">
            </div>
          </div>
        </div>

        <!-- Bank Accounts & Payment QR -->
        <div class="glass-panel p-5 space-y-4">
          <h3 class="font-bold mb-1 flex items-center gap-2">
            <i class="fa-solid fa-building-columns text-emerald-400"></i> ຂໍ້ມູນບັນຊີທະນາຄານ & QR Code ຮັບເງິນ
          </h3>
          <p class="text-xs opacity-75">ຂໍ້ມູນນີ້ຈະຖືກນຳໄປສະແດງໃນໃບເກັບເງິນ (Invoice), ໃບສະເໜີລາຄາ (Quotation) ແລະ ໃບບິນໜ້າຮ້ານ (POS Slip) ເພື່ອໃຫ້ລູກຄ້າສະແກນຈ່າຍເງິນ</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label class="block mb-1 font-bold">ຊື່ທະນາຄານ</label>
              <input type="text" id="cfg-bank-name" class="glass-input w-full" value="${s.bankName || 'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)'}" placeholder="ເຊັ່ນ: ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)">
            </div>
            <div>
              <label class="block mb-1 font-bold flex items-center justify-between">
                <span>ເລກບັນຊີ (Account Number)</span>
                <span class="text-[10px] text-sky-400 font-normal">ພິມໄດ້ຫຼາຍບັນທັດ (LAK, USD, THB...)</span>
              </label>
              <textarea id="cfg-bank-acc" rows="2" class="glass-input w-full font-mono font-bold text-sky-400 text-xs py-1.5 leading-relaxed" placeholder="ເຊັ່ນ:&#10;LAK: 010-12-00-01234567-001&#10;USD: 010-12-01-09876543-001">${s.bankAccountNo || '010-12-00-01234567-001'}</textarea>
            </div>
            <div class="md:col-span-2">
              <label class="block mb-1 font-bold">ຊື່ເຈົ້າຂອງບັນຊີ (Account Name)</label>
              <input type="text" id="cfg-bank-accname" class="glass-input w-full" value="${s.bankAccountName || 'NETD IT SOLUTIONS & SERVICES'}" placeholder="ຊື່ບັນຊີທະນາຄານ">
            </div>
          </div>

          <!-- Bank QR Code Upload -->
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <label class="block font-bold text-emerald-400 text-xs">QR Code ຮັບເງິນໂອນ (Bank Transfer QR)</label>
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
                <img id="cfg-qr-preview" src="${s.bankQrUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BCEL-ONE-DEMO'}" class="w-full h-full object-contain rounded-lg">
              </div>
              <div class="flex-1 space-y-1.5">
                <input type="text" id="cfg-bank-qr" class="glass-input w-full py-1 text-xs" 
                       value="${s.bankQrUrl || ''}" 
                       placeholder="URL ຂອງ QR Code ຫຼື ກົດ Browse ຮູບ QR ຈາກເຄື່ອງ"
                       oninput="document.getElementById('cfg-qr-preview').src = this.value">
                <div class="flex items-center gap-2">
                  <input type="file" id="cfg-qr-file" accept="image/*" class="hidden" onchange="App.handleFileBrowse(this, 'cfg-qr-preview', 'cfg-bank-qr')">
                  <button type="button" onclick="document.getElementById('cfg-qr-file').click()" class="btn-glass-secondary text-[11px] py-1 px-3 flex items-center gap-1.5">
                    <i class="fa-solid fa-qrcode text-emerald-400"></i> Browse ຮູບ QR Code...
                  </button>
                  <span class="text-[10px] opacity-70">ຮອງຮັບ PNG, JPG (ແນະນຳຮູບ QR ຈະແຈ້ງ)</span>
                </div>
              </div>
            </div>
          </div>

          <button onclick="App.saveShopSettings()" class="btn-glass-primary text-xs py-2 px-5">
            <i class="fa-solid fa-floppy-disk mr-1"></i> ບັນທຶກຂໍ້ມູນຮ້ານ & ບັນຊີທະນາຄານ
          </button>
        </div>

        <!-- Backup & Restore -->
        <div class="glass-panel p-5 text-xs space-y-4">
          <div>
            <h4 class="font-bold text-sm text-sky-400 flex items-center gap-2">
              <i class="fa-solid fa-database"></i> Backup & Restore ຖານຂໍ້ມູນ
            </h4>
            <p class="opacity-75 mt-0.5">ດາວໂຫຼດ JSON Backup ເພື່ອນຳໄປໃຊ້ຕໍ່ ຫຼື ກູ້ຄືນຖານຂໍ້ມູນຈາກໄຟລ໌ Backup</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button onclick="App.downloadDatabaseBackup()" class="btn-glass-primary flex items-center gap-2 py-1.5 px-4">
              <i class="fa-solid fa-download"></i> ດາວໂຫຼດ JSON Backup
            </button>

            <input type="file" id="cfg-restore-file" accept=".json" class="hidden" onchange="App.handleRestoreBackupFile(this)">
            <button type="button" onclick="document.getElementById('cfg-restore-file').click()" class="btn-glass-secondary border-amber-400/40 text-amber-300 flex items-center gap-2 py-1.5 px-4">
              <i class="fa-solid fa-upload"></i> Restore / ນຳເຂົ້າ JSON Backup...
            </button>
          </div>
        </div>

        <!-- Security & Password Management -->
        <div class="glass-panel p-5 text-xs space-y-4">
          <div>
            <h4 class="font-bold text-sm text-amber-400 flex items-center gap-2">
              <i class="fa-solid fa-shield-halved"></i> ຄວາມປອດໄພ & ປ່ຽນລະຫັດຜ່ານ (Security & Password)
            </h4>
            <p class="opacity-75 mt-0.5">ປ່ຽນລະຫັດຜ່ານບັນຊີຂອງທ່ານ ຫຼື ຈັດການຄວາມປອດໄພໃນການເຂົ້າສູ່ລະບົບ (SHA-256 Encrypted)</p>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
            <button onclick="App.openChangePasswordModal()" class="btn-glass-secondary border-amber-400/40 text-amber-300 hover:bg-amber-500/20 flex items-center gap-2 py-1.5 px-4">
              <i class="fa-solid fa-key"></i> ປ່ຽນລະຫັດຜ່ານບັນຊີປະຈຸບັນ...
            </button>
            <span class="text-[11px] opacity-75">
              ຜູ້ໃຊ້ງານປັດຈຸບັນ: <strong class="text-white">${this.currentUser ? this.currentUser.name : 'Admin'}</strong> (<span class="font-mono text-sky-400">${this.currentUser ? this.currentUser.username : 'admin'}</span>)
            </span>
          </div>
        </div>
      </div>
    `;
  },

  saveShopSettings() {
    window.db.updateSettings({
      shopName: document.getElementById('cfg-name')?.value?.trim(),
      shopSubtitle: document.getElementById('cfg-subtitle')?.value?.trim(),
      phone: document.getElementById('cfg-phone')?.value?.trim(),
      email: document.getElementById('cfg-email')?.value?.trim(),
      address: document.getElementById('cfg-addr')?.value?.trim(),
      taxId: document.getElementById('cfg-tax')?.value?.trim(),
      taxRate: parseFloat(document.getElementById('cfg-taxrate')?.value || '7'),
      logoUrl: document.getElementById('cfg-logo')?.value?.trim(),
      bankName: document.getElementById('cfg-bank-name')?.value?.trim(),
      bankAccountNo: document.getElementById('cfg-bank-acc')?.value?.trim(),
      bankAccountName: document.getElementById('cfg-bank-accname')?.value?.trim(),
      bankQrUrl: document.getElementById('cfg-bank-qr')?.value?.trim()
    });
    this.updateLiveHeader();
    Swal.fire({ 
      title: 'ບັນທຶກສຳເລັດ!', 
      text: 'ຂໍ້ມູນຮ້ານ, ໂລໂກ້ ແລະ ບັນຊີທະນາຄານຖືກບັນທຶກ ແລະ ນຳໄປໃຊ້ໃນເອກະສານແລ້ວ', 
      icon: 'success', 
      timer: 1800, 
      showConfirmButton: false, 
      customClass: { popup: 'swal-glass' } 
    });
  },

  downloadDatabaseBackup() {
    const json = window.db.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NETD_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  handleRestoreBackupFile(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    Swal.fire({
      title: 'ຢືນຢັນການ Restore ຖານຂໍ້ມູນ?',
      html: `
        <div class="text-xs text-left space-y-2">
          <p>ໄຟລ໌: <strong class="text-amber-400 font-mono">${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)</p>
          <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>ຄຳເຕືອນ:</strong> ຂໍ້ມູນທັງໝົດໃນລະບົບປະຈຸບັນຈະຖືກແທນທີ່ດ້ວຍຂໍ້ມູນຈາກໄຟລ໌ Backup ນີ້.
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ແມ່ນ, Restore ຂໍ້ມູນດຽວນີ້',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'ຍົກເລີກ',
      customClass: { popup: 'swal-glass' }
    }).then(res => {
      if (res.isConfirmed) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonStr = e.target.result;
            const resImport = window.db.importBackupJson(jsonStr);
            if (resImport && resImport.success) {
              Swal.fire({
                title: 'Restore ສຳເລັດ!',
                text: 'ຖານຂໍ້ມູນທັງໝົດໄດ້ຮັບການກູ້ຄືນຮຽບຮ້ອຍແລ້ວ',
                icon: 'success',
                timer: 1800,
                showConfirmButton: false,
                customClass: { popup: 'swal-glass' }
              });
              App.updateLiveHeader();
              App.renderCurrentView();
            } else {
              throw new Error(resImport ? resImport.error : 'ຮູບແບບໄຟລ໌ບໍ່ຖືກຕ້ອງ');
            }
          } catch (err) {
            Swal.fire({
              title: 'ເກີດຂໍ້ຜິດພາດ',
              text: 'ໄຟລ໌ JSON ບໍ່ຖືກຕ້ອງ ຫຼື ເສຍຫາຍ: ' + err.message,
              icon: 'error',
              customClass: { popup: 'swal-glass' }
            });
          }
        };
        reader.readAsText(file);
      }
      input.value = '';
    });
  },

  // --------------------------------------------------------------------------
  // WARRANTY & SERIAL NUMBER CHECKER (ກວດສອບປະກັນສິນຄ້າ)
  // --------------------------------------------------------------------------
  openWarrantyCheckerModal(initialQuery = '') {
    Swal.fire({
      title: 'ກວດສອບປະກັນສິນຄ້າ (Warranty & SN Checker)',
      html: `
        <div class="space-y-4 text-left text-xs">
          <p class="opacity-75">ພິມ ຫຼື ຍິງ Barcode ເລກ SN, MAC Address ຫຼື ລະຫັດ SKU ເພື່ອກວດສອບສະຖານະການຮັບປະກັນ</p>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <i class="fa-solid fa-barcode absolute left-3 top-2.5 text-amber-400 text-sm"></i>
              <input type="text" id="warranty-query-input" 
                     value="${initialQuery || ''}"
                     onkeydown="if(event.key==='Enter') { event.preventDefault(); App.handleWarrantySearch(this.value); }"
                     class="glass-input w-full pl-9 py-2 text-xs font-mono font-bold text-amber-300 placeholder:text-slate-400"
                     placeholder="ຕົວຢ່າງ: SN-HK2MP-2026-001, 48:EA:63:12:34:56..." autofocus>
            </div>
            <button type="button" onclick="App.handleWarrantySearch(document.getElementById('warranty-query-input')?.value)" class="btn-glass-primary py-2 px-4 text-xs font-bold shrink-0">
              <i class="fa-solid fa-magnifying-glass mr-1"></i> ກວດສອບ
            </button>
          </div>

          <div id="warranty-result-container" class="min-h-[160px] flex items-center justify-center">
            ${initialQuery ? `<div class="opacity-60 text-center py-6"><i class="fa-solid fa-spinner fa-spin text-2xl text-sky-400"></i><p class="mt-2">ກຳລັງກວດສອບ...</p></div>` : `
              <div class="text-center py-6 opacity-60">
                <i class="fa-solid fa-shield-halved text-4xl text-amber-400/40 mb-2 block"></i>
                <p>ກະລຸນາປ້ອນເລກ SN ຫຼື MAC ເພື່ອກວດສອບຂໍ້ມູນປະກັນ</p>
              </div>
            `}
          </div>
        </div>
      `,
      didOpen: () => {
        const input = document.getElementById('warranty-query-input');
        if (input) {
          input.focus();
          if (initialQuery) {
            this.handleWarrantySearch(initialQuery);
          }
        }
      },
      width: '640px',
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'ປິດ',
      customClass: { popup: 'swal-glass' }
    });
  },

  handleWarrantySearch(keyword) {
    const container = document.getElementById('warranty-result-container');
    if (!container) return;

    if (!keyword || !keyword.trim()) {
      container.innerHTML = `
        <div class="text-center py-6 opacity-60">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-400/60 mb-2 block"></i>
          <p>ກະລຸນາໃສ່ເລກ SN ຫຼື MAC ກ່ອນກົດກວດສອບ</p>
        </div>
      `;
      return;
    }

    const info = window.db.getWarrantyInfo(keyword.trim());
    if (!info) {
      container.innerHTML = `
        <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center text-xs space-y-2 w-full">
          <i class="fa-solid fa-circle-xmark text-3xl text-rose-400"></i>
          <h4 class="font-bold text-rose-300 text-sm">ບໍ່ພົບຂໍ້ມູນໃນລະບົບ!</h4>
          <p class="opacity-75">ບໍ່ພົບເລກ Serial Number, MAC ຫຼື SKU: <strong class="font-mono text-white">"${keyword}"</strong></p>
          <p class="text-[11px] opacity-60">ກະລຸນາກວດສອບຕົວອັກສອນ ຫຼື ນຳສິນຄ້າເຂົ້າສະຕອກໃນລະບົບກ່ອນ</p>
        </div>
      `;
      return;
    }

    if (info.foundType === 'serial') {
      const s = info.serial;
      const p = info.product;
      const isExpired = info.isExpired;
      const days = info.daysRemaining;

      container.innerHTML = `
        <div class="w-full space-y-3.5">
          <!-- Status Banner -->
          <div class="p-3.5 rounded-2xl ${isExpired ? 'bg-rose-500/20 border-rose-500/40 text-rose-200' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'} border flex items-center justify-between gap-3 shadow-lg">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl ${isExpired ? 'bg-rose-500/30 text-rose-400' : 'bg-emerald-500/30 text-emerald-300'} flex items-center justify-center text-2xl shrink-0">
                <i class="fa-solid ${isExpired ? 'fa-shield-xmark' : 'fa-shield-check'}"></i>
              </div>
              <div>
                <h4 class="font-black text-sm ${isExpired ? 'text-rose-300' : 'text-emerald-300'}">
                  ${isExpired ? '⚠️ ໝົດກຳນົດປະກັນແລ້ວ (Expired)' : '✓ ຢູ່ໃນໄລຍະຮັບປະກັນ (Active Warranty)'}
                </h4>
                <p class="text-[11px] opacity-90">
                  ${isExpired 
                    ? `ໝົດອາຍຸເມື່ອ: <strong>${info.expiryDate}</strong> (ກາຍກຳນົດ ${Math.abs(days)} ວັນ)` 
                    : `ໝົດກຳນົດ: <strong>${info.expiryDate}</strong> (ຍັງເຫຼືອອີກ ${days} ວັນ / ~${Math.ceil(days / 30)} ເດືອນ)`}
                </p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-mono font-black ${isExpired ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}">
              ${info.warrantyMonths} ເດືອນ
            </span>
          </div>

          <!-- Product Card -->
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <img src="${p?.imageUrl || 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=100'}" class="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0">
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-xs truncate text-sky-300">${p ? p.name : 'Unknown Product'}</h4>
              <div class="text-[11px] opacity-75 font-mono">SKU: ${p ? p.sku : '-'} | Model: ${p?.model || '-'}</div>
              <div class="text-[11px] font-mono font-bold text-amber-300 mt-0.5">SN: ${s.serialNumber} ${s.macAddress ? `| MAC: ${s.macAddress}` : ''}</div>
            </div>
          </div>

          <!-- Details Table -->
          <div class="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
            <div>
              <span class="opacity-60 block text-[10px]">ວັນທີເລີ່ມປະກັນ:</span>
              <strong>${info.startDate || '-'}</strong>
            </div>
            <div>
              <span class="opacity-60 block text-[10px]">ສະຖານະປັດຈຸບັນ:</span>
              <strong class="${s.status === 'sold' ? 'text-emerald-400' : 'text-amber-400'}">${s.status === 'sold' ? 'ຂາຍແລ້ວ' : 'ຢູ່ໃນສາງ'}</strong>
            </div>
            <div>
              <span class="opacity-60 block text-[10px]">ລູກຄ້າທີ່ຊື້:</span>
              <strong class="text-sky-300">${info.customer ? info.customer.name : 'ຍັງຢູ່ໃນສາງ'}</strong>
            </div>
            <div>
              <span class="opacity-60 block text-[10px]">ເລກທີໃບບິນທີ່ຂາຍ:</span>
              <strong>${info.invoice ? info.invoice.docNumber : '-'}</strong>
            </div>
            <div>
              <span class="opacity-60 block text-[10px]">ຜູ້ສະໜອງ (Supplier):</span>
              <strong>${info.supplier ? info.supplier.name : '-'}</strong>
            </div>
            <div>
              <span class="opacity-60 block text-[10px]">ເລກທີໃບສັ່ງຊື້ (PO):</span>
              <strong>${info.purchaseOrder ? info.purchaseOrder.poNumber : '-'}</strong>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
            ${info.invoice ? `
              <button onclick="App.viewTransactionBill('${info.invoice.docNumber}')" class="btn-glass-primary text-xs py-1.5 px-3">
                <i class="fa-solid fa-file-invoice mr-1"></i> ເບິ່ງໃບບິນຂາຍ
              </button>
            ` : ''}
            <button onclick="App.openCreateRmaJobModal('${s.serialNumber}', '${p ? p.id : ''}', '${info.customer ? info.customer.name : ''}')" class="btn-glass-warning text-xs py-1.5 px-3 font-bold">
              <i class="fa-solid fa-wrench mr-1"></i> ເປີດ Job ສ້ອມ/ເຄຼມ (RMA)
            </button>
            ${info.purchaseOrder ? `
              <button onclick="App.viewTransactionBill('${info.purchaseOrder.poNumber}')" class="btn-glass-secondary text-xs py-1.5 px-3">
                <i class="fa-solid fa-truck mr-1"></i> ເບິ່ງ PO
              </button>
            ` : ''}
          </div>
        </div>
      `;
    } else if (info.foundType === 'product') {
      const p = info.product;
      container.innerHTML = `
        <div class="w-full space-y-3">
          <div class="p-3.5 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-between">
            <div>
              <h4 class="font-bold text-sm text-sky-300">${p.name}</h4>
              <p class="text-xs opacity-80 font-mono">SKU: ${p.sku} | Model: ${p.model || '-'}</p>
            </div>
            <div class="text-right text-xs">
              <span class="text-emerald-400 font-bold">ໃນສາງ: ${info.inStockCount}</span> | 
              <span class="text-amber-400 font-bold">ຂາຍແລ້ວ: ${info.soldCount}</span>
            </div>
          </div>
          <div class="text-xs opacity-75">ລາຍການ Serial Numbers ຂອງສິນຄ້ານີ້:</div>
          <div class="max-h-48 overflow-y-auto space-y-1">
            ${(info.serials || []).map(s => `
              <div onclick="App.handleWarrantySearch('${s.serialNumber}')" class="p-2 rounded-xl bg-white/5 hover:bg-sky-500/20 border border-white/5 cursor-pointer flex items-center justify-between text-xs transition">
                <span class="font-mono font-bold text-amber-300">${s.serialNumber}</span>
                <span class="px-2 py-0.5 rounded text-[10px] ${s.status === 'sold' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-sky-500/20 text-sky-400'}">${s.status === 'sold' ? 'ຂາຍແລ້ວ' : 'ໃນສາງ'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  },

  openCreateRmaJobModal(sn, productId, customerName) {
    Swal.close();
    setTimeout(() => {
      this.openAddItJobModal();
      setTimeout(() => {
        const snInput = document.getElementById('new-job-sn');
        const custInput = document.getElementById('new-job-cust');
        const descInput = document.getElementById('new-job-desc');
        if (snInput) snInput.value = sn;
        if (custInput && customerName) custInput.value = customerName;
        if (descInput) descInput.value = `ເຄຼມປະກັນ / ກວດເຊັກອຸປະກອນ SN: ${sn}`;
      }, 150);
    }, 200);
  },

  async syncDatabaseWithCloudflareD1() {
    const workerUrl = (window.db.data.settings.d1WorkerUrl || '').trim();
    if (!workerUrl) {
      Swal.fire({
        title: 'ຍັງບໍ່ທັນເຊື່ອມຕໍ່ Cloudflare D1',
        html: `
          <div class="text-left text-xs space-y-2.5">
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>ບໍ່ສາມາດ Sync ໄດ້ (ຍັງບໍ່ມີ Worker URL)</strong>
            </div>
            <p class="opacity-80">
              ສາເຫດທີ່ຂຶ້ນ <strong>D1 Offline</strong> ເນື່ອງຈາກທ່ານຍັງບໍ່ທັນໄດ້ປ້ອນ Cloudflare Worker API URL ເທື່ອ.
            </p>
            <p class="opacity-75">
              ກະລຸນາ deploy Cloudflare Worker API ແລ້ວນຳ URL ມາວາງໃສ່ໃນໜ້າ <strong>"ຕັ້ງຄ່າລະບົບ"</strong> ກ່ອນ.
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-gear mr-1"></i> ໄປໜ້າຕັ້ງຄ່າລະບົບ',
        cancelButtonText: 'ປິດ',
        confirmButtonColor: '#0ea5e9',
        customClass: { popup: 'swal-glass' }
      }).then(r => {
        if (r.isConfirmed) {
          this.switchView('settings');
        }
      });
      return;
    }

    Swal.fire({
      title: 'ກຳລັງ Sync ຂໍ້ມູນກັບ Cloudflare D1...',
      text: 'ກະລຸນາລໍຖ້າຈັກໜ່ອຍ ລະບົບກຳລັງດຶງ ແລະ ອັບເດດຂໍ້ມູນກັບ Cloudflare',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-glass' }
    });

    const pushRes = await window.db.syncWithCloudflareD1();
    const pullRes = await window.db.pullFromCloudflareD1();
    const isSuccess = pushRes.success || pullRes.success;

    if (isSuccess) {
      const dot = document.getElementById('db-status-dot');
      const text = document.getElementById('db-status-text');
      if (dot) {
        dot.className = 'status-dot online';
      }
      if (text) {
        text.textContent = 'Cloudflare D1: ອອນລາຍ (Sync ແລ້ວ)';
      }
      this.renderCurrentView();

      Swal.fire({
        title: 'Sync ສຳເລັດຮຽບຮ້ອຍ!',
        html: `
          <div class="text-xs space-y-1.5 text-left bg-white/5 p-3 rounded-xl border border-white/10">
            <p class="text-emerald-300 font-bold">✓ ຂໍ້ມູນຖືກຊິ້ງກົງກັນກັບ Cloudflare D1 ແລ້ວ (Multi-Browser Sync)</p>
            <p>Server Time: <strong class="font-mono text-white">${pushRes.serverTime || new Date().toISOString()}</strong></p>
            <p>SQLite Engine: <strong class="font-mono text-sky-300">${pushRes.sqliteVer || 'Cloudflare D1'}</strong></p>
            <p>ຈຳນວນ Records ທີ່ Sync: <strong class="font-bold text-amber-300">${pushRes.syncedCount || 'All'}</strong></p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'ຕົກລົງ',
        customClass: { popup: 'swal-glass' }
      });
    } else {
      Swal.fire({
        title: 'Sync ບໍ່ສຳເລັດ',
        html: `
          <div class="text-xs space-y-2 text-left">
            <p class="text-rose-400 font-bold">⚠️ ${pushRes.error || pullRes.error}</p>
            <p class="opacity-75">ກະລຸນາກວດສອບການເຊື່ອມຕໍ່ອິນເຕີເນັດ ຫຼື Worker URL ໃນໜ້າຕັ້ງຄ່າ.</p>
          </div>
        `,
        icon: 'warning',
        confirmButtonText: 'ຕົກລົງ',
        customClass: { popup: 'swal-glass' }
      });
    }
        confirmButtonText: 'ຕົກລົງ',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  bindGlobalEvents() {
    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('-translate-x-full');
    });

    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const v = link.getAttribute('data-view');
        if (v) this.switchView(v);
      });
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
  }
};

window.App = App;
