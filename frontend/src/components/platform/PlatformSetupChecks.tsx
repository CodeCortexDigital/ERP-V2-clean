import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, TriangleAlert } from 'lucide-react';
import api from '@/services/api';

interface Check { key: string; label: string; ok: boolean; advice: string }
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';

/** Platform owner: are the live site's keys and settings in place, and are demo accounts or passwords gone (P7). */
export default function PlatformSetupChecks() {
  const [data, setData] = useState<{ checks: Check[]; failing: number; env: string } | null>(null);
  useEffect(() => { api.get('/security/setup-checks/').then((r) => setData(r.data)).catch(() => undefined); }, []);
  if (!data) return null;
  return (
    <section className={`${card} p-4`} aria-labelledby="setup-title">
      <h2 id="setup-title" className="flex flex-wrap items-center gap-2 font-bold text-slate-800"><KeyRound size={16} /> Live site settings
        <span className={`rounded-full px-2 text-xs ${data.failing ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          {data.failing ? `${data.failing} to fix` : 'All set'}</span>
        <span className="text-xs font-normal text-slate-500">Site: {data.env}</span></h2>
      <p className="text-xs text-slate-500 mb-2">Keys belong in Render's environment, never in the code. See docs/KEY_ROTATION.md to change one.</p>
      <ul className="divide-y divide-slate-100 text-sm">
        {data.checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2 py-1.5">
            {c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-label="OK" />
              : <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-label="To fix" />}
            <div><span className={c.ok ? 'text-slate-700' : 'font-semibold text-slate-800'}>{c.label}</span>
              {!c.ok && c.advice && <p className="text-xs text-slate-600 break-words">{c.advice}</p>}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
