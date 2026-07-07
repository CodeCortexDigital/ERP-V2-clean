import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/api';
import authService from '@/services/auth.service';

export type UserRole = 'admin' | 'staff' | 'teacher' | 'parent' | 'student' | 'user';

export interface StudentSummary {
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
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_demo?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  role?: UserRole | null;
  portal_path?: string;
  student?: StudentSummary | null;
  profile_picture?: string | null;
}

function resolveRole(user: AuthUser | null): UserRole | null {
  if (!user) return null;
  if (user.role) return user.role;
  if (user.student) return 'student';
  if (user.is_superuser) return 'admin';
  if (user.is_staff) return 'staff';
  return 'user';
}

function applyAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  login: (userId: string, password: string) => Promise<AuthUser>;
  demoLogin: (name?: string) => Promise<AuthUser>;
  googleLogin: (token: string) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      role: null,
      loading: true,
      isAuthenticated: false,

      setUser: (user) => {
        set({
          user,
          role: resolveRole(user),
          isAuthenticated: Boolean(user && get().accessToken),
        });
      },

      hydrate: async () => {
        const token = get().accessToken ?? localStorage.getItem('access_token');
        if (!token) {
          set({ loading: false, isAuthenticated: false });
          return;
        }

        if (token === 'mock-access-token') {
          set({
            loading: false,
            isAuthenticated: true,
          });
          return;
        }

        applyAuthHeader(token);
        try {
          const response = await authService.getCurrentUser();
          const user = response.data as AuthUser;
          set({
            user,
            role: resolveRole(user),
            loading: false,
            isAuthenticated: true,
          });
        } catch {
          get().logout();
          set({ loading: false });
        }
      },

      login: async (userId, password) => {
        const response = await authService.login(userId, password);
        const { access, refresh, user } = response.data;
        const authUser = user as AuthUser;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        applyAuthHeader(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          user: authUser,
          role: resolveRole(authUser),
          isAuthenticated: true,
          loading: false,
        });
        return authUser;
      },

      demoLogin: async (name) => {
        const response = await authService.demoLogin(name);
        const { access, refresh, user } = response.data;
        const authUser = user as AuthUser;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        applyAuthHeader(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          user: authUser,
          role: resolveRole(authUser),
          isAuthenticated: true,
          loading: false,
        });
        if (response.data.demo_warning && response.data.demo_message) {
          console.warn(response.data.demo_message);
        }
        return authUser;
      },

      googleLogin: async (token) => {
        const response = await authService.googleLogin(token);
        const { access, refresh, user } = response.data;
        const authUser = user as AuthUser;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        applyAuthHeader(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          user: authUser,
          role: resolveRole(authUser),
          isAuthenticated: true,
          loading: false,
        });
        return authUser;
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        applyAuthHeader(null);
        import('@/store/notificationStore').then(({ useNotificationStore }) => {
          useNotificationStore.getState().reset();
        });
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          role: null,
          isAuthenticated: false,
          loading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem('access_token', state.accessToken);
          applyAuthHeader(state.accessToken);
        }
      },
    }
  )
);
