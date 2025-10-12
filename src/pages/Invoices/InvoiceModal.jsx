// src/pages/Invoices/InvoiceModal.jsx
import { useState } from 'react';
import api from '../../utils/api';

const InvoiceModal = ({ customers, products, onClose }) => {
  const [formData, setFormData] = useState({
    customer: '',
    due_date: '',
    notes: ''
  });
  const [items, setItems] = useState([
    { product: '', quantity: 1, unit_price: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-fill unit price when product is selected
    if (field === 'product' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index].unit_price = product.unit_price;
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = (item) => {
    return (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateSubtotal(item), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const invoiceData = {
        ...formData,
        total_amount: calculateTotal(),
        paid_amount: 0,
        status: 'Outstanding',
        items_data: items.map(item => ({
          product: parseInt(item.product),
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
          subtotal: calculateSubtotal(item)
        }))
      };

      await api.createInvoice(invoiceData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Invoice</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger">{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Customer *</label>
              <select
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Items *</label>
              {items.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginBottom: '0.75rem',
                  alignItems: 'flex-start'
                }}>
                  <select
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    className="form-select"
                    required
                    style={{ flex: 2 }}
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.code} - {product.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="form-input"
                    required
                    min="1"
                    style={{ flex: 1 }}
                  />

                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    className="form-input"
                    required
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                  />

                  <div style={{ 
                    flex: 1, 
                    padding: '0.625rem 0.875rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.5rem',
                    fontWeight: '600'
                  }}>
                    {calculateSubtotal(item).toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="btn btn-sm btn-danger"
                    disabled={items.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="btn btn-sm btn-outline"
                style={{ marginTop: '0.5rem' }}
              >
                + Add Item
              </button>
            </div>

            <div className="alert alert-info">
              <strong>Total Amount:</strong> KES {calculateTotal().toLocaleString()}
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
              disabled={loading || items.length === 0}
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceModal;