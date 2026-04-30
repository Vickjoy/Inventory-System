// src/pages/Products/Products.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProductModal from './ProductModal';
import StockAdjustModal from './StockAdjustModal';
import styles from './Products.module.css';

const Products = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;

  const urlFilter = searchParams.get('filter');
  const initialFilter = urlFilter === 'low' ? 'low' : 'all';
  const [filter, setFilter] = useState(initialFilter);

  const hasInitialized = useRef(false);

  // Derived: are we in "search mode"?
  const isSearching = searchTerm.trim().length > 0;

  useEffect(() => {
    const urlFilter = searchParams.get('filter');
    if (!hasInitialized.current) {
      if (urlFilter === 'low') {
        setFilter('low');
        setCategoryFilter('all');
        setSubcategoryFilter('all');
        setSearchTerm('');
      }
      hasInitialized.current = true;
      return;
    }
    if (urlFilter === 'low' && filter !== 'low') {
      setFilter('low');
      setCategoryFilter('all');
      setSubcategoryFilter('all');
      setSearchTerm('');
    } else if (!urlFilter && filter === 'low') {
      setFilter('all');
    }
  }, [searchParams]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      handleAddProduct();
      setSearchParams({});
    }
  }, [searchParams]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catData, suppliersData] = await Promise.all([
          api.getCategories(),
          api.getSuppliers(),
        ]);
        setCategories(catData?.results || catData || []);
        setSuppliers(suppliersData?.results || suppliersData || []);
      } catch (error) {
        console.error('Error loading meta data:', error);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    loadAllProducts();
  }, [filter]);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      let allLoadedProducts = [];
      let nextUrl = null;

      const response = filter === 'low'
        ? await api.getLowStock()
        : await api.getProducts();

      if (response && typeof response === 'object' && 'results' in response) {
        allLoadedProducts = [...response.results];
        nextUrl = response.next;
        while (nextUrl) {
          const nextResponse = filter === 'low'
            ? await api.getLowStock(nextUrl)
            : await api.getProducts(nextUrl);
          if (nextResponse && nextResponse.results) {
            allLoadedProducts = [...allLoadedProducts, ...nextResponse.results];
            nextUrl = nextResponse.next;
          } else {
            break;
          }
        }
      } else {
        allLoadedProducts = Array.isArray(response) ? response : [];
      }

      setAllProducts(allLoadedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleStockAdjust = (product = null) => {
    setSelectedProduct(product);
    setShowStockModal(true);
  };

  const handleModalClose = () => {
    setShowProductModal(false);
    setShowStockModal(false);
    setSelectedProduct(null);
    loadAllProducts();
  };

  const handleFilterChange = (newFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setCategoryFilter('all');
      setSubcategoryFilter('all');
      setSearchTerm('');
    }
  };

  const currentCategory = categories.find(cat =>
    categoryFilter !== 'all' && cat.id === parseInt(categoryFilter)
  );
  const currentSubcategories = currentCategory?.subcategories || [];

  const filteredProducts = Array.isArray(allProducts)
    ? allProducts.filter((product) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(search) ||
          product.code.toLowerCase().includes(search);

        if (categoryFilter !== 'all') {
          if (product.category !== parseInt(categoryFilter)) return false;
        }
        if (subcategoryFilter !== 'all') {
          if (product.subcategory !== parseInt(subcategoryFilter)) return false;
        }
        return matchesSearch;
      })
    : [];

  // Build grouped structure only when NOT searching
  const groupedProducts = {};
  if (!isSearching) {
    if (categoryFilter === 'all') {
      filteredProducts.forEach(product => {
        const catName = product.category_name || 'Uncategorized';
        const subcatName = product.subcategory_name || 'Uncategorized';
        const groupName = product.subsubcategory_name || 'Ungrouped';
        if (!groupedProducts[catName]) groupedProducts[catName] = {};
        if (!groupedProducts[catName][subcatName]) groupedProducts[catName][subcatName] = {};
        if (!groupedProducts[catName][subcatName][groupName]) groupedProducts[catName][subcatName][groupName] = [];
        groupedProducts[catName][subcatName][groupName].push(product);
      });
    } else if (subcategoryFilter === 'all') {
      filteredProducts.forEach(product => {
        const subcatName = product.subcategory_name || 'Uncategorized';
        const groupName = product.subsubcategory_name || 'Ungrouped';
        if (!groupedProducts[subcatName]) groupedProducts[subcatName] = {};
        if (!groupedProducts[subcatName][groupName]) groupedProducts[subcatName][groupName] = [];
        groupedProducts[subcatName][groupName].push(product);
      });
    } else {
      filteredProducts.forEach(product => {
        const groupName = product.subsubcategory_name || 'Ungrouped';
        if (!groupedProducts[groupName]) groupedProducts[groupName] = [];
        groupedProducts[groupName].push(product);
      });
    }
  }

  const renderProductRows = (products) =>
    products.map((product) => {
      const isLowStock = product.current_stock <= 0;
      return (
        <tr key={product.id}>
          <td className={styles.productCode}>{product.code}</td>
          <td>{product.name}</td>
          <td>{product.subsubcategory_name || 'N/A'}</td>
          <td className={styles.price}>
            {product.unit_price ? `KES ${Number(product.unit_price).toLocaleString()}` : 'N/A'}
          </td>
          <td><span className={styles.stockBadge}>{product.current_stock}</span></td>
          <td>
            <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}>
              {isLowStock ? 'Out of Stock' : 'In Stock'}
            </span>
          </td>
          <td>
            <div className={styles.actionButtons}>
              {isStaffOrAdmin && (
                <>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="btn btn-sm btn-edit"
                    title="Edit product"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleStockAdjust(product)}
                    className="btn btn-sm btn-outline"
                    title="Restock"
                  >
                    📊 Restock
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading {filter === 'low' ? 'out of stock' : ''} products...</p>
      </div>
    );
  }

  return (
    <div className={styles.productsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Products & Stock</h1>
          {filter === 'low' && (
            <p className={styles.pageSubtitle} style={{ color: '#ef4444', fontWeight: 600 }}>
              Showing Out of Stock Items ({filteredProducts.length})
            </p>
          )}
        </div>
        <div className={styles.headerButtons}>
          {isStaffOrAdmin && (
            <button onClick={handleAddProduct} className="btn btn-primary">➕ Add Product</button>
          )}
        </div>
      </div>

      {/* Filter + Search */}
      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => handleFilterChange('all')}
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
          >
            All Products
          </button>
          <button
            onClick={() => handleFilterChange('low')}
            className={filter === 'low' ? styles.filterActive : styles.filterButton}
          >
            Out of Stock
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
          {isSearching && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── SEARCH RESULTS MODE — flat list, no category navigation ── */}
      {isSearching ? (
        <div className={styles.productsContainer}>
          <div className={styles.searchResultsHeader}>
            <span className={styles.searchResultsCount}>
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for &ldquo;{searchTerm}&rdquo;
            </span>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className={styles.noData}>No products found matching &ldquo;{searchTerm}&rdquo;</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Group</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderProductRows(filteredProducts)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Category Navigation — hidden while searching */}
          <div className={styles.categoryNav}>
            <button
              onClick={() => { setCategoryFilter('all'); setSubcategoryFilter('all'); }}
              className={categoryFilter === 'all' ? styles.categoryActive : styles.categoryButton}
            >
              ALL CATEGORIES
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategoryFilter(cat.id.toString()); setSubcategoryFilter('all'); }}
                className={categoryFilter === cat.id.toString() ? styles.categoryActive : styles.categoryButton}
              >
                {cat.name.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Subcategory Navigation */}
          {categoryFilter !== 'all' && currentSubcategories.length > 0 && (
            <div className={styles.subcategoryNav}>
              <button
                onClick={() => setSubcategoryFilter('all')}
                className={subcategoryFilter === 'all' ? styles.navActive : styles.navButton}
              >
                ALL {currentCategory?.name.toUpperCase()}
              </button>
              {currentSubcategories.map((subcat) => (
                <button
                  key={subcat.id}
                  onClick={() => setSubcategoryFilter(subcat.id.toString())}
                  className={subcategoryFilter === subcat.id.toString() ? styles.navActive : styles.navButton}
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          )}

          {/* Products Display — grouped */}
          <div className={styles.productsContainer}>
            {filteredProducts.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className={styles.noData}>
                    {filter === 'low' ? 'No out of stock products found' : 'No products found'}
                  </p>
                </div>
              </div>
            ) : categoryFilter === 'all' ? (
              Object.entries(groupedProducts).map(([catName, subcats]) => (
                <div key={catName} className={styles.categorySection}>
                  <h2 className={styles.categoryHeader}>{catName}</h2>
                  {Object.entries(subcats).map(([subcatName, groups]) => (
                    <div key={subcatName} className={styles.subcategorySection}>
                      <h3 className={styles.subcategoryHeader}>{subcatName}</h3>
                      {Object.entries(groups).map(([groupName, products]) => (
                        <div key={groupName} className={styles.productGroupSection}>
                          <h4 className={styles.groupHeader}>{groupName}</h4>
                          <div className="card">
                            <div className="card-body">
                              <div className="table-container">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Code</th>
                                      <th>Name</th>
                                      <th>Group</th>
                                      <th>Price</th>
                                      <th>Stock</th>
                                      <th>Status</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>{renderProductRows(products)}</tbody>
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
            ) : subcategoryFilter === 'all' ? (
              Object.entries(groupedProducts).map(([subcatName, groups]) => (
                <div key={subcatName} className={styles.subcategorySection}>
                  <h2 className={styles.subcategoryHeader}>{subcatName}</h2>
                  {Object.entries(groups).map(([groupName, products]) => (
                    <div key={groupName} className={styles.productGroupSection}>
                      <h3 className={styles.groupHeader}>{groupName}</h3>
                      <div className="card">
                        <div className="card-body">
                          <div className="table-container">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Code</th>
                                  <th>Name</th>
                                  <th>Group</th>
                                  <th>Price</th>
                                  <th>Stock</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>{renderProductRows(products)}</tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              Object.entries(groupedProducts).map(([groupName, products]) => (
                <div key={groupName} className={styles.productGroupSection}>
                  <h3 className={styles.groupHeader}>{groupName}</h3>
                  <div className="card">
                    <div className="card-body">
                      <div className="table-container">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Name</th>
                              <th>Group</th>
                              <th>Price</th>
                              <th>Stock</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>{renderProductRows(products)}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          onClose={handleModalClose}
        />
      )}

      {showStockModal && (
        <StockAdjustModal
          product={selectedProduct}
          allProducts={allProducts}
          suppliers={suppliers}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Products;
