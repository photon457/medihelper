import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medihelper_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('medihelper_token');
      localStorage.removeItem('medihelper_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ============= AUTH =============
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ============= USER =============
export const userAPI = {
  dashboard: () => api.get('/user/dashboard'),
  getReminders: () => api.get('/user/reminders'),
  createReminder: (data) => api.post('/user/reminders', data),
  updateReminder: (id, data) => api.put(`/user/reminders/${id}`, data),
  deleteReminder: (id) => api.delete(`/user/reminders/${id}`),
  takeDose: (id, time_slot) => api.post(`/user/reminders/${id}/take`, { time_slot }),
  getMedicines: () => api.get('/user/medicines'),
  addMedicine: (data) => api.post('/user/medicines', data),
  deleteMedicine: (id) => api.delete(`/user/medicines/${id}`),
  getOrders: () => api.get('/user/orders'),
  placeOrder: (data) => api.post('/user/orders', data),
  cancelOrder: (id) => api.post(`/user/orders/${id}/cancel`),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/profile/password', data),
  shop: () => api.get('/user/shop'),
  setupStatus: () => api.get('/user/setup-status'),
  submitSetup: (data) => api.post('/user/setup', data),
  deleteAccount: () => api.delete('/user/account'),
};

// ============= PHARMACY =============
export const pharmacyAPI = {
  dashboard: () => api.get('/pharmacy/dashboard'),
  getInventory: () => api.get('/pharmacy/inventory'),
  addProduct: (data) => api.post('/pharmacy/inventory', data),
  updateProduct: (id, data) => api.put(`/pharmacy/inventory/${id}`, data),
  deleteProduct: (id) => api.delete(`/pharmacy/inventory/${id}`),
  getOrders: () => api.get('/pharmacy/orders'),
  updateOrderStatus: (id, status) => api.put(`/pharmacy/orders/${id}/status`, { status }),
  analytics: () => api.get('/pharmacy/analytics'),
};

// ============= DELIVERY =============
export const deliveryAPI = {
  dashboard: () => api.get('/delivery/dashboard'),
  getActive: () => api.get('/delivery/active'),
  updateStatus: (id, status, earnings) => api.put(`/delivery/${id}/status`, { status, earnings }),
  getHistory: () => api.get('/delivery/history'),
};

export default api;
