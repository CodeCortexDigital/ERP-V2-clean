import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import library, { errorText, LibraryReport, LibraryRules } from '@/services/library.service';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const RULES: Array<[keyof LibraryRules, string]> = [
  ['loan_days_student', 'Loan days (students)'], ['loan_days_staff', 'Loan days (staff)'],
  ['max_loans_student', 'Books at a time (students)'], ['max_loans_staff', 'Books at a time (staff)'],
  ['max_renewals', 'Renewals allowed'], ['hold_days', 'Days a reserved book is kept'], ['fine_per_day', 'Fine per day late (0 = none)'],
];

export function LibrarySettingsPanel() {
  const [v, setV] = useState<LibraryRules | null>(null);
  useEffect(() => { library.settings().then(setV).catch(() => undefined); }, []);
  if (!v) return <Loader2 className="animate-spin text-slate-400" />;
  const save = async () => {
    try { setV(await library.saveSettings(v)); toast.success('Library rules saved.'); } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <section className={card}>
      <h2 className="font-black text-slate-900 mb-3">Loan rules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {RULES.map(([f, label]) => (
          <label key={f} className="text-xs font-semibold text-slate-600">{label}
            <input type="number" min={0} step={f === 'fine_per_day' ? '0.5' : '1'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={String(v[f])} onChange={(e) => setV({ ...v, [f]: e.target.value as never })} />
          </label>
        ))}
        <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2 mt-5">
          <input type="checkbox" checked={v.block_when_overdue} onChange={(e) => setV({ ...v, block_when_overdue: e.target.checked })} /> No new loans while a book is overdue
        </label>
      </div>
      <div className="flex justify-end mt-3"><button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save rules</button></div>
    </section>
  );
}

/** Office: the library at a glance, most borrowed books, top readers, loans by subject and by month. */
export default function LibraryReportPage() {
  const [r, setR] = useState<LibraryReport | null>(null);
  useEffect(() => { library.report().then(setR).catch(() => undefined); }, []);
  if (!r) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  const most = Math.max(1, ...r.months.map((m) => m.loans));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[['Titles', r.titles], ['Copies', r.copies], ['On loan', r.on_loan], ['Overdue', r.overdue], ['Loans (90 days)', r.loans_90_days],
          ['Readers (90 days)', r.active_readers], ['Waiting', r.waiting_reservations], ['Fines to collect', formatMoney(r.fines_due)]].map(([k, v]) => (
          <div key={String(k)} className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</p>
            <p className={`text-xl font-black ${k === 'Overdue' && Number(v) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">Most borrowed (90 days)</h2>
          {r.top_books.length === 0 ? <p className="text-sm text-slate-500">No loans yet.</p> : <ol className="text-sm list-decimal pl-5 space-y-0.5">{r.top_books.map((b) => <li key={b.id}>{b.title} <span className="text-slate-400">· {b.loans}</span></li>)}</ol>}
        </section>
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">Top readers (90 days)</h2>
          {r.top_readers.length === 0 ? <p className="text-sm text-slate-500">No loans yet.</p> : <ol className="text-sm list-decimal pl-5 space-y-0.5">{r.top_readers.map((m) => <li key={m.id}>{m.name} <span className="text-slate-400">· {m.loans}</span></li>)}</ol>}
        </section>
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">Loans by month</h2>
          <div className="flex items-end gap-2 h-32">
            {r.months.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[11px] font-bold">{m.loans}</span>
                <div className="w-full rounded-t bg-blue-500" style={{ height: `${(m.loans / most) * 100}%`, minHeight: m.loans ? 4 : 0 }} />
                <span className="text-[10px] text-slate-500">{m.label.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {r.by_subject.length > 0 && (
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">Loans by subject (90 days)</h2>
          <p className="text-sm text-slate-700">{r.by_subject.map((s) => `${s.subject}: ${s.loans}`).join(' · ')}</p>
        </section>
      )}
      <LibrarySettingsPanel />
    </div>
  );
}
