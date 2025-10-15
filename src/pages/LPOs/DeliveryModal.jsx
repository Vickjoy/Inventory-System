// src/pages/LPOs/DeliveryModal.jsx
import { useState } from 'react';
import api from '../../utils/api';

const DeliveryModal = ({ lpo, onClose }) => {
  const [formData, setFormData] = useState({
    delivered_quantity: ''
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

    const deliveryQty = parseInt(formData.delivered_quantity);
    
    if (deliveryQty > lpo.pending_quantity) {
      setError('Delivery quantity cannot exceed pending quantity');
      return;
    }

    if (deliveryQty <= 0) {
      setError('Delivery quantity must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      await api.updateDelivery(lpo.id, formData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const newDeliveredQty = lpo.delivered_quantity + parseInt(formData.delivered_quantity || 0);
  const newPendingQty = lpo.ordered_quantity - newDeliveredQty;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Update Delivery - {lpo.lpo_number}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="alert alert-info">
              <div><strong>Product:</strong> {lpo.product_code} - {lpo.product_name}</div>
              <div><strong>Supplier:</strong> {lpo.supplier_name}</div>
              <div><strong>Ordered Quantity:</strong> {lpo.ordered_quantity}</div>
              <div><strong>Already Delivered:</strong> {lpo.delivered_quantity}</div>
              <div><strong>Pending Quantity:</strong> {lpo.pending_quantity}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Quantity *</label>
              <input
                type="number"
                name="delivered_quantity"
                value={formData.delivered_quantity}
                onChange={handleChange}
                className="form-input"
                required
                min="1"
                max={lpo.pending_quantity}
                placeholder="Enter delivered quantity"
              />
            </div>

            {formData.delivered_quantity && (
              <div className="alert alert-success">
                <div><strong>New Total Delivered:</strong> {newDeliveredQty} units</div>
                <div><strong>Remaining Pending:</strong> {newPendingQty} units</div>
                <div><strong>Status:</strong> {newPendingQty === 0 ? 'Completed' : 'Partial'}</div>
              </div>
            )}
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
              {loading ? 'Updating...' : 'Update Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryModal;