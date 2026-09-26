// Two-way messages, announcements, SMS and communication history.
import api from './api';

const base = '/auth/communication';

export interface Contact { id: string; name: string; email: string; role: string; about: string[] }
export interface ConversationSummary {
  id: string; subject: string; student: { id: string; full_name: string } | null;
  participants: Array<{ id: string; name: string; role: string }>;
  last_message: { body: string; at: string; sender: string } | null; last_message_at: string; unread: number;
}
export interface ChatMessage { id: string; body: string; at: string; sender: { id: string; name: string }; attachment: { name: string; url: string } | null }
export interface Announcement {
  id: string; title: string; body: string; audience: string; audience_label: string; class_ids: string[]; grade_levels: number[];
  is_pinned: boolean; scheduled_for: string | null; sent_at: string | null; created_at: string; author: string; read?: boolean;
  recipient_count?: number; email_count?: number; sms_count?: number; read_count?: number;
}

const messaging = {
  contacts: async () => (await api.get<Contact[]>(`${base}/contacts/`)).data,
  conversations: async (student = '') => (await api.get<ConversationSummary[]>(`${base}/conversations/`, { params: student ? { student } : {} })).data,
  start: async (body: { participants: string[]; subject: string; body: string; student?: string }) =>
    (await api.post<ConversationSummary>(`${base}/conversations/`, body)).data,
  thread: async (id: string) => (await api.get<ConversationSummary & { messages: ChatMessage[] }>(`${base}/conversations/${id}/`)).data,
  reply: async (id: string, body: string, file?: File | null) => {
    if (file) {
      const fd = new FormData();
      fd.append('body', body);
      fd.append('attachment', file);
      return (await api.post<ChatMessage>(`${base}/conversations/${id}/messages/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    }
    return (await api.post<ChatMessage>(`${base}/conversations/${id}/messages/`, { body })).data;
  },
  unread: async () => (await api.get<{ messages: number; announcements: number }>(`${base}/unread/`)).data,
  announcements: async () => (await api.get<Announcement[]>(`${base}/announcements/`)).data,
  announce: async (body: Record<string, unknown>) => (await api.post<Announcement>(`${base}/announcements/`, body)).data,
  markRead: async (id: string) => api.post(`${base}/announcements/${id}/`, {}),
  removeAnnouncement: async (id: string) => api.delete(`${base}/announcements/${id}/`),
  smsSettings: async () => (await api.get(`${base}/sms/settings/`)).data as {
    account_sid: string; from_number: string; whatsapp_from: string; default_country_code: string; is_active: boolean; has_auth_token: boolean; ready: boolean },
  saveSms: async (body: Record<string, unknown>) => (await api.put(`${base}/sms/settings/`, body)).data,
  sendSms: async (to: string[], message: string) => (await api.post(`${base}/sms/send/`, { to, message })).data as {
    sent: number; results: Array<{ to: string; sent: boolean; error: string }> },
  // Automatic SMS and WhatsApp (P16)
  textRules: async () => (await api.get(`${base}/texts/rules/`)).data as TextRulesData,
  saveTextRules: async (rules: TextRule[]) => (await api.put(`${base}/texts/rules/`, { rules })).data as TextRulesData,
  textLog: async (q: Record<string, string>) => (await api.get(`${base}/texts/log/`, { params: q })).data as
    { messages: TextLogRow[]; week: { total: number; delivered: number; failed: number } },
  retryTexts: async (body: { ids?: string[]; batch?: string }) => (await api.post(`${base}/texts/retry/`, body)).data as { message: string },
  testText: async (body: { event: string; to: string; channel: string }) => (await api.post(`${base}/texts/test/`, body)).data as { message: string; body: string },
  emergency: async (body: Record<string, unknown>) => (await api.post(`${base}/texts/emergency/`, body)).data as
    { message: string; batch: string; texts: { sent?: number; failed?: number } },
  history: async (studentId: string) => (await api.get<Array<{ kind: string; at: string; title: string; detail: string; id?: string }>>(`${base}/history/${studentId}/`)).data,
};

export default messaging;

export interface TextRule { event: string; label?: string; sms: boolean; whatsapp: boolean; template: string; is_active: boolean; placeholders?: string[] }
export interface TextRulesData { rules: TextRule[]; ready: { sms: boolean; whatsapp: boolean }; delivery_reports: boolean }
export interface TextLogRow {
  id: string; channel: 'sms' | 'whatsapp'; to: string; event: string; event_label: string; student: string; body: string;
  status: string; error: string; batch: string; at: string; delivered_at: string | null;
}
