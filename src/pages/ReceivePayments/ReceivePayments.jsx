// src/pages/ReceivePayments/ReceivePayments.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import styles from './ReceivePayments.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const PAYMENT_MODES = ['Cash', 'Cheque', 'Mpesa'];

const parsePaymentLog = (sale) => {
  try {
    const raw = sale.payment_note || '';
    if (raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  const paid = parseFloat(sale.amount_paid || 0);
  if (paid > 0 && sale.payment_date) {
    return [{
      date: sale.payment_date,
      amount: paid,
      mode: sale.mode_of_payment !== 'Not Paid' ? sale.mode_of_payment : '—',
      note: '',
    }];
  }
  return [];
};

const ReceivePayments = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('invoices');
  const [allPaymentRecords, setAllPaymentRecords] = useState([]);
  const [paymentRecordsLoading, setPaymentRecordsLoading] = useState(false);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Build payment records from all sales ──────────────────────────────────
  const loadAllPaymentRecords = useCallback(async () => {
    setPaymentRecordsLoading(true);
    try {
      const salesRaw = await api.getSales();
      const allSales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.results || []);
      const records = [];
      allSales.forEach((sale) => {
        const log = parsePaymentLog(sale);
        log.forEach((entry) => {
          records.push({
            ...entry,
            saleNumber: sale.sale_number,
            customerName: sale.customer_name,
            customerId: sale.customer,
            totalAmount: sale.total_amount,
            outstandingBalance: sale.outstanding_balance,
          });
        });
      });
      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAllPaymentRecords(records);
    } catch (err) {
      console.error('Error loading payment records:', err);
    } finally {
      setPaymentRecordsLoading(false);
    }
  }, []);

  // ── Load customers with outstanding balances ──────────────────────────────
  const loadOutstandingCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const salesRaw = await api.getSales();
      const allSales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.results || []);
      const map = {};
      allSales.forEach((sale) => {
        const bal = parseFloat(sale.outstanding_balance || 0);
        if (bal <= 0) return;
        const cid = sale.customer;
        if (!map[cid]) {
          map[cid] = {
            id: cid,
            name: sale.customer_name,
            totalOutstanding: 0,
            salesCount: 0,
          };
        }
        map[cid].totalOutstanding += bal;
        map[cid].salesCount += 1;
      });
      setCustomers(Object.values(map).sort((a, b) => b.totalOutstanding - a.totalOutstanding));
    } catch (err) {
      console.error('Error loading outstanding customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOutstandingCustomers(), loadAllPaymentRecords()]);
  }, [loadOutstandingCustomers, loadAllPaymentRecords]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Open customer — with fallback if /customers/{id}/sales/ 404s ─────────
  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setDetailTab('invoices');
    setSalesLoading(true);
    setCustomerSales([]);

    try {
      // Try the dedicated endpoint first
      const data = await api.getCustomerSales(customer.id);
      const sales = Array.isArray(data) ? data : (data?.results || []);
      const outstanding = sales.filter((s) => parseFloat(s.outstanding_balance || 0) > 0);
      setCustomerSales(outstanding);
    } catch (err) {
      // Fallback: filter from the full sales list
      console.warn('getCustomerSales failed, falling back to getSales filter:', err.message);
      try {
        const salesRaw = await api.getSales();
        const allSales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.results || []);
        const outstanding = allSales.filter(
          (s) => s.customer === customer.id && parseFloat(s.outstanding_balance || 0) > 0
        );
        setCustomerSales(outstanding);
      } catch (err2) {
        console.error('Fallback also failed:', err2);
        setCustomerSales([]);
      }
    } finally {
      setSalesLoading(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentAmount('');
    setPaymentMode('Cash');
    setPaymentNotes('');
    setPaymentError('');
    setPaymentModal(true);
  };

  const enteredAmount = parseFloat(paymentAmount) || 0;
  const remainingAfterPayment = selectedCustomer
    ? Math.max(0, selectedCustomer.totalOutstanding - enteredAmount)
    : 0;

  // ── Submit payment ────────────────────────────────────────────────────────
  const submitPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      return;
    }
    if (amount > selectedCustomer.totalOutstanding + 0.001) {
      setPaymentError(
        `Amount cannot exceed the outstanding balance of KES ${formatCurrency(selectedCustomer.totalOutstanding)}.`
      );
      return;
    }

    setSubmitting(true);
    setPaymentError('');

    try {
      // Distribute oldest-first across outstanding sales
      const sorted = [...customerSales].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      let remaining = amount;
      const today = new Date().toISOString().split('T')[0];

      for (const sale of sorted) {
        if (remaining <= 0) break;
        const bal = parseFloat(sale.outstanding_balance || 0);
        if (bal <= 0) continue;

        const apply = Math.min(remaining, bal);
        const newPaid = parseFloat(sale.amount_paid || 0) + apply;

        // Append to this sale's payment log
        const existingLog = parsePaymentLog(sale);
        const newEntry = {
          date: today,
          amount: parseFloat(apply.toFixed(2)),
          mode: paymentMode,
          note: paymentNotes || '',
        };
        const updatedLog = [...existingLog, newEntry];

        await api.updateSale(sale.id, {
          amount_paid: parseFloat(newPaid.toFixed(2)),
          mode_of_payment: paymentMode,
          payment_note: JSON.stringify(updatedLog),
          payment_date: today,
          // Re-send required fields so the PUT doesn't wipe them
          customer: sale.customer,
          lpo_quotation_number: sale.lpo_quotation_number || '',
          delivery_number: sale.delivery_number || '',
          subtotal: sale.subtotal,
          vat_amount: sale.vat_amount,
          total_amount: sale.total_amount,
          salesperson: sale.salesperson || '',
        });

        remaining = parseFloat((remaining - apply).toFixed(2));
      }

      setPaymentModal(false);
      const isFullPayment = remainingAfterPayment === 0;
      showToast(
        `Payment of KES ${formatCurrency(amount)} recorded.${isFullPayment ? ' Balance fully cleared.' : ''}`
      );

      // Refresh the full list and records
      await refreshAll();

      // Re-check whether this customer still has outstanding sales
      try {
        const salesRaw = await api.getCustomerSales(selectedCustomer.id);
        const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.results || []);
        const outstanding = sales.filter((s) => parseFloat(s.outstanding_balance || 0) > 0);
        if (outstanding.length === 0) {
          setSelectedCustomer(null);
          setCustomerSales([]);
        } else {
          const newTotal = outstanding.reduce(
            (sum, s) => sum + parseFloat(s.outstanding_balance || 0), 0
          );
          setSelectedCustomer((prev) => ({ ...prev, totalOutstanding: newTotal }));
          setCustomerSales(outstanding);
        }
      } catch (_) {
        // Fallback
        const salesRaw = await api.getSales();
        const allSales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.results || []);
        const outstanding = allSales.filter(
          (s) => s.customer === selectedCustomer.id && parseFloat(s.outstanding_balance || 0) > 0
        );
        if (outstanding.length === 0) {
          setSelectedCustomer(null);
          setCustomerSales([]);
        } else {
          const newTotal = outstanding.reduce(
            (sum, s) => sum + parseFloat(s.outstanding_balance || 0), 0
          );
          setSelectedCustomer((prev) => ({ ...prev, totalOutstanding: newTotal }));
          setCustomerSales(outstanding);
        }
      }
    } catch (err) {
      console.error('Payment submission error:', err);
      setPaymentError(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPortfolioOutstanding = customers.reduce(
    (sum, c) => sum + c.totalOutstanding, 0
  );

  const saleDate = (sale) => {
    const raw = sale.sale_date || sale.created_at;
    if (!raw) return '—';
    if (sale.sale_date) {
      const [y, m, d] = sale.sale_date.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-KE');
    }
    return new Date(sale.created_at).toLocaleDateString('en-KE');
  };

  const selectedCustomerPaymentLog = allPaymentRecords.filter(
    (r) => r.customerId === selectedCustomer?.id
  );

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Receive Payments</h1>
          <p className={styles.pageSubtitle}>Settle outstanding customer balances</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <span className={styles.headerStatLabel}>Total Portfolio Outstanding</span>
            <span className={styles.headerStatValue}>KES {formatCurrency(totalPortfolioOutstanding)}</span>
          </div>
          <div className={`${styles.headerStat} ${styles.headerStatGreen}`}>
            <span className={styles.headerStatLabel}>Payments Recorded</span>
            <span className={styles.headerStatValue}>{allPaymentRecords.length}</span>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── LEFT: Customer list ──────────────────────────────────────── */}
        <div className={styles.customerPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Customers with Balances</h2>
            <span className={styles.badgeCount}>{filtered.length}</span>
          </div>

          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {loading ? (
            <div className={styles.centerState}>
              <div className={styles.spinner}></div>
              <p>Loading customers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.centerState}>
              <div className={styles.emptyIcon}>🎉</div>
              <p className={styles.emptyTitle}>All Clear!</p>
              <p className={styles.emptySubtitle}>No outstanding balances found.</p>
            </div>
          ) : (
            <ul className={styles.customerList}>
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className={`${styles.customerCard} ${selectedCustomer?.id === c.id ? styles.customerCardActive : ''}`}
                  onClick={() => openCustomer(c)}
                >
                  <div className={styles.customerInitial}>
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.customerInfo}>
                    <span className={styles.customerName}>{c.name}</span>
                    <span className={styles.customerMeta}>
                      {c.salesCount} unpaid {c.salesCount === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </div>
                  <div className={styles.customerBalance}>
                    KES {formatCurrency(c.totalOutstanding)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── RIGHT: Detail panel ──────────────────────────────────────── */}
        <div className={styles.detailPanel}>
          {!selectedCustomer ? (
            /* No customer selected — show all payment records */
            <div className={styles.recordsSection}>
              <div className={styles.recordsHeader}>
                <h2 className={styles.recordsTitle}>💳 Payment Records</h2>
                <p className={styles.recordsSubtitle}>All received payments recorded in the system</p>
              </div>

              {paymentRecordsLoading ? (
                <div className={styles.centerState}>
                  <div className={styles.spinner}></div>
                  <p>Loading payment records...</p>
                </div>
              ) : allPaymentRecords.length === 0 ? (
                <div className={styles.centerState}>
                  <div className={styles.emptyIcon}>📋</div>
                  <p className={styles.emptyTitle}>No payments recorded yet</p>
                  <p className={styles.emptySubtitle}>Payments you record will appear here.</p>
                </div>
              ) : (
                <div className={styles.paymentRecordsTable}>
                  <table className={styles.prTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Sale No.</th>
                        <th>Amount Paid</th>
                        <th>Method</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPaymentRecords.map((rec, i) => (
                        <tr key={i}>
                          <td className={styles.prDate}>{formatDate(rec.date)}</td>
                          <td className={styles.prCustomer}>{rec.customerName}</td>
                          <td className={styles.prSaleNo}>{rec.saleNumber}</td>
                          <td className={styles.prAmount}>KES {formatCurrency(rec.amount)}</td>
                          <td><span className={styles.prMode}>{rec.mode}</span></td>
                          <td className={styles.prNote}>
                            {rec.note || <span className={styles.prNoteEmpty}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Customer selected */
            <>
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailCustomerName}>{selectedCustomer.name}</h2>
                  <p className={styles.detailOutstanding}>
                    Total Outstanding:{' '}
                    <strong>KES {formatCurrency(selectedCustomer.totalOutstanding)}</strong>
                  </p>
                </div>
                <div className={styles.detailHeaderActions}>
                  <button
                    className={styles.btnBack}
                    onClick={() => { setSelectedCustomer(null); setCustomerSales([]); }}
                  >
                    ← Back
                  </button>
                  <button className={styles.btnReceive} onClick={openPaymentModal}>
                    Receive Payment
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${detailTab === 'invoices' ? styles.tabActive : ''}`}
                  onClick={() => setDetailTab('invoices')}
                >
                  📄 Outstanding Invoices
                  {customerSales.length > 0 && (
                    <span className={styles.tabBadge}>{customerSales.length}</span>
                  )}
                </button>
                <button
                  className={`${styles.tab} ${detailTab === 'history' ? styles.tabActive : ''}`}
                  onClick={() => setDetailTab('history')}
                >
                  💳 Payment History
                  {selectedCustomerPaymentLog.length > 0 && (
                    <span className={styles.tabBadge}>{selectedCustomerPaymentLog.length}</span>
                  )}
                </button>
              </div>

              {/* Tab: Outstanding Invoices */}
              {detailTab === 'invoices' && (
                salesLoading ? (
                  <div className={styles.centerState}>
                    <div className={styles.spinner}></div>
                    <p>Loading invoices...</p>
                  </div>
                ) : (
                  <div className={styles.invoicesSection}>
                    {customerSales.length === 0 ? (
                      <div className={styles.centerState}>
                        <div className={styles.emptyIcon}>✅</div>
                        <p className={styles.emptyTitle}>No outstanding invoices</p>
                        <p className={styles.emptySubtitle}>This customer has no pending balances.</p>
                      </div>
                    ) : (
                      <div className={styles.invoicesList}>
                        {customerSales.map((sale) => (
                          <div key={sale.id} className={styles.invoiceCard}>
                            <div className={styles.invoiceCardTop}>
                              <div>
                                <span className={styles.invoiceSaleNo}>{sale.sale_number}</span>
                                <span className={styles.invoiceDate}>{saleDate(sale)}</span>
                              </div>
                              <span className={styles.invoiceMode}>{sale.mode_of_payment}</span>
                            </div>
                            <div className={styles.invoiceAmounts}>
                              <div className={styles.invoiceAmountRow}>
                                <span className={styles.invoiceAmountLabel}>Total</span>
                                <span className={styles.invoiceAmountValue}>
                                  KES {formatCurrency(sale.total_amount)}
                                </span>
                              </div>
                              <div className={styles.invoiceAmountRow}>
                                <span className={styles.invoiceAmountLabel}>Paid</span>
                                <span className={`${styles.invoiceAmountValue} ${styles.paid}`}>
                                  KES {formatCurrency(sale.amount_paid)}
                                </span>
                              </div>
                              <div className={`${styles.invoiceAmountRow} ${styles.invoiceBalanceRow}`}>
                                <span className={styles.invoiceAmountLabel}>Balance</span>
                                <span className={`${styles.invoiceAmountValue} ${styles.balance}`}>
                                  KES {formatCurrency(sale.outstanding_balance)}
                                </span>
                              </div>
                            </div>
                            {sale.lpo_quotation_number && (
                              <div className={styles.invoiceLpo}>
                                LPO/Quote: {sale.lpo_quotation_number}
                              </div>
                            )}
                            <div className={styles.invoiceProducts}>
                              {(sale.line_items || []).map((item, i) => (
                                <span key={i} className={styles.invoiceProduct}>
                                  {item.product_name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Tab: Payment History */}
              {detailTab === 'history' && (
                <div className={styles.invoicesSection}>
                  {selectedCustomerPaymentLog.length === 0 ? (
                    <div className={styles.centerState}>
                      <div className={styles.emptyIcon}>📋</div>
                      <p className={styles.emptyTitle}>No payments recorded</p>
                      <p className={styles.emptySubtitle}>
                        Payments for this customer will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.paymentHistoryList}>
                      {selectedCustomerPaymentLog.map((rec, i) => (
                        <div key={i} className={styles.payHistCard}>
                          <div className={styles.payHistCardLeft}>
                            <div className={styles.payHistIcon}>💳</div>
                            <div>
                              <div className={styles.payHistAmount}>
                                KES {formatCurrency(rec.amount)}
                              </div>
                              <div className={styles.payHistMeta}>
                                {rec.saleNumber} &middot; {formatDate(rec.date)}
                              </div>
                              {rec.note && (
                                <div className={styles.payHistNote}>{rec.note}</div>
                              )}
                            </div>
                          </div>
                          <span className={styles.payHistModeBadge}>{rec.mode}</span>
                        </div>
                      ))}
                      <div className={styles.payHistSummary}>
                        <span>Total Received from {selectedCustomer.name}</span>
                        <span className={styles.payHistSummaryVal}>
                          KES {formatCurrency(
                            selectedCustomerPaymentLog.reduce((s, r) => s + r.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      {paymentModal && selectedCustomer && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && !submitting && setPaymentModal(false)}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Record Payment</h2>
                <p className={styles.modalSubtitle}>{selectedCustomer.name}</p>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !submitting && setPaymentModal(false)}
              >×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.balanceSummaryRow}>
                <span className={styles.balanceSummaryLabel}>Total Outstanding Balance</span>
                <span className={styles.balanceSummaryValue}>
                  KES {formatCurrency(selectedCustomer.totalOutstanding)}
                </span>
              </div>

              {customerSales.length === 0 && (
                <div className={styles.errorBox}>
                  ⚠️ No outstanding invoices loaded for this customer. Please close and reopen the customer to retry.
                </div>
              )}

              <div className={styles.modalDivider} />

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount Received (KES)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Outstanding Balance After Payment</label>
                <div
                  className={`${styles.calcField} ${
                    remainingAfterPayment === 0 && enteredAmount > 0 ? styles.calcFieldCleared : ''
                  }`}
                >
                  KES {formatCurrency(remainingAfterPayment)}
                  {remainingAfterPayment === 0 && enteredAmount > 0 && (
                    <span className={styles.calcFieldBadge}>Fully Settled</span>
                  )}
                  {remainingAfterPayment > 0 && enteredAmount > 0 && (
                    <span className={styles.calcFieldBadgePartial}>Partial Payment</span>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Mode</label>
                <select
                  className={styles.formSelect}
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  disabled={submitting}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Notes <span className={styles.optional}>(Optional)</span>
                </label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="E.g. Cheque no. 12345, Mpesa ref M-XXXX..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  disabled={submitting}
                  rows={2}
                />
              </div>

              {paymentError && (
                <div className={styles.errorBox}>{paymentError}</div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                onClick={() => !submitting && setPaymentModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={styles.btnSubmit}
                onClick={submitPayment}
                disabled={submitting || !paymentAmount || parseFloat(paymentAmount) <= 0 || customerSales.length === 0}
              >
                {submitting ? (
                  <><span className={styles.btnSpinner}></span>Recording...</>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivePayments;