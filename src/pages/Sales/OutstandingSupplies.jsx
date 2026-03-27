// src/pages/Sales/OutstandingSupplies.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import styles from './OutstandingSupplies.module.css';

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100
    .toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getTodayLocal = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const OutstandingSupplies = () => {
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Delivery modal state
  const [deliveryModal, setDeliveryModal] = useState(null); // holds the sale object
  const [deliveryDate, setDeliveryDate] = useState(getTodayLocal());
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryErrors, setDeliveryErrors] = useState([]);

  const navigate = useNavigate();

  useEffect(() => { loadOutstandingSupplies(); }, []);

  const loadOutstandingSupplies = async () => {
    try {
      setLoading(true);
      const data = await api.request('/sales/outstanding/');
      if (Array.isArray(data)) setSupplies(data);
      else if (data?.results) setSupplies(data.results);
      else setSupplies([]);
    } catch (error) {
      console.error('Error loading outstanding supplies:', error);
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = supplies.filter(sale =>
    sale.sale_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.lpo_quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      'Supplied': 'badge-success',
      'Partially Supplied': 'badge-warning',
      'Not Supplied': 'badge-danger',
    };
    return badges[status] || 'badge-secondary';
  };

  // Get only the outstanding line items for a sale
  const getOutstandingItems = (sale) =>
    (sale.line_items || []).filter(
      item => item.supply_status === 'Not Supplied' || item.supply_status === 'Partially Supplied'
    );

  const openDeliveryModal = (sale) => {
    setDeliveryModal(sale);
    setDeliveryDate(getTodayLocal());
    setDeliveryNotes('');
    setDeliveryErrors([]);
  };

  const closeDeliveryModal = () => {
    setDeliveryModal(null);
    setDeliveryErrors([]);
  };

  const handleRecordDelivery = async () => {
    if (!deliveryDate) {
      setDeliveryErrors(['Please enter a delivery date.']);
      return;
    }

    const outstandingItems = getOutstandingItems(deliveryModal);

    const items = outstandingItems.map(item => ({
      line_item_id: item.id,
      quantity_delivered: item.quantity_ordered - item.quantity_supplied,
    }));

    try {
      setDeliveryLoading(true);
      setDeliveryErrors([]);

      await api.recordDelivery(deliveryModal.id, {
        delivery_date: deliveryDate,
        notes: deliveryNotes,
        items,
      });

      alert(
        `✅ Delivery recorded successfully for sale ${deliveryModal.sale_number}!\n\n` +
        `Delivery Date: ${deliveryDate}\n` +
        `Items supplied: ${outstandingItems.length}`
      );

      closeDeliveryModal();
      loadOutstandingSupplies();
    } catch (error) {
      // Try to parse structured errors from backend
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed.errors)) {
          setDeliveryErrors(parsed.errors);
          return;
        }
      } catch (_) {}
      setDeliveryErrors([error.message || 'Failed to record delivery. Please try again.']);
    } finally {
      setDeliveryLoading(false);
    }
  };

  return (
    <div className={styles.outstandingPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Outstanding Supplies</h1>
          <p className={styles.pageSubtitle}>Track pending and partially supplied orders</p>
        </div>
        <button onClick={() => navigate('/sales')} className={`btn btn-secondary ${styles.btnBack}`}>
          ← Back to Sales
        </button>
      </div>

      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by sale number, customer, or LPO..."
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
              <p>Loading outstanding supplies...</p>
            </div>
          ) : filteredSupplies.length === 0 ? (
            <p className={styles.noData}>
              {searchTerm
                ? 'No outstanding supplies found matching your search.'
                : 'No outstanding supplies found. All orders are fully supplied!'}
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sale #</th>
                    <th>Sale Date</th>
                    <th>Customer</th>
                    <th>LPO/Quote</th>
                    <th>Delivery #</th>
                    <th>Product Name</th>
                    <th>Ordered</th>
                    <th>Supplied</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th>Unit Price</th>
                    <th>Outstanding Value</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.map(sale => {
                    const outstandingItems = getOutstandingItems(sale);
                    return outstandingItems.map((item, idx) => (
                      <tr key={`${sale.id}-${item.id}`}>
                        {idx === 0 && (
                          <>
                            <td rowSpan={outstandingItems.length} className={styles.saleNumber}>
                              {sale.sale_number}
                            </td>
                            <td rowSpan={outstandingItems.length}>
                              {new Date(sale.created_at).toLocaleDateString()}
                            </td>
                            <td rowSpan={outstandingItems.length} className={styles.customerName}>
                              {sale.customer_name}
                            </td>
                            <td rowSpan={outstandingItems.length}>
                              {sale.lpo_quotation_number || '-'}
                            </td>
                            <td rowSpan={outstandingItems.length}>
                              {sale.delivery_number || '-'}
                            </td>
                          </>
                        )}
                        <td className={styles.productName}>{item.product_name}</td>
                        <td className={styles.quantityOrdered}>{item.quantity_ordered}</td>
                        <td className={styles.quantitySupplied}>{item.quantity_supplied}</td>
                        <td className={styles.quantityOutstanding}>
                          {item.quantity_ordered - item.quantity_supplied}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(item.supply_status)}`}>
                            {item.supply_status}
                          </span>
                        </td>
                        <td className={styles.unitPrice}>KES {formatCurrency(item.unit_price)}</td>
                        <td className={styles.totalValue}>
                          KES {formatCurrency(
                            (item.quantity_ordered - item.quantity_supplied) * item.unit_price
                          )}
                        </td>
                        {idx === 0 && (
                          <td rowSpan={outstandingItems.length} className={styles.actionCell}>
                            <button
                              className={styles.btnRecordDelivery}
                              onClick={() => openDeliveryModal(sale)}
                            >
                              🚚 Record Delivery
                            </button>
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================
          Record Delivery Modal
      ======================== */}
      {deliveryModal && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && closeDeliveryModal()}
        >
          <div className={styles.deliveryModal}>
            <div className={styles.deliveryModalHeader}>
              <div>
                <h2 className={styles.deliveryModalTitle}>Record Delivery</h2>
                <span className={styles.deliveryModalSale}>{deliveryModal.sale_number} — {deliveryModal.customer_name}</span>
              </div>
              <button className={styles.modalClose} onClick={closeDeliveryModal}>×</button>
            </div>

            <div className={styles.deliveryModalBody}>

              {/* Errors */}
              {deliveryErrors.length > 0 && (
                <div className={styles.errorBox}>
                  {deliveryErrors.map((err, i) => (
                    <div key={i}>⚠️ {err}</div>
                  ))}
                </div>
              )}

              {/* Delivery date */}
              <div className={styles.deliveryFormGroup}>
                <label className={styles.deliveryLabel}>
                  Delivery Date <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className={styles.deliveryInput}
                  max={getTodayLocal()}
                />
              </div>

              {/* Items being delivered */}
              <div className={styles.deliveryItemsSection}>
                <h4 className={styles.deliveryItemsTitle}>Items to be Fully Supplied</h4>
                <p className={styles.deliveryItemsNote}>
                  The following outstanding quantities will be marked as fully supplied upon recording this delivery.
                </p>
                <div className={styles.deliveryItemsList}>
                  {getOutstandingItems(deliveryModal).map(item => (
                    <div key={item.id} className={styles.deliveryItem}>
                      <div className={styles.deliveryItemInfo}>
                        <span className={styles.deliveryItemCode}>{item.product_code}</span>
                        <span className={styles.deliveryItemName}>{item.product_name}</span>
                      </div>
                      <div className={styles.deliveryItemQty}>
                        <span className={styles.deliveryQtyLabel}>Outstanding:</span>
                        <span className={styles.deliveryQtyValue}>
                          {item.quantity_ordered - item.quantity_supplied} units
                        </span>
                      </div>
                      <div className={styles.deliveryItemBadge}>
                        ✅ Will be fully supplied
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className={styles.deliveryFormGroup}>
                <label className={styles.deliveryLabel}>Notes (optional)</label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className={styles.deliveryTextarea}
                  placeholder="e.g. Delivered via company truck, signed by John..."
                  rows={3}
                />
              </div>

            </div>

            <div className={styles.deliveryModalFooter}>
              <button
                className={styles.btnCancel}
                onClick={closeDeliveryModal}
                disabled={deliveryLoading}
              >
                Cancel
              </button>
              <button
                className={styles.btnConfirmDelivery}
                onClick={handleRecordDelivery}
                disabled={deliveryLoading}
              >
                {deliveryLoading ? 'Recording...' : '🚚 Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstandingSupplies;