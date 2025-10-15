// src/pages/Invoices/Invoices.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import InvoiceModal from './InvoiceModal';
import PaymentModal from './PaymentModal';
import styles from './Invoices.module.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, customersData, productsData] = await Promise.all([
        filter === 'outstanding' ? api.getOutstandingInvoices() : api.getInvoices(),
        api.getCustomers(),
        api.getProducts()
      ]);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setInvoices([]);
      setCustomers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceModal(true);
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handleModalClose = () => {
    setShowInvoiceModal(false);
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    loadData();
  };

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getStatusBadge = (status) => {
    const badges = {
      'Paid': 'badge-success',
      'Outstanding': 'badge-danger',
      'Partial': 'badge-warning'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className={styles.invoicesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Invoices</h1>
          <p className={styles.pageSubtitle}>Track sales and payments</p>
        </div>
        <button onClick={handleCreateInvoice} className="btn btn-primary">
          ➕ Create Invoice
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
          >
            All Invoices
          </button>
          <button
            onClick={() => setFilter('outstanding')}
            className={filter === 'outstanding' ? styles.filterActive : styles.filterButton}
          >
            Outstanding
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {filteredInvoices.length === 0 ? (
            <p className={styles.noData}>No invoices found</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className={styles.invoiceNumber}>
                        {invoice.invoice_number}
                      </td>
                      <td>{invoice.customer_name}</td>
                      <td className={styles.amount}>
                        KES {Number(invoice.total_amount).toLocaleString()}
                      </td>
                      <td className={styles.paidAmount}>
                        KES {Number(invoice.paid_amount).toLocaleString()}
                      </td>
                      <td className={styles.balance}>
                        KES {Number(invoice.remaining_balance).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>{new Date(invoice.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          {invoice.status !== 'Paid' && (
                            <button
                              onClick={() => handleRecordPayment(invoice)}
                              className="btn btn-sm btn-primary"
                              title="Record Payment"
                            >
                              💳
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showInvoiceModal && (
        <InvoiceModal
          customers={customers}
          products={products}
          onClose={handleModalClose}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Invoices;