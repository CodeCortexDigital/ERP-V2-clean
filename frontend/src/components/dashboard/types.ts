export interface StudentSummary {
  id: string;
  full_name?: string;
  student_id?: string;
  profile_picture?: string;
  class_name?: string;
  email?: string;
}

export interface TeacherSummary {
  id: string;
  full_name?: string;
  employee_id?: string;
}

export interface ClassSummary {
  id: string;
  name?: string;
  class_name?: string;
}

export interface AbsentStudent {
  id?: string;
  name?: string;
  student_name?: string;
  class?: string;
  class_name?: string;
}

export interface PresentEmployee {
  id?: string;
  employee_name?: string;
  employee?: string;
}

export interface FinanceSummary {
  total_paid?: number;
  balance_due?: number;
  total_amount?: number;
  collection_rate?: number | null;
  total_expenses?: number;
}

export interface RevenueItem {
  month?: string;
  revenue?: number;
}

export interface TransactionLog {
  date?: string;
  amount?: number;
  type?: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  late?: number;
  absent?: number;
  present_pct?: number;
  absent_list?: AbsentStudent[];
}

export interface DashboardAttendance {
  students?: AttendanceStats;
  employees?: { total: number; present: number; present_pct: number };
}

export interface SmartInsight {
  type: string;
  title: string;
  description?: string;
  message?: string;
  priority: string;
  category?: string;
  action?: string;
}

export interface DashboardStats {
  students: StudentSummary[];
  teachers: TeacherSummary[];
  classes: ClassSummary[];
  financeSummary: FinanceSummary | null;
  revenueChart: RevenueItem[];
  transactionLogs: TransactionLog[];
  studentAttendance: { present: number; total: number } | null;
  employeeAttendance: { present: number; total: number } | null;
  absentStudents: AbsentStudent[];
  presentEmployees: PresentEmployee[];
  loading: boolean;
  attendanceLoading: boolean;
}
