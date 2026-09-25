// School calendar: combined feed, events, parent-teacher meetings and the subscription link.
import api from './api';

const base = '/auth/calendar';

export interface CalendarItem {
  id: string; source: 'event' | 'term' | 'exam' | 'assignment' | 'invoice' | 'meeting'; kind: string; title: string;
  start_date: string; end_date: string; start_time?: string | null; end_time?: string | null; all_day?: boolean;
  description?: string; location?: string; audience?: string; class_ids?: string[]; grade_levels?: number[];
  closes_school?: boolean; remind_days_before?: number | null; editable?: boolean;
}
export interface MeetingSlot {
  id: string; title: string; date: string; start_time: string; end_time: string; location: string;
  host: { id: string; name: string }; booked: boolean; mine: boolean; booked_by: string | null; student: string | null; note: string;
}

const calendar = {
  feed: async (from: string, to: string) => (await api.get<CalendarItem[]>(`${base}/feed/`, { params: { from, to } })).data,
  create: async (body: Record<string, unknown>) => (await api.post<CalendarItem>(`${base}/events/`, body)).data,
  update: async (id: string, body: Record<string, unknown>) => (await api.patch<CalendarItem>(`${base}/events/${id}/`, body)).data,
  remove: async (id: string) => api.delete(`${base}/events/${id}/`),
  feedLink: async () => (await api.get<{ url: string }>(`${base}/feed-link/`)).data.url,
  meetings: async () => (await api.get<MeetingSlot[]>(`${base}/meetings/`)).data,
  offer: async (body: { date: string; from: string; to: string; minutes: number; location: string; title: string }) =>
    (await api.post<MeetingSlot[]>(`${base}/meetings/`, body)).data,
  book: async (id: string, student_id: string, note: string) => (await api.post<MeetingSlot>(`${base}/meetings/${id}/book/`, { student_id, note })).data,
  cancel: async (id: string) => (await api.post<MeetingSlot>(`${base}/meetings/${id}/cancel/`, {})).data,
  children: async () => (await api.get<Array<{ id: string; full_name: string; class_name: string }>>(`${base}/meetings/children/`)).data,
  removeSlot: async (id: string) => api.delete(`${base}/meetings/${id}/cancel/`),
};

export default calendar;
