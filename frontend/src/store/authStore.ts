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
  googleLogin: (token: string) => Promise<AuthUser>;
  /** Finish a school single sign-on (Microsoft) with the one-time code the server sent back. */
  ssoLogin: (code: string) => Promise<AuthUser>;
  /** Sign in from a server payload that already holds tokens (school signup). */
  startSession: (data: { access: string; refresh: string; user: AuthUser }) => AuthUser;
  /** Second step of signing in (P8): the challenge from TwoStepNeeded plus a code from the app or a recovery code. */
  completeTwoStep: (challenge: string, code: string) => Promise<AuthUser>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

/** Thrown by the sign-in calls when the account uses two-step sign-in: ask for a code, then completeTwoStep (P8). */
export class TwoStepNeeded extends Error {
  constructor(public challenge: string, public email: string) {
    super('two-step sign-in');
  }
}

function sessionOrChallenge(data: any, start: (d: { access: string; refresh: string; user: AuthUser }) => AuthUser): AuthUser {
  if (data?.two_factor_required) throw new TwoStepNeeded(data.challenge, data.email || '');
  return start(data as { access: string; refresh: string; user: AuthUser });
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
        return sessionOrChallenge(response.data, get().startSession);
      },

      googleLogin: async (token) => {
        const response = await authService.googleLogin(token);
        return sessionOrChallenge(response.data, get().startSession);
      },

      ssoLogin: async (code) => {
        const response = await api.post('/auth/integrations/sso/exchange/', { code });
        return sessionOrChallenge(response.data, get().startSession);
      },

      completeTwoStep: async (challenge, code) => {
        const response = await api.post('/auth/login/2fa/', { challenge, code });
        return get().startSession(response.data as { access: string; refresh: string; user: AuthUser });
      },

      startSession: ({ access, refresh, user }) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        applyAuthHeader(access);
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          role: resolveRole(user),
          isAuthenticated: true,
          loading: false,
        });
        return user;
      },

      logout: () => {
        const refresh = localStorage.getItem('refresh_token') || get().refreshToken;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        applyAuthHeader(null);
        // End the session on the server too, so the refresh token can't be reused (tokens are cleared first,
        // so this request carries no stale access token).
        if (refresh) {
          import('@/services/api').then(({ default: api }) =>
            api.post('/auth/logout/', { refresh }, { skipGlobalToast: true } as any).catch(() => undefined));
        }
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
