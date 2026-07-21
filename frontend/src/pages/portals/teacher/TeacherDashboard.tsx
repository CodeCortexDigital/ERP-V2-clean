import React, { useState, useEffect } from 'react';
import AiAssistant from '@/components/AiAssistant';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCanAccess } from '@/hooks/usePermissions';
import teacherService, { Teacher } from '@/services/teacher.service';
import classService, { SchoolClass } from '@/services/class.service';
import attendanceService from '@/services/attendance.service';
import notificationApi from '@/services/notificationApi.service';
import tenantService from '@/services/tenant.service';
import { teacherQuickActions } from '@/config/teacherQuickActions';
import { extractListData } from '@/services/api';
import { mediaUrl } from '@/services/api';
import {
  Calendar, Clock, DollarSign, BookOpen, User, RefreshCw, UserCheck, AlertCircle,
  Users, FileText, CheckSquare, Bell, ChevronRight, GraduationCap, ClipboardList,
  Award, MessageSquare, CalendarClock, TrendingUp, PieChart, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ClassStat {
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { canAccess, canView } = useCanAccess();

  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [employee, setEmployee] = useState<any | null>(null);
  const [myClasses, setMyClasses] = useState<SchoolClass[]>([]);
  const [classStats, setClassStats] = useState<Record<string, ClassStat>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [todaySummary, setTodaySummary] = useState<{ marked: number; total: number } | null>(null);
  const [notices, setNotices] = useState<{ id: string; title: string; time: string; body?: string; is_read?: boolean }[]>([]);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [instituteName, setInstituteName] = useState('Your Institute Name Here');
  const [instituteTagline, setInstituteTagline] = useState('Your tagline goes here');

  const fetchTenant = async () => {
    const tenant = await tenantService.current().catch(() => null);
    if (!tenant) return;
    const settings = (tenant?.settings_json || {}) as
      | { institute_name?: string; tagline?: string }
      | undefined;
    setInstituteName(settings?.institute_name || tenant.name || 'Your Institute Name Here');
    setInstituteTagline(settings?.tagline || '');
  };

  useEffect(() => {
    fetchProfileData();
    fetchMyClasses();
    fetchNotices();
    fetchTenant();
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCurrentDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }));
  };

  const fetchMyClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await classService.getAll().catch(() => ({ data: [] }));
      const rawClasses = extractListData<SchoolClass>(response.data || []);
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const seenClasses = new Set();
      let classList: SchoolClass[] = [...rawClasses, ...customClasses].filter((c: any) => {
        const cid = String(c.id || c.name);
        if (seenClasses.has(cid)) return false;
        seenClasses.add(cid);
        return true;
      });

      const userRole = (employee?.role || '').toLowerCase();
      const isPrincipalOrHead = userRole.includes('principal') || userRole.includes('head') || userRole.includes('director');

      let myAssignedClasses: SchoolClass[];
      if (isPrincipalOrHead) {
        myAssignedClasses = classList.filter(c => c.is_active !== false);
      } else {
        const savedEmp = JSON.parse(localStorage.getItem('current_employee_data') || '{}');
        const teacherName = (
          savedEmp.name ||
          savedEmp.full_name ||
          user?.full_name ||
          user?.email ||
          ''
        ).toLowerCase();
        myAssignedClasses = classList.filter((c: SchoolClass) => {
          const classTeacherName = (c.teacher_name || '').toLowerCase();
          if (classTeacherName === teacherName) return true;
          if (teacherName.includes(classTeacherName) && classTeacherName) return true;
          if (classTeacherName.includes(teacherName) && teacherName) return true;
          const teacherTokens = teacherName.split(' ').filter(t => t.length > 2);
          const classTokens = classTeacherName.split(' ').filter(t => t.length > 2);
          for (const t1 of teacherTokens) {
            for (const t2 of classTokens) {
              if (t1 === t2) return true;
              if (t1.includes(t2) || t2.includes(t1)) return true;
            }
          }
          return false;
        });
      }

      setMyClasses(myAssignedClasses);
      fetchClassStats(myAssignedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassStats = async (classes: SchoolClass[]) => {
    const today = new Date().toISOString().split('T')[0];
    const stats: Record<string, ClassStat> = {};
    await Promise.all(
      classes.map(async (cls) => {
        try {
          const res = await attendanceService.getClassStatistics(cls.id, undefined, undefined).catch(() => null);
          const data = res?.data;
          if (data) {
            const total = Number(data.total) || 0;
            const present = Number(data.present) || 0;
            const absent = Number(data.absent) || 0;
            const percentage = total ? Math.round((present / total) * 100) : 0;
            stats[cls.id] = { present, absent, total, percentage };
          }
        } catch { /* ignore */ }
      })
    );
    setClassStats(stats);

    try {
      const summaryRes = await attendanceService.getTodaySummary().catch(() => null);
      if (summaryRes?.data) {
        setTodaySummary({
          marked: Number(summaryRes.data.marked) || 0,
          total: Number(summaryRes.data.total) || 0,
        });
      }
    } catch { /* ignore */ }
  };

  const fetchNotices = async () => {
    try {
      const data = await notificationApi.list();
      if (data && data.length > 0) {
        setNotices(
          data.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.message,
            type: n.notification_type,
            time: new Date(n.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
            is_read: n.is_read,
          }))
        );
        return;
      }
    } catch {
      /* fall through to empty */
    }
    setNotices([]);
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      let currentEmp: any = null;

      try {
        const myProfileResponse = await teacherService.getMyProfile();
        if (myProfileResponse?.data) currentEmp = myProfileResponse.data;
      } catch { /* ignore */ }

      if (!currentEmp && user?.id) {
        try {
          const userProfileResponse = await teacherService.getById(String(user.id));
          if (userProfileResponse?.data) currentEmp = userProfileResponse.data;
        } catch { /* ignore */ }
      }

      if (!currentEmp) {
        const savedData = localStorage.getItem('current_employee_data');
        const savedEmployee = savedData ? JSON.parse(savedData) : null;
        if (savedEmployee) {
          currentEmp = {
            id: savedEmployee.userId || user?.id || '',
            employee_id: savedEmployee.regNo || savedEmployee.employee_id || '',
            full_name: savedEmployee.name || savedEmployee.full_name || '',
            email: savedEmployee.email || user?.email || '',
            phone: savedEmployee.phone || '',
            date_of_birth: savedEmployee.dob || '',
            gender: savedEmployee.gender || '',
            qualifications: [],
            specializations: [savedEmployee.role || 'Teacher'],
            experience_years: 0,
            joining_date: savedEmployee.joiningDate || '',
            is_active: true,
            profile_picture: null,
            monthly_salary: savedEmployee.monthlySalary || 'Rs. 1,000',
            father_husband_name: savedEmployee.fatherName || '',
            national_id: savedEmployee.cnic || '',
            religion: savedEmployee.religion || 'Islam',
            education: savedEmployee.education || 'N/A',
            blood_group: savedEmployee.bloodGroup || 'O+',
            home_address: savedEmployee.address || '',
            address: savedEmployee.address || '',
          };
        }
      }

      if (!currentEmp) {
        const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
        const fetched = extractListData<Teacher>(tRes.data);
        const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
        const filtered = fetched.filter(t => !deletedIds.includes(t.id));
        const fullName = (user?.full_name || '').trim();
        const email = (user?.email || '').trim().toLowerCase();
        const empIdMatch = fullName.match(/EMP[_-]?(\d+)/i);
        const empIdDigits = empIdMatch ? empIdMatch[1] : '';
        const empIdFull = empIdMatch ? empIdMatch[0] : '';
        const namePart = fullName.split(/EMP[_-]?\d+/i)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
        currentEmp = filtered.find((t) => {
          const tEmpId = String(t.employee_id || '').toUpperCase();
          const tEmpDigits = tEmpId.replace(/[^0-9]/g, '');
          return (
            (user?.id && !user.id.startsWith('t-') && String(t.id) === String(user.id)) ||
            (empIdFull && tEmpId === empIdFull.toUpperCase()) ||
            (empIdFull && tEmpId.includes(empIdFull.toUpperCase())) ||
            (empIdDigits && tEmpDigits.includes(empIdDigits)) ||
            (email && t.email?.toLowerCase() === email) ||
            (fullName && t.full_name?.toLowerCase() === fullName.toLowerCase()) ||
            (namePart && t.full_name?.toLowerCase().replace(/[^a-z]/g, '').includes(namePart))
          );
        });
      }

      const fullEmployee = {
        name: currentEmp?.full_name ||
          (localStorage.getItem('current_employee_data') && JSON.parse(localStorage.getItem('current_employee_data') || '{}').name) ||
          (user?.full_name || '').split(' ')[0] || 'Employee',
        regNo: currentEmp?.employee_id ||
          (localStorage.getItem('current_employee_data') && JSON.parse(localStorage.getItem('current_employee_data') || '{}').regNo) || 'N/A',
        role: currentEmp?.specializations?.[0] || 'Teacher',
        monthlySalary: currentEmp?.monthly_salary || 'Rs. 1,000',
        fatherName: currentEmp?.father_husband_name || '--',
        phone: currentEmp?.phone || '--',
        email: currentEmp?.email || user?.email || '--',
        address: currentEmp?.home_address || currentEmp?.address || '--',
        cnic: currentEmp?.national_id || '--',
        education: currentEmp?.qualifications?.[0] || currentEmp?.education || 'N/A',
        gender: currentEmp?.gender || 'Male',
        religion: currentEmp?.religion || 'Islam',
        bloodGroup: currentEmp?.blood_group || 'O+',
        dob: currentEmp?.date_of_birth || '--',
        joiningDate: currentEmp?.joining_date || '--',
        experience: currentEmp?.experience_years ? `${currentEmp.experience_years} Years` : 'N/A',
        profilePicture: currentEmp?.profile_picture || null,
      };

      setEmployee(fullEmployee);
    } catch (e) {
      console.error('[TeacherDashboard] Error fetching profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('current_employee_data');
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Permission-driven quick actions. Each shows only if the role can view the module.
  const quickActions = teacherQuickActions.filter((a) => canView(a.module));

  const totalStudents = myClasses.reduce((sum, c) => sum + (Number(c.students_count) || 0), 0);
  const markedToday = todaySummary?.marked ?? 0;
  const avgAttendance = (() => {
    const vals = Object.values(classStats);
    if (!vals.length) return 0;
    const sum = vals.reduce((s, v) => s + v.percentage, 0);
    return Math.round(sum / vals.length);
  })();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs font-bold bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span
            className="text-indigo-700 font-black text-sm tracking-tight cursor-pointer hover:text-indigo-900 transition-colors"
            onClick={() => navigate('/teacher')}
          >
            Teacher Portal
          </span>
          <span className="text-slate-300 text-lg font-light">/</span>
          <span className="text-slate-500">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchProfileData(); fetchMyClasses(); fetchNotices(); }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 transition-all"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Employee Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-20 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1)_0%,transparent_60%)]"></div>
            </div>
            <div className="px-5 pb-5">
              <div className="flex flex-col items-center -mt-14">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-indigo-50 flex items-center justify-center">
                  {employee?.profilePicture ? (
                    <img src={mediaUrl(employee.profilePicture)} alt={employee.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">👩‍🏫</span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-black text-slate-800 text-center">
                  {employee?.name}
                </h3>
                <span className="mt-0.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                  {employee?.role}
                </span>
                <button
                  onClick={() => {
                    setProfileForm({
                      phone: employee?.phone || '',
                      home_address: employee?.address || employee?.home_address || '',
                      education: employee?.education || '',
                      father_husband_name: employee?.fatherName || employee?.father_husband_name || '',
                      religion: employee?.religion || '',
                      blood_group: employee?.bloodGroup || employee?.blood_group || '',
                      national_id: employee?.cnic || employee?.national_id || '',
                    });
                    setShowProfileModal(true);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  My Profile
                </button>
              </div>

              <div className="mt-5 space-y-2.5 text-[11px] font-medium text-slate-500">
                <div className="flex justify-between items-center bg-blue-50/50 -mx-2 px-2 py-1.5 rounded-lg">
                  <span className="text-slate-400 font-semibold">Registration No</span>
                  <span className="text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-md font-mono font-bold">{employee?.regNo}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50/50 -mx-2 px-2 py-1.5 rounded-lg">
                  <span className="text-slate-400 font-semibold">Monthly Salary</span>
                  <span className="text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md font-bold">{employee?.monthlySalary}</span>
                </div>
                <div className="border-t border-dashed border-slate-100 my-1.5"></div>
                {[
                  ['Father / Husband', employee?.fatherName],
                  ['Mobile No', employee?.phone],
                  ['Email Address', employee?.email],
                  ['Home Address', employee?.address],
                  ['National ID', employee?.cnic],
                  ['Education', employee?.education],
                  ['Gender', employee?.gender],
                  ['Religion', employee?.religion],
                  ['Blood Group', employee?.bloodGroup],
                  ['Date of Birth', employee?.dob],
                  ['Date of Joining', employee?.joiningDate],
                  ['Experience', employee?.experience],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between items-start gap-2">
                    <span className="text-slate-400 font-semibold flex-shrink-0">{label}</span>
                    <span className={`text-slate-700 text-right ${label === 'National ID' || label === 'Date of Birth' || label === 'Date of Joining' ? 'font-mono' : ''} ${label === 'Email Address' ? 'break-all' : ''}`}>{String(val || '--')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Salary card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><DollarSign className="w-4 h-4" /></span>
              <h3 className="text-xs font-black uppercase tracking-wider">Salary Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl border border-emerald-200 text-center shadow-sm">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Current Salary</span>
                <span className="text-sm font-black text-emerald-700">{employee?.monthlySalary}</span>
              </div>
              <div className="p-3 bg-gradient-to-br from-rose-50 to-rose-100/60 rounded-xl border border-rose-200 text-center shadow-sm">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">This Month</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[8px] font-black uppercase tracking-wider shadow-xs">
                  Not Received
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">

          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
            {/* decorative circles */}
            <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-white/5"></div>
            <div className="absolute -bottom-8 -right-4 w-40 h-40 rounded-full bg-white/[0.04]"></div>
            <div className="absolute top-2 right-20 w-16 h-16 rounded-full bg-white/[0.03]"></div>
            <div className="space-y-1.5 z-10">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/15 text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                👋 Welcome {employee?.name} at Teacher Portal.
              </span>
              <h2 className="text-xl font-black tracking-tight">{instituteName}</h2>
              {instituteTagline && <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">{instituteTagline}</p>}
            </div>
            <div className="z-10 text-right mt-4 md:mt-0 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold justify-end">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-black">{currentTime}</span>
              </div>
              <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider mt-0.5">{currentDateStr}</p>
            </div>
          </div>

          {/* KPI Stat Cards — only shown if the role can view the related module */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {canView('students') && (
              <StatCard icon={GraduationCap} label="My Classes" value={String(myClasses.length)} gradient="from-blue-500 to-blue-600" />
            )}
            {canView('students') && (
              <StatCard icon={Users} label="My Students" value={totalStudents ? String(totalStudents) : '—'} gradient="from-emerald-500 to-emerald-600" />
            )}
            {canView('attendance') && (
              <StatCard icon={CheckSquare} label="Marked Today" value={markedToday ? String(markedToday) : '0'} gradient="from-indigo-500 to-indigo-600" />
            )}
            {canView('attendance') && (
              <StatCard icon={TrendingUp} label="Avg Attendance" value={`${avgAttendance}%`} gradient="from-amber-500 to-orange-500" />
            )}
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">★</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.href)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <span className={`w-10 h-10 rounded-xl ${action.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                      <action.icon className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight group-hover:text-slate-800 transition-colors">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Classes — only if the role can view students/academic-setup */}
          {canView('students') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">1</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">My Assigned Classes</h3>
              </div>
              {canAccess('attendance', 'mark') && (
                <button
                  onClick={() => navigate('/education/attendance/mark')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Mark Attendance
                </button>
              )}
            </div>

            {loadingClasses ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : myClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold">No classes assigned</p>
                <p className="text-xs mt-1">You are not assigned as class teacher to any class yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myClasses.map((cls, idx) => {
                  const stat = classStats[cls.id];
                  const accentColors = [
                    { border: 'border-l-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
                    { border: 'border-l-emerald-400', badge: 'bg-emerald-100 text-emerald-700' },
                    { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700' },
                    { border: 'border-l-rose-400', badge: 'bg-rose-100 text-rose-700' },
                    { border: 'border-l-cyan-400', badge: 'bg-cyan-100 text-cyan-700' },
                    { border: 'border-l-violet-400', badge: 'bg-violet-100 text-violet-700' },
                  ];
                  const ac = accentColors[idx % accentColors.length];
                  return (
                    <div key={cls.id} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${ac.border} p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{cls.name}</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Code: {cls.code}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold ${ac.badge}`}>
                          {cls.sections_count || 1} Section{cls.sections_count > 1 ? 's' : ''}
                        </span>
                      </div>

                      {stat && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Attendance</span>
                            <span className="text-slate-700">{stat.percentage}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${stat.percentage}%`,
                                background: `linear-gradient(90deg, ${stat.percentage >= 90 ? '#10b981' : stat.percentage >= 75 ? '#f59e0b' : '#ef4444'}, ${stat.percentage >= 90 ? '#34d399' : stat.percentage >= 75 ? '#fbbf24' : '#f87171'})`
                              }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">
                            {stat.present} present · {stat.absent} absent · {stat.total} total
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        {canAccess('attendance', 'mark') && (
                          <button
                            onClick={() => navigate(`/education/attendance/mark?class=${cls.id}&date=${new Date().toISOString().split('T')[0]}`)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs hover:shadow-sm"
                          >
                            <CheckSquare className="w-3 h-3" />
                            Mark
                          </button>
                        )}
                        {canView('attendance') && (
                          <button
                            onClick={() => navigate(`/education/attendance?class=${cls.id}`)}
                            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs hover:shadow-sm"
                          >
                            <FileText className="w-3 h-3" />
                            Report
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Notices / Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">2</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Institute Notices</h3>
            </div>
            <div className="space-y-2.5">
              {notices.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No notices yet.</p>
                </div>
              ) : (
                notices.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) notificationApi.markRead(n.id).then(fetchNotices).catch(() => {});
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all cursor-pointer hover:shadow-sm ${
                      n.is_read
                        ? 'bg-white border-slate-200 border-l-slate-300'
                        : 'bg-gradient-to-r from-indigo-50/80 to-white border-indigo-200 border-l-indigo-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.is_read ? 'bg-slate-100' : 'bg-indigo-100'}`}>
                      <Bell className={`w-4 h-4 ${n.is_read ? 'text-slate-400' : 'text-indigo-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold truncate ${n.is_read ? 'text-slate-600' : 'text-slate-800'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>}
                      </div>
                      {n.body && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{n.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 mt-1 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showProfileModal} onClose={() => setShowProfileModal(false)} title="Edit My Profile">
        <div className="space-y-3">
          {(['phone', 'home_address', 'education', 'father_husband_name', 'religion', 'blood_group', 'national_id'] as const).map((field) => (
            <div key={field}>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                {field.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={profileForm[field] ?? ''}
                onChange={(e) => setProfileForm({ ...profileForm, [field]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                setSavingProfile(true);
                try {
                  await teacherService.updateMyProfile(profileForm);
                  toast.success('Profile updated');
                  setShowProfileModal(false);
                  fetchProfileData();
                } catch {
                  toast.error('Failed to update profile');
                } finally {
                  setSavingProfile(false);
                }
              }}
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
      <AiAssistant mode="teacher" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, gradient }: { icon: any; label: string; value: string; gradient: string }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
      <span className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25)_0%,transparent_60%)]"></div>
        <Icon className="w-5 h-5 relative" />
      </span>
      <div>
        <div className="text-lg font-black text-slate-800 leading-none">{value}</div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}
