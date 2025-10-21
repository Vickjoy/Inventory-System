// src/pages/Products/Products.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProductModal from './ProductModal';
import StockAdjustModal from './StockAdjustModal';
import styles from './Products.module.css';

const Products = () => {
  const [allProducts, setAllProducts] = useState([]); // Store ALL products
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { isAdmin } = useAuth();

  // Define all subcategories explicitly
  const SUBCATEGORIES = [
    { key: 'addressable', name: 'Addressable Systems', display: 'ADDRESSABLE' },
    { key: 'conventional', name: 'Conventional Systems', display: 'CONVENTIONAL' },
    { key: 'batteries', name: 'Batteries', display: 'BATTERIES' },
    { key: 'cables', name: 'Cables', display: 'CABLES' },
    { key: 'ul', name: 'UL Intelligent Systems', display: 'UL INTELLIGENT' },
    { key: 'accessories', name: 'Accessories', display: 'ACCESSORIES' },
    { key: 'emergency', name: 'Emergency', display: 'EMERGENCY VoCALL' },
  ];

  // ✅ Load categories/subcategories once
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catData, subcatData] = await Promise.all([
          api.getCategories(),
          api.getSubCategories(),
        ]);
        setCategories(Array.isArray(catData) ? catData : []);
        setSubcategories(Array.isArray(subcatData) ? subcatData : []);
      } catch (error) {
        console.error('Error loading meta data:', error);
      }
    };
    loadMeta();
  }, []);

  // ✅ Load ALL products (with pagination handling)
  useEffect(() => {
    loadAllProducts();
  }, [filter]);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      let allLoadedProducts = [];
      let nextUrl = null;

      // First request
      const response = filter === 'low'
        ? await api.getLowStock()
        : await api.getProducts();

      // Check if response is paginated
      if (response && typeof response === 'object' && 'results' in response) {
        allLoadedProducts = [...response.results];
        nextUrl = response.next;

        // Keep loading pages until no more
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
        // Non-paginated response
        allLoadedProducts = Array.isArray(response) ? response : [];
      }

      console.log('Total products loaded:', allLoadedProducts.length);
      setAllProducts(allLoadedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Modal handlers
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.deleteProduct(id);
        loadAllProducts();
      } catch (error) {
        alert('Error deleting product: ' + error.message);
      }
    }
  };

  const handleStockAdjust = (product) => {
    setSelectedProduct(product);
    setShowStockModal(true);
  };

  const handleModalClose = () => {
    setShowProductModal(false);
    setShowStockModal(false);
    setSelectedProduct(null);
    loadAllProducts();
  };

  // ✅ Match subcategory name (case-insensitive, partial match)
  const matchSubcategory = (productSubcatName, targetSubcatName) => {
    if (!productSubcatName || !targetSubcatName) return false;
    const prodName = productSubcatName.toLowerCase().trim();
    const targetName = targetSubcatName.toLowerCase().trim();
    return prodName.includes(targetName) || targetName.includes(prodName);
  };

  // ✅ Filter products by search term and subcategory
  const filteredProducts = Array.isArray(allProducts)
    ? allProducts.filter((product) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(search) ||
          product.code.toLowerCase().includes(search);
        
        if (subcategoryFilter === 'all') {
          return matchesSearch;
        }

        // Find the selected subcategory definition
        const selectedSubcat = SUBCATEGORIES.find(s => s.key === subcategoryFilter);
        if (!selectedSubcat) return matchesSearch;

        const matchesSubcategory = matchSubcategory(product.subcategory_name, selectedSubcat.name);
        return matchesSearch && matchesSubcategory;
      })
    : [];

  // ✅ Group products by subcategory (for "ALL" view)
  const groupedProducts = {};
  SUBCATEGORIES.forEach(subcat => {
    const productsInSubcat = allProducts.filter(product => 
      matchSubcategory(product.subcategory_name, subcat.name)
    );
    if (productsInSubcat.length > 0) {
      groupedProducts[subcat.name] = productsInSubcat;
    }
  });

  // Add uncategorized products
  const uncategorizedProducts = allProducts.filter(product => {
    const belongsToKnownSubcat = SUBCATEGORIES.some(subcat =>
      matchSubcategory(product.subcategory_name, subcat.name)
    );
    return !belongsToKnownSubcat && product.subcategory_name;
  });
  if (uncategorizedProducts.length > 0) {
    groupedProducts['Other Products'] = uncategorizedProducts;
  }

  // Render product table rows
  const renderProductRows = (products) => {
    return products.map((product) => {
      const isLowStock = product.current_stock <= product.minimum_stock;
      return (
        <tr key={product.id}>
          <td className={styles.productCode}>{product.code}</td>
          <td>{product.name}</td>
          <td>{product.category_name}</td>
          <td>{product.subcategory_name}</td>
          <td className={styles.price}>
            KES {Number(product.unit_price).toLocaleString()}
          </td>
          <td>
            <span className={styles.stockBadge}>
              {product.current_stock}
            </span>
          </td>
          <td>
            <span
              className={`badge ${
                isLowStock ? 'badge-danger' : 'badge-success'
              }`}
            >
              {isLowStock ? 'Low Stock' : 'In Stock'}
            </span>
          </td>
          <td>
            <div className={styles.actionButtons}>
              <button
                onClick={() => handleStockAdjust(product)}
                className="btn btn-sm btn-outline"
                title="Adjust Stock"
              >
                📊
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="btn btn-sm btn-primary"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="btn btn-sm btn-danger"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className={styles.productsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Products & Stock</h1>
          <p className={styles.pageSubtitle}>
            Manage your inventory ({allProducts.length} total products)
          </p>
        </div>
        {isAdmin && (
          <button onClick={handleAddProduct} className="btn btn-primary">
            ➕ Add Product
          </button>
        )}
      </div>

      {/* Filter + Search */}
      <div className={styles.filterBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? styles.filterActive : styles.filterButton}
          >
            All Products
          </button>
          <button
            onClick={() => setFilter('low')}
            className={filter === 'low' ? styles.filterActive : styles.filterButton}
          >
            Low Stock
          </button>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>
      </div>

      {/* Subcategory Navigation Buttons */}
      <div className={styles.subcategoryNav}>
        <button
          onClick={() => setSubcategoryFilter('all')}
          className={subcategoryFilter === 'all' ? styles.navActive : styles.navButton}
        >
          ALL
        </button>
        {SUBCATEGORIES.map((subcat) => (
          <button
            key={subcat.key}
            onClick={() => setSubcategoryFilter(subcat.key)}
            className={
              subcategoryFilter === subcat.key ? styles.navActive : styles.navButton
            }
          >
            {subcat.display}
          </button>
        ))}
      </div>

      {/* Products Display - Grouped by Subcategory */}
      <div className={styles.productsContainer}>
        {filteredProducts.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className={styles.noData}>No products found</p>
            </div>
          </div>
        ) : subcategoryFilter === 'all' ? (
          // Show all subcategories with headers
          Object.keys(groupedProducts).map((subcategoryName) => {
            // Find display name for this subcategory
            const subcatDef = SUBCATEGORIES.find(s => s.name === subcategoryName);
            const displayName = subcatDef 
              ? subcatDef.display 
              : (subcategoryName === 'Other Products' ? 'Other' : subcategoryName);
            
            return (
            <div key={subcategoryName} className={styles.subcategorySection}>
              <h2 className={styles.subcategoryHeader}>
                {displayName} Products
              </h2>
              <div className="card">
                <div className="card-body">
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Category</th>
                          <th>SubCategory</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderProductRows(groupedProducts[subcategoryName])}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        ) : (
          // Show single subcategory
          <div className={styles.subcategorySection}>
            <h2 className={styles.subcategoryHeader}>
              {SUBCATEGORIES.find(s => s.key === subcategoryFilter)?.display || 'Products'}
            </h2>
            <div className="card">
              <div className="card-body">
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>SubCategory</th>
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
          </div>
        )}
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          subcategories={subcategories}
          onClose={handleModalClose}
        />
      )}

      {showStockModal && (
        <StockAdjustModal product={selectedProduct} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default Products;