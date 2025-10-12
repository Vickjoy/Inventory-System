// src/pages/Products/StockAdjustModal.jsx
import { useState } from 'react';
import api from '../../utils/api';

const StockAdjustModal = ({ product, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'In',
    quantity: '',
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
      await api.adjustStock(product.id, formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const newStock = formData.type === 'In' 
    ? product.current_stock + parseInt(formData.quantity || 0)
    : product.current_stock - parseInt(formData.quantity || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Adjust Stock - {product.code}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="alert alert-info">
              <strong>Current Stock:</strong> {product.current_stock} units
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="In">Stock In (Add)</option>
                <option value="Out">Stock Out (Remove)</option>
                <option value="Adjustment">Manual Adjustment</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="form-input"
                required
                min="1"
                placeholder="Enter quantity"
              />
            </div>

            {formData.quantity && (
              <div className="alert alert-success">
                <strong>New Stock Level:</strong> {newStock} units
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-textarea"
                placeholder="Enter reason for adjustment (optional)"
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
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustModal;