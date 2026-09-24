import api from './api';
import type { AuthUser } from '@/store/authStore';

export interface SignupPayload {
  school_name: string;
  city?: string;
  phone?: string;
  admin_name?: string;
  email?: string;
  password?: string;
  /** Firebase ID token when signing up with Google (name/email come from Google). */
  id_token?: string;
}

export interface SessionPayload {
  access: string;
  refresh: string;
  user: AuthUser;
  tenant?: { id: string; name: string; tenant_code: string };
}

export interface SetupStep {
  key: string;
  label: string;
  done: boolean;
  link: string;
}

export interface PlatformSchool {
  id: string;
  name: string;
  code: string;
  school_id: string;
  city: string;
  is_active: boolean;
  created_at: string;
  students: number;
  staff: number;
  admins: string[];
  signup: string;
}

export const schoolService = {
  signupConfig: async () => (await api.get<{ google_sign_in: boolean }>('/tenants/signup/config/')).data,

  signup: async (payload: SignupPayload) => (await api.post<SessionPayload>('/tenants/signup/', payload)).data,

  onboarding: async () =>
    (await api.get<{ school: { name: string; code: string } | null; steps: SetupStep[]; complete: boolean }>(
      '/tenants/onboarding/',
    )).data,

  platformSchools: async () =>
    (await api.get<{ schools: PlatformSchool[]; totals: Record<string, number> }>('/tenants/platform/schools/')).data,

  setSchoolActive: async (id: string, isActive: boolean) =>
    (await api.post(`/tenants/platform/schools/${id}/status/`, { is_active: isActive })).data,
};

export default schoolService;
