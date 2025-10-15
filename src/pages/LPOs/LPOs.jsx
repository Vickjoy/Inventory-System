// src/pages/LPOs/LPOs.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import LPOModal from './LPOModal';
import DeliveryModal from './DeliveryModal';
import styles from './LPOs.module.css';

const LPOs = () => {
  const [lpos, setLpos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLPOModal, setShowLPOModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedLPO, setSelectedLPO] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lposData, suppliersData, productsData] = await Promise.all([
        filter === 'pending' ? api.getPendingLPOs() : api.getLPOs(),
        api.getSuppliers(),
        api.getProducts()
      ]);
      
      // Ensure we always set arrays
      setLpos(Array.isArray(lposData) ? lposData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays on error
      setLpos([]);
      setSuppliers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLPO = () => {
    setSelectedLPO(null);
    setShowLPOModal(true);
  };

  const handleUpdateDelivery = (lpo) => {
    setSelectedLPO(lpo);
    setShowDeliveryModal(true);
  };

  const handleModalClose = () => {
    setShowLPOModal(false);
    setShowDeliveryModal(false);
    setSelectedLPO(null);
    loadData();
  };

  // Defensive filtering with array check
  const filteredLPOs = Array.isArray(lpos) ? lpos.filter(lpo =>
    lpo.lpo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lpo.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lpo.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getStatusBadge = (status) => {
    const badges = {
      'Completed': 'badge-success',
      'Pending': 'badge-warning',
      'Partial': 'badge-info',
      'Cancelled': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading LPOs...</p>
      </div>
    );
  }

  return (
    <div className={styles.lposPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Local Purchase Orders (LPOs)</h1>
          <p className={styles.pageSubtitle}>Track partial supplies and deliveries</p>
        </div>
        {isAdmin && (
          <button onClick={handleCreateLPO} className="btn btn-primary">
            ➕ Create LPO
          </button>
        )}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
          >
            All LPOs
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? styles.filterActive : styles.filterButton}
          >
            Pending
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search LPOs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredLPOs.length === 0 ? (
            <p className={styles.noData}>No LPOs found</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>LPO #</th>
                    <th>Supplier</th>
                    <th>Product</th>
                    <th>Ordered Qty</th>
                    <th>Delivered Qty</th>
                    <th>Pending Qty</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLPOs.map(lpo => (
                    <tr key={lpo.id}>
                      <td className={styles.lpoNumber}>
                        {lpo.lpo_number}
                      </td>
                      <td>{lpo.supplier_name}</td>
                      <td>
                        <div>
                          <strong>{lpo.product_code}</strong>
                          <br />
                          <small className={styles.productName}>
                            {lpo.product_name}
                          </small>
                        </div>
                      </td>
                      <td className={styles.quantity}>{lpo.ordered_quantity}</td>
                      <td className={styles.delivered}>{lpo.delivered_quantity}</td>
                      <td className={styles.pending}>{lpo.pending_quantity}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(lpo.status)}`}>
                          {lpo.status}
                        </span>
                      </td>
                      <td>{new Date(lpo.order_date).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          {lpo.status !== 'Completed' && lpo.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleUpdateDelivery(lpo)}
                              className="btn btn-sm btn-primary"
                              title="Update Delivery"
                            >
                              📦
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showLPOModal && (
        <LPOModal
          suppliers={suppliers}
          products={products}
          onClose={handleModalClose}
        />
      )}

      {showDeliveryModal && (
        <DeliveryModal
          lpo={selectedLPO}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default LPOs;