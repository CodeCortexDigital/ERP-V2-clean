// School integrations: Microsoft sign-in, Google Classroom, the school's own email, and what is set up elsewhere.
import api from './api';

const base = '/auth/integrations';

export interface IntegrationRow {
  provider: 'microsoft' | 'google_classroom' | 'email'; label: string; enabled: boolean; ready: boolean;
  config: Record<string, any>; secrets_set: Record<string, boolean>; connected_at: string | null; last_used_at: string | null;
  last_error: string; redirect_uri?: string; connected?: boolean; uses_server_app?: boolean;
}
export interface Hub {
  integrations: IntegrationRow[];
  elsewhere: {
    google_sign_in: { enabled: boolean; note: string }; sms: { enabled: boolean; where: string };
    payments: { gateways: Array<{ provider: string; label: string; active: boolean }>; where: string };
    calendar: { enabled: boolean; where: string; note: string }; server_email: { enabled: boolean };
  };
  school: { name: string; code: string };
}
export interface Course { id: string; name: string; section: string; room: string; link: string; class: { id: string; name: string } | null; last_report: CompareReport | null }
export interface CompareReport {
  course: string; class: string; in_both: string[]; only_in_classroom: Array<{ name: string; email: string; note: string }>;
  only_in_class: Array<{ name: string; email: string; note: string }>; teachers: string[]; checked_at: string;
}

const integrations = {
  hub: async () => (await api.get<Hub>(`${base}/`)).data,
  save: async (provider: string, body: Record<string, unknown>) => (await api.patch<IntegrationRow>(`${base}/${provider.replace('_', '-')}/`, body)).data,
  disconnect: async (provider: string) => (await api.delete<IntegrationRow>(`${base}/${provider.replace('_', '-')}/`)).data,
  testEmail: async (to: string) => (await api.post<{ sent_to: string }>(`${base}/email/test/`, { to })).data,
  classroomConnect: async () => (await api.post<{ url: string }>(`${base}/google-classroom/connect/`, { origin: window.location.origin })).data.url,
  courses: async () => (await api.get<Course[]>(`${base}/google-classroom/courses/`)).data,
  link: async (courseId: string, class_id: string, course_name: string) =>
    (await api.post(`${base}/google-classroom/courses/${courseId}/link/`, { class_id, course_name })).data,
  compare: async (courseId: string) => (await api.post<CompareReport>(`${base}/google-classroom/courses/${courseId}/compare/`, {})).data,
};

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
export default integrations;
