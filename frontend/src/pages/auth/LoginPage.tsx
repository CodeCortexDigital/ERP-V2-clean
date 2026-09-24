import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Lock, Eye, EyeOff, ShieldCheck, GraduationCap, Briefcase, AlertCircle, ArrowRight, Loader2, School,
} from 'lucide-react';
import AuthShell, { GoogleMark } from '@/components/auth/AuthShell';
import schoolService from '@/services/school.service';

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

const REMEMBER_KEY = 'login_remembered_username';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const [role, setRole] = useState<LoginRole>('admin');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
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
    schoolService.signupConfig().then((c) => setGoogleEnabled(c.google_sign_in)).catch(() => setGoogleEnabled(false));
  }, []);

  const goToPortal = (authUser: any) =>
    navigate(authUser?.portal_path || (authUser?.role === 'student' ? '/student' : '/dashboard'));

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
      goToPortal(authUser);
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

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    let idToken = '';
    try {
      const { signInWithGoogle } = await import('@/services/firebase');
      idToken = await signInWithGoogle();
      goToPortal(await googleLogin(idToken));
    } catch (err: any) {
      if (err?.response?.data?.needs_signup) {
        // New Google user: they can create their own school with this account.
        navigate('/signup', { state: { googleToken: idToken, email: err.response.data.email, name: err.response.data.name } });
        return;
      }
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      setError(err?.response?.data?.error || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const { placeholder, hint } = HINTS[role];

  return (
    <AuthShell>
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

        <div>
          <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
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
              className="auth-input pl-10 pr-3"
            />
          </div>
          <p id="login-username-hint" className="mt-1.5 text-xs text-slate-500">{hint}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">Password</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:underline">Forgot password?</Link>
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
              className="auth-input pl-10 pr-11"
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

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>) : (<>Sign in <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={handleGoogle} disabled={googleLoading} className="auth-secondary-btn">
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
            Continue with Google
          </button>
        </>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <School className="w-4 h-4 text-brand" /> Running a school?
        </p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Create your school's own account in a minute. Staff, students and parents get their logins from you
          (printed on job offer and admission letters).
        </p>
        <Link to="/signup" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          Create your school <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </AuthShell>
  );
}
