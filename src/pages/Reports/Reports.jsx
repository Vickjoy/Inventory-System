// src/pages/Reports/Reports.jsx
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../utils/api';
import styles from './Reports.module.css';

// ─── Date helpers ────────────────────────────────────────────────────────────
const getSaleDate = (sale) => sale.sale_date || sale.created_at;

const parseSaleDate = (sale) => {
  const raw = getSaleDate(sale);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(raw);
};

const formatSaleDate = (sale) => {
  const d = parseSaleDate(sale);
  if (!d) return '—';
  return d.toLocaleDateString('en-KE');
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Group sales by customer for outstanding balances ────────────────────────
const groupSalesByCustomer = (sales) => {
  const map = {};
  sales.forEach((sale) => {
    const cid = sale.customer;
    const cname = sale.customer_name || 'Unknown';
    if (!map[cid]) {
      map[cid] = { customerId: cid, customerName: cname, sales: [], totalOutstanding: 0 };
    }
    map[cid].sales.push(sale);
    map[cid].totalOutstanding += parseFloat(sale.outstanding_balance || 0);
  });
  return Object.values(map).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
};
// ─────────────────────────────────────────────────────────────────────────────

const Reports = () => {
  const [reportType, setReportType]               = useState('sales');
  const [loading, setLoading]                     = useState(false);
  const [reportData, setReportData]               = useState(null);
  const [dateRange, setDateRange]                 = useState({ start_date: '', end_date: '' });
  const [categories, setCategories]               = useState([]);
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');

  // ── Customer filter state ──────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch]       = useState('');
  const [selectedCustomer, setSelectedCustomer]   = useState(null); // { id, name }
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [allCustomers, setAllCustomers]           = useState([]);
  const customerDropdownRef                       = useRef(null);
  // ──────────────────────────────────────────────────────────────────────────

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Close customer dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load customers for the filter dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await api.getCustomers();
        const list = Array.isArray(data) ? data : (data?.results || []);
        // Normalise: customers come back with company_name, expose as .name for display
        setAllCustomers(list.map(c => ({
          ...c,
          name: c.company_name || c.name || '',
        })));
      } catch (e) { console.error('Error loading customers:', e); }
    };
    loadCustomers();
  }, []);

  // ── Apply customer filter to sales-type data ───────────────────────────────
  // sale.customer is a numeric FK; selectedCustomer.id comes from the same list
  const applyCustomerFilter = (items) => {
    if (!selectedCustomer) return items;
    return items.filter((sale) => {
      // numeric FK match (most reliable)
      if (sale.customer != null && selectedCustomer.id != null) {
        // use == (not ===) to handle string/number mismatch
        // eslint-disable-next-line eqeqeq
        if (sale.customer == selectedCustomer.id) return true;
      }
      // fallback: name match
      if (
        sale.customer_name &&
        selectedCustomer.name &&
        sale.customer_name.toLowerCase() === selectedCustomer.name.toLowerCase()
      ) return true;
      return false;
    });
  };

  // Filtered customers shown in dropdown — search against normalised .name
  const filteredCustomers = customerSearch.trim()
    ? allCustomers.filter((c) =>
        (c.name || '').toLowerCase().includes(customerSearch.toLowerCase())
      )
    : allCustomers;

  // Whether customer filter applies to this report type
  const customerFilterApplies = ['sales', 'outstanding_supplies', 'outstanding_balances'].includes(reportType);

  // ───────────────────────────────────────────────────────────────────────────
  // EXCEL EXPORT
  // ───────────────────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) { alert('No data to export.'); return; }

    const wb = XLSX.utils.book_new();

    if (reportType === 'sales') {
      const rows = [];
      reportData.forEach((sale) => {
        (sale.line_items || []).forEach((item, idx) => {
          rows.push({
            Date: idx === 0 ? formatSaleDate(sale) : '',
            'Sale Number': idx === 0 ? sale.sale_number : '',
            Customer: idx === 0 ? sale.customer_name : '',
            'LPO/Quote': idx === 0 ? (sale.lpo_quotation_number || '-') : '',
            'Product Name': item.product_name,
            'Qty Supplied': item.quantity_supplied,
            'Total Amount (KES)': idx === 0 ? parseFloat(sale.total_amount) || 0 : '',
            'Amount Paid (KES)': idx === 0 ? parseFloat(sale.amount_paid) || 0 : '',
            'Outstanding Balance (KES)': idx === 0 ? parseFloat(sale.outstanding_balance) || 0 : '',
            Salesperson: idx === 0 ? (sale.salesperson || '—') : '',
            'Mode of Payment': idx === 0 ? sale.mode_of_payment : '',
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    }

    else if (reportType === 'stock') {
      const grouped = groupStockProducts(reportData);
      const rows = [];
      Object.entries(grouped).forEach(([catName, subcats]) => {
        Object.entries(subcats).forEach(([subcatName, groups]) => {
          Object.entries(groups).forEach(([groupName, products]) => {
            products.forEach((p) => {
              rows.push({
                Category: catName,
                Subcategory: subcatName,
                Group: groupName,
                'Product Code': p.code,
                'Product Name': p.name,
                'Current Stock': p.current_stock,
                'Minimum Stock': p.minimum_stock || 0,
                Status: (p.current_stock || 0) <= (p.minimum_stock || 0) ? 'Low Stock' : 'In Stock',
              });
            });
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Report');
    }

    else if (reportType === 'outstanding_supplies') {
      const rows = [];
      reportData.forEach((sale) => {
        (sale.line_items || [])
          .filter((item) => item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied')
          .forEach((item) => {
            const outstanding = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
            const payStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
            rows.push({
              Date: formatSaleDate(sale),
              'Sale Number': sale.sale_number,
              Customer: sale.customer_name,
              'LPO/Quote': sale.lpo_quotation_number || '-',
              'Product Name': item.product_name,
              'Qty Ordered': item.quantity_ordered,
              'Qty Supplied': item.quantity_supplied,
              'Outstanding Qty': outstanding,
              'Payment Status': payStatus,
            });
          });
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Supplies');
    }

    else if (reportType === 'outstanding_balances') {
      const customerGroups = groupSalesByCustomer(reportData);
      const rows = [];
      customerGroups.forEach((group) => {
        group.sales.forEach((sale) => {
          rows.push({
            Customer: group.customerName,
            Date: formatSaleDate(sale),
            'Sale Number': sale.sale_number,
            'LPO/Quote': sale.lpo_quotation_number || '-',
            Products: (sale.line_items || []).map((i) => `${i.product_name} (${i.quantity_supplied}/${i.quantity_ordered})`).join('; '),
            'Total Amount (KES)': parseFloat(sale.total_amount) || 0,
            'Amount Paid (KES)': parseFloat(sale.amount_paid) || 0,
            'Outstanding Balance (KES)': parseFloat(sale.outstanding_balance) || 0,
          });
        });
        rows.push({
          Customer: `TOTAL — ${group.customerName}`,
          Date: '', 'Sale Number': '', 'LPO/Quote': '', Products: '',
          'Total Amount (KES)': '',
          'Amount Paid (KES)': '',
          'Outstanding Balance (KES)': group.totalOutstanding,
        });
        rows.push({});
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Balances');
    }

    XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // PDF EXPORT
  // ───────────────────────────────────────────────────────────────────────────
  const exportToPDF = () => {
    if (!reportData || reportData.length === 0) { alert('No data to export.'); return; }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const BLUE_DARK    = [30,  64,  175];
    const BLUE_MID     = [37,  99,  235];
    const SLATE_800    = [30,  41,  59 ];
    const SLATE_600    = [71,  85,  105];
    const SLATE_300    = [203, 213, 225];
    const SLATE_50     = [248, 250, 252];
    const WHITE        = [255, 255, 255];
    const RED          = [220, 38,  38 ];
    const GREEN_DARK   = [21,  128, 61 ];
    const GREEN_BG     = [220, 252, 231];
    const AMBER_DARK   = [180, 83,  9  ];
    const AMBER_BG     = [254, 243, 199];
    const RED_BG       = [254, 226, 226];
    const SALE_BG_EVEN = [255, 255, 255];
    const SALE_BG_ODD  = [241, 245, 249];
    const DIVIDER      = [30,  64,  175];

    const customerSuffix = selectedCustomer ? ` — ${selectedCustomer.name}` : '';
    const title      = getReportTitle() + customerSuffix;
    const exportDate = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

    const HEADER_H = 44;
    const FOOTER_H = 24;
    const MARGIN   = { top: HEADER_H + 16, right: 30, bottom: FOOTER_H + 12, left: 30 };

    // ── Draw header & footer — called only in the final page-number pass ──────
    const drawPageHeader = (pageNum, totalPages) => {
      doc.setFillColor(...BLUE_DARK);
      doc.rect(0, 0, pageWidth, HEADER_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...WHITE);
      doc.text(title, 40, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${exportDate}`, pageWidth - 40, 18, { align: 'right' });
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 40, 32, { align: 'right' });
      doc.setDrawColor(...SLATE_300);
      doc.setLineWidth(0.5);
      doc.line(0, HEADER_H, pageWidth, HEADER_H);
    };

    const drawPageFooter = () => {
      doc.setFillColor(...SLATE_50);
      doc.rect(0, pageHeight - FOOTER_H, pageWidth, FOOTER_H, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_600);
      doc.text('CONFIDENTIAL — For internal use only', 40, pageHeight - 8);
    };

    // ── Shared table config — NO didDrawPage here (avoids double-draw) ────────
    const baseTableStyles = {
      margin: MARGIN,
      tableLineColor: SLATE_300,
      tableLineWidth: 0.75,
      headStyles: {
        fillColor: BLUE_DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8,
        cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
        lineWidth: 0.75, lineColor: SLATE_300, valign: 'middle',
      },
      bodyStyles: {
        fontSize: 8, textColor: SLATE_800,
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
        lineWidth: 0.75, lineColor: SLATE_300, valign: 'middle',
      },
      alternateRowStyles: { fillColor: SLATE_50 },
    };

    // ── SALES REPORT ──────────────────────────────────────────────────────────
    if (reportType === 'sales') {
      const rows = [];
      reportData.forEach((sale, saleIdx) => {
        const items = sale.line_items || [];
        const displayDate = formatSaleDate(sale);
        items.forEach((item, idx) => {
          rows.push({
            date: idx === 0 ? displayDate : '',
            customer: idx === 0 ? sale.customer_name : '',
            product: item.product_name,
            qtySupplied: item.quantity_supplied,
            total: idx === 0 ? `KES ${formatCurrency(sale.total_amount)}` : '',
            paid: idx === 0 ? `KES ${formatCurrency(sale.amount_paid)}` : '',
            balance: idx === 0 ? `KES ${formatCurrency(sale.outstanding_balance)}` : '',
            salesperson: idx === 0 ? (sale.salesperson || '—') : '',
            payment: idx === 0 ? sale.mode_of_payment : '',
            _balance: idx === 0 ? parseFloat(sale.outstanding_balance || 0) : null,
            _payment: idx === 0 ? sale.mode_of_payment : null,
            _saleIdx: saleIdx, _isFirst: idx === 0, _isLast: idx === items.length - 1,
          });
        });
      });

      autoTable(doc, {
        ...baseTableStyles,
        startY: MARGIN.top,
        head: [['Date', 'Customer', 'Product Name', 'Qty Supplied', 'Total Amount', 'Amount Paid', 'Outstanding', 'Salesperson', 'Payment Mode']],
        body: rows.map(r => [r.date, r.customer, r.product, r.qtySupplied, r.total, r.paid, r.balance, r.salesperson, r.payment]),
        alternateRowStyles: {},
        columnStyles: {
          0: { cellWidth: 58 }, 1: { cellWidth: 90 }, 2: { cellWidth: 'auto' },
          3: { cellWidth: 50, halign: 'center' }, 4: { cellWidth: 72, halign: 'right' },
          5: { cellWidth: 72, halign: 'right' }, 6: { cellWidth: 72, halign: 'right' },
          7: { cellWidth: 70 }, 8: { cellWidth: 62, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const r = rows[data.row.index];
          data.cell.styles.fillColor = r._saleIdx % 2 === 0 ? SALE_BG_EVEN : SALE_BG_ODD;
          data.cell.styles.lineWidth = 0.3;
          data.cell.styles.lineColor = SLATE_300;
          if (data.column.index === 6 && r._balance !== null) {
            data.cell.styles.textColor = r._balance > 0 ? RED : [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 8 && r._payment !== null) {
            if (r._payment === 'Not Paid') {
              data.cell.styles.textColor = AMBER_DARK; data.cell.styles.fillColor = AMBER_BG;
            } else {
              data.cell.styles.textColor = GREEN_DARK; data.cell.styles.fillColor = GREEN_BG;
            }
            data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 7.5;
          }
        },
        didDrawCell: (data) => {
          if (data.section !== 'body') return;
          const r = rows[data.row.index];
          if (!r._isLast || data.row.index === rows.length - 1) return;
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(...DIVIDER); doc.setLineWidth(1.5);
          doc.line(x, y + height, x + width, y + height);
        },
      });

      // ── Sales grand total summary bar ─────────────────────────────────────
      const grandTotalAmount      = reportData.reduce((s, sale) => s + (parseFloat(sale.total_amount)        || 0), 0);
      const grandTotalPaid        = reportData.reduce((s, sale) => s + (parseFloat(sale.amount_paid)         || 0), 0);
      const grandTotalOutstanding = reportData.reduce((s, sale) => s + (parseFloat(sale.outstanding_balance) || 0), 0);

      const BAR_H   = 36;
      const summaryY = doc.lastAutoTable.finalY + 10;
      const safeY    = summaryY + BAR_H > pageHeight - MARGIN.bottom
        ? (doc.addPage(), MARGIN.top)
        : summaryY;

      const barW = pageWidth - MARGIN.left - MARGIN.right;

      // Dark background bar
      doc.setFillColor(15, 23, 42);
      doc.rect(MARGIN.left, safeY, barW, BAR_H, 'F');

      // Divide the bar into four equal sections:
      // [REPORT TOTALS label] [Total Amount] [Amount Paid] [Outstanding]
      const sectionW = barW / 4;
      const midY     = safeY + BAR_H / 2;   // vertical centre of bar

      // Helper: draw a label + value pair centred in a section
      const drawSection = (sectionIndex, label, value, valueColor) => {
        const sectionX = MARGIN.left + sectionIndex * sectionW;
        const centreX  = sectionX + sectionW / 2;

        // Small label above centre
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(label, centreX, midY - 5, { align: 'center' });

        // Bold value below centre
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...valueColor);
        doc.text(value, centreX, midY + 7, { align: 'center' });
      };

      // Section 0 — title + sale count
      const centreX0 = MARGIN.left + sectionW / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text('REPORT TOTALS', centreX0, midY - 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${reportData.length} sale${reportData.length !== 1 ? 's' : ''}`, centreX0, midY + 7, { align: 'center' });

      // Thin vertical dividers between sections
      doc.setDrawColor(71, 85, 105); // slate-600
      doc.setLineWidth(0.5);
      [1, 2, 3].forEach(i => {
        const x = MARGIN.left + i * sectionW;
        doc.line(x, safeY + 6, x, safeY + BAR_H - 6);
      });

      // Section 1 — Total Amount
      drawSection(1, 'TOTAL AMOUNT', `KES ${formatCurrency(grandTotalAmount)}`, WHITE);
      // Section 2 — Amount Paid
      drawSection(2, 'AMOUNT PAID', `KES ${formatCurrency(grandTotalPaid)}`, [134, 239, 172]);
      // Section 3 — Outstanding
      drawSection(3, 'OUTSTANDING', `KES ${formatCurrency(grandTotalOutstanding)}`, [252, 165, 165]);
    }

    // ── STOCK REPORT ──────────────────────────────────────────────────────────
    else if (reportType === 'stock') {
      const grouped = groupStockProducts(reportData);
      let isFirstGroup = true;

      Object.entries(grouped).forEach(([catName, subcats]) => {
        Object.entries(subcats).forEach(([subcatName, groups]) => {
          Object.entries(groups).forEach(([groupName, products]) => {
            const currentY = isFirstGroup
              ? MARGIN.top
              : (doc.lastAutoTable ? doc.lastAutoTable.finalY : MARGIN.top);

            const minSpaceNeeded = 80;
            let labelY;

            if (!isFirstGroup && currentY + minSpaceNeeded > pageHeight - MARGIN.bottom) {
              doc.addPage();
              labelY = MARGIN.top;
            } else {
              labelY = isFirstGroup ? MARGIN.top : currentY + 14;
            }

            isFirstGroup = false;

            doc.setFillColor(...BLUE_DARK);
            doc.rect(MARGIN.left, labelY, pageWidth - MARGIN.left - MARGIN.right, 20, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...WHITE);
            doc.text(catName.toUpperCase(), MARGIN.left + 8, labelY + 13);

            const subcatY = labelY + 26;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...SLATE_600);
            doc.text(subcatName.toUpperCase(), MARGIN.left + 4, subcatY);
            doc.setDrawColor(...SLATE_300);
            doc.setLineWidth(0.4);
            doc.line(MARGIN.left, subcatY + 3, pageWidth - MARGIN.right, subcatY + 3);

            const grpY = subcatY + 14;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...BLUE_MID);
            doc.text(`${groupName}  (${products.length} product${products.length !== 1 ? 's' : ''})`, MARGIN.left + 4, grpY);

            autoTable(doc, {
              ...baseTableStyles,
              startY: grpY + 8,
              head: [['Product Code', 'Product Name', 'Current Stock', 'Min Stock', 'Status']],
              body: products.map(p => [
                p.code,
                p.name,
                p.current_stock,
                p.minimum_stock || 0,
                (p.current_stock || 0) <= (p.minimum_stock || 0) ? 'Low Stock' : 'In Stock',
              ]),
              columnStyles: {
                0: { cellWidth: 90, fontStyle: 'bold', textColor: SLATE_600, font: 'courier' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 80, halign: 'center' },
                3: { cellWidth: 70, halign: 'center' },
                4: { cellWidth: 80, halign: 'center' },
              },
              didParseCell: (data) => {
                if (data.section !== 'body' || data.column.index !== 4) return;
                const isLow = data.cell.raw === 'Low Stock';
                data.cell.styles.textColor = isLow ? [185, 28, 28] : GREEN_DARK;
                data.cell.styles.fillColor = isLow ? RED_BG : GREEN_BG;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7.5;
              },
            });
          });
        });
      });
    }

    // ── OUTSTANDING SUPPLIES REPORT ───────────────────────────────────────────
    else if (reportType === 'outstanding_supplies') {
      const rows = [];
      reportData.forEach(sale => {
        (sale.line_items || []).filter(item =>
          item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied'
        ).forEach(item => {
          const outstanding = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
          const payStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
          rows.push([formatSaleDate(sale), sale.sale_number, sale.customer_name, sale.lpo_quotation_number || '-', item.product_name, item.quantity_ordered, item.quantity_supplied, outstanding, payStatus]);
        });
      });
      autoTable(doc, {
        ...baseTableStyles,
        startY: MARGIN.top,
        head: [['Date', 'Sale No.', 'Customer', 'LPO / Quote', 'Product Name', 'Qty Ordered', 'Qty Supplied', 'Outstanding', 'Payment']],
        body: rows,
        columnStyles: {
          0: { cellWidth: 60 }, 1: { cellWidth: 65, fontStyle: 'bold', textColor: BLUE_MID },
          2: { cellWidth: 90 }, 3: { cellWidth: 72 }, 4: { cellWidth: 'auto' },
          5: { cellWidth: 58, halign: 'center' }, 6: { cellWidth: 58, halign: 'center' },
          7: { cellWidth: 58, halign: 'center', fontStyle: 'bold', textColor: RED },
          8: { cellWidth: 58, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 8) return;
          const isPending = data.cell.raw === 'Pending';
          data.cell.styles.textColor = isPending ? AMBER_DARK : GREEN_DARK;
          data.cell.styles.fillColor = isPending ? AMBER_BG : GREEN_BG;
          data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 7.5;
        },
      });
    }

    // ── OUTSTANDING BALANCES REPORT — grouped by customer ────────────────────
    else if (reportType === 'outstanding_balances') {
      const customerGroups = groupSalesByCustomer(reportData);
      let startY = MARGIN.top;

      customerGroups.forEach((group) => {
        const bannerY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : startY;
        const safeBannerY = bannerY > pageHeight - 80 ? (doc.addPage(), MARGIN.top) : bannerY;

        doc.setFillColor(37, 99, 235);
        doc.rect(MARGIN.left, safeBannerY, pageWidth - MARGIN.left - MARGIN.right, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text(group.customerName.toUpperCase(), MARGIN.left + 8, safeBannerY + 13);
        doc.text(`Total Outstanding: KES ${formatCurrency(group.totalOutstanding)}`, pageWidth - MARGIN.right - 4, safeBannerY + 13, { align: 'right' });

        const tableRows = group.sales.map(sale => [
          formatSaleDate(sale),
          sale.sale_number,
          sale.lpo_quotation_number || '-',
          (sale.line_items || []).map(i => `${i.product_name} (${i.quantity_supplied}/${i.quantity_ordered})`).join('\n'),
          `KES ${formatCurrency(sale.total_amount)}`,
          `KES ${formatCurrency(sale.amount_paid)}`,
          `KES ${formatCurrency(sale.outstanding_balance)}`,
        ]);

        tableRows.push(['', '', '', 'CUSTOMER TOTAL', '', '', `KES ${formatCurrency(group.totalOutstanding)}`]);

        autoTable(doc, {
          ...baseTableStyles,
          startY: safeBannerY + 24,
          head: [['Date', 'Sale No.', 'LPO/Quote', 'Products', 'Total Amount', 'Amount Paid', 'Outstanding']],
          body: tableRows,
          columnStyles: {
            0: { cellWidth: 64 },
            1: { cellWidth: 68, fontStyle: 'bold', textColor: BLUE_MID },
            2: { cellWidth: 72 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 80, halign: 'right' },
            5: { cellWidth: 80, halign: 'right' },
            6: { cellWidth: 80, halign: 'right', fontStyle: 'bold', textColor: RED },
          },
          didParseCell: (data) => {
            if (data.section !== 'body') return;
            if (data.row.index === tableRows.length - 1) {
              data.cell.styles.fillColor = BLUE_DARK;
              data.cell.styles.textColor = WHITE;
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = 8.5;
            }
          },
        });
      });

      const grandTotal = reportData.reduce((sum, s) => sum + parseFloat(s.outstanding_balance || 0), 0);
      const gtY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : MARGIN.top;
      if (gtY < pageHeight - 40) {
        doc.setFillColor(15, 23, 42);
        doc.rect(MARGIN.left, gtY, pageWidth - MARGIN.left - MARGIN.right, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE);
        doc.text('GRAND TOTAL — ALL CUSTOMERS', MARGIN.left + 8, gtY + 14);
        doc.text(`KES ${formatCurrency(grandTotal)}`, pageWidth - MARGIN.right - 4, gtY + 14, { align: 'right' });
      }
    }

    // ── FINAL PASS: stamp correct page numbers on every page ─────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawPageHeader(p, totalPages);
      drawPageFooter();
    }

    doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catData = await api.getCategories();
        setCategories(catData?.results || catData || []);
      } catch (error) { console.error('Error loading categories:', error); }
    };
    loadCategories();
  }, []);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const applyDateFilter = (items) => {
    if (!dateRange.start_date && !dateRange.end_date) return items;
    const parseFilterDate = (str) => {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = dateRange.start_date ? parseFilterDate(dateRange.start_date) : null;
    const end = dateRange.end_date ? (() => {
      const d = parseFilterDate(dateRange.end_date);
      d.setHours(23, 59, 59, 999);
      return d;
    })() : null;
    return items.filter(item => {
      const saleDate = parseSaleDate(item);
      if (!saleDate) return true;
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      return true;
    });
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let data;
      switch (reportType) {
        case 'sales': {
          const raw = await api.getSales();
          const all = Array.isArray(raw) ? raw : (raw?.results || []);
          data = all.filter(sale => sale.status !== 'rejected');
          break;
        }
        case 'stock': {
          const raw = await api.getProducts();
          data = Array.isArray(raw) ? raw : (raw?.results || []);
          break;
        }
        case 'outstanding_supplies': {
          const salesData = await api.getSales();
          const allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
          data = allSales.filter(sale =>
            sale.status !== 'rejected' &&
            sale.line_items && sale.line_items.some(item =>
              item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied'
            )
          );
          break;
        }
        case 'outstanding_balances': {
          const allSalesData = await api.getSales();
          const salesList = Array.isArray(allSalesData) ? allSalesData : (allSalesData?.results || []);
          data = salesList.filter(sale =>
            sale.status !== 'rejected' &&
            parseFloat(sale.outstanding_balance || 0) > 0
          );
          break;
        }
        default: data = [];
      }
      if (reportType !== 'stock') {
        data = applyDateFilter(data);
        data = applyCustomerFilter(data);
      }
      setReportData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generateReport(); }, [reportType]);

  const groupStockProducts = (products) => {
    const grouped = {};
    const filteredProducts = stockCategoryFilter === 'all'
      ? products
      : products.filter(p => p.category === parseInt(stockCategoryFilter));
    filteredProducts.forEach(product => {
      const catName = product.category_name || 'Uncategorized';
      const subcatName = product.subcategory_name || 'Uncategorized';
      const groupName = product.subsubcategory_name || 'Ungrouped';
      if (!grouped[catName]) grouped[catName] = {};
      if (!grouped[catName][subcatName]) grouped[catName][subcatName] = {};
      if (!grouped[catName][subcatName][groupName]) grouped[catName][subcatName][groupName] = [];
      grouped[catName][subcatName][groupName].push(product);
    });
    return grouped;
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'sales': return 'Sales Report';
      case 'stock': return 'Stock Report';
      case 'outstanding_supplies': return 'Outstanding Supplies';
      case 'outstanding_balances': return 'Outstanding Balances';
      default: return 'Report';
    }
  };

  const getReportStats = () => {
    if (!reportData || reportData.length === 0) return null;
    if (reportType === 'stock') {
      const filteredProducts = stockCategoryFilter === 'all'
        ? reportData
        : reportData.filter(p => p.category === parseInt(stockCategoryFilter));
      const totalProducts = filteredProducts.length;
      const lowStock = filteredProducts.filter(p => (p.current_stock || 0) <= (p.minimum_stock || 0)).length;
      const inStock = totalProducts - lowStock;
      return { 'Total Products': totalProducts, 'In Stock': inStock, 'Low Stock': lowStock };
    }
    return null;
  };

  const stats = getReportStats();
  const hasData = reportData && reportData.length > 0;

  return (
    <div className={styles.reportsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSubtitle}>Generate comprehensive business reports</p>
        </div>
      </div>

      <div className={styles.controlPanel}>
        {/* Row 1: Report type + Date filters + Customer filter */}
        <div className={styles.filtersRow}>
          <div className={styles.reportSelector}>
            <label className={styles.label}>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setStockCategoryFilter('all');
                setSelectedCustomer(null);
                setCustomerSearch('');
              }}
              className={styles.select}
            >
              <option value="sales">Sales Report</option>
              <option value="stock">Stock Report</option>
              <option value="outstanding_supplies">Outstanding Supplies</option>
              <option value="outstanding_balances">Outstanding Balances</option>
            </select>
          </div>

          <div className={styles.dateRange}>
            <div className={styles.dateInput}>
              <label className={styles.label}>Start Date</label>
              <input type="date" name="start_date" value={dateRange.start_date} onChange={handleDateChange} className={styles.input} />
            </div>
            <div className={styles.dateInput}>
              <label className={styles.label}>End Date</label>
              <input type="date" name="end_date" value={dateRange.end_date} onChange={handleDateChange} className={styles.input} />
            </div>
          </div>

          {/* ── Customer filter — only for non-stock reports ── */}
          {customerFilterApplies && (
            <div className={styles.customerFilterWrapper} ref={customerDropdownRef}>
              <label className={styles.label}>Filter by Customer</label>
              <div className={styles.customerInputRow}>
                <input
                  type="text"
                  className={`${styles.input} ${styles.customerInput}`}
                  placeholder="Search customers…"
                  value={customerSearch}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerDropdownOpen(true);
                    // Clear selection when user edits text
                    if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                      setSelectedCustomer(null);
                    }
                  }}
                />
                {selectedCustomer && (
                  <button
                    className={styles.clearCustomerBtn}
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                    title="Clear customer filter"
                  >✕</button>
                )}
              </div>
              {customerDropdownOpen && filteredCustomers.length > 0 && (
                <div className={styles.customerDropdown}>
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      className={`${styles.customerDropdownItem} ${selectedCustomer?.id === c.id ? styles.customerDropdownItemActive : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedCustomer({ id: c.id, name: c.name });
                        setCustomerSearch(c.name);
                        setCustomerDropdownOpen(false);
                      }}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Action buttons — Print removed */}
        <div className={styles.actionButtonsRow}>
          <button onClick={generateReport} className={styles.generateBtn} disabled={loading}>
            {loading ? (<><span className={styles.spinner}></span>Generating...</>) : (<><span className={styles.btnIcon}>📊</span>Generate Report</>)}
          </button>
          <button onClick={exportToPDF} className={styles.exportBtn} disabled={loading || !hasData}>
            <span className={styles.btnIcon}>📄</span>Export PDF
          </button>
          <button onClick={exportToExcel} className={styles.exportExcelBtn} disabled={loading || !hasData}>
            <span className={styles.btnIcon}>📗</span>Export Excel
          </button>
        </div>

        {/* Active customer filter badge */}
        {selectedCustomer && (
          <div className={styles.activeFilterBadge}>
            <span className={styles.activeFilterLabel}>Filtered by customer:</span>
            <span className={styles.activeFilterValue}>{selectedCustomer.name}</span>
            <button
              className={styles.activeFilterClear}
              onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
            >✕ Clear</button>
          </div>
        )}
      </div>

      {reportType === 'stock' && (
        <div className={styles.categoryFilterBar}>
          <button onClick={() => setStockCategoryFilter('all')} className={stockCategoryFilter === 'all' ? styles.categoryActive : styles.categoryButton}>ALL CATEGORIES</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setStockCategoryFilter(cat.id.toString())} className={stockCategoryFilter === cat.id.toString() ? styles.categoryActive : styles.categoryButton}>
              {cat.name.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {stats && (
        <div className={styles.statsGrid}>
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} className={styles.statCard}>
              <div className={styles.statLabel}>{label}</div>
              <div className={styles.statValue}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.reportCard} id="printable-report">
        <div className={styles.reportHeader}>
          <h2 className={styles.reportTitle}>
            {getReportTitle()}
            {selectedCustomer && <span className={styles.reportCustomerTag}> — {selectedCustomer.name}</span>}
          </h2>
          {hasData && (
            <div className={styles.recordCount}>
              {reportType === 'stock' && stockCategoryFilter !== 'all'
                ? `${reportData.filter(p => p.category === parseInt(stockCategoryFilter)).length} records`
                : `${reportData.length} ${reportData.length === 1 ? 'record' : 'records'}`}
            </div>
          )}
        </div>

        <div className={styles.reportBody}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Generating report...</p>
            </div>
          ) : !hasData ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyText}>No data available for this report</p>
              <p className={styles.emptySubtext}>
                {selectedCustomer
                  ? `No records found for ${selectedCustomer.name}. Try a different customer or clear the filter.`
                  : (dateRange.start_date || dateRange.end_date)
                    ? 'No records found in the selected date range. Try adjusting your dates.'
                    : 'Try adjusting your filters or date range'}
              </p>
            </div>
          ) : (
            <div className={styles.reportContent}>

              {/* ── SALES REPORT ────────────────────────────────────────── */}
              {reportType === 'sales' && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th><th>Sale Number</th><th>Customer</th><th>LPO/Quote</th>
                        <th>Product Name</th><th>Quantity Supplied</th><th>Total Amount</th>
                        <th>Amount Paid</th><th>Outstanding Balance</th><th>Salesperson</th><th>Mode of Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.flatMap(sale =>
                        (sale.line_items || []).map((item, idx) => (
                          <tr key={`${sale.id}-${idx}`}>
                            {idx === 0 && (
                              <>
                                <td rowSpan={sale.line_items.length}>{formatSaleDate(sale)}</td>
                                <td rowSpan={sale.line_items.length} className={styles.saleNumber}>{sale.sale_number}</td>
                                <td rowSpan={sale.line_items.length}>{sale.customer_name}</td>
                                <td rowSpan={sale.line_items.length}>{sale.lpo_quotation_number || '-'}</td>
                              </>
                            )}
                            <td className={styles.productName}>{item.product_name}</td>
                            <td className={styles.stockQuantity}>{item.quantity_supplied}</td>
                            {idx === 0 && (
                              <>
                                <td rowSpan={sale.line_items.length} className={styles.amount}>KES {formatCurrency(sale.total_amount)}</td>
                                <td rowSpan={sale.line_items.length} className={styles.amount}>KES {formatCurrency(sale.amount_paid)}</td>
                                <td rowSpan={sale.line_items.length}>
                                  <span className={parseFloat(sale.outstanding_balance) > 0 ? styles.textDanger : styles.textSuccess}>
                                    KES {formatCurrency(sale.outstanding_balance)}
                                  </span>
                                </td>
                                <td rowSpan={sale.line_items.length}>
                                  {sale.salesperson || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>}
                                </td>
                                <td rowSpan={sale.line_items.length}>
                                  <span className={`${styles.badge} ${sale.mode_of_payment === 'Not Paid' ? styles.badgeWarning : styles.badgeSuccess}`}>
                                    {sale.mode_of_payment}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── STOCK REPORT ─────────────────────────────────────────── */}
              {reportType === 'stock' && (() => {
                const grouped = groupStockProducts(reportData);
                return (
                  <div className={styles.stockReport}>
                    {Object.entries(grouped).map(([catName, subcats]) => (
                      <div key={catName} className={styles.categorySection}>
                        <div className={styles.categoryHeader}>
                          <h3 className={styles.categoryTitle}>{catName}</h3>
                        </div>
                        {Object.entries(subcats).map(([subcatName, groups]) => (
                          <div key={subcatName} className={styles.subcategorySection}>
                            <div className={styles.subcategoryHeader}>
                              <h4 className={styles.subcategoryTitle}>{subcatName}</h4>
                            </div>
                            {Object.entries(groups).map(([groupName, products]) => (
                              <div key={groupName} className={styles.groupSection}>
                                <div className={styles.groupHeader}>
                                  <h5 className={styles.groupTitle}>{groupName}</h5>
                                  <span className={styles.groupCount}>{products.length} products</span>
                                </div>
                                <div className={styles.tableWrapper}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th>Product Code</th><th>Product Name</th>
                                        <th>Current Stock</th><th>Minimum Stock</th><th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {products.map(product => (
                                        <tr key={product.id}>
                                          <td className={styles.productCode}>{product.code}</td>
                                          <td className={styles.productName}>{product.name}</td>
                                          <td className={styles.stockQuantity}>{product.current_stock}</td>
                                          <td className={styles.stockQuantity}>{product.minimum_stock || 0}</td>
                                          <td>
                                            <span className={`${styles.badge} ${(product.current_stock || 0) <= (product.minimum_stock || 0) ? styles.badgeDanger : styles.badgeSuccess}`}>
                                              {(product.current_stock || 0) <= (product.minimum_stock || 0) ? 'Low Stock' : 'In Stock'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── OUTSTANDING SUPPLIES ─────────────────────────────────── */}
              {reportType === 'outstanding_supplies' && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th><th>Sale Number</th><th>Customer</th><th>LPO/Quote</th>
                        <th>Product Name</th><th>Quantity Ordered</th><th>Quantity Supplied</th>
                        <th>Outstanding Supplies</th><th>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map(sale =>
                        (sale.line_items || []).filter(item =>
                          item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied'
                        ).map((item, idx) => {
                          const outstandingQty = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
                          const paymentStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
                          return (
                            <tr key={`${sale.id}-${idx}`}>
                              <td>{formatSaleDate(sale)}</td>
                              <td className={styles.saleNumber}>{sale.sale_number}</td>
                              <td>{sale.customer_name}</td>
                              <td>{sale.lpo_quotation_number || '-'}</td>
                              <td className={styles.productName}>{item.product_name}</td>
                              <td className={styles.stockQuantity}>{item.quantity_ordered}</td>
                              <td className={styles.stockQuantity}>{item.quantity_supplied}</td>
                              <td className={styles.outstandingQty}>{outstandingQty}</td>
                              <td>
                                <span className={`${styles.badge} ${paymentStatus === 'Paid' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                  {paymentStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── OUTSTANDING BALANCES — grouped by customer ────────────── */}
              {reportType === 'outstanding_balances' && (() => {
                const customerGroups = groupSalesByCustomer(reportData);
                const grandTotal = reportData.reduce((sum, s) => sum + parseFloat(s.outstanding_balance || 0), 0);

                return (
                  <div className={styles.outstandingBalancesReport}>
                    {customerGroups.map((group) => (
                      <div key={group.customerId} className={styles.customerBalanceSection}>
                        <div className={styles.customerBalanceHeader}>
                          <div className={styles.customerBalanceNameBlock}>
                            <span className={styles.customerBalanceName}>{group.customerName}</span>
                            <span className={styles.customerBalanceMeta}>
                              {group.sales.length} {group.sales.length === 1 ? 'invoice' : 'invoices'}
                            </span>
                          </div>
                          <div className={styles.customerBalanceTotalBlock}>
                            <span className={styles.customerBalanceTotalLabel}>Total Outstanding</span>
                            <span className={styles.customerBalanceTotalValue}>
                              KES {formatCurrency(group.totalOutstanding)}
                            </span>
                          </div>
                        </div>

                        <div className={styles.tableWrapper}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Sale Number</th>
                                <th>LPO/Quote</th>
                                <th>Products</th>
                                <th>Total Amount</th>
                                <th>Amount Paid</th>
                                <th>Outstanding Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.sales.map(sale => (
                                <tr key={sale.id}>
                                  <td>{formatSaleDate(sale)}</td>
                                  <td className={styles.saleNumber}>{sale.sale_number}</td>
                                  <td>{sale.lpo_quotation_number || '-'}</td>
                                  <td>
                                    <div className={styles.productList}>
                                      {(sale.line_items || []).map((item, idx) => (
                                        <div key={idx} className={styles.productItem}>
                                          {item.product_name}
                                          <span className={styles.productQty}>
                                            &nbsp;({item.quantity_supplied}/{item.quantity_ordered})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className={styles.amount}>KES {formatCurrency(sale.total_amount)}</td>
                                  <td className={styles.amount}>KES {formatCurrency(sale.amount_paid)}</td>
                                  <td className={styles.outstandingAmount}>
                                    KES {formatCurrency(sale.outstanding_balance)}
                                  </td>
                                </tr>
                              ))}
                              <tr className={styles.customerSubtotalRow}>
                                <td colSpan={6} className={styles.customerSubtotalLabel}>
                                  Customer Total — {group.customerName}
                                </td>
                                <td className={styles.customerSubtotalValue}>
                                  KES {formatCurrency(group.totalOutstanding)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}

                    <div className={styles.grandTotalBar}>
                      <span className={styles.grandTotalLabel}>Grand Total — All Customers</span>
                      <span className={styles.grandTotalValue}>KES {formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;