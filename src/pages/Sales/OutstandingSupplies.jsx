// src/pages/Sales/OutstandingSupplies.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './OutstandingSupplies.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100
    .toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OutstandingSupplies = () => {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOutstandingSupplies();
  }, []);

  const loadOutstandingSupplies = async () => {
    try {
      setLoading(true);
      const data = await api.request('/sales/outstanding/');
      if (Array.isArray(data)) setSupplies(data);
      else if (data?.results) setSupplies(data.results);
      else setSupplies([]);
    } catch (error) {
      console.error('Error loading outstanding supplies:', error);
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = supplies.filter(sale =>
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
    <div className={styles.outstandingPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Outstanding Supplies</h1>
          <p className={styles.pageSubtitle}>Track pending and partially supplied orders</p>
        </div>
        <button onClick={() => navigate('/sales')} className={`btn btn-secondary ${styles.btnBack}`}>
          ← Back to Sales
        </button>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by sale number, customer, or LPO..."
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
              <p>Loading outstanding supplies...</p>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm ? 'No outstanding supplies found matching your search.' : 'No outstanding supplies found. All orders are fully supplied!'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                    <th>Product Name</th>
                    <th>Ordered</th>
                    <th>Supplied</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.map(sale => (
                    sale.line_items.map((item, idx) => (
                      <tr key={`${sale.id}-${idx}`}>
                        {idx === 0 && (
                          <>
                            <td rowSpan={sale.line_items.length} className={styles.saleNumber}>
                              {sale.sale_number}
                            </td>
                            <td rowSpan={sale.line_items.length}>
                              {new Date(sale.created_at).toLocaleDateString()}
                            </td>
                            <td rowSpan={sale.line_items.length} className={styles.customerName}>
                              {sale.customer_name}
                            </td>
                            <td rowSpan={sale.line_items.length}>
                              {sale.lpo_quotation_number || '-'}
                            </td>
                            <td rowSpan={sale.line_items.length}>
                              {sale.delivery_number || '-'}
                            </td>
                          </>
                        )}
                        <td className={styles.productName}>{item.product_name}</td>
                        <td className={styles.quantityOrdered}>{item.quantity_ordered}</td>
                        <td className={styles.quantitySupplied}>{item.quantity_supplied}</td>
                        <td className={styles.quantityOutstanding}>
                          {item.quantity_ordered - item.quantity_supplied}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(item.supply_status)}`}>
                            {item.supply_status}
                          </span>
                        </td>
                        <td className={styles.unitPrice}>KES {formatCurrency(item.unit_price)}</td>
                        <td className={styles.totalValue}>
                          KES {formatCurrency((item.quantity_ordered - item.quantity_supplied) * item.unit_price)}
                        </td>
                      </tr>
                    ))
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

export default OutstandingSupplies;