// src/pages/Invoices/PaymentModal.jsx
import { useState } from 'react';
import api from '../../utils/api';

const PaymentModal = ({ invoice, onClose }) => {
  const [formData, setFormData] = useState({
    amount: invoice.remaining_balance || '',
    payment_method: 'Cash',
    reference_number: ''
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

    if (parseFloat(formData.amount) > invoice.remaining_balance) {
      setError('Payment amount cannot exceed remaining balance');
      return;
    }

    setLoading(true);

    try {
      await api.recordPayment(invoice.id, formData);
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
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="alert alert-info">
              <div><strong>Invoice:</strong> {invoice.invoice_number}</div>
              <div><strong>Customer:</strong> {invoice.customer_name}</div>
              <div><strong>Total Amount:</strong> KES {Number(invoice.total_amount).toLocaleString()}</div>
              <div><strong>Paid Amount:</strong> KES {Number(invoice.paid_amount).toLocaleString()}</div>
              <div><strong>Remaining Balance:</strong> KES {Number(invoice.remaining_balance).toLocaleString()}</div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Amount (KES) *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="form-input"
                required
                min="0.01"
                max={invoice.remaining_balance}
                step="0.01"
                placeholder="Enter payment amount"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleChange}
                className="form-input"
                placeholder="Transaction reference (optional)"
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
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;