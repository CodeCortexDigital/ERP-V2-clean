import api from './api';

export interface SecurityRules {
  lockout_attempts: number;
  lockout_minutes: number;
  password_min_length: number;
  idle_minutes: number;
  activity_days: number;
  sign_in_days: number;
}

export interface Paged<T> { results: T[]; page: number; pages: number; total: number }

export interface ActivityRow {
  id: string; when: string; user_id: string | null; who: string; email: string; action: string; action_label: string;
  area: string; path: string; record_id: string | null; method: string; ip: string | null;
}

export interface SignInRow {
  id: string; when: string; email: string; user_id: string | null; who: string;
  outcome: 'success' | 'failed' | 'locked' | 'disabled'; outcome_label: string; method: string; ip: string | null; device: string;
}

export interface Person {
  id: string; name: string; email: string; role: string; role_label: string; active: boolean; locked_minutes: number;
  last_sign_in: string | null; last_ip: string | null; failed_attempts: number; is_me: boolean; platform_owner: boolean;
  deletion_requested: boolean;
}

export interface Overview {
  people: number; admins: number; locked: number; disabled: number; never_signed_in: number; deletion_requests: number;
  week: { sign_ins: number; failed: number; blocked: number; changes: number; refused: number };
  rules: SecurityRules;
}

export type PersonAction = 'unlock' | 'sign_out' | 'disable' | 'enable';
type Query = Record<string, string | number | undefined>;

const clean = (q: Query) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

async function download(url: string, params: Query, filename: string) {
  const res = await api.get(url, { params: clean(params), responseType: 'blob' });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

const securityService = {
  rules: () => api.get('/security/rules/').then((r) => r.data as { idle_minutes: number; password_min_length: number }),
  overview: () => api.get('/security/overview/').then((r) => r.data as Overview),
  settings: () => api.get('/security/settings/').then((r) => r.data as { settings: SecurityRules; limits: Record<keyof SecurityRules, [number, number]> }),
  saveSettings: (patch: Partial<SecurityRules>) => api.put('/security/settings/', patch).then((r) => r.data as { settings: SecurityRules }),
  activity: (q: Query) => api.get('/security/activity/', { params: clean(q) }).then((r) => r.data as Paged<ActivityRow> & { areas: string[]; actions: Record<string, string> }),
  exportActivity: (q: Query) => download('/security/activity/', { ...q, export: 'csv' }, 'activity-log.csv'),
  signIns: (q: Query) => api.get('/security/sign-ins/', { params: clean(q) }).then((r) => r.data as Paged<SignInRow> & { outcomes: Record<string, string> }),
  exportSignIns: (q: Query) => download('/security/sign-ins/', { ...q, export: 'csv' }, 'sign-ins.csv'),
  people: (q: Query) => api.get('/security/people/', { params: clean(q) }).then((r) => r.data as Paged<Person> & { roles: { code: string; label: string; count: number }[] }),
  act: (userId: string, action: PersonAction) => api.post(`/security/people/${userId}/`, { action }).then((r) => r.data as { message: string; person: Person }),
  roles: () => api.get('/security/roles/').then((r) => r.data as { roles: { code: string; label: string; count: number }[]; areas: { area: string; access: Record<string, string> }[] }),
  me: () => api.get('/security/me/').then((r) => r.data as { sign_ins: SignInRow[]; failed_since_last: number; deletion_requested: boolean; rules: { idle_minutes: number; password_min_length: number } }),
  requestDeletion: () => api.post('/security/me/deletion-request/').then((r) => r.data as { message: string; deletion_requested: boolean }),
  withdrawDeletion: () => api.delete('/security/me/deletion-request/').then((r) => r.data as { message: string; deletion_requested: boolean }),
  signOutEverywhere: () => api.post('/security/me/sign-out-everywhere/').then((r) => r.data as { message: string }),
  downloadMyData: () => download('/security/me/data/', {}, 'my-data.json'),
};

export default securityService;
