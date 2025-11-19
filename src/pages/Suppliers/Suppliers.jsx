// src/pages/Suppliers/Suppliers.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import SupplierModal from './SupplierModal';
import styles from './Suppliers.module.css';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      console.log('Loaded suppliers:', data);

      if (Array.isArray(data)) {
        setSuppliers(data);
      } else if (data && data.results) {
        setSuppliers(data.results);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleModalClose = (shouldRefresh = false) => {
    setShowModal(false);
    setSelectedSupplier(null);
    if (shouldRefresh) loadSuppliers();
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const search = searchTerm.toLowerCase();
    return (
      (supplier.company_name?.toLowerCase() || '').includes(search) ||
      (supplier.phone || '').includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading suppliers...</p>
      </div>
    );
  }

  return (
    <div className={styles.suppliersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Suppliers</h1>
          <p className={styles.pageSubtitle}>Manage your supplier network</p>
        </div>
        {isAdmin && (
          <button onClick={handleAddSupplier} className="btn btn-primary">
            ➕ Add Supplier
          </button>
        )}
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by company name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredSuppliers.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm ? 'No suppliers found matching your search' : 'No suppliers found'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Phone</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier.id}>
                      <td className={styles.companyName}>
                        {supplier.company_name || '-'}
                      </td>
                      <td>{supplier.phone || '-'}</td>
                      {isAdmin && (
                        <td>
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="btn btn-sm btn-primary"
                            title="Edit"
                          >
                            ✏️
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <SupplierModal supplier={selectedSupplier} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default Suppliers;
