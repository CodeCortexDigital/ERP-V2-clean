import { useEffect, useState } from 'react';
import { Copy, Download, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

export interface TwoStepStatus { enabled: boolean; since: string | null; recovery_codes_left: number; required: boolean }

/** Two-step sign-in for the signed-in person (P8): set up with an authenticator app, recovery codes, turn off. */
export default function TwoStepSection({ onEnabled }: { onEnabled?: () => void }) {
  const [st, setSt] = useState<TwoStepStatus | null>(null);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [prove, setProve] = useState<'off' | 'codes' | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api.get('/security/2fa/').then((r) => setSt(r.data)).catch(() => undefined);
  useEffect(() => { load(); }, []);

  const err = (e: any, fallback: string) => toast.error(e?.response?.data?.error || fallback);
  const start = async () => {
    setBusy(true);
    try { setSetup((await api.post('/security/2fa/setup/')).data); setCode(''); } catch (e) { err(e, 'Could not start.'); } finally { setBusy(false); }
  };
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/security/2fa/confirm/', { code });
      setCodes(r.data.recovery_codes); setSetup(null); setSt(r.data);
      toast.success('Two-step sign-in is on.');
    } catch (e2) { err(e2, 'That code is not right.'); } finally { setBusy(false); }
  };
  const proveAndDo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post(prove === 'off' ? '/security/2fa/disable/' : '/security/2fa/recovery-codes/', { password, code });
      if (prove === 'codes') setCodes(r.data.recovery_codes); else toast.success('Two-step sign-in is off.');
      setSt(r.data); setProve(null); setPassword(''); setCode('');
    } catch (e2) { err(e2, 'Could not do that.'); } finally { setBusy(false); }
  };
  const text = () => `Recovery codes for two-step sign-in (each works once):\n\n${(codes || []).join('\n')}\n`;

  if (!st) return null;
  const input = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm';
  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold';
  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-3" aria-labelledby="two-step-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="two-step-title" className="flex items-center gap-2 text-sm font-bold text-slate-800"><Smartphone size={15} /> Two-step sign-in
          <span className={`rounded-full px-2 text-[11px] ${st.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{st.enabled ? 'On' : 'Off'}</span>
          {st.required && <span className="rounded-full bg-amber-100 px-2 text-[11px] text-amber-800">Required for your account</span>}</h4>
        {st.enabled && !prove && !codes && (
          <div className="flex gap-2">
            <button onClick={() => setProve('codes')} className={`${btn} border border-slate-300 text-slate-700`}>New recovery codes</button>
            {!st.required && <button onClick={() => setProve('off')} className={`${btn} border border-rose-300 text-rose-700`}>Turn off</button>}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {st.enabled ? `Signing in asks for a code from your authenticator app. ${st.recovery_codes_left} recovery code${st.recovery_codes_left === 1 ? '' : 's'} left.`
          : 'After your password, signing in also asks for a 6-digit code from an app on your phone (Google Authenticator, Microsoft Authenticator, 1Password…). A stolen password alone is then not enough.'}
      </p>

      {!st.enabled && !setup && !codes && (
        <button onClick={start} disabled={busy} className={`${btn} bg-blue-600 text-white`}>{busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Set up two-step sign-in</button>
      )}

      {setup && (
        <form onSubmit={confirm} className="grid gap-4 sm:grid-cols-[auto_1fr] items-start">
          <img src={setup.qr} alt="QR code to scan with your authenticator app" className="h-44 w-44 rounded-lg border border-slate-200 bg-white" />
          <div className="space-y-2 text-sm">
            <p><b>1.</b> In your authenticator app, add an account and scan this code.</p>
            <p className="text-xs text-slate-500">Can't scan? Enter this key instead: <code className="break-all rounded bg-slate-100 px-1 font-mono text-slate-800">{setup.secret}</code></p>
            <p><b>2.</b> Enter the 6-digit code the app shows.</p>
            <div className="flex flex-wrap gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7}
                placeholder="123 456" aria-label="Code from the app" className={`${input} w-32 text-center tracking-widest`} />
              <button type="submit" disabled={busy || code.replace(/\D/g, '').length !== 6} className={`${btn} bg-blue-600 text-white`}>
                {busy ? <Loader2 size={13} className="animate-spin" /> : 'Turn on'}</button>
              <button type="button" onClick={() => setSetup(null)} className={`${btn} border border-slate-300`}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {prove && (
        <form onSubmit={proveAndDo} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-600">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={`${input} block`} /></label>
          <label className="text-xs text-slate-600">Code from the app (or a recovery code)<input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" className={`${input} block`} /></label>
          <button type="submit" disabled={busy || !password || !code} className={`${btn} ${prove === 'off' ? 'bg-rose-600' : 'bg-blue-600'} text-white`}>
            {prove === 'off' ? 'Turn off' : 'Make new codes'}</button>
          <button type="button" onClick={() => setProve(null)} className={`${btn} border border-slate-300`}>Cancel</button>
        </form>
      )}

      {codes && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Save these recovery codes now. They are shown only once.</p>
          <p className="text-xs text-amber-900">If you lose your phone, each code lets you sign in once. Keep them somewhere safe, not on the same phone.</p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-5">{codes.map((c) => <li key={c} className="rounded bg-white px-2 py-1 text-center">{c}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigator.clipboard.writeText(text()).then(() => toast.success('Copied.'))} className={`${btn} border border-amber-400 bg-white`}><Copy size={13} /> Copy</button>
            <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text()], { type: 'text/plain' })); a.download = 'recovery-codes.txt'; a.click(); }}
              className={`${btn} border border-amber-400 bg-white`}><Download size={13} /> Download</button>
            <button onClick={() => { setCodes(null); load(); onEnabled?.(); }} className={`${btn} bg-amber-600 text-white`}>I have saved them</button>
          </div>
        </div>
      )}
    </div>
  );
}
