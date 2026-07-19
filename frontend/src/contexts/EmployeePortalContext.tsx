import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { defaultEmployeePermissions, EmployeePortalPermissions, EmployeePortalRole } from '@/types/permissions';
import { useAuth } from '@/hooks/useAuth';

interface EmployeePortalContextType {
  permissions: EmployeePortalPermissions;
  currentView: string;
  setCurrentView: (view: string) => void;
  canAccessModule: (module: string, action: string) => boolean;
  getVisibleModules: () => string[];
  getAllowedViews: () => string[];
  hasFeature: (feature: string) => boolean;
  isManager: boolean;
  isHR: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

const EmployeePortalContext = createContext<EmployeePortalContextType | undefined>(undefined);

/** Map the global auth role onto the employee-portal role triad. */
function resolvePortalRole(globalRole?: string | null): EmployeePortalRole {
  switch (globalRole) {
    case 'admin':
    case 'superuser':
      return 'admin';
    case 'staff':
    case 'manager':
      return 'manager';
    case 'hr':
    case 'human-resources':
      return 'hr';
    case 'employee':
      return 'employee';
    default:
      return 'employee';
  }
}

export const EmployeePortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<EmployeePortalPermissions>(defaultEmployeePermissions.employee);
  const [currentView, setCurrentView] = useState('dashboard');

  const portalRole = resolvePortalRole(role ?? user?.role);
  const isAdmin = portalRole === 'admin';
  const isManager = portalRole === 'manager' || isAdmin;
  const isHR = portalRole === 'hr' || isManager;

  // A user is "also a teacher" when an employee/teacher record exists in
  // localStorage (populated on employee login) or their role implies teaching.
  const isTeacher = (() => {
    try {
      const saved = localStorage.getItem('current_employee_data');
      if (saved) {
        const data = JSON.parse(saved) as { role?: string; is_teacher?: boolean };
        if (data.is_teacher) return true;
        const r = (data.role || '').toLowerCase();
        if (r.includes('teacher') || r.includes('principal') || r.includes('head') || r.includes('director')) {
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    const globalRole = ((role ?? user?.role) || '').toLowerCase();
    return globalRole.includes('teacher');
  })();

  useEffect(() => {
    const rolePermissions =
      defaultEmployeePermissions[portalRole] || defaultEmployeePermissions.employee;
    setPermissions(rolePermissions);
    setCurrentView(rolePermissions.portalAccess.defaultView);
  }, [portalRole]);

  const canAccessModule = (module: string, action: string): boolean => {
    const modulePerms = permissions.modules[module as keyof typeof permissions.modules];
    if (!modulePerms) return false;
    return Boolean((modulePerms as Record<string, unknown>)[action]);
  };

  const getVisibleModules = (): string[] => {
    return Object.keys(permissions.modules).filter(
      (module) => permissions.modules[module as keyof typeof permissions.modules]?.view
    );
  };

  const getAllowedViews = (): string[] => {
    return permissions.portalAccess.allowedViews;
  };

  const hasFeature = (feature: string): boolean => {
    return Boolean((permissions.features as Record<string, unknown>)[feature]);
  };

  const value = useMemo<EmployeePortalContextType>(
    () => ({
       permissions,
      currentView,
      setCurrentView,
      canAccessModule,
      getVisibleModules,
      getAllowedViews,
      hasFeature,
      isManager,
      isHR,
      isAdmin,
      isTeacher,
    }),
    [permissions, currentView, isManager, isHR, isAdmin, isTeacher]
  );

  return <EmployeePortalContext.Provider value={value}>{children}</EmployeePortalContext.Provider>;
};

export const useEmployeePortal = () => {
  const context = useContext(EmployeePortalContext);
  if (!context) {
    throw new Error('useEmployeePortal must be used within an EmployeePortalProvider');
  }
  return context;
};
