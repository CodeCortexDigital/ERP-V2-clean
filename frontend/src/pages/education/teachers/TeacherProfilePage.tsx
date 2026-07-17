import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Download, RotateCcw, Award, Calendar, BookOpen, Clock, FileText, User,
  RefreshCw, History, Printer, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import api from '@/services/api';

interface AttendanceStats {
  present: number;
  leave: number;
  absent: number;
  total: number;
  todayStatus: string | null;
  yesterdayStatus: string | null;
}

interface PayslipData {
  net_salary: number;
  status: string;
  month: string;
  paid_amount: number;
  payment_date: string | null;
}

export default function TeacherProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    present: 0, leave: 0, absent: 0, total: 0, todayStatus: null, yesterdayStatus: null
  });
  const [latestPayslip, setLatestPayslip] = useState<PayslipData | null>(null);
  const [extraDetails, setExtraDetails] = useState<any>({
    role: 'Teacher',
    monthlySalary: 'Rs 0',
    fatherName: '--',
    gender: 'Male',
    experience: '0',
    nationalId: '--',
    religion: 'Islam',
    education: 'N/A',
    bloodGroup: 'O+',
    dateOfBirth: '--',
    homeAddress: '--',
    phone: '--'
  });

  useEffect(() => {
    loadTeacherData();
  }, [id]);

  const loadAttendanceStats = async (teacherId: string) => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await api.get(`/auth/academics/teacher-attendance/`, {
        params: { teacher: teacherId, month }
      });
      const records = extractListData<any>(res.data);
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

      const stats = { present: 0, leave: 0, absent: 0, total: records.length, todayStatus: null as string | null, yesterdayStatus: null as string | null };
      for (const r of records) {
        const s = (r.status || '').toUpperCase();
        if (s === 'P' || s === 'PRESENT') stats.present++;
        else if (s === 'L' || s === 'LEAVE') stats.leave++;
        else if (s === 'A' || s === 'ABSENT') stats.absent++;
        if (r.date === today) stats.todayStatus = s;
        if (r.date === yesterday) stats.yesterdayStatus = s;
      }
      setAttendanceStats(stats);
    } catch {
      // Attendance endpoint may not have teacher filter; silently ignore
    }
  };

  const loadLatestPayslip = async (teacherId: string) => {
    try {
      const res = await api.get('/auth/finance/payslips/', {
        params: { teacher: teacherId, page_size: 1, ordering: '-month' }
      });
      const slips = extractListData<any>(res.data);
      if (slips.length > 0) {
        setLatestPayslip(slips[0]);
      }
    } catch {
      // Payslip endpoint may not exist yet; silently ignore
    }
  };

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      let teacherData: any = null;
      if (id) {
        try {
          const response = await teacherService.getById(id);
          teacherData = response.data;
        } catch (err) {
          console.log('Fetching teacher by ID failed');
        }
      }

      if (!teacherData) {
        const res = await teacherService.getAll().catch(() => ({ data: [] }));
        const list = extractListData<any>(res.data);
        if (id) {
          teacherData = list.find((t: any) => t.id === id);
        } else {
          const userEmail = user?.email?.toLowerCase();
          teacherData = list.find((t: any) => t.email?.toLowerCase() === userEmail) || list[0];
        }
      }

      if (teacherData) {
        setTeacher(teacherData);
        setExtraDetails({
          role: teacherData.role || teacherData.designation || teacherData.specializations?.[0] || 'Teacher',
          monthlySalary: teacherData.monthly_salary ? `Rs ${Number(teacherData.monthly_salary).toLocaleString()}` : 'Rs 0',
          fatherName: teacherData.father_husband_name || '--',
          gender: teacherData.gender || 'Male',
          experience: String(teacherData.experience_years || '0'),
          nationalId: teacherData.national_id || '--',
          religion: teacherData.religion || 'Islam',
          education: teacherData.education || 'N/A',
          bloodGroup: teacherData.blood_group || 'O+',
          dateOfBirth: teacherData.date_of_birth || '--',
          homeAddress: teacherData.home_address || '--',
          phone: teacherData.phone || '--'
        });
        loadAttendanceStats(teacherData.id);
        loadLatestPayslip(teacherData.id);
      } else {
        setTeacher({} as any);
      }
    } catch (error) {
      console.error('Error loading teacher profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLoginCredentials = (t: any) => {
    const code = t.employee_id || '250822';
    const num = code.replace(/\D/g, '') || '22';
    return {
      username: `169081bsUDN${num.slice(-2)}`,
      password: `159081bsUDR${num.slice(-2)}`
    };
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RotateCcw className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!teacher) return null;

  const creds = getLoginCredentials(teacher);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/education/teachers')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Employee Profile</h1>
            <p className="text-xs text-slate-500">
              {teacher.full_name} • {teacher.employee_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTeacherData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() => navigate(`/education/teachers/${id}/history`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={() => toast.info('Exporting employee data...')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => navigate(`/education/teachers/${teacher.id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Metrics Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Employee Details */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-100 shadow-xs">
              <img
                src={teacher.profile_picture?.startsWith('http') ? teacher.profile_picture : `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.full_name || 'Teacher')}&background=4C469D&color=fff&size=128&bold=true`}
                alt={teacher.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.full_name || 'Teacher')}&background=4C469D&color=fff&size=128&bold=true`;
                }}
              />
            </div>
            <h2 className="text-xl font-bold text-[#4C469D]">{teacher.full_name}</h2>
          </div>

          {/* Details Form Fields */}
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Registration No</p>
                <p className="font-extrabold text-[#4C469D] mt-0.5">↪ {teacher.employee_id || '250822'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Employee Role</p>
                <p className="font-extrabold text-[#4C469D] mt-0.5">↪ {extraDetails.role}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Salary</p>
                <p className="font-extrabold text-[#4C469D] mt-0.5">↪ {extraDetails.monthlySalary}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Username</p>
                <p className="font-bold text-purple-700 font-mono mt-0.5">↪ {creds.username}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Password</p>
                <p className="font-bold text-purple-700 font-mono mt-0.5">↪ {creds.password}</p>
              </div>
            </div>

            <div className="space-y-3 px-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Father / Husband Name</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.fatherName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile No</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {teacher.email || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Home Address</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.homeAddress}</p>
              </div>
              
              <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">National ID</p>
                  <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.nationalId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Education</p>
                  <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.education}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.gender}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Religion</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.religion}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Group</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.bloodGroup}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Joining</p>
                <p className="font-bold text-[#4C469D] mt-0.5">↪ {teacher.joining_date || '25 June, 2026'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Experience</p>
                <p className="font-bold text-slate-600 mt-0.5">↪ {extraDetails.experience} Years</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Attendance & Salary Reports */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Attendance Report Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-[#4C469D] text-white text-xs font-extrabold flex items-center justify-center">1</span>
              <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Attendance Report</h2>
            </div>

            {/* Legend & Gauge Row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              {/* Legend circles */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> P</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> L</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> A</div>
              </div>

              {/* Two Circular Gauge representation */}
              <div className="flex items-center gap-8">
                <div className="text-center space-y-1.5">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-500 flex flex-col justify-center items-center bg-slate-50/50">
                    <span className="text-xs font-black text-slate-700">{attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block">Overall</span>
                </div>

                <div className="text-center space-y-1.5">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-500 flex flex-col justify-center items-center bg-slate-50/50">
                    <span className="text-xs font-black text-slate-700">{attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block">{new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`py-2.5 border rounded-xl text-center text-xs font-bold ${attendanceStats.todayStatus ? 'border-green-200 bg-green-50 text-green-600' : 'border-slate-200 bg-slate-50/50 text-slate-400'}`}>
                {attendanceStats.todayStatus ? `Today: ${attendanceStats.todayStatus}` : 'Today NOT MARKED'}
              </div>
              <div className={`py-2.5 border rounded-xl text-center text-xs font-bold ${attendanceStats.yesterdayStatus ? 'border-green-200 bg-green-50 text-green-600' : 'border-slate-200 bg-slate-50/50 text-slate-400'}`}>
                {attendanceStats.yesterdayStatus ? `Yesterday: ${attendanceStats.yesterdayStatus}` : 'Yesterday NOT MARKED'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-600 rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">PRESENTS</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">{attendanceStats.present}</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: {attendanceStats.present}</p>
              </div>
              <div className="p-4 bg-[#7671FA] rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">LEAVES</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">{attendanceStats.leave}</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: {attendanceStats.leave}</p>
              </div>
              <div className="p-4 bg-rose-500 rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">ABSENTS</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">{attendanceStats.absent}</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: {attendanceStats.absent}</p>
              </div>
            </div>
          </div>

          {/* 2. Salary Report Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-[#4C469D] text-white text-xs font-extrabold flex items-center justify-center">2</span>
              <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Salary Report</h2>
            </div>

            {/* Salary Status Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-center text-xs font-bold text-slate-500">
                💵 Current Salary: <strong className="text-[#4C469D]">{extraDetails.monthlySalary}</strong>
              </div>
              <div className={`py-2.5 border rounded-xl text-center text-xs font-bold ${latestPayslip ? 'border-green-200 bg-green-50 text-green-600' : 'border-red-200 bg-red-50/30 text-red-500'}`}>
                This Month: <strong className="uppercase">{latestPayslip ? `PAID Rs ${Number(latestPayslip.paid_amount || latestPayslip.net_salary).toLocaleString()}` : 'SALARY NOT RECEIVED'}</strong>
              </div>
            </div>

            {latestPayslip ? (
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Salary Record</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold">Month</p>
                    <p className="font-bold text-slate-700">{latestPayslip.month}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Net Salary</p>
                    <p className="font-bold text-slate-700">Rs {Number(latestPayslip.net_salary).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Status</p>
                    <p className={`font-bold ${latestPayslip.status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>{latestPayslip.status?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold">Paid Amount</p>
                    <p className="font-bold text-slate-700">Rs {Number(latestPayslip.paid_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">• Latest salary record •</p>
                <div className="w-32 h-32 opacity-85">
                  <img 
                    src="https://illustrations.popsy.co/purple/searching.svg" 
                    alt="No Record Found" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-extrabold text-slate-400">🔍 No Record Found.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
