import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
};

// ── Complaints ────────────────────────────────────────────────────────────────
export const complaintsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/complaints', { params }),
  get: (id: string) =>
    api.get(`/api/complaints/${id}`),
  create: (formData: FormData) =>
    api.post('/api/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id: string, formData: FormData) =>
    api.patch(`/api/complaints/${id}/status`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  rate: (id: string, rating: number, review?: string) =>
    api.post(`/api/complaints/${id}/rate`, { rating, review }),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesApi = {
  list: (complaintId: string) =>
    api.get(`/api/messages/${complaintId}`),
  send: (complaintId: string, message: string) =>
    api.post(`/api/messages/${complaintId}`, { message }),
};

// ── Officers ──────────────────────────────────────────────────────────────────
export const officersApi = {
  list: () => api.get('/api/officers'),
  get: (id: string) => api.get(`/api/officers/${id}`),
};

// ── Ministries ────────────────────────────────────────────────────────────────
export const ministriesApi = {
  list: () => api.get('/api/ministries'),
  get: (id: string) => api.get(`/api/ministries/${id}`),
};
