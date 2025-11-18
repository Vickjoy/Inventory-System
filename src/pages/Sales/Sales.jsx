// src/pages/Sales/Sales.jsx

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import styles from './Sales.module.css';

// ============================================
// UTILITY FUNCTIONS FOR DECIMAL PRECISION
// ============================================
const roundToTwoDecimals = (num) => {
  return Math.round((parseFloat(num) + Number.EPSILON) * 100) / 100;
};

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return roundToTwoDecimals(num).toLocaleString('en-KE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [searchParams] = useSearchParams();

  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    lpo_quotation_number: '',
    delivery_number: '',
    mode_of_payment: 'Not Paid',
    amount_paid: ''
  });

  // Line items state
  const [lineItems, setLineItems] = useState([{
    product: '',
    quantity_ordered: '',
    supply_status: 'Supplied',
    quantity_supplied: '',
    unit_price: ''
  }]);

  // Autocomplete states
  const [productSearch, setProductSearch] = useState(['']);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Check URL parameters on mount
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'outstanding') {
      setActiveTab('outstanding');
    }
  }, [searchParams]);

  useEffect(() => {
    loadSales();
  }, [activeTab]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    } else {
      setCustomerSuggestions([]);
    }
  }, [customerSearch]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'outstanding' ? '/sales/outstanding/' : '/sales/';
      const data = await api.request(endpoint);
      if (Array.isArray(data)) {
        setSales(data);
      } else if (data && data.results && Array.isArray(data.results)) {
        setSales(data.results);
      } else {
        console.warn('Unexpected sales data format:', data);
        setSales([]);
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query, index) => {
    if (query.length < 2) return;
    try {
      const data = await api.request(`/sales/search_products/?q=${query}`);
      setProductSuggestions(Array.isArray(data) ? data : []);
      const newShowDropdown = [...showProductDropdown];
      newShowDropdown[index] = true;
      setShowProductDropdown(newShowDropdown);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const searchCustomers = async (query) => {
    try {
      const data = await api.request(`/sales/search_customers/?q=${query}`);
      setCustomerSuggestions(Array.isArray(data) ? data : []);
      setShowCustomerDropdown(true);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const selectProduct = (product, index) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      product: product.id,
      unit_price: product.unit_price
    };
    setLineItems(newLineItems);

    const newProductSearch = [...productSearch];
    newProductSearch[index] = `${product.code} - ${product.name}`;
    setProductSearch(newProductSearch);

    const newShowDropdown = [...showProductDropdown];
    newShowDropdown[index] = false;
    setShowProductDropdown(newShowDropdown);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, customer: customer.id }));
    setCustomerSearch(customer.company_name);
    setShowCustomerDropdown(false);
  };

  const handleProductSearchChange = (value, index) => {
    const newProductSearch = [...productSearch];
    newProductSearch[index] = value;
    setProductSearch(newProductSearch);
    if (value.length >= 2) {
      searchProducts(value, index);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...lineItems];
    if (field === 'supply_status') {
      newLineItems[index].supply_status = value;
      if (value === 'Supplied') {
        newLineItems[index].quantity_supplied = newLineItems[index].quantity_ordered || '';
      } else if (value === 'Not Supplied') {
        newLineItems[index].quantity_supplied = '0';
      } else if (value === 'Partially Supplied') {
        // Leave quantity_supplied unchanged for manual input
      }
    }
    else if (field === 'quantity_ordered') {
      newLineItems[index].quantity_ordered = value;
      // Only auto-fill if fully supplied
      if (newLineItems[index].supply_status === 'Supplied') {
        newLineItems[index].quantity_supplied = value;
      }
    }
    else if (field === 'quantity_supplied') {
      newLineItems[index].quantity_supplied = value;
    }
    else {
      newLineItems[index][field] = value;
    }
    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product: '',
      quantity_ordered: '',
      supply_status: 'Supplied',
      quantity_supplied: '',
      unit_price: ''
    }]);
    setProductSearch([...productSearch, '']);
    setShowProductDropdown([...showProductDropdown, false]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newLineItems);
      const newProductSearch = productSearch.filter((_, i) => i !== index);
      setProductSearch(newProductSearch);
      const newShowDropdown = showProductDropdown.filter((_, i) => i !== index);
      setShowProductDropdown(newShowDropdown);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Clear amount paid when "Not Paid" is selected
      if (name === 'mode_of_payment' && value === 'Not Paid') {
        updated.amount_paid = '';
      }
      return updated;
    });
  };

  // Calculate total with proper decimal handling
  const calculateTotal = () => {
    const total = lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity_ordered) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
    return roundToTwoDecimals(total);
  };

  // Calculate balance with proper decimal handling
  const calculateBalance = () => {
    const total = calculateTotal();
    const paid = parseFloat(formData.amount_paid) || 0;
    const balance = total - paid;
    return roundToTwoDecimals(balance);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      alert('Please select a customer');
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.product || !item.quantity_ordered || !item.unit_price) {
        alert(`Please complete all fields for product ${i + 1}`);
        return;
      }

      if (item.supply_status === 'Partially Supplied') {
        if (!item.quantity_supplied || item.quantity_supplied === '' || item.quantity_supplied === '0') {
          alert(`Please enter quantity supplied for product ${i + 1}`);
          return;
        }
        const qtySupplied = parseInt(item.quantity_supplied);
        const qtyOrdered = parseInt(item.quantity_ordered);
        if (qtySupplied >= qtyOrdered) {
          alert(`Quantity supplied for product ${i + 1} cannot be equal to or greater than quantity ordered. Please select "Fully Supplied" instead.`);
          return;
        }
      }
    }

    // Validate amount paid for non-"Not Paid" modes
    if (formData.mode_of_payment !== 'Not Paid') {
      if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
        alert('Please enter the amount paid');
        return;
      }
    }

    try {
      setLoading(true);
      
      const total = calculateTotal();
      const amountPaid = formData.mode_of_payment === 'Not Paid' 
        ? 0 
        : roundToTwoDecimals(parseFloat(formData.amount_paid));

      const payload = {
        ...formData,
        line_items: lineItems.map(item => ({
          product: item.product,
          quantity_ordered: parseInt(item.quantity_ordered),
          quantity_supplied: item.supply_status === 'Not Supplied'
            ? 0
            : parseInt(item.quantity_supplied),
          supply_status: item.supply_status,
          unit_price: roundToTwoDecimals(parseFloat(item.unit_price))
        })),
        amount_paid: amountPaid
      };

      console.log('Submitting sale:', payload);

      const result = await api.request('/sales/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('Sale created:', result);
      
      const outstandingBalance = parseFloat(result.outstanding_balance) || 0;
      const outstandingMsg = outstandingBalance > 0 
        ? ` | Outstanding Balance: KES ${formatCurrency(outstandingBalance)}`
        : ' | Fully Paid';
      
      alert(`Sale recorded successfully! Sale Number: ${result.sale_number}${outstandingMsg}`);

      resetForm();
      await loadSales();
    } catch (error) {
      console.error('Error recording sale:', error);
      alert('Error recording sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      lpo_quotation_number: '',
      delivery_number: '',
      mode_of_payment: 'Not Paid',
      amount_paid: ''
    });
    setLineItems([{
      product: '',
      quantity_ordered: '',
      supply_status: 'Supplied',
      quantity_supplied: '',
      unit_price: ''
    }]);
    setProductSearch(['']);
    setCustomerSearch('');
    setShowForm(false);
  };

  const filteredSales = sales.filter(sale =>
    sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lpo_quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      'Supplied': 'badge-success',
      'Partially Supplied': 'badge-warning',
      'Not Supplied': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  return (
    <div className={styles.salesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sales Entry</h1>
          <p className={styles.pageSubtitle}>Record and manage daily sales</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? '✕ Close' : '➕ New Sale'}
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target.className.includes('modalOverlay')) {
            setShowForm(false);
          }
        }}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Record New Sale</h2>
                <div className={styles.saleNumberBadge}>
                  Sale number will be auto-generated
                </div>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowForm(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Customer & Reference Section */}
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>👤</span>
                  Customer & Reference Details
                </h3>
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                    <label className="form-label">
                      Customer <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                      className="form-input"
                      placeholder="Type to search customers..."
                      required
                    />
                    {showCustomerDropdown && customerSuggestions.length > 0 && (
                      <div className={styles.autocompleteDropdown}>
                        {customerSuggestions.map(customer => (
                          <div
                            key={customer.id}
                            className={styles.autocompleteItem}
                            onClick={() => selectCustomer(customer)}
                          >
                            <strong>{customer.company_name}</strong>
                            <span className={styles.itemSubtitle}>{customer.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label">LPO/Quotation Number</label>
                    <input
                      type="text"
                      name="lpo_quotation_number"
                      value={formData.lpo_quotation_number}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., LPO-2024-001"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label">Delivery Number</label>
                    <input
                      type="text"
                      name="delivery_number"
                      value={formData.delivery_number}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., DEL-001"
                    />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className={`${styles.formSection} ${styles.productsSection}`}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>📦</span>
                    Products
                  </h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="btn btn-sm btn-outline"
                  >
                    ➕ Add Product
                  </button>
                </div>

                <div className={styles.lineItemsContainer}>
                  {lineItems.map((item, index) => (
                    <div key={index} className={styles.lineItemCard}>
                      <div className={styles.lineItemHeader}>
                        <span className={styles.lineItemNumber}>Product {index + 1}</span>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className={styles.btnRemove}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className={styles.formGrid}>
                        <div className={`${styles.formGroup} ${styles.autocompleteGroup} ${styles.fullWidth}`}>
                          <label className="form-label">
                            Product Name <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            value={productSearch[index] || ''}
                            onChange={(e) => handleProductSearchChange(e.target.value, index)}
                            onFocus={() => {
                              if (productSearch[index] && productSearch[index].length >= 2) {
                                const newShowDropdown = [...showProductDropdown];
                                newShowDropdown[index] = true;
                                setShowProductDropdown(newShowDropdown);
                              }
                            }}
                            className="form-input"
                            placeholder="Type to search products..."
                            required
                          />
                          {showProductDropdown[index] && productSuggestions.length > 0 && (
                            <div className={styles.autocompleteDropdown}>
                              {productSuggestions.map(product => (
                                <div
                                  key={product.id}
                                  className={styles.autocompleteItem}
                                  onClick={() => selectProduct(product, index)}
                                >
                                  <strong>{product.code}</strong> - {product.name}
                                  <span className={styles.itemSubtitle}>
                                    Stock: {product.current_stock} | Price: KES {product.unit_price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label className="form-label">
                            Unit Price (KES) <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, 'unit_price', e.target.value)}
                            className="form-input"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className="form-label">
                            Quantity Ordered <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity_ordered}
                            onChange={(e) => handleLineItemChange(index, 'quantity_ordered', e.target.value)}
                            className="form-input"
                            min="1"
                            placeholder="0"
                            required
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className="form-label">
                            Supply Status <span className={styles.required}>*</span>
                          </label>
                          <select
                            value={item.supply_status}
                            onChange={(e) => handleLineItemChange(index, 'supply_status', e.target.value)}
                            className="form-select"
                          >
                            <option value="Supplied">Fully Supplied</option>
                            <option value="Partially Supplied">Partially Supplied</option>
                            <option value="Not Supplied">Not Supplied</option>
                          </select>
                        </div>

                        <div className={styles.formGroup}>
                          <label className="form-label">
                            Quantity Supplied <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity_supplied}
                            onChange={(e) => handleLineItemChange(index, 'quantity_supplied', e.target.value)}
                            className="form-input"
                            min="0"
                            max={item.quantity_ordered}
                            placeholder="Enter quantity supplied"
                            required
                          />
                          {item.supply_status === 'Partially Supplied' && (
                            <span className={styles.fieldHint}>
                              Must be less than {item.quantity_ordered || 'quantity ordered'}
                            </span>
                          )}
                        </div>

                        {item.quantity_ordered && item.unit_price && (
                          <div className={`${styles.formGroup} ${styles.subtotalDisplay}`}>
                            <label className="form-label">Subtotal</label>
                            <div className={styles.subtotalValue}>
                              KES {formatCurrency((parseInt(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section */}
              <div className={`${styles.formSection} ${styles.paymentSection}`}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>💳</span>
                  Payment Details
                </h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className="form-label">
                      Mode of Payment <span className={styles.required}>*</span>
                    </label>
                    <select
                      name="mode_of_payment"
                      value={formData.mode_of_payment}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Mpesa">M-Pesa</option>
                      <option value="Not Paid">Not Paid (Credit)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className="form-label">
                      Amount Paid (KES) {formData.mode_of_payment !== 'Not Paid' && <span className={styles.required}>*</span>}
                    </label>
                    <input
                      type="number"
                      name="amount_paid"
                      value={formData.amount_paid}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={formData.mode_of_payment === 'Not Paid'}
                      required={formData.mode_of_payment !== 'Not Paid'}
                    />
                    <span className={styles.fieldHint}>
                      Enter the exact amount paid by customer
                    </span>
                  </div>
                </div>

                <div className={styles.totalSummary}>
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total Amount:</span>
                    <span className={styles.totalValue}>
                      KES {formatCurrency(calculateTotal())}
                    </span>
                  </div>

                  {formData.amount_paid && parseFloat(formData.amount_paid) > 0 && (
                    <>
                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Amount Paid:</span>
                        <span className={styles.paidValue}>
                          KES {formatCurrency(formData.amount_paid)}
                        </span>
                      </div>

                      {/* Show balance only when amount_paid < total */}
                      {roundToTwoDecimals(parseFloat(formData.amount_paid)) < roundToTwoDecimals(calculateTotal()) && (
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Outstanding Balance:</span>
                          <span className={styles.balanceValue}>
                            KES {formatCurrency(calculateBalance())}
                          </span>
                        </div>
                      )}

                      {/* Show "Fully Paid" badge when amounts match */}
                      {roundToTwoDecimals(parseFloat(formData.amount_paid)) >= roundToTwoDecimals(calculateTotal()) && (
                        <div className={styles.totalRow}>
                          <span className={styles.totalLabel}>Status:</span>
                          <span className="badge badge-success">✓ Fully Paid</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Show outstanding for "Not Paid" mode */}
                  {formData.mode_of_payment === 'Not Paid' && (
                    <div className={styles.totalRow}>
                      <span className={styles.totalLabel}>Outstanding Balance:</span>
                      <span className={styles.balanceValue}>
                        KES {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Recording Sale...' : '💾 Record Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('all')}
          className={activeTab === 'all' ? styles.tabActive : styles.tab}
        >
          All Sales
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={activeTab === 'outstanding' ? styles.tabActive : styles.tab}
        >
          Outstanding Supplies
        </button>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search sales by number, customer, or LPO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className="spinner"></div>
              <p>Loading sales...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm ? 'No sales found matching your search.' : 'No sales found. Click "New Sale" to record your first sale.'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Payment Status</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => (
                    <tr key={sale.id}>
                      <td className={styles.saleNumber}>{sale.sale_number}</td>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td className={styles.customerName}>{sale.customer_name}</td>
                      <td>
                        <div
                          className={styles.productsSummary}
                          onClick={() =>
                            setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)
                          }
                        >
                          {sale.line_items[0]?.product_name}
                          {sale.line_items.length > 1 && (
                            <span className={styles.moreProducts}>
                              +{sale.line_items.length - 1} more
                            </span>
                          )}
                        </div>
                        {expandedSaleId === sale.id && (
                          <div className={styles.expandedProducts}>
                            {sale.line_items.map((item, idx) => (
                              <div key={idx} className={styles.expandedProductItem}>
                                <strong>{item.product_name}</strong> ({item.quantity_supplied}/{item.quantity_ordered})
                                <span className={`badge ${getStatusBadge(item.supply_status)}`}>
                                  {item.supply_status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={styles.totalAmount}>
                        KES {formatCurrency(sale.total_amount)}
                      </td>
                      <td>
                        <div className={styles.paymentStatusContainer}>
                          <span className={`badge ${sale.mode_of_payment === 'Not Paid' ? 'badge-warning' : 'badge-success'}`}>
                            {sale.mode_of_payment}
                          </span>
                          {sale.amount_paid > 0 && (
                            <div className={styles.amountPaid}>
                              Paid: KES {formatCurrency(sale.amount_paid)}
                            </div>
                          )}
                          {sale.outstanding_balance > 0 && (
                            <div className={styles.outstandingBalance}>
                              Balance: KES {formatCurrency(sale.outstanding_balance)}
                            </div>
                          )}
                          {parseFloat(sale.outstanding_balance) === 0 && parseFloat(sale.amount_paid) > 0 && (
                            <div className="badge badge-success" style={{ marginTop: '4px' }}>
                              ✓ Fully Paid
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{sale.lpo_quotation_number || '-'}</td>
                      <td>{sale.delivery_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sales;