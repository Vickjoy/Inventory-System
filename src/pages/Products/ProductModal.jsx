// src/pages/Products/ProductModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './ProductModal.module.css';

const ProductModal = ({ product, categories, subcategories, onClose }) => {
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', category: '', subcategory: '', subsubcategory: '',
    unit_price: '', current_stock: '', minimum_stock: ''
  });
  
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [availableSubsubcategories, setAvailableSubsubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code || '', name: product.name || '', description: product.description || '',
        category: product.category || '', subcategory: product.subcategory || '',
        subsubcategory: product.subsubcategory || '', unit_price: product.unit_price || '',
        current_stock: product.current_stock || '', minimum_stock: product.minimum_stock || ''
      });
    }
  }, [product]);

  useEffect(() => {
    if (formData.category) {
      const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category));
      setAvailableSubcategories(selectedCategory?.subcategories || []);
      if (!product || product.category !== formData.category) {
        setFormData(prev => ({ ...prev, subcategory: '', subsubcategory: '' }));
        setAvailableSubsubcategories([]);
      }
    } else {
      setAvailableSubcategories([]);
      setAvailableSubsubcategories([]);
    }
  }, [formData.category, categories, product]);

  useEffect(() => {
    if (formData.subcategory) {
      const selectedSub = availableSubcategories.find(sub => sub.id === parseInt(formData.subcategory));
      setAvailableSubsubcategories(selectedSub?.subsubcategories || []);
      if (!product || product.subcategory !== formData.subcategory) {
        setFormData(prev => ({ ...prev, subsubcategory: '' }));
      }
    } else {
      setAvailableSubsubcategories([]);
    }
  }, [formData.subcategory, availableSubcategories, product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.code || !formData.name || !formData.category || !formData.subcategory) {
        throw new Error('Please fill in all required fields');
      }
      if (formData.unit_price && parseFloat(formData.unit_price) < 0) throw new Error('Unit price cannot be negative');
      if (formData.current_stock && parseInt(formData.current_stock) < 0) throw new Error('Current stock cannot be negative');
      if (formData.minimum_stock && parseInt(formData.minimum_stock) < 0) throw new Error('Minimum stock cannot be negative');

      const submitData = {
        code: formData.code.trim(), name: formData.name.trim(), description: formData.description.trim(),
        category: parseInt(formData.category), subcategory: parseInt(formData.subcategory),
        subsubcategory: formData.subsubcategory ? parseInt(formData.subsubcategory) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : 0,
        current_stock: formData.current_stock ? parseInt(formData.current_stock) : 0,
        minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : 0
      };

      if (product) await api.updateProduct(product.id, submitData);
      else await api.createProduct(submitData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{product ? '✏️ Edit Product' : '➕ Add New Product'}</h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {error && <div className={styles.alertDanger}><strong>Error:</strong> {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}><span className={styles.required}>*</span> Product Code</label>
                <input type="text" name="code" value={formData.code} onChange={handleChange} className={styles.formInput} placeholder="e.g., CAP320" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}><span className={styles.required}>*</span> Product Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={styles.formInput} placeholder="Enter product name" required />
              </div>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} className={styles.formTextarea} placeholder="Optional description" rows="2" />
            </div>

            {/* Category Hierarchy */}
            <div className={styles.categorySection}>
              <h3 className={styles.categoryTitle}>📂 Category Hierarchy</h3>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className={styles.required}>*</span> Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} className={styles.formSelect} required>
                    <option value="">Select Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  {categories.length === 0 && <small className={styles.helpText} style={{ color: '#dc2626' }}>No categories available</small>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className={styles.required}>*</span> SubCategory</label>
                  <select name="subcategory" value={formData.subcategory} onChange={handleChange} className={styles.formSelect} disabled={!formData.category} required>
                    <option value="">Select SubCategory</option>
                    {availableSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                  {formData.category && availableSubcategories.length === 0 && <small className={styles.helpText} style={{ color: '#dc2626' }}>No subcategories available</small>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Group <small style={{ color: '#64748b' }}>(Optional)</small></label>
                  <select name="subsubcategory" value={formData.subsubcategory} onChange={handleChange} className={styles.formSelect} disabled={!formData.subcategory}>
                    <option value="">No Group</option>
                    {availableSubsubcategories.map(subsub => <option key={subsub.id} value={subsub.id}>{subsub.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Unit Price (KES)</label>
                <input type="number" name="unit_price" value={formData.unit_price} onChange={handleChange} className={styles.formInput} min="0" step="0.01" placeholder="0.00" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Stock</label>
                <input type="number" name="current_stock" value={formData.current_stock} onChange={handleChange} className={styles.formInput} min="0" placeholder="0" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Minimum Stock</label>
                <input type="number" name="minimum_stock" value={formData.minimum_stock} onChange={handleChange} className={styles.formInput} min="0" placeholder="0" />
                <small className={styles.helpText}>Low stock alert threshold</small>
              </div>
            </div>
          </form>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnOutline}`} disabled={loading}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
            {loading ? <><span className={styles.spinner}></span> Saving...</> : product ? '💾 Update Product' : '✅ Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;