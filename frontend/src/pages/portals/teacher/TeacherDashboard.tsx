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
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span
            className="text-slate-800 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer"
            onClick={() => navigate('/teacher')}
          >
            Teacher Portal
          </span>
          <span>Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchProfileData(); fetchMyClasses(); fetchNotices(); }}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Employee Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 flex flex-col items-center">
            <div className="w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden shadow-2xs mb-4 relative bg-slate-50 flex items-center justify-center">
              {employee?.profilePicture ? (
                <img src={mediaUrl(employee.profilePicture)} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">👩‍🏫</span>
              )}
            </div>

            <h3 className="text-lg font-black text-[#5C53CD] uppercase tracking-wide text-center">
              {employee?.name}
            </h3>
            <span className="mt-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
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
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              My Profile
            </button>

            <div className="w-full mt-6 space-y-3.5 text-[11px] font-bold text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registration No</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg font-mono font-bold">{employee?.regNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Monthly Salary</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">{employee?.monthlySalary}</span>
              </div>
              <div className="border-t border-dashed border-slate-100 my-2"></div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Father / Husband</span>
                <span className="text-slate-700 text-right">{employee?.fatherName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mobile No</span>
                <span className="text-slate-700">{employee?.phone}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Email Address</span>
                <span className="text-slate-700 text-right break-all">{employee?.email}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Home Address</span>
                <span className="text-slate-700 text-right">{employee?.address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">National ID</span>
                <span className="text-slate-700 font-mono">{employee?.cnic}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Education</span>
                <span className="text-slate-700 text-right">{employee?.education}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gender</span>
                <span className="text-slate-700">{employee?.gender}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Religion</span>
                <span className="text-slate-700">{employee?.religion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Blood Group</span>
                <span className="text-slate-700">{employee?.bloodGroup}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date of Birth</span>
                <span className="text-slate-700 font-mono">{employee?.dob}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date of Joining</span>
                <span className="text-slate-700 font-mono">{employee?.joiningDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Experience</span>
                <span className="text-slate-700">{employee?.experience}</span>
              </div>
            </div>
          </div>

          {/* Salary card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider">Salary Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Current Salary</span>
                <span className="text-xs font-black text-emerald-700">{employee?.monthlySalary}</span>
              </div>
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">This Month</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider">
                  Not Received
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">

          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
            <div className="space-y-1.5 z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider">
                👋 Welcome {employee?.name} at Teacher Portal.
              </span>
              <h2 className="text-xl font-black">{instituteName}</h2>
              <p className="text-[10px] text-blue-150 font-bold uppercase tracking-wider">{instituteTagline}</p>
            </div>
            <div className="z-10 text-right mt-4 md:mt-0 bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold justify-end">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-black">{currentTime}</span>
              </div>
              <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider mt-0.5">{currentDateStr}</p>
            </div>
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right"></div>
          </div>

          {/* KPI Stat Cards — only shown if the role can view the related module */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {canView('students') && (
              <StatCard icon={GraduationCap} label="My Classes" value={String(myClasses.length)} color="bg-blue-50 text-blue-600" />
            )}
            {canView('students') && (
              <StatCard icon={Users} label="My Students" value={totalStudents ? String(totalStudents) : '—'} color="bg-emerald-50 text-emerald-600" />
            )}
            {canView('attendance') && (
              <StatCard icon={CheckSquare} label="Marked Today" value={markedToday ? String(markedToday) : '0'} color="bg-indigo-50 text-indigo-600" />
            )}
            {canView('attendance') && (
              <StatCard icon={TrendingUp} label="Avg Attendance" value={`${avgAttendance}%`} color="bg-amber-50 text-amber-600" />
            )}
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">★</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => navigate(action.href)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-transparent hover:shadow-md transition-all"
                  >
                    <span className={`w-10 h-10 rounded-xl ${action.color} text-white flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <action.icon className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Classes — only if the role can view students/academic-setup */}
          {canView('students') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">1</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">My Assigned Classes</h3>
              </div>
              {canAccess('attendance', 'mark') && (
                <button
                  onClick={() => navigate('/education/attendance/mark')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Mark Attendance
                </button>
              )}
            </div>

            {loadingClasses ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : myClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No classes assigned</p>
                <p className="text-sm mt-1">You are not assigned as class teacher to any class yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myClasses.map((cls) => {
                  const stat = classStats[cls.id];
                  return (
                    <div key={cls.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{cls.name}</h4>
                          <p className="text-xs text-slate-500">Code: {cls.code}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          {cls.sections_count || 1} Section{cls.sections_count > 1 ? 's' : ''}
                        </span>
                      </div>

                      {stat && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Attendance</span>
                            <span className="text-slate-700">{stat.percentage}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.percentage}%` }}></div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {stat.present} present · {stat.absent} absent · {stat.total} total
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {canAccess('attendance', 'mark') && (
                          <button
                            onClick={() => navigate(`/education/attendance/mark?class=${cls.id}&date=${new Date().toISOString().split('T')[0]}`)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Mark
                          </button>
                        )}
                        {canView('attendance') && (
                          <button
                            onClick={() => navigate(`/education/attendance?class=${cls.id}`)}
                            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">2</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Institute Notices</h3>
            </div>
            <div className="space-y-3">
              {notices.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No notices yet.</p>
              ) : (
                notices.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) notificationApi.markRead(n.id).then(fetchNotices).catch(() => {});
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      n.is_read ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                    <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.is_read ? 'text-slate-400' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{n.title}</p>
                      {n.body && <p className="text-[10px] text-slate-500 mt-0.5">{n.body}</p>}
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{n.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-4 flex items-center gap-3">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <div className="text-lg font-black text-slate-800 leading-none">{value}</div>
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}
