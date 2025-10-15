// src/pages/Settings/Settings.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import styles from './Settings.module.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [subcategoryForm, setSubcategoryForm] = useState({ name: '', description: '', category: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      alert('Access denied. Admin only.');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, subcategoriesData] = await Promise.all([
        api.getCategories(),
        api.getSubCategories()
      ]);
      setCategories(categoriesData);
      setSubcategories(subcategoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryForm);
      } else {
        await api.createCategory(categoryForm);
      }
      loadData();
      resetCategoryForm();
    } catch (error) {
      alert('Error saving category: ' + error.message);
    }
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubcategory) {
        await api.updateSubCategory(editingSubcategory.id, subcategoryForm);
      } else {
        await api.createSubCategory(subcategoryForm);
      }
      loadData();
      resetSubcategoryForm();
    } catch (error) {
      alert('Error saving subcategory: ' + error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure? This will also delete all subcategories and products under this category.')) {
      try {
        await api.deleteCategory(id);
        loadData();
      } catch (error) {
        alert('Error deleting category: ' + error.message);
      }
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (window.confirm('Are you sure? This will also affect products under this subcategory.')) {
      try {
        await api.deleteSubCategory(id);
        loadData();
      } catch (error) {
        alert('Error deleting subcategory: ' + error.message);
      }
    }
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '' });
    setShowCategoryForm(true);
  };

  const editSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description || '',
      category: subcategory.category
    });
    setShowSubcategoryForm(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', description: '' });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({ name: '', description: '', category: '' });
    setEditingSubcategory(null);
    setShowSubcategoryForm(false);
  };

  if (!isAdmin) {
    return (
      <div className={styles.accessDenied}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
        <p className={styles.pageSubtitle}>Manage system configuration</p>
      </div>

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('categories')}
          className={activeTab === 'categories' ? styles.tabActive : styles.tab}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className={activeTab === 'subcategories' ? styles.tabActive : styles.tab}
        >
          SubCategories
        </button>
      </div>

      {activeTab === 'categories' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Categories</h2>
            <button
              onClick={() => setShowCategoryForm(!showCategoryForm)}
              className="btn btn-primary"
            >
              {showCategoryForm ? 'Cancel' : '➕ Add Category'}
            </button>
          </div>

          {showCategoryForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <form onSubmit={handleCategorySubmit}>
                  <div className="form-group">
                    <label className="form-label">Category Name *</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                      required
                      placeholder="e.g., Fire, ICT, Solar"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      className="form-textarea"
                      placeholder="Optional description"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary">
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </button>
                    <button type="button" onClick={resetCategoryForm} className="btn btn-outline">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Subcategories</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id}>
                      <td className={styles.categoryName}>{category.name}</td>
                      <td>{category.description || '-'}</td>
                      <td>{category.subcategories?.length || 0}</td>
                      <td>{new Date(category.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => editCategory(category)}
                            className="btn btn-sm btn-primary"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="btn btn-sm btn-danger"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subcategories' && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>SubCategories</h2>
            <button
              onClick={() => setShowSubcategoryForm(!showSubcategoryForm)}
              className="btn btn-primary"
            >
              {showSubcategoryForm ? 'Cancel' : '➕ Add SubCategory'}
            </button>
          </div>

          {showSubcategoryForm && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <form onSubmit={handleSubcategorySubmit}>
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      value={subcategoryForm.category}
                      onChange={(e) => setSubcategoryForm(prev => ({ ...prev, category: e.target.value }))}
                      className="form-select"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">SubCategory Name *</label>
                    <input
                      type="text"
                      value={subcategoryForm.name}
                      onChange={(e) => setSubcategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                      required
                      placeholder="e.g., Addressable, Conventional"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      value={subcategoryForm.description}
                      onChange={(e) => setSubcategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      className="form-textarea"
                      placeholder="Optional description"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary">
                      {editingSubcategory ? 'Update SubCategory' : 'Add SubCategory'}
                    </button>
                    <button type="button" onClick={resetSubcategoryForm} className="btn btn-outline">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map(subcategory => (
                    <tr key={subcategory.id}>
                      <td>{subcategory.category_name}</td>
                      <td className={styles.subcategoryName}>{subcategory.name}</td>
                      <td>{subcategory.description || '-'}</td>
                      <td>{new Date(subcategory.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => editSubcategory(subcategory)}
                            className="btn btn-sm btn-primary"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(subcategory.id)}
                            className="btn btn-sm btn-danger"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;