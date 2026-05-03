/**
 * Application Constants
 * Contains roles, permissions, and other app-wide constants
 */

// User Roles
export const UserRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  SALES: 'sales',
  PURCHASE: 'purchase',
  HR: 'hr',
  TEACHER: 'teacher',
  STUDENT: 'student',
  WAREHOUSE: 'warehouse',
  VIEWER: 'viewer',
} as const;

// Role Labels
export const RoleLabels: Record<string, string> = {
  [UserRoles.SUPER_ADMIN]: 'Super Admin',
  [UserRoles.ADMIN]: 'Administrator',
  [UserRoles.MANAGER]: 'Manager',
  [UserRoles.ACCOUNTANT]: 'Accountant',
  [UserRoles.SALES]: 'Sales',
  [UserRoles.PURCHASE]: 'Purchase',
  [UserRoles.HR]: 'HR',
  [UserRoles.TEACHER]: 'Teacher',
  [UserRoles.STUDENT]: 'Student',
  [UserRoles.WAREHOUSE]: 'Warehouse',
  [UserRoles.VIEWER]: 'Viewer',
};

// Permission Types
export const Permissions = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  
  // Accounts
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_CREATE: 'accounts.create',
  ACCOUNTS_EDIT: 'accounts.edit',
  ACCOUNTS_DELETE: 'accounts.delete',
  
  // Tenants
  TENANTS_VIEW: 'tenants.view',
  TENANTS_CREATE: 'tenants.create',
  TENANTS_EDIT: 'tenants.edit',
  TENANTS_DELETE: 'tenants.delete',
  
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',
  
  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_CREATE: 'finance.create',
  FINANCE_EDIT: 'finance.edit',
  FINANCE_DELETE: 'finance.delete',
  FINANCE_REPORTS: 'finance.reports',
  
  // HR
  HR_VIEW: 'hr.view',
  HR_CREATE: 'hr.create',
  HR_EDIT: 'hr.edit',
  HR_DELETE: 'hr.delete',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EDIT: 'reports.edit',
  REPORTS_DELETE: 'reports.delete',
  REPORTS_EXPORT: 'reports.export',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_CREATE: 'analytics.create',
  ANALYTICS_EDIT: 'analytics.edit',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  
  // Education
  EDUCATION_VIEW: 'education.view',
  EDUCATION_CREATE: 'education.create',
  EDUCATION_EDIT: 'education.edit',
  EDUCATION_DELETE: 'education.delete',
  
  // CRM
  CRM_VIEW: 'crm.view',
  CRM_CREATE: 'crm.create',
  CRM_EDIT: 'crm.edit',
  CRM_DELETE: 'crm.delete',
  
  // AI
  AI_VIEW: 'ai.view',
  AI_USE: 'ai.use',
  
  // SCM
  SCM_VIEW: 'scm.view',
  SCM_CREATE: 'scm.create',
  SCM_EDIT: 'scm.edit',
  SCM_DELETE: 'scm.delete',
  
  // Business
  BUSINESS_VIEW: 'business.view',
  BUSINESS_CREATE: 'business.create',
  BUSINESS_EDIT: 'business.edit',
  BUSINESS_DELETE: 'business.delete',
} as const;

// Role to Permissions mapping
export const RolePermissions: Record<string, string[]> = {
  [UserRoles.SUPER_ADMIN]: Object.values(Permissions),
  [UserRoles.ADMIN]: Object.values(Permissions),
  [UserRoles.MANAGER]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.DASHBOARD_ANALYTICS,
    Permissions.ACCOUNTS_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_CREATE,
    Permissions.INVENTORY_EDIT,
    Permissions.FINANCE_VIEW,
    Permissions.FINANCE_REPORTS,
    Permissions.HR_VIEW,
    Permissions.REPORTS_VIEW,
    Permissions.REPORTS_CREATE,
    Permissions.REPORTS_EXPORT,
    Permissions.ANALYTICS_VIEW,
    Permissions.SETTINGS_VIEW,
  ],
  [UserRoles.ACCOUNTANT]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.FINANCE_VIEW,
    Permissions.FINANCE_CREATE,
    Permissions.FINANCE_EDIT,
    Permissions.FINANCE_REPORTS,
    Permissions.REPORTS_VIEW,
    Permissions.REPORTS_EXPORT,
  ],
  [UserRoles.SALES]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.ACCOUNTS_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.CRM_VIEW,
    Permissions.CRM_CREATE,
    Permissions.CRM_EDIT,
  ],
  [UserRoles.PURCHASE]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_CREATE,
    Permissions.INVENTORY_EDIT,
  ],
  [UserRoles.HR]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.HR_VIEW,
    Permissions.HR_CREATE,
    Permissions.HR_EDIT,
  ],
  [UserRoles.TEACHER]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.EDUCATION_VIEW,
    Permissions.EDUCATION_CREATE,
    Permissions.EDUCATION_EDIT,
  ],
  [UserRoles.STUDENT]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.EDUCATION_VIEW,
  ],
  [UserRoles.WAREHOUSE]: [
    Permissions.DASHBOARD_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_CREATE,
    Permissions.INVENTORY_EDIT,
    Permissions.SCM_VIEW,
  ],
  [UserRoles.VIEWER]: [
    Permissions.DASHBOARD_VIEW,
  ],
};

// Check if role has permission
export const hasPermission = (role: string, permission: string): boolean => {
  const permissions = RolePermissions[role];
  return permissions?.includes(permission) ?? false;
};

// Module Types
export const ModuleTypes = {
  DASHBOARD: 'dashboard',
  ACCOUNTS: 'accounts',
  TENANTS: 'tenants',
  INVENTORY: 'inventory',
  FINANCE: 'finance',
  HR: 'hr',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  EDUCATION: 'education',
  CRM: 'crm',
  COMMERCE: 'commerce',
  AI: 'ai',
  SCM: 'scm',
  BUSINESS: 'business',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings',
} as const;

// Module Labels
export const ModuleLabels: Record<string, string> = {
  [ModuleTypes.DASHBOARD]: 'Dashboard',
  [ModuleTypes.ACCOUNTS]: 'Accounts',
  [ModuleTypes.TENANTS]: 'Tenants',
  [ModuleTypes.INVENTORY]: 'Inventory',
  [ModuleTypes.FINANCE]: 'Finance',
  [ModuleTypes.HR]: 'HR',
  [ModuleTypes.REPORTS]: 'Reports',
  [ModuleTypes.ANALYTICS]: 'Analytics',
  [ModuleTypes.EDUCATION]: 'Education',
  [ModuleTypes.CRM]: 'CRM',
  [ModuleTypes.COMMERCE]: 'Commerce',
  [ModuleTypes.AI]: 'AI',
  [ModuleTypes.SCM]: 'SCM',
  [ModuleTypes.BUSINESS]: 'Business',
  [ModuleTypes.DOCUMENTS]: 'Documents',
  [ModuleTypes.SETTINGS]: 'Settings',
};

// API Endpoints
export const APIEndpoints = {
  AUTH: '/api/auth',
  ACCOUNTS: '/api/accounts',
  TENANTS: '/api/tenants',
  INVENTORY: '/api/inventory',
  FINANCE: '/api/finance',
  HR: '/api/hr',
  REPORTS: '/api/reports',
  ANALYTICS: '/api/analytics',
  EDUCATION: '/api/education',
  CRM: '/api/crm',
  COMMERCE: '/api/commerce',
  AI: '/api/ai',
  SCM: '/api/scm',
  BUSINESS: '/api/business',
  DOCUMENTS: '/api/documents',
  SETTINGS: '/api/settings',
} as const;

// Pagination defaults
export const PaginationDefaults = {
  PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Date formats
export const DateFormats = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  API: 'YYYY-MM-DD',
  API_WITH_TIME: 'YYYY-MM-DDTHH:mm:ssZ',
} as const;

// Currency symbols
export const CurrencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
} as const;

// Default timeout values
export const Timeouts = {
  API_REQUEST: 30000,
  FILE_UPLOAD: 120000,
  WEBSOCKET_PING: 30000,
  SESSION_TIMEOUT: 3600000, // 1 hour
} as const;

// File upload limits
export const FileUploadLimits = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Status colors
export const StatusColors: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  pending: 'yellow',
  completed: 'blue',
  cancelled: 'red',
  draft: 'orange',
} as const;

// Export all constants
export default {
  UserRoles,
  RoleLabels,
  Permissions,
  RolePermissions,
  hasPermission,
  ModuleTypes,
  ModuleLabels,
  APIEndpoints,
  PaginationDefaults,
  DateFormats,
  CurrencySymbols,
  Timeouts,
  FileUploadLimits,
  StatusColors,
};