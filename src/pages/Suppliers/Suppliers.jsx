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
      setSuppliers(Array.isArray(data) ? data : []);
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

  const handleDeleteSupplier = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.deleteSupplier(id);
        loadSuppliers();
      } catch (error) {
        alert('Error deleting supplier: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.toggleSupplierActive(id);
      loadSuppliers();
    } catch (error) {
      alert('Error updating supplier status: ' + error.message);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedSupplier(null);
    loadSuppliers();
  };

  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(supplier =>
    supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.includes(searchTerm)
  ) : [];

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
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredSuppliers.length === 0 ? (
            <p className={styles.noData}>No suppliers found</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Created</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(supplier => (
                    <tr key={supplier.id}>
                      <td className={styles.companyName}>
                        {supplier.company_name}
                      </td>
                      <td>{supplier.email}</td>
                      <td>{supplier.phone}</td>
                      <td>
                        <span className={`badge ${
                          supplier.is_active ? 'badge-success' : 'badge-danger'
                        }`}>
                          {supplier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(supplier.created_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="btn btn-sm btn-primary"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleToggleActive(supplier.id)}
                              className={`btn btn-sm ${
                                supplier.is_active ? 'btn-danger' : 'btn-secondary'
                              }`}
                              title={supplier.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {supplier.is_active ? '🚫' : '✓'}
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="btn btn-sm btn-danger"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
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
        <SupplierModal
          supplier={selectedSupplier}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Suppliers;