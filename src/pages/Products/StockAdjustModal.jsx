// src/pages/Products/StockAdjustModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './StockAdjustModal.module.css';

const StockAdjustModal = ({ product, allProducts, suppliers, onClose }) => {
  const [formData, setFormData] = useState({
    action_type: 'restock',
    quantity: '',
    supplier: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(product || null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
      setSearchTerm(`${product.code} - ${product.name}`);
    }
  }, [product]);

  useEffect(() => {
    if (searchTerm.trim() && !selectedProduct) {
      const search = searchTerm.toLowerCase();
      const filtered = allProducts.filter(p => 
        p.code.toLowerCase().includes(search) || 
        p.name.toLowerCase().includes(search)
      ).slice(0, 10);
      setFilteredProducts(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredProducts([]);
      setShowDropdown(false);
    }
  }, [searchTerm, allProducts, selectedProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedProduct(null);
  };

  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    setSearchTerm(`${prod.code} - ${prod.name}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedProduct) {
      setError('Select a product');
      return;
    }

    setLoading(true);

    try {
      const quantity = parseInt(formData.quantity);
      
      if (quantity <= 0) {
        setError('Quantity must be greater than 0');
        setLoading(false);
        return;
      }

      let payload;

      if (formData.action_type === 'restock') {
        if (!formData.supplier) {
          setError('Select a supplier');
          setLoading(false);
          return;
        }

        payload = {
          type: 'In',
          quantity: quantity,
          supplier: formData.supplier,
          notes: formData.notes || `Restocked from supplier`
        };
      } else {
        payload = {
          type: 'Adjustment',
          quantity: quantity,
          notes: formData.notes || 'Manual adjustment'
        };
      }

      await api.adjustStock(selectedProduct.id, payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewStock = () => {
    if (!selectedProduct || !formData.quantity) return selectedProduct?.current_stock || 0;
    
    const qty = parseInt(formData.quantity);
    
    if (formData.action_type === 'restock') {
      return selectedProduct.current_stock + qty;
    } else {
      return qty;
    }
  };

  const newStock = calculateNewStock();
  const showSupplierField = formData.action_type === 'restock';
  const activeSuppliers = suppliers?.filter(s => s.is_active) || [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              {product ? 'Adjust Stock' : 'Add Stock'}
            </h2>
            {selectedProduct && (
              <p className={styles.modalSubtitle}>
                {selectedProduct.code} - {selectedProduct.name}
              </p>
            )}
          </div>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.alertDanger}>{error}</div>
            )}

            {!product && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Product *</label>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.formInput}
                    placeholder="Type code or name..."
                    required
                    autoComplete="off"
                  />
                  <span className={styles.searchIcon}>🔍</span>
                  
                  {showDropdown && (
                    <div className={styles.dropdown}>
                      {filteredProducts.map(prod => (
                        <div
                          key={prod.id}
                          className={styles.dropdownItem}
                          onClick={() => handleProductSelect(prod)}
                        >
                          <div className={styles.dropdownItemCode}>{prod.code}</div>
                          <div className={styles.dropdownItemName}>{prod.name}</div>
                          <div className={styles.dropdownItemStock}>
                            Stock: {prod.current_stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedProduct && (
              <>
                <div className={styles.alertInfo}>
                  <strong>Current:</strong> {selectedProduct.current_stock} | <strong>Min:</strong> {selectedProduct.minimum_stock}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Action *</label>
                  <select
                    name="action_type"
                    value={formData.action_type}
                    onChange={handleChange}
                    className={styles.formSelect}
                    required
                  >
                    <option value="restock">📦 Restock (Add)</option>
                    <option value="manual">⚙️ Manual (Set Total)</option>
                  </select>
                  <small className={styles.helpText}>
                    {formData.action_type === 'restock' ? 'Adds to current stock' : 'Sets exact total'}
                  </small>
                </div>

                {showSupplierField && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Supplier *</label>
                    <select
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className={styles.formSelect}
                      required
                    >
                      <option value="">-- Select --</option>
                      {activeSuppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </option>
                      ))}
                    </select>
                    {activeSuppliers.length === 0 && (
                      <small className={styles.errorText}>
                        No active suppliers available
                      </small>
                    )}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    {formData.action_type === 'manual' ? 'New Total *' : 'Quantity *'}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={styles.formInput}
                    required
                    min="1"
                    placeholder={formData.action_type === 'manual' ? 'Total quantity' : 'Units to add'}
                  />
                </div>

                {formData.quantity && (
                  <div className={styles.alertSuccess}>
                    <strong>New Stock: {newStock} units</strong>
                    {newStock <= selectedProduct.minimum_stock && (
                      <div className={styles.cautionText}>
                        ⚠️ At or below minimum ({selectedProduct.minimum_stock})
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className={styles.formTextarea}
                    rows="3"
                    placeholder="Optional notes..."
                  />
                </div>
              </>
            )}
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
              disabled={loading || !selectedProduct}
            >
              {loading ? 'Processing...' : '✅ Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustModal;