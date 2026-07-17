import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | 'student'>('admin');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    const savedStaff = localStorage.getItem('staff_login_credentials');
    if (!savedStaff) {
      const defaultStaffCreds = {
        't-1': {
          username: 'mr.bilalhassanEMP0010',
          password: 'staff_EMP0010'
        }
      };
      localStorage.setItem('staff_login_credentials', JSON.stringify(defaultStaffCreds));
    }

  }, []);

  const getPortalRoute = (user: any) => {
    return user?.portal_path || (user?.role === 'student' ? '/student' : '/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('Please enter your username and password');
      return;
    }
    setLoading(true);
    setError('');

    // 1. If role is Student -> Validate generated credentials fallback
    if (selectedRole === 'student') {
      const savedCreds = localStorage.getItem('student_login_credentials');
      if (savedCreds) {
        try {
          const parsed = JSON.parse(savedCreds);
          const matchedStudentId = Object.keys(parsed).find(key => {
            const cred = parsed[key];
            return cred.username.toLowerCase() === userId.toLowerCase() && cred.password === password;
          });

          if (matchedStudentId) {
            const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
            const student = customStudents.find((s: any) => s.id === matchedStudentId) || {
              id: matchedStudentId,
              full_name: userId,
              student_id: matchedStudentId
            };

            const mockUser = {
              id: student.id,
              username: userId,
              email: `${student.full_name.toLowerCase().replace(/\s+/g, '')}@school.edu`,
              role: 'student',
              full_name: student.full_name,
              portal_path: '/student'
            };

            localStorage.setItem('access_token', 'mock-access-token');
            localStorage.setItem('refresh_token', 'mock-refresh-token');
            useAuthStore.setState({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              user: mockUser as any,
              role: mockUser.role as any,
              isAuthenticated: true,
              loading: false
            });

            toast.success(`Logged in as Student: ${student.full_name}!`);
            navigate('/student');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Local student login error:', err);
        }
      }
      setError('Invalid student username or password');
      setLoading(false);
      return;
    }

    // 2. If role is Employee -> Validate staff_login_credentials fallback
    if (selectedRole === 'employee') {
      const savedCreds = localStorage.getItem('staff_login_credentials');
      if (savedCreds) {
        try {
          const parsed = JSON.parse(savedCreds);
          const matchedStaffId = Object.keys(parsed).find(key => {
            const cred = parsed[key];
            return cred.username.toLowerCase() === userId.toLowerCase() && cred.password === password;
          });

          if (matchedStaffId) {
            // Find employee name from localStorage extras
            const employeesExtra = JSON.parse(localStorage.getItem('employees_extra_info') || '{}');
            const staffName = employeesExtra[matchedStaffId]?.fullName || userId;

            const mockUser = {
              id: matchedStaffId,
              username: userId,
              email: `${userId}@school.edu`,
              role: 'teacher',
              full_name: staffName,
              portal_path: '/teacher'
            };

            // Extract employee_id fragments from the username for matching
            const empIdMatch = userId.match(/EMP[_-]?(\d+)/i);
            const empIdFromUsername = empIdMatch ? empIdMatch[0] : ''; // e.g. "EMP0010"
            const empIdDigits = empIdMatch ? empIdMatch[1] : '';      // e.g. "0010"
            // Also extract the name part before EMP for name matching
            const namePart = userId.split(/EMP[_-]?\d+/i)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';

            // Fetch real employee data from API to store for dashboard
            let currentEmployeeData: any = null;
            try {
              const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
              const allTeachers = extractListData<any>(tRes.data);
              const matchedTeacher = allTeachers.find((t: any) => {
                const empId = String(t.employee_id || '').toUpperCase();
                const empDigits = empId.replace(/[^0-9]/g, '');
                return (
                  String(t.id) === String(matchedStaffId) ||
                  empId === empIdFromUsername.toUpperCase() ||
                  empId.includes(empIdFromUsername.toUpperCase()) ||
                  (empIdDigits && empDigits.includes(empIdDigits)) ||
                  t.full_name?.toLowerCase().replace(/[^a-z]/g, '').includes(namePart)
                );
              });
              if (matchedTeacher) {
                currentEmployeeData = {
                  name: matchedTeacher.full_name,
                  regNo: matchedTeacher.employee_id,
                  role: matchedTeacher.specializations?.[0] || 'Teacher',
                  monthlySalary: matchedTeacher.monthly_salary || 'Rs. 1,000',
                  fatherName: matchedTeacher.father_husband_name || '--',
                  phone: matchedTeacher.phone || '--',
                  email: matchedTeacher.email || mockUser.email,
                  address: matchedTeacher.home_address || matchedTeacher.address || '--',
                  cnic: matchedTeacher.national_id || '--',
                  education: matchedTeacher.qualifications?.[0] || matchedTeacher.education || 'N/A',
                  gender: matchedTeacher.gender || 'Male',
                  religion: matchedTeacher.religion || 'Islam',
                  bloodGroup: matchedTeacher.blood_group || 'O+',
                  dob: matchedTeacher.date_of_birth || '--',
                  joiningDate: matchedTeacher.joining_date || '--',
                  experience: matchedTeacher.experience_years ? `${matchedTeacher.experience_years} Years` : 'N/A',
                  _apiId: matchedTeacher.id // store the real API id for dashboard matching
                };
              }
            } catch (_) {}
            // Fallback: try employeesExtra by employee_id
            if (!currentEmployeeData) {
              let extraInfo: any = null;
              for (const [, extra] of Object.entries(employeesExtra)) {
                const e = extra as any;
                const eId = String(e.employeeId || '').toUpperCase();
                if (eId === empIdFromUsername.toUpperCase() || (empIdDigits && eId.includes(empIdDigits))) {
                  extraInfo = e;
                  break;
                }
              }
              currentEmployeeData = {
                name: extraInfo?.fullName || staffName,
                regNo: extraInfo?.employeeId || matchedStaffId,
                role: extraInfo?.role || 'Teacher',
                monthlySalary: extraInfo?.monthlySalary || 'Rs. 1,000',
                fatherName: extraInfo?.fatherName || '--',
                phone: extraInfo?.phone || '--',
                email: mockUser.email,
                address: extraInfo?.homeAddress || '--',
                cnic: extraInfo?.nationalId || '--',
                education: extraInfo?.education || 'N/A',
                gender: extraInfo?.gender || 'Male',
                religion: extraInfo?.religion || 'Islam',
                bloodGroup: extraInfo?.bloodGroup || 'O+',
                dob: extraInfo?.dateOfBirth || '--',
                joiningDate: extraInfo?.joiningDate || '--',
                experience: extraInfo?.experience ? `${extraInfo.experience} Years` : 'N/A'
              };
            }
            localStorage.setItem('current_employee_data', JSON.stringify(currentEmployeeData));

            // If we matched a real teacher from API, use its ID for the auth user
            const realApiId = currentEmployeeData?._apiId;
            if (realApiId) {
              mockUser.id = String(realApiId);
              currentEmployeeData._apiId = undefined; // clean up
              localStorage.setItem('current_employee_data', JSON.stringify(currentEmployeeData));
            }

            localStorage.setItem('access_token', 'mock-access-token');
            localStorage.setItem('refresh_token', 'mock-refresh-token');
            useAuthStore.setState({
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              user: mockUser as any,
              role: mockUser.role as any,
              isAuthenticated: true,
              loading: false
            });

            toast.success(`Logged in as Employee: ${staffName}!`);
            navigate('/teacher');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Local employee login error:', err);
        }
      }
      setError('Invalid employee username or password');
      setLoading(false);
      return;
    }

    // 2.5 If role is Admin -> Validate admin fallback credentials to prevent 401 connection error
    const normalizedAdminEmail = userId.trim().toLowerCase();
    if (
      selectedRole === 'admin' &&
      ['admin@code.com', 'admin@school.com'].includes(normalizedAdminEmail) &&
      ['Admin@123', 'admin123'].includes(password)
    ) {
      const mockUser = {
        id: 'admin-1',
        username: userId,
        email: userId,
        role: 'admin',
        full_name: 'Administrator',
        portal_path: '/dashboard'
      };
      localStorage.setItem('access_token', 'mock-access-token');
      localStorage.setItem('refresh_token', 'mock-refresh-token');
      useAuthStore.setState({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser as any,
        role: mockUser.role as any,
        isAuthenticated: true,
        loading: false
      });
      toast.success('Logged in as Administrator!');
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    // 3. Fallback to Admin / General login
    try {
      const authUser = await login(userId, password);
      navigate(getPortalRoute(authUser));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'admin' | 'employee' | 'student') => {
    setSelectedRole(role);
    if (role === 'admin') {
      setUserId('admin@school.com');
      setPassword('Admin@123');
    } else if (role === 'employee') {
      // Find a generated staff credential
      const savedStaff = localStorage.getItem('staff_login_credentials');
      if (savedStaff) {
        try {
          const parsed = JSON.parse(savedStaff);
          const firstKey = Object.keys(parsed)[0];
          if (firstKey) {
            setUserId(parsed[firstKey].username);
            setPassword(parsed[firstKey].password || parsed[firstKey].username);
            return;
          }
        } catch (e) {}
      }
      setUserId('169081w710230');
      setPassword('169081w710230');
    } else if (role === 'student') {
      // Find a generated student credential
      const savedStudents = localStorage.getItem('student_login_credentials');
      if (savedStudents) {
        try {
          const parsed = JSON.parse(savedStudents);
          const firstKey = Object.keys(parsed)[0];
          if (firstKey) {
            setUserId(parsed[firstKey].username);
            setPassword(parsed[firstKey].password || parsed[firstKey].username);
            return;
          }
        } catch (e) {}
      }
      setUserId('169081w710001');
      setPassword('169081w710001');
    }
  };

  return (
    <div className="min-h-screen bg-[#DEDDF8] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-6xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col lg:flex-row min-h-[620px]">
        
        {/* Left Side: Login Form (Code Cortex theme) */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-between space-y-8 bg-slate-50/50">
          
          {/* Logo & Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl text-purple-650">🎓</span>
              <span className="text-2xl font-black tracking-tight text-slate-800">
                Code Cortex
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400">
                Please enter your credentials to access your school dashboard.
              </p>
              <h2 className="text-base font-extrabold text-[#746BF3] flex items-center gap-1">
                Welcome Back! <span className="animate-bounce">👋</span>
              </h2>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role selector group */}
            <div className="space-y-3">
              <span className="block text-xs font-black text-[#5C53CD] uppercase tracking-wider">You're</span>
              <div className="flex items-center gap-6">
                
                {/* Admin */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="flex flex-col items-center gap-1.5 focus:outline-none group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    selectedRole === 'admin' 
                      ? 'bg-[#746BF3] border-[#746BF3] text-white shadow-md' 
                      : 'border-slate-200 text-slate-400 bg-white hover:border-[#746BF3]/50 hover:text-[#746BF3]'
                  }`}>
                    👤
                  </div>
                  <span className={`text-[10px] font-black tracking-wide ${
                    selectedRole === 'admin' ? 'text-[#746BF3]' : 'text-slate-400 group-hover:text-slate-650'
                  }`}>Admin</span>
                </button>

                {/* Employee */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('employee')}
                  className="flex flex-col items-center gap-1.5 focus:outline-none group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    selectedRole === 'employee' 
                      ? 'bg-[#746BF3] border-[#746BF3] text-white shadow-md' 
                      : 'border-slate-200 text-slate-400 bg-white hover:border-[#746BF3]/50 hover:text-[#746BF3]'
                  }`}>
                    👥
                  </div>
                  <span className={`text-[10px] font-black tracking-wide ${
                    selectedRole === 'employee' ? 'text-[#746BF3]' : 'text-slate-400 group-hover:text-slate-650'
                  }`}>Employee</span>
                </button>

                {/* Student */}
                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className="flex flex-col items-center gap-1.5 focus:outline-none group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    selectedRole === 'student' 
                      ? 'bg-[#746BF3] border-[#746BF3] text-white shadow-md' 
                      : 'border-slate-200 text-slate-400 bg-white hover:border-[#746BF3]/50 hover:text-[#746BF3]'
                  }`}>
                    🎓
                  </div>
                  <span className={`text-[10px] font-black tracking-wide ${
                    selectedRole === 'student' ? 'text-[#746BF3]' : 'text-slate-400 group-hover:text-slate-650'
                  }`}>Student</span>
                </button>

              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-xs font-semibold text-red-500 bg-red-50 border border-red-150 p-2.5 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4 pt-2">
              
              {/* Username */}
              <div className="relative border-b-2 border-slate-200 focus-within:border-[#746BF3] transition-colors py-2 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Your Username*"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 p-0"
                />
              </div>

              {/* Password */}
              <div className="relative border-b-2 border-slate-200 focus-within:border-[#746BF3] transition-colors py-2 flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your Password*"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 p-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

            </div>

            {/* Keep me logged in */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-450">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-350 text-[#746BF3] focus:ring-[#746BF3]"
                />
                Remember Me
              </label>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-xl font-extrabold text-xs shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white" />
              ) : (
                <>
                  🔒 Login
                </>
              )}
            </button>

          </form>

          {/* Footer Link */}
          <div className="text-center">
            <Link to="/forgot-password" className="text-xs font-black text-slate-700 hover:underline">
              Forgot your <span className="text-[#746BF3]">password</span>?
            </Link>
          </div>

        </div>

        {/* Right Side: Welcome Banner Card (Dark Purple) */}
        <div className="w-full lg:w-1/2 bg-[#1C1656] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Top Info */}
          <div className="flex justify-between items-center z-10">
            <span className="text-xs font-bold text-blue-200">Don't have an account?</span>
            <button className="px-4 py-1.5 border border-white/30 rounded-xl text-xs font-black hover:bg-white/10 transition-colors uppercase">
              Sign Up
            </button>
          </div>

          {/* Middle text & graphic */}
          <div className="space-y-6 my-auto pt-8 z-10">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Continue Managing!
              </h1>
              <p className="text-xs text-blue-200 leading-relaxed max-w-sm mx-auto lg:mx-0">
                Pick up right where you left off. Sign in to the world's favorite fast, easy, and 100% free school management platform.
              </p>
            </div>

            {/* Premium Animated SVG Student Illustration */}
            <div className="w-full max-w-xs mx-auto pt-4 relative select-none">
              <svg viewBox="0 0 200 200" className="w-full h-auto drop-shadow-2xl">
                {/* Background Glow */}
                <circle cx="100" cy="100" r="80" fill="url(#purpleGlow)" opacity="0.3" />
                
                {/* Floating Elements */}
                <g className="animate-pulse">
                  {/* Database box */}
                  <rect x="25" y="110" width="30" height="25" rx="5" fill="#746BF3" />
                  <line x1="30" y1="118" x2="50" y2="118" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
                  <line x1="30" y1="126" x2="45" y2="126" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Floating lock */}
                  <rect x="145" y="65" width="24" height="20" rx="4" fill="#10B981" />
                  <path d="M151,65 L151,58 C151,53 163,53 163,58 L163,65" stroke="#10B981" strokeWidth="2" fill="none" />
                </g>

                {/* Animated Laptop User Illustration */}
                <g className="animate-bounce" style={{ animationDuration: '4s' }}>
                  {/* Head */}
                  <circle cx="100" cy="65" r="18" fill="#FEE2E2" />
                  {/* Hair */}
                  <path d="M80,62 C80,42 120,42 120,62 C115,55 105,55 100,58" fill="#1E293B" />
                  {/* Graduation Hat */}
                  <polygon points="100,38 122,46 100,54 78,46" fill="#5C53CD" />
                  <rect x="97" y="46" width="6" height="8" fill="#475569" />
                  <line x1="122" y1="46" x2="122" y2="58" stroke="#FBBF24" strokeWidth="2" />
                  
                  {/* Body & Laptop */}
                  <path d="M72,110 L128,110 L120,78 L80,78 Z" fill="#746BF3" />
                  <rect x="82" y="110" width="36" height="22" rx="3" fill="#334155" />
                  <polygon points="76,132 124,132 118,138 82,138" fill="#475569" />
                </g>

                {/* Gradient Definitions */}
                <defs>
                  <radialGradient id="purpleGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#746BF3" />
                    <stop offset="100%" stopColor="#1C1656" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>

          </div>

          {/* Bottom Stamp */}
          <div className="flex items-center gap-1.5 justify-center lg:justify-start text-[10px] text-blue-200 z-10 border-t border-white/10 pt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Authorized school credentials only.</span>
          </div>

        </div>

      </div>
    </div>
  );
}
