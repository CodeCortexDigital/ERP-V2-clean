import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRoute({ children, allowedRoles }: any) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
