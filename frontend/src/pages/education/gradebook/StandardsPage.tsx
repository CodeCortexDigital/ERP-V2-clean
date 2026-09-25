import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import gradebook, { STANDARD_LEVELS, type ClassSubjectRef, type Standard } from '@/services/gradebook.service';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Standards-based grading: list the standards for a subject, then rate each student each term. */
export default function StandardsPage() {
  const [classes, setClasses] = useState<ClassSubjectRef[]>([]);
  const [terms, setTerms] = useState<Array<{ id: string; name: string; is_current: boolean }>>([]);
  const [cs, setCs] = useState('');
  const [term, setTerm] = useState('');
  const [stds, setStds] = useState<Standard[]>([]);
  const [grid, setGrid] = useState<Awaited<ReturnType<typeof gradebook.ratings>> | null>(null);
  const [draft, setDraft] = useState({ code: '', description: '' });

  useEffect(() => {
    gradebook.classes().then((c) => { setClasses(c); if (c[0]) setCs(c[0].id); });
    gradebook.terms().then((t) => { setTerms(t); setTerm((t.find((x) => x.is_current) || t[t.length - 1])?.id || ''); });
  }, []);
  const current = classes.find((c) => c.id === cs);

  const load = useCallback(async () => {
    if (!current) return;
    setStds(await gradebook.standards({ subject: current.subject_id }));
    if (term) setGrid(await gradebook.ratings(cs, term));
  }, [current, cs, term]);
  useEffect(() => { load().catch(() => toast.error('Could not load standards.')); }, [load]);

  const rate = async (student: string, standard: string, level: string) => {
    try { await gradebook.saveRatings(term, [{ student, standard, level: level ? Number(level) : null }]); }
    catch { toast.error('Could not save the rating.'); }
  };

  return (
    <div className="space-y-4 p-4 text-slate-800">
      <div className="flex flex-wrap items-end gap-2 bg-white rounded-xl border border-slate-200 p-4">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="st-cs">Class &amp; subject</label>
          <select id="st-cs" className={input} value={cs} onChange={(e) => setCs(e.target.value)}>{classes.map((c) => <option key={c.id} value={c.id}>{c.class_name} · {c.subject}</option>)}</select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="st-term">Term</label>
          <select id="st-term" className={input} value={term} onChange={(e) => setTerm(e.target.value)}>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-bold">Standards for {current?.subject}</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {stds.map((s) => (
            <li key={s.id} className="py-2 flex items-center justify-between gap-2">
              <span>{s.code && <b className="mr-1">{s.code}</b>}{s.description}</span>
              <button onClick={async () => { await gradebook.deleteStandard(s.id); load(); }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" aria-label={`Delete ${s.code || s.description}`}><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
          {stds.length === 0 && <li className="py-3 text-slate-500">No standards yet for this subject.</li>}
        </ul>
        <div className="flex flex-wrap gap-2 items-end">
          <input className={`${input} w-32`} placeholder="Code (optional)" aria-label="Standard code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <input className={`${input} flex-1 min-w-[240px]`} placeholder="What the student can do, e.g. Adds fractions with unlike denominators" aria-label="Standard description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <button onClick={async () => {
            if (!current || !draft.description.trim()) return;
            try { await gradebook.addStandard({ subject: current.subject_id, ...draft }); setDraft({ code: '', description: '' }); load(); } catch { toast.error('Could not add the standard.'); }
          }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add standard</button>
        </div>
      </section>

      {grid && grid.standards.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="text-sm">
            <thead className="bg-slate-50"><tr><th className="sticky left-0 bg-slate-50 text-left px-3 py-2 min-w-[180px]">Student</th>
              {grid.standards.map((s) => <th key={s.id} className="px-2 py-2 text-left min-w-[150px] font-semibold" title={s.description}>{s.code || s.description.slice(0, 40)}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {grid.students.map((st) => (
                <tr key={st.id}>
                  <td className="sticky left-0 bg-white px-3 py-1.5 font-medium">{st.full_name}</td>
                  {grid.standards.map((s) => (
                    <td key={s.id} className="px-2 py-1.5">
                      <select aria-label={`${st.full_name}, ${s.code || s.description}`} className="rounded border border-slate-300 px-2 py-1 text-sm w-full" defaultValue={st.ratings[s.id]?.level ?? ''} onChange={(e) => rate(st.id, s.id, e.target.value)}>
                        <option value="">—</option>{STANDARD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {!grid && <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>}
    </div>
  );
}
