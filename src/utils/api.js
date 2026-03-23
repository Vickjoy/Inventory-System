// src/utils/api.js
const API_BASE_URL = 'http://localhost:8000/api';

const api = {

  // ========================
  // Auth Headers
  // ========================
  getAuthHeaders: () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  // ========================
  // Token Refresh
  // ========================
  refreshAccessToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
  },

  // ========================
  // Generic Request Handler
  // ========================
  async request(endpoint, options = {}, _retry = false) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...api.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401 && !_retry) {
      try {
        await api.refreshAccessToken();
        return api.request(endpoint, options, true);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (response.status === 401 && _retry) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        data?.error ||
        data?.non_field_errors?.[0] ||
        Object.values(data || {})[0] ||
        'Request failed';
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    return data;
  },

  // ========================
  // Authentication
  // ========================
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Invalid credentials. Please try again.';
      throw new Error(message);
    }

    return data;
  },

  logout: () => api.request('/auth/logout/', { method: 'POST' }),
  getCurrentUser: () => api.request('/users/me/'),

  // ========================
  // Categories
  // ========================
  getCategories: () => api.request('/categories/'),
  getCategory: (id) => api.request(`/categories/${id}/`),
  createCategory: (data) =>
    api.request('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) =>
    api.request(`/categories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) =>
    api.request(`/categories/${id}/`, { method: 'DELETE' }),

  // ========================
  // SubCategories
  // ========================
  getSubCategories: (categoryId = '') =>
    api.request(`/subcategories/${categoryId ? `?category=${categoryId}` : ''}`),
  getSubCategory: (id) => api.request(`/subcategories/${id}/`),
  createSubCategory: (data) =>
    api.request('/subcategories/', { method: 'POST', body: JSON.stringify(data) }),
  updateSubCategory: (id, data) =>
    api.request(`/subcategories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubCategory: (id) =>
    api.request(`/subcategories/${id}/`, { method: 'DELETE' }),

  // ========================
  // Sub-SubCategories
  // ========================
  getSubSubCategories: (subcategoryId = '') =>
    api.request(`/subsubcategories/${subcategoryId ? `?subcategory=${subcategoryId}` : ''}`),
  getSubSubCategory: (id) => api.request(`/subsubcategories/${id}/`),
  createSubSubCategory: (data) =>
    api.request('/subsubcategories/', { method: 'POST', body: JSON.stringify(data) }),
  updateSubSubCategory: (id, data) =>
    api.request(`/subsubcategories/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubSubCategory: (id) =>
    api.request(`/subsubcategories/${id}/`, { method: 'DELETE' }),

  // ========================
  // Product Groups (Deprecated)
  // ========================
  getGroups: (subcategoryId = '') =>
    api.request(`/groups/${subcategoryId ? `?subcategory=${subcategoryId}` : ''}`),
  getGroup: (id) => api.request(`/groups/${id}/`),
  createGroup: (data) =>
    api.request('/groups/', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id, data) =>
    api.request(`/groups/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) =>
    api.request(`/groups/${id}/`, { method: 'DELETE' }),

  // ========================
  // Products
  // ========================
  getProducts: (urlOrParams = '') => {
    if (urlOrParams && typeof urlOrParams === 'string' && urlOrParams.startsWith('http')) {
      return fetch(urlOrParams, { headers: api.getAuthHeaders() }).then((r) => r.json());
    }
    if (!urlOrParams || urlOrParams === 'null') return api.request('/products/');
    return api.request(`/products/${urlOrParams}`);
  },

  getLowStock: (urlOrParams = '') => {
    if (urlOrParams && typeof urlOrParams === 'string' && urlOrParams.startsWith('http')) {
      return fetch(urlOrParams, { headers: api.getAuthHeaders() }).then((r) => r.json());
    }
    if (!urlOrParams || urlOrParams === 'null') return api.request('/products/low_stock/');
    return api.request(`/products/low_stock/${urlOrParams}`);
  },

  getProduct: (id) => api.request(`/products/${id}/`),
  createProduct: (data) =>
    api.request('/products/', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) =>
    api.request(`/products/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) =>
    api.request(`/products/${id}/`, { method: 'DELETE' }),
  adjustStock: (id, data) =>
    api.request(`/products/${id}/adjust_stock/`, { method: 'POST', body: JSON.stringify(data) }),

  // ========================
  // Suppliers
  // ========================
  getSuppliers: async (params = '') => {
    try {
      const data = await api.request(`/suppliers/${params}`);
      console.log('Raw Suppliers API response:', data);
      if (Array.isArray(data)) return data;
      if (data?.results) return data.results;
      if (data?.id) return [data];
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

  // ========================
  // Customers
  // ========================
  getCustomers: async (params = '') => {
    try {
      const data = await api.request(`/customers/${params}`);
      console.log('Raw API response:', data);
      if (Array.isArray(data)) return data;
      if (data?.results) return data.results;
      if (data?.id) return [data];
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

  // ========================
  // Sales
  // ========================
  getSales: (params = '') => api.request(`/sales/${params}`),
  getSale: (id) => api.request(`/sales/${id}/`),
  getOutstandingSales: () => api.request('/sales/outstanding/'),
  searchSalesProducts: (query) => api.request(`/sales/search_products/?q=${query}`),
  searchSalesCustomers: (query) => api.request(`/sales/search_customers/?q=${query}`),

  createSale: (data) =>
    api.request('/sales/', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id, data) =>
    api.request(`/sales/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSale: (id) =>
    api.request(`/sales/${id}/`, { method: 'DELETE' }),

  updateSaleLineItemSupply: (saleId, data) =>
    api.request(`/sales/${saleId}/update_line_item_supply/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSaleSupply: (id, data) =>
    api.request(`/sales/${id}/update_supply/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ========================
  // NEW: Sale Approval Methods
  // ========================
  getPendingSales: () => api.request('/sales/pending/'),

  approveSale: (id, data) =>
    api.request(`/sales/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rejectSale: (id, rejectionReason) =>
    api.request(`/sales/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason }),
    }),

  // ========================
  // Stock Entries (Legacy)
  // ========================
  getStockEntries: (params = '') => api.request(`/stock-entries/${params}`),
  getStockEntry: (id) => api.request(`/stock-entries/${id}/`),

  // ========================
  // Stock Movements
  // ========================
  getStockMovements: (params = '') => api.request(`/stock-movements/${params}`),
  getStockMovement: (id) => api.request(`/stock-movements/${id}/`),

  // ========================
  // Monthly Opening Stock
  // ========================
  getMonthlyOpeningStock: (params = '') =>
    api.request(`/monthly-opening-stock/${params}`),
  createMonthlyOpeningStock: (data) =>
    api.request('/monthly-opening-stock/', { method: 'POST', body: JSON.stringify(data) }),
  updateMonthlyOpeningStock: (id, data) =>
    api.request(`/monthly-opening-stock/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),

  // ========================
  // Audit Logs
  // ========================
  getAuditLogs: (params = '') => api.request(`/audit-logs/${params}`),

  // ========================
  // Dashboard
  // ========================
  getDashboardSummary: () => api.request('/dashboard/summary/'),
  getMonthlySales: () => api.request('/dashboard/monthly_sales/'),
  getTopProducts: (limit = 5) => api.request(`/dashboard/top_products/?limit=${limit}`),
  getRecentSales: (days = 30) => api.request(`/dashboard/recent_sales/?days=${days}`),
  getTopCustomers: (limit = 10) => api.request(`/dashboard/top_customers/?limit=${limit}`),

  // ========================
  // Users
  // ========================
  getUsers: () => api.request('/users/'),
  getUser: (id) => api.request(`/users/${id}/`),

  // ========================
  // Reports
  // ========================
  getSalesReport: async (params = {}) => {
    try {
      const queryString = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}` : '';
      const data = await api.request(`/sales/${queryString}`);
      if (Array.isArray(data)) return data;
      if (data?.results) return data.results;
      return [];
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw error;
    }
  },

  getStockReport: async (params = {}) => {
    try {
      let endpoint = '/products/';
      if (params.low_stock) { endpoint = '/products/low_stock/'; delete params.low_stock; }
      const queryString = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}` : '';
      const data = await api.request(`${endpoint}${queryString}`);
      if (Array.isArray(data)) return data;
      if (data?.results) return data.results;
      return [];
    } catch (error) {
      console.error('Error fetching stock report:', error);
      throw error;
    }
  },

  getOutstandingSuppliesReport: async (params = {}) => {
    try {
      const queryString = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}` : '';
      try {
        const data = await api.request(`/sales/outstanding-supplies/${queryString}`);
        return Array.isArray(data) ? data : (data?.results || []);
      } catch {
        const salesData = await api.getSales(queryString);
        const allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
        return allSales.filter((sale) =>
          sale.line_items?.some((item) =>
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

  getOutstandingBalancesReport: async (params = {}) => {
    try {
      const queryString = Object.keys(params).length
        ? `?${new URLSearchParams(params).toString()}` : '';
      try {
        const data = await api.request(`/sales/outstanding-balances/${queryString}`);
        return Array.isArray(data) ? data : (data?.results || []);
      } catch {
        const salesData = await api.getSales(queryString);
        const allSales = Array.isArray(salesData) ? salesData : (salesData?.results || []);
        return allSales.filter((sale) => parseFloat(sale.outstanding_balance || 0) > 0);
      }
    } catch (error) {
      console.error('Error fetching outstanding balances report:', error);
      throw error;
    }
  },

  getOutstandingInvoices: () => api.getOutstandingBalancesReport(),
  getPendingLPOs: () => api.getOutstandingSuppliesReport(),

  // ========================
  // CSV Export
  // ========================
  exportReportToCSV: (reportType, data) => {
    if (!data || data.length === 0) { console.warn('No data to export'); return; }

    const generators = {
      sales: generateSalesCSV,
      stock: generateStockCSV,
      outstanding_supplies: generateOutstandingSuppliesCSV,
      outstanding_balances: generateOutstandingBalancesCSV,
    };
    const filenames = {
      sales: 'sales_report',
      stock: 'stock_report',
      outstanding_supplies: 'outstanding_supplies_report',
      outstanding_balances: 'outstanding_balances_report',
    };

    const generator = generators[reportType];
    if (!generator) { console.error('Unknown report type:', reportType); return; }

    const csv = generator(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenames[reportType]}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },
};

// ========================
// CSV Helper Functions
// ========================
function generateSalesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Names,Quantity Supplied,Total Amount,Amount Paid,Outstanding Balance,Mode of Payment,Status\n';
  const rows = data.map((sale) => {
    const productNames = (sale.line_items || []).map((i) => i.product_name || '').join('; ');
    const quantitySupplied = (sale.line_items || [])
      .map((i) => `${i.product_name}: ${i.quantity_supplied}/${i.quantity_ordered}`).join('; ');
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
      sale.mode_of_payment || '',
      sale.status || '',
    ].join(',');
  }).join('\n');
  return headers + rows;
}

function generateStockCSV(data) {
  const headers = 'Product Code,Product Name,Quantity,Status\n';
  const rows = data.map((product) => {
    const status = (product.current_stock || 0) <= (product.minimum_stock || 0) ? 'Low Stock' : 'In Stock';
    return [product.code || '', `"${product.name || ''}"`, product.current_stock || 0, status].join(',');
  }).join('\n');
  return headers + rows;
}

function generateOutstandingSuppliesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Product Name,Quantity Ordered,Quantity Supplied,Outstanding Supplies,Payment Status\n';
  const rows = [];
  data.forEach((sale) => {
    (sale.line_items || []).forEach((item) => {
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
          paymentStatus,
        ].join(','));
      }
    });
  });
  return headers + rows.join('\n');
}

function generateOutstandingBalancesCSV(data) {
  const headers = 'Date,Sale Number,Customer,LPO/Quote,Delivery,Products,Total Amount,Amount Paid,Outstanding Balance\n';
  const rows = data.map((sale) => {
    const products = (sale.line_items || []).map((i) => i.product_name || '').join('; ');
    return [
      new Date(sale.created_at).toLocaleDateString(),
      sale.sale_number || '',
      `"${sale.customer_name || ''}"`,
      sale.lpo_quotation_number || '-',
      sale.delivery_number || '-',
      `"${products}"`,
      sale.total_amount || 0,
      sale.amount_paid || 0,
      sale.outstanding_balance || 0,
    ].join(',');
  }).join('\n');
  return headers + rows;
}

export default api;