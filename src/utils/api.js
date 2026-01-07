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
  getMonthlySales: () => api.request('/dashboard/monthly_sales/'),
  getTopProducts: (limit = 5) => api.request(`/dashboard/top_products/?limit=${limit}`),
  getRecentSales: (days = 30) =>
    api.request(`/dashboard/recent_sales/?days=${days}`),
  getTopCustomers: (limit = 10) =>
    api.request(`/dashboard/top_customers/?limit=${limit}`),

  // ==========================
  // Users
  // ==========================
  getUsers: () => api.request('/users/'),
  getUser: (id) => api.request(`/users/${id}/`),

  // ==========================
  // Reports (NEW)
  // ==========================
  
  /**
   * Get Sales Report
   * @param {Object} params - Optional parameters for filtering
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @returns {Promise} Sales report data
   */
  getSalesReport: async (params = {}) => {
    try {
      const queryString = Object.keys(params).length 
        ? `?${new URLSearchParams(params).toString()}` 
        : '';
      const data = await api.request(`/sales/${queryString}`);
      
      // Normalize response format
      if (Array.isArray(data)) {
        return data;
      } else if (data && data.results) {
        return data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw error;
    }
  },

  /**
   * Get Stock Report
   * @param {Object} params - Optional parameters for filtering
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {boolean} params.low_stock - Filter for low stock items only
   * @returns {Promise} Stock report data
   */
  getStockReport: async (params = {}) => {
    try {
      let endpoint = '/products/';
      
      // If filtering for low stock, use the low_stock endpoint
      if (params.low_stock) {
        endpoint = '/products/low_stock/';
        delete params.low_stock;
      }
      
      const queryString = Object.keys(params).length 
        ? `?${new URLSearchParams(params).toString()}` 
        : '';
      const data = await api.request(`${endpoint}${queryString}`);
      
      // Normalize response format
      if (Array.isArray(data)) {
        return data;
      } else if (data && data.results) {
        return data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching stock report:', error);
      throw error;
    }
  },

  /**
   * Get Outstanding Supplies Report
   * @param {Object} params - Optional parameters for filtering
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {number} params.customer - Filter by customer ID
   * @returns {Promise} Outstanding supplies report data
   */
  getOutstandingSuppliesReport: async (params = {}) => {
    try {
      // First, try to use a dedicated endpoint if it exists
      const queryString = Object.keys(params).length 
        ? `?${new URLSearchParams(params).toString()}` 
        : '';
      
      try {
        const data = await api.request(`/sales/outstanding-supplies/${queryString}`);
        return Array.isArray(data) ? data : (data?.results || []);
      } catch (endpointError) {
        // If the endpoint doesn't exist, fall back to filtering all sales
        console.log('Outstanding supplies endpoint not found, filtering from all sales');
        
        const salesData = await api.getSales(queryString);
        const allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
        
        // Filter for sales with outstanding supplies
        return allSales.filter(sale => 
          sale.line_items && sale.line_items.some(item => 
            item.supply_status === 'Partially Supplied' || 
            item.supply_status === 'Not Supplied'
          )
        );
      }
    } catch (error) {
      console.error('Error fetching outstanding supplies report:', error);
      throw error;
    }
  },

  /**
   * Get Outstanding Balances Report
   * @param {Object} params - Optional parameters for filtering
   * @param {string} params.start_date - Start date (YYYY-MM-DD)
   * @param {string} params.end_date - End date (YYYY-MM-DD)
   * @param {number} params.customer - Filter by customer ID
   * @returns {Promise} Outstanding balances report data
   */
  getOutstandingBalancesReport: async (params = {}) => {
    try {
      // First, try to use a dedicated endpoint if it exists
      const queryString = Object.keys(params).length 
        ? `?${new URLSearchParams(params).toString()}` 
        : '';
      
      try {
        const data = await api.request(`/sales/outstanding-balances/${queryString}`);
        return Array.isArray(data) ? data : (data?.results || []);
      } catch (endpointError) {
        // If the endpoint doesn't exist, fall back to filtering all sales
        console.log('Outstanding balances endpoint not found, filtering from all sales');
        
        const salesData = await api.getSales(queryString);
        const allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
        
        // Filter for sales with outstanding balances
        return allSales.filter(sale => parseFloat(sale.outstanding_balance || 0) > 0);
      }
    } catch (error) {
      console.error('Error fetching outstanding balances report:', error);
      throw error;
    }
  },

  /**
   * Get Outstanding Invoices (Legacy - for backward compatibility)
   * @returns {Promise} Outstanding invoices data
   */
  getOutstandingInvoices: () => api.getOutstandingBalancesReport(),

  /**
   * Get Pending LPOs (Legacy - for backward compatibility)
   * @returns {Promise} Pending LPOs data
   */
  getPendingLPOs: () => api.getOutstandingSuppliesReport(),

  /**
   * Export report to CSV (client-side)
   * @param {string} reportType - Type of report ('sales', 'stock', 'outstanding_supplies', 'outstanding_balances')
   * @param {Array} data - Report data to export
   * @returns {void}
   */
  exportReportToCSV: (reportType, data) => {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    let csv = '';
    let filename = '';

    switch (reportType) {
      case 'sales':
        csv = generateSalesCSV(data);
        filename = 'sales_report';
        break;
      case 'stock':
        csv = generateStockCSV(data);
        filename = 'stock_report';
        break;
      case 'outstanding_supplies':
        csv = generateOutstandingSuppliesCSV(data);
        filename = 'outstanding_supplies_report';
        break;
      case 'outstanding_balances':
        csv = generateOutstandingBalancesCSV(data);
        filename = 'outstanding_balances_report';
        break;
      default:
        console.error('Unknown report type:', reportType);
        return;
    }

    // Create and download CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

// ==========================
// CSV Generation Helper Functions
// ==========================

function generateSalesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Names,Quantity Supplied,Total Amount,Amount Paid,Outstanding Balance,Mode of Payment\n';
  const rows = data.map(sale => {
    const productNames = (sale.line_items || []).map(item => item.product_name || '').join('; ');
    const quantitySupplied = (sale.line_items || []).map(item => 
      `${item.product_name}: ${item.quantity_supplied}/${item.quantity_ordered}`
    ).join('; ');
    
    return [
      new Date(sale.created_at).toLocaleDateString(),
      sale.sale_number || '',
      `"${sale.customer_name || ''}"`,
      sale.lpo_quotation_number || '-',
      sale.delivery_number || '-',
      `"${productNames}"`,
      `"${quantitySupplied}"`,
      sale.total_amount || 0,
      sale.amount_paid || 0,
      sale.outstanding_balance || 0,
      sale.mode_of_payment || ''
    ].join(',');
  }).join('\n');
  
  return headers + rows;
}

function generateStockCSV(data) {
  const headers = 'Product Code,Product Name,Quantity,Status\n';
  const rows = data.map(product => {
    const status = (product.current_stock || 0) <= (product.minimum_stock || 0) ? 'Low Stock' : 'In Stock';
    return [
      product.code || '',
      `"${product.name || ''}"`,
      product.current_stock || 0,
      status
    ].join(',');
  }).join('\n');
  
  return headers + rows;
}

function generateOutstandingSuppliesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Name,Quantity Ordered,Quantity Supplied,Outstanding Supplies,Payment Status\n';
  const rows = [];
  
  data.forEach(sale => {
    (sale.line_items || []).forEach(item => {
      if (item.supply_status === 'Partially Supplied' || item.supply_status === 'Not Supplied') {
        const outstandingQty = (item.quantity_ordered || 0) - (item.quantity_supplied || 0);
        const paymentStatus = parseFloat(sale.outstanding_balance || 0) > 0 ? 'Pending' : 'Paid';
        
        rows.push([
          new Date(sale.created_at).toLocaleDateString(),
          sale.sale_number || '',
          `"${sale.customer_name || ''}"`,
          sale.lpo_quotation_number || '-',
          sale.delivery_number || '-',
          `"${item.product_name || ''}"`,
          item.quantity_ordered || 0,
          item.quantity_supplied || 0,
          outstandingQty,
          paymentStatus
        ].join(','));
      }
    });
  });
  
  return headers + rows.join('\n');
}

function generateOutstandingBalancesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Products,Total Amount,Amount Paid,Outstanding Balance\n';
  const rows = data.map(sale => {
    const products = (sale.line_items || []).map(item => item.product_name || '').join('; ');
    
    return [
      new Date(sale.created_at).toLocaleDateString(),
      sale.sale_number || '',
      `"${sale.customer_name || ''}"`,
      sale.lpo_quotation_number || '-',
      sale.delivery_number || '-',
      `"${products}"`,
      sale.total_amount || 0,
      sale.amount_paid || 0,
      sale.outstanding_balance || 0
    ].join(',');
  }).join('\n');
  
  return headers + rows;
}

export default api;