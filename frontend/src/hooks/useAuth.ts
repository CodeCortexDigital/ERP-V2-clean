import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const login = useAuthStore((s) => s.login);
  const demoLogin = useAuthStore((s) => s.demoLogin);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const logout = useAuthStore((s) => s.logout);
  const hydrate = useAuthStore((s) => s.hydrate);

  return {
    user,
    role,
    loading,
    isAuthenticated,
    accessToken,
    login,
    demoLogin,
    googleLogin,
    logout,
    hydrate,
  };
}
