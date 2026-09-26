import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import api from '@/services/api';

/** /reset-password?uid=…&token=… (from the email): choose a new password. /verify-email?token=… confirms an email address. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== again) { setError('The two passwords are different.'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/security/password-reset/confirm/', { uid, token, password }, { skipGlobalToast: true } as any);
      setDone(r.data.message);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
      {!uid || !token ? (
        <p className="mt-6 text-sm text-slate-600">This link is incomplete. <Link to="/forgot-password" className="font-semibold text-brand">Ask for a new one</Link>.</p>
      ) : done ? (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="w-4 h-4" /> {done}</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="new-pw">New password
            <span className="relative block mt-1.5">
              <input id="new-pw" type={show ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input w-full px-3 pe-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
          </label>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="new-pw-2">The same again
            <input id="new-pw-2" type={show ? 'text' : 'password'} required value={again} onChange={(e) => setAgain(e.target.value)} className="auth-input mt-1.5 w-full px-3" autoComplete="new-password" />
          </label>
          <p className="text-xs text-slate-500">Use at least 8 characters (your school may ask for more). Avoid common words and your name.</p>
          {error && <p role="alert" className="text-sm text-rose-600">{error}{/not valid/.test(error) && <> <Link to="/forgot-password" className="font-semibold underline">Ask for a new link</Link>.</>}</p>}
          <button type="submit" disabled={loading} className="auth-primary-btn">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Save new password</button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    api.post('/security/verify-email/confirm/', { token: params.get('token') || '' }, { skipGlobalToast: true } as any)
      .then((r) => setState({ ok: true, message: r.data.message }))
      .catch((e) => setState({ ok: false, message: e?.response?.data?.error || 'This link is not valid.' }));
  }, [params]);
  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Confirm your email</h1>
      {!state ? <Loader2 className="mt-6 animate-spin text-slate-400" /> : (
        <p role="status" className={`mt-6 flex items-center gap-2 rounded-xl border p-4 text-sm ${state.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
          {state.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {state.message}
        </p>
      )}
      <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">Go to sign in</Link>
    </AuthShell>
  );
}

export default ResetPasswordPage;
