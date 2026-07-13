import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Search, Printer, Lock, CheckCircle2, RotateCcw, FileText } from 'lucide-react';
import teacherService, { Teacher } from '@/services/teacher.service';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function JobLetterPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [employeeRules, setEmployeeRules] = useState('');

  useEffect(() => {
    // 1. Try local storage fallback
    const saved = localStorage.getItem('rules_settings');
    let localRules = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localRules = parsed.employeeRules || '';
      } catch (e) {
        console.log('Error parsing local rules settings');
      }
    }

    // 2. Fetch canonical rules from backend settings API
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.rules && res.data.rules.employeeRules) {
        setEmployeeRules(res.data.rules.employeeRules);
      } else {
        setEmployeeRules(localRules || '<p>Employees are expected to perform their duties diligently and adhere to professional standards at all times.</p>');
      }
    }).catch(() => {
      setEmployeeRules(localRules || '<p>Employees are expected to perform their duties diligently and adhere to professional standards at all times.</p>');
    });
  }, []);

  // Generate deterministic username/password for employees
  const getLoginCredentials = (teacher: Teacher) => {
    const code = teacher.employee_id ? teacher.employee_id.replace(/\D/g, '') : '250622';
    const cleanName = teacher.full_name.replace(/\s+/g, '').slice(0, 4).toUpperCase();
    return {
      username: `${code || '250622'}bS${cleanName}2`,
      password: `${code || '250622'}bS${cleanName}1`,
    };
  };

  const getExtraDetails = (teacher: Teacher) => {
    const savedExtras = localStorage.getItem('employees_extra_info');
    let extra = {
      role: teacher.specializations?.[0] || 'Teacher',
      monthlySalary: '45000',
      fatherName: 'Muhammad Fatima',
      gender: 'Female',
      experience: '5 Years',
      nationalId: '42101-1234567-8',
      religion: 'Islam',
      education: teacher.qualifications?.[0] || 'Master of Education',
      bloodGroup: 'O+',
      dateOfBirth: '1992-08-20',
      homeAddress: 'House 123, Sector A, Karachi, Pakistan',
    };

    if (savedExtras) {
      try {
        const extrasMap = JSON.parse(savedExtras);
        if (extrasMap[teacher.id]) {
          extra = { ...extra, ...extrasMap[teacher.id] };
        }
      } catch (e) {}
    }
    return extra;
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<Teacher>(tRes.data);
      
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filtered = fetched.filter(t => !deletedIds.includes(t.id));
      
      const defaultTeachers = [
        {
          id: 't-1',
          employee_id: '250622',
          full_name: 'Maryam Fatima',
          email: 'maryam.fatima@school.edu',
          phone: '+92 300 1234567',
          qualifications: ['Master of Education'],
          specializations: ['Teacher'],
          experience_years: 5,
          joining_date: '2026-06-29',
          is_active: true,
          profile_picture: null
        }
      ];

      setTeachers(filtered.length > 0 ? filtered : defaultTeachers);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const query = searchTerm.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(query) ||
      (t.employee_id || '').toLowerCase().includes(query)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  const creds = selectedTeacher ? getLoginCredentials(selectedTeacher) : null;
  const extras = selectedTeacher ? getExtraDetails(selectedTeacher) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 p-2">
      {/* 1. INTERACTIVE LAYOUT (Hidden on Print) */}
      <div className="print:hidden space-y-6">
        {/* Breadcrumb Header Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <button onClick={() => navigate('/education/teachers')} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees
            </button>
            <span>&gt;</span>
            <span className="text-slate-500 font-bold">Job Letter</span>
          </div>

          {selectedTeacher && (
            <button 
              onClick={() => setSelectedTeacher(null)} 
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Back to Search
            </button>
          )}
        </div>

        {/* Search & Select Teacher view */}
        {!selectedTeacher ? (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-3xl border border-slate-100 shadow-xs text-center space-y-6 mt-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-50 to-indigo-50 text-purple-650 flex items-center justify-center mx-auto shadow-2xs">
              <FileText className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800">Generate Job Letter</h2>
              <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                Search an active employee by name, ID, or designation to print their job letter.
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-12 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-400"
              />
              <button className="absolute right-1.5 top-1.5 h-8 w-8 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center shadow-xs">
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List results */}
            <div className="max-w-md mx-auto max-h-48 overflow-y-auto space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-2 custom-scrollbar">
              {loading ? (
                <p className="text-xs text-slate-400 py-4 font-semibold">Loading employees list...</p>
              ) : filteredTeachers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 font-semibold">No matching employees found.</p>
              ) : (
                filteredTeachers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeacher(t)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white hover:shadow-2xs transition border border-transparent hover:border-slate-150 flex items-center justify-between text-xs font-bold text-slate-700"
                  >
                    <span>{t.full_name}</span>
                    <span className="text-[10px] text-purple-600 font-mono bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100/50">{t.employee_id || 'Staff'}</span>
                  </button>
                ))
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-semibold">ℹ {teachers.length} employee(s) available</p>
          </div>
        ) : (
          /* Profile & Portal details view */
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-0.5 shadow-2xs">
                  {selectedTeacher.profile_picture ? (
                    <img src={selectedTeacher.profile_picture} alt={selectedTeacher.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg className="w-10 h-10 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{selectedTeacher.full_name}</h3>
                  <p className="text-xs text-slate-400 font-bold">{extras?.role} • ID #{selectedTeacher.employee_id || '250622'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-[10px] tracking-wide uppercase border border-emerald-100">
                  ✓ Active
                </span>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" /> Print Job Letter
                </button>
              </div>
            </div>

            {/* Portal Login Details Box */}
            <div className="bg-[#ECECFE]/30 p-6 rounded-2xl border border-[#ECECFE] space-y-4">
              <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-4 h-4" /> Portal Login Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Login URL</span>
                  <p className="text-xs font-extrabold text-slate-700">{window.location.host}/login</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Username</span>
                  <p className="text-xs font-extrabold text-slate-700">{creds?.username}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Password</span>
                  <p className="text-xs font-extrabold text-slate-700">{creds?.password}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRINT LAYOUT (Visible only on Print) */}
      {selectedTeacher && extras && creds && (
        <div className="hidden print:block bg-white text-black p-8 font-sans space-y-6 text-sm max-w-4xl mx-auto border-0">
          
          {/* Header Banner */}
          <div className="text-center space-y-1 border-b pb-4">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center text-sm font-black">eS</span>
              My School
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">" YOUR SCHOOL SOFTWARE "</p>
            <p className="text-[10px] text-slate-400 font-semibold">+923460204447 | www.mY My School.com | info@My School.com</p>
          </div>

          <div className="text-center py-2">
            <h2 className="text-lg font-bold text-purple-800 uppercase tracking-wider">Job Letter</h2>
          </div>

          {/* Letter Body Meta Grid */}
          <div className="grid grid-cols-12 gap-6 items-start border-b pb-6">
            {/* Avatar block */}
            <div className="col-span-3">
              <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden mx-auto p-0.5 shadow-2xs">
                {selectedTeacher.profile_picture ? (
                  <img src={selectedTeacher.profile_picture} alt={selectedTeacher.full_name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <svg className="w-14 h-14 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>

            {/* Left metadata */}
            <div className="col-span-3 space-y-3 text-xs">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Serial No</span>
                <span className="font-extrabold text-slate-700">250,622</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Registration/ID</span>
                <span className="font-extrabold text-slate-700">{selectedTeacher.employee_id || '250622'}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Name of Employee</span>
                <span className="font-extrabold text-slate-800">{selectedTeacher.full_name}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Father / Husband Name</span>
                <span className="font-bold text-slate-600">{extras.fatherName || 'N/A'}</span>
              </div>
            </div>

            {/* Middle metadata */}
            <div className="col-span-3 space-y-3 text-xs">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">National ID</span>
                <span className="font-bold text-slate-600">{extras.nationalId || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Employee Role</span>
                <span className="font-extrabold text-slate-700">{extras.role}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Monthly Salary</span>
                <span className="font-extrabold text-slate-700">Rs {parseFloat(extras.monthlySalary).toLocaleString() || '45,000'}</span>
              </div>
            </div>

            {/* Right metadata */}
            <div className="col-span-3 space-y-3 text-xs">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Date of Joining</span>
                <span className="font-bold text-slate-600">{new Date(selectedTeacher.joining_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Username</span>
                <span className="font-extrabold text-slate-700">{creds.username}</span>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Password</span>
                <span className="font-extrabold text-slate-700">{creds.password}</span>
              </div>
            </div>
          </div>

          {/* Address & Apps QR row */}
          <div className="grid grid-cols-12 gap-6 items-start border-b pb-6">
            <div className="col-span-6 space-y-3 text-xs">
              <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase">Home Address</span>
                <p className="font-bold text-slate-600 leading-relaxed">{extras.homeAddress || 'N/A'}</p>
              </div>
            </div>

            <div className="col-span-6 space-y-2">
              <span className="block text-[8px] font-bold text-slate-400 uppercase text-center">Scan QR Code to Access Portal</span>
              <div className="flex justify-center gap-3">
                <div className="flex flex-col items-center border p-1 rounded bg-white shadow-2xs">
                  {/* Mock QRs representing portal access */}
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=http://My School.com/login" alt="Web Portal" className="w-12 h-12" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Web Portal</span>
                </div>
                <div className="flex flex-col items-center border p-1 rounded bg-white shadow-2xs">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://play.google.com" alt="Android App" className="w-12 h-12" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Android App</span>
                </div>
                <div className="flex flex-col items-center border p-1 rounded bg-white shadow-2xs">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=https://apple.com" alt="iOS App" className="w-12 h-12" />
                  <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">iOS App</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Details Row */}
          <div className="grid grid-cols-4 gap-4 text-xs border-b pb-6">
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Date of Birth</span>
              <span className="font-bold text-slate-600">{extras.dateOfBirth ? new Date(extras.dateOfBirth).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Gender</span>
              <span className="font-bold text-slate-600">{extras.gender || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Religion</span>
              <span className="font-bold text-slate-600">{extras.religion || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Blood Group</span>
              <span className="font-bold text-slate-600">{extras.bloodGroup || 'N/A'}</span>
            </div>

            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Experience</span>
              <span className="font-bold text-slate-600">{extras.experience || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Education</span>
              <span className="font-bold text-slate-600">{extras.education || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Mobile No</span>
              <span className="font-bold text-slate-600">{selectedTeacher.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Email Address</span>
              <span className="font-bold text-slate-600">{selectedTeacher.email || 'N/A'}</span>
            </div>
          </div>

          {/* Rules and Regulations Section */}
          <div className="space-y-2 border-b pb-6">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Rules And Regulations:</h3>
            <div 
              className="text-[10px] text-slate-500 leading-relaxed rich-editor-content"
              dangerouslySetInnerHTML={{ __html: employeeRules }}
            />
          </div>

          {/* Signatures section */}
          <div className="flex items-center justify-between pt-10 text-xs">
            <div>
              <p className="font-bold text-slate-700">Signature of Authority_______________________</p>
            </div>
            <div>
              <p className="font-bold text-slate-700">Institute Stamp___________________________</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
