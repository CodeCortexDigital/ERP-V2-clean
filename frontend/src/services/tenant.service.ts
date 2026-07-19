import api from './api';

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  tenant_code?: string;
  settings_json?: {
    institute_name?: string;
    tagline?: string;
    [key: string]: unknown;
  };
}

export const tenantService = {
  /** GET /tenants/current/ */
  current: async (): Promise<TenantInfo | null> => {
    try {
      const res = await api.get('/tenants/current/');
      return (res.data as { tenant?: TenantInfo })?.tenant ?? null;
    } catch {
      return null;
    }
  },
};

export default tenantService;
