// src/pages/Sales/Sales.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './Sales.module.css';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    product: '',
    customer: '',
    quantity_ordered: '',
    supply_status: 'Supplied',
    quantity_supplied: '',
    unit_price: '',
    lpo_quotation_number: '',
    delivery_number: ''
  });

  // Autocomplete states
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    loadSales();
  }, [activeTab]);

  useEffect(() => {
    if (productSearch.length >= 2) {
      searchProducts(productSearch);
    } else {
      setProductSuggestions([]);
    }
  }, [productSearch]);

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
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    try {
      const data = await api.request(`/sales/search_products/?q=${query}`);
      setProductSuggestions(data);
      setShowProductDropdown(true);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const searchCustomers = async (query) => {
    try {
      const data = await api.request(`/sales/search_customers/?q=${query}`);
      setCustomerSuggestions(data);
      setShowCustomerDropdown(true);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const selectProduct = (product) => {
    setFormData(prev => ({
      ...prev,
      product: product.id,
      unit_price: product.unit_price
    }));
    setProductSearch(`${product.code} - ${product.name}`);
    setShowProductDropdown(false);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({ ...prev, customer: customer.id }));
    setCustomerSearch(customer.company_name);
    setShowCustomerDropdown(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-set quantity_supplied based on supply_status
      if (name === 'supply_status') {
        if (value === 'Supplied') {
          updated.quantity_supplied = updated.quantity_ordered;
        } else if (value === 'Not Supplied') {
          updated.quantity_supplied = '0';
        }
      }

      // Auto-update quantity_supplied when quantity_ordered changes and status is Supplied
      if (name === 'quantity_ordered' && updated.supply_status === 'Supplied') {
        updated.quantity_supplied = value;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product || !formData.customer) {
      alert('Please select both product and customer');
      return;
    }

    try {
      setLoading(true);
      await api.request('/sales/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      alert('Sale recorded successfully!');
      resetForm();
      loadSales();
    } catch (error) {
      alert('Error recording sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product: '',
      customer: '',
      quantity_ordered: '',
      supply_status: 'Supplied',
      quantity_supplied: '',
      unit_price: '',
      lpo_quotation_number: '',
      delivery_number: ''
    });
    setProductSearch('');
    setCustomerSearch('');
    setShowForm(false);
  };

  const filteredSales = sales.filter(sale =>
    sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
          {showForm ? 'Cancel' : '➕ New Sale'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">Record New Sale</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => productSearch.length >= 2 && setShowProductDropdown(true)}
                    className="form-input"
                    placeholder="Type to search products..."
                    required
                  />
                  {showProductDropdown && productSuggestions.length > 0 && (
                    <div className={styles.autocompleteDropdown}>
                      {productSuggestions.map(product => (
                        <div
                          key={product.id}
                          className={styles.autocompleteItem}
                          onClick={() => selectProduct(product)}
                        >
                          <strong>{product.code}</strong> - {product.name}
                          <span className={styles.stockInfo}>Stock: {product.current_stock}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className="form-label">Product Code</label>
                  <input
                    type="text"
                    value={productSearch.split(' - ')[0] || ''}
                    className="form-input"
                    disabled
                    placeholder="Auto-filled"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className="form-label">Quantity Ordered *</label>
                  <input
                    type="number"
                    name="quantity_ordered"
                    value={formData.quantity_ordered}
                    onChange={handleInputChange}
                    className="form-input"
                    min="1"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className="form-label">Supply Status *</label>
                  <select
                    name="supply_status"
                    value={formData.supply_status}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="Supplied">Supplied</option>
                    <option value="Partially Supplied">Partially Supplied</option>
                    <option value="Not Supplied">Not Supplied</option>
                  </select>
                </div>

                {formData.supply_status === 'Partially Supplied' && (
                  <div className={styles.formGroup}>
                    <label className="form-label">Quantity Supplied *</label>
                    <input
                      type="number"
                      name="quantity_supplied"
                      value={formData.quantity_supplied}
                      onChange={handleInputChange}
                      className="form-input"
                      min="0"
                      max={formData.quantity_ordered}
                      required
                    />
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className="form-label">Unit Price (KES) *</label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    className="form-input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                  <label className="form-label">Customer *</label>
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
                          <span className={styles.customerInfo}>{customer.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className="form-label">LPO/Quotation Number</label>
                  <input
                    type="text"
                    name="lpo_quotation_number"
                    value={formData.lpo_quotation_number}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter LPO or Quotation number"
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
                    placeholder="Enter delivery note number"
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Recording...' : '💾 Record Sale'}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
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
          placeholder="Search sales..."
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
            <p className={styles.noData}>No sales found</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Ordered</th>
                    <th>Supplied</th>
                    <th>Outstanding</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>LPO/Quote</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => (
                    <tr key={sale.id}>
                      <td className={styles.saleNumber}>{sale.sale_number}</td>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.productInfo}>
                          <strong>{sale.product_code}</strong>
                          <small>{sale.product_name}</small>
                        </div>
                      </td>
                      <td>{sale.customer_name}</td>
                      <td>{sale.quantity_ordered}</td>
                      <td>{sale.quantity_supplied}</td>
                      <td>
                        <span className={sale.outstanding_quantity > 0 ? styles.outstandingQty : ''}>
                          {sale.outstanding_quantity}
                        </span>
                      </td>
                      <td>KES {Number(sale.unit_price).toLocaleString()}</td>
                      <td className={styles.totalAmount}>
                        KES {Number(sale.total_amount).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(sale.supply_status)}`}>
                          {sale.supply_status}
                        </span>
                      </td>
                      <td>{sale.lpo_quotation_number || '-'}</td>
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