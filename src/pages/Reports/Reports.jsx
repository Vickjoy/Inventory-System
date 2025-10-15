// src/pages/Reports/Reports.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './Reports.module.css';

const Reports = () => {
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let data;
      switch (reportType) {
        case 'sales':
          data = await api.getRecentSales(30);
          break;
        case 'stock':
          data = await api.getProducts();
          break;
        case 'customers':
          data = await api.getTopCustomers(10);
          break;
        case 'invoices':
          data = await api.getOutstandingInvoices();
          break;
        case 'lpos':
          data = await api.getPendingLPOs();
          break;
        default:
          data = [];
      }
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType]);

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(item => 
      Object.values(item).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className={styles.reportsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports</h1>
          <p className={styles.pageSubtitle}>Generate and export various reports</p>
        </div>
      </div>

      <div className={styles.controlPanel}>
        <div className={styles.reportSelector}>
          <label className={styles.label}>Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={styles.select}
          >
            <option value="sales">Sales Report</option>
            <option value="stock">Stock Report</option>
            <option value="customers">Top Customers</option>
            <option value="invoices">Outstanding Invoices</option>
            <option value="lpos">Pending LPOs</option>
          </select>
        </div>

        <div className={styles.dateRange}>
          <div className={styles.dateInput}>
            <label className={styles.label}>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={dateRange.start_date}
              onChange={handleDateChange}
              className={styles.input}
            />
          </div>
          <div className={styles.dateInput}>
            <label className={styles.label}>End Date</label>
            <input
              type="date"
              name="end_date"
              value={dateRange.end_date}
              onChange={handleDateChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={generateReport}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Generating...' : '📊 Generate Report'}
          </button>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            disabled={!reportData || reportData.length === 0}
          >
            📥 Export CSV
          </button>
          <button
            onClick={printReport}
            className="btn btn-outline"
            disabled={!reportData || reportData.length === 0}
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="spinner"></div>
              <p>Generating report...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <p className={styles.noData}>No data available for this report</p>
          ) : (
            <div className={styles.reportContent}>
              {reportType === 'sales' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(item => (
                      <tr key={item.id}>
                        <td>{item.invoice_number}</td>
                        <td>{item.customer_name}</td>
                        <td>KES {Number(item.total_amount).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${
                            item.status === 'Paid' ? 'badge-success' : 
                            item.status === 'Partial' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'stock' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Min Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(item => (
                      <tr key={item.id}>
                        <td>{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.category_name}</td>
                        <td>{item.current_stock}</td>
                        <td>{item.minimum_stock}</td>
                        <td>
                          <span className={`badge ${
                            item.current_stock <= item.minimum_stock ? 'badge-danger' : 'badge-success'
                          }`}>
                            {item.current_stock <= item.minimum_stock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'customers' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Total Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(item => (
                      <tr key={item.id}>
                        <td>{item.company_name}</td>
                        <td>KES {Number(item.total_sales || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'invoices' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(item => (
                      <tr key={item.id}>
                        <td>{item.invoice_number}</td>
                        <td>{item.customer_name}</td>
                        <td>KES {Number(item.total_amount).toLocaleString()}</td>
                        <td>KES {Number(item.paid_amount).toLocaleString()}</td>
                        <td>KES {Number(item.remaining_balance).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${item.status === 'Paid' ? 'success' : 'warning'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportType === 'lpos' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>LPO #</th>
                      <th>Supplier</th>
                      <th>Product</th>
                      <th>Ordered</th>
                      <th>Delivered</th>
                      <th>Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(item => (
                      <tr key={item.id}>
                        <td>{item.lpo_number}</td>
                        <td>{item.supplier_name}</td>
                        <td>{item.product_code}</td>
                        <td>{item.ordered_quantity}</td>
                        <td>{item.delivered_quantity}</td>
                        <td>{item.pending_quantity}</td>
                        <td>
                          <span className={`badge badge-${item.status === 'Completed' ? 'success' : 'warning'}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;