// src/pages/Sales/SaleModal.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './SaleModal.module.css';

const roundToTwoDecimals = (num) => Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return roundToTwoDecimals(num).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getTodayLocal = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const handleIntegerInput = (value) => value.replace(/[^0-9]/g, '');

const handleDecimalInput = (value) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
  if (parts[1]?.length > 2) return parts[0] + '.' + parts[1].slice(0, 2);
  return cleaned;
};

// sale prop is passed when editing an existing pending sale
const SaleModal = ({ onClose, onSuccess, sale }) => {
  const isEditing = !!sale;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer: '',
    sale_date: getTodayLocal(),
    salesperson: '',
    lpo_quotation_number: '',
    delivery_number: '',
    mode_of_payment: 'Not Paid',
    amount_paid: '',
  });

  const [lineItems, setLineItems] = useState([{
    product: '',
    quantity_ordered: '',
    supply_status: 'Supplied',
    quantity_supplied: '',
    unit_price: '',
  }]);

  const [productSearch, setProductSearch] = useState(['']);
  const [customerSearch, setCustomerSearch] = useState('');
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [salespersonSuggestions, setSalespersonSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);

  // ── Pre-populate form when editing an existing sale ──────────────────────
  useEffect(() => {
    if (!isEditing) return;

    setFormData({
      customer: sale.customer || '',
      sale_date: sale.sale_date || getTodayLocal(),
      salesperson: sale.salesperson || '',
      lpo_quotation_number: sale.lpo_quotation_number || '',
      delivery_number: sale.delivery_number || '',
      mode_of_payment: sale.mode_of_payment || 'Not Paid',
      amount_paid: sale.amount_paid && parseFloat(sale.amount_paid) > 0
        ? String(sale.amount_paid)
        : '',
    });

    setCustomerSearch(sale.customer_name || '');
    setSalespersonSearch(sale.salesperson || '');

    if (Array.isArray(sale.line_items) && sale.line_items.length > 0) {
      const items = sale.line_items.map(item => ({
        id: item.id,                          // keep line item id for PUT
        product: item.product,
        quantity_ordered: String(item.quantity_ordered || ''),
        supply_status: item.supply_status || 'Supplied',
        quantity_supplied: String(item.quantity_supplied || ''),
        unit_price: item.unit_price != null ? String(item.unit_price) : '',
      }));
      setLineItems(items);

      const searches = sale.line_items.map(item =>
        item.product_code && item.product_name
          ? `${item.product_code} - ${item.product_name}`
          : item.product_name || ''
      );
      setProductSearch(searches);
      setShowProductDropdown(sale.line_items.map(() => false));
    }
  }, [isEditing]);

  // ── Search side-effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (customerSearch.length >= 2) searchCustomers(customerSearch);
    else setCustomerSuggestions([]);
  }, [customerSearch]);

  useEffect(() => {
    if (salespersonSearch.length >= 2) searchSalespersons(salespersonSearch);
    else setSalespersonSuggestions([]);
  }, [salespersonSearch]);

  // ── API search helpers ───────────────────────────────────────────────────
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

  const searchSalespersons = async (query) => {
    try {
      const data = await api.request(`/sales/search_salespersons/?q=${query}`);
      setSalespersonSuggestions(Array.isArray(data) ? data : []);
      setShowSalespersonDropdown(true);
    } catch (e) { console.error('Error searching salespersons:', e); }
  };

  // ── Selection handlers ───────────────────────────────────────────────────
  const selectSalesperson = (sp) => {
    setFormData(prev => ({ ...prev, salesperson: sp.name }));
    setSalespersonSearch(sp.name);
    setShowSalespersonDropdown(false);
  };

  const handleSalespersonSearchChange = (e) => {
    const value = e.target.value;
    setSalespersonSearch(value);
    setFormData(prev => ({ ...prev, salesperson: value }));
    if (value.length >= 2) searchSalespersons(value);
    else setSalespersonSuggestions([]);
  };

  const selectProduct = (product, index) => {
    const newItems = [...lineItems];
    newItems[index] = {
      ...newItems[index],
      product: product.id,
      unit_price: product.unit_price != null ? String(product.unit_price) : '',
    };
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

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearch(value);
    setFormData(prev => ({ ...prev, customer: '' }));
    if (value.length >= 2) searchCustomers(value);
    else setCustomerSuggestions([]);
  };

  const handleProductSearchChange = (value, index) => {
    const newSearch = [...productSearch];
    newSearch[index] = value;
    setProductSearch(newSearch);
    if (value.length >= 2) searchProducts(value, index);
  };

  // ── Line item change handler ─────────────────────────────────────────────
  const handleLineItemChange = (index, field, value) => {
    const newItems = [...lineItems];
    if (field === 'unit_price') {
      newItems[index].unit_price = handleDecimalInput(value);
    } else if (field === 'quantity_ordered') {
      const cleaned = handleIntegerInput(value);
      newItems[index].quantity_ordered = cleaned;
      if (newItems[index].supply_status === 'Supplied') {
        newItems[index].quantity_supplied = cleaned;
      }
    } else if (field === 'quantity_supplied') {
      newItems[index].quantity_supplied = handleIntegerInput(value);
    } else if (field === 'supply_status') {
      newItems[index].supply_status = value;
      if (value === 'Supplied') {
        newItems[index].quantity_supplied = newItems[index].quantity_ordered || '';
      } else if (value === 'Not Supplied') {
        newItems[index].quantity_supplied = '0';
      } else {
        newItems[index].quantity_supplied = '';
      }
    } else {
      newItems[index][field] = value;
    }
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product: '', quantity_ordered: '', supply_status: 'Supplied',
      quantity_supplied: '', unit_price: '',
    }]);
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
    if (name === 'amount_paid') {
      setFormData(prev => ({ ...prev, amount_paid: handleDecimalInput(value) }));
      return;
    }
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'mode_of_payment' && value === 'Not Paid') updated.amount_paid = '';
      return updated;
    });
  };

  // ── Totals ───────────────────────────────────────────────────────────────
  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) =>
      sum + ((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0)), 0);

  const calculateTotal = () => roundToTwoDecimals(calculateSubtotal());

  const calculateBalance = () =>
    roundToTwoDecimals(calculateTotal() - (parseFloat(formData.amount_paid) || 0));

  // ── Validation (shared for create & edit) ────────────────────────────────
  const validate = () => {
    if (!customerSearch.trim()) { alert('Please enter or select a customer'); return false; }
    if (!formData.sale_date) { alert('Please enter a sale date'); return false; }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.product || !item.quantity_ordered) {
        alert(`Please select a product and enter a quantity for item ${i + 1}`);
        return false;
      }
      const qty = parseFloat(item.quantity_ordered);
      if (isNaN(qty) || qty <= 0) { alert(`Invalid quantity for product ${i + 1}`); return false; }
      if (item.unit_price !== '' && item.unit_price != null) {
        const price = parseFloat(item.unit_price);
        if (isNaN(price) || price < 0) { alert(`Invalid unit price for product ${i + 1}`); return false; }
      }
      if (item.supply_status === 'Partially Supplied') {
        const qtySupplied = parseFloat(item.quantity_supplied);
        if (!item.quantity_supplied || item.quantity_supplied === '0') {
          alert(`Enter quantity supplied for product ${i + 1}`); return false;
        }
        if (qtySupplied >= qty) {
          alert(`Quantity supplied must be less than ordered for product ${i + 1}`); return false;
        }
      }
    }

    if (formData.mode_of_payment !== 'Not Paid' &&
        (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0)) {
      alert('Please enter the amount paid');
      return false;
    }
    return true;
  };

  // ── Build shared payload ─────────────────────────────────────────────────
  const buildPayload = () => {
    const subtotal = roundToTwoDecimals(calculateSubtotal());
    return {
      ...(formData.customer
        ? { customer: formData.customer }
        : { customer_name: customerSearch.trim() }
      ),
      sale_date: formData.sale_date,
      salesperson: formData.salesperson.trim() || null,
      lpo_quotation_number: formData.lpo_quotation_number,
      delivery_number: formData.delivery_number,
      mode_of_payment: formData.mode_of_payment,
      line_items: lineItems.map(item => ({
        ...(item.id ? { id: item.id } : {}),        // include id when editing
        product: item.product,
        quantity_ordered: parseInt(item.quantity_ordered),
        quantity_supplied:
          item.supply_status === 'Not Supplied' ? 0
          : item.supply_status === 'Supplied' ? parseInt(item.quantity_ordered)
          : parseInt(item.quantity_supplied),
        supply_status: item.supply_status,
        unit_price: item.unit_price === '' || item.unit_price == null
          ? null
          : roundToTwoDecimals(parseFloat(item.unit_price)),
      })),
      amount_paid: formData.mode_of_payment === 'Not Paid'
        ? 0
        : roundToTwoDecimals(parseFloat(formData.amount_paid)),
      subtotal,
      vat_amount: 0,
      total_amount: subtotal,
    };
  };

  // ── Submit handler — create OR update ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = buildPayload();

      let result;
      if (isEditing) {
        // PUT to update the existing pending sale; status stays 'pending'
        result = await api.updateSale(sale.id, payload);
        alert(
          `✅ Sale updated and resubmitted!\n\n` +
          `Sale #: ${result.sale_number}\n` +
          `Date: ${result.sale_date}\n` +
          `Total: KES ${formatCurrency(result.total_amount)}\n\n` +
          `⏳ Status: Pending Admin Approval`
        );
      } else {
        result = await api.request('/sales/', { method: 'POST', body: JSON.stringify(payload) });
        alert(
          `✅ Sale submitted successfully!\n\n` +
          `Sale #: ${result.sale_number}\n` +
          `Date: ${result.sale_date || formData.sale_date}\n` +
          `Total: KES ${formatCurrency(result.total_amount)}\n\n` +
          `⏳ Status: Pending Admin Approval\n` +
          `Stock will be deducted once an admin approves this sale.`
        );
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      alert(`Error ${isEditing ? 'updating' : 'recording'} sale: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              {isEditing ? '✏️ Edit Pending Sale' : 'Record New Sale'}
            </h2>
            {isEditing ? (
              <span className={styles.badge} style={{ background: 'rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                ✏️ Editing {sale.sale_number} — will resubmit for approval
              </span>
            ) : (
              <span className={styles.badge}>⏳ Will be sent for admin approval</span>
            )}
          </div>
          <button className={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>

          {/* Edit notice banner */}
          {isEditing && (
            <div className={styles.editNoticeBanner}>
              <span className={styles.editNoticeIcon}>ℹ️</span>
              <div>
                <strong>Editing a pending sale</strong>
                <p>
                  You can correct any details below. When you click <em>Update &amp; Resubmit</em>,
                  the corrected record will be saved and remain pending for admin approval.
                </p>
              </div>
            </div>
          )}

          {/* Customer Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><span>👤</span> Customer Details</h3>
            <div className={styles.formGrid}>

              {/* Customer autocomplete */}
              <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                <label className={styles.formLabel}>
                  Customer <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={handleCustomerSearchChange}
                  onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                  className={styles.formInput}
                  placeholder="Type customer name..."
                />
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className={styles.dropdown}>
                    {customerSuggestions.map(c => (
                      <div key={c.id} className={styles.dropdownItem} onClick={() => selectCustomer(c)}>
                        <strong>{c.company_name}</strong>
                        <span>{c.phone}</span>
                      </div>
                    ))}
                  </div>
                )}
                {formData.customer
                  ? <span className={styles.customerSelected}>✓ Existing customer selected</span>
                  : customerSearch.trim()
                    ? <span className={styles.manualHint}>Will be saved as a new customer name</span>
                    : null
                }
              </div>

              {/* Sale Date */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Sale Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  name="sale_date"
                  value={formData.sale_date}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  max={getTodayLocal()}
                />
              </div>

              {/* Salesperson autocomplete */}
              <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                <label className={styles.formLabel}>Salesperson</label>
                <input
                  type="text"
                  value={salespersonSearch}
                  onChange={handleSalespersonSearchChange}
                  onFocus={() => salespersonSearch.length >= 2 && setShowSalespersonDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSalespersonDropdown(false), 150)}
                  className={styles.formInput}
                  placeholder="Type to search salesperson..."
                />
                {showSalespersonDropdown && salespersonSuggestions.length > 0 && (
                  <div className={styles.dropdown}>
                    {salespersonSuggestions.map(sp => (
                      <div key={sp.id} className={styles.dropdownItem} onClick={() => selectSalesperson(sp)}>
                        <strong>{sp.name}</strong>
                        {sp.phone && <span>{sp.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LPO / Quotation # */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>LPO/Quotation #</label>
                <input
                  type="text"
                  name="lpo_quotation_number"
                  value={formData.lpo_quotation_number}
                  onChange={handleInputChange}
                  className={styles.formInput}
                />
              </div>

              {/* Delivery # */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Delivery #</label>
                <input
                  type="text"
                  name="delivery_number"
                  value={formData.delivery_number}
                  onChange={handleInputChange}
                  className={styles.formInput}
                />
              </div>

            </div>
          </div>

          {/* Products Section */}
          <div className={`${styles.section} ${styles.productsSection}`}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}><span>📦</span> Products</h3>
              <button type="button" onClick={addLineItem} className={styles.btnAdd}>
                + Add Product
              </button>
            </div>
            <div className={styles.lineItems}>
              {lineItems.map((item, index) => (
                <div key={index} className={styles.lineItem}>
                  <div className={styles.lineItemHeader}>
                    <span>Product {index + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className={styles.btnRemove}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.autocompleteGroup} ${styles.fullWidth}`}>
                      <label className={styles.formLabel}>
                        Product <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        value={productSearch[index] || ''}
                        onChange={(e) => handleProductSearchChange(e.target.value, index)}
                        onFocus={() =>
                          productSearch[index]?.length >= 2 &&
                          setShowProductDropdown(prev => {
                            const n = [...prev]; n[index] = true; return n;
                          })
                        }
                        className={styles.formInput}
                        placeholder="Search products..."
                      />
                      {showProductDropdown[index] && productSuggestions.length > 0 && (
                        <div className={styles.dropdown}>
                          {productSuggestions.map(p => (
                            <div
                              key={p.id}
                              className={styles.dropdownItem}
                              onClick={() => selectProduct(p, index)}
                            >
                              <strong>{p.code}</strong> - {p.name}
                              <span>Stock: {p.current_stock} | KES {p.unit_price ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Unit Price (KES)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                        className={styles.formInput}
                        placeholder="0.00 (optional)"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Qty Ordered <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity_ordered}
                        onChange={(e) => handleLineItemChange(index, 'quantity_ordered', e.target.value)}
                        className={styles.formInput}
                        placeholder="0"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Supply Status <span className={styles.required}>*</span>
                      </label>
                      <select
                        value={item.supply_status}
                        onChange={(e) => handleLineItemChange(index, 'supply_status', e.target.value)}
                        className={styles.formSelect}
                      >
                        <option value="Supplied">Fully Supplied</option>
                        <option value="Partially Supplied">Partially Supplied</option>
                        <option value="Not Supplied">Not Supplied</option>
                      </select>
                    </div>

                    {item.supply_status === 'Partially Supplied' && item.quantity_ordered && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                          Qty Supplied <span className={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity_supplied}
                          onChange={(e) =>
                            handleLineItemChange(index, 'quantity_supplied', e.target.value)
                          }
                          className={styles.formInput}
                          placeholder="0"
                        />
                        <span className={styles.hint}>Must be less than {item.quantity_ordered}</span>
                      </div>
                    )}

                    {item.quantity_ordered && item.unit_price && (
                      <div className={styles.subtotal}>
                        <label>Item Subtotal</label>
                        <span>
                          KES {formatCurrency(
                            (parseFloat(item.quantity_ordered) || 0) *
                            (parseFloat(item.unit_price) || 0)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Section */}
          <div className={`${styles.section} ${styles.paymentSection}`}>
            <h3 className={styles.sectionTitle}><span>💳</span> Payment &amp; Summary</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Payment Mode <span className={styles.required}>*</span>
                </label>
                <select
                  name="mode_of_payment"
                  value={formData.mode_of_payment}
                  onChange={handleInputChange}
                  className={styles.formSelect}
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mpesa">M-Pesa</option>
                  <option value="Not Paid">Not Paid (Credit)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Amount Paid (KES)
                  {formData.mode_of_payment !== 'Not Paid' && (
                    <span className={styles.required}>*</span>
                  )}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  placeholder="0.00"
                  disabled={formData.mode_of_payment === 'Not Paid'}
                />
              </div>
            </div>

            <div className={styles.financialSummary}>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span className={styles.totalLabel}>Total Amount:</span>
                <span className={styles.totalValue}>KES {formatCurrency(calculateTotal())}</span>
              </div>
              {formData.amount_paid && parseFloat(formData.amount_paid) > 0 && (
                <>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Amount Paid:</span>
                    <span className={styles.paidValue}>
                      KES {formatCurrency(formData.amount_paid)}
                    </span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.balanceRow}`}>
                    <span className={styles.balanceLabel}>Outstanding Balance:</span>
                    <span className={calculateBalance() <= 0 ? styles.fullyPaidValue : styles.balanceValue}>
                      {calculateBalance() <= 0
                        ? '✓ Fully Paid'
                        : `KES ${formatCurrency(calculateBalance())}`}
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

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            className={styles.btnOutline}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={isEditing ? styles.btnUpdate : styles.btnPrimary}
            disabled={loading}
          >
            {loading
              ? isEditing ? 'Updating...' : 'Submitting...'
              : isEditing ? 'Update & Resubmit' : 'Submit for Approval'
            }
          </button>
        </div>

      </div>
    </div>
  );
};

export default SaleModal;