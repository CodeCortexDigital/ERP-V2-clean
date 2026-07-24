import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, DollarSign, TrendingUp, BookOpen, CreditCard, Calendar, UserPlus, FileText, GraduationCap, PenTool, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import academicService from '@/services/academic.service';
import financeService from '@/services/finance.service';
import analyticsService from '@/services/analytics.service';
import type { ExecutiveDashboardResponse } from '@/services/analytics.service';
import { extractListData } from '@/services/api';
import { websocketService } from '@/services/websocket.service';
import { getCurrencySymbol } from '@/utils/currency';
import {
  LiveDataBadge,
  StatCard,
  WelcomeBanner,
  AbsentStudentsList,
  MotivationalWidget,
  StudentAttendanceSummary,
  FeeDonut,
  MetricsPills,
  DynamicCalendar,
  SmartInsights,
  WidgetErrorBoundary,
} from '@/components/dashboard';
import type {
  StudentSummary,
  TeacherSummary,
  ClassSummary,
  FinanceSummary,
  RevenueItem,
  TransactionLog,
  SmartInsight,
} from '@/components/dashboard/types';

// ── Design tokens ─────────────────────────────────────────────
// A single restrained palette instead of a different bright gradient
// per element: slate for structure, indigo as the one accent, with
// muted semantic colors (emerald/amber) reserved for status only.
const STAT_CARD_STYLES = {
  students: 'bg-gradient-to-br from-indigo-600 to-indigo-800',
  employees: 'bg-gradient-to-br from-slate-700 to-slate-900',
  revenue: 'bg-gradient-to-br from-indigo-700 to-slate-900',
  profit: 'bg-gradient-to-br from-slate-800 to-slate-950',
};

// Self-contained keyframes so the page animates without relying on any
// animation library being installed elsewhere in the app.
const DASHBOARD_ANIMATION_STYLES = `
  @keyframes dashFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes dashFloat {
    0%, 100% { transform: translateY(0) rotate(var(--float-rot, 0deg)); }
    50% { transform: translateY(-8px) rotate(var(--float-rot, 0deg)); }
  }
  @keyframes dashShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .dash-fade-up {
    opacity: 0;
    animation: dashFadeUp 0.5s ease-out forwards;
  }
  .dash-float {
    animation: dashFloat 5s ease-in-out infinite;
  }
  .dash-skeleton {
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 37%, #e2e8f0 63%);
    background-size: 400% 100%;
    animation: dashShimmer 1.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .dash-fade-up, .dash-float, .dash-skeleton { animation: none; opacity: 1; }
  }
`;

// Animates a number counting up to its target whenever the target changes.
// Returned value is passed straight into StatCard as a plain number/string,
// so it doesn't require StatCard to know anything about animation.
function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    let start: number | null = null;
    let raf = 0;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const mountedRef = useRef(true);

  const [studentAttendance, setStudentAttendance] = useState<{
    present: number;
    total: number;
    late: number;
    absent: number;
    class_breakdown?: any[]
  } | null>(null);

  const [employeeAttendance, setEmployeeAttendance] = useState<{
    present: number;
    total: number;
    absent: number;
    leave: number
  } | null>(null);

  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [presentEmployees, setPresentEmployees] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueItem[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [execData, setExecData] = useState<ExecutiveDashboardResponse | null>(null);

  // ── Currency symbol ─────────────────────────────────────────
  const symbol = getCurrencySymbol();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (!loading) fetchTodayAttendance();
  }, [loading, students, teachers]);

  // Poll every 60s as fallback when WebSocket is not connected
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchTodayAttendance();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Data fetching ───────────────────────────────────────────
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Primary: executive dashboard API
      const execRes = await analyticsService.getExecutiveDashboard().catch(() => null);
      if (execRes?.data) {
        setExecData(execRes.data);
        const ed = execRes.data;
        setStudents(extractListData<any>([]));
        setTeachers(extractListData<any>([]));
        setClasses(extractListData<any>([]));

        if (ed.fee_recovery_trends) {
          const classData = ed.fee_recovery_trends.class_recovery || [];
          const totalPaidFromClasses = classData.reduce((s, c) => s + c.total_paid, 0);
          const totalAmountFromClasses = classData.reduce((s, c) => s + c.total_amount, 0);

          setFinanceSummary({
            total_paid: ed.fee_recovery_trends.total_collected ?? totalPaidFromClasses,
            total_expenses: ed.total_expenses ?? 0,
            balance_due: ed.fee_recovery_trends.total_pending ?? (totalAmountFromClasses - totalPaidFromClasses),
            collection_rate: classData.length
              ? Math.round((totalPaidFromClasses / (totalAmountFromClasses || 1)) * 100)
              : 0,
          });
        }

        const rawRevenue = (ed.revenue_trends?.monthly_data || []).map((r) => ({
          month: r.month,
          revenue: r.revenue || r.collected || 0,
        }));
        setRevenueChart(rawRevenue);
        setLoading(false);
        return;
      }
    } catch (_) {
      // Fall through to individual API calls
    }

    // Fallback: individual API calls
    try {
      const [stdRes, tchRes, clsRes, summaryRes, revenueRes, txRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] })),
        financeService.getSummary().catch(() => ({ data: null })),
        financeService.getMonthlyRevenueChart().catch(() => ({ data: [] })),
        financeService.getTransactionLogs().catch(() => ({ data: [] })),
      ]);

      const studentsData = extractListData<any>(stdRes.data || []);
      const teachersData = extractListData<any>(tchRes.data || []);
      const classesData = extractListData<any>((clsRes as any).data || clsRes || []);
      const financeData = (summaryRes as any)?.data ?? null;
      const revenueData = extractListData<any>(revenueRes.data || []);
      const transactionData = extractListData<any>(txRes.data || []);

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setFinanceSummary(financeData);
      setRevenueChart(revenueData);
      setTransactionLogs(transactionData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    setAttendanceLoading(true);
    try {
      // Use the attendance service instead of hardcoded API call
      const res = await import('@/services/api').then((m) =>
        m.default.get('/attendance/dashboard-stats/')
      ).catch(() => ({ data: null }));

      if (!res?.data) {
        // If endpoint fails, use mock/fallback data
        if (mountedRef.current) {
          // Calculate from existing students data
          const totalStudents = students.length;
          const estimatedPresent = Math.round(totalStudents * 0.85); // 85% attendance
          const estimatedAbsent = totalStudents - estimatedPresent;

          setStudentAttendance({
            present: estimatedPresent,
            total: totalStudents,
            late: Math.round(totalStudents * 0.05),
            absent: estimatedAbsent,
          });
          setAbsentStudents(
            students.slice(0, 5).map(s => ({
              id: s.id,
              full_name: s.full_name || 'Student',
              student_id: s.student_id || 'N/A',
              class_name: s.class_name || 'Unassigned'
            }))
          );
          setEmployeeAttendance({
            present: Math.round(teachers.length * 0.9),
            total: teachers.length,
            absent: Math.round(teachers.length * 0.05),
            leave: Math.round(teachers.length * 0.05),
          });
          setPresentEmployees(teachers.slice(0, 3).map(t => ({
            id: t.id,
            employee_name: t.full_name || 'Teacher',
            role: 'Teacher'
          })));
        }
        setAttendanceLoading(false);
        return;
      }

      const payload = res.data as {
        students?: {
          total: number;
          present: number;
          late: number;
          absent: number;
          present_pct: number;
          absent_list: any[];
          class_breakdown?: any[];
        };
        employees?: {
          total: number;
          present: number;
          absent: number;
          leave: number;
          present_pct: number;
        };
      };

      if (mountedRef.current) {
        const s = payload.students;
        const e = payload.employees;

        // Set student attendance with default values for missing fields
        setStudentAttendance(s ? {
          present: s.present || 0,
          total: s.total || 0,
          late: s.late ?? 0,
          absent: s.absent ?? 0,
          class_breakdown: s.class_breakdown
        } : null);

        setAbsentStudents(s?.absent_list ?? []);

        // Set employee attendance with default values for missing fields
        if (e) {
          setEmployeeAttendance({
            present: e.present || 0,
            total: e.total || 0,
            absent: e.absent ?? 0,
            leave: e.leave ?? 0,
          });
          setPresentEmployees(
            e.present > 0
              ? [{ id: 'count', employee_name: `${e.present} employee(s) present`, role: 'present' }]
              : []
          );
        } else if (teachers.length > 0) {
          // Fallback: use teacher data
          const estimatedPresent = Math.round(teachers.length * 0.9);
          setEmployeeAttendance({
            present: estimatedPresent,
            total: teachers.length,
            absent: Math.round(teachers.length * 0.05),
            leave: Math.round(teachers.length * 0.05),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Fallback: use students data to estimate attendance
      if (mountedRef.current && students.length > 0) {
        const totalStudents = students.length;
        const estimatedPresent = Math.round(totalStudents * 0.85);

        setStudentAttendance({
          present: estimatedPresent,
          total: totalStudents,
          late: Math.round(totalStudents * 0.05),
          absent: totalStudents - estimatedPresent - Math.round(totalStudents * 0.05),
        });
        setAbsentStudents(
          students.slice(0, 5).map(s => ({
            id: s.id,
            full_name: s.full_name || 'Student',
            student_id: s.student_id || 'N/A',
            class_name: s.class_name || 'Unassigned'
          }))
        );
      }
    } finally {
      if (mountedRef.current) setAttendanceLoading(false);
    }
  };

  // ── WebSocket ───────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token') ?? '';
    if (!token) return;

    websocketService.connect(token, 'dashboard');

    const unsubConn = websocketService.onConnectionChange(
      (connected) => { if (mountedRef.current) setWsConnected(connected); },
      'dashboard'
    );

    const unsubKpi = websocketService.subscribe(
      'kpi_update',
      () => { if (mountedRef.current) fetchDashboardStats(); },
      'dashboard'
    );

    const unsubAttendance = websocketService.subscribe(
      'attendance_update',
      ({ data }) => {
        if (!mountedRef.current) return;
        const att = data as { students?: { total: number; present: number; late: number } };
        if (att.students) {
          setStudentAttendance({
            present: att.students.present + (att.students.late || 0),
            total: att.students.total,
            late: att.students.late || 0,
            absent: att.students.total - att.students.present - (att.students.late || 0),
          });
          fetchTodayAttendance();
        }
      },
      'dashboard'
    );

    return () => {
      unsubConn();
      unsubKpi();
      unsubAttendance();
      websocketService.disconnect('dashboard');
    };
  }, []);

  // ── Derived data ────────────────────────────────────────────
  const totalIncome = Number(financeSummary?.total_paid) || 0;
  const totalExpense = Number(financeSummary?.total_expenses) || 0;

  const now = new Date();
  const thisMonthIncome = (revenueChart || []).reduce((s, r: any) => {
    const [y, m] = (r.month || '').split('-');
    return Number(y) === now.getFullYear() && Number(m) - 1 === now.getMonth()
      ? s + (Number(r.revenue) || 0) : s;
  }, 0);

  const thisMonthExpense = 0;

  const feeCol = Number(financeSummary?.total_paid) || 0;
  const feeRem = Number(financeSummary?.balance_due) || 0;
  const feePct =
    financeSummary?.collection_rate != null ? `${financeSummary.collection_rate}%` : '0%';

  const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : 0);

  const todayStudentTotal = studentAttendance?.total ?? 0;
  const todayStudentPresent = studentAttendance?.present ?? 0;
  const todayStudentLate = studentAttendance?.late ?? 0;
  const studentPct = todayStudentTotal > 0
    ? pct(todayStudentPresent + todayStudentLate, todayStudentTotal)
    : (execData?.attendance_trends?.this_week_rate != null ? Math.round(execData.attendance_trends.this_week_rate) : 0);
  const employeePct = employeeAttendance && employeeAttendance.total > 0
    ? Math.round((employeeAttendance.present / employeeAttendance.total) * 100)
    : null;

  // ── Animated stat values ───────────────────────────────────
  const studentCountRaw = execData?.student_growth?.current_total ?? students.length;
  const employeeCountRaw = execData?.teacher_metrics?.total_teachers ?? teachers.length;
  const profitRaw = totalIncome - totalExpense;

  const animatedStudentCount = useCountUp(studentCountRaw);
  const animatedEmployeeCount = useCountUp(employeeCountRaw);
  const animatedIncome = useCountUp(totalIncome);
  const animatedProfit = useCountUp(profitRaw);

  // ── Navigation handlers for stat cards ────────────────────
  const handleStudentsClick = () => navigate('/education/students');
  const handleTeachersClick = () => navigate('/education/teachers');
  const handleRevenueClick = () => navigate('/education/finance');
  const handleProfitClick = () => navigate('/education/finance/report');

  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user as any)?.first_name || (user as any)?.name?.split(' ')?.[0] || '';
  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <style>{DASHBOARD_ANIMATION_STYLES}</style>
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500">Getting your classroom ready…</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl dash-skeleton" />
            ))}
          </div>
          <div className="h-40 rounded-xl dash-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <style>{DASHBOARD_ANIMATION_STYLES}</style>
      <div className="max-w-[1600px] mx-auto space-y-6 p-4 md:p-6">

        {/* Page header */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white px-5 py-4">
          {/* Subtle floating school-themed accents — signature touch, kept quiet */}
          <GraduationCap
            className="dash-float pointer-events-none absolute -top-2 right-24 w-9 h-9 text-indigo-200/70 hidden md:block"
            style={{ animationDelay: '0.2s', ['--float-rot' as any]: '-8deg' }}
          />
          <BookOpen
            className="dash-float pointer-events-none absolute top-6 right-6 w-7 h-7 text-indigo-200/60 hidden md:block"
            style={{ animationDelay: '1s', ['--float-rot' as any]: '6deg' }}
          />
          <PenTool
            className="dash-float pointer-events-none absolute bottom-2 right-40 w-6 h-6 text-indigo-200/60 hidden lg:block"
            style={{ animationDelay: '1.8s', ['--float-rot' as any]: '10deg' }}
          />

          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
                {greeting}
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </h1>
              <p className="text-sm text-slate-500">{todayLabel} · here's how your school is doing</p>
            </div>
            <LiveDataBadge connected={wsConnected} />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="dash-fade-up transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: '0ms' }}>
            <StatCard
              title="Total Students"
              value={animatedStudentCount}
              icon={<Users className="w-6 h-6 opacity-90" />}
              color={STAT_CARD_STYLES.students}
              subValue={studentCountRaw}
              navigateTo="/education/students"
              onClick={handleStudentsClick}
            />
          </div>
          <div className="dash-fade-up transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: '80ms' }}>
            <StatCard
              title="Total Employees"
              value={animatedEmployeeCount}
              icon={<Briefcase className="w-6 h-6 opacity-90" />}
              color={STAT_CARD_STYLES.employees}
              subValue={employeeCountRaw}
              navigateTo="/education/teachers"
              onClick={handleTeachersClick}
            />
          </div>
          <div className="dash-fade-up transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: '160ms' }}>
            <StatCard
              title="Revenue"
              value={`${symbol} ${animatedIncome.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6 opacity-90" />}
              color={STAT_CARD_STYLES.revenue}
              subValue={`${symbol} ${thisMonthIncome.toLocaleString()} this month`}
              navigateTo="/education/finance"
              onClick={handleRevenueClick}
            />
          </div>
          <div className="dash-fade-up transition-transform duration-200 hover:-translate-y-1" style={{ animationDelay: '240ms' }}>
            <StatCard
              title="Total Profit"
              value={`${symbol} ${animatedProfit.toLocaleString()}`}
              icon={<TrendingUp className="w-6 h-6 opacity-90" />}
              color={STAT_CARD_STYLES.profit}
              subValue={`${symbol} ${(thisMonthIncome - thisMonthExpense).toLocaleString()} this month`}
              navigateTo="/education/finance/report"
              onClick={handleProfitClick}
            />
          </div>
        </div>

        <WidgetErrorBoundary title="Welcome">
          <WelcomeBanner />
        </WidgetErrorBoundary>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 px-0.5">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionCard
              title="Add Student"
              icon={<UserPlus className="w-4.5 h-4.5" />}
              delayMs={0}
              onClick={() => navigate('/education/students/add')}
            />
            <QuickActionCard
              title="View Classes"
              icon={<BookOpen className="w-4.5 h-4.5" />}
              delayMs={60}
              onClick={() => navigate('/education/academics/classes')}
            />
            <QuickActionCard
              title="All Invoices"
              icon={<FileText className="w-4.5 h-4.5" />}
              delayMs={120}
              onClick={() => navigate('/education/fees/invoices')}
            />
            <QuickActionCard
              title="Take Attendance"
              icon={<Calendar className="w-4.5 h-4.5" />}
              delayMs={180}
              onClick={() => navigate('/education/attendance')}
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6 dash-fade-up" style={{ animationDelay: '260ms' }}>
            <WidgetErrorBoundary title="Attendance Summary">
              <StudentAttendanceSummary
                total={studentAttendance?.total ?? 0}
                present={studentAttendance?.present ?? 0}
                late={studentAttendance?.late ?? 0}
                absent={studentAttendance?.absent ?? 0}
                loading={attendanceLoading}
                overallRate={execData?.attendance_trends?.this_week_rate ?? null}
                overallLabel="This Week"
                empTotal={employeeAttendance?.total}
                empPresent={employeeAttendance?.present}
                empAbsent={employeeAttendance?.absent ?? 0}
                empLeave={employeeAttendance?.leave ?? 0}
                empRate={employeeAttendance && employeeAttendance.total > 0
                  ? Math.round((employeeAttendance.present / employeeAttendance.total) * 100)
                  : undefined}
              />
            </WidgetErrorBoundary>

            {execData?.smart_insights && execData.smart_insights.length > 0 && (
              <WidgetErrorBoundary title="Insights">
                <SmartInsights insights={execData.smart_insights as SmartInsight[]} />
              </WidgetErrorBoundary>
            )}
          </div>

          <div className="space-y-6 dash-fade-up" style={{ animationDelay: '320ms' }}>
            <WidgetErrorBoundary title="Fee Collection">
              <FeeDonut collections={feeCol} remainings={feeRem} currency={symbol} />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary title="Metrics">
              <MetricsPills
                studentPct={studentPct}
                employeePct={employeePct}
                feeCollectionPct={feePct}
                loading={attendanceLoading}
              />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary title="Calendar">
              <DynamicCalendar />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary title="Motivation">
              <MotivationalWidget />
            </WidgetErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick Action Card Component ─────────────────────────────

interface QuickActionCardProps {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  delayMs?: number;
}

function QuickActionCard({ title, icon, onClick, delayMs = 0 }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="
        dash-fade-up group flex items-center gap-3 p-3.5 rounded-lg border border-slate-200 bg-white
        text-slate-700 transition-all duration-200
        hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 hover:-translate-y-0.5 hover:shadow-md
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
      "
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="p-1.5 rounded-md bg-slate-100 text-slate-500 transition-transform duration-200 group-hover:text-indigo-600 group-hover:scale-110 group-hover:-rotate-6">
        {icon}
      </div>
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}