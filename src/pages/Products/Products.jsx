// src/pages/Products/Products.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ProductModal from './ProductModal';
import StockAdjustModal from './StockAdjustModal';
import styles from './Products.module.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, subcategoriesData] = await Promise.all([
        filter === 'low' ? api.getLowStock() : api.getProducts(),
        api.getCategories(),
        api.getSubCategories()
      ]);
      
      // Ensure we always set arrays
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays on error to prevent crashes
      setProducts([]);
      setCategories([]);
      setSubcategories([]);
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

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.deleteProduct(id);
        loadData();
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
    loadData();
  };

  // Defensive filtering with array check
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    const search = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.code.toLowerCase().includes(search)
    );
  }) : [];

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
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Products & Stock</h1>
          <p className={styles.pageSubtitle}>Manage your inventory</p>
        </div>
        {isAdmin && (
          <button onClick={handleAddProduct} className="btn btn-primary">
            ➕ Add Product
          </button>
        )}
      </div>

      {/* Filters and Search */}
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

      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          {filteredProducts.length === 0 ? (
            <p className={styles.noData}>No products found</p>
          ) : (
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
                  {filteredProducts.map((product) => {
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
                            className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}
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
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
        <StockAdjustModal
          product={selectedProduct}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Products;