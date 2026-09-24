import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Lock, Eye, EyeOff, ShieldCheck, GraduationCap, Briefcase, AlertCircle,
  CalendarCheck, Wallet, Sparkles, ArrowRight, Loader2,
} from 'lucide-react';

type LoginRole = 'admin' | 'employee' | 'student';

const ROLES: { id: LoginRole; label: string; icon: typeof User }[] = [
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'employee', label: 'Staff', icon: Briefcase },
  { id: 'student', label: 'Student / Parent', icon: GraduationCap },
];

// What to type depends on who is signing in; the server decides the portal.
const HINTS: Record<LoginRole, { placeholder: string; hint: string }> = {
  admin: { placeholder: 'admin@school.com', hint: 'Your admin email address.' },
  employee: { placeholder: 'e.g. EMP-001', hint: 'Your Employee ID from the job offer letter, or your email.' },
  student: { placeholder: 'e.g. DS-2026061', hint: 'Students: your Student ID. Parents: the email on the admission letter.' },
};

const FEATURES = [
  { icon: CalendarCheck, title: 'Attendance & timetables', text: 'Daily attendance, reports and class schedules.' },
  { icon: Wallet, title: 'Fees & finance', text: 'Invoices, collections and defaulters at a glance.' },
  { icon: Sparkles, title: 'AI assistant', text: 'Ask questions about your school in plain language.' },
];

const REMEMBER_KEY = 'login_remembered_username';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState<LoginRole>('admin');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      // Older builds kept fake portal logins in the browser; they are never valid.
      localStorage.removeItem('staff_login_credentials');
      localStorage.removeItem('student_login_credentials');
      const remembered = localStorage.getItem(REMEMBER_KEY);
      if (remembered) {
        setUserId(remembered);
        setRememberMe(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const authUser = await login(userId.trim(), password);
      try {
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, userId.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* storage unavailable */
      }
      navigate(authUser?.portal_path || (authUser?.role === 'student' ? '/student' : '/dashboard'));
    } catch (err: any) {
      const status = err.response?.status;
      setError(
        err.response?.data?.error ||
          (status === 401 ? 'Incorrect username or password.' : '') ||
          (err.message === 'Network Error' ? 'Cannot reach the server. Check your connection and try again.' : err.message) ||
          'Sign in failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const { placeholder, hint } = HINTS[role];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Brand panel (large screens) */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 bg-brand-gradient relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold">CodeCortex</p>
            <p className="text-xs text-white/70">School ERP</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl xl:text-[2.6rem] font-extrabold leading-tight tracking-tight !text-white">
            Everything your school runs on, in one place.
          </h1>
          <p className="mt-4 text-white/75 text-[15px] leading-relaxed">
            Students, staff, fees and results for admins, teachers, parents and students, each with their own portal.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/70">
          <ShieldCheck className="w-4 h-4" />
          Secure sign-in. Your data stays with your school.
        </p>
      </aside>

      {/* Sign-in form */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          {/* Compact brand (small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <span className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <p className="font-bold text-slate-900">CodeCortex</p>
              <p className="text-xs text-slate-500">School ERP</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Welcome back. Choose who you are and enter your login.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {/* Who is signing in */}
            <div role="radiogroup" aria-label="I am signing in as" className="grid grid-cols-[1fr_1fr_1.5fr] gap-1 p-1 rounded-xl bg-slate-100">
              {ROLES.map(({ id, label, icon: Icon }) => {
                const active = role === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => { setRole(id); setError(''); }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-[13px] font-semibold transition-all ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : ''}`} />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-username"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={placeholder}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby="login-username-hint"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--app-accent)] focus:ring-4 focus:ring-[color:rgb(var(--app-accent-rgb)/0.15)] transition"
                />
              </div>
              <p id="login-username-hint" className="mt-1.5 text-xs text-slate-500">{hint}</p>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--app-accent)] focus:ring-4 focus:ring-[color:rgb(var(--app-accent-rgb)/0.15)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[color:var(--app-accent)]"
              />
              Remember my username on this device
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-brand font-semibold text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-70 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">New here?</span> Your school creates your account. Your
            login is printed on your admission letter (students and parents) or job offer letter (staff).
          </div>
        </div>
      </main>
    </div>
  );
}
