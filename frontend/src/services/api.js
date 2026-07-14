import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject the auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('loan_desk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/login', { username, password });
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/me/profile', profileData);
    return response.data;
  },
  updatePassword: async (passwordData) => {
    const response = await api.put('/me/password', passwordData);
    return response.data;
  },
};

export const loanService = {
  getDemoAccounts: async () => {
    const response = await api.get('/demo-accounts');
    return response.data;
  },
  getEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },

  getApplications: async (params = {}) => {
    const response = await api.get('/applications', { params });
    return response.data;
  },

  getApplicationById: async (id) => {
    const response = await api.get(`/application/${id}`);
    return response.data;
  },

  applyLoan: async (formData) => {
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const response = await api.post('/apply-loan', formData, headers ? { headers } : undefined);
    return response.data;
  },

  submitVerification: async (id, verificationData) => {
    const response = await api.put(`/verification/${id}`, verificationData);
    return response.data;
  },

  rejectVerification: async (id, data) => {
    const response = await api.put(`/verification-reject/${id}`, data);
    return response.data;
  },

  requestDocumentsAtVerification: async (id, data) => {
    const response = await api.put(`/verification-request-docs/${id}`, data);
    return response.data;
  },

  getDocumentSignedUrl: async (storagePath, fileUrl) => {
    const response = await api.get('/document-url', {
      params: { storagePath, fileUrl },
    });
    return response.data;
  },

  submitCreditReview: async (id, creditData) => {
    const response = await api.put(`/credit-review/${id}`, creditData);
    return response.data;
  },

  submitManagerDecision: async (id, decisionData) => {
    const response = await api.put(`/manager-decision/${id}`, decisionData);
    return response.data;
  },

  forwardToLoanOfficer: async (id, data) => {
    const response = await api.put(`/forward-to-officer/${id}`, data);
    return response.data;
  },

  escalateApplication: async (id, data) => {
    const response = await api.put(`/escalate/${id}`, data);
    return response.data;
  },

  getNotifications: async (userId) => {
    const response = await api.get('/notifications', { params: { userId } });
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default api;
