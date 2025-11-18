// src/pages/StockEntries/StockEntries.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import styles from './StockEntries.module.css';

const StockEntries = () => {
  const [stockEntries, setStockEntries] = useState([]);
  const [salesData, setSalesData] = useState([]);
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
          // Load stock entries
          let allEntries = [];
          let nextUrl = null;

          const response = await api.getStockEntries();
          allEntries = response.results || response;
          nextUrl = response.next;

          while (nextUrl) {
            const nextResponse = await api.getStockEntries(nextUrl);
            allEntries = [...allEntries, ...(nextResponse.results || [])];
            nextUrl = nextResponse.next;
          }

          setStockEntries(allEntries);
        } else {
          // Load sales data for Stock Out
          const salesResponse = await api.request('/sales/');
          const sales = Array.isArray(salesResponse) ? salesResponse : (salesResponse?.results || []);
          
          // Flatten sales into individual line items with sale details
          const flattenedSales = [];
          sales.forEach(sale => {
            sale.line_items.forEach(item => {
              flattenedSales.push({
                id: `${sale.id}-${item.id}`,
                date: sale.created_at,
                product_code: item.product_code,
                product_name: item.product_name,
                sale_number: sale.sale_number,
                customer_name: sale.customer_name,
                quantity: item.quantity_supplied,
                supply_status: item.supply_status,
                lpo_quotation_number: sale.lpo_quotation_number,
                delivery_number: sale.delivery_number
              });
            });
          });
          
          setSalesData(flattenedSales);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setStockEntries([]);
        setSalesData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  // Filter stock entries (Stock In)
  const filteredStockIn = stockEntries.filter(entry => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      entry.product_code?.toLowerCase().includes(search) ||
      entry.product_name?.toLowerCase().includes(search);

    if (!matchesSearch) return false;
    if (categoryFilter !== 'all' && entry.category_name !== categoryFilter) return false;
    if (subcategoryFilter !== 'all' && entry.subcategory_name !== subcategoryFilter) return false;
    if (subsubcategoryFilter !== 'all' && entry.subsubcategory_name !== subsubcategoryFilter) return false;
    return true;
  });

  // Filter sales data (Stock Out)
  const filteredStockOut = salesData.filter(item => {
    const search = searchTerm.toLowerCase();
    return (
      item.product_code?.toLowerCase().includes(search) ||
      item.product_name?.toLowerCase().includes(search) ||
      item.sale_number?.toLowerCase().includes(search) ||
      item.customer_name?.toLowerCase().includes(search)
    );
  });

  // Group Stock In entries by category → subcategory → subsubcategory
  const groupedStockIn = {};
  filteredStockIn.forEach(entry => {
    const cat = entry.category_name || 'Uncategorized';
    const subcat = entry.subcategory_name || 'Uncategorized';
    const subsub = entry.subsubcategory_name || 'Ungrouped';

    if (!groupedStockIn[cat]) groupedStockIn[cat] = {};
    if (!groupedStockIn[cat][subcat]) groupedStockIn[cat][subcat] = {};
    if (!groupedStockIn[cat][subcat][subsub]) groupedStockIn[cat][subcat][subsub] = [];

    groupedStockIn[cat][subcat][subsub].push(entry);
  });

  const renderStockInRows = (entries) =>
    entries.map(entry => (
      <tr key={entry.id}>
        <td>{new Date(entry.created_at).toLocaleString()}</td>
        <td className={styles.productCode}>{entry.product_code}</td>
        <td>{entry.product_name}</td>
        <td className={styles.quantity}>{entry.quantity}</td>
        <td>
          <span className={`badge ${entry.entry_type === 'stocked' ? 'badge-success' : 'badge-warning'}`}>
            {entry.entry_type === 'stocked' ? 'Stocked' : 'Manual Adjustment'}
          </span>
        </td>
        <td>{entry.recorded_by_name || 'N/A'}</td>
      </tr>
    ));

  const renderStockOutRows = (items) =>
    items.map(item => (
      <tr key={item.id}>
        <td>{new Date(item.date).toLocaleString()}</td>
        <td className={styles.productCode}>{item.product_code}</td>
        <td>{item.product_name}</td>
        <td className={styles.saleNumber}>{item.sale_number}</td>
        <td>{item.customer_name}</td>
        <td className={styles.quantity}>{item.quantity}</td>
        <td>
          <span className={`badge ${
            item.supply_status === 'Supplied' ? 'badge-success' : 
            item.supply_status === 'Partially Supplied' ? 'badge-warning' : 
            'badge-danger'
          }`}>
            {item.supply_status}
          </span>
        </td>
        <td>{item.lpo_quotation_number || '-'}</td>
        <td>{item.delivery_number || '-'}</td>
      </tr>
    ));

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading stock entries...</p>
      </div>
    );
  }

  return (
    <div className={styles.stockEntriesPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Stock Entries</h1>
          <p className={styles.pageSubtitle}>Track all stock movements - incoming and outgoing</p>
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
          placeholder={activeTab === 'stock-in' ? 'Search by product code or name...' : 'Search by product, sale number, or customer...'}
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
                {cat.name === 'Fire' && '🔥'} 
                {cat.name === 'ICT' && '💻'} 
                {cat.name === 'Solar' && '☀️'} 
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
                <p className={styles.noData}>No stock in entries found</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedStockIn).map(([catName, subcats]) => (
              <div key={catName} className={styles.categorySection}>
                <h2 className={styles.categoryHeader}>{catName}</h2>
                {Object.entries(subcats).map(([subcatName, subsubs]) => (
                  <div key={subcatName} className={styles.subcategorySection}>
                    <h3 className={styles.subcategoryHeader}>{subcatName}</h3>
                    {Object.entries(subsubs).map(([subsubName, entries]) => (
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
                                    <th>Status</th>
                                    <th>Recorded By</th>
                                  </tr>
                                </thead>
                                <tbody>{renderStockInRows(entries)}</tbody>
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
                <p className={styles.noData}>No stock out entries found</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Sale Number</th>
                        <th>Customer</th>
                        <th>Quantity</th>
                        <th>Supply Status</th>
                        <th>LPO/Quote</th>
                        <th>Delivery #</th>
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