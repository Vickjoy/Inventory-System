// src/pages/Customers/CustomerHistory.jsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './CustomerHistory.module.css';
import companyLogo from '../../assets/Company_logo.webp';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const CustomerHistory = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const customerData = await api.getCustomer(customerId);
      setCustomer(customerData);

      const allSales = await api.getSales();
      const salesArray = Array.isArray(allSales) ? allSales : allSales.results || [];
      const customerSales = salesArray.filter(
        sale => sale.customer === parseInt(customerId)
      );
      setSales(customerSales);
    } catch (error) {
      console.error('Error loading customer data:', error);
      alert('Error loading customer history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Supplied': 'badge-success',
      'Partially Supplied': 'badge-warning',
      'Not Supplied': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const filteredSales = sales.filter(sale => {
    // Apply search filter
    const matchesSearch = 
      sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.lpo_quotation_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Apply date filters
    if (dateRange.start_date || dateRange.end_date) {
      const saleDate = new Date(sale.created_at);
      if (dateRange.start_date && new Date(dateRange.start_date) > saleDate) return false;
      if (dateRange.end_date && new Date(dateRange.end_date) < saleDate) return false;
    }

    return true;
  });

  const printHistory = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading customer history...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={styles.errorContainer}>
        <p>Customer not found</p>
        <button onClick={() => navigate('/customers')} className="btn btn-primary">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className={styles.historyPage}>
      {/* Print Header - Only visible when printing */}
      <div className={styles.printHeader}>
        <div className={styles.printHeaderContent}>
          <img src={companyLogo} alt="Company Logo" className={styles.printLogo} />
          <div className={styles.printCompanyInfo}>
            <h1 className={styles.printCompanyName}>EDGE SYSTEMS LIMITED</h1>
            <h2 className={styles.printReportTitle}>Purchase History</h2>
            <h3 className={styles.printCustomerName}>{customer.company_name}</h3>
          </div>
        </div>
      </div>

      {/* Screen Header - Hidden when printing */}
      <div className={styles.pageHeader}>
        <button onClick={() => navigate('/customers')} className={styles.backButton}>
          ← Back to Customers
        </button>
        <div className={styles.customerInfo}>
          <h1 className={styles.pageTitle}>{customer.company_name}</h1>
          <div className={styles.customerMeta}>
            {customer.phone && <span>📞 {customer.phone}</span>}
            <span className={`badge ${customer.is_active ? 'badge-success' : 'badge-danger'}`}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Panel - Hidden when printing */}
      <div className={styles.controlPanel}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by sale number or LPO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
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
            onClick={printHistory}
            className="btn btn-primary"
            disabled={filteredSales.length === 0}
          >
            🖨️ Print History
          </button>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="card">
        <div className="card-body">
          <h2 className={styles.sectionTitle}>Purchase History</h2>
          {filteredSales.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm || dateRange.start_date || dateRange.end_date
                ? 'No sales found matching your filters.'
                : 'No purchase history found for this customer.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Payment Status</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className={styles.saleNumber}>{sale.sale_number}</td>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td>
                        {/* Screen version: Collapsible */}
                        <div
                          className={styles.productsSummary}
                          onClick={() =>
                            setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)
                          }
                        >
                          {sale.line_items[0]?.product_name}
                          {sale.line_items.length > 1 && (
                            <span className={styles.moreProducts}>
                              +{sale.line_items.length - 1} more
                            </span>
                          )}
                        </div>
                        {expandedSaleId === sale.id && (
                          <div className={styles.expandedProducts}>
                            {sale.line_items.map((item, idx) => (
                              <div key={idx} className={styles.expandedProductItem}>
                                <strong>{item.product_name}</strong> ({item.quantity_supplied}/{item.quantity_ordered})
                                <span className={`badge ${getStatusBadge(item.supply_status)}`}>
                                  {item.supply_status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Print version: Always show all products */}
                        <div className={styles.printOnlyProducts}>
                          {sale.line_items.map((item, idx) => (
                            <div key={idx} className={styles.printProductItem}>
                              <strong>{item.product_name}</strong> ({item.quantity_supplied}/{item.quantity_ordered})
                              <span className={`badge ${getStatusBadge(item.supply_status)}`}>
                                {item.supply_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className={styles.totalAmount}>
                        KES {formatCurrency(sale.total_amount)}
                      </td>
                      <td>
                        <div className={styles.paymentStatusContainer}>
                          <span
                            className={`badge ${
                              sale.mode_of_payment === 'Not Paid'
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                          >
                            {sale.mode_of_payment}
                          </span>
                          {sale.amount_paid > 0 && (
                            <div className={styles.amountPaid}>
                              Paid: KES {formatCurrency(sale.amount_paid)}
                            </div>
                          )}
                          {sale.outstanding_balance > 0 && (
                            <div className={styles.outstandingBalance}>
                              Balance: KES {formatCurrency(sale.outstanding_balance)}
                            </div>
                          )}
                          {parseFloat(sale.outstanding_balance) === 0 &&
                            parseFloat(sale.amount_paid) > 0 && (
                              <div
                                className="badge badge-success"
                                style={{ marginTop: '4px' }}
                              >
                                ✓ Fully Paid
                              </div>
                            )}
                        </div>
                      </td>
                      <td>{sale.lpo_quotation_number || '-'}</td>
                      <td>{sale.delivery_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default CustomerHistory;