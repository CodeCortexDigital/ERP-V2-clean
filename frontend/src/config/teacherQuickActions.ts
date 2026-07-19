import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  UserCheck,
  Award,
  CalendarClock,
  MessageSquare,
  Users,
  PieChart,
  ClipboardList,
  BookOpen,
  GraduationCap,
  DollarSign,
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: any;
  module: string;
  action: string;
  href: string;
  color: string;
}

// Single source of truth for the teacher/employee portal quick actions.
// Consumed by BOTH the dashboard quick-action grid and the sidebar menu
// so they always stay in sync and respect the RBAC permission matrix.
// Items are filtered at render time by `canView(module)` so a teacher only
// sees the actions their role is authorized for.
export const teacherQuickActions: QuickAction[] = [
  { id: 'attendance', label: 'Mark Attendance', icon: CheckSquare, module: 'attendance', action: 'mark', href: '/education/attendance/mark', color: 'bg-blue-600' },
  { id: 'attendance-report', label: 'Attendance Reports', icon: FileText, module: 'attendance', action: 'report', href: '/education/attendance', color: 'bg-indigo-600' },
  { id: 'behaviour', label: 'Rate Behaviour', icon: UserCheck, module: 'behaviour', action: 'add', href: '/education/behaviour/rate', color: 'bg-purple-600' },
  { id: 'exams', label: 'Exam Marks', icon: Award, module: 'exams', action: 'enter', href: '/education/exams?tab=marks', color: 'bg-amber-600' },
  { id: 'class-tests', label: 'Class Tests', icon: ClipboardList, module: 'exams', action: 'register', href: '/education/class-tests', color: 'bg-orange-600' },
  { id: 'quiz', label: 'Quiz / Assignments', icon: GraduationCap, module: 'exams', action: 'enter', href: '/education/homework', color: 'bg-pink-600' },
  { id: 'timetable', label: 'My Timetable', icon: CalendarClock, module: 'timetable', action: 'view', href: '/education/timetable/my', color: 'bg-teal-600' },
  { id: 'students', label: 'My Students', icon: Users, module: 'students', action: 'view', href: '/education/students', color: 'bg-emerald-600' },
  { id: 'lesson-planner', label: 'Lesson Planner', icon: BookOpen, module: 'academic-setup', action: 'view', href: '/education/progress/lesson-planner', color: 'bg-sky-600' },
  { id: 'progress', label: 'Progress / Coverage', icon: PieChart, module: 'reports', action: 'view', href: '/education/progress', color: 'bg-cyan-600' },
  { id: 'communication', label: 'Messaging', icon: MessageSquare, module: 'communication', action: 'send', href: '/education/communication', color: 'bg-rose-600' },
  { id: 'salary', label: 'Salary Slips', icon: DollarSign, module: 'salary', action: 'view', href: '/education/salary/slips', color: 'bg-green-600' },
];

export const teacherDashboardQuickAction = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  href: '/teacher',
};
