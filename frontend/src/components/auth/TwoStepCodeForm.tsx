import { useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2, Smartphone } from 'lucide-react';

/** Second step of signing in (P8): a 6-digit code from the authenticator app, or a recovery code. */
export default function TwoStepCodeForm({ email, onSubmit, onRestart }: {
  email: string; onSubmit: (code: string) => Promise<unknown>; onRestart: () => void;
}) {
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(code.trim());
    } catch (err: any) {
      if (err?.response?.data?.expired) { onRestart(); return; }
      setError(err?.response?.data?.error || 'That code did not work. Try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"><Smartphone className="w-6 h-6 text-brand" /> Two-step sign-in</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {recovery ? 'Enter one of the recovery codes you saved when you set this up. Each one works once.'
            : `Open your authenticator app and enter the 6-digit code for ${email || 'your account'}.`}
        </p>
      </div>
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="two-step-code" className="block text-sm font-semibold text-slate-700 mb-1.5">{recovery ? 'Recovery code' : 'Code'}</label>
        <input id="two-step-code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="one-time-code"
          inputMode={recovery ? 'text' : 'numeric'} maxLength={recovery ? 20 : 7} placeholder={recovery ? 'abcde-fghjk' : '123 456'}
          className="auth-input px-3 text-center text-lg tracking-[0.3em]" />
      </div>
      <button type="submit" disabled={busy || !code.trim()} className="auth-primary-btn">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify and sign in'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> Back
        </button>
        <button type="button" onClick={() => { setRecovery((v) => !v); setCode(''); setError(''); }} className="font-semibold text-brand hover:underline">
          {recovery ? 'Use the app instead' : 'Lost your phone? Use a recovery code'}
        </button>
      </div>
      {recovery && <p className="text-xs text-slate-500">No recovery codes either? Ask your school office to reset your two-step sign-in.</p>}
    </form>
  );
}
