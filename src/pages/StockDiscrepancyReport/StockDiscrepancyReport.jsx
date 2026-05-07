// src/pages/StockDiscrepancyReport/StockDiscrepancyReport.jsx
import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../utils/api';
import styles from './StockDiscrepancyReport.module.css';

const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

const currentDate = new Date();

// ── Group flat results into category → subcategory → [products] ──────────────
const groupResults = (results) => {
  const grouped = {};
  results.forEach((r) => {
    const cat    = r.category    || 'Uncategorized';
    const subcat = r.subcategory || 'Uncategorized';
    if (!grouped[cat])         grouped[cat] = {};
    if (!grouped[cat][subcat]) grouped[cat][subcat] = [];
    grouped[cat][subcat].push(r);
  });
  return grouped;
};

const StockDiscrepancyReport = () => {
  const [month, setMonth]   = useState(currentDate.getMonth() + 1);
  const [year,  setYear]    = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [report,  setReport]  = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await api.getStockDiscrepancy(month, year);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  // ── PDF EXPORT ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!report?.results?.length) return;

    const monthLabel = MONTHS.find((m) => m.value === month)?.label;
    const title      = `Stock Discrepancy Report — ${monthLabel} ${year}`;
    const exportDate = new Date().toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const doc        = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const BLUE_DARK  = [30,  64,  175];
    const BLUE_MID   = [37,  99,  235];
    const SLATE_800  = [30,  41,  59 ];
    const SLATE_600  = [71,  85,  105];
    const SLATE_300  = [203, 213, 225];
    const SLATE_50   = [248, 250, 252];
    const WHITE      = [255, 255, 255];
    const RED        = [220, 38,  38 ];
    const GREEN_DARK = [21,  128, 61 ];
    const GREEN_BG   = [220, 252, 231];
    const RED_BG     = [254, 226, 226];

    const HEADER_H = 44;
    const FOOTER_H = 24;
    const MARGIN   = { top: HEADER_H + 16, right: 30, bottom: FOOTER_H + 12, left: 30 };

    const drawPageHeader = (pageNum, totalPages) => {
      doc.setFillColor(...BLUE_DARK);
      doc.rect(0, 0, pageWidth, HEADER_H, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...WHITE);
      doc.text(title, 40, 28);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${exportDate}`, pageWidth - 40, 18, { align: 'right' });
      doc.text(`Page ${pageNum} of ${totalPages}`,   pageWidth - 40, 32, { align: 'right' });
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
      didDrawPage: () => {
        const { pageNumber, pageCount } = doc.internal.getCurrentPageInfo();
        drawPageHeader(pageNumber, pageCount);
        drawPageFooter();
      },
    };

    // Summary banner right after header on first page
    const summaryY = MARGIN.top;
    const s = report.summary;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_600);
    const summaryText =
      `Products Checked: ${s.total_products_checked}   |   ` +
      `With Discrepancies: ${s.products_with_discrepancies}   |   ` +
      `Total Missing Units: ${s.total_missing_units}`;
    doc.setFillColor(...SLATE_50);
    doc.rect(MARGIN.left, summaryY, pageWidth - MARGIN.left - MARGIN.right, 18, 'F');
    doc.setDrawColor(...SLATE_300);
    doc.rect(MARGIN.left, summaryY, pageWidth - MARGIN.left - MARGIN.right, 18, 'S');
    doc.text(summaryText, MARGIN.left + 8, summaryY + 12);

    const grouped = groupResults(report.results);
    let isFirstGroup = true;

    Object.entries(grouped).forEach(([catName, subcats]) => {
      Object.entries(subcats).forEach(([subcatName, products]) => {
        const currentY = isFirstGroup
          ? summaryY + 26
          : (doc.lastAutoTable ? doc.lastAutoTable.finalY : MARGIN.top);

        const minSpaceNeeded = 80;
        let labelY;
        if (!isFirstGroup && currentY + minSpaceNeeded > pageHeight - MARGIN.bottom) {
          doc.addPage();
          labelY = MARGIN.top;
        } else {
          labelY = isFirstGroup ? summaryY + 26 : currentY + 14;
        }
        isFirstGroup = false;

        // Category banner
        doc.setFillColor(...BLUE_DARK);
        doc.rect(MARGIN.left, labelY, pageWidth - MARGIN.left - MARGIN.right, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text(catName.toUpperCase(), MARGIN.left + 8, labelY + 13);

        // Subcategory label
        const subcatY = labelY + 26;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...SLATE_600);
        doc.text(subcatName.toUpperCase(), MARGIN.left + 4, subcatY);
        doc.setDrawColor(...SLATE_300);
        doc.setLineWidth(0.4);
        doc.line(MARGIN.left, subcatY + 3, pageWidth - MARGIN.right, subcatY + 3);

        // Product count label
        const grpY = subcatY + 14;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...BLUE_MID);
        doc.text(
          `${products.length} product${products.length !== 1 ? 's' : ''}`,
          MARGIN.left + 4, grpY,
        );

        autoTable(doc, {
          ...baseTableStyles,
          startY: grpY + 8,
          head: [['Product Code', 'Product Name', 'Stock IN', 'Stock OUT', 'Expected Closing', 'Actual Closing', 'Discrepancy']],
          body: products.map((r) => [
            r.product_code,
            r.product_name,
            r.total_in,
            r.total_out,
            r.expected_closing,
            r.actual_closing,
            r.discrepancy > 0
              ? `-${r.discrepancy}`
              : r.discrepancy < 0
              ? `+${Math.abs(r.discrepancy)}`
              : '0',
          ]),
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'bold', textColor: BLUE_MID, font: 'courier' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 70, halign: 'center', textColor: [21, 128, 61] },
            3: { cellWidth: 70, halign: 'center', textColor: [220, 38, 38] },
            4: { cellWidth: 80, halign: 'center' },
            5: { cellWidth: 80, halign: 'center' },
            6: { cellWidth: 80, halign: 'center' },
          },
          didParseCell: (data) => {
            if (data.section !== 'body' || data.column.index !== 6) return;
            const val = String(data.cell.raw);
            if (val.startsWith('-')) {
              data.cell.styles.textColor = RED;
              data.cell.styles.fillColor = RED_BG;
              data.cell.styles.fontStyle = 'bold';
            } else if (val.startsWith('+')) {
              data.cell.styles.textColor = GREEN_DARK;
              data.cell.styles.fillColor = GREEN_BG;
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = SLATE_600;
              data.cell.styles.fontStyle = 'normal';
            }
          },
        });
      });
    });

    // Re-draw headers/footers on all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawPageHeader(p, totalPages);
      drawPageFooter();
    }

    doc.save(
      `stock-discrepancy-${MONTHS.find((m) => m.value === month)?.label}-${year}.pdf`,
    );
  };

  const yearOptions = [];
  for (let y = currentDate.getFullYear(); y >= currentDate.getFullYear() - 4; y--) {
    yearOptions.push(y);
  }

  const grouped = report?.results?.length ? groupResults(report.results) : null;

  return (
    <div className={styles.container}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock Discrepancy Report</h1>
          <p className={styles.pageSubtitle}>Compare expected vs actual closing stock per period</p>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controlPanel}>
        <div className={styles.filtersRow}>
          <div className={styles.controlGroup}>
            <label className={styles.label} htmlFor="month-select">Month</label>
            <select
              id="month-select"
              className={styles.select}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label} htmlFor="year-select">Year</label>
            <select
              id="year-select"
              className={styles.select}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.actionButtonsRow}>
          <button className={styles.runButton} onClick={fetchReport} disabled={loading}>
            {loading
              ? <><span className={styles.spinner}></span>Loading...</>
              : <><span className={styles.btnIcon}>📊</span>Run Report</>}
          </button>
          {report?.results?.length > 0 && (
            <button className={styles.exportButton} onClick={handleExportPDF}>
              <span className={styles.btnIcon}>📄</span>Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Summary cards */}
      {report && (
        <>
          <div className={styles.summaryCards}>
            <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
              <span className={styles.summaryValue}>{report.summary.total_products_checked}</span>
              <span className={styles.summaryLabel}>Products Checked</span>
            </div>
            <div className={`${styles.summaryCard} ${
              report.summary.products_with_discrepancies > 0
                ? styles.cardAmber
                : styles.cardGreen
            }`}>
              <span className={styles.summaryValue}>{report.summary.products_with_discrepancies}</span>
              <span className={styles.summaryLabel}>With Discrepancies</span>
            </div>
            <div className={`${styles.summaryCard} ${
              report.summary.total_missing_units > 0
                ? styles.cardRed
                : styles.cardGreen
            }`}>
              <span className={styles.summaryValue}>{report.summary.total_missing_units}</span>
              <span className={styles.summaryLabel}>Total Missing Units</span>
            </div>
          </div>

          {/* Grouped table */}
          {report.results.length === 0 ? (
            <div className={styles.emptyState}>
              No opening stock records found for{' '}
              {MONTHS.find((m) => m.value === report.month)?.label} {report.year}.
              Opening stock must be recorded first for this period.
            </div>
          ) : (
            <div className={styles.productsContainer}>
              {Object.entries(grouped).map(([catName, subcats]) => (
                <div key={catName} className={styles.categorySection}>
                  <h2 className={styles.categoryHeader}>{catName}</h2>

                  {Object.entries(subcats).map(([subcatName, products]) => (
                    <div key={subcatName} className={styles.subcategorySection}>
                      <h3 className={styles.subcategoryHeader}>{subcatName}</h3>

                      <div className={styles.productGroupSection}>
                        <div className={styles.groupMeta}>
                          <span className={styles.groupCount}>{products.length} product{products.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="card">
                          <div className="card-body">
                            <div className="table-container">
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Product Code</th>
                                    <th>Product Name</th>
                                    <th>Stock IN</th>
                                    <th>Stock OUT</th>
                                    <th>Expected Closing</th>
                                    <th>Actual Closing</th>
                                    <th>Discrepancy</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {products.map((row) => (
                                    <tr
                                      key={row.product_id}
                                      className={row.discrepancy !== 0 ? styles.rowHighlight : ''}
                                    >
                                      <td className={styles.productCode}>{row.product_code}</td>
                                      <td>{row.product_name}</td>
                                      <td className={styles.inCol}>+{row.total_in}</td>
                                      <td className={styles.outCol}>-{row.total_out}</td>
                                      <td className={styles.numCol}>{row.expected_closing}</td>
                                      <td className={styles.numCol}>{row.actual_closing}</td>
                                      <td className={styles.numCol}>
                                        <span className={
                                          row.discrepancy > 0
                                            ? styles.discrepancyNegative
                                            : row.discrepancy < 0
                                            ? styles.discrepancyPositive
                                            : styles.discrepancyZero
                                        }>
                                          {row.discrepancy > 0 ? '-' : row.discrepancy < 0 ? '+' : ''}
                                          {Math.abs(row.discrepancy)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockDiscrepancyReport;