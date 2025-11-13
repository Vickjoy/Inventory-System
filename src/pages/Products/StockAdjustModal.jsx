// src/pages/Products/StockAdjustModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './StockAdjustModal.module.css';

const StockAdjustModal = ({ product, allProducts, suppliers, onClose }) => {
  const [formData, setFormData] = useState({
    action_type: 'restock', // 'restock' or 'manual'
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

  // Filter products based on search term
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
      setError('Please select a product');
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
        // Restock - requires supplier and adds quantity
        if (!formData.supplier) {
          setError('Please select a supplier for restocking');
          setLoading(false);
          return;
        }

        payload = {
          type: 'In', // Stock In
          quantity: quantity,
          supplier: formData.supplier,
          notes: formData.notes || `Restocked from supplier`
        };
      } else {
        // Manual Adjustment - sets absolute quantity
        payload = {
          type: 'Adjustment',
          quantity: quantity,
          notes: formData.notes || 'Manual stock adjustment'
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
      // Add to current stock
      return selectedProduct.current_stock + qty;
    } else {
      // Set to absolute value
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

            {/* Product Search - Only show when no product is pre-selected */}
            {!product && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Search Product * (Type code or name)
                </label>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.formInput}
                    placeholder="Type product code or name..."
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
                <small className={styles.helpText}>
                  Start typing to see matching products
                </small>
              </div>
            )}

            {selectedProduct && (
              <>
                <div className={styles.alertInfo}>
                  <strong>Current Stock:</strong> {selectedProduct.current_stock} units
                  <br />
                  <strong>Minimum Stock:</strong> {selectedProduct.minimum_stock} units
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Action Type *</label>
                  <select
                    name="action_type"
                    value={formData.action_type}
                    onChange={handleChange}
                    className={styles.formSelect}
                    required
                  >
                    <option value="restock">📦 Restock (Add from Supplier)</option>
                    <option value="manual">⚙️ Manual Adjustment (Set New Quantity)</option>
                  </select>
                  <small className={styles.helpText}>
                    {formData.action_type === 'restock' && '• Adds stock received from a supplier'}
                    {formData.action_type === 'manual' && '• Sets the exact total stock quantity'}
                  </small>
                </div>

                {/* Show supplier dropdown only for Restock */}
                {showSupplierField && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Supplier * (Select supplier for restock)
                    </label>
                    <select
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      className={styles.formSelect}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {activeSuppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company_name}
                        </option>
                      ))}
                    </select>
                    {activeSuppliers.length === 0 && (
                      <small className={styles.errorText}>
                        No active suppliers available. Please add suppliers first.
                      </small>
                    )}
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    {formData.action_type === 'manual' 
                      ? 'New Total Stock Quantity *' 
                      : 'Quantity to Add *'}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={styles.formInput}
                    required
                    min="1"
                    placeholder={
                      formData.action_type === 'manual' 
                        ? 'Enter new total quantity' 
                        : 'Enter quantity to add'
                    }
                  />
                  <small className={styles.helpText}>
                    {formData.action_type === 'manual' 
                      ? '• Enter the exact total stock you want (e.g., 100 units total)'
                      : '• Enter the number of units being added (e.g., add 50 units)'
                    }
                  </small>
                </div>

                {formData.quantity && (
                  <div className={styles.alertSuccess}>
                    <strong>
                      {formData.action_type === 'restock' 
                        ? `Adding ${formData.quantity} units to current stock` 
                        : `Setting total stock to ${formData.quantity} units`}
                    </strong>
                    <br />
                    <strong>New Stock Level:</strong> {newStock} units
                    {newStock <= selectedProduct.minimum_stock && (
                      <div className={styles.cautionText}>
                        ⚠️ Stock will be at or below minimum level ({selectedProduct.minimum_stock} units)
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
                    placeholder="Enter reason for stock adjustment (optional)"
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
              {loading ? 'Processing...' : '✅ Confirm Stock Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustModal;