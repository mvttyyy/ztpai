import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await api.post('/auth/refresh');
        const { accessToken } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { emailOrUsername: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post('/auth/refresh'),
};

// Loops API
export const loopsApi = {
  getAll: (params?: Record<string, any>) => api.get('/loops', { params }),

  getById: (id: string) => api.get(`/loops/${id}`),

  create: (data: FormData) =>
    api.post('/loops', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, data: Record<string, any>) => api.put(`/loops/${id}`, data),

  delete: (id: string) => api.delete(`/loops/${id}`),

  getByBpm: (bpm: number, excludeId?: string) =>
    api.get(`/loops/by-bpm/${bpm}`, { params: { excludeId } }),

  recordListen: (id: string) => api.post(`/loops/${id}/listen`),
};

// Trending API
export const trendingApi = {
  getTrending: (limit?: number) => api.get('/trending', { params: { limit } }),
  getRecent: (limit?: number) => api.get('/trending/recent', { params: { limit } }),
  getTopRated: (limit?: number) => api.get('/trending/top-rated', { params: { limit } }),
};

// Tags API
export const tagsApi = {
  getAll: () => api.get('/tags'),
  getPopular: (limit?: number) => api.get('/tags/popular', { params: { limit } }),
  search: (q: string) => api.get('/tags/search', { params: { q } }),
};

// Ratings API
export const ratingsApi = {
  rate: (loopId: string, value: number) =>
    api.post(`/loops/${loopId}/ratings`, { value }),
  remove: (loopId: string) => api.delete(`/loops/${loopId}/ratings`),
  getMyRating: (loopId: string) => api.get(`/loops/${loopId}/ratings/me`),
  getUserRating: (loopId: string) => api.get(`/loops/${loopId}/ratings/me`),
};

// Comments API
export const commentsApi = {
  getByLoopId: (loopId: string, params?: Record<string, any>) =>
    api.get(`/loops/${loopId}/comments`, { params }),
  getForLoop: (loopId: string, params?: Record<string, any>) =>
    api.get(`/loops/${loopId}/comments`, { params }),
  create: (loopId: string, content: string) =>
    api.post(`/loops/${loopId}/comments`, { content }),
  delete: (loopId: string, commentId: string) =>
    api.delete(`/loops/${loopId}/comments/${commentId}`),
};

// Favorites API
export const favoritesApi = {
  getAll: (params?: Record<string, any>) => api.get('/favorites', { params }),
  add: (loopId: string) => api.post(`/favorites/${loopId}`),
  remove: (loopId: string) => api.delete(`/favorites/${loopId}`),
  check: (loopId: string) => api.get(`/favorites/${loopId}/check`),
};

// Downloads API
export const downloadsApi = {
  getAll: (params?: Record<string, any>) => api.get('/downloads', { params }),
  download: (loopId: string) => api.post(`/downloads/${loopId}`),
  verifyCertificate: (hash: string) => api.get(`/downloads/certificate/${hash}`),
};

// Users API
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: Record<string, any>) => api.put('/users/me', data),
  getMyStats: () => api.get('/users/me/stats'),
  getMyLoops: (params?: Record<string, any>) => api.get('/users/me/loops', { params }),
  getById: (id: string) => api.get(`/users/id/${id}`),
  getByUsername: (username: string) => api.get(`/users/${username}`),
  getUserLoops: (username: string, params?: Record<string, any>) =>
    api.get(`/users/${username}/loops`, { params }),
  getFavorites: (userId: string, params?: Record<string, any>) =>
    api.get(`/users/id/${userId}/favorites`, { params }),
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: Record<string, any>) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Chat API
export const chatApi = {
  getRooms: () => api.get('/chat/rooms'),
  getMessages: (roomId: string, params?: Record<string, any>) =>
    api.get(`/chat/rooms/${roomId}/messages`, { params }),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, any>) => api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),
  toggleUserStatus: (id: string) => api.put(`/admin/users/${id}/toggle-status`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getLoops: (params?: Record<string, any>) => api.get('/admin/loops', { params }),
  updateLoopStatus: (id: string, status: string) =>
    api.put(`/admin/loops/${id}/status`, { status }),
  deleteLoop: (id: string) => api.delete(`/admin/loops/${id}`),
};

export default api;
