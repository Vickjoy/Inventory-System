// src/utils/api.js
const API_BASE_URL = 'http://localhost:8000/api';

const api = {
  // ==========================
  // Auth headers
  // ==========================
  getAuthHeaders: () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  },

  // ==========================
  // Generic request handler with token refresh
  // ==========================
  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...api.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access);
            return api.request(endpoint, options);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || data?.message || 'Request failed');
    }

    return data;
  },

  // ==========================
  // Authentication
  // ==========================
  login: (credentials) =>
    fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }).then((r) => r.json()),

  logout: () => api.request('/auth/logout/', { method: 'POST' }),
  getCurrentUser: () => api.request('/users/me/'),

  // ==========================
  // Categories (Full Tree)
  // ==========================
  getCategories: () => api.request('/categories/'),
  getCategory: (id) => api.request(`/categories/${id}/`),
  createCategory: (data) =>
    api.request('/categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    api.request(`/categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) =>
    api.request(`/categories/${id}/`, { method: 'DELETE' }),

  // ==========================
  // SubCategories
  // ==========================
  getSubCategories: (categoryId = '') =>
    api.request(`/subcategories/${categoryId ? `?category=${categoryId}` : ''}`),
  getSubCategory: (id) => api.request(`/subcategories/${id}/`),
  createSubCategory: (data) =>
    api.request('/subcategories/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubCategory: (id, data) =>
    api.request(`/subcategories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSubCategory: (id) =>
    api.request(`/subcategories/${id}/`, { method: 'DELETE' }),

  // ==========================
  // Sub-SubCategories
  // ==========================
  getSubSubCategories: (subcategoryId = '') =>
    api.request(`/subsubcategories/${subcategoryId ? `?subcategory=${subcategoryId}` : ''}`),
  getSubSubCategory: (id) => api.request(`/subsubcategories/${id}/`),
  createSubSubCategory: (data) =>
    api.request('/subsubcategories/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubSubCategory: (id, data) =>
    api.request(`/subsubcategories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSubSubCategory: (id) =>
    api.request(`/subsubcategories/${id}/`, { method: 'DELETE' }),

  // ==========================
  // Product Groups (Deprecated)
  // ==========================
  getGroups: (subcategoryId = '') =>
    api.request(`/groups/${subcategoryId ? `?subcategory=${subcategoryId}` : ''}`),
  getGroup: (id) => api.request(`/groups/${id}/`),
  createGroup: (data) =>
    api.request('/groups/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGroup: (id, data) =>
    api.request(`/groups/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteGroup: (id) =>
    api.request(`/groups/${id}/`, { method: 'DELETE' }),

  // ==========================
  // Products
  // ==========================
  getProducts: (urlOrParams = '') => {
    if (
      urlOrParams &&
      typeof urlOrParams === 'string' &&
      urlOrParams.startsWith('http')
    ) {
      return fetch(urlOrParams, {
        headers: api.getAuthHeaders(),
      }).then((r) => r.json());
    }

    if (!urlOrParams || urlOrParams === 'null') {
      return api.request('/products/');
    }

    return api.request(`/products/${urlOrParams}`);
  },

  getLowStock: (urlOrParams = '') => {
    if (
      urlOrParams &&
      typeof urlOrParams === 'string' &&
      urlOrParams.startsWith('http')
    ) {
      return fetch(urlOrParams, {
        headers: api.getAuthHeaders(),
      }).then((r) => r.json());
    }

    if (!urlOrParams || urlOrParams === 'null') {
      return api.request('/products/low_stock/');
    }

    return api.request(`/products/low_stock/${urlOrParams}`);
  },

  getProduct: (id) => api.request(`/products/${id}/`),
  createProduct: (data) =>
    api.request('/products/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id, data) =>
    api.request(`/products/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProduct: (id) => api.request(`/products/${id}/`, { method: 'DELETE' }),
  adjustStock: (id, data) =>
    api.request(`/products/${id}/adjust_stock/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==========================
  // Suppliers
  // ==========================
  getSuppliers: async (params = '') => {
    try {
      const data = await api.request(`/suppliers/${params}`);
      console.log('Raw Suppliers API response:', data);
      
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.results)) {
          return data.results;
        }
        if (data.id) {
          return [data];
        }
      }
      
      console.warn('Unexpected suppliers response format:', data);
      return [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  getSupplier: (id) => api.request(`/suppliers/${id}/`),
  
  createSupplier: async (data) => {
    try {
      const result = await api.request('/suppliers/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('Supplier created:', result);
      return result;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },

  updateSupplier: async (id, data) => {
    try {
      const result = await api.request(`/suppliers/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('Supplier updated:', result);
      return result;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },

  deleteSupplier: (id) =>
    api.request(`/suppliers/${id}/`, { method: 'DELETE' }),
  
  toggleSupplierActive: (id) =>
    api.request(`/suppliers/${id}/toggle_active/`, { method: 'POST' }),

  // ==========================
  // Customers
  // ==========================
  getCustomers: async (params = '') => {
    try {
      const data = await api.request(`/customers/${params}`);
      console.log('Raw API response:', data);
      
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.results)) {
          return data.results;
        }
        if (data.id) {
          return [data];
        }
      }
      
      console.warn('Unexpected customers response format:', data);
      return [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  getCustomer: (id) => api.request(`/customers/${id}/`),

  getCustomerSales: (customerId) => api.request(`/customers/${customerId}/sales/`),

  createCustomer: async (data) => {
    try {
      const result = await api.request('/customers/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('Customer created:', result);
      return result;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const result = await api.request(`/customers/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('Customer updated:', result);
      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  deleteCustomer: (id) =>
    api.request(`/customers/${id}/`, { method: 'DELETE' }),

  toggleCustomerActive: (id) =>
    api.request(`/customers/${id}/toggle_active/`, { method: 'POST' }),

  // ==========================
  // Sales
  // ==========================
  getSales: (params = '') => api.request(`/sales/${params}`),
  getSale: (id) => api.request(`/sales/${id}/`),
  getOutstandingSales: () => api.request('/sales/outstanding/'),

  searchSalesProducts: (query) => api.request(`/sales/search_products/?q=${query}`),
  searchSalesCustomers: (query) => api.request(`/sales/search_customers/?q=${query}`),

  createSale: (data) =>
    api.request('/sales/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSale: (id, data) =>
    api.request(`/sales/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateSaleLineItemSupply: (saleId, data) =>
    api.request(`/sales/${saleId}/update_line_item_supply/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSale: (id) => api.request(`/sales/${id}/`, { method: 'DELETE' }),

  updateSaleSupply: (id, data) =>
    api.request(`/sales/${id}/update_supply/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==========================
  // Stock Entries
  // ==========================
  getStockEntries: (params = '') => api.request(`/stock-entries/${params}`),
  getStockEntry: (id) => api.request(`/stock-entries/${id}/`),

  // ==========================
  // Monthly Opening Stock
  // ==========================
  getMonthlyOpeningStock: (params = '') =>
    api.request(`/monthly-opening-stock/${params}`),
  createMonthlyOpeningStock: (data) =>
    api.request('/monthly-opening-stock/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMonthlyOpeningStock: (id, data) =>
    api.request(`/monthly-opening-stock/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ==========================
  // Audit Logs
  // ==========================
  getAuditLogs: (params = '') => api.request(`/audit-logs/${params}`),

  // ==========================
  // Dashboard
  // ==========================
  getDashboardSummary: () => api.request('/dashboard/summary/'),
  getRecentSales: (days = 30) =>
    api.request(`/dashboard/recent_sales/?days=${days}`),
  getTopCustomers: (limit = 10) =>
    api.request(`/dashboard/top_customers/?limit=${limit}`),

  // ==========================
  // Users
  // ==========================
  getUsers: () => api.request('/users/'),
  getUser: (id) => api.request(`/users/${id}/`),
};

export default api;