// src/pages/Reports/Reports.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './Reports.module.css';
import companyLogo from '../../assets/Company_logo.webp';

const Reports = () => {
  const [reportType, setReportType] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-KE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

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
          data = await api.getSales();
          if (Array.isArray(data)) {
            // Already an array
          } else if (data && data.results) {
            data = data.results;
          }
          break;

        case 'stock':
          data = await api.getProducts();
          if (Array.isArray(data)) {
            // Already an array
          } else if (data && data.results) {
            data = data.results;
          }
          break;

        case 'outstanding_supplies':
          const salesData = await api.getSales();
          let allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
          
          data = allSales.filter(sale => 
            sale.line_items && sale.line_items.some(item => 
              item.supply_status === 'Partially Supplied' || 
              item.supply_status === 'Not Supplied'
            )
          );
          break;

        case 'outstanding_balances':
          const allSalesData = await api.getSales();
          let salesList = Array.isArray(allSalesData) ? allSalesData : (allSalesData?.results || []);
          
          data = salesList.filter(sale => parseFloat(sale.outstanding_balance || 0) > 0);
          break;

        default:
          data = [];
      }

      // Apply date filters if provided
      if (dateRange.start_date || dateRange.end_date) {
        data = data.filter(item => {
          const itemDate = new Date(item.created_at);
          if (dateRange.start_date && new Date(dateRange.start_date) > itemDate) return false;
          if (dateRange.end_date && new Date(dateRange.end_date) < itemDate) return false;
          return true;
        });
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

  useEffect(() => {
    generateReport();
  }, [reportType]);

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) {
      alert('No data to export');
      return;
    }

    let csv = '';
    let filename = '';

    switch (reportType) {
      case 'sales':
        csv = generateSalesCSV();
        filename = 'sales_report';
        break;
      case 'stock':
        csv = generateStockCSV();
        filename = 'stock_report';
        break;
      case 'outstanding_supplies':
        csv = generateOutstandingSuppliesCSV();
        filename = 'outstanding_supplies_report';
        break;
      case 'outstanding_balances':
        csv = generateOutstandingBalancesCSV();
        filename = 'outstanding_balances_report';
        break;
      default:
        csv = '';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateSalesCSV = () => {
    const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Names,Quantity Supplied,Total Amount,Amount Paid,Outstanding Balance,Mode of Payment\n';
    const rows = reportData.map(sale => {
      const productNames = (sale.line_items || []).map(item => item.product_name || '').join('; ');
      const quantitySupplied = (sale.line_items || []).map(item => 
        `${item.product_name}: ${item.quantity_supplied}/${item.quantity_ordered}`
      ).join('; ');
      
      return [
        new Date(sale.created_at).toLocaleDateString(),
        sale.sale_number || '',
        `"${sale.customer_name || ''}"`,
        sale.lpo_quotation_number || '-',
        sale.delivery_number || '-',
        `"${productNames}"`,
        `"${quantitySupplied}"`,
        sale.total_amount || 0,
        sale.amount_paid || 0,
        sale.outstanding_balance || 0,
        sale.mode_of_payment || ''
      ].join(',');
    }).join('\n');
    
    return headers + rows;
  };

  const generateStockCSV = () => {
    const headers = 'Product Code,Product Name,Quantity,Status\n';
    const rows = reportData.map(product => {
      const status = (product.current_stock || 0) <= (product.minimum_stock || 0) ? 'Low Stock' : 'In Stock';
      return [
        product.code || '',
        `"${product.name || ''}"`,
        product.current_stock || 0,
        status
      ].join(',');
    }).join('\n');
    
    return headers + rows;
  };

  const generateOutstandingSuppliesCSV = () => {
    const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Name,Quantity Ordered,Quantity Supplied,Outstanding Supplies,Payment Status\n';
    const rows = [];
    
    reportData.forEach(sale => {
      (sale.line_items || []).forEach(item => {
        if (item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied') {
          const outstandingQty = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
          const paymentStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
          
          rows.push([
            new Date(sale.created_at).toLocaleDateString(),
            sale.sale_number || '',
            `"${sale.customer_name || ''}"`,
            sale.lpo_quotation_number || '-',
            sale.delivery_number || '-',
            `"${item.product_name || ''}"`,
            item.quantity_ordered || 0,
            item.quantity_supplied || 0,
            outstandingQty,
            paymentStatus
          ].join(','));
        }
      });
    });
    
    return headers + rows.join('\n');
  };

  const generateOutstandingBalancesCSV = () => {
    const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Products,Total Amount,Amount Paid,Outstanding Balance\n';
    const rows = reportData.map(sale => {
      const products = (sale.line_items || []).map(item => item.product_name || '').join('; ');
      
      return [
        new Date(sale.created_at).toLocaleDateString(),
        sale.sale_number || '',
        `"${sale.customer_name || ''}"`,
        sale.lpo_quotation_number || '-',
        sale.delivery_number || '-',
        `"${products}"`,
        sale.total_amount || 0,
        sale.amount_paid || 0,
        sale.outstanding_balance || 0
      ].join(',');
    }).join('\n');
    
    return headers + rows;
  };

  const printReport = () => {
    window.print();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'sales':
        return 'Sales Report';
      case 'stock':
        return 'Stock Report';
      case 'outstanding_supplies':
        return 'Outstanding Supplies';
      case 'outstanding_balances':
        return 'Outstanding Balances';
      default:
        return 'Report';
    }
  };

  return (
    <div className={styles.reportsPage}>
      {/* Print Header - Only visible when printing */}
      <div className={styles.printHeader}>
        <div className={styles.printHeaderContent}>
          <img src={companyLogo} alt="Company Logo" className={styles.printLogo} />
          <div className={styles.printCompanyInfo}>
            <h1 className={styles.printCompanyName}>EDGE SYSTEMS LIMITED</h1>
            <h2 className={styles.printReportTitle}>{getReportTitle()}</h2>
          </div>
        </div>
      </div>

      {/* Screen Header - Hidden when printing */}
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
            <option value="outstanding_supplies">Outstanding Supplies</option>
            <option value="outstanding_balances">Outstanding Balances</option>
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
          <h2 className="card-title">{getReportTitle()}</h2>
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
              {/* SALES REPORT */}
              {reportType === 'sales' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sale Number</th>
                      <th>Customer</th>
                      <th>LPO/Quote</th>
                      <th>Product Name</th>
                      <th>Quantity Supplied</th>
                      <th>Total Amount</th>
                      <th>Amount Paid</th>
                      <th>Outstanding Balance</th>
                      <th>Mode of Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(sale => (
                      <tr key={sale.id}>
                        <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td>{sale.sale_number}</td>
                        <td>{sale.customer_name}</td>
                        <td>{sale.lpo_quotation_number || '-'}</td>
                        <td>
                          <div className={styles.productList}>
                            {(sale.line_items || []).map((item, idx) => (
                              <div key={idx}>{item.product_name}</div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className={styles.quantityList}>
                            {(sale.line_items || []).map((item, idx) => (
                              <div key={idx}>
                                {item.quantity_supplied}/{item.quantity_ordered}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>KES {formatCurrency(sale.total_amount)}</td>
                        <td>KES {formatCurrency(sale.amount_paid)}</td>
                        <td>
                          <span className={parseFloat(sale.outstanding_balance) > 0 ? styles.textDanger : styles.textSuccess}>
                            KES {formatCurrency(sale.outstanding_balance)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sale.mode_of_payment === 'Not Paid' ? 'badge-warning' : 'badge-success'}`}>
                            {sale.mode_of_payment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* STOCK REPORT */}
              {reportType === 'stock' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product Code</th>
                      <th>Product Name</th>
                      <th>Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(product => (
                      <tr key={product.id}>
                        <td>{product.code}</td>
                        <td>{product.name}</td>
                        <td>{product.current_stock}</td>
                        <td>
                          <span className={`badge ${
                            (product.current_stock || 0) <= (product.minimum_stock || 0)
                              ? 'badge-danger' 
                              : 'badge-success'
                          }`}>
                            {(product.current_stock || 0) <= (product.minimum_stock || 0)
                              ? 'Low Stock' 
                              : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* OUTSTANDING SUPPLIES REPORT */}
              {reportType === 'outstanding_supplies' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sale Number</th>
                      <th>Customer</th>
                      <th>LPO/Quote</th>
                      <th>Product Name</th>
                      <th>Quantity Ordered</th>
                      <th>Quantity Supplied</th>
                      <th>Outstanding Supplies</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(sale => 
                      (sale.line_items || [])
                        .filter(item => 
                          item.supply_status === 'Partially Supplied' || 
                          item.supply_status === 'Not Supplied'
                        )
                        .map((item, idx) => {
                          const outstandingQty = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
                          const paymentStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
                          
                          return (
                            <tr key={`${sale.id}-${idx}`}>
                              <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                              <td>{sale.sale_number}</td>
                              <td>{sale.customer_name}</td>
                              <td>{sale.lpo_quotation_number || '-'}</td>
                              <td>{item.product_name}</td>
                              <td>{item.quantity_ordered}</td>
                              <td>{item.quantity_supplied}</td>
                              <td className={styles.textDanger}>
                                <strong>{outstandingQty}</strong>
                              </td>
                              <td>
                                <span className={`badge ${
                                  paymentStatus === 'Paid' 
                                    ? 'badge-success' 
                                    : 'badge-warning'
                                }`}>
                                  {paymentStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              )}

              {/* OUTSTANDING BALANCES REPORT */}
              {reportType === 'outstanding_balances' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sale Number</th>
                      <th>Customer</th>
                      <th>Products</th>
                      <th>Total Amount</th>
                      <th>Amount Paid</th>
                      <th>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(sale => (
                      <tr key={sale.id}>
                        <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                        <td>{sale.sale_number}</td>
                        <td>{sale.customer_name}</td>
                        <td>
                          <div className={styles.productList}>
                            {(sale.line_items || []).map((item, idx) => (
                              <div key={idx}>{item.product_name}</div>
                            ))}
                          </div>
                        </td>
                        <td>KES {formatCurrency(sale.total_amount)}</td>
                        <td>KES {formatCurrency(sale.amount_paid)}</td>
                        <td className={styles.textDanger}>
                          <strong>KES {formatCurrency(sale.outstanding_balance)}</strong>
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

      {/* Print Footer - Only visible when printing */}
      <div className={styles.printFooter}>
        <div className={styles.printFooterContent}>
          <p className={styles.printAddress}>
            <strong>Office Location:</strong> Shelter House, Dai Dai Road, South B, Ground Floor Apartment GF4, Nairobi
          </p>
          <p className={styles.printContact}>
            <strong>Email:</strong> info@edgesystems.co.ke | <strong>Tel:</strong> 0721247366 / 0117320000
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;