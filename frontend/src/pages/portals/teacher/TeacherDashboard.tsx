import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import teacherService, { Teacher } from '@/services/teacher.service';
import classService, { SchoolClass } from '@/services/class.service';
import { extractListData } from '@/services/api';
import { Calendar, Clock, DollarSign, BookOpen, User, RefreshCw, UserCheck, AlertCircle, Users, FileText, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any | null>(null);
  const [myClasses, setMyClasses] = useState<SchoolClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    fetchProfileData();
    fetchMyClasses();
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

      // Find current teacher's employee_id
      const empIdMatch = user?.full_name?.match(/EMP[_-]?(\d+)/i);
      const empIdFromUser = empIdMatch ? empIdMatch[0] : ''; // "EMP-99815"
      const empIdDigits = empIdMatch ? empIdMatch[1] : '';

      // Check if user is a Principal/Head who should see all classes
      const userRole = (employee?.role || '').toLowerCase();
      const isPrincipalOrHead = userRole.includes('principal') || userRole.includes('head') || userRole.includes('director');

      let myAssignedClasses: SchoolClass[];

      if (isPrincipalOrHead) {
        // Principals/Heads see all active classes
        myAssignedClasses = classList.filter(c => c.is_active !== false);
      } else {
        // Regular teachers see only their assigned classes
        const teacherName = (user?.full_name || user?.email || '').toLowerCase();
        myAssignedClasses = classList.filter((c: SchoolClass) => {
          // Match by teacher_id (employee_id)
          if (empIdFromUser && c.teacher_id === empIdFromUser) return true;
          if (empIdDigits && c.teacher_id?.includes(empIdDigits)) return true;
          // Match by teacher_name
          if (c.teacher_name && teacherName && (
            c.teacher_name.toLowerCase().includes(teacherName) || 
            teacherName.includes(c.teacher_name.toLowerCase())
          )) return true;
          return false;
        });
      }

      setMyClasses(myAssignedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Load saved employee data from login
      const savedData = localStorage.getItem('current_employee_data');
      const savedEmployee = savedData ? JSON.parse(savedData) : null;

      // Fetch ALL teachers from API
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<Teacher>(tRes.data);
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filtered = fetched.filter(t => !deletedIds.includes(t.id));

      // Match: try every strategy against API data
      const fullName = (user?.full_name || '').trim();
      const email = (user?.email || '').trim().toLowerCase();

      // Extract EMP digits from full_name (e.g. "mr.bilalhassanEMP0010" → "0010")
      const empIdMatch = fullName.match(/EMP[_-]?(\d+)/i);
      const empIdDigits = empIdMatch ? empIdMatch[1] : '';
      const empIdFull = empIdMatch ? empIdMatch[0] : ''; // "EMP0010"
      // Name part before EMP for fuzzy name matching
      const namePart = fullName.split(/EMP[_-]?\d+/i)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';

      let currentEmp = filtered.find((t) => {
        const tEmpId = String(t.employee_id || '').toUpperCase();
        const tEmpDigits = tEmpId.replace(/[^0-9]/g, '');
        return (
          // Match by backend ID if user.id looks real
          (user?.id && !user.id.startsWith('t-') && String(t.id) === String(user.id)) ||
          // Match by employee_id (exact)
          (empIdFull && tEmpId === empIdFull.toUpperCase()) ||
          // Match by employee_id (contains full EMP ID)
          (empIdFull && tEmpId.includes(empIdFull.toUpperCase())) ||
          // Match by digits only (flexible)
          (empIdDigits && tEmpDigits.includes(empIdDigits)) ||
          // Match by email
          (email && t.email?.toLowerCase() === email) ||
          // Match by full_name
          (fullName && t.full_name?.toLowerCase() === fullName.toLowerCase()) ||
          // Fuzzy name match: name before EMP matches teacher name
          (namePart && t.full_name?.toLowerCase().replace(/[^a-z]/g, '').includes(namePart))
        );
      });

      // Build employee: API data > saved data > defaults
      const fullEmployee = {
        name: currentEmp?.full_name || savedEmployee?.name || fullName || 'Employee',
        regNo: currentEmp?.employee_id || savedEmployee?.regNo || 'N/A',
        role: currentEmp?.specializations?.[0] || savedEmployee?.role || 'Teacher',
        monthlySalary: currentEmp?.monthly_salary || savedEmployee?.monthlySalary || 'Rs. 1,000',
        fatherName: currentEmp?.father_husband_name || savedEmployee?.fatherName || '--',
        phone: currentEmp?.phone || savedEmployee?.phone || '--',
        email: currentEmp?.email || savedEmployee?.email || '--',
        address: currentEmp?.home_address || currentEmp?.address || savedEmployee?.address || '--',
        cnic: currentEmp?.national_id || savedEmployee?.cnic || '--',
        education: currentEmp?.qualifications?.[0] || currentEmp?.education || savedEmployee?.education || 'N/A',
        gender: currentEmp?.gender || savedEmployee?.gender || 'Male',
        religion: currentEmp?.religion || savedEmployee?.religion || 'Islam',
        bloodGroup: currentEmp?.blood_group || savedEmployee?.bloodGroup || 'O+',
        dob: currentEmp?.date_of_birth || savedEmployee?.dob || '--',
        joiningDate: currentEmp?.joining_date || savedEmployee?.joiningDate || '--',
        experience: currentEmp?.experience_years ? `${currentEmp.experience_years} Years` : savedEmployee?.experience || 'N/A'
      };

      setEmployee(fullEmployee);
    } catch (e) {
      console.error(e);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-650" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/teacher')}>Teacher Portal</span>
          <span>Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfileData}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Employee Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 flex flex-col items-center">
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full border-4 border-slate-100 overflow-hidden shadow-2xs mb-4 relative bg-slate-50 flex items-center justify-center">
              <span className="text-4xl">👩‍🏫</span>
            </div>

            {/* Name */}
            <h3 className="text-lg font-black text-[#5C53CD] uppercase tracking-wide text-center">
              {employee?.name}
            </h3>

            {/* Details Fields list matching Picture 2 */}
            <div className="w-full mt-6 space-y-3.5 text-[11px] font-bold text-slate-500 border-t border-slate-100 pt-4">
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registration No</span>
                <span className="text-blue-650 bg-blue-50 px-2 py-0.5 rounded-lg font-mono font-bold">
                  {employee?.regNo}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Employee Role</span>
                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg font-bold">
                  {employee?.role}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Monthly Salary</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">
                  {employee?.monthlySalary}
                </span>
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
        </div>

        {/* Right Column: Hero Banner & Reports cards */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Welcome Banner Card matching Picture 2 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
            <div className="space-y-1.5 z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider">
                👋 Welcome {employee?.name} at Teacher Portal.
              </span>
              <h2 className="text-xl font-black">Your Institute Name Here</h2>
              <p className="text-[10px] text-blue-150 font-bold uppercase tracking-wider">Your targetline goes here</p>
            </div>
            
            <div className="z-10 text-right md:text-right mt-4 md:mt-0 bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold justify-end">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-black">{currentTime}</span>
              </div>
              <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider mt-0.5">{currentDateStr}</p>
            </div>

            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right"></div>
          </div>

          {/* Section 1: Attendance Report */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">1</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Attendance Report
              </h3>
            </div>

            {loadingClasses ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-650" />
              </div>
            ) : myClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No classes assigned</p>
                <p className="text-sm mt-1">You are not assigned as class teacher to any class yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myClasses.map((cls) => (
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/education/attendance/mark?class=${cls.id}&date=${new Date().toISOString().split('T')[0]}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Mark Attendance
                      </button>
                      <button
                        onClick={() => navigate(`/education/attendance/reports?class=${cls.id}`)}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Review Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Salary Report */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">2</span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Salary Report
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Current Salary</span>
                <span className="text-xs font-black text-emerald-700">{employee?.monthlySalary}</span>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">This Month</span>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider">
                  SALARY NOT RECEIVED
                </span>
              </div>
            </div>

            {/* Empty state visualizer */}
            <div className="border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-700">No Record Found.</p>
                <p className="text-[10px] text-slate-400 font-bold">No historical salary disbursements logged yet.</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}