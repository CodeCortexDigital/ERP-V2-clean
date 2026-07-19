import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { defaultEmployeePermissions, EmployeePortalPermissions, EmployeePortalRole } from '@/types/permissions';

function resolvePortalRole(globalRole?: string | null): EmployeePortalRole {
  switch (globalRole) {
    case 'admin':
    case 'superuser':
      return 'admin';
    case 'staff':
    case 'manager':
    case 'hr':
      return 'manager';
    case 'employee':
      return 'employee';
    default:
      return 'employee';
  }
}

export const usePortalPermissions = () => {
  const { user, role } = useAuth();
  const { rolePermissions } = usePermissions();

  const getEmployeePortalPermissions = (): EmployeePortalPermissions => {
    const portalRole = resolvePortalRole(role ?? user?.role);
    const globalPerms = rolePermissions[portalRole as keyof typeof rolePermissions] || {};
    const portalPerms = defaultEmployeePermissions[portalRole] || defaultEmployeePermissions.employee;
    return {
      ...portalPerms,
      modules: { ...portalPerms.modules, ...(globalPerms.modules || {}) },
    } as EmployeePortalPermissions;
  };

  const hasPortalAccess = (): boolean => {
    return getEmployeePortalPermissions().portalAccess?.canAccess || false;
  };

  const getDefaultView = (): string => {
    return getEmployeePortalPermissions().portalAccess?.defaultView || 'dashboard';
  };

  return {
    getEmployeePortalPermissions,
    hasPortalAccess,
    getDefaultView,
  };
};

export default usePortalPermissions;
