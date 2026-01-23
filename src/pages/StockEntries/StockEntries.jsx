// src/pages/StockEntries/StockEntries.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import styles from './StockEntries.module.css';

const StockEntries = () => {
  const [stockInData, setStockInData] = useState([]);
  const [stockOutData, setStockOutData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock-in');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [subsubcategoryFilter, setSubsubcategoryFilter] = useState('all');

  const { user } = useAuth();
  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;

  // Load categories with hierarchy
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catData = await api.getCategories();
        setCategories(catData?.results || catData || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (activeTab === 'stock-in') {
          // Load Stock IN movements (direction=IN, reasons: RESTOCK, ADJUSTMENT, INITIAL, RETURN)
          let allMovements = [];
          let nextUrl = null;

          const response = await api.request('/stock-movements/?direction=IN');
          allMovements = response.results || response;
          nextUrl = response.next;

          while (nextUrl) {
            const nextResponse = await api.request(nextUrl);
            allMovements = [...allMovements, ...(nextResponse.results || [])];
            nextUrl = nextResponse.next;
          }

          setStockInData(allMovements);
        } else {
          // Load Stock OUT movements (direction=OUT, reasons: SALE, DAMAGE, TRANSFER)
          let allMovements = [];
          let nextUrl = null;

          const response = await api.request('/stock-movements/?direction=OUT');
          allMovements = response.results || response;
          nextUrl = response.next;

          while (nextUrl) {
            const nextResponse = await api.request(nextUrl);
            allMovements = [...allMovements, ...(nextResponse.results || [])];
            nextUrl = nextResponse.next;
          }

          setStockOutData(allMovements);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setStockInData([]);
        setStockOutData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Filter stock IN movements
  const filteredStockIn = stockInData.filter(movement => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      movement.product_code?.toLowerCase().includes(search) ||
      movement.product_name?.toLowerCase().includes(search) ||
      movement.supplier_name?.toLowerCase().includes(search);

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && movement.category_name !== categoryFilter) return false;
    if (subcategoryFilter !== 'all' && movement.subcategory_name !== subcategoryFilter) return false;
    if (subsubcategoryFilter !== 'all' && movement.subsubcategory_name !== subsubcategoryFilter) return false;
    return true;
  });

  // Filter stock OUT movements
  const filteredStockOut = stockOutData.filter(movement => {
    const search = searchTerm.toLowerCase();
    return (
      movement.product_code?.toLowerCase().includes(search) ||
      movement.product_name?.toLowerCase().includes(search) ||
      movement.sale_number?.toLowerCase().includes(search) ||
      movement.customer_name?.toLowerCase().includes(search) ||
      movement.reason_display?.toLowerCase().includes(search)
    );
  });

  // Group Stock In entries by category → subcategory → subsubcategory
  const groupedStockIn = {};
  filteredStockIn.forEach(movement => {
    const cat = movement.category_name || 'Uncategorized';
    const subcat = movement.subcategory_name || 'Uncategorized';
    const subsub = movement.subsubcategory_name || 'Ungrouped';

    if (!groupedStockIn[cat]) groupedStockIn[cat] = {};
    if (!groupedStockIn[cat][subcat]) groupedStockIn[cat][subcat] = {};
    if (!groupedStockIn[cat][subcat][subsub]) groupedStockIn[cat][subcat][subsub] = [];

    groupedStockIn[cat][subcat][subsub].push(movement);
  });

  const renderStockInRows = (movements) =>
    movements.map(movement => (
      <tr key={movement.id}>
        <td>{new Date(movement.created_at).toLocaleString()}</td>
        <td className={styles.productCode}>{movement.product_code}</td>
        <td>{movement.product_name}</td>
        <td className={styles.quantity}>{movement.quantity}</td>
        <td>
          <span className={`badge ${
            movement.reason === 'RESTOCK' ? 'badge-success' : 
            movement.reason === 'ADJUSTMENT' ? 'badge-warning' :
            movement.reason === 'INITIAL' ? 'badge-info' :
            'badge-primary'
          }`}>
            {movement.reason_display}
          </span>
        </td>
        <td>{movement.supplier_name || 'N/A'}</td>
        <td>{movement.recorded_by_name || 'N/A'}</td>
        <td className={styles.notes}>{movement.notes || '-'}</td>
      </tr>
    ));

  const renderStockOutRows = (movements) =>
    movements.map(movement => (
      <tr key={movement.id}>
        <td>{new Date(movement.created_at).toLocaleString()}</td>
        <td className={styles.productCode}>{movement.product_code}</td>
        <td>{movement.product_name}</td>
        <td className={styles.quantity}>{movement.quantity}</td>
        <td>
          <span className={`badge ${
            movement.reason === 'SALE' ? 'badge-success' : 
            movement.reason === 'DAMAGE' ? 'badge-danger' :
            'badge-warning'
          }`}>
            {movement.reason_display}
          </span>
        </td>
        <td className={styles.saleNumber}>{movement.sale_number || '-'}</td>
        <td>{movement.customer_name || '-'}</td>
        <td>{movement.recorded_by_name || 'N/A'}</td>
        <td className={styles.notes}>{movement.notes || '-'}</td>
      </tr>
    ));

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading stock movements...</p>
      </div>
    );
  }

  return (
    <div className={styles.stockEntriesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock Movements</h1>
          <p className={styles.pageSubtitle}>
            {activeTab === 'stock-in' 
              ? 'Track inventory increases: restocking, adjustments, returns' 
              : 'Track inventory decreases: sales, damages, transfers'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          onClick={() => {
            setActiveTab('stock-in');
            setCategoryFilter('all');
            setSubcategoryFilter('all');
            setSubsubcategoryFilter('all');
            setSearchTerm('');
          }}
          className={activeTab === 'stock-in' ? styles.tabActive : styles.tab}
        >
          📥 Stock In
        </button>
        <button
          onClick={() => {
            setActiveTab('stock-out');
            setSearchTerm('');
          }}
          className={activeTab === 'stock-out' ? styles.tabActive : styles.tab}
        >
          📤 Stock Out
        </button>
      </div>

      {/* Search Box */}
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder={
            activeTab === 'stock-in' 
              ? 'Search by product code, name, or supplier...' 
              : 'Search by product, sale number, customer, or reason...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      {/* Category Filters (Only for Stock In) */}
      {activeTab === 'stock-in' && (
        <>
          <div className={styles.filterBar}>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSubcategoryFilter('all');
                setSubsubcategoryFilter('all');
              }}
              className={categoryFilter === 'all' ? styles.filterActive : styles.filterButton}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryFilter(cat.name);
                  setSubcategoryFilter('all');
                  setSubsubcategoryFilter('all');
                }}
                className={categoryFilter === cat.name ? styles.filterActive : styles.filterButton}
              >
                {cat.name.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Subcategory Filters */}
          {categoryFilter !== 'all' && (
            <div className={styles.subcategoryFilters}>
              {categories
                .find(c => c.name === categoryFilter)
                ?.subcategories?.map(subcat => (
                  <button
                    key={subcat.id}
                    onClick={() => {
                      setSubcategoryFilter(subcat.name);
                      setSubsubcategoryFilter('all');
                    }}
                    className={subcategoryFilter === subcat.name ? styles.filterActive : styles.filterButton}
                  >
                    {subcat.name}
                  </button>
                ))}
            </div>
          )}

          {/* SubSubCategory Filters */}
          {subcategoryFilter !== 'all' && (
            <div className={styles.subsubcategoryFilters}>
              {categories
                .find(c => c.name === categoryFilter)
                ?.subcategories
                ?.find(sc => sc.name === subcategoryFilter)
                ?.subsubcategories?.map(ssc => (
                  <button
                    key={ssc.id}
                    onClick={() => setSubsubcategoryFilter(ssc.name)}
                    className={subsubcategoryFilter === ssc.name ? styles.filterActive : styles.filterButton}
                  >
                    {ssc.name}
                  </button>
                ))}
            </div>
          )}
        </>
      )}

      {/* Content */}
      <div className={styles.entriesContainer}>
        {activeTab === 'stock-in' ? (
          // Stock In - Hierarchical Display
          Object.keys(groupedStockIn).length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className={styles.noData}>No stock in movements found</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedStockIn).map(([catName, subcats]) => (
              <div key={catName} className={styles.categorySection}>
                <h2 className={styles.categoryHeader}>{catName}</h2>
                {Object.entries(subcats).map(([subcatName, subsubs]) => (
                  <div key={subcatName} className={styles.subcategorySection}>
                    <h3 className={styles.subcategoryHeader}>{subcatName}</h3>
                    {Object.entries(subsubs).map(([subsubName, movements]) => (
                      <div key={subsubName} className={styles.subsubcategorySection}>
                        <h4 className={styles.subsubcategoryHeader}>{subsubName}</h4>
                        <div className="card">
                          <div className="card-body">
                            <div className="table-container">
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Product Code</th>
                                    <th>Product Name</th>
                                    <th>Quantity</th>
                                    <th>Reason</th>
                                    <th>Supplier</th>
                                    <th>Recorded By</th>
                                    <th>Notes</th>
                                  </tr>
                                </thead>
                                <tbody>{renderStockInRows(movements)}</tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))
          )
        ) : (
          // Stock Out - Flat Display
          <div className="card">
            <div className="card-body">
              {filteredStockOut.length === 0 ? (
                <p className={styles.noData}>No stock out movements found</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                        <th>Sale Number</th>
                        <th>Customer</th>
                        <th>Recorded By</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>{renderStockOutRows(filteredStockOut)}</tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockEntries;