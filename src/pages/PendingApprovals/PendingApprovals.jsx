// src/pages/PendingApprovals/PendingApprovals.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './PendingApprovals.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100
    .toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const PendingApprovals = ({ onCountChange }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [vatChoices, setVatChoices] = useState({});

  useEffect(() => { loadPendingSales(); }, []);

  const loadPendingSales = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingSales();
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setSales(list);
      onCountChange?.(list.length);
    } catch (error) {
      console.error('Error loading pending sales:', error);
      setSales([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleVat = (saleId) => {
    setVatChoices(prev => ({ ...prev, [saleId]: !prev[saleId] }));
  };

  const getApplyVat = (saleId) => vatChoices[saleId] || false;

  const getDisplayTotals = (sale) => {
    const subtotal = parseFloat(sale.subtotal) || 0;
    if (getApplyVat(sale.id)) {
      const vat = Math.round(subtotal * 0.16 * 100) / 100;
      const total = Math.round((subtotal + vat) * 100) / 100;
      const amountPaid = parseFloat(sale.amount_paid) || 0;
      const balance = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
      return { subtotal, vat, total, balance };
    }
    const amountPaid = parseFloat(sale.amount_paid) || 0;
    const balance = Math.max(0, Math.round((subtotal - amountPaid) * 100) / 100);
    return { subtotal, vat: 0, total: subtotal, balance };
  };

  const handleApprove = async (saleId, saleNumber) => {
    if (!window.confirm(`Approve sale ${saleNumber}? Stock will be deducted immediately.`)) return;

    try {
      setActionLoading(saleId);
      await api.approveSale(saleId, { action: 'approve', apply_vat: getApplyVat(saleId) });
      alert(`✅ Sale ${saleNumber} approved! Stock has been deducted.`);
      loadPendingSales();
    } catch (error) {
      alert('Error approving sale: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (sale) => {
    setRejectModal(sale);
    setRejectionReason('');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please enter a reason for rejection.');
      return;
    }

    try {
      setActionLoading(rejectModal.id);
      await api.rejectSale(rejectModal.id, rejectionReason);
      alert(`❌ Sale ${rejectModal.sale_number} has been rejected.`);
      setRejectModal(null);
      setRejectionReason('');
      loadPendingSales();
    } catch (error) {
      alert('Error rejecting sale: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pending Approvals</h1>
        </div>
        <div className={styles.headerBadge}>
          {sales.length > 0 && (
            <span className={styles.pendingCount}>{sales.length} Pending</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading pending sales...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>All caught up!</h3>
          <p>No sales are pending approval right now.</p>
        </div>
      ) : (
        <div className={styles.salesList}>
          {sales.map(sale => {
            const totals = getDisplayTotals(sale);
            const applyVat = getApplyVat(sale.id);

            return (
              <div key={sale.id} className={styles.saleCard}>

                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <span className={styles.saleNumber}>{sale.sale_number}</span>
                    <span className={styles.saleDate}>
                      {new Date(sale.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <span className={styles.badgePending}>⏳ Pending Approval</span>
                </div>

                {/* Sale Info Grid */}
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Customer</span>
                    <span className={styles.infoValue}>{sale.customer_name}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Submitted by</span>
                    <span className={styles.infoValue}>
                      {sale.recorded_by_name || 'Unknown'}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>LPO/Quote</span>
                    <span className={styles.infoValue}>{sale.lpo_quotation_number || '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Delivery #</span>
                    <span className={styles.infoValue}>{sale.delivery_number || '-'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Payment Mode</span>
                    <span className={styles.infoValue}>{sale.mode_of_payment}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Amount Paid</span>
                    <span className={styles.infoValue}>
                      KES {formatCurrency(sale.amount_paid)}
                    </span>
                  </div>
                </div>

                {/* Products toggle */}
                <div
                  className={styles.productsToggle}
                  onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                >
                  <span>📦 {sale.line_items?.length || 0} product(s)</span>
                  <span>{expandedSaleId === sale.id ? '▲ Hide' : '▼ View'}</span>
                </div>

                {expandedSaleId === sale.id && (
                  <div className={styles.productsTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty Ordered</th>
                          <th>Qty Supplied</th>
                          <th>Status</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sale.line_items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{item.product_code}</strong>
                              <br />
                              <small>{item.product_name}</small>
                            </td>
                            <td>{item.quantity_ordered}</td>
                            <td>{item.quantity_supplied}</td>
                            <td>
                              <span className={
                                item.supply_status === 'Supplied'
                                  ? styles.supplySupplied
                                  : item.supply_status === 'Partially Supplied'
                                    ? styles.supplyPartial
                                    : styles.supplyNot
                              }>
                                {item.supply_status}
                              </span>
                            </td>
                            <td>KES {formatCurrency(item.unit_price)}</td>
                            <td>KES {formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Financial Summary */}
                <div className={styles.financials}>
                  <div className={styles.financialRow}>
                    <span>Subtotal</span>
                    <span>KES {formatCurrency(totals.subtotal)}</span>
                  </div>
                  {applyVat && (
                    <div className={styles.financialRow}>
                      <span>VAT (16%)</span>
                      <span>KES {formatCurrency(totals.vat)}</span>
                    </div>
                  )}
                  <div className={`${styles.financialRow} ${styles.totalRow}`}>
                    <span>Total</span>
                    <span>KES {formatCurrency(totals.total)}</span>
                  </div>
                  {parseFloat(sale.amount_paid) > 0 && (
                    <div className={styles.financialRow}>
                      <span>Amount Paid</span>
                      <span>KES {formatCurrency(sale.amount_paid)}</span>
                    </div>
                  )}
                  {totals.balance > 0 && (
                    <div className={`${styles.financialRow} ${styles.balanceRow}`}>
                      <span>Outstanding Balance</span>
                      <span>KES {formatCurrency(totals.balance)}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={styles.cardActions}>
                  <button
                    className={styles.btnReject}
                    onClick={() => openRejectModal(sale)}
                    disabled={actionLoading === sale.id}
                  >
                    ❌ Reject
                  </button>
                  <button
                    className={`${styles.vatToggle} ${applyVat ? styles.vatToggleOn : styles.vatToggleOff}`}
                    onClick={() => toggleVat(sale.id)}
                    disabled={actionLoading === sale.id}
                    type="button"
                  >
                    {applyVat ? '🧾 +16% VAT' : '🧾 VAT Exempt'}
                  </button>
                  <button
                    className={styles.btnApprove}
                    onClick={() => handleApprove(sale.id, sale.sale_number)}
                    disabled={actionLoading === sale.id}
                  >
                    {actionLoading === sale.id ? 'Processing...' : '✅ Approve & Deduct Stock'}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
        >
          <div className={styles.rejectModal}>
            <div className={styles.rejectModalHeader}>
              <h3>Reject Sale {rejectModal.sale_number}</h3>
              <button onClick={() => setRejectModal(null)} className={styles.modalClose}>×</button>
            </div>
            <div className={styles.rejectModalBody}>
              <p>Please provide a reason for rejecting this sale.</p>
              <label className={styles.rejectLabel}>
                Rejection Reason <span className={styles.required}>*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className={styles.rejectTextarea}
                placeholder="e.g. Incorrect pricing, insufficient stock available, duplicate entry..."
                rows={4}
              />
            </div>
            <div className={styles.rejectModalFooter}>
              <button
                onClick={() => setRejectModal(null)}
                className={styles.btnOutline}
                disabled={actionLoading === rejectModal?.id}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className={styles.btnRejectConfirm}
                disabled={actionLoading === rejectModal?.id}
              >
                {actionLoading === rejectModal?.id ? 'Rejecting...' : '❌ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;