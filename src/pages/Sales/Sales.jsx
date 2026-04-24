// src/pages/Sales/Sales.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import SaleModal from './SaleModal';
import styles from './Sales.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100
    .toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getSaleDisplayDate = (sale) => {
  const raw = sale.sale_date || sale.created_at;
  if (!raw) return '—';
  if (sale.sale_date) {
    const [y, m, d] = sale.sale_date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-KE');
  }
  return new Date(sale.created_at).toLocaleDateString('en-KE');
};

// ─── Parse payment log stored in payment_note ─────────────────────────────
// ReceivePayments.jsx stores a JSON array in payment_note when recording
// payments: [{ date, amount, mode, note }, ...]
// If payment_note is plain text (legacy), we build a single-entry log
// from amount_paid + payment_date.
const parsePaymentLog = (sale) => {
  try {
    const raw = sale.payment_note || '';
    if (raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}

  // Legacy fallback: single payment
  const paid = parseFloat(sale.amount_paid || 0);
  if (paid > 0 && sale.payment_date) {
    return [{
      date: sale.payment_date,
      amount: paid,
      mode: sale.mode_of_payment !== 'Not Paid' ? sale.mode_of_payment : '—',
      note: typeof sale.payment_note === 'string' && !sale.payment_note.startsWith('[')
        ? sale.payment_note
        : '',
    }];
  }
  return [];
};

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  // Delivery history modal
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Payment history — which sale rows are expanded
  const [expandedPaymentSaleId, setExpandedPaymentSaleId] = useState(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  useEffect(() => { loadSales(); }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowModal(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await api.request('/sales/');
      if (Array.isArray(data)) setSales(data);
      else if (data?.results) setSales(data.results);
      else setSales([]);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const openHistoryModal = async (sale) => {
    setHistoryModal(sale);
    setHistoryData([]);
    setHistoryLoading(true);
    try {
      const data = await api.getDeliveryHistory(sale.id);
      setHistoryData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading delivery history:', error);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredSales = sales.filter(sale =>
    sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lpo_quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplyStatusBadge = (status) => {
    const badges = {
      'Supplied': 'badge-success',
      'Partially Supplied': 'badge-warning',
      'Not Supplied': 'badge-danger',
    };
    return badges[status] || 'badge-secondary';
  };

  const getApprovalBadge = (status) => {
    const map = {
      pending: { className: styles.badgePending, label: '⏳ Pending' },
      approved: { className: styles.badgeApproved, label: '✅ Approved' },
      rejected: { className: styles.badgeRejected, label: '❌ Rejected' },
    };
    return map[status] || { className: styles.badgePending, label: status };
  };

  const togglePaymentHistory = (saleId) => {
    setExpandedPaymentSaleId(prev => prev === saleId ? null : saleId);
  };

  const colCount = isAdmin ? 12 : 11;

  return (
    <div className={styles.salesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Sales Entry</h1>
          <p className={styles.pageSubtitle}>Record and manage daily sales</p>
        </div>
        <div className={styles.headerButtons}>
          <button
            onClick={() => setShowModal(true)}
            className={`btn btn-primary ${styles.btnNewSale}`}
          >
            ➕ New Sale
          </button>
        </div>
      </div>

      {showModal && (
        <SaleModal onClose={() => setShowModal(false)} onSuccess={loadSales} />
      )}

      <div className={styles.actionBar}>
        <button onClick={() => navigate('/sales')} className={styles.btnAllSales}>
          📊 All Sales
        </button>
        <button onClick={() => navigate('/outstanding-supplies')} className={styles.btnOutstanding}>
          📦 Outstanding Supplies
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
              {searchTerm
                ? 'No sales found matching your search.'
                : 'No sales found. Click "New Sale" to record your first sale.'}
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
                    <th>Approval</th>
                    <th>Payment</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                    <th>History</th>
                    <th>Payments</th>
                    {isAdmin && <th>Salesperson</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map(sale => {
                    const approval = getApprovalBadge(sale.status);
                    // Use the shared parsePaymentLog utility
                    const paymentRecords = parsePaymentLog(sale);
                    const isPayExpanded = expandedPaymentSaleId === sale.id;

                    return (
                      <>
                        {/* ── Main sale row ──────────────────────────── */}
                        <tr key={sale.id}>
                          <td className={styles.saleNumber}>{sale.sale_number}</td>
                          <td>{getSaleDisplayDate(sale)}</td>
                          <td className={styles.customerName}>{sale.customer_name}</td>
                          <td>
                            <div
                              className={styles.productsSummary}
                              onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
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
                                    <strong>{item.product_name}</strong>
                                    ({item.quantity_supplied}/{item.quantity_ordered})
                                    <span className={`badge ${getSupplyStatusBadge(item.supply_status)}`}>
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
                            <span className={approval.className}>{approval.label}</span>
                            {sale.status === 'rejected' && sale.rejection_reason && (
                              <div className={styles.rejectionReason}>{sale.rejection_reason}</div>
                            )}
                            {sale.status === 'approved' && sale.approved_by_name && (
                              <div className={styles.approvedBy}>by {sale.approved_by_name}</div>
                            )}
                          </td>
                          <td>
                            <div className={styles.paymentStatusContainer}>
                              <span className={`badge ${sale.mode_of_payment === 'Not Paid' ? 'badge-warning' : 'badge-success'}`}>
                                {sale.mode_of_payment}
                              </span>
                              {parseFloat(sale.amount_paid) > 0 && (
                                <div className={styles.amountPaid}>
                                  Paid: KES {formatCurrency(sale.amount_paid)}
                                </div>
                              )}
                              {parseFloat(sale.outstanding_balance) > 0 && (
                                <div className={styles.outstandingBalance}>
                                  Balance: KES {formatCurrency(sale.outstanding_balance)}
                                </div>
                              )}
                              {parseFloat(sale.outstanding_balance) === 0 &&
                                parseFloat(sale.amount_paid) > 0 && (
                                  <div className="badge badge-success" style={{ marginTop: '4px' }}>
                                    ✓ Fully Paid
                                  </div>
                                )}
                            </div>
                          </td>
                          <td>{sale.lpo_quotation_number || '-'}</td>
                          <td>{sale.delivery_number || '-'}</td>

                          {/* Delivery history */}
                          <td>
                            {sale.status === 'approved' ? (
                              <button
                                className={styles.btnViewHistory}
                                onClick={() => openHistoryModal(sale)}
                              >
                                📋 View
                              </button>
                            ) : (
                              <span className={styles.noHistory}>—</span>
                            )}
                          </td>

                          {/* Payment history toggle */}
                          <td>
                            {paymentRecords.length > 0 ? (
                              <button
                                className={`${styles.btnViewHistory} ${isPayExpanded ? styles.btnViewHistoryActive : ''}`}
                                onClick={() => togglePaymentHistory(sale.id)}
                              >
                                💳 {isPayExpanded ? 'Hide' : `View (${paymentRecords.length})`}
                              </button>
                            ) : (
                              <span className={styles.noHistory}>—</span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className={styles.salespersonCell}>
                              {sale.salesperson || <span className={styles.noSalesperson}>—</span>}
                            </td>
                          )}
                        </tr>

                        {/* ── Payment history sub-row ──────────────── */}
                        {isPayExpanded && paymentRecords.length > 0 && (
                          <tr key={`pay-${sale.id}`} className={styles.paymentHistoryRow}>
                            <td colSpan={colCount} className={styles.paymentHistoryCell}>
                              <div className={styles.paymentHistoryPanel}>
                                <div className={styles.paymentHistoryTitle}>
                                  💳 Payment Records — {sale.sale_number}
                                  <span className={styles.paymentHistorySub}>
                                    &nbsp;·&nbsp;Total paid: KES {formatCurrency(sale.amount_paid)}
                                    {parseFloat(sale.outstanding_balance) > 0 && (
                                      <span className={styles.paymentHistoryBalance}>
                                        &nbsp;·&nbsp;Remaining: KES {formatCurrency(sale.outstanding_balance)}
                                      </span>
                                    )}
                                    {parseFloat(sale.outstanding_balance) === 0 && (
                                      <span className={styles.paymentHistoryCleared}>
                                        &nbsp;·&nbsp;✓ Fully Settled
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <table className={styles.paymentHistoryTable}>
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Date</th>
                                      <th>Amount Paid</th>
                                      <th>Method</th>
                                      <th>Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paymentRecords.map((rec, i) => (
                                      <tr key={i}>
                                        <td className={styles.payHistIdx}>{i + 1}</td>
                                        <td className={styles.payHistDate}>
                                          {rec.date
                                            ? new Date(rec.date).toLocaleDateString('en-KE', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                              })
                                            : '—'}
                                        </td>
                                        <td className={styles.payHistAmt}>
                                          KES {formatCurrency(rec.amount)}
                                        </td>
                                        <td>
                                          <span className={styles.payHistMode}>{rec.mode || '—'}</span>
                                        </td>
                                        <td className={styles.payHistNote}>
                                          {rec.note || <span style={{ color: '#94a3b8' }}>—</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Delivery History Modal ─────────────────────────────────────────── */}
      {historyModal && (
        <div
          className={styles.historyOverlay}
          onClick={(e) => e.target === e.currentTarget && setHistoryModal(null)}
        >
          <div className={styles.historyModal}>
            <div className={styles.historyModalHeader}>
              <div>
                <h2 className={styles.historyModalTitle}>Delivery History</h2>
                <span className={styles.historyModalSale}>
                  {historyModal.sale_number} — {historyModal.customer_name}
                </span>
              </div>
              <button className={styles.historyModalClose} onClick={() => setHistoryModal(null)}>×</button>
            </div>

            <div className={styles.historyModalBody}>
              {historyLoading ? (
                <div className={styles.historyLoading}>
                  <div className={styles.historySpinner}></div>
                  <p>Loading delivery history...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className={styles.historyEmpty}>
                  <div className={styles.historyEmptyIcon}>📦</div>
                  <p>No deliveries have been recorded for this sale yet.</p>
                </div>
              ) : (
                <div className={styles.historyList}>
                  {historyData.map((delivery, idx) => (
                    <div key={delivery.id} className={styles.historyEntry}>
                      <div className={styles.historyEntryHeader}>
                        <span className={styles.historyEntryNum}>Delivery {idx + 1}</span>
                        <span className={styles.historyEntryDate}>
                          📅 {new Date(delivery.delivery_date).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </span>
                        <span className={styles.historyEntryBy}>
                          👤 {delivery.recorded_by_name || 'Unknown'}
                        </span>
                      </div>
                      <div className={styles.historyEntryItems}>
                        {(delivery.delivery_items || []).map((item, i) => (
                          <div key={i} className={styles.historyEntryItem}>
                            <span className={styles.historyItemCode}>{item.product_code}</span>
                            <span className={styles.historyItemName}>{item.product_name}</span>
                            <span className={styles.historyItemQty}>{item.quantity_delivered} units delivered</span>
                          </div>
                        ))}
                      </div>
                      {delivery.notes && (
                        <div className={styles.historyEntryNotes}>📝 {delivery.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.historyModalFooter}>
              <button className={styles.btnCloseHistory} onClick={() => setHistoryModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
