// src/pages/Sales/SaleModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './SaleModal.module.css';

const roundToTwoDecimals = (num) => Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return roundToTwoDecimals(num).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SaleModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    lpo_quotation_number: '',
    delivery_number: '',
    mode_of_payment: 'Not Paid',
    amount_paid: ''
  });

  const [lineItems, setLineItems] = useState([{
    product: '', quantity_ordered: '', supply_status: 'Supplied', quantity_supplied: '', unit_price: ''
  }]);

  const [productSearch, setProductSearch] = useState(['']);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    if (customerSearch.length >= 2) searchCustomers(customerSearch);
    else setCustomerSuggestions([]);
  }, [customerSearch]);

  const searchProducts = async (query, index) => {
    if (query.length < 2) return;
    try {
      const data = await api.request(`/sales/search_products/?q=${query}`);
      setProductSuggestions(Array.isArray(data) ? data : []);
      const newShow = [...showProductDropdown];
      newShow[index] = true;
      setShowProductDropdown(newShow);
    } catch (e) { console.error('Error searching products:', e); }
  };

  const searchCustomers = async (query) => {
    try {
      const data = await api.request(`/sales/search_customers/?q=${query}`);
      setCustomerSuggestions(Array.isArray(data) ? data : []);
      setShowCustomerDropdown(true);
    } catch (e) { console.error('Error searching customers:', e); }
  };

  const selectProduct = (product, index) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], product: product.id, unit_price: product.unit_price };
    setLineItems(newItems);
    const newSearch = [...productSearch];
    newSearch[index] = `${product.code} - ${product.name}`;
    setProductSearch(newSearch);
    const newShow = [...showProductDropdown];
    newShow[index] = false;
    setShowProductDropdown(newShow);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, customer: customer.id }));
    setCustomerSearch(customer.company_name);
    setShowCustomerDropdown(false);
  };

  const handleProductSearchChange = (value, index) => {
    const newSearch = [...productSearch];
    newSearch[index] = value;
    setProductSearch(newSearch);
    if (value.length >= 2) searchProducts(value, index);
  };

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...lineItems];
    if (field === 'supply_status') {
      newItems[index].supply_status = value;
      if (value === 'Supplied') newItems[index].quantity_supplied = newItems[index].quantity_ordered || '';
      else if (value === 'Not Supplied') newItems[index].quantity_supplied = '0';
    } else if (field === 'quantity_ordered') {
      newItems[index].quantity_ordered = value;
      if (newItems[index].supply_status === 'Supplied') newItems[index].quantity_supplied = value;
    } else {
      newItems[index][field] = value;
    }
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { product: '', quantity_ordered: '', supply_status: 'Supplied', quantity_supplied: '', unit_price: '' }]);
    setProductSearch([...productSearch, '']);
    setShowProductDropdown([...showProductDropdown, false]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
      setProductSearch(productSearch.filter((_, i) => i !== index));
      setShowProductDropdown(showProductDropdown.filter((_, i) => i !== index));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'mode_of_payment' && value === 'Not Paid') updated.amount_paid = '';
      return updated;
    });
  };

  // Calculate subtotal (products only, no VAT)
  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0));
    }, 0);
  };

  // Calculate VAT (16% of subtotal)
  const calculateVAT = () => {
    return roundToTwoDecimals(calculateSubtotal() * 0.16);
  };

  // Calculate total (subtotal + VAT)
  const calculateTotal = () => {
    return roundToTwoDecimals(calculateSubtotal() + calculateVAT());
  };

  // Calculate outstanding balance (total - amount paid)
  const calculateBalance = () => {
    return roundToTwoDecimals(calculateTotal() - (parseFloat(formData.amount_paid) || 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer) return alert('Please select a customer');

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.product || !item.quantity_ordered || !item.unit_price) return alert(`Complete all fields for product ${i + 1}`);
      if (item.supply_status === 'Partially Supplied') {
        if (!item.quantity_supplied || item.quantity_supplied === '0') return alert(`Enter quantity supplied for product ${i + 1}`);
        if (parseInt(item.quantity_supplied) >= parseInt(item.quantity_ordered)) return alert(`Quantity supplied must be less than ordered for product ${i + 1}`);
      }
    }

    if (formData.mode_of_payment !== 'Not Paid' && (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0)) {
      return alert('Please enter the amount paid');
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        line_items: lineItems.map(item => ({
          product: item.product,
          quantity_ordered: parseInt(item.quantity_ordered),
          quantity_supplied: item.supply_status === 'Not Supplied' ? 0 : parseInt(item.quantity_supplied),
          supply_status: item.supply_status,
          unit_price: roundToTwoDecimals(parseFloat(item.unit_price))
        })),
        amount_paid: formData.mode_of_payment === 'Not Paid' ? 0 : roundToTwoDecimals(parseFloat(formData.amount_paid)),
        subtotal: roundToTwoDecimals(calculateSubtotal()),
        vat_amount: calculateVAT(),
        total_amount: calculateTotal()
      };

      const result = await api.request('/sales/', { method: 'POST', body: JSON.stringify(payload) });
      const balance = parseFloat(result.outstanding_balance) || 0;
      alert(`Sale recorded! Sale #: ${result.sale_number}${balance > 0 ? ` | Balance: KES ${formatCurrency(balance)}` : ' | Fully Paid'}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      alert('Error recording sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Record New Sale</h2>
            <span className={styles.badge}>Auto-generated sale number</span>
          </div>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {/* Customer Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><span>👤</span> Customer Details</h3>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                <label className={styles.formLabel}>Customer <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                  className={styles.formInput}
                  placeholder="Search customers..."
                />
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className={styles.dropdown}>
                    {customerSuggestions.map(c => (
                      <div key={c.id} className={styles.dropdownItem} onClick={() => selectCustomer(c)}>
                        <strong>{c.company_name}</strong>
                        <span>{c.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>LPO/Quotation #</label>
                <input type="text" name="lpo_quotation_number" value={formData.lpo_quotation_number} onChange={handleInputChange} className={styles.formInput} placeholder="LPO-2024-001" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Delivery #</label>
                <input type="text" name="delivery_number" value={formData.delivery_number} onChange={handleInputChange} className={styles.formInput} placeholder="DEL-001" />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className={`${styles.section} ${styles.productsSection}`}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}><span>📦</span> Products</h3>
              <button type="button" onClick={addLineItem} className={styles.btnAdd}>+ Add Product</button>
            </div>
            <div className={styles.lineItems}>
              {lineItems.map((item, index) => (
                <div key={index} className={styles.lineItem}>
                  <div className={styles.lineItemHeader}>
                    <span>Product {index + 1}</span>
                    {lineItems.length > 1 && <button type="button" onClick={() => removeLineItem(index)} className={styles.btnRemove}>×</button>}
                  </div>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.autocompleteGroup} ${styles.fullWidth}`}>
                      <label className={styles.formLabel}>Product <span className={styles.required}>*</span></label>
                      <input
                        type="text"
                        value={productSearch[index] || ''}
                        onChange={(e) => handleProductSearchChange(e.target.value, index)}
                        onFocus={() => productSearch[index]?.length >= 2 && setShowProductDropdown(prev => { const n = [...prev]; n[index] = true; return n; })}
                        className={styles.formInput}
                        placeholder="Search products..."
                      />
                      {showProductDropdown[index] && productSuggestions.length > 0 && (
                        <div className={styles.dropdown}>
                          {productSuggestions.map(p => (
                            <div key={p.id} className={styles.dropdownItem} onClick={() => selectProduct(p, index)}>
                              <strong>{p.code}</strong> - {p.name}
                              <span>Stock: {p.current_stock} | KES {p.unit_price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Unit Price (KES) <span className={styles.required}>*</span></label>
                      <input type="number" value={item.unit_price} onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)} className={styles.formInput} min="0" step="0.01" placeholder="0.00" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Qty Ordered <span className={styles.required}>*</span></label>
                      <input type="number" value={item.quantity_ordered} onChange={(e) => handleLineItemChange(index, 'quantity_ordered', e.target.value)} className={styles.formInput} min="1" placeholder="0" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Supply Status <span className={styles.required}>*</span></label>
                      <select value={item.supply_status} onChange={(e) => handleLineItemChange(index, 'supply_status', e.target.value)} className={styles.formSelect}>
                        <option value="Supplied">Fully Supplied</option>
                        <option value="Partially Supplied">Partially Supplied</option>
                        <option value="Not Supplied">Not Supplied</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Qty Supplied <span className={styles.required}>*</span></label>
                      <input type="number" value={item.quantity_supplied} onChange={(e) => handleLineItemChange(index, 'quantity_supplied', e.target.value)} className={styles.formInput} min="0" max={item.quantity_ordered} placeholder="0" />
                      {item.supply_status === 'Partially Supplied' && <span className={styles.hint}>Must be less than {item.quantity_ordered || 'ordered'}</span>}
                    </div>
                    {item.quantity_ordered && item.unit_price && (
                      <div className={styles.subtotal}>
                        <label>Item Subtotal</label>
                        <span>KES {formatCurrency((parseInt(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0))}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Section */}
          <div className={`${styles.section} ${styles.paymentSection}`}>
            <h3 className={styles.sectionTitle}><span>💳</span> Payment & Summary</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Mode <span className={styles.required}>*</span></label>
                <select name="mode_of_payment" value={formData.mode_of_payment} onChange={handleInputChange} className={styles.formSelect}>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mpesa">M-Pesa</option>
                  <option value="Not Paid">Not Paid (Credit)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount Paid (KES) {formData.mode_of_payment !== 'Not Paid' && <span className={styles.required}>*</span>}</label>
                <input type="number" name="amount_paid" value={formData.amount_paid} onChange={handleInputChange} className={styles.formInput} min="0" step="0.01" placeholder="0.00" disabled={formData.mode_of_payment === 'Not Paid'} />
              </div>
            </div>

            {/* Financial Summary */}
            <div className={styles.financialSummary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal (Products):</span>
                <span className={styles.summaryValue}>KES {formatCurrency(calculateSubtotal())}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>VAT (16%):</span>
                <span className={styles.summaryValue}>KES {formatCurrency(calculateVAT())}</span>
              </div>
              
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span className={styles.totalLabel}>Total Amount:</span>
                <span className={styles.totalValue}>KES {formatCurrency(calculateTotal())}</span>
              </div>

              {formData.amount_paid && parseFloat(formData.amount_paid) > 0 && (
                <>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Amount Paid:</span>
                    <span className={styles.paidValue}>KES {formatCurrency(formData.amount_paid)}</span>
                  </div>
                  
                  <div className={`${styles.summaryRow} ${styles.balanceRow}`}>
                    <span className={styles.balanceLabel}>Outstanding Balance:</span>
                    <span className={calculateBalance() <= 0 ? styles.fullyPaidValue : styles.balanceValue}>
                      {calculateBalance() <= 0 ? '✓ Fully Paid' : `KES ${formatCurrency(calculateBalance())}`}
                    </span>
                  </div>
                </>
              )}

              {formData.mode_of_payment === 'Not Paid' && (
                <div className={`${styles.summaryRow} ${styles.balanceRow}`}>
                  <span className={styles.balanceLabel}>Outstanding Balance:</span>
                  <span className={styles.balanceValue}>KES {formatCurrency(calculateTotal())}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.btnOutline} disabled={loading}>Cancel</button>
          <button type="button" onClick={handleSubmit} className={styles.btnPrimary} disabled={loading}>
            {loading ? 'Recording...' : '💾 Record Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;