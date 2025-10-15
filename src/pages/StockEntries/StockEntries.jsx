// src/pages/StockEntries/StockEntries.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './StockEntries.module.css';

const StockEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await api.getStockEntries();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading stock entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = Array.isArray(entries) ? entries.filter(entry => {
    const matchesSearch = 
      entry.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || entry.entry_type === filterType;
    
    return matchesSearch && matchesFilter;
  }) : [];

  const getTypeBadge = (type) => {
    const badges = {
      'In': 'badge-success',
      'Out': 'badge-danger',
      'Adjustment': 'badge-info'
    };
    return badges[type] || 'badge-secondary';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading stock entries...</p>
      </div>
    );
  }

  return (
    <div className={styles.stockEntriesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock Entries</h1>
          <p className={styles.pageSubtitle}>View stock movement history</p>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? styles.filterActive : styles.filterButton}
          >
            All Entries
          </button>
          <button
            onClick={() => setFilterType('In')}
            className={filterType === 'In' ? styles.filterActive : styles.filterButton}
          >
            Stock In
          </button>
          <button
            onClick={() => setFilterType('Out')}
            className={filterType === 'Out' ? styles.filterActive : styles.filterButton}
          >
            Stock Out
          </button>
          <button
            onClick={() => setFilterType('Adjustment')}
            className={filterType === 'Adjustment' ? styles.filterActive : styles.filterButton}
          >
            Adjustments
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredEntries.length === 0 ? (
            <p className={styles.noData}>No stock entries found</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Supplier</th>
                    <th>Recorded By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td className={styles.productCode}>{entry.product_code}</td>
                      <td>{entry.product_name}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(entry.entry_type)}`}>
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className={styles.quantity}>
                        {entry.entry_type === 'Out' ? '-' : '+'}{entry.quantity}
                      </td>
                      <td>{entry.supplier_name || '-'}</td>
                      <td>{entry.recorded_by_name}</td>
                      <td className={styles.notes}>
                        {entry.notes || '-'}
                      </td>
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

export default StockEntries;