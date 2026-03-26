import axios from 'axios';


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
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

// ── Auth ──
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
};

// ── Complaints ──
export const complaintsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/complaints', { params }),
  get: (id: string) =>
    api.get(`/complaints/${id}`),
  create: (formData: FormData) =>
    api.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id: string, formData: FormData) =>
    api.patch(`/complaints/${id}/status`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  rate: (id: string, rating: number, review?: string) =>
    api.post(`/complaints/${id}/rate`, { rating, review }),
};

// ── Messages ──
export const messagesApi = {
  list: (complaintId: string) =>
    api.get(`/messages/${complaintId}`),
  send: (complaintId: string, message: string) =>
    api.post(`/messages/${complaintId}`, { message }),
};

// ── Officers ──
export const officersApi = {
  list: () => api.get('/officers'),

  getById: (id: string) => api.get(`/officers/${id}`),

  topPerformers: () => api.get('/officers/top-performers'),
};

// ── Ministries (Public List) ──
export const ministriesApi = {
  list: () => api.get('/ministries'),

  create: (data: {
    name: string;
    jurisdiction: string;
    categories: string[];
    contact: string;
    escalation_level: number;
  }) => api.post('/ministries', data),
};
// ── Ministry Dashboard & Management (Internal) ──
export const ministryApi = {
  getComplaints: (ministryId: string, params?: Record<string, string>) =>
    api.get(`/ministries/${ministryId}/complaints`, { params }),

  assignOfficer: (ministryId: string, complaintId: string, officerId: string) =>
    api.patch(`/ministries/${ministryId}/complaints/${complaintId}/assign`, { officerId }),
  
  createOfficer: (data: { name: string; email: string; designation: string; phone?: string; ministry_id: string }) =>
    api.post('/officers', data),

  getOfficers: (ministryId: string) =>
    api.get(`/ministries/${ministryId}/officers`),
  deleteOfficer: (id: string) => 
    api.delete(`/officers/${id}`)
};