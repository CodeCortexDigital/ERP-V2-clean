// Teacher workspace: my day, my classes (with roster) and class reports.
import api from './api';
import type { CalendarItem } from './calendar.service';

const base = '/auth/workspace';

export interface Lesson {
  id: string; period: string; period_number: number; start: string; end: string; class_id: string; class_name: string;
  section: string; subject: string; room: string; students: number; register_taken: number; register_done: boolean;
  now: boolean; past: boolean;
}
export interface MyDay {
  date: string; time: string; school_day: boolean; teacher: { id: string; name: string } | null;
  lessons: Lesson[];
  registers: Array<{ class_id: string; class_name: string; marked: number; total: number; absent: number; late: number; homeroom: boolean }>;
  to_mark: Array<{ id: string; title: string; subject: string; class_name: string; class_id: string; due_date: string; marked: number; total: number }>;
  to_mark_count: number;
  homework_to_mark: Array<{ id: string; title: string; subject: string; class_name: string; due_date: string; waiting: number }>;
  due_soon: Array<{ id: string; title: string; subject: string; class_name: string; due_date: string; published: boolean }>;
  meetings: Array<{ id: string; start: string; end: string; location: string; with: string; student: string; note: string }>;
  absence_notes: Array<{ id: string; student: string; class_name: string; kind: string; reason: string; note: string; status: string }>;
  follow_ups: Array<{ id: string; student: string; category: string; date: string; follow_up_date: string; overdue: boolean }>;
  unread_messages: number; upcoming: CalendarItem[];
}
export interface ClassCard {
  id: string; name: string; grade_level: number | null; homeroom: boolean; subjects: string[]; students: number;
  today_marked: number; today_absent: number; attendance_rate: number | null; average: number | null;
  missing: number; open_incidents: number; attention: number;
}
export interface RosterRow {
  id: string; full_name: string; student_id: string; section: string; attendance_rate: number | null; absences: number;
  late: number; average: number | null; grades: Array<{ subject: string; percent: number | null; letter: string }>;
  missing: number; merits: number; incidents: number; open_incidents: number; attention: string[];
}
type TermRef = { id: string; name: string } | null;
export interface ClassReport {
  term: TermRef; generated_at: string;
  grades: Array<{ class_name: string; subject: string; students: number; average: number | null; highest: number | null; lowest: number | null; letters: Record<string, number> }>;
  attendance: Array<{ class_name: string; attendance_rate: number | null; absences: number; late: number; students: number }>;
  attention: Array<{ id: string; full_name: string; class_name: string; attendance_rate: number | null; average: number | null; missing: number; incidents: number; attention: string[] }>;
}

const workspace = {
  today: async () => (await api.get<MyDay>(`${base}/today/`)).data,
  classes: async () => (await api.get<{ term: TermRef; classes: ClassCard[] }>(`${base}/classes/`)).data,
  roster: async (id: string) =>
    (await api.get<{ term: TermRef; class: ClassCard; students: RosterRow[]; thresholds: Record<string, number> }>(`${base}/classes/${id}/`)).data,
  report: async () => (await api.get<ClassReport>(`${base}/report/`)).data,
};

export default workspace;
