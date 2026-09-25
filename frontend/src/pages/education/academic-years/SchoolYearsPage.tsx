import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, CheckCircle2, GraduationCap, Loader2, Plus, Repeat, Trash2 } from 'lucide-react';
import api from '@/services/api';
import teacherService from '@/services/teacher.service';
import { Modal } from '@/components/ui/Modal';

const base = '/auth/academics';
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const err = (e: any, f: string) => e?.response?.data?.error || f;

interface Term { id: string; name: string; kind: string; order: number; start_date: string; end_date: string; is_current: boolean }
interface Year { id: string; name: string; start_date: string; end_date: string; is_active: boolean; terms: Term[] }
interface Klass { id: string; name: string; grade_level: number | null; homeroom_teacher: string | null; student_count?: number }
interface Plan { promote: number; graduate: number; repeat: number; needs_attention: Array<{ id: string; full_name: string; class_name: string }>; moves: Array<{ id: string; full_name: string; from: string; to: string; section: string }>; done?: boolean }

const GRADES = [{ v: -1, l: 'Pre-K' }, { v: 0, l: 'Kindergarten' }, ...Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: `Grade ${i + 1}` }))];

/** School years, terms / semesters, grade levels and homerooms, and starting a new year. */
export default function SchoolYearsPage() {
  const [years, setYears] = useState<Year[] | null>(null);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [newYear, setNewYear] = useState<{ name: string; start_date: string; end_date: string } | null>(null);
  const [newTerm, setNewTerm] = useState<{ yearId: string; name: string; kind: string; start_date: string; end_date: string } | null>(null);
  const [rollover, setRollover] = useState<{ year: Year; plan: Plan | null; repeat: Set<string> } | null>(null);

  const load = useCallback(async () => {
    const [y, c] = await Promise.all([api.get<Year[]>(`${base}/years/`), api.get(`${base}/classes/`, { params: { page_size: 200 } })]);
    setYears(y.data);
    setClasses((Array.isArray(c.data) ? c.data : c.data?.results || []) as Klass[]);
  }, []);
  useEffect(() => {
    load().catch(() => toast.error('Could not load the school years.'));
    teacherService.getAll({ is_active: true }).then((r: any) => setTeachers((r.data || []).map((t: any) => ({ id: t.id, full_name: t.full_name || t.name })))).catch(() => undefined);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); await load(); return true; } catch (e) { toast.error(err(e, 'That did not work.')); return false; }
  };

  const openRollover = async (year: Year) => {
    setRollover({ year, plan: null, repeat: new Set() });
    try {
      const { data } = await api.post<Plan>(`${base}/years/${year.id}/rollover/`, { preview: true });
      setRollover({ year, plan: data, repeat: new Set() });
    } catch (e) { toast.error(err(e, 'Could not prepare the new year.')); setRollover(null); }
  };

  const current = years?.find((y) => y.is_active);
  const upcoming = years?.filter((y) => !y.is_active && y.start_date > (current?.start_date || '')) || [];

  if (!years) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-5 p-4 max-w-6xl mx-auto text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">School years &amp; terms</h1>
          <p className="text-sm text-slate-500">Set the school year and its grading periods. The gradebook and report cards use these.</p>
        </div>
        <button onClick={() => setNewYear({ name: '', start_date: '', end_date: '' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Plus className="w-4 h-4" /> New school year</button>
      </div>

      {years.length === 0 && <div className={`${card} p-10 text-center text-sm text-slate-500`}>No school years yet. Add the current one to get started.</div>}

      {years.map((y) => (
        <section key={y.id} className={`${card} p-5 space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold text-lg inline-flex items-center gap-2">{y.name} {y.is_active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Current year</span>}</p>
              <p className="text-sm text-slate-500">{fmt(y.start_date)} to {fmt(y.end_date)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label={`Split ${y.name} into terms`} className={input} value="" onChange={(e) => e.target.value && run(() => api.post(`${base}/years/${y.id}/generate-terms/`, { kind: e.target.value }), 'Terms created')}>
                <option value="">Split into…</option><option value="semester">2 semesters</option><option value="trimester">3 trimesters</option><option value="term">3 terms</option><option value="quarter">4 quarters</option>
              </select>
              <button onClick={() => setNewTerm({ yearId: y.id, name: '', kind: 'term', start_date: y.start_date, end_date: y.end_date })} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">Add term</button>
              {!y.is_active && current && y.start_date > current.start_date && (
                <button onClick={() => openRollover(y)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Repeat className="w-4 h-4" /> Start this year</button>
              )}
              {!y.is_active && !current && <button onClick={() => run(() => api.patch(`${base}/years/${y.id}/`, { is_active: true }), 'Current year set')} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Make current</button>}
              {!y.is_active && <button onClick={() => window.confirm(`Delete ${y.name}?`) && run(() => api.delete(`${base}/years/${y.id}/`), 'Year deleted')} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label={`Delete ${y.name}`}><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
          {y.terms.length === 0 ? <p className="text-sm text-slate-500">No terms yet. Split the year into semesters, trimesters, terms or quarters.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {y.terms.map((t) => (
                <div key={t.id} className={`rounded-lg border p-3 text-sm ${t.is_current ? 'border-[color:var(--app-accent)] bg-brand-soft' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between"><p className="font-semibold">{t.name}</p>
                    <button onClick={() => run(() => api.delete(`${base}/terms/${t.id}/`), 'Term removed')} className="p-1 text-slate-400 hover:text-rose-600" aria-label={`Remove ${t.name}`}><Trash2 className="w-3.5 h-3.5" /></button></div>
                  <p className="text-xs text-slate-600">{fmt(t.start_date)} – {fmt(t.end_date)}</p>
                  {t.is_current && <p className="text-xs font-bold text-brand mt-1">Now</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {upcoming.length === 0 && current && (
        <p className="text-sm text-slate-500">To move students up at the end of the year, add next year first, then press <strong>Start this year</strong> on it.</p>
      )}

      <section className={`${card} p-5 space-y-3`}>
        <h2 className="font-bold inline-flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Grade levels and homeroom teachers</h2>
        <p className="text-sm text-slate-500">Grade levels put classes in order and decide where students go at the end of the year. The top grade graduates.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-3 py-2">Class</th><th className="text-left px-3 py-2">Grade level</th><th className="text-left px-3 py-2">Homeroom teacher</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {[...classes].sort((a, b) => (a.grade_level ?? 99) - (b.grade_level ?? 99) || a.name.localeCompare(b.name)).map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-semibold">{c.name}</td>
                  <td className="px-3 py-2">
                    <select aria-label={`Grade level for ${c.name}`} className={input} value={c.grade_level ?? ''} onChange={(e) => run(() => api.patch(`${base}/classes/${c.id}/`, { grade_level: e.target.value === '' ? null : Number(e.target.value) }), `${c.name} updated`)}>
                      <option value="">Not set</option>{GRADES.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select aria-label={`Homeroom teacher for ${c.name}`} className={input} value={c.homeroom_teacher ?? ''} onChange={(e) => run(() => api.patch(`${base}/classes/${c.id}/`, { homeroom_teacher: e.target.value || null }), `${c.name} updated`)}>
                      <option value="">None</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {newYear && (
        <Modal open onClose={() => setNewYear(null)} title="New school year" size="md"
          footer={<div className="flex justify-end gap-2"><button onClick={() => setNewYear(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
            <button onClick={async () => { if (await run(() => api.post(`${base}/years/`, newYear), 'School year added')) setNewYear(null); }} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Add year</button></div>}>
          <div className="space-y-3">
            <div><label className={lbl} htmlFor="ny-name">Name</label><input id="ny-name" className={`${input} w-full`} placeholder="2027-2028" value={newYear.name} onChange={(e) => setNewYear({ ...newYear, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl} htmlFor="ny-s">First day</label><input id="ny-s" type="date" className={`${input} w-full`} value={newYear.start_date} onChange={(e) => setNewYear({ ...newYear, start_date: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="ny-e">Last day</label><input id="ny-e" type="date" className={`${input} w-full`} value={newYear.end_date} onChange={(e) => setNewYear({ ...newYear, end_date: e.target.value })} /></div>
            </div>
            <p className="text-xs text-slate-500">If there is no current year yet, this becomes the current year.</p>
          </div>
        </Modal>
      )}

      {newTerm && (
        <Modal open onClose={() => setNewTerm(null)} title="Add term" size="md"
          footer={<div className="flex justify-end gap-2"><button onClick={() => setNewTerm(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
            <button onClick={async () => { if (await run(() => api.post(`${base}/terms/`, { ...newTerm, academic_year: newTerm.yearId }), 'Term added')) setNewTerm(null); }} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Add term</button></div>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl} htmlFor="nt-name">Name</label><input id="nt-name" className={`${input} w-full`} placeholder="Term 1" value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="nt-kind">Type</label><select id="nt-kind" className={`${input} w-full`} value={newTerm.kind} onChange={(e) => setNewTerm({ ...newTerm, kind: e.target.value })}><option value="term">Term</option><option value="semester">Semester</option><option value="trimester">Trimester</option><option value="quarter">Quarter</option></select></div>
              <div><label className={lbl} htmlFor="nt-s">Starts</label><input id="nt-s" type="date" className={`${input} w-full`} value={newTerm.start_date} onChange={(e) => setNewTerm({ ...newTerm, start_date: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="nt-e">Ends</label><input id="nt-e" type="date" className={`${input} w-full`} value={newTerm.end_date} onChange={(e) => setNewTerm({ ...newTerm, end_date: e.target.value })} /></div>
            </div>
          </div>
        </Modal>
      )}

      {rollover && (
        <Modal open onClose={() => setRollover(null)} title={`Start ${rollover.year.name}`} size="xl">
          {!rollover.plan ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Move up a grade</p><p className="text-xl font-bold">{rollover.plan.moves.filter((m) => m.to !== 'Graduates' && !rollover.repeat.has(m.id)).length}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Graduate</p><p className="text-xl font-bold">{rollover.plan.moves.filter((m) => m.to === 'Graduates' && !rollover.repeat.has(m.id)).length}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Repeat the year</p><p className="text-xl font-bold">{rollover.repeat.size}</p></div>
              </div>
              {rollover.plan.needs_attention.length > 0 && (
                <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900">{rollover.plan.needs_attention.length} students stay where they are because their class has no grade level or there is no next grade: {rollover.plan.needs_attention.slice(0, 8).map((s) => s.full_name).join(', ')}{rollover.plan.needs_attention.length > 8 ? '…' : ''}</p>
              )}
              <p className="text-slate-600">Tick anyone who should repeat the year. Everyone else moves up and keeps their section where the next grade has one.</p>
              <table className="w-full">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Repeat</th><th className="px-3 py-2 text-left">Student</th><th className="px-3 py-2 text-left">From</th><th className="px-3 py-2 text-left">To</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {rollover.plan.moves.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-1.5"><input type="checkbox" aria-label={`${m.full_name} repeats the year`} checked={rollover.repeat.has(m.id)} onChange={(e) => { const r = new Set(rollover.repeat); if (e.target.checked) r.add(m.id); else r.delete(m.id); setRollover({ ...rollover, repeat: r }); }} /></td>
                      <td className="px-3 py-1.5">{m.full_name}</td><td className="px-3 py-1.5">{m.from}</td>
                      <td className="px-3 py-1.5">{rollover.repeat.has(m.id) ? <span className="text-amber-700">Stays in {m.from}</span> : `${m.to}${m.section ? ` · ${m.section}` : ''}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setRollover(null)} className="px-4 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button>
                <button onClick={async () => {
                  if (!window.confirm(`Start ${rollover.year.name} now? Students will move up and ${rollover.year.name} becomes the current year.`)) return;
                  if (await run(() => api.post(`${base}/years/${rollover.year.id}/rollover/`, { preview: false, repeat: [...rollover.repeat] }), `${rollover.year.name} has started`)) setRollover(null);
                }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white font-semibold"><CalendarRange className="w-4 h-4" /> Start {rollover.year.name}</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
