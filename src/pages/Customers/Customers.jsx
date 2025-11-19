// src/pages/Customers/Customers.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      console.log('Loaded customers:', data);
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

  const handleModalClose = (shouldRefresh = false) => {
    setShowModal(false);
    setSelectedCustomer(null);
    if (shouldRefresh) loadCustomers();
  };

  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase();
    return (
      (customer.company_name?.toLowerCase() || '').includes(search) ||
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
          placeholder="Search by company name or phone..."
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
                    <th>Phone</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td>
                        <span
                          className={styles.companyNameLink}
                          onClick={() => navigate(`/customers/${customer.id}/history`)}
                          title="View purchase history"
                        >
                          {customer.company_name || '-'}
                        </span>
                      </td>
                      <td>{customer.phone || '-'}</td>
                      {isAdmin && (
                        <td>
                          <button
                            onClick={() => handleEditCustomer(customer)}
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
        <CustomerModal
          customer={selectedCustomer}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Customers;
