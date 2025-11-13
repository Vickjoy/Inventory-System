// src/pages/Products/ProductModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './ProductModal.module.css';

const ProductModal = ({ product, categories, subcategories, onClose }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    subcategory: '',
    unit_price: '',
    current_stock: '',
    minimum_stock: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code || '',
        name: product.name || '',
        description: product.description || '',
        subcategory: product.subcategory || '',
        unit_price: product.unit_price || '',
        current_stock: product.current_stock || '',
        minimum_stock: product.minimum_stock || ''
      });
      
      // Find and set category
      const subcat = subcategories.find(s => s.id === product.subcategory);
      if (subcat) {
        setSelectedCategory(subcat.category.toString());
      }
    }
  }, [product, subcategories]);

  // Filter subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      const filtered = subcategories.filter(
        sub => sub.category === parseInt(selectedCategory)
      );
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategory, subcategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    // Reset subcategory when category changes
    setFormData(prev => ({ ...prev, subcategory: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (product) {
        // Update existing product
        await api.updateProduct(product.id, formData);
      } else {
        // Create new product - backend will handle stock increase
        await api.createProduct(formData);
      }
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
          <h2 className={styles.modalTitle}>
            {product ? '✏️ Edit Product' : '➕ Add New Product'}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.alertDanger}>{error}</div>
            )}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Product Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  placeholder="e.g., CAP320"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  placeholder="Enter product name"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={styles.formTextarea}
                placeholder="Enter product description (optional)"
                rows="3"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> SubCategory
                </label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  className={styles.formSelect}
                  required
                  disabled={!selectedCategory}
                >
                  <option value="">Select SubCategory</option>
                  {filteredSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                {!selectedCategory && (
                  <small className={styles.helpText}>
                    Please select a category first
                  </small>
                )}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Unit Price (KES)
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Current Stock
                </label>
                <input
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  min="0"
                  placeholder="0"
                />
                <small className={styles.helpText}>
                  Stock will be automatically recorded in the system
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span className={styles.required}>*</span> Minimum Stock
                </label>
                <input
                  type="number"
                  name="minimum_stock"
                  value={formData.minimum_stock}
                  onChange={handleChange}
                  className={styles.formInput}
                  required
                  min="0"
                  placeholder="10"
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={`${styles.btn} ${styles.btnOutline}`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={loading}
            >
              {loading ? 'Saving...' : product ? '💾 Update Product' : '✅ Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;