import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Download, KeyRound, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import security, { SignInRow } from '@/services/security.service';
import api from '@/services/api';
import TwoStepSection from './TwoStepSection';

const TONE: Record<string, string> = { success: 'bg-emerald-100 text-emerald-700', failed: 'bg-amber-100 text-amber-800', locked: 'bg-rose-100 text-rose-700', disabled: 'bg-slate-200 text-slate-700' };

/** Everyone's own security: recent sign-ins, sign out everywhere, and a copy of their data. */
export default function MySecurityPanel() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [data, setData] = useState<{ sign_ins: SignInRow[]; failed_since_last: number; deletion_requested: boolean; email?: string; email_verified?: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { security.me().then(setData).catch(() => toast.error('Could not load your sign-ins.')); }, []);

  const signOutAll = async () => {
    if (!window.confirm('Sign out on every device, including this one?')) return;
    setBusy('out');
    try {
      await security.signOutEverywhere();
      logout();
      toast.success('Signed out everywhere. Sign in again to continue.');
      navigate('/login');
    } catch { toast.error('Could not sign out everywhere.'); setBusy(''); }
  };
  const withdraw = async () => {
    try { const r = await security.withdrawDeletion(); toast.success(r.message); setData((d) => d && { ...d, deletion_requested: false }); } catch { toast.error('Could not withdraw the request.'); }
  };
  const download = async () => {
    setBusy('data');
    try { await security.downloadMyData(); } catch { toast.error('Could not prepare your data.'); } finally { setBusy(''); }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4" aria-labelledby="my-security">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="my-security" className="flex items-center gap-2 text-sm font-bold text-slate-800"><KeyRound size={15} /> My sign-ins &amp; data</h3>
          <p className="text-xs text-slate-500 mt-1">Where and when your account was used. If you don't recognise a sign-in, change your password and sign out everywhere.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
            {busy === 'data' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download my data
          </button>
          <button onClick={signOutAll} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700">
            {busy === 'out' ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Sign out everywhere
          </button>
        </div>
      </div>
      {data && data.failed_since_last > 0 && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} /> {data.failed_since_last} wrong password{data.failed_since_last === 1 ? ' was' : 's were'} tried on your account since you last signed in.
        </p>
      )}
      {data && data.email_verified === false && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-900">
          Your email address ({data.email}) isn't confirmed yet. Confirming it makes sure you can reset your password.
          <button onClick={async () => { try { toast.success((await api.post('/security/verify-email/send/', { origin: window.location.origin })).data.message); } catch (e: any) { toast.error(e?.response?.data?.message || 'Could not send.'); } }}
            className="font-semibold text-blue-700">Send confirmation email</button>
        </p>
      )}
      <TwoStepSection />
      {data?.deletion_requested && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
          You have asked the school office to delete your account.
          <button onClick={withdraw} className="font-semibold text-blue-600">Withdraw the request</button>
        </p>
      )}
      {!data ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <ul className="divide-y divide-slate-100">
          {data.sign_ins.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="text-slate-700">{new Date(e.when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any)}
                <span className="block text-xs text-slate-500">{[e.device, e.ip].filter(Boolean).join(' · ') || 'Unknown device'}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[e.outcome]}`}>{e.outcome_label}</span>
            </li>
          ))}
          {!data.sign_ins.length && <li className="py-4 text-sm text-slate-500">No sign-ins recorded yet.</li>}
        </ul>
      )}
    </section>
  );
}
