import axios from 'axios';
import { storage, StorageKeys } from '../utils/storage';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

// Change this to your Laravel API URL
const BASE_URL = 'https://redchilli.lk/api';

// Base host used to build absolute URLs for uploaded media (e.g. expense images)
export const MEDIA_BASE_URL = 'https://redchilli.lk';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  async config => {
    const token = await storage.get(StorageKeys.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear storage and redirect to login
      storage.clear();
    }
    return Promise.reject(error);
  },
);

// API Functions
export const authAPI = {
  login: (email, password) => apiClient.post('/auth', { email, password }),

  logout: () => apiClient.post('/logout'),

  getProfile: () => apiClient.get('/profile'),

  updateProfile: data => apiClient.put('/profile', data),
  getPermissions: () => apiClient.get('/user-permissions'),
};

export const invoiceAPI = {
  getAll: (page = 1) => apiClient.get(`/invoices?page=${page}`),

  getById: id => apiClient.get(`/invoices/${id}`),

  create: data => apiClient.post('/save_inv', data),

  update: (id, data) => apiClient.put(`/invoices/${id}`, data),

  delete: id => apiClient.delete(`/invoices/${id}`),

  getDashboard: () => apiClient.get('/dashboard'),

  getMaxInvoiceNo: () => apiClient.get('/max_inv_no'),
  getShareablePdfUrl: id => apiClient.get(`/generate_share_invoice/${id}`),
};

export const productAPI = {
  getAll: () => apiClient.get('/products'),
  getByBarcode: barcode => apiClient.get(`/products/barcode/${barcode}`),
  getMaxProductNo: () => apiClient.get('/max_prod_no'),
  getTypes: () => apiClient.get('/types'),
  getVenders: () => apiClient.get('/venders'),
  getBrands: () => apiClient.get('/brands'),
  getColors: () => apiClient.get('/colors'),
  getSizeCharts: () => apiClient.get('/size-charts'),
  getSeasons: () => apiClient.get('/seasons'),
  getCategoriesByLevel1: () => apiClient.get('/categories/level1'),
  getCategoriesByLevel2: level1Id =>
    apiClient.get(`/categories/level2?level1_id=${level1Id}`),
  getCategoriesByLevel3: level2Id =>
    apiClient.get(`/categories/level3?level2_id=${level2Id}`),
  getCategoriesByLevel4: level2Id =>
    apiClient.get(`/categories/level4?level2_id=${level2Id}`),
  getFilters: parentId => apiClient.get(`/filters?parent_id=${parentId}`),
  getAllproducts: (page = 1) => apiClient.get(`/all_products?page=${page}`),
  getProduct: id => apiClient.get(`/products/${id}`),
  createProduct: data => apiClient.post('/products', data),
  updateProduct: (id, data) => apiClient.post(`/products/${id}`, data),
};

export const inventoryAPI = {
  saveInventory: data => apiClient.post('/save_inventory', data),
  getAll: (page = 1) => apiClient.get(`/inventories?page=${page}`),
  getById: id => apiClient.get(`/inventories/${id}`),
};

export const revAPI = {
  getdailysales: () => apiClient.get('/daily-revenue'),
  getRCRevenue: filter => apiClient.get(`/monthly-revenue?searchKey=${filter}`),
  getDtfRevenue: () => apiClient.get(`/daily-revenue-dtf`),
  getNotClosedInvoices: filter =>
    apiClient.get(`/monthly-notclose-inv?searchKey=${filter}`),
  getDegsignRevenue: () => apiClient.get(`/daily-revenue-design`),
  getHeatpressRevenue: filter =>
    apiClient.get(`/Heatpress-revenue?searchKey=${filter}`),
};

export const costAPI = {
  // Dropdown data for the expense/budget forms (cost types, codes, descriptions)
  getMeta: () => apiClient.get('/cost/meta'),

  // Expenses
  getExpenses: () => apiClient.get('/expenses'),
  createExpense: formData =>
    apiClient.post('/expenses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateExpense: (id, formData) =>
    apiClient.post(`/expenses/${id}?_method=PUT`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Budgets
  getBudgets: () => apiClient.get('/budgets'),
  createBudget: data => apiClient.post('/budgets', data),
  updateBudget: (id, data) => apiClient.put(`/budgets/${id}`, data),

  // Budget timelines
  addTimeline: data => apiClient.post('/budget-timelines', data),
  updateTimeline: (id, data) => apiClient.put(`/budget-timelines/${id}`, data),

  // Cost setup: types
  getCostTypes: () => apiClient.get('/cost-types'),
  createCostType: data => apiClient.post('/cost-types', data),
  updateCostType: (id, data) => apiClient.put(`/cost-types/${id}`, data),

  // Cost setup: groups (codes)
  getCostCodes: () => apiClient.get('/cost-codes'),
  createCostCode: data => apiClient.post('/cost-codes', data),
  updateCostCode: (id, data) => apiClient.put(`/cost-codes/${id}`, data),

  // Cost setup: descriptions
  getCostDescriptions: () => apiClient.get('/cost-descriptions'),
  createCostDescription: data => apiClient.post('/cost-descriptions', data),
  updateCostDescription: (id, data) =>
    apiClient.put(`/cost-descriptions/${id}`, data),
};

export const customerAPI = {
  // Get all customers
  getAll: () => apiClient.get('/cusname'),

  // Search customers
  search: query => apiClient.get(`/cusname?search=${query}`),
};

export default apiClient;
