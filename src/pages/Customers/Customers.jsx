// src/pages/Customers/Customers.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import CustomerModal from './CustomerModal';
import styles from './Customers.module.css';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      console.log('Loaded customers:', data); // Debug log
      // Handle both array and paginated responses
      if (Array.isArray(data)) {
        setCustomers(data);
      } else if (data && data.results) {
        setCustomers(data.results);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setShowModal(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.deleteCustomer(id);
        loadCustomers();
      } catch (error) {
        alert('Error deleting customer: ' + error.message);
      }
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await api.toggleCustomerActive(id);
      loadCustomers();
    } catch (error) {
      alert('Error updating customer status: ' + error.message);
    }
  };

  const handleModalClose = (shouldRefresh = false) => {
    setShowModal(false);
    setSelectedCustomer(null);
    if (shouldRefresh) {
      loadCustomers();
    }
  };

  // Case-insensitive search for company name (and other fields)
  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase();
    return (
      (customer.company_name?.toLowerCase() || '').includes(search) ||
      (customer.email?.toLowerCase() || '').includes(search) ||
      (customer.phone || '').includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  return (
    <div className={styles.customersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Customers</h1>
          <p className={styles.pageSubtitle}>Manage your customer base</p>
        </div>
        {isAdmin && (
          <button onClick={handleAddCustomer} className="btn btn-primary">
            ➕ Add Customer
          </button>
        )}
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by company name, email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredCustomers.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm ? 'No customers found matching your search' : 'No customers found'}
            </p>
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
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td className={styles.companyName}>
                        {customer.company_name || 'N/A'}
                      </td>
                      <td>{customer.email || 'N/A'}</td>
                      <td>{customer.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          customer.is_active ? 'badge-success' : 'badge-danger'
                        }`}>
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {customer.created_at 
                          ? new Date(customer.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      {isAdmin && (
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => handleEditCustomer(customer)}
                              className="btn btn-sm btn-primary"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleToggleActive(customer.id)}
                              className={`btn btn-sm ${
                                customer.is_active ? 'btn-danger' : 'btn-secondary'
                              }`}
                              title={customer.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {customer.is_active ? '🚫' : '✓'}
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.id)}
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
        <CustomerModal
          customer={selectedCustomer}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Customers;