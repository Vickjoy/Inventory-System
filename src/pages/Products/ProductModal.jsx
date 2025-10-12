// src/pages/Products/ProductModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';

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
        setSelectedCategory(subcat.category);
      }
    }
  }, [product, subcategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setFormData(prev => ({ ...prev, subcategory: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (product) {
        await api.updateProduct(product.id, formData);
      } else {
        await api.createProduct(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubcategories = subcategories.filter(
    sub => sub.category === parseInt(selectedCategory)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Product Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="e.g., CAP320"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Enter product description"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="form-select"
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

            <div className="form-group">
              <label className="form-label">SubCategory *</label>
              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                className="form-select"
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
            </div>

            <div className="form-group">
              <label className="form-label">Unit Price (KES) *</label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                className="form-input"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Stock *</label>
              <input
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                className="form-input"
                required
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Stock Level *</label>
              <input
                type="number"
                name="minimum_stock"
                value={formData.minimum_stock}
                onChange={handleChange}
                className="form-input"
                required
                min="0"
                placeholder="10"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;