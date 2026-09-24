import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AuthShell, { GoogleMark } from '@/components/auth/AuthShell';
import schoolService, { type SignupConfig } from '@/services/school.service';
import { useAuthStore } from '@/store/authStore';
import { useLocaleStore } from '@/store/localeStore';
import { LANGUAGES } from '@/i18n/languages';
import { browserTimezone, guessCurrency } from '@/i18n/guessCurrency';

interface GoogleState {
  googleToken?: string;
  email?: string;
  name?: string;
}

type Fields = 'school_name' | 'city' | 'phone' | 'admin_name' | 'email' | 'password' | 'currency' | 'language';

/** Self-service: create a school (with its currency and language) and become its administrator. */
export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const startSession = useAuthStore((s) => s.startSession);
  const setSchoolLocale = useLocaleStore((s) => s.setSchoolLocale);
  const fromGoogle = (location.state as GoogleState | null) || {};

  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [form, setForm] = useState<Record<Fields, string>>({
    school_name: '', city: '', phone: '', admin_name: fromGoogle.name || '', email: fromGoogle.email || '', password: '',
    // Default to the language the visitor already picked on the sign-in page.
    currency: '', language: useLocaleStore.getState().userLanguage || i18n.language || 'en',
  });
  const [googleToken, setGoogleToken] = useState(fromGoogle.googleToken || '');
  const [googleEmail, setGoogleEmail] = useState(fromGoogle.googleToken ? fromGoogle.email || '' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Fields, string>>>({});

  useEffect(() => {
    schoolService
      .signupConfig()
      .then((c) => {
        setConfig(c);
        // Suggest the visitor's local currency; they can change it.
        setForm((f) => ({ ...f, currency: f.currency || guessCurrency(c.currencies.map((x) => x.code), c.defaults.currency) }));
      })
      .catch(() => setForm((f) => ({ ...f, currency: f.currency || 'PKR' })));
  }, []);

  const currencies = useMemo(
    () => [...(config?.currencies || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [config],
  );

  const set = (key: Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const submit = async (idToken?: string) => {
    const token = idToken || googleToken;
    const errs: Partial<Record<Fields, string>> = {};
    if (form.school_name.trim().length < 3) errs.school_name = t('signup.errSchoolName');
    if (!token) {
      if (!form.admin_name.trim()) errs.admin_name = t('signup.errName');
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = t('signup.errEmail');
      if (form.password.length < 8) errs.password = t('signup.errPassword');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setError('');
    const locale = { currency: form.currency || 'PKR', language: form.language || 'en', timezone: browserTimezone() };
    try {
      const data = await schoolService.signup(
        token
          ? { school_name: form.school_name, city: form.city, phone: form.phone, id_token: token, ...locale }
          : { ...form, ...locale },
      );
      startSession(data);
      if (data.tenant && (data.tenant as any).locale) setSchoolLocale((data.tenant as any).locale);
      navigate('/dashboard?welcome=1', { replace: true });
    } catch (err: any) {
      const body = err?.response?.data;
      if (body?.fields) setFieldErrors(body.fields);
      setError(body?.error || (err?.message === 'Network Error' ? t('auth.errorNetwork') : t('auth.errorWrong')));
      if (err?.response?.status === 401) setGoogleToken(''); // Google token expired: ask again
    } finally {
      setLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    if (form.school_name.trim().length < 3) {
      setFieldErrors({ school_name: t('signup.errSchoolNameFirst') });
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
      setError(t('auth.errorGoogle'));
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
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('signup.title')}</h2>
      <p className="mt-1.5 text-sm text-slate-500">{t('signup.intro')}</p>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-6 space-y-6" noValidate>
        <fieldset className="space-y-4">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('signup.sectionSchool')}</legend>
          {field('school_name', t('signup.schoolName'), { placeholder: t('signup.schoolNamePlaceholder'), autoComplete: 'organization' })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('city', t('signup.city'), { autoComplete: 'address-level2' })}
            {field('phone', t('signup.phone'), { type: 'tel', autoComplete: 'tel' })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-currency" className="block text-sm font-semibold text-slate-700 mb-1.5">{t('signup.currency')}</label>
              <select id="signup-currency" value={form.currency} onChange={set('currency')} className="auth-input px-3">
                {!currencies.length && <option value={form.currency}>{form.currency || 'PKR'}</option>}
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code} · {c.symbol})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="signup-language" className="block text-sm font-semibold text-slate-700 mb-1.5">{t('signup.language')}</label>
              <select id="signup-language" value={form.language} onChange={set('language')} className="auth-input px-3">
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.native}{l.native !== l.name ? ` (${l.name})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">{t('signup.currencyHint')} {t('signup.languageHint')}</p>
        </fieldset>

        {googleToken ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('signup.googleSigningUp')}</p>
              <p className="text-xs">{t('signup.googleAs', { email: googleEmail || form.email })}</p>
              <button type="button" onClick={() => setGoogleToken('')} className="mt-1 text-xs font-semibold underline">
                {t('signup.useEmailInstead')}
              </button>
            </div>
          </div>
        ) : (
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t('signup.sectionAdmin')}</legend>
            {field('admin_name', t('signup.yourName'), { autoComplete: 'name' })}
            {field('email', t('signup.email'), { type: 'email', placeholder: 'you@school.com', autoComplete: 'email', dir: 'ltr' })}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-semibold text-slate-700 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`auth-input ps-3.5 pe-11 ${fieldErrors.password ? '!border-rose-400' : ''}`}
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
              {fieldErrors.password
                ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.password}</p>
                : <p className="mt-1.5 text-xs text-slate-500">{t('signup.passwordHint')}</p>}
            </div>
          </fieldset>
        )}

        <button type="submit" disabled={loading} className="auth-primary-btn">
          {loading
            ? (<><Loader2 className="w-4 h-4 animate-spin" /> {t('signup.creating')}</>)
            : (<>{t('signup.create')} <ArrowRight className="w-4 h-4 rtl:rotate-180" /></>)}
        </button>
      </form>

      {config?.google_sign_in && !googleToken && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> {t('common.or')} <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={signUpWithGoogle} disabled={loading} className="auth-secondary-btn">
            <GoogleMark /> {t('signup.google')}
          </button>
        </>
      )}

      <p className="mt-8 text-sm text-slate-500 text-center">
        {t('signup.haveAccount')} <Link to="/login" className="font-semibold text-brand hover:underline">{t('auth.signIn')}</Link>
      </p>
    </AuthShell>
  );
}
