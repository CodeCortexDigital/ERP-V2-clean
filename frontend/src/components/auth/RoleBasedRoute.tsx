import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const HOME_BY_ROLE: Record<string, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
};

export function RoleBasedRoute({ children, allowedRoles }: any) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={HOME_BY_ROLE[role] || '/dashboard'} replace />;
  }
  return <>{children}</>;
}
