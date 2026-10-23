/**
 * NETD IT WEBAPP - EXPORT UTILITIES (EXCEL & PDF)
 * Powered by SheetJS (XLSX) and custom styled PDF generator
 */

const ExportService = {
  // --------------------------------------------------------------------------
  // LAO NUMBER TO WORDS CONVERTER (ແປງຕົວເລກເປັນຕົວໜັງສືລາວ)
  // --------------------------------------------------------------------------
  numberToLaoWords(number) {
    if (!number || isNaN(number) || Number(number) <= 0) return 'ສູນກີບຖ້ວນ';
    const num = Math.floor(Number(number));

    const digits = ['', 'ໜຶ່ງ', 'ສອງ', 'ສາມ', 'ສີ່', 'ຫ້າ', 'ຫົກ', 'ເຈັດ', 'ແປດ', 'ເກົ້າ'];
    const units = ['', 'ສິບ', 'ຮ້ອຍ', 'ພັນ', 'ໝື່ນ', 'ແສນ'];

    function convertGroup(n) {
      let str = '';
      const s = String(n).padStart(6, '0');
      for (let i = 0; i < 6; i++) {
        const d = parseInt(s[i], 10);
        const pos = 5 - i;
        if (d === 0) continue;
        if (pos === 1) { // tens
          if (d === 1) str += 'ສິບ';
          else if (d === 2) str += 'ຊາວ';
          else str += digits[d] + 'ສິບ';
        } else if (pos === 0) { // units
          if (d === 1 && parseInt(s[4], 10) > 0) str += 'ເອັດ';
          else str += digits[d];
        } else {
          str += digits[d] + units[pos];
        }
      }
      return str;
    }

    let millions = Math.floor(num / 1000000);
    let remainder = num % 1000000;
    let result = '';

    if (millions > 0) {
      if (millions >= 1000000) {
        result += convertGroup(Math.floor(millions / 1000000)) + 'ລ້ານ';
        millions = millions % 1000000;
      }
      result += convertGroup(millions) + 'ລ້ານ';
    }
    if (remainder > 0 || result === '') {
      result += convertGroup(remainder);
    }

    return (result || 'ສູນ') + 'ກີບຖ້ວນ';
  },

  // --------------------------------------------------------------------------
  // EXCEL EXPORT METHODS
  // --------------------------------------------------------------------------
  exportProductsToExcel() {
    if (typeof XLSX === 'undefined') {
      Swal.fire({
        title: 'ຂໍອະໄພ',
        text: 'ລະບົບບໍ່ສາມາດໂຫຼດ SheetJS Library ໄດ້',
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    const products = window.db.getProducts();
    const categories = window.db.getCategories();
    const serials = window.db.data.productSerials;

    const data = products.map((p, idx) => {
      const cat = categories.find(c => c.id === p.categoryId);
      const inStockCount = p.hasSn 
        ? serials.filter(s => s.productId === p.id && s.status === 'in_stock').length
        : (p.stock !== undefined ? p.stock : 10);
      
      return {
        'ລ/ດ (No)': idx + 1,
        'ລະຫັດ SKU': p.sku,
        'ຊື່ສິນຄ້າ (Product Name)': p.name,
        'ໝວດໝູ່ (Category)': cat ? cat.name : '-',
        'ລາຄາຕົ້ນທຶນ (Cost)': p.costPrice,
        'ລາຄາຂາຍ (Sale Price)': p.salePrice,
        'ຈຳນວນໃນສາງ (Stock)': inStockCount,
        'ຫົວໜ່ວຍ (Unit)': p.unit || 'ໜ່ວຍ',
        'ມູນຄ່າລວມ (Total Value)': inStockCount * p.costPrice,
        'ຕິດຕາມ SN': p.hasSn ? 'ແມ່ນ' : 'ບໍ່'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ສາງສິນຄ້າ (Inventory)');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NETD_Inventory_Report_${dateStr}.xlsx`);

    Swal.fire({
      title: 'ສຳເລັດ!',
      text: 'ດາວໂຫຼດໄຟລ໌ Excel ສາງສິນຄ້າຮຽບຮ້ອຍແລ້ວ',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'swal-glass' }
    });
  },

  exportSerialsToExcel(productId = null) {
    if (typeof XLSX === 'undefined') return;

    let serials = window.db.data.productSerials;
    if (productId) {
      serials = serials.filter(s => s.productId === productId);
    }

    const products = window.db.getProducts();

    const data = serials.map((s, idx) => {
      const prod = products.find(p => p.id === s.productId);
      return {
        'ລ/ດ': idx + 1,
        'Serial Number (SN)': s.serialNumber,
        'ລະຫັດ SKU': prod ? prod.sku : '-',
        'ຊື່ສິນຄ້າ': prod ? prod.name : '-',
        'ສະຖານະ (Status)': s.status === 'in_stock' ? 'ຢູ່ໃນສາງ' : (s.status === 'sold' ? 'ຈຳໜ່າຍແລ້ວ' : s.status),
        'ສະຖານທີ່ເກັບ': s.location,
        'ວັນທີຮັບເຂົ້າ': s.receivedDate,
        'ໄລຍະຮັບປະກັນ (ເດືອນ)': s.warrantyMonths,
        'ໝາຍເຫດ': s.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Serial Numbers');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NETD_Serials_${dateStr}.xlsx`);
  },

  exportDocumentsToExcel() {
    if (typeof XLSX === 'undefined') return;

    const docs = window.db.getDocuments();
    const data = docs.map((d, idx) => ({
      'ລ/ດ': idx + 1,
      'ເລກທີເອກະສານ': d.docNumber,
      'ປະເພດ': d.docType === 'quotation' ? 'ໃບສະເໜີລາຄາ' : (d.docType === 'invoice' ? 'ໃບເກັບເງິນ' : (d.docType === 'delivery' ? 'ໃບສົ່ງເຄື່ອງ' : 'ບີນຂາຍໜ້າຮ້ານ')),
      'ຊື່ລູກຄ້າ': d.customerName,
      'ວັນທີ': d.date,
      'ກຳນົດຊຳລະ': d.dueDate || '-',
      'ຍອດລວມ (₭)': d.grandTotal,
      'ສະຖານະ': d.status,
      'ຜູ້ສ້າງ': d.createdBy || 'Admin'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NETD_Documents_${dateStr}.xlsx`);
  },

  exportTransactionsToExcel() {
    if (typeof XLSX === 'undefined') return;

    const txs = window.db.getTransactions();
    const data = txs.map((t, idx) => ({
      'ລ/ດ': idx + 1,
      'ປະເພດ': t.type === 'income' ? 'ລາຍຮັບ (Income)' : 'ລາຍຈ່າຍ (Expense)',
      'ໝວດ': t.category,
      'ລາຍການ / ລາຍລະອຽດ': t.description,
      'ຈຳນວນເງິນ (₭)': t.amount,
      'ວັນທີ': t.date,
      'ເລກທີອ້າງອີງ': t.refDoc || '-',
      'ວິທີຊຳລະ': t.paymentMethod,
      'ຜູ້ບັນທຶກ': t.recordedBy
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income_Expense');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NETD_Financial_Report_${dateStr}.xlsx`);
  },

  exportCustomersToExcel() {
    if (typeof XLSX === 'undefined') return;

    const customers = window.db.getCustomers();
    const data = customers.map((c, idx) => ({
      'ລ/ດ': idx + 1,
      'ປະເພດ': c.type === 'corporate' ? 'ອົງກອນ/ບໍລິສັດ' : 'ບຸກຄົນທົ່ວໄປ',
      'ຊື່ລູກຄ້າ / ບໍລິສັດ': c.company || c.name,
      'ຜູ້ຕິດຕໍ່': c.contactPerson || c.name || '-',
      'ເບີໂທລະສັບ': c.phone,
      'ທີ່ຢູ່': c.address || '-',
      'ເລກປະຈຳຕົວຜູ້ເສຍພາສີ': c.taxId || '-',
      'ຍອດຊື້ສະສົມ (₭)': c.totalSpent || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NETD_Customers_${dateStr}.xlsx`);
  },

  // --------------------------------------------------------------------------
  // PDF EXPORT & PRINT METHODS
  // --------------------------------------------------------------------------
  printDocument(docId) {
    const doc = window.db.getDocumentById(docId);
    if (!doc) return;

    if (doc.docType === 'po') {
      return this.printPurchaseOrder(docId);
    }
    if (doc.docType === 'delivery') {
      return this.printDeliveryNote(docId);
    }

    const settings = window.db.getSettings();
    const customer = window.db.getCustomers().find(c => c.id === doc.customerId) || {};

    const isQuotation = doc.docType === 'quotation';
    const isInvoice = doc.docType === 'invoice';

    const docTitle = isQuotation 
      ? 'ໃບສະເໜີລາຄາ (QUOTATION)' 
      : (isInvoice ? 'ໃບເກັບເງິນ (INVOICE)' : 'ໃບຮັບເງິນ / ບິນຂາຍ (RECEIPT)');

    let rowsHtml = '';
    (doc.items || []).forEach((item, idx) => {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px;">
            <div style="font-weight: bold; color: #1e293b;">${item.name || item.sku}</div>
            ${item.sku ? `<div style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td style="padding: 10px; text-align: center;">${item.qty}</td>
          <td style="padding: 10px; text-align: right;">${item.unitPrice.toLocaleString()} ₭</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">${(item.total || (item.qty * item.unitPrice)).toLocaleString()} ₭</td>
        </tr>
      `;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.docNumber} - ${docTitle}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap">
        <style>
          body {
            font-family: 'Noto Sans Lao', sans-serif;
            margin: 0;
            padding: 24px;
            color: #1e293b;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .company-info h1 {
            margin: 0 0 6px 0;
            font-size: 22px;
            color: #0f172a;
          }
          .company-info p {
            margin: 2px 0;
            font-size: 13px;
            color: #475569;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h2 {
            margin: 0;
            font-size: 22px;
            color: #0284c7;
          }
          .doc-badge p {
            margin: 4px 0;
            font-size: 13px;
            font-weight: 600;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .info-box h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #0284c7;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            padding: 10px;
            text-align: left;
            font-size: 13px;
            border-bottom: 2px solid #cbd5e1;
          }
          .totals-table {
            width: 320px;
            margin-left: auto;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 6px 12px;
            font-size: 14px;
          }
          .totals-table tr.grand-total {
            background: #e0f2fe;
            color: #0369a1;
            font-size: 16px;
            font-weight: bold;
          }
          .footer-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 48px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px dashed #94a3b8;
            margin-top: 50px;
            padding-top: 8px;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 12px;" class="no-print">
          <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ ພິມເອກະສານ / ບັນທຶກເປັນ PDF
          </button>
        </div>

        <div class="header">
          <div class="company-info">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <img src="${settings.logoUrl || 'Logo.png'}" alt="Logo" style="height: 52px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none'">
              <div>
                <h1>${settings.shopName}</h1>
                <p style="font-weight: 600; color: #0284c7;">${settings.shopSubtitle || ''}</p>
              </div>
            </div>
            <p>📍 ${settings.address}</p>
            <p>📞 ເບີໂທ: ${settings.phone} | ✉️ ອີເມວ: ${settings.email}</p>
            <p>ເລກປະຈຳຕົວຜູ້ເສຍພາສີ: ${settings.taxId || '-'}</p>
          </div>
          <div class="doc-badge">
            <h2>${docTitle}</h2>
            <p>ເລກທີ: <span style="color: #0f172a;">${doc.docNumber}</span></p>
            <p>ວັນທີ: ${doc.date}</p>
            ${isQuotation ? `
              <p>ກຳນົດນຳໃຊ້ໄດ້ເຖິງ: <strong style="color: #0284c7;">${doc.dueDate || doc.validUntil || '30 ວັນ ນັບຈາກວັນສະເໜີລາຄາ'}</strong></p>
            ` : (doc.dueDate ? `<p>ກຳນົດຊຳລະ: ${doc.dueDate}</p>` : '')}
            ${!isQuotation && !isInvoice ? `
              <div style="margin-top: 8px; display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${doc.status === 'paid' ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'}">
                ສະຖານະ: ${doc.status === 'paid' ? 'ຊຳລະແລ້ວ (PAID)' : 'ລໍຖ້າຊຳລະ (PENDING)'}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="info-grid" style="grid-template-columns: 1fr;">
          <div class="info-box">
            <h3>ຂໍ້ມູນລູກຄ້າ (CUSTOMER)</h3>
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${doc.customerName}</div>
            ${customer.company ? `<div>ອົງກອນ/ບໍລິສັດ: ${customer.company}</div>` : ''}
            <div>📞 ເບີໂທ: ${customer.phone || '-'}</div>
            <div>📍 ທີ່ຢູ່: ${customer.address || '-'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ລ/ດ</th>
              <th>ລາຍການສິນຄ້າ / ບໍລິການ</th>
              <th style="width: 80px; text-align: center;">ຈຳນວນ</th>
              <th style="width: 140px; text-align: right;">ລາຄາຕໍ່ໜ່ວຍ</th>
              <th style="width: 150px; text-align: right;">ມູນຄ່າລວມ (₭)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
          <div style="max-width: 55%; flex: 1;">
            ${isInvoice ? `
              <!-- ຂໍ້ມູນການຊຳລະສະແດງຢູ່ເທິງໝາຍເຫດ ແລະ ເງື່ອນໄຂ (ຕາມທີ່ລູກຄ້າກຳນົດ) -->
              <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
                <div style="font-weight: bold; font-size: 12px; color: #0284c7; margin-bottom: 6px; text-transform: uppercase;">💳 ຂໍ້ມູນການຊຳລະ / ບັນຊີທະນາຄານ (Payment Information):</div>
                <div style="display: flex; gap: 14px; align-items: center;">
                  ${settings.bankQrUrl ? `<img src="${settings.bankQrUrl}" style="height: 72px; width: 72px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; padding: 2px;" alt="Bank QR" />` : ''}
                  <div style="font-size: 12px; line-height: 1.45;">
                    <div style="font-weight: bold; color: #0f172a; font-size: 13px;">${settings.bankName || 'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)'}</div>
                    <div>ເລກບັນຊີ: <strong style="font-family: monospace; font-size: 13.5px; color: #0284c7; white-space: pre-line; line-height: 1.45;">${(settings.bankAccountNo || '010-12-00-01234567-001').replace(/\n/g, '<br>')}</strong></div>
                    <div>ຊື່ບັນຊີ: <strong>${settings.bankAccountName || settings.shopName}</strong></div>
                  </div>
                </div>
              </div>
            ` : ''}

            <div style="font-weight: bold; margin-bottom: 4px;">ໝາຍເຫດ / ເງື່ອນໄຂ (Notes & Terms):</div>
            <p style="font-size: 12px; color: #64748b; margin: 0; white-space: pre-line; line-height: 1.5;">${doc.notes || (isQuotation ? 'ສິນຄ້າຮັບປະກັນຕາມນະໂຍບາຍຂອງສູນ. ໃບສະເໜີລາຄານີ້ມີກຳນົດ 30 ວັນ.' : 'ກະລຸນາຊຳລະເງິນຕາມກຳນົດເວລາ ແລະ ອ້າງອີງເລກທີໃບເກັບເງິນທຸກຄັ້ງທີ່ໂອນ.')}</p>
          </div>
          <table class="totals-table">
            <tr>
              <td>ລວມມູນຄ່າ (Subtotal):</td>
              <td style="text-align: right;">${(doc.subtotal || doc.grandTotal || 0).toLocaleString()} ₭</td>
            </tr>
            <tr>
              <td>ສ່ວນຫຼຸດ (Discount):</td>
              <td style="text-align: right; color: #dc2626;">-${Number(doc.discount || 0).toLocaleString()} ₭</td>
            </tr>
            ${doc.taxAmount ? `
            <tr>
              <td>ອາກອນມູນຄ່າເພີ່ມ (VAT ${doc.taxRate}%):</td>
              <td style="text-align: right;">+${doc.taxAmount.toLocaleString()} ₭</td>
            </tr>` : ''}
            <tr class="grand-total">
              <td style="padding: 10px 12px;">ຍອດລວມທັງໝົດ (Grand Total):</td>
              <td style="padding: 10px 12px; text-align: right;">${Number(doc.grandTotal || 0).toLocaleString()} ₭</td>
            </tr>
          </table>
        </div>

        <div class="footer-signatures">
          <div>
            <div class="signature-line">
              <strong>${isQuotation ? 'ລາຍເຊັນລູກຄ້າ (Customer Signature)' : 'ລາຍເຊັນຜູ້ຈ່າຍເງິນ (Payer Signature)'}</strong><br>
              ວັນທີ: ......./......./...........
            </div>
          </div>
          <div>
            <div class="signature-line">
              <strong>${isQuotation ? 'ລາຍເຊັນຜູ້ສະເໜີລາຄາ (Quotation By)' : 'ລາຍເຊັນຜູ້ຮັບເງິນ (Receiver Signature)'}</strong><br>
              ວັນທີ: ......./......./...........
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      Swal.fire({
        title: 'ແຈ້ງເຕືອນ',
        text: 'ກະລຸນາອະນຸຍາດ Popup ໃນ Browser ເພື່ອພິມເອກະສານ',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  // --------------------------------------------------------------------------
  // DELIVERY ORDER (ໃບສົ່ງເຄື່ອງ / ໃບມອບ-ຮັບສິນຄ້າ A4)
  // --------------------------------------------------------------------------
  printDeliveryNote(docId) {
    const doc = window.db.getDocumentById(docId);
    if (!doc) return;

    const settings = window.db.getSettings();
    const customer = window.db.getCustomers().find(c => c.id === doc.customerId) || {};

    let rowsHtml = '';
    (doc.items || []).forEach((item, idx) => {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px;">
            <div style="font-weight: bold; color: #1e293b;">${item.name || item.productName || item.sku || '-'}</div>
            ${item.model || item.sku ? `<div style="font-size: 11px; color: #64748b;">Model/SKU: ${item.model || item.sku}</div>` : ''}
            ${item.sn ? `<div style="font-size: 11px; color: #7c3aed; font-family: monospace;">S/N: ${item.sn}</div>` : ''}
          </td>
          <td style="padding: 10px; text-align: center; font-weight: bold; font-size: 14px;">${item.qty || 1}</td>
          <td style="padding: 10px; text-align: center;">${item.unit || 'ອັນ/ຊຸດ'}</td>
          <td style="padding: 10px; font-size: 12px; color: #475569;">${item.remarks || item.condition || 'ສະພາບສົມບູນ 100%'}</td>
        </tr>
      `;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html lang="lo">
      <head>
        <meta charset="UTF-8">
        <title>ໃບສົ່ງເຄື່ອງ - ${doc.docNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Noto Sans Lao', sans-serif;
            margin: 0;
            padding: 30px;
            color: #1e293b;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .company-info h1 {
            margin: 0 0 6px 0;
            font-size: 22px;
            color: #0f172a;
          }
          .company-info p {
            margin: 2px 0;
            font-size: 13px;
            color: #475569;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-badge h2 {
            margin: 0;
            font-size: 22px;
            color: #7c3aed;
          }
          .doc-badge p {
            margin: 4px 0;
            font-size: 13px;
            font-weight: 600;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .info-box {
            background: #faf5ff;
            border: 1px solid #e9d5ff;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .info-box h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #7c3aed;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #f3e8ff;
            color: #581c87;
            padding: 10px;
            text-align: left;
            font-size: 13px;
            border-bottom: 2px solid #d8b4fe;
          }
          .footer-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 48px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px dashed #94a3b8;
            margin-top: 55px;
            padding-top: 8px;
            font-size: 13px;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 12px;" class="no-print">
          <button onclick="window.print()" style="background: #7c3aed; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ ພິມໃບສົ່ງເຄື່ອງ / ບັນທຶກເປັນ PDF
          </button>
        </div>

        <div class="header">
          <div class="company-info">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <img src="${settings.logoUrl || 'Logo.png'}" alt="Logo" style="height: 52px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none'">
              <div>
                <h1>${settings.shopName}</h1>
                <p style="font-weight: 600; color: #7c3aed;">${settings.shopSubtitle || ''}</p>
              </div>
            </div>
            <p>📍 ${settings.address}</p>
            <p>📞 ເບີໂທ: ${settings.phone} | ✉️ ອີເມວ: ${settings.email}</p>
          </div>
          <div class="doc-badge">
            <h2>ໃບສົ່ງເຄື່ອງ (DELIVERY ORDER)</h2>
            <p>ເລກທີ: <span style="color: #0f172a;">${doc.docNumber}</span></p>
            <p>ວັນທີຈັດສົ່ງ: ${doc.date}</p>
            ${doc.refDocId ? `<p>ອ້າງອີງໃບສະເໜີ: <strong style="color: #7c3aed;">${doc.refDocId}</strong></p>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>ຂໍ້ມູນຜູ້ຮັບ / ລູກຄ້າ (RECIPIENT)</h3>
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${doc.customerName}</div>
            ${customer.company ? `<div>ອົງກອນ/ບໍລິສັດ: ${customer.company}</div>` : ''}
            <div>📞 ເບີໂທຕິດຕໍ່: ${doc.phone || customer.phone || '-'}</div>
            <div>📍 ທີ່ຢູ່ຈັດສົ່ງ: ${doc.deliveryAddress || customer.address || '-'}</div>
          </div>
          <div class="info-box">
            <h3>ຂໍ້ມູນການຈັດສົ່ງ (DELIVERY DETAILS)</h3>
            <div>🚚 ພະນັກງານຈັດສົ່ງ: <strong>${doc.driver || doc.deliveredBy || '-'}</strong></div>
            <div>🚗 ທະບຽນລົດ / ພາຫະນະ: <strong>${doc.vehicle || '-'}</strong></div>
            <div style="margin-top: 6px;">
              ສະຖານະ: <strong style="color: ${doc.status === 'delivered' ? '#16a34a' : '#d97706'};">${doc.status === 'delivered' ? '✓ ສົ່ງຮອດແລ້ວ (Delivered)' : '🚚 ກຳລັງຈັດສົ່ງ (In Transit)'}</strong>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ລ/ດ</th>
              <th>ລາຍການສິນຄ້າ / ອຸປະກອນທີ່ຈັດສົ່ງ</th>
              <th style="width: 80px; text-align: center;">ຈຳນວນ</th>
              <th style="width: 100px; text-align: center;">ຫົວໜ່ວຍ</th>
              <th style="width: 220px;">ໝາຍເຫດ / ສະພາບສິນຄ້າ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
          <div style="font-weight: bold; font-size: 12px; color: #475569; margin-bottom: 4px;">ໝາຍເຫດ ແລະ ເງື່ອນໄຂການມອບ-ຮັບສິນຄ້າ (Terms of Handover):</div>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; white-space: pre-line; line-height: 1.5;">${doc.notes || 'ສິນຄ້າໄດ້ຮັບການກວດກາ ແລະ ສົ່ງມອບຄົບຖ້ວນຕາມລາຍການຂ້າງເທິງ.'}</p>
          <div style="font-size: 11.5px; color: #0f172a; font-style: italic;">
            * ຜູ້ຮັບສິນຄ້າໄດ້ກວດກາສິນຄ້າ ແລະ ເຫັນວ່າຖືກຕ້ອງຄົບຖ້ວນຕາມລາຍການຂ້າງເທິງ ແລະ ຢູ່ໃນສະພາບສົມບູນຮຽບຮ້ອຍແລ້ວ.
          </div>
        </div>

        <div class="footer-signatures">
          <div>
            <div class="signature-line">
              <strong>ລາຍເຊັນຜູ້ຈັດສົ່ງສິນຄ້າ (Delivered By)</strong><br>
              ວັນທີ: ......./......./...........<br>
              <span style="font-size: 11px; color: #64748b;">ຊື່ແຈ້ງ: ${doc.driver || doc.deliveredBy || '...........................................'}</span>
            </div>
          </div>
          <div>
            <div class="signature-line">
              <strong>ລາຍເຊັນຜູ້ຮັບສິນຄ້າ (Received By)</strong><br>
              ວັນທີ: ......./......./...........<br>
              <span style="font-size: 11px; color: #64748b;">ຊື່ແຈ້ງ: ...........................................</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      Swal.fire({
        title: 'ແຈ້ງເຕືອນ',
        text: 'ກະລຸນາອະນຸຍາດ Popup ໃນ Browser ເພື່ອພິມເອກະສານ',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  printPurchaseOrder(poId) {
    const po = (window.db.getPurchaseOrders && window.db.getPurchaseOrders().find(p => p.id === poId || p.poNumber === poId)) 
            || window.db.getDocumentById(poId) 
            || (window.db.getDocumentByNumber && window.db.getDocumentByNumber(poId));
    if (!po) return;

    const settings = window.db.getSettings();
    const supplier = (window.db.getSuppliers && window.db.getSuppliers().find(s => s.id === po.supplierId)) || { name: po.supplierName || 'Supplier' };

    const items = po.items && po.items.length > 0 ? po.items : [{
      sku: 'IT-ITEM',
      name: po.productName || 'ສິນຄ້າຕາມໃບສັ່ງຊື້',
      qty: po.quantity || 1,
      unitPrice: po.unitCost || 0,
      total: (po.quantity || 1) * (po.unitCost || 0)
    }];

    let rowsHtml = '';
    items.forEach((item, idx) => {
      const uPrice = item.unitPrice || item.unitCost || 0;
      const tot = item.total || ((item.qty || 1) * uPrice);
      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px;">
            <div style="font-weight: bold; color: #1e293b;">${item.name || item.productName || item.sku}</div>
            ${item.sku ? `<div style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td style="padding: 10px; text-align: center;">${item.qty || item.quantity || 1}</td>
          <td style="padding: 10px; text-align: right;">${uPrice.toLocaleString()} ₭</td>
          <td style="padding: 10px; text-align: right; font-weight: bold;">${tot.toLocaleString()} ₭</td>
        </tr>
      `;
    });

    const subtotal = items.reduce((acc, it) => acc + (it.total || ((it.qty || 1) * (it.unitPrice || it.unitCost || 0))), 0);
    const shipping = po.shippingCost || 0;
    const grandTotal = po.totalAmount || (subtotal + shipping);

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${po.poNumber || 'PO'} - ໃບສັ່ງຊື້ສິນຄ້າ (PURCHASE ORDER)</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap">
        <style>
          body { font-family: 'Noto Sans Lao', sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px; }
          .company-info h1 { margin: 0 0 6px 0; font-size: 22px; color: #0f172a; }
          .company-info p { margin: 2px 0; font-size: 13px; color: #475569; }
          .doc-badge { text-align: right; }
          .doc-badge h2 { margin: 0; font-size: 22px; color: #4f46e5; }
          .doc-badge p { margin: 4px 0; font-size: 13px; font-weight: 600; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
          .info-box h3 { margin: 0 0 8px 0; font-size: 14px; color: #4f46e5; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f1f5f9; color: #334155; padding: 10px; text-align: left; font-size: 13px; border-bottom: 2px solid #cbd5e1; }
          .totals-table { width: 320px; margin-left: auto; border-collapse: collapse; }
          .totals-table td { padding: 6px 12px; font-size: 14px; }
          .totals-table tr.grand-total { background: #e0e7ff; color: #3730a3; font-size: 16px; font-weight: bold; }
          .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; text-align: center; }
          .signature-line { border-top: 1px dashed #94a3b8; margin-top: 50px; padding-top: 8px; font-size: 13px; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 12px;" class="no-print">
          <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ ພິມໃບສັ່ງຊື້ / ບັນທຶກເປັນ PDF
          </button>
        </div>

        <div class="header">
          <div class="company-info">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <img src="${settings.logoUrl || 'Logo.png'}" alt="Logo" style="height: 52px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none'">
              <div>
                <h1>${settings.shopName}</h1>
                <p style="font-weight: 600; color: #4f46e5;">${settings.shopSubtitle || ''}</p>
              </div>
            </div>
            <p>📍 ${settings.address}</p>
            <p>📞 ເບີໂທ: ${settings.phone} | ✉️ ອີເມວ: ${settings.email}</p>
          </div>
          <div class="doc-badge">
            <h2>ໃບສັ່ງຊື້ສິນຄ້າ (PURCHASE ORDER)</h2>
            <p>ເລກທີ PO: <span style="color: #0f172a; font-family: monospace;">${po.poNumber}</span></p>
            <p>ວັນທີສັ່ງຊື້: ${po.orderDate || po.date}</p>
            ${po.expectedDate || po.dueDate ? `<p>ກຳນົດສົ່ງ: ${po.expectedDate || po.dueDate}</p>` : ''}
            <div style="margin-top: 8px; display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: ${po.status === 'received' ? '#dcfce7; color: #166534;' : '#fef3c7; color: #92400e;'}">
              ສະຖານະ: ${po.status === 'received' ? '✓ ຮັບສິນຄ້າແລ້ວ' : '⏳ ກຳລັງສັ່ງຊື້'}
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>ຜູ້ສະໜອງສິນຄ້າ (SUPPLIER)</h3>
            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${supplier.name || po.supplierName}</div>
            ${supplier.contactPerson ? `<div>ຜູ້ຕິດຕໍ່: ${supplier.contactPerson}</div>` : ''}
            <div>ເບີໂທ: ${supplier.phone || '-'}</div>
            <div>ທີ່ຢູ່: ${supplier.address || '-'}</div>
            ${supplier.email ? `<div>Email: ${supplier.email}</div>` : ''}
          </div>
          <div class="info-box">
            <h3>ສະຖານທີ່ຈັດສົ່ງ / ສາງສິນຄ້າ (DELIVERY TO)</h3>
            <div style="font-weight: bold;">ສາງໃຫຍ່: ${settings.shopName}</div>
            <div>ທີ່ຢູ່ສາງ: ${settings.address}</div>
            <div>ເບີໂທຕິດຕໍ່ຮັບເຄື່ອງ: <strong>${settings.phone}</strong></div>
            <div style="margin-top: 4px; font-size: 12px; color: #64748b;">(ກວດສອບລາຍການ ແລະ Serial Number ກ່ອນເຊັນຮັບເຄື່ອງ)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">ລ/ດ</th>
              <th>ລາຍການສິນຄ້າສັ່ງຊື້</th>
              <th style="width: 80px; text-align: center;">ຈຳນວນ</th>
              <th style="width: 140px; text-align: right;">ຕົ້ນທຶນ/ໜ່ວຍ</th>
              <th style="width: 150px; text-align: right;">ມູນຄ່າລວມ (₭)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="max-width: 50%;">
            <div style="font-weight: bold; margin-bottom: 4px;">ໝາຍເຫດ / ເງື່ອນໄຂ (Notes & Terms):</div>
            <p style="font-size: 12px; color: #64748b; margin: 0; white-space: pre-line; line-height: 1.5;">${po.notes || 'ສິນຄ້າຕ້ອງຢູ່ໃນສະພາບໃໝ່ 100% ພ້ອມກ່ອງ ແລະ ອຸປະກອນຄົບຊຸດ, ຮັບປະກັນຕາມມາດຕະຖານ.'}</p>
          </div>
          <table class="totals-table">
            <tr>
              <td>ລວມມູນຄ່າສິນຄ້າ:</td>
              <td style="text-align: right;">${subtotal.toLocaleString()} ₭</td>
            </tr>
            ${shipping > 0 ? `
            <tr>
              <td>ຄ່າຂົນສົ່ງ (Shipping):</td>
              <td style="text-align: right;">+${shipping.toLocaleString()} ₭</td>
            </tr>` : ''}
            <tr class="grand-total">
              <td style="padding: 10px 12px;">ຍອດລວມໃບສັ່ງຊື້ (Grand Total):</td>
              <td style="padding: 10px 12px; text-align: right;">${grandTotal.toLocaleString()} ₭</td>
            </tr>
          </table>
        </div>

        <div class="footer-signatures">
          <div>
            <div class="signature-line">
              <strong>ຜູ້ສັ່ງຊື້ / ຝ່າຍຈັດຊື້ (Purchasing Officer)</strong><br>
              ວັນທີ: ......./......./...........
            </div>
          </div>
          <div>
            <div class="signature-line">
              <strong>ຜູ້ສະໜອງສິນຄ້າ / ຜູ້ສົ່ງມອບ (Supplier Authorized)</strong><br>
              ວັນທີ: ......./......./...........
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      Swal.fire({
        title: 'ແຈ້ງເຕືອນ',
        text: 'ກະລຸນາອະນຸຍາດ Popup ໃນ Browser ເພື່ອພິມເອກະສານ',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  // --------------------------------------------------------------------------
  // THERMAL SLIP RECEIPT (80mm / 58mm) FOR POS CASHIER PRINTERS
  // --------------------------------------------------------------------------
  printPosThermalReceipt(docId, width = '80mm') {
    const doc = window.db.getDocumentById(docId);
    if (!doc) return;

    const settings = window.db.getSettings();
    const items = doc.items || [];
    const paperWidth = width === '58mm' ? '54mm' : '76mm';

    let itemsRows = '';
    items.forEach((it, idx) => {
      const lineTotal = it.total || ((it.qty || 1) * (it.unitPrice || 0));
      itemsRows += `
        <div style="margin-bottom: 6px; font-size: 12px; line-height: 1.3;">
          <div style="font-weight: bold; word-break: break-word;">${idx + 1}. ${it.name || it.sku}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.9; padding-left: 12px;">
            <span>${it.qty || 1} x ${(it.unitPrice || 0).toLocaleString()}</span>
            <span style="font-weight: bold;">${lineTotal.toLocaleString()} ₭</span>
          </div>
        </div>
      `;
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt_${doc.docNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Noto Sans Lao', 'Space Mono', -apple-system, monospace;
            width: ${paperWidth};
            margin: 0 auto;
            padding: 8px 6px;
            color: #000;
            background: #fff;
            font-size: 12px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .divider-double { border-bottom: 2px dashed #000; margin: 10px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .grand-total {
            font-size: 15px;
            font-weight: 800;
            padding: 4px 0;
          }
          .barcode-box {
            letter-spacing: 4px;
            font-family: 'Space Mono', monospace;
            font-size: 14px;
            font-weight: bold;
            padding: 4px;
            border: 1px solid #000;
            display: inline-block;
            margin-top: 4px;
          }
          .no-print { text-align: center; margin-bottom: 12px; }
          .btn-print {
            background: #0284c7;
            color: white;
            border: none;
            padding: 6px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; width: 100%; margin: 0; }
            @page { size: auto; margin: 2mm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ ພິມໃບບິນ Slip (${width})</button>
        </div>

        <div class="text-center">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 44px; max-width: 140px; margin: 0 auto 5px auto; display: block; object-fit: contain;" onerror="this.style.display='none'">` : ''}
          <div style="font-size: 15px; font-weight: 800; text-transform: uppercase;">${settings.shopName}</div>
          <div style="font-size: 10px; margin-top: 2px;">${settings.shopSubtitle || 'IT Solutions & Retail'}</div>
          <div style="font-size: 10px; margin-top: 2px;">📍 ${settings.address}</div>
          <div style="font-size: 10px;">📞 ${settings.phone}</div>
        </div>

        <div class="divider-double"></div>

        <div class="text-center" style="font-size: 13px; font-weight: bold; letter-spacing: 0.5px;">
          ໃບຮັບເງິນ / ບິນຂາຍໜ້າຮ້ານ
        </div>
        <div class="text-center" style="font-size: 10px; opacity: 0.8;">(SALES RECEIPT)</div>

        <div class="divider"></div>

        <div style="font-size: 11px; line-height: 1.4;">
          <div class="flex-between">
            <span>ເລກທີບິນ:</span>
            <span class="font-bold">${doc.docNumber}</span>
          </div>
          <div class="flex-between">
            <span>ວັນທີ-ເວລາ:</span>
            <span>${doc.date} ${new Date().toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="flex-between">
            <span>ພະນັກງານຂາຍ:</span>
            <span>${doc.createdBy || 'Cashier'}</span>
          </div>
          <div class="flex-between">
            <span>ລູກຄ້າ:</span>
            <span class="font-bold">${doc.customerName || 'ລູກຄ້າທົ່ວໄປ'}</span>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Line items -->
        <div>
          ${itemsRows}
        </div>

        <div class="divider"></div>

        <!-- Totals -->
        <div style="font-size: 12px; line-height: 1.4;">
          <div class="flex-between">
            <span>ຍອດລວມ (Subtotal):</span>
            <span>${(doc.subtotal || doc.grandTotal || 0).toLocaleString()} ₭</span>
          </div>
          ${doc.discount ? `
          <div class="flex-between" style="color: #000;">
            <span>ສ່ວນຫຼຸດ (Discount):</span>
            <span>-${Number(doc.discount).toLocaleString()} ₭</span>
          </div>` : ''}
          ${doc.taxAmount ? `
          <div class="flex-between">
            <span>ອາກອນ (VAT):</span>
            <span>+${Number(doc.taxAmount).toLocaleString()} ₭</span>
          </div>` : ''}
          <div class="divider"></div>
          <div class="flex-between grand-total">
            <span>ຍອດຊຳລະສຸດທິ:</span>
            <span>${(doc.grandTotal || 0).toLocaleString()} ₭</span>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Payment details -->
        <div style="font-size: 11px; line-height: 1.4;">
          <div class="flex-between">
            <span>ຊ່ອງທາງຊຳລະ:</span>
            <span class="font-bold">${doc.paymentMethod === 'cash' ? '💵 ເງິນສົດ (Cash)' : '💳 ເງີນໂອນ (Transfer)'}</span>
          </div>
          ${doc.cashGiven ? `
          <div class="flex-between">
            <span>ຮັບເງິນສົດມາ:</span>
            <span>${Number(doc.cashGiven).toLocaleString()} ₭</span>
          </div>
          <div class="flex-between font-bold">
            <span>ເງິນທອນ:</span>
            <span>${Number(doc.change || 0).toLocaleString()} ₭</span>
          </div>` : ''}
        </div>

        ${settings.bankAccountNo ? `
        <div class="divider"></div>
        <div class="text-center" style="font-size: 10px; line-height: 1.4;">
          <div style="font-weight: bold; color: #0284c7;">${settings.bankName || 'ທະນາຄານການຄ້າຕ່າງປະເທດລາວ (BCEL)'}</div>
          <div>ເລກບັນຊີ: <strong style="font-family: monospace; font-size: 11px; white-space: pre-line; line-height: 1.35;">${(settings.bankAccountNo || '').replace(/\n/g, '<br>')}</strong></div>
          <div>ຊື່ບັນຊີ: ${settings.bankAccountName || settings.shopName}</div>
          ${settings.bankQrUrl ? `<div style="margin: 6px auto;"><img src="${settings.bankQrUrl}" style="width: 85px; height: 85px; margin: 0 auto; display: block; border-radius: 4px;" alt="QR" /></div>` : ''}
        </div>` : ''}

        <div class="divider-double"></div>

        <div class="text-center" style="font-size: 10px; line-height: 1.4;">
          ${doc.notes ? `<div style="white-space: pre-line; margin-bottom: 4px; color: #1e293b; font-weight: 600;">* ${doc.notes} *</div>` : `
            <div>* ສິນຄ້າຮັບປະກັນຕາມເງື່ອນໄຂຂອງຮ້ານ *</div>
            <div>ກະລຸນາເກັບໃບບິນໄວ້ເປັນຫຼັກຖານໃນການເຄຼມປະກັນ</div>
          `}
          <div style="margin-top: 6px;" class="barcode-box">||| ${doc.docNumber} |||</div>
          <div style="margin-top: 8px; font-weight: bold; font-size: 11px;">
            🙏 ຂໍຂອບໃຈທີ່ໃຊ້ບໍລິການ 🙏
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=420,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      Swal.fire({
        title: 'ແຈ້ງເຕືອນ',
        text: 'ກະລຸນາອະນຸຍາດ Popup ໃນ Browser ເພື່ອພິມໃບບິນ Slip',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  // --------------------------------------------------------------------------
  // IT SERVICE JOB SHEET (ໃບຮັບສ້ອມແປງ & ບໍລິການໄອທີ / WORK ORDER)
  // --------------------------------------------------------------------------
  printServiceJobSheet(jobId) {
    const job = window.db.getItJobs().find(j => j.id === jobId || j.jobCode === jobId);
    if (!job) {
      Swal.fire({
        title: 'ບໍ່ພົບຂໍ້ມູນ',
        text: 'ບໍ່ພົບລາຍການ Job ໄອທີນີ້ໃນລະບົບ',
        icon: 'error',
        customClass: { popup: 'swal-glass' }
      });
      return;
    }

    const settings = window.db.getSettings();
    const categories = window.db.getItJobCategories ? window.db.getItJobCategories() : [];
    const cat = categories.find(c => c.key === job.jobType || c.id === job.jobType || c.name === job.jobType);
    const catName = cat ? cat.name : (job.jobType || 'ທົ່ວໄປ');

    const statusMap = {
      pending: 'ລໍຖ້າກວດເຊັກ',
      in_progress: 'ກຳລັງດຳເນີນການແປງ',
      completed: 'ສ້ອມແປງສຳເລັດແລ້ວ',
      delivered: 'ສົ່ງມອບລູກຄ້າແລ້ວ'
    };
    const statusText = statusMap[job.status] || job.status;

    const dateStr = job.createdAt ? new Date(job.createdAt).toLocaleDateString('lo-LA', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString('lo-LA');

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${job.jobCode} - ໃບຮັບສ້ອມແປງ & ບໍລິການໄອທີ</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap">
        <style>
          body { font-family: 'Noto Sans Lao', sans-serif; margin: 0; padding: 28px; color: #1e293b; background: #ffffff; line-height: 1.5; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .company-info h1 { margin: 0 0 4px 0; font-size: 20px; color: #0284c7; }
          .company-info p { margin: 2px 0; font-size: 12px; color: #475569; }
          .doc-badge { text-align: right; }
          .doc-badge h2 { margin: 0; font-size: 20px; color: #0369a1; text-transform: uppercase; }
          .doc-badge p { margin: 4px 0; font-size: 12px; font-weight: 600; }
          .code-box { display: inline-block; background: #f0f9ff; border: 1.5px dashed #0284c7; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: bold; color: #0369a1; margin-top: 4px; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
          .info-card h3 { margin: 0 0 8px 0; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-weight: bold; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .info-row span.label { color: #64748b; }
          .info-row span.val { font-weight: 600; color: #0f172a; }

          .detail-section { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px; }
          .detail-section h4 { margin: 0 0 6px 0; font-size: 13px; color: #0f172a; font-weight: bold; }
          .detail-box { background: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 4px solid #0284c7; font-size: 13px; min-height: 40px; margin-bottom: 12px; }
          .res-box { background: #ecfdf5; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981; font-size: 13px; min-height: 36px; color: #065f46; }

          .fee-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .fee-table th { background: #f1f5f9; padding: 8px 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .fee-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }

          .terms-box { border: 1px solid #fed7aa; background: #fffbeb; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #92400e; line-height: 1.6; margin-bottom: 24px; }
          .terms-box strong { color: #b45309; }

          .sig-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 24px; page-break-inside: avoid; }
          .sig-line { border-bottom: 1px dotted #94a3b8; height: 50px; margin-bottom: 8px; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 46px; margin-bottom: 6px;" alt="Logo" />` : ''}
            <h1>${settings.shopName || 'NETD IT Solutions & Services'}</h1>
            <p>📍 ${settings.address || 'ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ'}</p>
            <p>📞 ໂທລະສັບ: ${settings.phone || '020-xxxxxxxx'} | ✉️ ${settings.email || 'info@netd.la'}</p>
          </div>
          <div class="doc-badge">
            <h2>ໃບຮັບສ້ອມແປງ & ບໍລິການໄອທີ</h2>
            <p>IT SERVICE WORK ORDER</p>
            <div class="code-box">${job.jobCode}</div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Customer Info -->
          <div class="info-card">
            <h3>👤 ຂໍ້ມູນລູກຄ້າ / ຜູ້ສົ່ງສ້ອມ</h3>
            <div class="info-row"><span class="label">ຊື່ລູກຄ້າ:</span> <span class="val">${job.customerName || '-'}</span></div>
            <div class="info-row"><span class="label">ເບີໂທລະສັບ:</span> <span class="val">${job.customerPhone || '-'}</span></div>
            <div class="info-row"><span class="label">ວັນທີຮັບເຄື່ອງ:</span> <span class="val">${dateStr}</span></div>
            <div class="info-row"><span class="label">ສະຖານະ:</span> <span class="val" style="color: #0284c7;">${statusText}</span></div>
          </div>

          <!-- Device & Job Info -->
          <div class="info-card">
            <h3>💻 ຂໍ້ມູນອຸປະກອນ & ປະເພດວຽກ</h3>
            <div class="info-row"><span class="label">ປະເພດວຽກ:</span> <span class="val">${catName}</span></div>
            <div class="info-row"><span class="label">ລຸ້ນອຸປະກອນ:</span> <span class="val">${job.deviceModel || 'ຄອມພິວເຕີ/ອຸປະກອນໄອທີ'}</span></div>
            <div class="info-row"><span class="label">Serial Number/MAC:</span> <span class="val font-mono">${job.serialOrMac || 'ບໍ່ມີ/ບໍ່ລະບຸ'}</span></div>
            <div class="info-row"><span class="label">ຊ່າງຜູ້ຮັບຜິດຊອບ:</span> <span class="val">${job.technicianName || '-'}</span></div>
          </div>
        </div>

        <!-- Issue & Resolution Details -->
        <div class="detail-section">
          <h4>⚠️ ອາການເສຍ / ບັນຫາທີ່ລູກຄ້າແຈ້ງ:</h4>
          <div class="detail-box">${job.issueDescription || 'ກວດເຊັກຕາມອາການ'}</div>

          <h4>🛠️ ວິທີການແກ້ໄຂ / ລາຍການປ່ຽນອະໄຫຼ່ (Resolutions):</h4>
          <div class="res-box">${job.resolution || 'ກຳລັງກວດເຊັກ ແລະ ດຳເນີນການແກ້ໄຂ'}</div>
        </div>

        <!-- Fee Table -->
        <table class="fee-table">
          <thead>
            <tr>
              <th>ລາຍການບໍລິການ</th>
              <th style="width: 140px; text-align: center;">ປະເພດ</th>
              <th style="width: 180px; text-align: right;">ຄ່າບໍລິການ / ຄ່າແຮງ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-weight: bold;">ບໍລິການສ້ອມແປງ/ຕິດຕັ້ງ (${job.deviceModel || catName})</div>
                <div style="font-size: 11px; color: #64748b;">${job.jobCode} - ${job.issueDescription}</div>
              </td>
              <td style="text-align: center;">${catName}</td>
              <td style="text-align: right; font-weight: bold; font-size: 15px; color: #0284c7;">
                ${Number(job.serviceFee || 0).toLocaleString()} ₭
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Terms and Guarantee -->
        <div class="terms-box">
          <strong>📜 ເງື່ອນໄຂການຮັບປະກັນ ແລະ ຂໍ້ກຳນົດ:</strong><br>
          1. ຮັບປະກັນວຽກສ້ອມແປງໃນອາການເດີມເປັນເວລາ 30 ວັນ ນັບຈາກວັນທີສົ່ງມອບ.<br>
          2. ທາງຮ້ານບໍ່ຮັບຜິດຊອບຕໍ່ຂໍ້ມູນ (Data Loss) ໃນອຸປະກອນທຸກກໍລະນີ. ລູກຄ້າຄວນ Backup ຂໍ້ມູນສຳຄັນໄວ້ກ່ອນສົ່ງສ້ອມ.<br>
          3. ກະລຸນານຳໃບຮັບເຄື່ອງສ້ອມນີ້ມານຳທຸກຄັ້ງ ເພື່ອຢັ້ງຢືນຕົວຕົນໃນການຮັບເຄື່ອງຄືນ.<br>
          4. ຫາກບໍ່ມາຕິດຕໍ່ຮັບອຸປະກອນຄືນພາຍໃນ 60 ວັນ ນັບຈາກມື້ແຈ້ງສຳເລັດ ທາງຮ້ານຂໍສະຫງວນສິດໃນການຈັດການຕາມລະບຽບ.
        </div>

        <!-- Signatures -->
        <div class="sig-container">
          <div>
            <div class="sig-line"></div>
            <div style="font-weight: bold;">(.......................................................)</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">ລາຍເຊັນລູກຄ້າ / ຜູ້ສົ່ງມອບ</div>
          </div>
          <div>
            <div class="sig-line"></div>
            <div style="font-weight: bold;">(${job.technicianName || '.......................................................'})</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">ລາຍເຊັນຊ່າງຮັບເຄື່ອງ / ຜູ້ກວດເຊັກ</div>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center;" class="no-print">
          <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: inherit;">
            🖨️ ກົດເພື່ອພິມເອກະສານ (Print Job Sheet)
          </button>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      Swal.fire({
        title: 'ແຈ້ງເຕືອນ',
        text: 'ກະລຸນາອະນຸຍາດ Popup ໃນ Browser ເພື່ອພິມໃບຮັບສ້ອມແປງ',
        icon: 'warning',
        customClass: { popup: 'swal-glass' }
      });
    }
  },

  // Helper: Generate standalone SVG Barcode representation
  generateBarcodeSvg(text) {
    let bars = [2, 1, 1, 2];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bars.push((code % 3) + 1, ((code >> 1) % 3) + 1, ((code >> 2) % 2) + 1, 1);
    }
    bars.push(2, 3, 3, 1, 1, 2);
    let x = 10;
    let rects = '';
    let isBar = true;
    for (const w of bars) {
      if (isBar) {
        rects += `<rect x="${x}" y="0" width="${w * 1.5}" height="36" fill="#000" />`;
      }
      x += w * 1.5;
      isBar = !isBar;
    }
    return `<svg width="${x + 10}" height="36" viewBox="0 0 ${x + 10} 36" xmlns="http://www.w3.org/2000/svg" style="display:block; margin: 0 auto; max-width: 100%;">${rects}</svg>`;
  },

  // --------------------------------------------------------------------------
  // 6. ພິມສະຕິກເກີ້ Barcode / QR Label ຕິດສິນຄ້າ (50x30mm ຫຼື 60x40mm)
  // --------------------------------------------------------------------------
  printProductBarcodeLabel(productId) {
    const products = window.db.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) {
      Swal.fire({ title: 'ບໍ່ພົບສິນຄ້າ', icon: 'error', customClass: { popup: 'swal-glass' } });
      return;
    }
    const settings = window.db.getSettings();
    const barcodeSvg = this.generateBarcodeSvg(product.sku || 'SKU');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="lo">
      <head>
        <meta charset="UTF-8">
        <title>Barcode Label - ${product.sku}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700;800&display=swap">
        <style>
          @page { size: 60mm 40mm; margin: 0; }
          body {
            font-family: 'Noto Sans Lao', sans-serif;
            margin: 0;
            padding: 8px;
            width: 58mm;
            box-sizing: border-box;
            color: #0f172a;
            background: #fff;
            text-align: center;
          }
          .label-header { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 3px; color: #0284c7; }
          .prod-name { font-size: 11px; font-weight: 700; line-height: 1.25; max-height: 28px; overflow: hidden; margin-bottom: 2px; }
          .prod-model { font-size: 9px; color: #475569; margin-bottom: 4px; }
          .sku-code { font-family: monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
          .price-tag { font-size: 13px; font-weight: 900; color: #0284c7; margin-top: 3px; }
          .warranty-info { font-size: 8px; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="label-header">${settings.shopName || 'NETD IT SOLUTIONS'}</div>
        <div class="prod-name">${product.name}</div>
        ${product.model ? `<div class="prod-model">Model: ${product.model}</div>` : ''}
        ${barcodeSvg}
        <div class="sku-code">${product.sku}</div>
        <div class="price-tag">${(product.salePrice || 0).toLocaleString()} ₭</div>
        <div class="warranty-info">ຮັບປະກັນ: 12 ເດືອນ | ຕິດຕໍ່: ${settings.phone || '020 5555 8888'}</div>

        <div style="margin-top: 12px;" class="no-print">
          <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; font-family: inherit;">
            🖨️ ພິມສະຕິກເກີ້ (Print Label)
          </button>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=400,height=450');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    }
  },

  // --------------------------------------------------------------------------
  // 7. ພິມປ້າຍ Service Tag ຕິດເຄື່ອງສ້ອມແປງ (IT Job Device Tag)
  // --------------------------------------------------------------------------
  printItJobTag(jobId) {
    const jobs = window.db.getItJobs();
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      Swal.fire({ title: 'ບໍ່ພົບຂໍ້ມູນວຽກໄອທີ', icon: 'error', customClass: { popup: 'swal-glass' } });
      return;
    }
    const settings = window.db.getSettings();
    const barcodeSvg = this.generateBarcodeSvg(job.jobCode || 'JOB');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="lo">
      <head>
        <meta charset="UTF-8">
        <title>Service Tag - ${job.jobCode}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700;800&display=swap">
        <style>
          @page { size: 70mm 50mm; margin: 0; }
          body {
            font-family: 'Noto Sans Lao', sans-serif;
            margin: 0;
            padding: 8px;
            width: 68mm;
            box-sizing: border-box;
            color: #0f172a;
            background: #fff;
          }
          .tag-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 4px; }
          .tag-title { font-size: 10px; font-weight: 800; color: #0284c7; }
          .job-code { font-size: 12px; font-weight: 900; font-family: monospace; color: #0f172a; }
          .row { font-size: 10px; line-height: 1.4; margin-bottom: 2px; }
          .label { font-weight: bold; color: #475569; }
          .val { font-weight: 700; color: #0f172a; }
          .issue-box { font-size: 9.5px; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; margin: 4px 0; border-left: 3px solid #f59e0b; }
          .footer { font-size: 8.5px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 4px; display: flex; justify-content: space-between; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="tag-header">
          <span class="tag-title">🔧 SERVICE TAG</span>
          <span class="job-code">${job.jobCode}</span>
        </div>

        <div class="row"><span class="label">ລູກຄ້າ:</span> <span class="val">${job.customerName}</span></div>
        <div class="row"><span class="label">ເບີໂທ:</span> <span class="val font-mono">${job.customerPhone || '-'}</span></div>
        <div class="row"><span class="label">ເຄື່ອງ:</span> <span class="val">${job.deviceModel || '-'}</span> ${job.serialOrMac ? `(SN: ${job.serialOrMac})` : ''}</div>
        
        <div class="issue-box">
          <strong>ອາການ:</strong> ${job.issueDescription}
        </div>

        <div style="margin: 3px 0;">${barcodeSvg}</div>

        <div class="footer">
          <span>ວັນທີຮັບ: ${job.receivedDate || '-'}</span>
          <span>ຊ່າງ: <strong>${job.technicianName || '-'}</strong></span>
        </div>

        <div style="margin-top: 10px; text-align: center;" class="no-print">
          <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; font-family: inherit;">
            🖨️ ພິມປ້າຍຕິດເຄື່ອງ (Print Tag)
          </button>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=500');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      printWin.focus();
    }
  }
};

window.ExportService = ExportService;
