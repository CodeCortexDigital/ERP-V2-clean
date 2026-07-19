export interface EmployeePortalPermissions {
  portalAccess: {
    canAccess: boolean;
    defaultView: 'dashboard' | 'tasks' | 'profile' | 'timesheet' | 'payroll' | 'documents';
    allowedViews: string[];
  };
  modules: {
    tasks: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      assign: boolean;
      complete: boolean;
    };
    timesheet: {
      view: boolean;
      add: boolean;
      edit: boolean;
      approve: boolean;
      export: boolean;
    };
    payroll: {
      view: boolean;
      export: boolean;
      generate: boolean;
    };
    leave: {
      view: boolean;
      apply: boolean;
      approve: boolean;
      cancel: boolean;
    };
    documents: {
      view: boolean;
      upload: boolean;
      delete: boolean;
      share: boolean;
    };
    announcements: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    profile: {
      view: boolean;
      edit: boolean;
      viewOthers: boolean;
    };
    reports: {
      view: boolean;
      export: boolean;
      generate: boolean;
    };
  };
  features: {
    messaging: boolean;
    notifications: boolean;
    calendar: boolean;
    files: boolean;
    teamwork: boolean;
  };
}

export type EmployeePortalRole = 'admin' | 'manager' | 'hr' | 'employee';

export const defaultEmployeePermissions: Record<EmployeePortalRole, EmployeePortalPermissions> = {
  admin: {
    portalAccess: {
      canAccess: true,
      defaultView: 'dashboard',
      allowedViews: ['dashboard', 'tasks', 'timesheet', 'payroll', 'documents', 'profile', 'announcements', 'reports'],
    },
    modules: {
      tasks: { view: true, create: true, edit: true, delete: true, assign: true, complete: true },
      timesheet: { view: true, add: true, edit: true, approve: true, export: true },
      payroll: { view: true, export: true, generate: true },
      leave: { view: true, apply: true, approve: true, cancel: true },
      documents: { view: true, upload: true, delete: true, share: true },
      announcements: { view: true, create: true, edit: true, delete: true },
      profile: { view: true, edit: true, viewOthers: true },
      reports: { view: true, export: true, generate: true },
    },
    features: { messaging: true, notifications: true, calendar: true, files: true, teamwork: true },
  },
  manager: {
    portalAccess: {
      canAccess: true,
      defaultView: 'tasks',
      allowedViews: ['dashboard', 'tasks', 'timesheet', 'leave', 'documents', 'profile', 'announcements', 'reports'],
    },
    modules: {
      tasks: { view: true, create: true, edit: true, delete: false, assign: true, complete: true },
      timesheet: { view: true, add: false, edit: false, approve: true, export: true },
      payroll: { view: true, export: true, generate: false },
      leave: { view: true, apply: true, approve: true, cancel: false },
      documents: { view: true, upload: true, delete: false, share: true },
      announcements: { view: true, create: false, edit: false, delete: false },
      profile: { view: true, edit: true, viewOthers: true },
      reports: { view: true, export: true, generate: false },
    },
    features: { messaging: true, notifications: true, calendar: true, files: true, teamwork: true },
  },
  hr: {
    portalAccess: {
      canAccess: true,
      defaultView: 'dashboard',
      allowedViews: ['dashboard', 'tasks', 'timesheet', 'leave', 'documents', 'profile', 'announcements', 'reports'],
    },
    modules: {
      tasks: { view: true, create: true, edit: true, delete: false, assign: true, complete: true },
      timesheet: { view: true, add: false, edit: false, approve: false, export: true },
      payroll: { view: true, export: true, generate: false },
      leave: { view: true, apply: true, approve: true, cancel: false },
      documents: { view: true, upload: true, delete: true, share: true },
      announcements: { view: true, create: true, edit: true, delete: true },
      profile: { view: true, edit: true, viewOthers: true },
      reports: { view: true, export: true, generate: false },
    },
    features: { messaging: true, notifications: true, calendar: true, files: true, teamwork: true },
  },
  employee: {
    portalAccess: {
      canAccess: true,
      defaultView: 'tasks',
      allowedViews: ['dashboard', 'tasks', 'timesheet', 'leave', 'documents', 'profile', 'announcements'],
    },
    modules: {
      tasks: { view: true, create: false, edit: false, delete: false, assign: false, complete: true },
      timesheet: { view: true, add: true, edit: true, approve: false, export: true },
      payroll: { view: true, export: true, generate: false },
      leave: { view: true, apply: true, approve: false, cancel: true },
      documents: { view: true, upload: true, delete: false, share: false },
      announcements: { view: true, create: false, edit: false, delete: false },
      profile: { view: true, edit: true, viewOthers: false },
      reports: { view: false, export: false, generate: false },
    },
    features: { messaging: true, notifications: true, calendar: true, files: true, teamwork: false },
  },
};

export type EmployeePortalModule = keyof EmployeePortalPermissions['modules'];
export type EmployeePortalFeature = keyof EmployeePortalPermissions['features'];
