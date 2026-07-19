import React, { useState, useEffect, useRef } from 'react';
import { Users, Briefcase, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import academicService from '@/services/academic.service';
import financeService from '@/services/finance.service';
import analyticsService from '@/services/analytics.service';
import type { ExecutiveDashboardResponse } from '@/services/analytics.service';
import { extractListData } from '@/services/api';
import { websocketService } from '@/services/websocket.service';
import {
  LiveDataBadge,
  StatCard,
  WelcomeBanner,
  ReviewEarnCard,
  RevenueChart,
  ClassBarChart,
  AbsentStudentsList,
  PresentEmployeesList,
  NewAdmissions,
  FeeDonut,
  MetricsPills,
  SmsGatewayCard,
  DesktopAppBanner,
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const mountedRef = useRef(true);

  const [studentAttendance, setStudentAttendance] = useState<{ present: number; total: number } | null>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<{ present: number; total: number } | null>(null);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [presentEmployees, setPresentEmployees] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueItem[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [execData, setExecData] = useState<ExecutiveDashboardResponse | null>(null);

  // ── Currency symbol ─────────────────────────────────────────
  const savedAccountSettings = localStorage.getItem('account_settings');
  let symbol = 'Rs';
  if (savedAccountSettings) {
    try {
      const a = JSON.parse(savedAccountSettings);
      if (a.symbol) symbol = a.symbol;
    } catch (_) {}
  }

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
          setFinanceSummary({
            total_paid: ed.fee_recovery_trends.total_collected ?? 0,
            balance_due: ed.fee_recovery_trends.total_pending ?? 0,
            collection_rate: ed.fee_recovery_trends.class_recovery?.length
              ? Math.round(
                  (ed.fee_recovery_trends.class_recovery.reduce((s, c) => s + c.total_paid, 0) /
                    (ed.fee_recovery_trends.class_recovery.reduce((s, c) => s + c.total_amount, 0) || 1)) *
                    100
                )
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
    } catch (_) {}

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

      setStudents(extractListData<any>(stdRes.data || []));
      setTeachers(extractListData<any>(tchRes.data || []));
      setClasses(extractListData<any>((clsRes as any).data || clsRes || []));
      setFinanceSummary((summaryRes as any)?.data ?? null);
      setRevenueChart(extractListData<any>(revenueRes.data || []));
      setTransactionLogs(extractListData<any>(txRes.data || []));
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const res = await import('@/services/api').then((m) =>
        m.default.get('/attendance/dashboard-stats/')
      );
      const payload = res.data as {
        students?: { total: number; present: number; late: number; absent: number; present_pct: number; absent_list: any[] };
        employees?: { total: number; present: number; present_pct: number };
      };

      if (mountedRef.current) {
        const s = payload.students;
        const e = payload.employees;

        setStudentAttendance(s ? { present: s.present + (s.late || 0), total: s.total } : null);
        setAbsentStudents(s?.absent_list ?? []);

        if (e) {
          setEmployeeAttendance({ present: e.present, total: e.total });
          setPresentEmployees(e.present > 0 ? [{ id: 'count', employee_name: `${e.present} employee(s) present` }] : []);
        }
      }
    } catch (_) {
      if (mountedRef.current) {
        setStudentAttendance(null);
        setAbsentStudents([]);
        setEmployeeAttendance(null);
        setPresentEmployees([]);
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
  const getLineChartData = () => {
    if (execData?.revenue_trends?.monthly_data) {
      return execData.revenue_trends.monthly_data.map((r) => ({
        name: r.month,
        Expenses: r.pending || 0,
        Income: r.revenue || r.collected || 0,
      }));
    }

    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = new Date().getFullYear();
    const incomeByMonth = new Array(12).fill(0);
    const expenseByMonth = new Array(12).fill(0);

    (revenueChart || []).forEach((r: any) => {
      const [y, m] = (r.month || '').split('-');
      if (Number(y) === year && m) incomeByMonth[Number(m) - 1] += Number(r.revenue) || 0;
    });

    (transactionLogs || []).forEach((t: any) => {
      if (t.type !== 'expense') return;
      const d = new Date(t.date);
      if (d.getFullYear() === year) expenseByMonth[d.getMonth()] += Number(t.amount) || 0;
    });

    return monthLabels.map((name, idx) => ({
      name,
      Expenses: expenseByMonth[idx],
      Income: incomeByMonth[idx],
    }));
  };

  const totalIncome = Number(financeSummary?.total_paid) || 0;
  const totalExpense = (transactionLogs || []).reduce(
    (s, t: any) => (t.type === 'expense' ? s + (Number(t.amount) || 0) : s), 0
  );

  const now = new Date();
  const thisMonthIncome = (revenueChart || []).reduce((s, r: any) => {
    const [y, m] = (r.month || '').split('-');
    return Number(y) === now.getFullYear() && Number(m) - 1 === now.getMonth()
      ? s + (Number(r.revenue) || 0) : s;
  }, 0);

  const thisMonthExpense = (transactionLogs || []).reduce((s, t: any) => {
    const d = new Date(t.date);
    return t.type === 'expense' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      ? s + (Number(t.amount) || 0) : s;
  }, 0);

  const getBarChartData = () => {
    const counts: Record<string, number> = {};
    (classes || []).forEach((c: any) => {
      const name = c.name || c.class_name;
      if (name) counts[name] = 0;
    });
    students.forEach((s: any) => {
      const cls = s.class_name || 'Unassigned';
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return Object.keys(counts).map((name) => ({ name, Students: counts[name] }));
  };

  const feeCol = Number(financeSummary?.total_paid) || 0;
  const feeRem = Number(financeSummary?.balance_due) || 0;
  const feePct =
    financeSummary?.collection_rate != null ? `${financeSummary.collection_rate}%` : '0%';

  const pct = (n: number, t: number) => (t > 0 ? Math.round((n / t) * 100) : null);
  const studentPct = studentAttendance ? pct(studentAttendance.present, studentAttendance.total) : null;
  const employeePct = employeeAttendance ? pct(employeeAttendance.present, employeeAttendance.total) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-3 text-slate-800 font-sans">
      <LiveDataBadge connected={wsConnected} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={execData?.student_growth?.current_total ?? students.length}
          icon={<Users className="w-8 h-8 opacity-80" />}
          color="bg-[#4C469D]"
          subValue={execData?.student_growth?.current_total ?? students.length}
        />
        <StatCard
          title="Total Employees"
          value={execData?.teacher_metrics?.total_teachers ?? teachers.length}
          icon={<Briefcase className="w-8 h-8 opacity-80" />}
          color="bg-[#8C90C9]"
          subValue={execData?.teacher_metrics?.total_teachers ?? teachers.length}
        />
        <StatCard
          title="Revenue"
          value={`${symbol} ${totalIncome.toLocaleString()}`}
          icon={<DollarSign className="w-8 h-8 opacity-80" />}
          color="bg-[#F87171]"
          subValue={`${symbol} ${thisMonthIncome.toLocaleString()}`}
        />
        <StatCard
          title="Total Profit"
          value={`${symbol} ${(totalIncome - totalExpense).toLocaleString()}`}
          icon={<DollarSign className="w-8 h-8 opacity-80" />}
          color="bg-[#4F46E5]"
          subValue={`${symbol} ${(thisMonthIncome - thisMonthExpense).toLocaleString()}`}
        />
      </div>

      {/* Welcome + Review */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <WelcomeBanner />
        <ReviewEarnCard />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <WidgetErrorBoundary title="Revenue Chart">
            <RevenueChart data={getLineChartData()} />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary title="Class Chart">
            <ClassBarChart data={getBarChartData()} />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary title="Absent Students">
            <AbsentStudentsList
              absentStudents={absentStudents}
              attendanceTotal={studentAttendance?.total ?? null}
              loading={attendanceLoading}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary title="Present Employees">
            <PresentEmployeesList
              presentEmployees={presentEmployees}
              attendanceTotal={employeeAttendance?.total ?? null}
              loading={attendanceLoading}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary title="New Admissions">
            <NewAdmissions students={students} />
          </WidgetErrorBoundary>
        </div>

        <div className="space-y-6">
          <WidgetErrorBoundary title="Fee Donut">
            <FeeDonut collections={feeCol} remainings={feeRem} currency={symbol} />
          </WidgetErrorBoundary>
          <SmsGatewayCard />
          <WidgetErrorBoundary title="Metrics">
            <MetricsPills
              studentPct={studentPct}
              employeePct={employeePct}
              feeCollectionPct={feePct}
              loading={attendanceLoading}
            />
          </WidgetErrorBoundary>
          {execData?.smart_insights && execData.smart_insights.length > 0 && (
            <WidgetErrorBoundary title="Insights">
              <SmartInsights insights={execData.smart_insights as SmartInsight[]} />
            </WidgetErrorBoundary>
          )}
          <DesktopAppBanner />
          <DynamicCalendar />
        </div>
      </div>
    </div>
  );
}
