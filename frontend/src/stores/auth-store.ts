import { create } from 'zustand';
import { authApi, usersApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string | null;
  bio?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await usersApi.getMe();
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('accessToken');
      set({ isLoading: false });
    }
  },

  login: async (emailOrUsername: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ emailOrUsername, password });
      const { accessToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, username, password });
      const { accessToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors, logout anyway
    } finally {
      localStorage.removeItem('accessToken');
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  setUser: (user: User) => set({ user }),

  clearError: () => set({ error: null }),
}));
