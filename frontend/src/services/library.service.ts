// School library: catalogue, copies, members, circulation desk, reservations, fines, labels and reports.
import api from './api';

const base = '/auth/library';

export interface Book {
  id: string; title: string; subtitle: string; authors: string; isbn: string; publisher: string; year: number | null;
  edition: string; subject: string; language: string; reading_level: string; call_number: string; description: string;
  cover_url: string; copies: number; available: number; on_loan: number; waiting: number;
  copy_list?: CopyRow[]; queue?: Reservation[]; times_borrowed?: number; next_due_back?: string | null;
}
export interface CopyRow {
  id: string; barcode: string; status: string; status_label: string; condition: string; location: string; notes: string;
  price: number | null; borrower: string | null; due_date: string | null; overdue: boolean;
}
export interface MemberBrief {
  id: string | null; ref_id?: string; kind: 'student' | 'staff'; name: string; card_number: string | null; detail: string;
  student_id?: string; student_number?: string; is_blocked: boolean; blocked_reason?: string; loans_out: number; overdue: number; fines_due: number;
}
export interface Loan {
  id: string; book_id: string; title: string; authors: string; barcode: string;
  member: { id: string; name: string; kind: string; card_number: string };
  issued_at: string; due_date: string; returned_at: string | null; renewals: number; overdue: boolean; days_overdue: number;
  fine_amount: number; fine_status: 'none' | 'due' | 'paid' | 'waived'; notes: string;
}
export interface Reservation {
  id: string; book_id: string; title: string; authors: string; member: { id: string; name: string }; status: string;
  status_label: string; position: number | null; hold_until: string | null; barcode: string | null; created_at: string;
}
export interface MemberDetail extends MemberBrief { current: Loan[]; history: Loan[]; reservations: Reservation[]; notes: string }
export interface LibraryRules {
  loan_days_student: number; loan_days_staff: number; max_loans_student: number; max_loans_staff: number;
  max_renewals: number; hold_days: number; fine_per_day: number; block_when_overdue: boolean;
}
export interface LibraryReport {
  titles: number; copies: number; by_status: Record<string, number>; on_loan: number; overdue: number; loans_90_days: number;
  active_readers: number; members: number; waiting_reservations: number; fines_due: number; fines_paid: number;
  top_books: Array<{ id: string; title: string; loans: number }>; top_readers: Array<{ id: string; name: string; kind: string; loans: number }>;
  by_subject: Array<{ subject: string; loans: number }>; months: Array<{ month: string; label: string; loans: number }>;
}
export interface Label { code: string; title: string; detail: string; qr: string }

const library = {
  settings: async () => (await api.get<LibraryRules>(`${base}/settings/`)).data,
  saveSettings: async (body: Partial<LibraryRules>) => (await api.patch<LibraryRules>(`${base}/settings/`, body)).data,
  books: async (params: { q?: string; subject?: string; available?: boolean } = {}) =>
    (await api.get<{ results: Book[]; subjects: string[]; can_manage: boolean }>(`${base}/books/`, {
      params: { ...(params.q ? { q: params.q } : {}), ...(params.subject ? { subject: params.subject } : {}), ...(params.available ? { available: 1 } : {}) },
    })).data,
  book: async (id: string) => (await api.get<Book>(`${base}/books/${id}/`)).data,
  addBook: async (body: Partial<Book> & { copies?: number; location?: string }) => (await api.post<Book>(`${base}/books/`, body)).data,
  updateBook: async (id: string, body: Partial<Book>) => (await api.patch<Book>(`${base}/books/${id}/`, body)).data,
  removeBook: async (id: string) => api.delete(`${base}/books/${id}/`),
  addCopies: async (id: string, body: { count: number; location?: string; price?: string }) =>
    (await api.post<{ barcodes: string[] }>(`${base}/books/${id}/copies/`, body)).data,
  updateCopy: async (id: string, body: Partial<CopyRow>) => (await api.patch<CopyRow>(`${base}/copies/${id}/`, body)).data,
  labels: async (params: { book?: string; copies?: string; members?: string }) =>
    (await api.get<{ labels: Label[]; qr: boolean }>(`${base}/labels/`, { params })).data,
  members: async (q = '') => (await api.get<{ results: MemberBrief[]; exact: boolean }>(`${base}/members/`, { params: q ? { q } : {} })).data,
  makeCard: async (kind: string, ref_id: string) => (await api.post<MemberBrief>(`${base}/members/`, { kind, ref_id })).data,
  member: async (id: string) => (await api.get<MemberDetail>(`${base}/members/${id}/`)).data,
  updateMember: async (id: string, body: { is_blocked?: boolean; blocked_reason?: string; notes?: string }) =>
    (await api.patch<MemberDetail>(`${base}/members/${id}/`, body)).data,
  issue: async (barcode: string, member_id: string) =>
    (await api.post<{ loan: Loan; member: MemberBrief }>(`${base}/issue/`, { barcode, member_id })).data,
  returnBook: async (barcode: string, extra: { condition?: string; damaged?: boolean; notes?: string } = {}) =>
    (await api.post<{ loan: Loan; days_late: number; fine: number; hold_for: { name: string; until: string } | null; member: MemberBrief }>(`${base}/return/`, { barcode, ...extra })).data,
  loans: async (status: string, q = '') =>
    (await api.get<{ results: Loan[]; counts: Record<string, number> }>(`${base}/loans/`, { params: { status, ...(q ? { q } : {}) } })).data,
  renew: async (id: string) => (await api.post<Loan>(`${base}/loans/${id}/renew/`, {})).data,
  settleFine: async (id: string, status: 'paid' | 'waived') => (await api.post<Loan>(`${base}/loans/${id}/fine/`, { status })).data,
  markLost: async (id: string) => (await api.post<Loan>(`${base}/loans/${id}/lost/`, {})).data,
  reservations: async (status = '') => (await api.get<Reservation[]>(`${base}/reservations/`, { params: status ? { status } : {} })).data,
  reserve: async (body: { book_id: string; student_id?: string; member_id?: string }) => (await api.post<Reservation>(`${base}/reservations/`, body)).data,
  cancelReservation: async (id: string) => (await api.post<Reservation>(`${base}/reservations/${id}/cancel/`, {})).data,
  mine: async () => (await api.get<{ members: MemberDetail[]; rules: Partial<LibraryRules> }>(`${base}/mine/`)).data,
  report: async () => (await api.get<LibraryReport>(`${base}/report/`)).data,
};

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
export default library;
