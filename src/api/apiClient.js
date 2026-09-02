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

// Somewhere to tell the app the session died. Clearing storage on its own left
// the user staring at "unavailable (HTTP 401)" on every screen, with no way back
// except quitting or logging out by hand.
let onUnauthorized = null;

export const setUnauthorizedHandler = handler => {
  onUnauthorized = handler;
};

// One in-flight session check, shared by every 401 that arrives while it runs.
let sessionCheck = null;

/**
 * Ask the server whether this token is still good.
 *
 * /auth/check sits behind auth:sanctum and answers 200 for a live token, so it
 * is the one endpoint that can tell "the session died" apart from "that one
 * request was refused". Marked skipAuthRecovery so its own failure cannot
 * re-enter this interceptor.
 */
const sessionIsDead = () => {
  if (!sessionCheck) {
    sessionCheck = apiClient
      .get('/auth/check', {skipAuthRecovery: true})
      .then(() => false)
      // Only an explicit 401 means the token is finished. A timeout or a 500
      // must not sign anyone out — that is what made the app ask for a login
      // every time it came back from the background.
      .catch(error => error.response?.status === 401)
      .finally(() => {
        sessionCheck = null;
      });
  }

  return sessionCheck;
};

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;

    if (status !== 401 || error.config?.skipAuthRecovery) {
      return Promise.reject(error);
    }

    // Capture the promise before the .finally above clears the shared slot.
    const check = sessionIsDead();

    if (await check) {
      // Remove only the auth keys. storage.clear() wiped everything the app had
      // cached, which is far more than signing out needs to do.
      await storage.remove(StorageKeys.TOKEN);
      await storage.remove(StorageKeys.USER);
      await storage.remove(StorageKeys.PERMISSIONS);

      if (onUnauthorized) {
        onUnauthorized();
      }
    }

    return Promise.reject(error);
  },
);

// API Functions
export const authAPI = {
  // skipAuthRecovery: a 401 from these two means bad credentials or a session
  // already being ended — neither is a reason to run the session probe.
  login: (email, password) =>
    apiClient.post('/auth', {email, password}, {skipAuthRecovery: true}),

  logout: () => apiClient.post('/logout', {}, {skipAuthRecovery: true}),

  getProfile: () => apiClient.get('/profile'),

  updateProfile: data => apiClient.put('/profile', data),
  getPermissions: () => apiClient.get('/user-permissions'),
};

export const invoiceAPI = {
  getAll: (page = 1) => apiClient.get(`/invoices?page=${page}`),

  // Was pointed at a route that doesn't exist (/invoices/{id}); the real
  // header+items detail endpoint is /get_invoice_data/{id}.
  getById: id => apiClient.get(`/get_invoice_data/${id}`),

  create: data => apiClient.post('/save_inv', data),

  // Full update used by the edit-invoice form: replaces header, financials,
  // and the entire item list. Backend requires cus_id/cus_name/inv_date/items.
  updateFull: (id, data) => apiClient.put(`/invoices_update/${id}`, data),

  // Records a payment against the invoice. Replaces the old update() call,
  // which PUT to /invoices/{id} - a route that never existed - and so always
  // failed. `amount` is the amount received, as the web's payment form sends.
  markAsPaid: (id, amount) =>
    apiClient.post(`/invoice_payment_update/${id}`, {
      payment_update: String(amount),
    }),

  // Was pointed at a route that doesn't exist (/invoices/{id}); the real
  // delete endpoint is /invoice_delete/{id}.
  delete: id => apiClient.delete(`/invoice_delete/${id}`),

  getDashboard: () => apiClient.get('/dashboard'),

  getMaxInvoiceNo: () => apiClient.get('/max_inv_no'),
  getShareablePdfUrl: id => apiClient.get(`/generate_share_invoice/${id}`),

  // Sends the invoice PDF to the customer through the WhatsApp CRM, from the
  // business number — not a whatsapp:// link on the agent's own phone.
  sendViaWhatsAppCrm: id =>
    apiClient.post(`/invoices/${id}/send-whatsapp`, {}, {
      // Rendering the PDF and uploading it to Meta both take time.
      timeout: 120000,
    }),
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
  toggleProductStatus: id => apiClient.post(`/products/${id}/toggle-status`),
};

export const inventoryAPI = {
  saveInventory: data => apiClient.post('/save_inventory', data),
  getAll: (page = 1) => apiClient.get(`/inventories?page=${page}`),
  getById: id => apiClient.get(`/inventories/${id}`),

  // The other three inventory modules the web CRM has.
  getAvailable: (page = 1, searchKey = '', inventoryStatus = '', productSource = '') =>
    apiClient.get('/inventory/available', {
      params: {page, searchKey, inventoryStatus, productSource},
    }),

  getHistory: (page = 1, searchKey = '') =>
    apiClient.get('/inventory/history', {params: {page, searchKey}}),

  getBarcodes: (page = 1, params = {}) =>
    apiClient.get('/inventory/barcodes', {params: {page, ...params}}),

  // Stock movements. Both need the update_inventory permission and write the
  // same history row the web CRM does.
  stockIn: (productVariantId, quantity) =>
    apiClient.post('/inventory/stock-in', {
      product_variant_id: productVariantId,
      quantity,
    }),

  stockOut: (productVariantId, quantity, reason) =>
    apiClient.post('/inventory/stock-out', {
      product_variant_id: productVariantId,
      quantity,
      reason,
    }),
};

export const revAPI = {
  // Every revenue endpoint now takes the same searchKey the RC tab used, so all
  // six tabs offer the 30d / 3m / 6m / 1y / 5y periods.
  getdailysales: (filter = '30d') =>
    apiClient.get(`/daily-revenue?searchKey=${filter}`),
  getRCRevenue: filter => apiClient.get(`/monthly-revenue?searchKey=${filter}`),
  getDtfRevenue: (filter = '30d') =>
    apiClient.get(`/daily-revenue-dtf?searchKey=${filter}`),
  getNotClosedInvoices: filter =>
    apiClient.get(`/monthly-notclose-inv?searchKey=${filter}`),
  getDegsignRevenue: (filter = '30d') =>
    apiClient.get(`/daily-revenue-design?searchKey=${filter}`),
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

export const taskAPI = {
  // Task Types
  getTaskTypes: searchKey =>
    apiClient.get('/task-types', { params: { searchKey } }),
  createTaskType: data => apiClient.post('/task-types', data),
  updateTaskType: (id, data) => apiClient.put(`/task-types/${id}`, data),
  deleteTaskType: id => apiClient.delete(`/task-types/${id}`),

  // Job Cards
  getJobCards: (filter = 'ongoing', searchKey, deliveryDate) =>
    apiClient.get('/job-cards', { params: { filter, searchKey, deliveryDate } }),
  createJobCard: data => apiClient.post('/job-cards', data),
  getJobCard: id => apiClient.get(`/job-cards/${id}`),
  updateJobCard: (id, data) => apiClient.put(`/job-cards/${id}`, data),
  deleteJobCard: id => apiClient.delete(`/job-cards/${id}`),
  reassignTask: data => apiClient.post('/job-cards/task/reassign', data),
  resetTaskSchedule: taskId =>
    apiClient.post('/job-cards/task/reset-schedule', { task_id: taskId }),

  // My Tasks
  getMyTasks: (bucket = 'ongoing') =>
    apiClient.get('/my-tasks', { params: { bucket } }),
  updateMyTask: (id, data) => apiClient.put(`/my-tasks/${id}`, data),
  requestScheduleChange: (id, reason) =>
    apiClient.post(`/my-tasks/${id}/request-schedule-change`, {
      schedule_change_reason: reason,
    }),

  // Shared lookups
  getTaskUsers: () => apiClient.get('/task-users'),
};

export const customerAPI = {
  // Get all customers
  getAll: () => apiClient.get('/cusname'),

  // Search customers
  search: query => apiClient.get(`/cusname?search=${query}`),

  // Add a customer without leaving the invoice screen, the way the web CRM's
  // Add Customer dialog does.
  create: data => apiClient.post('/customers', data),
};

// WhatsApp CRM — mirrors the web inbox, sharing the same backend service.
export const whatsappAPI = {
  // `job` narrows the list to customers holding a job card of that status,
  // optionally within a delivery date range — the web CRM's top filter bar.
  getChats: (page = 1, search = '', view = '', label = '', job = {}) =>
    apiClient.get('/whatsapp/chats', {
      params: {
        page,
        search,
        view,
        label,
        job_status: job.status || '',
        job_from: job.from || '',
        job_to: job.to || '',
      },
    }),

  getLabels: (customerId = '') =>
    apiClient.get('/whatsapp/labels', { params: { customer_id: customerId } }),

  // Create when there is no id, rename or recolour when there is.
  saveLabel: ({ id, name, color }) =>
    apiClient.post('/whatsapp/labels', { id, name, color }),

  deleteLabel: id => apiClient.delete(`/whatsapp/labels/${id}`),

  toggleLabel: (customerId, labelId, value) =>
    apiClient.post(`/whatsapp/chats/${customerId}/label`, {
      label_id: labelId,
      value,
    }),

  // action: archive | mute | pin | favorite | mark_unread | block | clear | delete
  chatAction: (customerId, action, value = true) =>
    apiClient.post(`/whatsapp/chats/${customerId}/action`, { action, value }),

  // Omit sinceId for the full thread; pass it to poll for new messages only.
  getMessages: (customerId, sinceId = 0) =>
    apiClient.get(`/whatsapp/chats/${customerId}/messages`, {
      params: sinceId ? { since_id: sinceId } : {},
    }),

  sendText: (customerId, message, replyToId = null) =>
    apiClient.post('/whatsapp/send', {
      customer_id: customerId,
      message,
      reply_to_id: replyToId,
    }),

  sendMedia: formData =>
    apiClient.post('/whatsapp/send-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Media can be far slower than the 10s default, especially on mobile data.
      timeout: 120000,
    }),

  getUnread: () => apiClient.get('/whatsapp/unread'),

  // Start a chat with a number that isn't saved yet.
  startChat: (phone, customerName = '') =>
    apiClient.post('/whatsapp/customers', {
      phone,
      customer_name: customerName,
    }),

  getTemplates: () => apiClient.get('/whatsapp/templates'),

  // mode: 'share' (needs latitude/longitude) or 'request'
  sendLocation: payload => apiClient.post('/whatsapp/send-location', payload),

  // Reads a pasted Google Maps link into a pin. Short links have to be followed
  // to find out where they point, which only the server can do.
  resolveLocation: url =>
    apiClient.post('/whatsapp/resolve-location', { url }),

  // Pins saved for reuse — the shop, a pickup point. Shared with the web CRM,
  // so a place saved at a desk shows up on the phone and the other way round.
  getSavedLocations: () => apiClient.get('/whatsapp/saved-locations'),

  saveLocation: payload =>
    apiClient.post('/whatsapp/saved-locations', payload),

  deleteSavedLocation: id =>
    apiClient.delete(`/whatsapp/saved-locations/${id}`),

  // Per-message pin and star. Omit `value` to flip whatever the message is now.
  pinMessage: (messageId, value) =>
    apiClient.post(`/whatsapp/messages/${messageId}/pin`, { value }),

  starMessage: (messageId, value) =>
    apiClient.post(`/whatsapp/messages/${messageId}/star`, { value }),

  getPinned: customerId =>
    apiClient.get(`/whatsapp/chats/${customerId}/pinned`),

  // Pass an empty emoji to clear an existing reaction.
  react: (messageId, emoji) =>
    apiClient.post(`/whatsapp/messages/${messageId}/react`, { emoji }),

  // scope: 'me' removes it from the thread, 'everyone' leaves a tombstone.
  deleteMessage: (messageId, scope) =>
    apiClient.delete(`/whatsapp/messages/${messageId}`, { params: { scope } }),

  // Send an outbound message again, to the same chat. The server writes a new
  // row, so the failed attempt stays in the thread above it.
  resend: messageId =>
    apiClient.post(`/whatsapp/messages/${messageId}/resend`),

  forward: (messageId, customerIds) =>
    apiClient.post('/whatsapp/forward', {
      message_id: messageId,
      customer_ids: customerIds,
    }),

  searchMessages: (customerId, q) =>
    apiClient.get(`/whatsapp/chats/${customerId}/search`, { params: { q } }),

  getChatMedia: customerId =>
    apiClient.get(`/whatsapp/chats/${customerId}/media`),

  // Sends the whole connected commerce catalog as one browsable message.
  searchProducts: (q = '') =>
    apiClient.get('/whatsapp/product-search', { params: { q } }),

  // One picture message per product, plus the agent's own line first if they
  // wrote one. Answers with a `messages` array, not a single message.
  sendProducts: (customerId, productIds, body = '') =>
    apiClient.post('/whatsapp/send-products', {
      customer_id: customerId,
      product_ids: productIds,
      body,
    }),

  // Saved replies: the agent's own canned messages, shared with the web CRM.
  getSavedReplies: () => apiClient.get('/whatsapp/saved-replies'),

  // FormData so photos picked on the phone can ride along; pass an `id` field
  // to update an existing reply.
  saveSavedReply: formData =>
    apiClient.post('/whatsapp/saved-replies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),

  deleteSavedReply: replyId =>
    apiClient.delete(`/whatsapp/saved-replies/${replyId}`),

  sendSavedReply: (customerId, replyId) =>
    apiClient.post(
      '/whatsapp/send-saved-reply',
      { customer_id: customerId, reply_id: replyId },
      // Several photos go out one after another server-side.
      { timeout: 180000 },
    ),

  sendTemplate: (customerId, templateId, variables = []) =>
    apiClient.post('/whatsapp/send-template', {
      customer_id: customerId,
      template_id: templateId,
      variables,
    }),
};

export default apiClient;
