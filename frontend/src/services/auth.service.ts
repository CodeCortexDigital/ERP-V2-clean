// frontend/src/services/auth.service.ts
import api from './api';

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    is_demo?: boolean;
    demo_remaining_days?: number;
    role?: string;
    portal_path?: string;
    student?: {
      id: string;
      student_id: string;
      full_name: string;
      email: string;
      profile_picture?: string | null;
      current_class?: string | null;
      current_class_name?: string | null;
      current_section?: string | null;
      current_section_name?: string | null;
      is_active?: boolean;
    } | null;
  };
  is_demo?: boolean;
  demo_warning?: boolean;
  demo_message?: string;
}

const authService = {
  // ✅ Login is at /auth/login/ under the v1 API prefix
  login: async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login/', { 
      email: email, 
      password: password 
    });
    if (response.data) {
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
    }
    return response;
  },

  // ✅ Firebase login
  googleLogin: async (token: string) => {
    const response = await api.post<LoginResponse>('/auth/firebase/login/', { id_token: token });
    if (response.data) {
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
    }
    return response;
  },

  // ✅ Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me/');
    return response;
  },

  // ✅ Logout
  logout: async () => {
    const response = await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh_token') || undefined });
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return response;
  },

  // ✅ Reset password (admin forgot password flow)
  resetPassword: async (data: { identifier: string; new_password: string; reset_key?: string; current_password?: string }) => {
    const response = await api.post('/auth/reset-password/', data);
    return response;
  },

  // ✅ Refresh token
  refreshToken: async (refresh: string) => {
    const response = await api.post<{ access: string }>('/auth/token/refresh/', { refresh });
    if (response.data && response.data.access) {
      localStorage.setItem('access_token', response.data.access);
    }
    return response;
  },

  // ✅ Helpers
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  },

  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export default authService;