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
  /** ISO currency code, e.g. PKR, EUR, GBP. */
  currency?: string;
  /** Interface language code, e.g. en, ar, fr. */
  language?: string;
  timezone?: string;
}

export interface SignupConfig {
  google_sign_in: boolean;
  currencies: { code: string; symbol: string; name: string; decimals: number }[];
  languages: { code: string; name: string; native_name: string; direction: 'ltr' | 'rtl' }[];
  defaults: { currency: string; language: string; timezone: string };
  regions?: { code: 'pk' | 'intl' | 'uk' | 'us'; label: string; currency: string | null; timezone: string | null;
    date_format: string; week_start: number; terms: Record<string, string> }[];
  date_formats?: string[];
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
  signupConfig: async () => (await api.get<SignupConfig>('/tenants/signup/config/')).data,

  /** Change the school's currency / default language (school admin). */
  updateLocale: async (patch: { currency?: string; language?: string; timezone?: string; region?: string; apply_defaults?: boolean;
    date_format?: string; week_start?: number }) =>
    (await api.put('/tenants/locale/', patch)).data,

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
