import { useEffect, useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface Rule { key: string; label: string; action: 'delete' | 'anonymise'; unit: 'months' | 'years'; minimum_days: number; help: string; days: number; due_now: number }
const UNIT = { months: 30, years: 365 };

/** How long each kind of record is kept, and what happens after (P17). Off ("keep") until the school decides. */
export default function RetentionPanel() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const load = (data: { rules: Rule[] }) => {
    setRules(data.rules);
    setDraft(Object.fromEntries(data.rules.map((r) => [r.key, r.days ? String(Math.round(r.days / UNIT[r.unit])) : ''])));
  };
  useEffect(() => { api.get('/security/retention/').then((r) => load(r.data)).catch(() => toast.error('Could not load the retention rules.')); }, []);
  if (!rules) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>;
  const save = async () => {
    const body = Object.fromEntries(rules.map((r) => [r.key, draft[r.key] ? Number(draft[r.key]) * UNIT[r.unit] : 0]));
    const removing = rules.filter((r) => body[r.key] && !r.days);
    if (removing.length && !window.confirm(`From tonight, records older than these times are ${removing.map((r) => (r.action === 'anonymise' ? 'anonymised' : 'deleted')).join('/')} for good:\n\n${removing.map((r) => `• ${r.label}`).join('\n')}\n\nContinue?`)) return;
    setSaving(true);
    try { load((await api.put('/security/retention/', body)).data); toast.success('Saved. The rules run every night.'); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); } finally { setSaving(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4" aria-labelledby="retention-title">
      <div>
        <h3 id="retention-title" className="flex items-center gap-2 text-sm font-bold text-slate-800"><Archive size={15} /> Keep records</h3>
        <p className="text-xs text-slate-500 mt-1">How long each kind of record is kept. Leave a box empty to keep it. The rules run every night; what is removed is recorded in the activity log. Students who left are <b>anonymised</b> (marks, attendance and invoices stay for the school's figures); everything else is <b>deleted</b>.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {rules.map((r) => {
          const min = Math.ceil(r.minimum_days / UNIT[r.unit]);
          return (
            <li key={r.key} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.label} <span className={`ms-1 rounded px-1.5 text-[10px] font-bold ${r.action === 'anonymise' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-700'}`}>{r.action === 'anonymise' ? 'anonymise' : 'delete'}</span></p>
                <p className="text-xs text-slate-500">{r.help} {r.days ? `${r.due_now} would go tonight.` : r.due_now ? `${r.due_now} are older than the shortest allowed time (${min} ${r.unit}).` : ''}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">Keep for
                <input type="number" min={min} value={draft[r.key]} placeholder="always" aria-label={`${r.label}: keep for how many ${r.unit}`}
                  onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                {r.unit}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end"><button onClick={save} disabled={saving} className="auth-primary-btn w-auto px-6 disabled:opacity-50">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save retention</button></div>
    </div>
  );
}
