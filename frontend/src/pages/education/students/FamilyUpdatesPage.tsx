import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import portal, { ChangeRequest } from '@/services/portal.service';

const LABELS: Record<string, string> = {
  address: 'Address', city: 'City', state: 'State / province', postal_code: 'Postal code', country: 'Country',
  phone: 'Phone', email: 'Email', preferred_language: 'Preferred language', first_name: 'First name', last_name: 'Last name',
  mobile_phone: 'Mobile phone', home_phone: 'Home phone', work_phone: 'Work phone', occupation: 'Occupation', employer: 'Employer',
};
const FILTERS: Array<[string, string]> = [['pending', 'Waiting'], ['approved', 'Updated'], ['declined', 'Declined'], ['', 'All']];

/** Office: contact detail changes families asked for in the parent portal; approve to save them, or decline with a note. */
export default function FamilyUpdatesPage() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<ChangeRequest[] | null>(null);
  const [pending, setPending] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => portal.familyUpdates(status).then((r) => { setRows(r.results); setPending(r.pending); }).catch(() => setRows([]));
  useEffect(() => { setRows(null); load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (r: ChangeRequest, approve: boolean) => {
    try {
      await portal.reviewUpdate(r.id, approve, notes[r.id] || '');
      toast.success(approve ? 'Record updated and the family told.' : 'Declined and the family told.');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Could not save the review.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-slate-500">Address and contact changes sent by parents from the portal. Nothing is saved until you approve it.</p>
        {FILTERS.map(([v, label]) => (
          <button key={v || 'all'} onClick={() => setStatus(v)} aria-pressed={status === v}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${status === v ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>
            {label}{v === 'pending' ? ` ${pending}` : ''}
          </button>
        ))}
      </div>
      {!rows ? <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>
        : rows.length === 0 ? <p className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Nothing here.</p>
        : rows.map((r) => (
          <article key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="mr-auto">
                <p className="font-bold text-slate-900">{r.target}</p>
                <p className="text-xs text-slate-500">From {r.requested_by} · {new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{r.status_label}</span>
            </div>
            <table className="w-full text-sm mt-3">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Field</th><th>Now</th><th>Change to</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(r.changes).map(([f, c]) => (
                  <tr key={f}><td className="py-1.5 font-semibold pr-3">{LABELS[f] || f}</td><td className="text-slate-500 pr-3">{c.from || '—'}</td><td className="font-semibold text-slate-900">{c.to || '(blank)'}</td></tr>
                ))}
              </tbody>
            </table>
            {r.note && <p className="text-sm text-slate-600 mt-2">“{r.note}”</p>}
            {r.status === 'pending' ? (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <input aria-label="Note to the family" placeholder="Note to the family (optional)" className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <button onClick={() => review(r, false)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm font-bold"><X size={14} /> Decline</button>
                <button onClick={() => review(r, true)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold"><Check size={14} /> Approve & update</button>
              </div>
            ) : r.review_note ? <p className="text-xs text-slate-500 mt-2">Office note: {r.review_note}</p> : null}
          </article>
        ))}
    </div>
  );
}
