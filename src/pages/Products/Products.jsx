// src/pages/Products/Products.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProductModal from './ProductModal';
import StockAdjustModal from './StockAdjustModal';
import styles from './Products.module.css';

const Products = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('fire');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { user } = useAuth();
  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;

  // Define categories with their subcategories
  const CATEGORIES = {
    fire: {
      name: 'FIRE',
      subcategories: [
        { key: 'addressable', name: 'Addressable Fire Systems', display: 'ADDRESSABLE' },
        { key: 'conventional', name: 'Conventional Fire Systems', display: 'CONVENTIONAL' },
        { key: 'batteries', name: 'Batteries', display: 'BATTERIES' },
        { key: 'cables', name: 'Cables', display: 'CABLES' },
        { key: 'ul', name: 'UL Intelligent Systems', display: 'UL INTELLIGENT' },
        { key: 'accessories', name: 'Accessories', display: 'ACCESSORIES' },
        { key: 'emergency', name: 'Emergency VoCALL', display: 'EMERGENCY VoCALL' },
      ]
    },
    ict: {
      name: 'ICT',
      subcategories: [
        { key: 'giganet', name: 'Giganet Systems', display: 'GIGANET' },
        { key: 'siemon', name: 'Siemon Systems', display: 'SIEMON' },
        { key: 'ubiquiti', name: 'Ubiquiti Systems', display: 'UBIQUITI' },
        { key: 'cisco', name: 'Cisco Systems', display: 'CISCO' },
        { key: 'alcatel', name: 'Alcatel Lucent Systems', display: 'ALCATEL' },
        { key: 'hikvision', name: 'Hikvision Systems', display: 'HIKVISION' },
      ]
    },
    solar: {
      name: 'SOLAR',
      subcategories: []
    }
  };

  // Load categories, subcategories, groups, and suppliers
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catData, subcatData, groupsData, suppliersData] = await Promise.all([
          api.getCategories(),
          api.getSubCategories(),
          api.getGroups(),
          api.getSuppliers(),
        ]);
        setCategories(Array.isArray(catData) ? catData : []);
        setSubcategories(Array.isArray(subcatData) ? subcatData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      } catch (error) {
        console.error('Error loading meta data:', error);
      }
    };
    loadMeta();
  }, []);

  // Load ALL products
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

      console.log('Total products loaded:', allLoadedProducts.length);
      setAllProducts(allLoadedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
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

  // Matching helpers
  const matchSubcategory = (productSubcatName, targetSubcatName) => {
    if (!productSubcatName || !targetSubcatName) return false;
    const prodName = productSubcatName.toLowerCase().trim();
    const targetName = targetSubcatName.toLowerCase().trim();
    return prodName.includes(targetName) || targetName.includes(prodName);
  };

  const matchCategory = (productCategoryName, targetCategoryName) => {
    if (!productCategoryName || !targetCategoryName) return false;
    const prodName = productCategoryName.toLowerCase().trim();
    const targetName = targetCategoryName.toLowerCase().trim();
    return prodName.includes(targetName) || targetName.includes(prodName);
  };

  const currentSubcategories = CATEGORIES[categoryFilter]?.subcategories || [];

  // Filter products
  const filteredProducts = Array.isArray(allProducts)
    ? allProducts.filter((product) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(search) ||
          product.code.toLowerCase().includes(search);
        
        const categoryName = CATEGORIES[categoryFilter]?.name || '';
        const matchesCategory = matchCategory(product.category_name, categoryName);
        if (!matchesCategory) return false;

        if (subcategoryFilter === 'all') return matchesSearch;

        const selectedSubcat = currentSubcategories.find(s => s.key === subcategoryFilter);
        if (!selectedSubcat) return matchesSearch;

        const matchesSubcategory = matchSubcategory(product.subcategory_name, selectedSubcat.name);
        return matchesSearch && matchesSubcategory;
      })
    : [];

  // Group by subcategory + product group (for FIRE, ICT, SOLAR)
  const groupedBySubcategory = {};
  if (['fire', 'ict', 'solar'].includes(categoryFilter)) {
    currentSubcategories.forEach(subcat => {
      const productsInSubcat = filteredProducts.filter(product => 
        matchSubcategory(product.subcategory_name, subcat.name)
      );
      
      if (productsInSubcat.length > 0) {
        const groupedByProductGroup = {};
        productsInSubcat.forEach(product => {
          const groupName = product.group_name || 'Ungrouped';
          if (!groupedByProductGroup[groupName]) {
            groupedByProductGroup[groupName] = [];
          }
          groupedByProductGroup[groupName].push(product);
        });
        groupedBySubcategory[subcat.name] = {
          display: subcat.display,
          groups: groupedByProductGroup
        };
      }
    });

    const uncategorizedProducts = filteredProducts.filter(product => {
      const belongsToKnownSubcat = currentSubcategories.some(subcat =>
        matchSubcategory(product.subcategory_name, subcat.name)
      );
      return !belongsToKnownSubcat && product.subcategory_name;
    });
    
    if (uncategorizedProducts.length > 0) {
      const groupedByProductGroup = {};
      uncategorizedProducts.forEach(product => {
        const groupName = product.group_name || 'Ungrouped';
        if (!groupedByProductGroup[groupName]) {
          groupedByProductGroup[groupName] = [];
        }
        groupedByProductGroup[groupName].push(product);
      });
      groupedBySubcategory['Other Products'] = {
        display: 'Other',
        groups: groupedByProductGroup
      };
    }
  }

  // Render product rows
  const renderProductRows = (products) =>
    products.map((product) => {
      const isLowStock = product.current_stock <= product.minimum_stock;
      return (
        <tr key={product.id}>
          <td className={styles.productCode}>{product.code}</td>
          <td>{product.name}</td>
          <td>{product.group_name || 'N/A'}</td>
          <td className={styles.price}>KES {Number(product.unit_price).toLocaleString()}</td>
          <td><span className={styles.stockBadge}>{product.current_stock}</span></td>
          <td>
            <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}>
              {isLowStock ? 'Low Stock' : 'In Stock'}
            </span>
          </td>
          <td>
            <div className={styles.actionButtons}>
              {isStaffOrAdmin && (
                <button onClick={() => handleStockAdjust(product)} className="btn btn-sm btn-outline">
                  📊 Restock
                </button>
              )}
              {isStaffOrAdmin && (
                <button onClick={() => handleEditProduct(product)} className="btn btn-sm btn-primary">
                  ✏️
                </button>
              )}
              {user?.is_superuser && (
                <button onClick={() => handleDeleteProduct(product.id)} className="btn btn-sm btn-danger">
                  🗑️
                </button>
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
        <div className={styles.headerButtons}>
          {isStaffOrAdmin && (
            <>
              <button onClick={handleAddProduct} className="btn btn-primary">➕ Add Product</button>
              <button onClick={() => handleStockAdjust()} className="btn btn-success">📦 Add Stock</button>
            </>
          )}
        </div>
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

      {/* Category Navigation */}
      <div className={styles.categoryNav}>
        <button onClick={() => { setCategoryFilter('fire'); setSubcategoryFilter('all'); }}
          className={categoryFilter === 'fire' ? styles.categoryActive : styles.categoryButton}>🔥 FIRE</button>
        <button onClick={() => { setCategoryFilter('ict'); setSubcategoryFilter('all'); }}
          className={categoryFilter === 'ict' ? styles.categoryActive : styles.categoryButton}>💻 ICT</button>
        <button onClick={() => { setCategoryFilter('solar'); setSubcategoryFilter('all'); }}
          className={categoryFilter === 'solar' ? styles.categoryActive : styles.categoryButton}>☀️ SOLAR</button>
      </div>

      {/* Subcategory Navigation - for FIRE and ICT */}
      {['fire', 'ict'].includes(categoryFilter) && currentSubcategories.length > 0 && (
        <div className={styles.subcategoryNav}>
          <button
            onClick={() => setSubcategoryFilter('all')}
            className={subcategoryFilter === 'all' ? styles.navActive : styles.navButton}
          >
            ALL {CATEGORIES[categoryFilter]?.name}
          </button>
          {currentSubcategories.map((subcat) => (
            <button
              key={subcat.key}
              onClick={() => setSubcategoryFilter(subcat.key)}
              className={subcategoryFilter === subcat.key ? styles.navActive : styles.navButton}
            >
              {subcat.display}
            </button>
          ))}
        </div>
      )}

      {/* Products Display */}
      <div className={styles.productsContainer}>
        {filteredProducts.length === 0 ? (
          <div className="card"><div className="card-body"><p className={styles.noData}>No products found in this category</p></div></div>
        ) : ['fire', 'ict', 'solar'].includes(categoryFilter) && subcategoryFilter === 'all' ? (
          Object.keys(groupedBySubcategory).map((subcategoryName) => {
            const subcatData = groupedBySubcategory[subcategoryName];
            return (
              <div key={subcategoryName} className={styles.subcategorySection}>
                <h2 className={styles.subcategoryHeader}>{subcatData.display} Products</h2>
                {Object.keys(subcatData.groups).map((groupName) => (
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
                            <tbody>
                              {renderProductRows(subcatData.groups[groupName])}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <div className={styles.subcategorySection}>
            {['fire', 'ict', 'solar'].includes(categoryFilter) && subcategoryFilter !== 'all' && (
              <h2 className={styles.subcategoryHeader}>
                {currentSubcategories.find(s => s.key === subcategoryFilter)?.display || 'Products'}
              </h2>
            )}
            {(() => {
              const groupedByProductGroup = {};
              filteredProducts.forEach(product => {
                const groupName = product.group_name || 'Ungrouped';
                if (!groupedByProductGroup[groupName]) groupedByProductGroup[groupName] = [];
                groupedByProductGroup[groupName].push(product);
              });
              return Object.keys(groupedByProductGroup).map((groupName) => (
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
                          <tbody>
                            {renderProductRows(groupedByProductGroup[groupName])}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          subcategories={subcategories}
          groups={groups}
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
