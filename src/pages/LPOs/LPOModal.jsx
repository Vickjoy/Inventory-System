// src/pages/LPOs/LPOModal.jsx
import { useState } from 'react';
import api from '../../utils/api';

const LPOModal = ({ suppliers, products, onClose }) => {
  const [formData, setFormData] = useState({
    lpo_number: '',
    supplier: '',
    product: '',
    ordered_quantity: '',
    expected_delivery: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.createLPO(formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New LPO</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">LPO Number *</label>
              <input
                type="text"
                name="lpo_number"
                value={formData.lpo_number}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="e.g., LPO-2025-001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Product *</label>
              <select
                name="product"
                value={formData.product}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select Product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ordered Quantity *</label>
              <input
                type="number"
                name="ordered_quantity"
                value={formData.ordered_quantity}
                onChange={handleChange}
                className="form-input"
                required
                min="1"
                placeholder="Enter quantity"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expected Delivery Date</label>
              <input
                type="date"
                name="expected_delivery"
                value={formData.expected_delivery}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Additional notes (optional)"
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
              {loading ? 'Creating...' : 'Create LPO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LPOModal;