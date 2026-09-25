// Attendance codes, lesson attendance, absence reports, alerts and the student calendar.
import api from './api';

const base = '/auth/attendance';

export type DailyStatus = 'present' | 'absent' | 'late' | 'excused' | 'holiday' | 'early_dismissal';
export type LessonStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceSettings {
  mode: 'daily' | 'period';
  alert_absent: boolean;
  alert_tardy: boolean;
  alert_email: boolean;
  alert_in_app: boolean;
  chronic_threshold: number;
  reasons: Array<{ value: string; label: string }>;
}

export interface Lesson { period_number: number; period_id: string; name: string; subject: string; start: string }
export interface LessonMark { status: LessonStatus; is_excused: boolean; minutes_late: number | null; remarks: string }
export interface Roster {
  date: string;
  school_day: boolean;
  mode: 'daily' | 'period';
  periods: Lesson[];
  students: Array<{ id: string; full_name: string; student_id: string; marks: Record<number, LessonMark>; daily: { status: string; code: string } | null }>;
}

export interface CalendarDay {
  date: string;
  school_day: boolean;
  status: DailyStatus | null;
  is_excused: boolean;
  reason: string;
  reason_label: string;
  minutes_late: number | null;
  remarks: string;
  code: string;
  lessons: Array<{ period: number; subject: string; status: LessonStatus; is_excused: boolean; minutes_late: number | null }>;
}

export interface AbsenceReport {
  id: string;
  student_id: string;
  student: string;
  class_name: string;
  start_date: string;
  end_date: string;
  kind: 'absent' | 'late' | 'early_dismissal';
  kind_label: string;
  reason: string;
  reason_label: string;
  note: string;
  status: 'pending' | 'approved' | 'declined';
  status_label: string;
  submitted_by: string;
  response: string;
  created_at: string;
}

export interface StudentCalendar {
  student: { id: string; full_name: string };
  month: string;
  days: CalendarDay[];
  year_summary: { school_days: number; present: number; absent_excused: number; absent_unexcused: number; tardy: number; early_dismissal: number; rate: number | null };
  notices: Array<{ date: string; kind: string; message: string; sent_to: string[]; at: string }>;
  reports: AbsenceReport[];
  can_edit: boolean;
}

export const REASONS = [
  { value: 'illness', label: 'Illness' }, { value: 'medical', label: 'Medical appointment' },
  { value: 'family', label: 'Family matter' }, { value: 'religious', label: 'Religious observance' },
  { value: 'school_activity', label: 'School activity' }, { value: 'transport', label: 'Transport' },
  { value: 'unknown', label: 'No reason given' }, { value: 'other', label: 'Other' },
];

/** Colour and short label for a day's code. */
export function codeStyle(status: string | null, excused: boolean): { short: string; tone: string } {
  switch (status) {
    case 'present': return { short: 'P', tone: 'bg-emerald-100 text-emerald-800' };
    case 'late': return { short: excused ? 'TE' : 'T', tone: excused ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800' };
    case 'absent': return { short: excused ? 'AE' : 'A', tone: excused ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800' };
    case 'excused': return { short: 'AE', tone: 'bg-sky-100 text-sky-800' };
    case 'early_dismissal': return { short: 'ED', tone: 'bg-violet-100 text-violet-800' };
    case 'holiday': return { short: '—', tone: 'bg-slate-100 text-slate-400' };
    default: return { short: '', tone: 'bg-white text-slate-300' };
  }
}

const attendanceRegister = {
  settings: async () => (await api.get<AttendanceSettings>(`${base}/settings/`)).data,
  saveSettings: async (body: Partial<AttendanceSettings>) => (await api.put<AttendanceSettings>(`${base}/settings/`, body)).data,
  roster: async (classId: string, date: string, sectionId = '') =>
    (await api.get<Roster>(`${base}/periods/`, { params: { class_id: classId, date, ...(sectionId ? { section_id: sectionId } : {}) } })).data,
  saveLesson: async (body: { date: string; class_id: string; period_number: number; period_id?: string; subject?: string;
    records: Array<{ student_id: string; status: LessonStatus; minutes_late?: number | null; remarks?: string }> }) =>
    (await api.post<{ saved: number; mode: string }>(`${base}/periods/save/`, body)).data,
  calendar: async (studentId: string, year: number, month: number) =>
    (await api.get<StudentCalendar>(`${base}/student/${studentId}/calendar/`, { params: { year, month } })).data,
  setDay: async (studentId: string, date: string, body: { status: DailyStatus; is_excused?: boolean; reason?: string; minutes_late?: number | null; remarks?: string }) =>
    (await api.patch(`${base}/student/${studentId}/day/${date}/`, body)).data,
  reports: async (status = '') => (await api.get<AbsenceReport[]>(`${base}/absence-reports/`, { params: status ? { status } : {} })).data,
  report: async (body: { student_id: string; start_date: string; end_date: string; kind: string; reason: string; note: string }) =>
    (await api.post<AbsenceReport>(`${base}/absence-reports/`, body)).data,
  review: async (id: string, decision: 'approve' | 'decline', note = '') =>
    (await api.post<AbsenceReport>(`${base}/absence-reports/${id}/review/`, { decision, note })).data,
};

export default attendanceRegister;
