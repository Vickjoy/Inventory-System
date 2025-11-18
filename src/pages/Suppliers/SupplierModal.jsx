// src/pages/Suppliers/SupplierModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './SupplierModal.module.css';

const SupplierModal = ({ supplier, onClose }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplier) {
      setFormData({
        company_name: supplier.company_name || '',
        phone: supplier.phone || ''
      });
    }
  }, [supplier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (supplier) {
        await api.updateSupplier(supplier.id, formData);
        console.log('Supplier updated successfully');
      } else {
        const response = await api.createSupplier(formData);
        console.log('Supplier created successfully:', response);
      }
      // Close modal and trigger reload
      onClose(true);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError(err.message || 'Failed to save supplier. Please try again.');
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
            {supplier ? '✏️ Edit Supplier' : '➕ Add New Supplier'}
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
              {loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;