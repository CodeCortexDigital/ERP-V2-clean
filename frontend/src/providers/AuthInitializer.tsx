import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

/** Bootstraps auth session once at app root */
export function AuthInitializer({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return <>{children}</>;
}
