// usePermissions.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface RolePermissions {
  admin: Record<string, Record<string, boolean>>;
  teacher: Record<string, Record<string, boolean>>;
  student: Record<string, Record<string, boolean>>;
  parent: Record<string, Record<string, boolean>>;
  staff: Record<string, Record<string, boolean>>;
  user: Record<string, Record<string, boolean>>;
}

// Default role-permission matrix matching current sidebar structure
export const defaultRolePermissions: RolePermissions = {
  admin: {
    // Main modules
    dashboard: { view: true, edit: true, delete: true },
    'academic-setup': { view: true, edit: true, delete: true },
    students: { view: true, add: true, edit: true, delete: true, export: true },
    employees: { view: true, add: true, edit: true, delete: true, export: true },
    accounts: { view: true, add: true, edit: true, delete: true, export: true },
    fees: { view: true, add: true, edit: true, delete: true, export: true, collect: true },
    salary: { view: true, generate: true, pay: true, export: true },
    attendance: { view: true, mark: true, report: true, bulk: true },
    timetable: { view: true, edit: true, print: true, generate: true },
    behaviour: { view: true, add: true, edit: true, delete: true, report: true },
    communication: { view: true, send: true, broadcast: true, templates: true },
    exams: { view: true, register: true, enter: true, results: true, grading: true },
    reports: { view: true, generate: true, export: true },
    certificates: { view: true, generate: true, templates: true },
    store: { view: true, purchase: true, manage: true },
    settings: { view: true, edit: true },
    'login': { view: true },
    'forgot-password': { view: true },
  },
  teacher: {
    // Main modules
    dashboard: { view: true, edit: false, delete: false },
    'teacher-dashboard': { view: true },
    'academic-setup': { view: false, edit: false, delete: false },
    students: { view: true, add: false, edit: false, delete: false, export: false },
    employees: { view: true, add: false, edit: false, delete: false, export: false },
    accounts: { view: false, add: false, edit: false, delete: false, export: false },
    fees: { view: false, add: false, edit: false, delete: false, export: false, collect: false },
    salary: { view: false, generate: false, pay: false, export: false },
    attendance: { view: true, mark: true, report: true, bulk: true },
    timetable: { view: true, edit: false, print: true, generate: false },
    behaviour: { view: true, add: true, edit: false, delete: false, report: true },
    communication: { view: true, send: true, broadcast: false, templates: true },
    exams: { view: true, register: false, enter: true, results: true, grading: true },
    reports: { view: true, generate: false, export: false },
    certificates: { view: false, generate: false, templates: false },
    store: { view: false, purchase: false, manage: false },
    settings: { view: false, edit: false },
    'login': { view: true },
    'forgot-password': { view: true },
  },
  student: {
    // Main modules
    dashboard: { view: true, edit: false, delete: false },
    'academic-setup': { view: false, edit: false, delete: false },
    students: { view: false, add: false, edit: true, delete: false, export: false },
    employees: { view: false, add: false, edit: false, delete: false, export: false },
    accounts: { view: true, add: false, edit: false, delete: false, export: true },
    fees: { view: true, add: false, edit: false, delete: false, export: false, collect: true },
    salary: { view: false, generate: false, pay: false, export: false },
    attendance: { view: true, mark: false, report: true, bulk: false },
    timetable: { view: true, edit: false, print: true, generate: false },
    behaviour: { view: true, add: true, edit: false, delete: false, report: true },
    communication: { view: true, send: true, broadcast: false, templates: true },
    exams: { view: true, register: false, enter: false, results: true, grading: false },
    reports: { view: true, generate: false, export: true },
    certificates: { view: true, generate: true, templates: false },
    store: { view: true, purchase: true, manage: false },
    profile: { view: true },
    homework: { view: true },
    notifications: { view: true },
    'login': { view: true },
    'forgot-password': { view: true },
  },
  parent: {
    // Main modules
    dashboard: { view: true, edit: false, delete: false },
    'academic-setup': { view: false, edit: false, delete: false },
    students: { view: false, add: false, edit: false, delete: false, export: false },
    employees: { view: false, add: false, edit: false, delete: false, export: false },
    accounts: { view: false, add: false, edit: false, delete: false, export: false },
    fees: { view: true, add: false, edit: false, delete: false, export: true, collect: false },
    salary: { view: false, generate: false, pay: false, export: false },
    attendance: { view: true, mark: false, report: true, bulk: false },
    timetable: { view: true, edit: false, print: true, generate: false },
    behaviour: { view: true, add: true, edit: false, delete: false, report: true },
    communication: { view: true, send: true, broadcast: true, templates: true },
    exams: { view: true, register: false, enter: false, results: true, grading: false },
    reports: { view: true, generate: false, export: true },
    certificates: { view: false, generate: false, templates: false },
    store: { view: true, purchase: true, manage: false },
    settings: { view: false, edit: false },
    'login': { view: true },
    'forgot-password': { view: true },
  },
  staff: {
    // Main modules
    dashboard: { view: true, edit: true, delete: false },
    'academic-setup': { view: true, edit: false, delete: false },
    students: { view: true, add: true, edit: false, delete: false, export: false },
    employees: { view: true, add: false, edit: false, delete: false, export: false },
    accounts: { view: true, add: true, edit: true, delete: false, export: true },
    fees: { view: true, add: true, edit: true, delete: false, export: true, collect: true },
    salary: { view: false, generate: false, pay: false, export: false },
    attendance: { view: true, mark: true, report: true, bulk: true },
    timetable: { view: true, edit: false, print: true, generate: false },
    behaviour: { view: true, add: true, edit: true, delete: false, report: true },
    communication: { view: true, send: true, broadcast: true, templates: true },
    exams: { view: true, register: false, enter: true, results: true, grading: true },
    reports: { view: true, generate: true, export: true },
    certificates: { view: false, generate: false, templates: false },
    store: { view: true, purchase: true, manage: false },
    settings: { view: false, edit: false },
    'login': { view: true },
    'forgot-password': { view: true },
  },
  user: {
    // Main modules
    dashboard: { view: false, edit: false, delete: false },
    'academic-setup': { view: false, edit: false, delete: false },
    students: { view: false, add: false, edit: false, delete: false, export: false },
    employees: { view: false, add: false, edit: false, delete: false, export: false },
    accounts: { view: false, add: false, edit: false, delete: false, export: false },
    fees: { view: false, add: false, edit: false, delete: false, export: false, collect: false },
    salary: { view: false, generate: false, pay: false, export: false },
    attendance: { view: false, mark: false, report: false, bulk: false },
    timetable: { view: false, edit: false, print: false, generate: false },
    behaviour: { view: false, add: false, edit: false, delete: false, report: false },
    communication: { view: false, send: false, broadcast: false, templates: false },
    exams: { view: false, register: false, enter: false, results: false, grading: false },
    reports: { view: false, generate: false, export: false },
    certificates: { view: false, generate: false, templates: false },
    store: { view: false, purchase: false, manage: false },
    settings: { view: false, edit: false },
    'login': { view: true },
    'forgot-password': { view: true },
  },
};

const ROLE_PERMISSIONS_KEY = 'erp_role_permissions';

export function usePermissions() {
  const { role } = useAuth();
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>(() => {
    const stored = localStorage.getItem(ROLE_PERMISSIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RolePermissions;
        return parsed;
      } catch (e) {
        console.error('Failed to parse role permissions from localStorage', e);
      }
    }
    return defaultRolePermissions;
  });

  const canView = useCallback((module: string): boolean => {
    const rolePermissionsForRole = rolePermissions[role] || rolePermissions.user;
    const modulePermissions = rolePermissionsForRole[module];
    return !!modulePermissions?.view;
  }, [rolePermissions, role]);

  const canAccess = useCallback((module: string, action: string): boolean => {
    const rolePermissionsForRole = rolePermissions[role] || rolePermissions.user;
    const modulePermissions = rolePermissionsForRole[module];
    return !!modulePermissions?.[action];
  }, [rolePermissions, role]);

  const savePermissions = useCallback((updatedPermissions: Partial<RolePermissions>) => {
    const newPermissions = { ...rolePermissions, ...updatedPermissions };
    setRolePermissions(newPermissions);
    localStorage.setItem(ROLE_PERMISSIONS_KEY, JSON.stringify(newPermissions));
  }, [rolePermissions]);

  const resetToDefaults = useCallback(() => {
    setRolePermissions(defaultRolePermissions);
    localStorage.setItem(ROLE_PERMISSIONS_KEY, JSON.stringify(defaultRolePermissions));
  }, []);

  const getRoleForModule = useCallback((module: string): string[] => {
    const rolesWithAccess: string[] = [];
    (Object.keys(rolePermissions) as Array<keyof RolePermissions>).forEach(roleName => {
      const rolePerms = rolePermissions[roleName];
      if (rolePerms && rolePerms[module]?.view) {
        rolesWithAccess.push(roleName);
      }
    });
    return rolesWithAccess;
  }, [rolePermissions]);

  return {
    rolePermissions,
    setRolePermissions,
    canView,
    canAccess,
    savePermissions,
    resetToDefaults,
    getRoleForModule,
  };
}

/** Convenience: returns a predicate bound to the current role's permissions. */
export function useCanAccess() {
  const { canAccess, canView } = usePermissions();
  return {
    canAccess,
    canView,
    /** True when role can view but NOT perform `action` (use to hide edit/add). */
    viewOnly: (module: string, action = 'edit') => canView(module) && !canAccess(module, action),
  };
}
