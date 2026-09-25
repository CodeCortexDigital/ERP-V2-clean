// Gradebook: scales, categories, assignments, scores, standards, report cards and transcripts.
import api from './api';

const base = '/auth/gradebook';

export type ScoreStatus = 'graded' | 'missing' | 'excused' | 'late' | 'incomplete';

export interface Band { label: string; min_percent: number; gpa_points: number; description: string }
export interface Scale { id: string; name: string; kind: string; passing_percent: number; is_default: boolean; bands: Band[] }
export interface ClassSubjectRef { id: string; class_id: string; class_name: string; subject_id: string; subject: string; subject_code: string; sections: Array<{ id: string; name: string }> }
export interface GCategory { id: string; name: string; weight: number; drop_lowest: number; order: number }
export interface GAssignment {
  id: string; title: string; description: string; category: string | null; category_name: string; term: string | null;
  section: string | null; due_date: string | null; points_possible: number; counts_toward_grade: boolean; is_published: boolean;
  exam: string | null; standards: string[];
}
export interface GradeSummary {
  percent: number | null; letter: string; gpa_points: number | null; passing: boolean | null; missing: number;
  categories: Array<{ id: string | null; name: string; weight: number; percent: number | null; count: number }>;
}
export interface GridRow { id: string; full_name: string; student_id: string; scores: Record<string, { points: number | null; status: ScoreStatus; comment: string }>; grade: GradeSummary }
export interface Grid {
  class_subject: ClassSubjectRef; term: string | null; scale: Scale; categories: GCategory[]; weights_total: number;
  assignments: GAssignment[]; students: GridRow[];
}
export interface Standard { id: string; code: string; description: string; subject: string | null; subject_name: string; grade_level: number | null; is_active: boolean }
export interface ReportCard {
  school: { name: string };
  student: { id: string; full_name: string; student_id: string; class_name: string; section: string };
  term: { id: string; name: string; year: string; start_date: string; end_date: string };
  scale: Scale;
  subjects: Array<GradeSummary & { class_subject: string; subject: string; code: string; level: string; credits: number; comment: string;
    standards: Array<{ code: string; description: string; level: number; comment: string }> }>;
  gpa: { unweighted: number | null; weighted: number | null; credits: number };
  attendance: { school_days: number; attended: number; absent: number; tardy: number; rate: number | null };
  homeroom_comment: string;
  released: boolean;
  terms: Array<{ id: string; name: string; year: string; released: boolean }>;
}
export interface Transcript {
  school: { name: string };
  student: { id: string; full_name: string; student_id: string; date_of_birth: string | null; admission_date: string | null };
  years: Array<{ year: string; class_name: string; gpa: { unweighted: number | null; weighted: number | null; credits: number };
    courses: Array<{ subject: string; code: string; level: string; final_percent: number; final_letter: string; credits_attempted: number; credits_earned: number;
      terms: Array<{ term: string; percent: number | null; letter: string }> }> }>;
  cumulative_gpa: { unweighted: number | null; weighted: number | null; credits: number };
  credits_earned: number;
}

export const LEVEL_LABEL: Record<string, string> = { standard: '', honors: 'Honors', advanced: 'Advanced', ap: 'AP', ib: 'IB', remedial: 'Support' };
export const STANDARD_LEVELS = [
  { value: 4, label: '4 · Exceeds' }, { value: 3, label: '3 · Meets' }, { value: 2, label: '2 · Approaching' }, { value: 1, label: '1 · Beginning' },
];

const gradebook = {
  scales: async () => (await api.get<Scale[]>(`${base}/scales/`)).data,
  addPreset: async (preset: 'us' | 'standards') => (await api.post<Scale>(`${base}/scales/`, { preset })).data,
  saveScale: async (id: string, body: Partial<Scale>) => (await api.patch<Scale>(`${base}/scales/${id}/`, body)).data,
  deleteScale: async (id: string) => api.delete(`${base}/scales/${id}/`),
  classes: async () => (await api.get<ClassSubjectRef[]>(`${base}/classes/`)).data,
  grid: async (classSubject: string, term: string, section = '') =>
    (await api.get<Grid>(`${base}/grid/`, { params: { class_subject: classSubject, term, ...(section ? { section } : {}) } })).data,
  addCategory: async (body: { class_subject: string; name?: string; weight?: number; drop_lowest?: number; preset?: string }) =>
    (await api.post(`${base}/categories/`, body)).data,
  updateCategory: async (id: string, body: Partial<GCategory>) => (await api.patch(`${base}/categories/${id}/`, body)).data,
  deleteCategory: async (id: string) => api.delete(`${base}/categories/${id}/`),
  addAssignment: async (body: Partial<GAssignment> & { class_subject: string }) => (await api.post<GAssignment>(`${base}/assignments/`, body)).data,
  updateAssignment: async (id: string, body: Partial<GAssignment>) => (await api.patch<GAssignment>(`${base}/assignments/${id}/`, body)).data,
  deleteAssignment: async (id: string) => api.delete(`${base}/assignments/${id}/`),
  fromExam: async (exam: string, category?: string, term?: string) => (await api.post<GAssignment>(`${base}/assignments/from-exam/`, { exam, category, term })).data,
  saveScores: async (assignment: string, scores: Array<{ student: string; points: number | null; status: ScoreStatus; comment?: string }>) =>
    (await api.post<{ saved: number; errors: string[] }>(`${base}/scores/`, { assignment, scores })).data,
  standards: async (params: { subject?: string; grade_level?: number | null } = {}) =>
    (await api.get<Standard[]>(`${base}/standards/`, { params })).data,
  addStandard: async (body: { subject: string; code: string; description: string; grade_level?: number | null }) =>
    (await api.post<Standard>(`${base}/standards/`, body)).data,
  deleteStandard: async (id: string) => api.delete(`${base}/standards/${id}/`),
  ratings: async (classSubject: string, term: string) =>
    (await api.get<{ standards: Standard[]; students: Array<{ id: string; full_name: string; ratings: Record<string, { level: number; comment: string }> }> }>(
      `${base}/standard-ratings/`, { params: { class_subject: classSubject, term } })).data,
  saveRatings: async (term: string, ratings: Array<{ student: string; standard: string; level: number | null }>) =>
    (await api.post(`${base}/standard-ratings/`, { term, ratings })).data,
  comment: async (body: { student: string; term: string; class_subject?: string | null; comment: string }) =>
    (await api.post(`${base}/comments/`, body)).data,
  reportCard: async (studentId: string, term = '') => (await api.get<ReportCard>(`${base}/report-card/${studentId}/`, { params: term ? { term } : {} })).data,
  releases: async (term = '') => (await api.get<Array<{ id: string; term: string; term_name: string; class_id: string | null; class_name: string; released_at: string }>>(
    `${base}/releases/`, { params: term ? { term } : {} })).data,
  release: async (term: string, classId?: string) => (await api.post(`${base}/releases/`, { term, class_id: classId || null })).data,
  unrelease: async (id: string) => api.delete(`${base}/releases/${id}/`),
  transcript: async (studentId: string) => (await api.get<Transcript>(`${base}/transcript/${studentId}/`)).data,
  studentGrades: async (studentId: string, term = '') => (await api.get(`${base}/students/${studentId}/grades/`, { params: term ? { term } : {} })).data as {
    term: { id: string; name: string } | null;
    subjects: Array<GradeSummary & { subject: string; assignments: Array<{ title: string; category: string; due_date: string | null; points_possible: number; points: number | null; status: ScoreStatus | null; comment: string }> }>;
  },
  terms: async () => (await api.get<Array<{ id: string; name: string; academic_year: string; start_date: string; end_date: string; is_current: boolean }>>('/auth/academics/terms/')).data,
};

export default gradebook;
