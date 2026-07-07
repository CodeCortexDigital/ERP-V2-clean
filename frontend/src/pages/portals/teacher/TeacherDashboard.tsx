import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { Calendar, Clock, DollarSign, BookOpen, User, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any | null>(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    fetchProfileData();
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCurrentDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }));
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<Teacher>(tRes.data);
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filtered = fetched.filter(t => !deletedIds.includes(t.id));

      // Find the logged-in employee matching user name or email
      let currentEmp = filtered.find(
        (t) => 
          String(t.id) === String(user?.id) || 
          t.full_name?.toLowerCase() === user?.full_name?.toLowerCase() ||
          t.email?.toLowerCase() === user?.email?.toLowerCase()
      );

      // If still not found, check the first employee in the list
      if (!currentEmp && filtered.length > 0) {
        currentEmp = filtered[0];
      }

      // Load extra info
      const extras = JSON.parse(localStorage.getItem('employees_extra_info') || '{}');
      const empId = currentEmp?.id || 't-1';
      const empExtra = extras[empId] || {};

      // Build complete employee info object matching Picture 2
      const fullEmployee = {
        name: currentEmp?.full_name || user?.full_name || 'Maryam Fatima',
        regNo: currentEmp?.employee_id || '250622',
        role: empExtra.role || currentEmp?.specializations?.[0] || 'Teacher',
        monthlySalary: empExtra.monthlySalary || 'Rs. 1,000',
        fatherName: empExtra.fatherName || 'Husband Name',
        phone: currentEmp?.phone || '+92 300 1234567',
        email: currentEmp?.email || 'maryam.fatima@school.edu',
        address: empExtra.homeAddress || 'Main Street, School Block',
        cnic: empExtra.nationalId || '35202-1234567-8',
        education: empExtra.education || currentEmp?.qualifications?.[0] || 'Master of Education',
        gender: empExtra.gender || 'Female',
        religion: empExtra.religion || 'Islam',
        bloodGroup: empExtra.bloodGroup || 'O+',
        dob: empExtra.dateOfBirth || '1995-08-12',
        joiningDate: currentEmp?.joining_date || '2026-06-29',
        experience: empExtra.experience ? `${empExtra.experience} years` : '5 years'
      };

      setEmployee(fullEmployee);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Donut chart simulation */}
              <div className="md:col-span-5 flex flex-col items-center justify-center border-r border-slate-100 pr-0 md:pr-6">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG Circle */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle cx="72" cy="72" r="60" stroke="#3b82f6" strokeWidth="12" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 60} 
                            strokeDashoffset={0} />
                  </svg>
                  <div className="absolute text-center space-y-0.5">
                    <span className="block text-xl font-black text-blue-650 leading-none">100%</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Overall</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-[9px] font-bold text-slate-400">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Present</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-450"></span> Leave</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-450"></span> Absent</div>
                </div>
              </div>

              {/* Status capsules & Grid list */}
              <div className="md:col-span-7 space-y-4">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Today</span>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-black uppercase">
                      NOT MARKED
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Yesterday</span>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-black uppercase">
                      NOT MARKED
                    </span>
                  </div>
                </div>

                {/* Presentation counts */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center space-y-1">
                    <span className="block text-xl font-black text-blue-600">1</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Presents</span>
                  </div>
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-center space-y-1">
                    <span className="block text-xl font-black text-purple-600">0</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Leaves</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-center space-y-1">
                    <span className="block text-xl font-black text-rose-600">0</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Absents</span>
                  </div>
                </div>

              </div>

            </div>
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