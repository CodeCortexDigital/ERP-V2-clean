// Help centre and support tickets (P15): /api/v1/support/
import api from './api';

export interface Article {
  id: string; slug: string; title: string; summary: string; module: string; module_label: string; kind: 'guide' | 'faq' | 'video';
  video_url: string; updated_at: string; body?: string; roles?: string[]; order?: number; published?: boolean;
  helpful_yes?: number; helpful_no?: number;
}
export interface TicketMessage { id: string; kind: 'reply' | 'note' | 'event'; body: string; from_support: boolean; author: string; at: string }
export interface Ticket {
  id: string; number: number; subject: string; category: string; category_label: string; priority: string; priority_label: string;
  status: string; status_label: string; school: string; created_by: string; created_by_email: string; assigned_to: string;
  assigned_to_id: string | null; page: string; created_at: string; updated_at: string; reply_due_at: string | null;
  first_reply_at: string | null; overdue: boolean; messages?: TicketMessage[];
}

export const CATEGORIES = [
  ['question', 'How do I…?'], ['problem', 'Something is not working'], ['billing', 'Plan and billing'],
  ['data', 'Data, import or export'], ['feature', 'Idea or request'], ['other', 'Other'],
] as const;
export const PRIORITIES = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent: the school cannot work']] as const;
export const STATUSES = [['open', 'New'], ['waiting_support', 'Waiting for support'], ['waiting_school', 'Waiting for the school'],
  ['resolved', 'Resolved'], ['closed', 'Closed']] as const;

const support = {
  help: (q = '', module = '') => api.get('/support/help/', { params: { q, module } }).then((r) => r.data as
    { articles: Article[]; modules: { key: string; label: string }[]; can_open_tickets: boolean }),
  article: (slug: string) => api.get(`/support/help/${slug}/`).then((r) => r.data as { article: Article; related: Article[] }),
  vote: (slug: string, helpful: boolean) => api.post(`/support/help/${slug}/vote/`, { helpful }).then((r) => r.data),
  manageArticles: () => api.get('/support/help/manage/').then((r) => r.data.articles as Article[]),
  saveArticle: (a: Partial<Article>) => (a.id ? api.put(`/support/help/manage/${a.id}/`, a) : api.post('/support/help/manage/', a))
    .then((r) => r.data.article as Article),
  deleteArticle: (id: string) => api.delete(`/support/help/manage/${id}/`),
  tickets: (status = '') => api.get('/support/tickets/', { params: { status } }).then((r) => r.data as { tickets: Ticket[]; can_open_tickets: boolean }),
  openTicket: (d: { subject: string; body: string; category: string; priority: string; page?: string }) =>
    api.post('/support/tickets/', d).then((r) => r.data.ticket as Ticket),
  ticket: (id: string) => api.get(`/support/tickets/${id}/`).then((r) => r.data.ticket as Ticket),
  act: (id: string, d: Record<string, unknown>) => api.post(`/support/tickets/${id}/`, d).then((r) => r.data.ticket as Ticket),
  manage: (id: string, d: Record<string, unknown>) => api.post(`/support/tickets/${id}/manage/`, d).then((r) => r.data.ticket as Ticket),
  overview: () => api.get('/support/tickets/overview/').then((r) => r.data as {
    total: number; urgent: number; waiting: number; overdue: number; team: { id: string; name: string }[];
    canned: { id: string; title: string; body: string }[];
  }),
};
export default support;

export const when = (d?: string | null) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any) : '');
