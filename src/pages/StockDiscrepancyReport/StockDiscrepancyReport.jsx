// src/pages/StockDiscrepancyReport/StockDiscrepancyReport.jsx
import { useState, useCallback } from 'react';
import api from '../../utils/api';
import styles from './StockDiscrepancyReport.module.css';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentDate = new Date();

const StockDiscrepancyReport = () => {
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

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

  const handleExportCSV = () => {
    if (!report?.results?.length) return;

    const headers = [
      'Product Code',
      'Product Name',
      'Category',
      'Subcategory',
      'Opening Stock',
      'Stock IN',
      'Stock OUT',
      'Expected Closing',
      'Actual Closing',
      'Discrepancy',
    ];

    const rows = report.results.map((r) => [
      r.product_code,
      `"${r.product_name}"`,
      r.category,
      r.subcategory,
      r.opening_stock,
      r.total_in,
      r.total_out,
      r.expected_closing,
      r.actual_closing,
      r.discrepancy,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `stock-discrepancy-${MONTHS.find((m) => m.value === month)?.label}-${year}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const yearOptions = [];
  for (let y = currentDate.getFullYear(); y >= currentDate.getFullYear() - 4; y--) {
    yearOptions.push(y);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Discrepancy Report</h1>
          
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="month-select">Month</label>
          <select
            id="month-select"
            className={styles.select}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
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
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          className={styles.runButton}
          onClick={fetchReport}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Run Report'}
        </button>

        {report?.results?.length > 0 && (
          <button className={styles.exportButton} onClick={handleExportCSV}>
            Export CSV
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Summary cards */}
      {report && (
        <>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryValue}>{report.summary.total_products_checked}</span>
              <span className={styles.summaryLabel}>Products Checked</span>
            </div>
            <div className={`${styles.summaryCard} ${report.summary.products_with_discrepancies > 0 ? styles.summaryCardWarning : styles.summaryCardOk}`}>
              <span className={styles.summaryValue}>{report.summary.products_with_discrepancies}</span>
              <span className={styles.summaryLabel}>With Discrepancies</span>
            </div>
            <div className={`${styles.summaryCard} ${report.summary.total_missing_units > 0 ? styles.summaryCardDanger : styles.summaryCardOk}`}>
              <span className={styles.summaryValue}>{report.summary.total_missing_units}</span>
              <span className={styles.summaryLabel}>Total Missing Units</span>
            </div>
          </div>

          {/* Table */}
          {report.results.length === 0 ? (
            <div className={styles.emptyState}>
              No opening stock records found for{' '}
              {MONTHS.find((m) => m.value === report.month)?.label} {report.year}.
              Opening stock must be recorded first for this period.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th className={styles.numCol}>Opening</th>
                    <th className={styles.numCol}>Stock IN</th>
                    <th className={styles.numCol}>Stock OUT</th>
                    <th className={styles.numCol}>Expected</th>
                    <th className={styles.numCol}>Actual</th>
                    <th className={styles.numCol}>Discrepancy</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((row) => (
                    <tr
                      key={row.product_id}
                      className={row.discrepancy !== 0 ? styles.rowHighlight : ''}
                    >
                      <td className={styles.codeCell}>{row.product_code}</td>
                      <td>{row.product_name}</td>
                      <td className={styles.categoryCell}>
                        <span>{row.category}</span>
                        {row.subcategory && (
                          <span className={styles.subcategory}>{row.subcategory}</span>
                        )}
                      </td>
                      <td className={styles.numCol}>{row.opening_stock}</td>
                      <td className={`${styles.numCol} ${styles.inCol}`}>+{row.total_in}</td>
                      <td className={`${styles.numCol} ${styles.outCol}`}>-{row.total_out}</td>
                      <td className={styles.numCol}>{row.expected_closing}</td>
                      <td className={styles.numCol}>{row.actual_closing}</td>
                      <td className={styles.numCol}>
                        <span
                          className={
                            row.discrepancy > 0
                              ? styles.discrepancyNegative
                              : row.discrepancy < 0
                              ? styles.discrepancyPositive
                              : styles.discrepancyZero
                          }
                        >
                          {row.discrepancy > 0 ? '-' : row.discrepancy < 0 ? '+' : ''}
                          {Math.abs(row.discrepancy)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockDiscrepancyReport;