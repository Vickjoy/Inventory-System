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

  // Group stock products hierarchically
  const groupStockProducts = (products) => {
    const grouped = {};
    
    products.forEach(product => {
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

  const getReportStats = () => {
    if (!reportData || reportData.length === 0) return null;

    // Only show stats for stock report
    if (reportType === 'stock') {
      const totalProducts = reportData.length;
      const lowStock = reportData.filter(p => (p.current_stock || 0) <= (p.minimum_stock || 0)).length;
      const inStock = totalProducts - lowStock;
      return {
        'Total Products': totalProducts,
        'In Stock': inStock,
        'Low Stock': lowStock
      };
    }
    
    return null;
  };

  const stats = getReportStats();

  return (
    <div className={styles.reportsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Analytics</h1>
          <p className={styles.pageSubtitle}>Generate comprehensive business reports</p>
        </div>
      </div>

      <div className={styles.controlPanel}>
        <div className={styles.filtersRow}>
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

          <div className={styles.actionButtonWrapper}>
            <button
              onClick={generateReport}
              className={styles.generateBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Generating...
                </>
              ) : (
                <>
                  <span className={styles.btnIcon}>📊</span>
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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

      <div className={styles.reportCard}>
        <div className={styles.reportHeader}>
          <h2 className={styles.reportTitle}>{getReportTitle()}</h2>
          {reportData && reportData.length > 0 && (
            <div className={styles.recordCount}>
              {reportData.length} {reportData.length === 1 ? 'record' : 'records'}
            </div>
          )}
        </div>
        
        <div className={styles.reportBody}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Generating report...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyText}>No data available for this report</p>
              <p className={styles.emptySubtext}>Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className={styles.reportContent}>
              {/* SALES REPORT */}
              {reportType === 'sales' && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
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
                          <td className={styles.saleNumber}>{sale.sale_number}</td>
                          <td>{sale.customer_name}</td>
                          <td>{sale.lpo_quotation_number || '-'}</td>
                          <td>
                            <div className={styles.productList}>
                              {(sale.line_items || []).map((item, idx) => (
                                <div key={idx} className={styles.productItem}>{item.product_name}</div>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className={styles.quantityList}>
                              {(sale.line_items || []).map((item, idx) => (
                                <div key={idx} className={styles.quantityItem}>
                                  {item.quantity_supplied}/{item.quantity_ordered}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className={styles.amount}>KES {formatCurrency(sale.total_amount)}</td>
                          <td className={styles.amount}>KES {formatCurrency(sale.amount_paid)}</td>
                          <td>
                            <span className={parseFloat(sale.outstanding_balance) > 0 ? styles.textDanger : styles.textSuccess}>
                              KES {formatCurrency(sale.outstanding_balance)}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${sale.mode_of_payment === 'Not Paid' ? styles.badgeWarning : styles.badgeSuccess}`}>
                              {sale.mode_of_payment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* STOCK REPORT - GROUPED BY HIERARCHY */}
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
                                        <th>Product Code</th>
                                        <th>Product Name</th>
                                        <th>Current Stock</th>
                                        <th>Minimum Stock</th>
                                        <th>Status</th>
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
                                            <span className={`${styles.badge} ${
                                              (product.current_stock || 0) <= (product.minimum_stock || 0)
                                                ? styles.badgeDanger
                                                : styles.badgeSuccess
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

              {/* OUTSTANDING SUPPLIES REPORT */}
              {reportType === 'outstanding_supplies' && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
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
                                <td className={styles.saleNumber}>{sale.sale_number}</td>
                                <td>{sale.customer_name}</td>
                                <td>{sale.lpo_quotation_number || '-'}</td>
                                <td className={styles.productName}>{item.product_name}</td>
                                <td className={styles.stockQuantity}>{item.quantity_ordered}</td>
                                <td className={styles.stockQuantity}>{item.quantity_supplied}</td>
                                <td className={styles.outstandingQty}>
                                  {outstandingQty}
                                </td>
                                <td>
                                  <span className={`${styles.badge} ${
                                    paymentStatus === 'Paid' 
                                      ? styles.badgeSuccess
                                      : styles.badgeWarning
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
                </div>
              )}

              {/* OUTSTANDING BALANCES REPORT */}
              {reportType === 'outstanding_balances' && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
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
                          <td className={styles.saleNumber}>{sale.sale_number}</td>
                          <td>{sale.customer_name}</td>
                          <td>
                            <div className={styles.productList}>
                              {(sale.line_items || []).map((item, idx) => (
                                <div key={idx} className={styles.productItem}>{item.product_name}</div>
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;