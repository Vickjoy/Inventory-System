// src/pages/Sales/Sales.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import SaleModal from './SaleModal';
import styles from './Sales.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100
    .toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'outstanding') setActiveTab('outstanding');
  }, [searchParams]);

  useEffect(() => {
    loadSales();
  }, [activeTab]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'outstanding' ? '/sales/outstanding/' : '/sales/';
      const data = await api.request(endpoint);
      if (Array.isArray(data)) setSales(data);
      else if (data?.results) setSales(data.results);
      else setSales([]);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lpo_quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      'Supplied': 'badge-success',
      'Partially Supplied': 'badge-warning',
      'Not Supplied': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <div className={styles.salesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sales Entry</h1>
          <p className={styles.pageSubtitle}>Record and manage daily sales</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          ➕ New Sale
        </button>
      </div>

      {showModal && (
        <SaleModal
          onClose={() => setShowModal(false)}
          onSuccess={loadSales}
        />
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('all')}
          className={activeTab === 'all' ? styles.tabActive : styles.tab}
        >
          All Sales
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={activeTab === 'outstanding' ? styles.tabActive : styles.tab}
        >
          Outstanding Supplies
        </button>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search sales by number, customer, or LPO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="spinner"></div>
              <p>Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm ? 'No sales found matching your search.' : 'No sales found. Click "New Sale" to record your first sale.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Payment Status</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => (
                    <tr key={sale.id}>
                      <td className={styles.saleNumber}>{sale.sale_number}</td>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td className={styles.customerName}>{sale.customer_name}</td>
                      <td>
                        <div
                          className={styles.productsSummary}
                          onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        >
                          {sale.line_items[0]?.product_name}
                          {sale.line_items.length > 1 && (
                            <span className={styles.moreProducts}>+{sale.line_items.length - 1} more</span>
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
                      </td>
                      <td className={styles.totalAmount}>KES {formatCurrency(sale.total_amount)}</td>
                      <td>
                        <div className={styles.paymentStatusContainer}>
                          <span className={`badge ${sale.mode_of_payment === 'Not Paid' ? 'badge-warning' : 'badge-success'}`}>
                            {sale.mode_of_payment}
                          </span>
                          {sale.amount_paid > 0 && (
                            <div className={styles.amountPaid}>Paid: KES {formatCurrency(sale.amount_paid)}</div>
                          )}
                          {sale.outstanding_balance > 0 && (
                            <div className={styles.outstandingBalance}>Balance: KES {formatCurrency(sale.outstanding_balance)}</div>
                          )}
                          {parseFloat(sale.outstanding_balance) === 0 && parseFloat(sale.amount_paid) > 0 && (
                            <div className="badge badge-success" style={{ marginTop: '4px' }}>✓ Fully Paid</div>
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
    </div>
  );
};

export default Sales;