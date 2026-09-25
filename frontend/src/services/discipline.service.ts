// Behaviour management: categories, the behaviour log, actions, milestones, student history and reports.
import api from './api';

const base = '/auth/behaviour';

export interface BehaviourCategory { id: string; name: string; kind: 'positive' | 'negative'; points: number; severity: string; notify_family: boolean; is_active: boolean; order: number }
export interface BehaviourActionRow { id: string; action_type: string; label: string; start_date: string | null; end_date: string | null; notes: string; completed: boolean; by: string; at: string }
export interface Incident {
  id: string; student: { id: string; full_name: string; class_name: string }; category: { id: string; name: string };
  kind: 'positive' | 'negative'; points: number; severity: string; date: string; time: string | null; location: string; description: string;
  status: 'open' | 'in_review' | 'resolved'; follow_up_date: string | null; reported_by: string; actions: BehaviourActionRow[]; created_at: string;
  visible_to_family?: boolean; family_notified_at?: string | null; editable?: boolean;
}
export interface RosterRow { id: string; full_name: string; student_number: string; points: number; merits: number; incidents: number }
export interface StudentSummary {
  student: { id: string; full_name: string; class_name: string }; points: number; positive_points: number; negative_points: number;
  merits: number; incidents: number; open_incidents: number; by_category: Array<{ name: string; count: number }>;
  awards: Array<{ name: string; points: number; at: string }>; next_milestone: { points: number; name: string } | null; history: Incident[];
}
export interface BehaviourReport {
  from: string; to: string; totals: { merits: number; incidents: number; points: number; students: number; open: number };
  by_category: Array<{ name: string; kind: string; count: number; points: number }>;
  by_class: Array<{ name: string; merits: number; incidents: number; points: number }>;
  by_weekday: Array<{ day: string; count: number }>;
  top_positive: Array<{ id: string; name: string; class_name: string; points: number; merits: number; incidents: number }>;
  most_incidents: Array<{ id: string; name: string; class_name: string; points: number; merits: number; incidents: number }>;
  follow_ups_due: Incident[]; suspended_today: Array<{ student: string; type: string; until: string | null }>;
}

export const ACTION_TYPES: Array<[string, string]> = [
  ['verbal_warning', 'Verbal warning'], ['written_warning', 'Written warning'], ['detention', 'Detention'], ['parent_meeting', 'Parent meeting'],
  ['counselling', 'Counselling'], ['loss_of_privilege', 'Loss of privilege'], ['community_service', 'Community service'],
  ['in_school_suspension', 'In-school suspension'], ['suspension', 'Suspension'], ['reward', 'Reward / certificate'],
  ['follow_up', 'Follow-up note (staff only)'], ['other', 'Other'],
];

const discipline = {
  categories: async (active = false) => (await api.get<BehaviourCategory[]>(`${base}/categories/`, { params: active ? { active: 1 } : {} })).data,
  saveCategory: async (body: Partial<BehaviourCategory>) => (body.id
    ? (await api.patch<BehaviourCategory>(`${base}/categories/${body.id}/`, body)).data
    : (await api.post<BehaviourCategory>(`${base}/categories/`, body)).data),
  removeCategory: async (id: string) => api.delete(`${base}/categories/${id}/`),
  settings: async () => (await api.get<{ milestones: Array<{ points: number; name: string }>; notify_milestones: boolean }>(`${base}/settings/`)).data,
  saveSettings: async (body: { milestones: Array<{ points: number; name: string }>; notify_milestones: boolean }) => (await api.put(`${base}/settings/`, body)).data,
  classes: async () => (await api.get<Array<{ id: string; name: string }>>(`${base}/classes/`)).data,
  roster: async (classId: string) => (await api.get<RosterRow[]>(`${base}/classes/${classId}/points/`)).data,
  incidents: async (params: Record<string, string | number> = {}) => (await api.get<Incident[]>(`${base}/incidents/`, { params })).data,
  log: async (body: Record<string, unknown>) => (await api.post<{ incidents: Incident[]; awards: string[] }>(`${base}/incidents/`, body)).data,
  incident: async (id: string) => (await api.get<Incident>(`${base}/incidents/${id}/`)).data,
  update: async (id: string, body: Record<string, unknown>) => (await api.patch<Incident>(`${base}/incidents/${id}/`, body)).data,
  remove: async (id: string) => api.delete(`${base}/incidents/${id}/`),
  addAction: async (id: string, body: Record<string, unknown>) => (await api.post<BehaviourActionRow>(`${base}/incidents/${id}/actions/`, body)).data,
  updateAction: async (id: string, body: Record<string, unknown>) => (await api.patch<BehaviourActionRow>(`${base}/actions/${id}/`, body)).data,
  summary: async (studentId: string) => (await api.get<StudentSummary>(`${base}/students/${studentId}/summary/`)).data,
  report: async (params: Record<string, string> = {}) => (await api.get<BehaviourReport>(`${base}/report/`, { params })).data,
};

export default discipline;
