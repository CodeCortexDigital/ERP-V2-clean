import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import AuthShell, { GoogleMark } from '@/components/auth/AuthShell';
import schoolService from '@/services/school.service';
import { useAuthStore } from '@/store/authStore';

interface GoogleState {
  googleToken?: string;
  email?: string;
  name?: string;
}

type Fields = 'school_name' | 'city' | 'phone' | 'admin_name' | 'email' | 'password';

/** Self-service: create a school and become its administrator. */
export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const startSession = useAuthStore((s) => s.startSession);
  const fromGoogle = (location.state as GoogleState | null) || {};

  const [form, setForm] = useState<Record<Fields, string>>({
    school_name: '', city: '', phone: '', admin_name: fromGoogle.name || '', email: fromGoogle.email || '', password: '',
  });
  const [googleToken, setGoogleToken] = useState(fromGoogle.googleToken || '');
  const [googleEmail, setGoogleEmail] = useState(fromGoogle.googleToken ? fromGoogle.email || '' : '');
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Fields, string>>>({});

  useEffect(() => {
    schoolService.signupConfig().then((c) => setGoogleEnabled(c.google_sign_in)).catch(() => setGoogleEnabled(false));
  }, []);

  const set = (key: Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const submit = async (idToken?: string) => {
    const token = idToken || googleToken;
    const errs: Partial<Record<Fields, string>> = {};
    if (form.school_name.trim().length < 3) errs.school_name = 'Enter your school name.';
    if (!token) {
      if (!form.admin_name.trim()) errs.admin_name = 'Enter your name.';
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
      if (form.password.length < 8) errs.password = 'Use at least 8 characters.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setError('');
    try {
      const data = await schoolService.signup(
        token
          ? { school_name: form.school_name, city: form.city, phone: form.phone, id_token: token }
          : { ...form },
      );
      startSession(data);
      navigate('/dashboard?welcome=1', { replace: true });
    } catch (err: any) {
      const body = err?.response?.data;
      if (body?.fields) setFieldErrors(body.fields);
      setError(body?.error || (err?.message === 'Network Error' ? 'Cannot reach the server.' : 'Could not create the school.'));
      if (err?.response?.status === 401) setGoogleToken(''); // Google token expired: ask again
    } finally {
      setLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    if (form.school_name.trim().length < 3) {
      setFieldErrors({ school_name: 'Enter your school name first.' });
      return;
    }
    setError('');
    try {
      const { signInWithGoogle, auth } = await import('@/services/firebase');
      const token = await signInWithGoogle();
      setGoogleToken(token);
      setGoogleEmail(auth.currentUser?.email || '');
      await submit(token);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      setError('Google sign-up failed. Please try again.');
    }
  };

  const field = (key: Fields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`signup-${key}`} className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        id={`signup-${key}`}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={Boolean(fieldErrors[key])}
        aria-describedby={fieldErrors[key] ? `signup-${key}-error` : undefined}
        className={`auth-input px-3.5 ${fieldErrors[key] ? '!border-rose-400' : ''}`}
        {...props}
      />
      {fieldErrors[key] && <p id={`signup-${key}-error`} className="mt-1.5 text-xs text-rose-600">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <AuthShell wide>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Create your school</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Your school gets its own private space. You'll be its administrator and can add staff, students and parents.
      </p>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-6 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">School</legend>
          {field('school_name', 'School name', { placeholder: 'e.g. Green Valley School', autoComplete: 'organization' })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('city', 'City (optional)', { placeholder: 'e.g. Lahore', autoComplete: 'address-level2' })}
            {field('phone', 'Phone (optional)', { placeholder: 'e.g. 042 1234567', type: 'tel', autoComplete: 'tel' })}
          </div>
        </fieldset>

        {googleToken ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Signing up with Google</p>
              <p className="text-xs">You'll sign in as <b>{googleEmail || form.email}</b>. No password needed.</p>
              <button type="button" onClick={() => setGoogleToken('')} className="mt-1 text-xs font-semibold underline">
                Use email and password instead
              </button>
            </div>
          </div>
        ) : (
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Your administrator account</legend>
            {field('admin_name', 'Your name', { placeholder: 'e.g. Sana Malik', autoComplete: 'name' })}
            {field('email', 'Email', { type: 'email', placeholder: 'you@school.com', autoComplete: 'email' })}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`auth-input pl-3.5 pr-11 ${fieldErrors.password ? '!border-rose-400' : ''}`}
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
              {fieldErrors.password
                ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.password}</p>
                : <p className="mt-1.5 text-xs text-slate-500">Avoid common words; mix letters, numbers and a symbol.</p>}
            </div>
          </fieldset>
        )}

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating your school…</>) : (<>Create school <ArrowRight className="w-4 h-4" /></>)}
        </button>
      </form>

      {googleEnabled && !googleToken && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={signUpWithGoogle} disabled={loading} className="auth-secondary-btn">
            <GoogleMark /> Sign up with Google
          </button>
        </>
      )}

      <p className="mt-8 text-sm text-slate-500 text-center">
        Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
