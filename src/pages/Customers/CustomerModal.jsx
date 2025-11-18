// src/pages/Customers/CustomerModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './CustomerModal.module.css';

const CustomerModal = ({ customer, onClose }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || '',
        phone: customer.phone || ''
      });
    }
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (customer) {
        await api.updateCustomer(customer.id, formData);
        console.log('Customer updated successfully');
      } else {
        const response = await api.createCustomer(formData);
        console.log('Customer created successfully:', response);
      }
      // Close modal and trigger reload
      onClose(true);
    } catch (err) {
      console.error('Error saving customer:', err);
      setError(err.message || 'Failed to save customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Close without reloading
    onClose(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {customer ? '✏️ Edit Customer' : '➕ Add New Customer'}
          </h2>
          <button className={styles.modalClose} onClick={handleCancel} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={`${styles.alert} ${styles.alertDanger}`}>
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Company Name <span>*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className={styles.formInput}
                required
                placeholder="Enter company name"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="0712345678 (optional)"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.btnOutline}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading && <span className={styles.loading}></span>}
              {loading ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;