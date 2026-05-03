// API Endpoints configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    LOGOUT: '/auth/logout/',
    REFRESH: '/auth/refresh/',
    REGISTER: '/auth/register/',
    ME: '/auth/me/',
  },
  TENANTS: {
    BASE: '/tenants/',
    DETAIL: (id: number) => `/tenants/${id}/`,
  },
  ACCOUNTS: {
    BASE: '/accounts/',
    DETAIL: (id: number) => `/accounts/${id}/`,
  },
  STUDENTS: {
    BASE: '/education/students/',
    DETAIL: (id: number) => `/education/students/${id}/`,
  },
  COURSES: {
    BASE: '/education/courses/',
    DETAIL: (id: number) => `/education/courses/${id}/`,
  },
}

// Mock service exports for compatibility
export const tenantService = {
  getTenants: () => Promise.resolve({ data: [] }),
  getTenant: (id: number) => Promise.resolve({ data: {} }),
  createTenant: (data: any) => Promise.resolve({ data }),
  updateTenant: (id: number, data: any) => Promise.resolve({ data }),
  deleteTenant: (id: number) => Promise.resolve(),
}

export const accountService = {
  getAccounts: () => Promise.resolve({ data: [] }),
  getAccount: (id: number) => Promise.resolve({ data: {} }),
  createAccount: (data: any) => Promise.resolve({ data }),
  updateAccount: (id: number, data: any) => Promise.resolve({ data }),
  deleteAccount: (id: number) => Promise.resolve(),
}

export default API_ENDPOINTS
