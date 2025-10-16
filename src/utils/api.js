// src/utils/api.js
const API_BASE_URL = 'http://localhost:8000/api';

const api = {
  // Get auth headers
  getAuthHeaders: () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  },

  // Generic request handler with token refresh
  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...api.getAuthHeaders(),
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access);
            // Retry original request
            return api.request(endpoint, options);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
      
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Request failed');
    
    // Extract results array from paginated responses
    if (data && typeof data === 'object' && 'results' in data) {
      return data.results;
    }
    
    return data;
  },

  // Authentication
  login: (credentials) => 
    fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(r => r.json()),

  getCurrentUser: () => api.request('/users/me/'),

  // Products
  getProducts: (params = '') => api.request(`/products/${params}`),
  getProduct: (id) => api.request(`/products/${id}/`),
  getLowStock: () => api.request('/products/low_stock/'),
  createProduct: (data) => api.request('/products/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateProduct: (id, data) => api.request(`/products/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteProduct: (id) => api.request(`/products/${id}/`, { method: 'DELETE' }),
  adjustStock: (id, data) => api.request(`/products/${id}/adjust_stock/`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),

  // Categories
  getCategories: () => api.request('/categories/'),
  getCategory: (id) => api.request(`/categories/${id}/`),
  createCategory: (data) => api.request('/categories/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateCategory: (id, data) => api.request(`/categories/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteCategory: (id) => api.request(`/categories/${id}/`, { method: 'DELETE' }),

  // SubCategories
  getSubCategories: (categoryId = '') => 
    api.request(`/subcategories/${categoryId ? `?category=${categoryId}` : ''}`),
  getSubCategory: (id) => api.request(`/subcategories/${id}/`),
  createSubCategory: (data) => api.request('/subcategories/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateSubCategory: (id, data) => api.request(`/subcategories/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteSubCategory: (id) => api.request(`/subcategories/${id}/`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (params = '') => api.request(`/suppliers/${params}`),
  getSupplier: (id) => api.request(`/suppliers/${id}/`),
  createSupplier: (data) => api.request('/suppliers/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateSupplier: (id, data) => api.request(`/suppliers/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteSupplier: (id) => api.request(`/suppliers/${id}/`, { method: 'DELETE' }),
  toggleSupplierActive: (id) => api.request(`/suppliers/${id}/toggle_active/`, { 
    method: 'POST' 
  }),

  // Customers
  getCustomers: (params = '') => api.request(`/customers/${params}`),
  getCustomer: (id) => api.request(`/customers/${id}/`),
  createCustomer: (data) => api.request('/customers/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateCustomer: (id, data) => api.request(`/customers/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteCustomer: (id) => api.request(`/customers/${id}/`, { method: 'DELETE' }),
  toggleCustomerActive: (id) => api.request(`/customers/${id}/toggle_active/`, { 
    method: 'POST' 
  }),

  // Sales (NEW)
  getSales: (params = '') => api.request(`/sales/${params}`),
  getSale: (id) => api.request(`/sales/${id}/`),
  getOutstandingSales: () => api.request('/sales/outstanding/'),
  getSalesByCustomer: (customerId) => api.request(`/sales/by_customer/?customer_id=${customerId}`),
  createSale: (data) => api.request('/sales/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateSale: (id, data) => api.request(`/sales/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  updateSaleSupply: (id, data) => api.request(`/sales/${id}/update_supply/`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  deleteSale: (id) => api.request(`/sales/${id}/`, { method: 'DELETE' }),
  searchSalesProducts: (query) => api.request(`/sales/search_products/?q=${query}`),
  searchSalesCustomers: (query) => api.request(`/sales/search_customers/?q=${query}`),

  // Invoices
  getInvoices: (params = '') => api.request(`/invoices/${params}`),
  getInvoice: (id) => api.request(`/invoices/${id}/`),
  getOutstandingInvoices: () => api.request('/invoices/outstanding/'),
  createInvoice: (data) => api.request('/invoices/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateInvoice: (id, data) => api.request(`/invoices/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteInvoice: (id) => api.request(`/invoices/${id}/`, { method: 'DELETE' }),
  recordPayment: (id, data) => api.request(`/invoices/${id}/record_payment/`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),

  // Payments
  getPayments: (params = '') => api.request(`/payments/${params}`),
  getPayment: (id) => api.request(`/payments/${id}/`),
  createPayment: (data) => api.request('/payments/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),

  // LPOs
  getLPOs: (params = '') => api.request(`/lpos/${params}`),
  getLPO: (id) => api.request(`/lpos/${id}/`),
  getPendingLPOs: () => api.request('/lpos/pending/'),
  createLPO: (data) => api.request('/lpos/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  updateLPO: (id, data) => api.request(`/lpos/${id}/`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  deleteLPO: (id) => api.request(`/lpos/${id}/`, { method: 'DELETE' }),
  updateDelivery: (id, data) => api.request(`/lpos/${id}/update_delivery/`, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),

  // Stock Entries
  getStockEntries: (params = '') => api.request(`/stock-entries/${params}`),
  getStockEntry: (id) => api.request(`/stock-entries/${id}/`),

  // Monthly Opening Stock
  getMonthlyOpeningStock: (params = '') => api.request(`/monthly-opening-stock/${params}`),
  createMonthlyOpeningStock: (data) => api.request('/monthly-opening-stock/', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),

  // Audit Logs
  getAuditLogs: (params = '') => api.request(`/audit-logs/${params}`),

  // Dashboard
  getDashboardSummary: () => api.request('/dashboard/summary/'),
  getRecentSales: (days = 30) => api.request(`/dashboard/recent_sales/?days=${days}`),
  getTopCustomers: (limit = 10) => api.request(`/dashboard/top_customers/?limit=${limit}`),

  // Users
  getUsers: () => api.request('/users/'),
  getUser: (id) => api.request(`/users/${id}/`)
};

export default api;