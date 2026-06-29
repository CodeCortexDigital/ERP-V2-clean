import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, LogIn, User, ShieldCheck, CheckCircle2, Award, Users, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const [loginTab, setLoginTab] = useState<'roll' | 'email'>('roll');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
      return;
    }

    try {
      const authUser = await googleLogin(token);
      navigate(getPortalRoute(authUser));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLoginTrigger = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    },
    flow: 'implicit',
  });

  const getPortalRoute = (user: any) => user?.portal_path || (user?.role === 'student' ? '/student' : user?.role === 'teacher' ? '/teacher' : user?.role === 'parent' ? '/parent' : '/dashboard');

  const quickLoginAccounts: Record<string, { userId: string; password: string }> = {
    admin: { userId: 'admin@code.com', password: 'Admin@123' },
    teacher: { userId: 'teacher@code.com', password: 'Teacher@123' },
    parent: { userId: 'parent@code.com', password: 'Parent@123' },
    student: { userId: 'student43@example.com', password: 'Student@123' },
  };

  const handleQuickLogin = async (role: 'admin' | 'teacher' | 'parent' | 'student') => {
    const creds = quickLoginAccounts[role];
    setUserId(creds.userId);
    setPassword(creds.password);
    setError('');
    setLoading(true);

    try {
      const authUser = await login(creds.userId, creds.password);
      navigate(getPortalRoute(authUser));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid user ID or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      setError('Please enter your user ID and password');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const authUser = await login(userId, password);
      navigate(getPortalRoute(authUser));
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid user ID or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b3bb6] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-white selection:text-[#1b3bb6]">
      {/* Background Decorative Circles */}
      <div className="absolute top-12 left-10 w-48 h-48 rounded-full border border-white/10 pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 right-10 w-96 h-96 rounded-full bg-blue-600/30 blur-3xl pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="w-full bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-[#1b3bb6] rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
              CC
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Code Cortex <span className="text-xs bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">ERP</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-blue-100">
            <a href="#portal" className="hover:text-white transition-colors">Portal Info</a>
            <a href="#features" className="hover:text-white transition-colors">Modules</a>
            <a href="#support" className="hover:text-white transition-colors">Help & Support</a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg text-white">
              Unified Console
            </span>
          </div>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Left Side: Hero Branding & Info */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> #1 Globally Verified School Management Software
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">Online School</span> Management Software
          </h1>

          <p className="text-blue-100 text-base md:text-lg max-w-xl font-medium leading-relaxed">
            You can now manage your school, college, or educational institution seamlessly with Code Cortex ERP — completely integrated for students, teachers, parents, and administrators.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl backdrop-blur-sm">
              <Users className="w-6 h-6 text-blue-300 mb-2" />
              <p className="text-2xl font-black text-white">314+</p>
              <p className="text-xs text-blue-200 font-semibold">Active Students</p>
            </div>

            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl backdrop-blur-sm">
              <GraduationCap className="w-6 h-6 text-purple-300 mb-2" />
              <p className="text-2xl font-black text-white">45+</p>
              <p className="text-xs text-blue-200 font-semibold">Faculty Members</p>
            </div>

            <div className="bg-white/10 border border-white/15 p-4 rounded-2xl backdrop-blur-sm col-span-2 sm:col-span-1">
              <Award className="w-6 h-6 text-amber-300 mb-2" />
              <p className="text-2xl font-black text-white">100%</p>
              <p className="text-xs text-blue-200 font-semibold">Verified Accuracy</p>
            </div>
          </div>
        </div>

        {/* Right Side: White Login Console Card */}
        <div className="lg:col-span-5">
          <div className="bg-white text-slate-800 rounded-3xl p-8 shadow-2xl border border-blue-100 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Portal Login</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Sign in to access your personal dashboard</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <LogIn className="w-6 h-6" />
              </div>
            </div>

            {/* Console Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => setLoginTab('roll')}
                className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition ${
                  loginTab === 'roll' ? 'bg-[#1b3bb6] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By User ID / Roll No
              </button>
              <button
                type="button"
                onClick={() => setLoginTab('email')}
                className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-lg transition ${
                  loginTab === 'email' ? 'bg-[#1b3bb6] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Email Account
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {loginTab === 'roll' ? 'User ID / Roll No / ID (e.g. STU00043)' : 'Registered Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder={loginTab === 'roll' ? 'admin / teacher / student43' : 'user@example.com'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                    required
                  />
                </div>
              </div>

              {/* CAPTCHA simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={captchaChecked}
                    onChange={(e) => setCaptchaChecked(e.target.checked)}
                    className="w-5 h-5 text-[#1b3bb6] rounded focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">I'm not a robot</span>
                </label>
                <div className="flex flex-col items-end text-[10px] text-slate-400">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>reCAPTCHA Privacy</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <Link to="/forgot-password" className="text-blue-600 font-bold hover:underline">
                  Forgot Password?
                </Link>
                <span className="text-slate-500 text-[11px]">Authorized Access</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1b3bb6] hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In to Portal
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Presets */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Instant Demo Portal Presets</p>
              <div className="grid grid-cols-4 gap-2">
                {(['admin', 'teacher', 'parent', 'student'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleQuickLogin(r)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 rounded-lg text-xs font-bold capitalize transition text-slate-700"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
