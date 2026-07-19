import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

const HOME_BY_ROLE: Record<string, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  staff: '/dashboard',
  admin: '/dashboard',
  user: '/dashboard',
};

interface CanAccessProps {
  /** Permission module id, e.g. 'attendance', 'exams'. */
  module: string;
  /** Optional specific action, e.g. 'mark', 'edit'. Defaults to 'view'. */
  action?: string;
  /** When true, redirect to the role home if not allowed (for route guards). */
  redirect?: boolean;
  /** Render fallback instead of redirect / null when not allowed. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Gate UI by the role's permission matrix.
 * - `redirect` true  -> used as a route guard; sends unauthorized roles home.
 * - otherwise        -> renders nothing (or `fallback`) when not permitted.
 */
export function CanAccess({ module, action = 'view', redirect = false, fallback = null, children }: CanAccessProps) {
  const { role } = useAuth();
  const { canAccess } = usePermissions();

  if (!role) return <Navigate to="/login" replace />;

  const allowed = canAccess(module, action);
  if (allowed) return <>{children}</>;

  if (redirect) {
    return <Navigate to={HOME_BY_ROLE[role] || '/dashboard'} replace />;
  }
  return <>{fallback}</>;
}

export default CanAccess;
