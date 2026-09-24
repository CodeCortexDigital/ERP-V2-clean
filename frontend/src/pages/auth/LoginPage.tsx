import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Lock, Eye, EyeOff, ShieldCheck, GraduationCap, Briefcase, AlertCircle, ArrowRight, Loader2, School,
} from 'lucide-react';
import AuthShell, { GoogleMark } from '@/components/auth/AuthShell';
import schoolService from '@/services/school.service';
import { useTranslation } from 'react-i18next';

type LoginRole = 'admin' | 'employee' | 'student';

const ROLES: { id: LoginRole; label: string; icon: typeof User }[] = [
  { id: 'admin', label: 'auth.roleAdmin', icon: ShieldCheck },
  { id: 'employee', label: 'auth.roleStaff', icon: Briefcase },
  { id: 'student', label: 'auth.roleStudentParent', icon: GraduationCap },
];

// What to type depends on who is signing in; the server decides the portal.
const HINTS: Record<LoginRole, { placeholder: string; hint: string }> = {
  admin: { placeholder: 'admin@school.com', hint: 'auth.hintAdmin' },
  employee: { placeholder: 'EMP-001', hint: 'auth.hintStaff' },
  student: { placeholder: 'GVS-2026-001', hint: 'auth.hintStudent' },
};

const REMEMBER_KEY = 'login_remembered_username';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const { t } = useTranslation();
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
      setError(t('auth.errorEmpty'));
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
          (status === 401 ? t('auth.errorWrong') : '') ||
          (err.message === 'Network Error' ? t('auth.errorNetwork') : err.message) ||
          t('auth.errorWrong')
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
      setError(err?.response?.data?.error || t('auth.errorGoogle'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const { placeholder, hint } = HINTS[role];

  return (
    <AuthShell>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('auth.signIn')}</h2>
      <p className="mt-1.5 text-sm text-slate-500">{t('auth.welcome')}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {/* Who is signing in */}
        <div role="radiogroup" aria-label={t('auth.iAm')} className="grid grid-cols-[1fr_1fr_1.5fr] gap-1 p-1 rounded-xl bg-slate-100">
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
                <span className="whitespace-nowrap">{t(label)}</span>
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
          <label htmlFor="login-username" className="block text-sm font-semibold text-slate-700 mb-1.5">{t('auth.username')}</label>
          <div className="relative">
            <User className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              className="auth-input ps-10 pe-3"
            />
          </div>
          <p id="login-username-hint" className="mt-1.5 text-xs text-slate-500">{t(hint)}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">{t('auth.password')}</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-brand hover:underline">{t('auth.forgotPassword')}</Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
              className="auth-input ps-10 pe-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
          {t('auth.remember')}
        </label>

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> {t('auth.signingIn')}</>) : (<>{t('auth.signIn')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>)}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> {t('common.or')} <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={handleGoogle} disabled={googleLoading} className="auth-secondary-btn">
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
            {t('auth.continueGoogle')}
          </button>
        </>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <School className="w-4 h-4 text-brand" /> {t('auth.runningSchool')}
        </p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          {t('auth.runningSchoolText')}
        </p>
        <Link to="/signup" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          {t('auth.createSchool')} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </AuthShell>
  );
}
