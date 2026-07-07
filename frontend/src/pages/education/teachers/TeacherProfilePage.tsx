import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Download, RotateCcw, Award, Calendar, BookOpen, Clock, FileText, User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';

export default function TeacherProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [extraDetails, setExtraDetails] = useState<any>({
    role: 'Teacher',
    monthlySalary: 'Rs 1,000',
    fatherName: '--',
    gender: 'Male',
    experience: '2',
    nationalId: '--',
    religion: 'Islam',
    education: 'N/A',
    bloodGroup: 'O+',
    dateOfBirth: '1995-05-15',
    homeAddress: '--',
    phone: '--'
  });

  useEffect(() => {
    loadTeacherData();
  }, [id]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      let teacherData: any = null;
      if (id) {
        try {
          const response = await teacherService.getById(id);
          teacherData = response.data;
        } catch (err) {
          console.log('Fetching teacher by ID failed, falling back to localStorage');
        }
      }

      // If backend fails or empty, try loading from localStorage cached list
      if (!teacherData) {
        const res = await teacherService.getAll().catch(() => ({ data: [] }));
        const list = extractListData<any>(res.data);
        if (id) {
          teacherData = list.find((t: any) => t.id === id);
        } else {
          // Logged in teacher fallback
          const userEmail = user?.email?.toLowerCase();
          teacherData = list.find((t: any) => t.email?.toLowerCase() === userEmail) || list[0];
        }
      }

      // Load extra info from localStorage
      const savedExtras = localStorage.getItem('employees_extra_info');
      let extra = {
        role: 'Teacher',
        monthlySalary: 'Rs 1,000',
        fatherName: '--',
        gender: 'Male',
        experience: '2',
        nationalId: '--',
        religion: 'Islam',
        education: 'N/A',
        bloodGroup: 'O+',
        dateOfBirth: '1995-05-15',
        homeAddress: '--',
        phone: '--',
        profilePictureUrl: ''
      };

      const targetId = teacherData?.id || id;
      if (savedExtras && targetId) {
        try {
          const extrasMap = JSON.parse(savedExtras);
          if (extrasMap[targetId]) {
            extra = { ...extra, ...extrasMap[targetId] };
          }
        } catch (e) {}
      }

      // format salary display
      if (extra.monthlySalary && !extra.monthlySalary.toString().startsWith('Rs')) {
        extra.monthlySalary = `Rs ${Number(extra.monthlySalary).toLocaleString()}`;
      }

      if (teacherData) {
        setTeacher(teacherData);
        setExtraDetails({
          role: extra.role || teacherData.specializations?.[0] || 'Teacher',
          monthlySalary: extra.monthlySalary || 'Rs 1,000',
          fatherName: extra.fatherName || '--',
          gender: extra.gender || 'Male',
          experience: extra.experience || String(teacherData.experience_years || '2'),
          nationalId: extra.nationalId || '--',
          religion: extra.religion || 'Islam',
          education: extra.education || teacherData.qualifications?.[0] || 'N/A',
          bloodGroup: extra.bloodGroup || 'O+',
          dateOfBirth: extra.dateOfBirth || '1995-05-15',
          homeAddress: extra.homeAddress || '--',
          phone: teacherData.phone || extra.phone || '--',
          profilePictureUrl: extra.profilePictureUrl || ''
        });
      } else {
        // Ultimate fallback default teacher
        setTeacher({
          id: 't-1',
          employee_id: '250822',
          full_name: 'Maryam Fatima',
          email: 'maryam.fatima@school.edu',
          phone: '+92 300 1234567',
          qualifications: ['Master of Education'],
          specializations: ['Teacher'],
          experience_years: 5,
          joining_date: '2026-06-29',
          is_active: true,
          profile_picture: null
        } as any);
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
      {/* Top Breadcrumb Bar (Hidden on print) */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate('/education/teachers')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Employees
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Employee Report</span>
        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4C469D] hover:bg-[#3f3a85] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-white" /> Get PDF
        </button>
      </div>

      {/* Main Grid: Left Details & Right Metrics Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Employee Details */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-100 shadow-xs">
              <img 
                src={extraDetails.profilePictureUrl || teacher.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'} 
                alt={teacher.full_name} 
                className="w-full h-full object-cover" 
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
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-pink-500 flex flex-col justify-center items-center bg-slate-50/50">
                    <span className="text-xs font-black text-slate-700">0%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block">Overall</span>
                </div>

                <div className="text-center space-y-1.5">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-pink-500 flex flex-col justify-center items-center bg-slate-50/50">
                    <span className="text-xs font-black text-slate-700">0%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold block">Jun 2026</span>
                </div>
              </div>
            </div>

            {/* Attendance Status Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-center text-xs font-bold text-slate-400">
                Today NOT MARKED
              </div>
              <div className="py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-center text-xs font-bold text-slate-400">
                Yesterday NOT MARKED
              </div>
            </div>

            {/* Attendance Count Cards Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-600 rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">PRESENTS</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">0</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: 0</p>
              </div>

              <div className="p-4 bg-[#7671FA] rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">LEAVES</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">0</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: 0</p>
              </div>

              <div className="p-4 bg-rose-500 rounded-2xl text-white space-y-1 shadow-sm">
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">ABSENTS</p>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-bold">↪</span>
                  <span className="text-2xl font-black">0</span>
                </div>
                <p className="text-[9px] font-medium opacity-70">This Month: 0</p>
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
              <div className="py-2.5 border border-red-200 bg-red-50/30 rounded-xl text-center text-xs font-bold text-red-500">
                This Month: <strong className="uppercase">SALARY NOT RECEIVED</strong>
              </div>
            </div>

            {/* No Record Found Section */}
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
          </div>

        </div>

      </div>
    </div>
  );
}
