import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, Briefcase, DollarSign, Gift, Star, ChevronLeft, ChevronRight, 
  AlertCircle, Laptop, MessageSquare, Download, Wifi, WifiOff
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import studentService from '@/services/student.service';
import teacherService from '@/services/teacher.service';
import academicService from '@/services/academic.service';
import financeService from '@/services/finance.service';
import { extractListData } from '@/services/api';
import { websocketService } from '@/services/websocket.service';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const mountedRef = useRef(true);

  // Calendar state
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Attendance state
  const [studentAttendance, setStudentAttendance] = useState<{ present: number; total: number } | null>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<{ present: number; total: number } | null>(null);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [presentEmployees, setPresentEmployees] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTodayAttendance();
    }
  }, [loading, students, teachers]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [stdRes, tchRes, clsRes, summaryRes, revenueRes, txRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] })),
        financeService.getSummary().catch(() => ({ data: null })),
        financeService.getMonthlyRevenueChart().catch(() => ({ data: [] })),
        financeService.getTransactionLogs().catch(() => ({ data: [] }))
      ]);

      const rawStd = extractListData<any>(stdRes.data || []);
      const rawTch = extractListData<any>(tchRes.data || []);
      const rawCls = extractListData<any>((clsRes as any).data || clsRes || []);
      const deletedTch: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');

      const filteredTch = rawTch.filter(t => !deletedTch.includes(t.id));

      setStudents(rawStd);
      setTeachers(filteredTch);
      setClasses(rawCls);
      setFinanceSummary((summaryRes as any)?.data ?? null);
      setRevenueChart(extractListData<any>(revenueRes.data || []));
      setTransactionLogs(extractListData<any>(txRes.data || []));
    } catch (e) {
      console.log('Dashboard stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    setAttendanceLoading(true);
    try {
      // ✅ FIXED: Removed /auth/ from the URL
      const res = await import('@/services/api').then(m => m.default.get('/attendance/dashboard-stats/'));
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
          setPresentEmployees(e.present > 0 ? teachers.map(t => ({
            id: t.id,
            employee_name: t.full_name
          })) : []);
        }
      }
    } catch (err) {
      console.warn('Attendance stats unavailable, falling back to local resolver:', err);
      if (mountedRef.current) {
        const resolved = computeRealAttendance();
        setStudentAttendance(resolved.studentAttendance);
        setAbsentStudents(resolved.absentStudents);
        setEmployeeAttendance(resolved.employeeAttendance);
        setPresentEmployees(teachers.map(t => ({
          id: t.id,
          employee_name: t.full_name
        })));
      }
    } finally {
      if (mountedRef.current) setAttendanceLoading(false);
    }
  };

  // Real-time WebSocket sync
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
      () => {
        if (mountedRef.current) {
          fetchDashboardStats();
        }
      },
      'dashboard'
    );

    const unsubAttendance = websocketService.subscribe(
      'attendance_update',
      ({ data }) => {
        if (!mountedRef.current) return;
        const att = data as {
          students?: { total: number; present: number; late: number; absent: number; present_pct: number };
        };
        if (att.students) {
          setStudentAttendance({
            present: att.students.present + att.students.late,
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

  // ── Dynamic ERP statistics helpers ─────────────────────────────────────────
  const getLineChartData = () => {
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = new Date().getFullYear();
    const incomeByMonth: number[] = new Array(12).fill(0);
    const expenseByMonth: number[] = new Array(12).fill(0);

    (revenueChart || []).forEach((r: any) => {
      const [y, m] = (r.month || '').split('-');
      if (Number(y) === year) incomeByMonth[Number(m) - 1] += Number(r.revenue) || 0;
    });

    (transactionLogs || []).forEach((t: any) => {
      if (t.type !== 'expense') return;
      const d = new Date(t.date);
      if (d.getFullYear() === year) expenseByMonth[d.getMonth()] += Number(t.amount) || 0;
    });

    return monthLabels.map((name, idx) => ({
      name,
      Expenses: expenseByMonth[idx],
      Income: incomeByMonth[idx]
    }));
  };

  const getFinanceStats = () => {
    const totalIncome = Number(financeSummary?.total_paid) || 0;
    const totalExpense = (transactionLogs || []).reduce(
      (s: number, t: any) => (t.type === 'expense' ? s + (Number(t.amount) || 0) : s),
      0
    );
    const totalProfit = totalIncome - totalExpense;

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();

    const thisMonthIncome = (revenueChart || []).reduce((s: number, r: any) => {
      const [y, m] = (r.month || '').split('-');
      return Number(y) === curY && Number(m) - 1 === curM ? s + (Number(r.revenue) || 0) : s;
    }, 0);

    const thisMonthExpense = (transactionLogs || []).reduce((s: number, t: any) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === curY && d.getMonth() === curM
        ? s + (Number(t.amount) || 0)
        : s;
    }, 0);

    const thisMonthProfit = thisMonthIncome - thisMonthExpense;

    return {
      totalIncome,
      totalExpense,
      totalProfit,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthProfit,
      chartData: getLineChartData()
    };
  };

  const getFeeCollectionPercentage = () => {
    if (financeSummary && financeSummary.collection_rate != null) {
      return `${financeSummary.collection_rate}%`;
    }
    return '0%';
  };

  const getEstimatedFeeDetails = () => {
    return {
      collections: Number(financeSummary?.total_paid) || 0,
      remainings: Number(financeSummary?.balance_due) || 0
    };
  };

  const computeRealAttendance = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const localRecords = JSON.parse(localStorage.getItem('marked_student_attendance') || '[]');
    const todayRecords = localRecords.filter((r: any) => r.date === todayStr);

    const totalStds = students.length;

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let absentList: any[] = [];

    if (todayRecords.length > 0) {
      todayRecords.forEach((r: any) => {
        if (r.status === 'present') presentCount++;
        else if (r.status === 'late') lateCount++;
        else if (r.status === 'absent') {
          absentCount++;
          const matchStd = students.find(s => s.id === r.student_id || s.student_id === r.student_id);
          absentList.push({
            id: r.student_id,
            student_name: matchStd?.full_name || 'Student',
            class_name: matchStd?.class_name || 'Unassigned'
          });
        }
      });
    }

    const teacherCount = teachers.length;

    return {
      studentAttendance: { present: presentCount + lateCount, total: totalStds },
      absentStudents: absentList,
      employeeAttendance: { present: teacherCount, total: teacherCount }
    };
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const MONTH_NAMES = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const DAY_NAMES_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const calCells: { day: number; currentMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calCells.push({ day: prevMonthDays - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calCells.push({ day: d, currentMonth: true });
  }
  const remaining = 42 - calCells.length;
  for (let d = 1; d <= remaining; d++) {
    calCells.push({ day: d, currentMonth: false });
  }

  const isToday = (day: number, currentMonth: boolean) =>
    currentMonth &&
    day === today.getDate() &&
    calMonth === today.getMonth() &&
    calYear === today.getFullYear();

  const todayLabel = `${DAY_NAMES_SHORT[today.getDay()]} ${MONTH_NAMES[today.getMonth()].slice(0,3)} ${String(today.getDate()).padStart(2,'0')} ${today.getFullYear()}`;

  const prevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));

  const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : null;
  const studentPct = studentAttendance ? pct(studentAttendance.present, studentAttendance.total) : null;
  const employeePct = employeeAttendance ? pct(employeeAttendance.present, employeeAttendance.total) : null;

  const finance = getFinanceStats();
  const lineChartData = finance.chartData;
  
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

    return Object.keys(counts).map(name => ({
      name,
      Students: counts[name]
    }));
  };
  
  const barChartData = getBarChartData();
  const feeDetails = getEstimatedFeeDetails();

  const savedAccountSettings = localStorage.getItem('account_settings');
  let symbol = 'Rs';
  if (savedAccountSettings) {
    try {
      const a = JSON.parse(savedAccountSettings);
      if (a.symbol) symbol = a.symbol;
    } catch (e) {}
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-3 text-slate-800 font-sans">
      {/* Real-time sync badge */}
      <div className="flex justify-end">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            wsConnected
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}
        >
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Data
            </>
          ) : (
            <><WifiOff className="w-3 h-3" /> Connecting…</>
          )}
        </span>
      </div>

      {/* 1. TOP 4 STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#4C469D] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold opacity-90">Total Students</p>
              <div className="mt-3">
                <Users className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <span className="text-4xl font-black">{students.length}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10">
            <span>This Month</span>
            <span>{students.length}</span>
          </div>
        </div>

        <div className="bg-[#8C90C9] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold opacity-90">Total Employees</p>
              <div className="mt-3">
                <Briefcase className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <span className="text-4xl font-black">{teachers.length}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10">
            <span>This Month</span>
            <span>{teachers.length}</span>
          </div>
        </div>

        <div className="bg-[#F87171] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold opacity-90">Revenue</p>
              <div className="mt-3">
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <span className="text-2xl font-black truncate max-w-[155px]">{symbol} {finance.totalIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10">
            <span>This Month</span>
            <span>{symbol} {finance.thisMonthIncome.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[#4F46E5] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold opacity-90">Total Profit</p>
              <div className="mt-3">
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <span className="text-2xl font-black truncate max-w-[155px]">{symbol} {finance.totalProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10">
            <span>This Month</span>
            <span>{symbol} {finance.thisMonthProfit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. SECOND ROW: WELCOME BANNER & REVIEW CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 bg-[#FFF1F2] p-6 rounded-2xl border border-rose-100 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div className="space-y-1 z-10">
            <h3 className="font-bold text-rose-500 text-sm">Welcome to Admin Dashboard</h3>
            <p className="text-xs text-slate-600 font-medium">
              Your Account is not Verified yet! <br className="hidden sm:inline"/>
              Please Verify your email address. <button onClick={() => alert('Verification email sent!')} className="text-blue-600 font-bold hover:underline">Verify now!</button>
            </p>
          </div>
          <div className="w-32 h-24 flex-shrink-0 relative hidden sm:flex items-center justify-center">
            <svg className="w-full h-full text-rose-300" viewBox="0 0 160 120" fill="none">
              <circle cx="80" cy="50" r="25" fill="#FECDD3" />
              <rect x="50" y="80" width="60" height="30" rx="6" fill="#FB7185" />
              <rect x="65" y="70" width="30" height="15" rx="3" fill="#38BDF8" />
            </svg>
          </div>
        </div>

        <div className="bg-[#EEF2FF] p-6 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-2xs">
          <div className="space-y-1.5">
            <div className="flex gap-0.5 text-emerald-500 text-xs">
              <Star className="w-3.5 h-3.5 fill-emerald-500" />
              <Star className="w-3.5 h-3.5 fill-emerald-500" />
              <Star className="w-3.5 h-3.5 fill-emerald-500" />
              <Star className="w-3.5 h-3.5 fill-emerald-500" />
              <Star className="w-3.5 h-3.5 fill-emerald-500" />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Review & earn</h4>
            <p className="text-[10px] text-slate-500 leading-tight">
              Receive <strong className="text-slate-800">$10</strong> as a reward plus<br/>Chance to win a Desktop plan
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Gift className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 3. MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT STACK */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card 1: Statistics Line Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs text-purple-700">Statistics</h3>
              <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={10} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconType="square" />
                  <Line type="monotone" dataKey="Expenses" stroke="#F87171" strokeWidth={2} dot={{ r: 4, fill: '#F87171' }} />
                  <Line type="monotone" dataKey="Income" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4, fill: '#60A5FA' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Statistics Horizontal Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs text-purple-700">Statistics</h3>
              <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={10} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconType="square" />
                  <Bar dataKey="Students" fill="#5850A2" barSize={35} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Today Absent Students */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs text-rose-500">Today Absent Students</h3>
              <span className="text-[10px] font-semibold text-slate-400">{new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
            </div>
            {attendanceLoading ? (
              <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto"/></div>
            ) : absentStudents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs font-bold text-rose-500">
                  {studentAttendance && studentAttendance.total > 0 ? 'No Absences Today 🎉' : 'Attendance Not Marked Yet !'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {absentStudents.map((r: any, i: number) => (
                  <div key={r.id || i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"/>
                    <span className="font-semibold text-slate-700 truncate">{r.name || r.student_name || 'Student'}</span>
                    <span className="text-[10px] text-slate-400 truncate">{r.class || r.class_name || ''}</span>
                    <span className="ml-auto text-rose-500 font-bold">Absent</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Today Present Employees */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs text-blue-600">Today Present Employees</h3>
              <span className="text-[10px] font-semibold text-slate-400">{new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
            </div>
            {attendanceLoading ? (
              <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto"/></div>
            ) : presentEmployees.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs font-bold text-rose-500">
                  {employeeAttendance && employeeAttendance.total > 0 ? 'No Employee Records Yet' : 'Attendance Not Marked Yet !'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {presentEmployees.map((r: any, i: number) => (
                  <div key={r.id || i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"/>
                    <span className="font-semibold text-slate-700 truncate">{r.employee_name || r.employee || 'Employee'}</span>
                    <span className="ml-auto text-emerald-600 font-bold">Present</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 5: New Admissions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-xs text-purple-700">New Admissions</h3>
              <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
            </div>
            <div className="flex items-center gap-4 pt-2">
              {students.slice(0, 4).map((std, idx) => (
                <div key={std.id || idx} className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 mb-2">
                    <img src={std.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'} alt={std.full_name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{std.student_id || '001'}</span>
                  <span className="text-xs font-bold text-slate-800">{std.full_name || 'Sundas'}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{std.class_name || 'Grade 1-A'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT STACK */}
        <div className="space-y-6">
          {/* Widget 1: Estimated Fee This Month */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
            <h3 className="font-bold text-xs text-slate-800">Estimated Fee This Month</h3>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center gap-1">💳 Monthly Target</p>
              <p className="text-2xl font-black text-emerald-600">{symbol} {(feeDetails.collections + feeDetails.remainings).toLocaleString()}</p>
            </div>
            <div className="relative w-28 h-28 mx-auto my-4 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 transition-all duration-500"
                  strokeDasharray={`${Math.round((feeDetails.collections / (feeDetails.collections + feeDetails.remainings || 1)) * 100)}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute font-black text-xs text-slate-800">
                {Math.round((feeDetails.collections / (feeDetails.collections + feeDetails.remainings || 1)) * 100)}%
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
              <div className="text-left">
                <p className="font-black text-slate-800">{symbol} {feeDetails.collections.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">💳 Collections</p>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-800">{symbol} {feeDetails.remainings.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1">⚡ Remainings</p>
              </div>
            </div>
          </div>

          {/* Widget 2: Free SMS Gateway */}
          <div className="bg-[#4C469D] text-white p-6 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden">
            <div className="space-y-1 max-w-[170px]">
              <h4 className="font-bold text-xs">Free SMS Gateway</h4>
              <p className="text-[10px] opacity-80 leading-tight">Send Unlimited Free SMS on Mobile Numbers.</p>
            </div>
            <MessageSquare className="w-10 h-10 opacity-70 flex-shrink-0" />
          </div>

          {/* Widget 3: Daily Metrics Pills */}
          <div className="space-y-2.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Today Present Students</span>
              <span className="text-blue-600">
                {attendanceLoading ? '…' : studentPct !== null ? `${studentPct}%` : '0%'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Today Present Employees</span>
              <span className="text-blue-600">
                {attendanceLoading ? '…' : employeePct !== null ? `${employeePct}%` : '0%'}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex justify-between items-center text-xs font-bold text-slate-700">
              <span>This Month Fee Collection</span>
              <span className="text-blue-600">{getFeeCollectionPercentage()}</span>
            </div>
          </div>

          {/* Widget 4: Desktop Version Banner */}
          <div className="bg-[#F87171] text-white p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="space-y-1">
              <h4 className="font-bold text-xs">Desktop Version</h4>
              <p className="text-[9px] opacity-90">*Download & Install My School on your PC.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => alert('Downloading Windows app')} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded-md transition-colors shadow-2xs">Download for Windows</button>
              <button onClick={() => alert('Downloading MacOS app')} className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[9px] font-bold rounded-md transition-colors shadow-2xs">Download for MacOS</button>
            </div>
          </div>

          {/* Widget 5: Dynamic Calendar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-center">
                <p className="text-purple-700 font-black text-xs">{MONTH_NAMES[calMonth]} , {calYear}</p>
                <p className="text-[9px] text-rose-500 font-bold tracking-wider">{todayLabel}</p>
              </div>
              <button onClick={nextMonth} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-2">
              {DAY_NAMES_SHORT.map(d => <span key={d} className="text-center">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calCells.map((cell, idx) => (
                <span
                  key={idx}
                  className={`text-center text-xs font-semibold py-1 rounded-md transition-colors ${
                    !cell.currentMonth
                      ? 'text-slate-300'
                      : isToday(cell.day, cell.currentMonth)
                      ? 'font-black text-rose-500 border-2 border-rose-400'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cell.day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}