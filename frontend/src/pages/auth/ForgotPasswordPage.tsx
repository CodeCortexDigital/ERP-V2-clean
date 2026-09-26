import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import api from '@/services/api';

/** Forgot password: we email a one-time link to reset it (the same answer whether or not the account exists). */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/security/password-reset/', { email, origin: window.location.origin }, { skipGlobalToast: true } as any);
      setSent(r.data.message);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
      {sent ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <p className="flex items-center gap-2 font-semibold"><MailCheck className="w-4 h-4" /> Check your email</p>
          <p className="mt-1">{sent}</p>
          <p className="mt-2 text-emerald-800">Students without an email address, and anyone who doesn't receive the email: ask the school office to reset your password.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">Enter the email address you sign in with. We'll send you a link to choose a new password.</p>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="reset-email">Email address
            <input id="reset-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              className="auth-input mt-1.5 w-full px-3" autoComplete="email" />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={loading} className="auth-primary-btn">{loading && <Loader2 className="w-4 h-4 animate-spin" />} Send reset link</button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="w-4 h-4" /> Back to sign in</Link>
    </AuthShell>
  );
}
