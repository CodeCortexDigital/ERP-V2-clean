import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckSquare, Loader2, Search, Square, ThumbsDown, ThumbsUp } from 'lucide-react';
import discipline, { type BehaviourCategory, type Incident, type RosterRow } from '@/services/discipline.service';
import { IncidentLine } from '@/components/behaviour/BehaviourHistory';
import IncidentPanel from '@/components/behaviour/IncidentPanel';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The behaviour log: award merits or log incidents for one student or several at once, and work the open cases. */
export default function BehaviourLogPage() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState('');
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [cats, setCats] = useState<BehaviourCategory[]>([]);
  const [kind, setKind] = useState<'positive' | 'negative'>('positive');
  const [f, setF] = useState({ category: '', description: '', location: '', date: localToday(), time: '',
    follow_up_date: '', visible_to_family: true });
  const [filter, setFilter] = useState({ kind: '', status: '', follow_up: '', q: '' });
  const [rows, setRows] = useState<Incident[] | null>(null);
  const [open, setOpen] = useState<Incident | null>(null);

  useEffect(() => {
    discipline.classes().then((c) => { setClasses(c); if (c.length) setClassId(c[0].id); }).catch(() => undefined);
    discipline.categories(true).then(setCats).catch(() => undefined);
  }, []);
  const loadRoster = useCallback(() => {
    if (!classId) return;
    setRoster(null);
    discipline.roster(classId).then(setRoster).catch(() => setRoster([]));
  }, [classId]);
  useEffect(() => { loadRoster(); setPicked([]); }, [loadRoster]);
  const loadLog = useCallback(() => {
    const params: Record<string, string> = {};
    Object.entries(filter).forEach(([k, v]) => { if (v) params[k] = v; });
    if (classId) params.class = classId;
    discipline.incidents(params).then(setRows).catch(() => setRows([]));
  }, [filter, classId]);
  useEffect(() => { loadLog(); }, [loadLog]);

  const shown = useMemo(() => cats.filter((c) => c.kind === kind), [cats, kind]);
  const chosen = cats.find((c) => c.id === f.category);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    if (!picked.length) { toast.error('Choose at least one student.'); return; }
    if (!f.category) { toast.error(kind === 'positive' ? 'Choose a merit.' : 'Choose what happened.'); return; }
    try {
      const res = await discipline.log({ ...f, student_ids: picked, time: f.time || null, follow_up_date: f.follow_up_date || null });
      toast.success(`${kind === 'positive' ? 'Merit' : 'Incident'} logged for ${res.incidents.length} student${res.incidents.length === 1 ? '' : 's'}`);
      res.awards.forEach((a) => toast.success(`🏆 ${a}`));
      setPicked([]);
      setF({ ...f, description: '', location: '', follow_up_date: '' });
      loadRoster();
      loadLog();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4 text-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold mr-auto">Behaviour log</h1>
        <select className={input} aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
          {classes.length === 0 && <option value="">No classes</option>}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold">Choose students <span className="text-slate-500 font-normal">({picked.length} chosen)</span></p>
            {roster && roster.length > 0 && (
              <button onClick={() => setPicked(picked.length === roster.length ? [] : roster.map((r) => r.id))} className="text-sm text-brand font-semibold">
                {picked.length === roster.length ? 'Clear' : 'Whole class'}
              </button>
            )}
          </div>
          {!roster ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div> : roster.length === 0 ? <p className="text-sm text-slate-500">No students in this class.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {roster.map((r) => {
                const on = picked.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on}
                    className={`text-left rounded-lg border p-2 flex gap-2 items-start ${on ? 'border-[color:var(--app-accent)] bg-[color:var(--app-accent)]/5' : 'border-slate-200'}`}>
                    {on ? <CheckSquare className="w-4 h-4 mt-0.5 text-brand shrink-0" /> : <Square className="w-4 h-4 mt-0.5 text-slate-300 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{r.full_name}</span>
                      <span className={`text-xs font-bold ${r.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.points} pts</span>
                      {r.incidents > 0 && <span className="text-xs text-slate-500"> · {r.incidents} incident{r.incidents === 1 ? '' : 's'}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setKind('positive'); setF({ ...f, category: '' }); }} className={`py-2 rounded-lg font-semibold inline-flex justify-center items-center gap-1.5 border ${kind === 'positive' ? 'bg-emerald-600 text-white border-transparent' : 'border-slate-200'}`}><ThumbsUp className="w-4 h-4" /> Merit</button>
            <button onClick={() => { setKind('negative'); setF({ ...f, category: '' }); }} className={`py-2 rounded-lg font-semibold inline-flex justify-center items-center gap-1.5 border ${kind === 'negative' ? 'bg-rose-600 text-white border-transparent' : 'border-slate-200'}`}><ThumbsDown className="w-4 h-4" /> Incident</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shown.map((c) => (
              <button key={c.id} onClick={() => setF({ ...f, category: c.id })}
                className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${f.category === c.id ? (kind === 'positive' ? 'bg-emerald-600 text-white border-transparent' : 'bg-rose-600 text-white border-transparent') : 'border-slate-200'}`}>
                {c.name} {c.points > 0 ? `+${c.points}` : c.points}
              </button>
            ))}
          </div>
          {chosen?.notify_family && <p className="text-xs text-amber-700 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> The family will be told.</p>}
          <textarea className={`${input} w-full`} rows={3} placeholder={kind === 'positive' ? 'What did they do? (optional)' : 'What happened?'} aria-label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <label>Date<input type="date" className={`${input} w-full`} value={f.date} max={localToday()} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label>Time<input type="time" className={`${input} w-full`} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
            {kind === 'negative' && <>
              <label>Where<input className={`${input} w-full`} value={f.location} placeholder="e.g. Canteen" onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
              <label>Follow up by<input type="date" className={`${input} w-full`} value={f.follow_up_date} onChange={(e) => setF({ ...f, follow_up_date: e.target.value })} /></label>
            </>}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.visible_to_family} onChange={(e) => setF({ ...f, visible_to_family: e.target.checked })} /> Families can see this</label>
          <button onClick={save} className="w-full py-2 rounded-lg bg-brand text-white font-semibold">Save for {picked.length || 'no'} student{picked.length === 1 ? '' : 's'}</button>
        </section>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <h2 className="font-bold mr-auto">Recent records in this class</h2>
          <label className="relative"><Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-400" /><input className={`${input} pl-8`} placeholder="Search" aria-label="Search records" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} /></label>
          <select className={input} aria-label="Kind" value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}><option value="">Merits and incidents</option><option value="positive">Merits</option><option value="negative">Incidents</option></select>
          <select className={input} aria-label="Status filter" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}><option value="">Any status</option><option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!filter.follow_up} onChange={(e) => setFilter({ ...filter, follow_up: e.target.checked ? '1' : '' })} /> Follow-ups due</label>
        </div>
        {!rows ? <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div> : rows.length === 0 ? <p className="text-sm text-slate-500">Nothing recorded.</p> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((i) => <IncidentLine key={i.id} i={i} onOpen={setOpen} showStudent />)}
          </ul>
        )}
      </section>

      {open && <IncidentPanel incident={open} onClose={() => setOpen(null)} onChanged={() => { loadLog(); loadRoster(); }} />}
    </div>
  );
}
