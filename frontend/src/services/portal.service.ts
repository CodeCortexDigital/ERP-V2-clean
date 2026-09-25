// Student / family portal: overview, assignments, progress and documents for one student.
import api from './api';
import type { CalendarItem } from './calendar.service';

const base = '/auth/portal';

export interface PortalStudent { id: string; full_name: string; student_id: string; class_name: string; section_name: string; photo: string; admission_date: string | null }
export interface AttendanceSummary { total: number; present: number; late: number; absent: number; excused: number; early_dismissal: number; rate: number | null }
export interface WorkItem {
  id: string; source: 'gradebook' | 'homework'; title: string; description: string; subject: string; category: string;
  due_date: string | null; assigned_date: string | null;
  status: 'graded' | 'submitted' | 'overdue' | 'due_today' | 'upcoming' | 'missing' | 'excused' | 'incomplete';
  points: number | null; points_possible: number | null; comment: string; late: boolean; has_attachment: boolean; teacher?: string;
}
export interface PortalDocument {
  id: string; title: string; category: string; category_label: string; name: string; size: number; content_type: string;
  visible_to_family: boolean; from_family: boolean; uploaded_by: string; uploaded_at: string; can_delete: boolean;
}
export interface Overview {
  student: PortalStudent; today: string;
  alerts: Array<{ level: 'info' | 'warning' | 'danger'; area: string; text: string }>;
  attendance: AttendanceSummary & { period: string; this_month: AttendanceSummary; today: string | null; recent_absences: Array<{ date: string; status: string; reason: string }> };
  grades: { term: { id: string; name: string } | null; average: number | null; missing: number; subjects: Array<{ subject: string; percent: number | null; letter: string; missing: number }> };
  assignments: { due_soon: WorkItem[]; due_count: number; overdue: WorkItem[]; overdue_count: number; recently_marked: WorkItem[] };
  fees: { balance: number; open_invoices: number; overdue_invoices: number; overdue_amount: number;
    next_due: { invoice_number: string; amount: number; due_date: string } | null; last_payment: { amount: number; date: string } | null };
  messages: { unread: number; announcements: number };
  upcoming: CalendarItem[];
  behaviour: { points: number; merits: number; incidents: number; open_incidents: number };
  documents: { count: number; latest: PortalDocument[] };
}
export interface Progress {
  student: PortalStudent; trend: number | null;
  terms: Array<{ id: string; name: string; year: string; start_date: string; end_date: string; current: boolean; average: number | null;
    subjects: number; attendance_rate: number | null; absences: number; late: number; merits: number; incidents: number; report_card: boolean }>;
  subjects: Array<{ subject: string; terms: Record<string, number | null> }>;
  months: Array<{ month: string; label: string; rate: number | null; days: number }>;
}
export interface DocumentList {
  student: PortalStudent; can_manage: boolean; categories: Array<{ value: string; label: string }>; documents: PortalDocument[];
  report_cards: Array<{ term_id: string; term: string; year: string }>; certificates: Array<{ id: string; template: string; issue_date: string }>;
}

const portal = {
  children: async () => (await api.get<PortalStudent[]>(`${base}/children/`)).data,
  overview: async (id: string) => (await api.get<Overview>(`${base}/${id}/overview/`)).data,
  assignments: async (id: string) =>
    (await api.get<{ student: PortalStudent; items: WorkItem[]; counts: Record<string, number>; subjects: string[] }>(`${base}/${id}/assignments/`)).data,
  homeworkAttachment: async (id: string, homeworkId: string) =>
    (await api.get<{ name: string; data: string }>(`${base}/${id}/homework/${homeworkId}/attachment/`)).data,
  progress: async (id: string) => (await api.get<Progress>(`${base}/${id}/progress/`)).data,
  documents: async (id: string) => (await api.get<DocumentList>(`${base}/${id}/documents/`)).data,
  upload: async (id: string, body: { file: File; title: string; category: string; visible_to_family?: boolean }) => {
    const fd = new FormData();
    fd.append('file', body.file);
    fd.append('title', body.title);
    fd.append('category', body.category);
    if (body.visible_to_family !== undefined) fd.append('visible_to_family', String(body.visible_to_family));
    return (await api.post<PortalDocument>(`${base}/${id}/documents/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  updateDocument: async (docId: string, body: Partial<Pick<PortalDocument, 'title' | 'category' | 'visible_to_family'>>) =>
    (await api.patch<PortalDocument>(`${base}/documents/${docId}/`, body)).data,
  removeDocument: async (docId: string) => api.delete(`${base}/documents/${docId}/`),
  /** Download a document through the API (the request carries the sign-in token) and save it. */
  download: async (doc: Pick<PortalDocument, 'id' | 'name' | 'title'>) => {
    const r = await api.get(`${base}/documents/${doc.id}/`, { responseType: 'blob' });
    saveBlob(r.data as Blob, doc.name || doc.title);
  },
};

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default portal;
