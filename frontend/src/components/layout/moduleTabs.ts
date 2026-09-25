import {
  Wallet, TrendingUp, TrendingDown, FileText, Receipt, CreditCard, Printer,
  AlertTriangle, BarChart3, DollarSign, Sheet, Users, UserCheck, CalendarDays,
  ClipboardList, CalendarClock, Clock, DoorOpen, Plus, Grid, UserCog, Plane,
  Star, Award, Eye, BookOpen, Library, FilePlus, Edit, ClipboardEdit, Calendar,
  GraduationCap, MessageSquare, FileSignature, BarChart2, ListChecks, FileBarChart, Users2, Video,
  Tag, Landmark, SlidersHorizontal, CalendarRange, Globe
} from 'lucide-react';
import type { ModuleTab } from './ModuleTabsLayout';

// ============================ ACCOUNTS ============================
export const accountsTabs: ModuleTab[] = [
  { id: 'chart-of-accounts', path: '/education/accounts/chart-of-accounts', label: 'Chart Of Account', icon: Wallet, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'add-income', path: '/education/accounts/add-income', label: 'Add Income', icon: TrendingUp, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'add-expense', path: '/education/accounts/add-expense', label: 'Add Expense', icon: TrendingDown, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'account-statement', path: '/education/accounts/account-statement', label: 'Account Statement', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ FEES ============================
export const feesTabs: ModuleTab[] = [
  { id: 'invoices', path: '/education/fees/invoices', label: 'Invoices', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'collect-fees', path: '/education/fees/collect-fees', label: 'Fee Collection', icon: CreditCard, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'families', path: '/education/fees/families', label: 'Family Accounts', icon: Users2, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'payment-plans', path: '/education/fees/payment-plans', label: 'Payment Plans', icon: CalendarRange, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'online-payments', path: '/education/fees/online-payments', label: 'Online Payments', icon: Globe, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'generate-invoices', path: '/education/fees/generate-invoices', label: 'Generate Invoices', icon: Receipt, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fees-paid-slip', path: '/education/fees/fees-paid-slip', label: 'Paid Slips', icon: Printer, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fees-defaulters', path: '/education/fees/fees-defaulters', label: 'Fee Defaulters', icon: AlertTriangle, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fee-items', path: '/education/fees/fee-items', label: 'Fee Items', icon: Receipt, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fee-plan', path: '/education/fees/fee-plan', label: 'Fee Plans', icon: Receipt, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'discount', path: '/education/fees/discount', label: 'Discounts', icon: Tag, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fee-accounts', path: '/education/fees/fee-accounts', label: 'Fee Accounts', icon: Landmark, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fees-report', path: '/education/fees/report', label: 'Financial Report', icon: BarChart3, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ SALARY ============================
export const salaryTabs: ModuleTab[] = [
  { id: 'payslips-list', path: '/education/salary/list', label: 'Salary List', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'generate', path: '/education/salary/generate', label: 'Generate Salary', icon: DollarSign, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'pay', path: '/education/salary/pay', label: 'Disburse Salary', icon: Wallet, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'slips', path: '/education/salary/slips', label: 'Salary Slips', icon: Receipt, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'sheet', path: '/education/salary/sheet', label: 'Payroll Sheet', icon: Sheet, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'report', path: '/education/salary/report', label: 'Payroll Report', icon: BarChart3, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ ATTENDANCE (query-based) ============================
export const attendanceTabs: ModuleTab[] = [
  { id: 'students', path: '/education/attendance', label: 'Student Marking', icon: Users, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'staff', path: '/education/attendance?type=staff', label: 'Staff Marking', icon: UserCheck, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'class-report', path: '/education/attendance?tab=class-report', label: 'Class Summary', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'student-report', path: '/education/attendance?tab=student-report', label: 'Student Report', icon: ClipboardList, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'staff-report', path: '/education/attendance?tab=staff-report', label: 'Staff Report', icon: UserCheck, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ TIMETABLE ============================
export const timetableTabs: ModuleTab[] = [
  { id: 'timetable', path: '/education/timetable', label: 'Timetable', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'create', path: '/education/timetable/editor', label: 'Create Timetable', icon: Plus, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'class', path: '/education/timetable/class', label: 'Generate For Class', icon: Grid, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'teacher', path: '/education/timetable/teacher', label: 'Generate For Teacher', icon: UserCog, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'periods', path: '/education/timetable/periods', label: 'Time Periods', icon: Clock, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'rooms', path: '/education/timetable/rooms', label: 'Class Rooms', icon: DoorOpen, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'weekdays', path: '/education/timetable/weekdays', label: 'Weekdays', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'my-leave', path: '/education/timetable/my-leave', label: 'My Leave', icon: Plane, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'leave', path: '/education/timetable/leave', label: 'Staff Leave', icon: CalendarClock, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'leave-limits', path: '/education/timetable/leave-limits', label: 'Leave Limits', icon: SlidersHorizontal, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87', roles: ['admin'] },
];

// ============================ BEHAVIOUR & SKILLS ============================
export const behaviourTabs: ModuleTab[] = [
  { id: 'rate-behaviour', path: '/education/behaviour?tab=rate-behaviour', label: 'Rate Behaviours', icon: Star, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'rate-skills', path: '/education/behaviour?tab=rate-skills', label: 'Rate Skills', icon: Award, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'observations', path: '/education/behaviour?tab=observations', label: 'Observations', icon: Eye, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'affective-report', path: '/education/behaviour?tab=affective-report', label: 'Affective Report', icon: BarChart3, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'psycomotor-report', path: '/education/behaviour?tab=psycomotor-report', label: 'Psycomotor Report', icon: BarChart3, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ EXAMINATION (Question Papers + Exams + Class Tests) ============================
export const examTabs: ModuleTab[] = [
  // Exams & Marks
  { id: 'create-exam', path: '/education/exams', label: 'Exams', icon: Edit, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'exam-marks', path: '/education/exams?tab=marks', label: 'Marks', icon: ClipboardEdit, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'exam-schedule', path: '/education/exams/schedule', label: 'Schedule', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'date-sheet', path: '/education/exams/datesheet', label: 'Date Sheet', icon: Calendar, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'result-card', path: '/education/exams?tab=results', label: 'Result Card', icon: Award, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'result-sheet', path: '/education/exams/sheet', label: 'Result Sheet', icon: Sheet, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'award-list', path: '/education/exams/awardlist', label: 'Award List', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  // Class Tests
  { id: 'test-marks', path: '/education/class-tests', label: 'Test Marks', icon: ClipboardList, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'test-result', path: '/education/class-tests?tab=results', label: 'Test Result', icon: BarChart3, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  // Question Papers
  { id: 'create-paper', path: '/education/question-bank/create', label: 'New Paper', icon: FilePlus, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'question-bank', path: '/education/question-bank', label: 'Q-Bank', icon: Library, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'subject-chapters', path: '/education/question-bank/chapters', label: 'Chapters', icon: BookOpen, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  // Grading
  { id: 'grading', path: '/education/exams/grading', label: 'Grading', icon: Award, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ SUBJECTS ============================
export const subjectsTabs: ModuleTab[] = [
  { id: 'list', path: '/education/subjects', label: 'Subjects', icon: BookOpen, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'assign', path: '/education/subjects/assign', label: 'Assign', icon: GraduationCap, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ ACADEMIC SETUP (Classes + Subjects + Homework) ============================
export const academicSetupTabs: ModuleTab[] = [
  { id: 'classes', path: '/education/academic-setup/classes', label: 'Classes', icon: GraduationCap, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'subjects', path: '/education/academic-setup/subjects', label: 'Subjects', icon: BookOpen, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'assign-subjects', path: '/education/academic-setup/subjects/assign', label: 'Assign Subjects', icon: GraduationCap, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'homework', path: '/education/academic-setup/homework', label: 'Homework', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'live-class', path: '/education/academic-setup/live-class', label: 'Live Class', icon: Video, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ COMMUNICATION ============================
export const communicationTabs: ModuleTab[] = [
  { id: 'whatsapp', path: '/education/communication?tab=whatsapp', label: 'WhatsApp', icon: MessageSquare, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'messaging', path: '/education/communication?tab=messaging', label: 'Messaging', icon: MessageSquare, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'sms-gateway', path: '/education/communication?tab=sms-gateway', label: 'SMS Gateway', icon: MessageSquare, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'branded-sms', path: '/education/communication?tab=branded-sms', label: 'Branded SMS', icon: MessageSquare, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'sms-templates', path: '/education/communication?tab=sms-templates', label: 'SMS Templates', icon: MessageSquare, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ CERTIFICATES ============================
export const certificatesTabs: ModuleTab[] = [
  { id: 'generate', path: '/education/certificates', label: 'Generate', icon: FileSignature, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'templates', path: '/education/certificates?tab=templates', label: 'Templates', icon: FileBarChart, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

// ============================ REPORTS ============================
export const reportsTabs: ModuleTab[] = [
  { id: 'student-card', path: '/education/analytics?report=card', label: 'Student Card', icon: Users, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'student-info', path: '/education/analytics?report=students-info', label: 'Student Info', icon: Users2, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'parent-info', path: '/education/analytics?report=parents-info', label: 'Parent Info', icon: Users2, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'student-attendance', path: '/education/analytics/attendance-student', label: 'Stu Attendance', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'staff-attendance', path: '/education/analytics/attendance-staff', label: 'Staff Attendance', icon: CalendarDays, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'fee-collection', path: '/education/analytics/fees', label: 'Fee Collection', icon: DollarSign, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'progress', path: '/education/analytics/progress', label: 'Progress', icon: BarChart2, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'accounts', path: '/education/analytics/accounts', label: 'Accounts', icon: Wallet, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'custom', path: '/education/analytics/custom', label: 'Custom', icon: ListChecks, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];
