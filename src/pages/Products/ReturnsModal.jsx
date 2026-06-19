import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import styles from './ReturnsModal.module.css';

const getTodayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const handleIntegerInput = (v) => v.replace(/[^0-9]/g, '');

// ── Reusable autocomplete hook ───────────────────────────────────────────────
function useAutocomplete(fetchFn) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null); // { id, label, raw }

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    let cancelled = false;

    fetchFn(query)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data);
          setShowDropdown(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (item) => {
    setSelected(item);
    setQuery(item.label);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  return {
    query,
    setQuery,
    suggestions,
    showDropdown,
    setShowDropdown,
    selected,
    setSelected,
    pick,
    clear
  };
}

// ── Main component ───────────────────────────────────────────────────────────
const ReturnsModal = ({ onClose, onStockUpdated }) => {
  const [returnDate, setReturnDate] = useState(getTodayLocal());
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState([
    { product: null, productSearch: '', productSuggestions: [], showDrop: false, quantity: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const customerAC = useAutocomplete(async (q) => {
    const data = await api.request(`/sales/search_customers/?q=${encodeURIComponent(q)}`);
    return (Array.isArray(data) ? data : []).map((c) => ({
      id: c.id,
      label: c.company_name,
      raw: c,
    }));
  });

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await api.request('/returns/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setHistory(list);
    } catch (e) {
      console.error('Error loading returns:', e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const searchProducts = async (q, idx) => {
    if (q.length < 2) {
      setReturnItems((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, productSuggestions: [], showDrop: false } : it
        )
      );
      return;
    }

    try {
      const data = await api.request(`/sales/search_products/?q=${encodeURIComponent(q)}`);
      setReturnItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { ...it, productSuggestions: Array.isArray(data) ? data : [], showDrop: true }
            : it
        )
      );
    } catch {}
  };

  const selectProduct = (product, idx) => {
    setReturnItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              product,
              productSearch: `${product.code} — ${product.name}`,
              showDrop: false,
              productSuggestions: []
            }
          : it
      )
    );
  };

  const updateItemQty = (idx, val) => {
    const cleaned = handleIntegerInput(val);
    setReturnItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: cleaned } : it))
    );
  };

  const addReturnItem = () =>
    setReturnItems((prev) => [
      ...prev,
      { product: null, productSearch: '', productSuggestions: [], showDrop: false, quantity: '' }
    ]);

  const removeReturnItem = (idx) => {
    if (returnItems.length > 1) {
      setReturnItems((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async () => {
    if (!customerAC.selected) {
      alert('Please select a customer from the dropdown.');
      return;
    }

    if (!returnDate) {
      alert('Please enter a return date.');
      return;
    }

    if (!reason.trim()) {
      alert('Please enter a reason for the return.');
      return;
    }

    for (let i = 0; i < returnItems.length; i++) {
      const it = returnItems[i];
      if (!it.product) {
        alert(`Please select a product for item ${i + 1}.`);
        return;
      }

      const qty = parseInt(it.quantity);
      if (!it.quantity || isNaN(qty) || qty <= 0) {
        alert(`Please enter a valid quantity for item ${i + 1}.`);
        return;
      }
    }

    const payload = {
      customer: customerAC.selected.id,
      return_date: returnDate,
      reason: reason.trim(),
      items: returnItems.map((it) => ({
        product: it.product.id,
        quantity: parseInt(it.quantity),
      })),
    };

    try {
      setSubmitting(true);

      await api.request('/returns/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(
        `✅ Return recorded successfully!\n\n` +
        `Customer: ${customerAC.selected.label}\n` +
        `${returnItems.length} product(s) returned.\n\n` +
        `Stock has been updated.`
      );

      customerAC.clear();
      setReason('');
      setReturnDate(getTodayLocal());
      setReturnItems([
        { product: null, productSearch: '', productSuggestions: [], showDrop: false, quantity: '' }
      ]);

      loadHistory();
      onStockUpdated?.();
    } catch (err) {
      alert('Error recording return: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>🔄 Customer Return</h2>
            <span className={styles.subtitle}>Customer returns are processed instantly</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>

          <section className={styles.formSection}>
            <h3 className={styles.sectionTitle}>📋 New Return</h3>

            <div className={styles.formGrid}>

              <div className={`${styles.formGroup} ${styles.autocompleteGroup}`}>
                <label className={styles.label}>
                  Customer <span className={styles.req}>*</span>
                </label>

                <input
                  type="text"
                  className={styles.input}
                  placeholder="Type customer name…"
                  value={customerAC.query}
                  onChange={(e) => {
                    customerAC.setSelected(null); // ✅ CHANGE 2
                    customerAC.setQuery(e.target.value);
                  }}
                  onFocus={() =>
                    customerAC.query.length >= 2 && customerAC.setShowDropdown(true)
                  }
                  onBlur={() =>
                    setTimeout(() => customerAC.setShowDropdown(false), 150)
                  }
                />

                {customerAC.showDropdown && customerAC.suggestions.length > 0 && (
                  <div className={styles.dropdown}>
                    {customerAC.suggestions.map((s) => (
                      <div
                        key={s.id}
                        className={styles.dropdownItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          customerAC.pick(s);
                        }}
                      >
                        <strong>{s.label}</strong>
                        {s.raw?.phone && <span>{s.raw.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {customerAC.selected && (
                  <span className={styles.selectedHint}>
                    ✓ {customerAC.selected.label}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Return Date <span className={styles.req}>*</span>
                </label>
                <input
                  type="date"
                  className={styles.input}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  max={getTodayLocal()}
                />
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  Reason for Return <span className={styles.req}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="e.g. Wrong item supplieed"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>

            </div>

            {/* FULL ORIGINAL PRODUCT ROWS SECTION */}
            <div className={styles.itemsHeader}>
              <h4 className={styles.itemsTitle}>📦 Products Returned</h4>
              <button type="button" className={styles.btnAddItem} onClick={addReturnItem}>
                + Add Product
              </button>
            </div>

            <div className={styles.itemsList}>
              {returnItems.map((item, idx) => (
                <div key={idx} className={styles.itemRow}>
                  <span className={styles.itemNum}>{idx + 1}</span>

                  <div className={`${styles.autocompleteGroup} ${styles.itemProductGroup}`}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Search product…"
                      value={item.productSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setReturnItems((prev) =>
                          prev.map((it, i) => i === idx ? { ...it, productSearch: v, product: null } : it)
                        );
                        searchProducts(v, idx);
                      }}
                      onBlur={() =>
                        setTimeout(() =>
                          setReturnItems((prev) =>
                            prev.map((it, i) => i === idx ? { ...it, showDrop: false } : it)
                          ), 150
                        )
                      }
                    />

                    {item.showDrop && item.productSuggestions.length > 0 && (
                      <div className={styles.dropdown}>
                        {item.productSuggestions.map((p) => (
                          <div
                            key={p.id}
                            className={styles.dropdownItem}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectProduct(p, idx);
                            }}
                          >
                            <strong>{p.code}</strong> — {p.name}
                            <span>Stock: {p.current_stock}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.product && (
                      <span className={styles.selectedHint}>✓ {item.product.code}</span>
                    )}
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${styles.input} ${styles.qtyInput}`}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItemQty(idx, e.target.value)}
                  />

                  {returnItems.length > 1 && (
                    <button
                      type="button"
                      className={styles.btnRemoveItem}
                      onClick={() => removeReturnItem(idx)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.submitRow}>
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Processing…' : 'OK'}
              </button>
            </div>
          </section>

          {/* FULL ORIGINAL HISTORY SECTION */}
          <section className={styles.historySection}>
            <h3 className={styles.sectionTitle}>📜 Return History</h3>

            {historyLoading ? (
              <div className={styles.historyLoading}>
                <div className={styles.spinner} />
                <p>Loading history…</p>
              </div>
            ) : history.length === 0 ? (
              <div className={styles.historyEmpty}>
                <p>No returns have been recorded yet.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Products Returned</th>
                      <th>Total Qty</th>
                      <th>Reason</th>
                      <th>Processed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ret) => {
                      const totalQty = (ret.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
                      const productList = (ret.items || [])
                        .map((it) => `${it.product_code} (×${it.quantity})`)
                        .join(', ');
                      return (
                        <tr key={ret.id}>
                          <td className={styles.dateCell}>
                            {new Date(ret.return_date).toLocaleDateString('en-KE', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className={styles.customerCell}>{ret.customer_name}</td>
                          <td className={styles.productsCell}>{productList}</td>
                          <td className={styles.qtyCell}>{totalQty}</td>
                          <td className={styles.reasonCell}>{ret.reason}</td>
                          <td className={styles.byCell}>{ret.returned_by_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default ReturnsModal;