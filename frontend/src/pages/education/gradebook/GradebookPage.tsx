import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, EyeOff, Loader2, Plus, Settings2, Trash2 } from 'lucide-react';
import gradebook, { type ClassSubjectRef, type GAssignment, type Grid, type ScoreStatus } from '@/services/gradebook.service';
import api from '@/services/api';
import { Modal } from '@/components/ui/Modal';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const err = (e: any, f: string) => e?.response?.data?.error || f;
const STATUS_SHORT: Record<string, string> = { missing: 'M', excused: 'EX', late: 'L', incomplete: 'INC' };

/** Type a score, or M (missing), EX (excused), L (late, keeps points), INC. */
function parseCell(text: string): { points: number | null; status: ScoreStatus } | null {
  const t = text.trim().toUpperCase();
  if (t === '') return { points: null, status: 'graded' };
  if (t === 'M') return { points: null, status: 'missing' };
  if (t === 'EX' || t === 'E') return { points: null, status: 'excused' };
  if (t === 'INC' || t === 'I') return { points: null, status: 'incomplete' };
  const late = t.endsWith('L');
  const n = Number(late ? t.slice(0, -1) : t);
  if (Number.isNaN(n)) return null;
  return { points: n, status: late ? 'late' : 'graded' };
}

function cellText(s?: { points: number | null; status: ScoreStatus }) {
  if (!s) return '';
  if (s.status === 'missing' || s.status === 'excused' || s.status === 'incomplete') return STATUS_SHORT[s.status];
  return s.points == null ? '' : `${s.points}${s.status === 'late' ? 'L' : ''}`;
}

/** Weighted gradebook for one class-subject and term. */
export default function GradebookPage() {
  const [classes, setClasses] = useState<ClassSubjectRef[]>([]);
  const [terms, setTerms] = useState<Array<{ id: string; name: string; is_current: boolean }>>([]);
  const [cs, setCs] = useState('');
  const [term, setTerm] = useState('');
  const [section, setSection] = useState('');
  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<Partial<GAssignment> | null>(null);
  const [cats, setCats] = useState(false);
  const [exams, setExams] = useState<Array<{ id: string; title: string }> | null>(null);

  useEffect(() => {
    gradebook.classes().then((c) => { setClasses(c); if (c[0]) setCs(c[0].id); });
    gradebook.terms().then((t) => { setTerms(t); setTerm((t.find((x) => x.is_current) || t[t.length - 1])?.id || ''); });
  }, []);

  const load = useCallback(async () => {
    if (!cs || !term) return;
    setLoading(true);
    try { setGrid(await gradebook.grid(cs, term, section)); } catch (e) { toast.error(err(e, 'Could not load the gradebook.')); } finally { setLoading(false); }
  }, [cs, term, section]);
  useEffect(() => { load(); }, [load]);

  const current = classes.find((c) => c.id === cs);

  const saveCell = async (a: GAssignment, studentId: string, text: string, previous: string) => {
    if (text === previous) return;
    const parsed = parseCell(text);
    if (!parsed) return toast.error('Type a number, or M (missing), EX (excused), INC, or a number followed by L (late).');
    try {
      const r = await gradebook.saveScores(a.id, [{ student: studentId, ...parsed }]);
      if (r.errors.length) toast.error(r.errors[0]);
      setGrid(await gradebook.grid(cs, term, section));
    } catch (e) { toast.error(err(e, 'Could not save the score.')); }
  };

  const openExams = async () => {
    if (!current) return;
    const res = await api.get('/auth/exams/', { params: { class: current.class_id, page_size: 200 } }).catch(() => null);
    const rows = (Array.isArray(res?.data) ? res?.data : res?.data?.results || []) as any[];
    const inBook = new Set((grid?.assignments || []).map((a) => a.exam).filter(Boolean));
    setExams(rows.filter((e) => String(e.subject) === current.subject_id && !inBook.has(e.id)).map((e) => ({ id: e.id, title: `${e.title} · ${e.exam_date}` })));
  };

  const letterTone = (p: number | null) => (p == null ? 'text-slate-400' : p >= 90 ? 'text-emerald-700' : p >= 70 ? 'text-slate-800' : p >= 60 ? 'text-amber-700' : 'text-rose-700');
  const catWarning = grid && grid.categories.length > 0 && Math.round(grid.weights_total) !== 100;
  const exportCsv = () => {
    if (!grid) return;
    const head = ['Student', 'ID', ...grid.assignments.map((a) => `${a.title} (/${a.points_possible})`), 'Percent', 'Grade'];
    const lines = grid.students.map((s) => [s.full_name, s.student_id, ...grid.assignments.map((a) => cellText(s.scores[a.id])), s.grade.percent ?? '', s.grade.letter]);
    const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `gradebook-${current?.class_name}-${current?.subject}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const byCategory = useMemo(() => grid?.assignments || [], [grid]);

  return (
    <div className="space-y-4 p-4 text-slate-800">
      <div className="flex flex-wrap items-end gap-2 bg-white rounded-xl border border-slate-200 p-4">
        <div><label className={lbl} htmlFor="gb-cs">Class &amp; subject</label>
          <select id="gb-cs" className={input} value={cs} onChange={(e) => { setCs(e.target.value); setSection(''); }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name} · {c.subject}</option>)}
          </select></div>
        <div><label className={lbl} htmlFor="gb-sec">Section</label>
          <select id="gb-sec" className={input} value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All</option>{current?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className={lbl} htmlFor="gb-term">Term</label>
          <select id="gb-term" className={input} value={term} onChange={(e) => setTerm(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (now)' : ''}</option>)}
          </select></div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={() => setCats(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Settings2 className="w-4 h-4" /> Categories &amp; weights</button>
          <button onClick={openExams} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">Add an exam</button>
          <button onClick={exportCsv} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" aria-label="Export to CSV"><Download className="w-4 h-4" /></button>
          <button onClick={() => setEdit({ points_possible: 100, term, is_published: true, counts_toward_grade: true })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Assignment</button>
        </div>
      </div>

      {terms.length === 0 && <p className="text-sm text-amber-700">Set up terms first: Academic Setup → School Years &amp; Terms.</p>}
      {catWarning && <p className="text-sm text-amber-700">Category weights add up to {grid!.weights_total}%. Grades are re-scaled, but most schools use 100%.</p>}
      <p className="text-xs text-slate-500">Type a score and press Tab. Shortcuts: <b>M</b> missing (counts as 0), <b>EX</b> excused (not counted), <b>INC</b> incomplete, a number then <b>L</b> late.</p>

      {loading && <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>}
      {!loading && grid && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto max-h-[70vh]">
          <table className="text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="sticky left-0 bg-slate-50 z-20 text-left px-3 py-2 min-w-[190px] border-b border-slate-200">Student</th>
                <th className="px-3 py-2 border-b border-slate-200 min-w-[80px]">Grade</th>
                {byCategory.map((a) => (
                  <th key={a.id} className="px-2 py-2 border-b border-l border-slate-200 min-w-[92px] align-bottom">
                    <button onClick={() => setEdit(a)} className="text-left w-full hover:text-brand" title="Edit assignment">
                      <span className="block text-[11px] text-slate-500 truncate">{a.category_name || 'Other'}{!a.counts_toward_grade ? ' · not counted' : ''}</span>
                      <span className="block font-semibold leading-tight line-clamp-2">{a.title}</span>
                      <span className="block text-[11px] text-slate-500">/{a.points_possible}{a.due_date ? ` · ${new Date(`${a.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</span>
                      {!a.is_published && <EyeOff className="w-3 h-3 inline text-slate-400" aria-label="Hidden from families" />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="sticky left-0 bg-white px-3 py-1.5 border-b border-slate-100 font-medium">{s.full_name}<span className="block text-[11px] text-slate-400">{s.student_id}</span></td>
                  <td className={`px-3 py-1.5 border-b border-slate-100 text-center font-bold ${letterTone(s.grade.percent)}`} title={s.grade.categories.map((c) => `${c.name}: ${c.percent ?? '—'}%`).join('\n')}>
                    {s.grade.percent == null ? '—' : <>{s.grade.letter} <span className="block text-[11px] font-normal text-slate-500">{s.grade.percent}%{s.grade.missing ? ` · ${s.grade.missing} missing` : ''}</span></>}
                  </td>
                  {byCategory.map((a) => {
                    const sc = s.scores[a.id];
                    const text = cellText(sc);
                    return (
                      <td key={a.id} className={`border-b border-l border-slate-100 p-0 ${sc?.status === 'missing' ? 'bg-rose-50' : sc?.status === 'excused' ? 'bg-slate-50' : sc?.status === 'late' ? 'bg-amber-50' : ''}`}>
                        <input defaultValue={text} key={`${a.id}-${s.id}-${text}`} aria-label={`${s.full_name}, ${a.title}`}
                          onBlur={(e) => saveCell(a, s.id, e.target.value, text)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          className="w-full px-2 py-2 text-center bg-transparent focus:outline-none focus:bg-brand-soft" />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {grid.students.length === 0 && <tr><td colSpan={2 + byCategory.length} className="px-3 py-8 text-center text-slate-500">No students in this class.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {edit && grid && (
        <AssignmentModal a={edit} grid={grid} terms={terms} classSubject={cs} sections={current?.sections || []}
          onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}
      {cats && grid && <CategoriesModal grid={grid} classSubject={cs} onClose={() => { setCats(false); load(); }} />}
      {exams && (
        <Modal open onClose={() => setExams(null)} title="Add an exam to the gradebook" size="md">
          {exams.length === 0 ? <p className="text-sm text-slate-500">No exams for this subject that aren't already in the gradebook.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {exams.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between gap-2">
                  <span>{e.title}</span>
                  <button onClick={async () => { try { await gradebook.fromExam(e.id); toast.success('Exam added; its marks stay in sync'); setExams(null); load(); } catch (x) { toast.error(err(x, 'Could not add the exam.')); } }}
                    className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold">Add</button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function AssignmentModal({ a, grid, terms, classSubject, sections, onClose, onSaved }: {
  a: Partial<GAssignment>; grid: Grid; terms: Array<{ id: string; name: string }>; classSubject: string;
  sections: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<GAssignment>>(a);
  const save = async () => {
    try {
      if (f.id) await gradebook.updateAssignment(f.id, f);
      else await gradebook.addAssignment({ ...f, class_subject: classSubject } as any);
      toast.success('Assignment saved');
      onSaved();
    } catch (e) { toast.error(err(e, 'Could not save the assignment.')); }
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Edit assignment' : 'New assignment'} size="lg"
      footer={<div className="flex justify-between gap-2">
        {f.id ? <button onClick={async () => { if (window.confirm('Delete this assignment and its scores?')) { await gradebook.deleteAssignment(f.id!); onSaved(); } }} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-rose-700 hover:bg-rose-50 text-sm font-semibold"><Trash2 className="w-4 h-4" /> Delete</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button><button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Save</button></div>
      </div>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="sm:col-span-2"><label className={lbl} htmlFor="as-t">Title</label><input id="as-t" className={`${input} w-full`} value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className={lbl} htmlFor="as-c">Category</label>
          <select id="as-c" className={`${input} w-full`} value={f.category || ''} onChange={(e) => setF({ ...f, category: e.target.value || null })}>
            <option value="">Other</option>{grid.categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>)}
          </select></div>
        <div><label className={lbl} htmlFor="as-p">Points possible</label><input id="as-p" type="number" min={1} className={`${input} w-full`} value={f.points_possible ?? 100} onChange={(e) => setF({ ...f, points_possible: Number(e.target.value) })} /></div>
        <div><label className={lbl} htmlFor="as-d">Due date</label><input id="as-d" type="date" className={`${input} w-full`} value={f.due_date || ''} onChange={(e) => setF({ ...f, due_date: e.target.value || null })} /></div>
        <div><label className={lbl} htmlFor="as-term">Term</label><select id="as-term" className={`${input} w-full`} value={f.term || ''} onChange={(e) => setF({ ...f, term: e.target.value })}>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div><label className={lbl} htmlFor="as-sec">For</label><select id="as-sec" className={`${input} w-full`} value={f.section || ''} onChange={(e) => setF({ ...f, section: e.target.value || null })}><option value="">Every section</option>{sections.map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}</select></div>
        <div className="sm:col-span-2"><label className={lbl} htmlFor="as-desc">Instructions (optional)</label><textarea id="as-desc" rows={2} className={`${input} w-full`} value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={f.counts_toward_grade !== false} onChange={(e) => setF({ ...f, counts_toward_grade: e.target.checked })} /> Counts toward the grade</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={f.is_published !== false} onChange={(e) => setF({ ...f, is_published: e.target.checked })} /> Students and parents can see it</label>
      </div>
    </Modal>
  );
}

function CategoriesModal({ grid, classSubject, onClose }: { grid: Grid; classSubject: string; onClose: () => void }) {
  const [rows, setRows] = useState(grid.categories);
  const [add, setAdd] = useState({ name: '', weight: '' });
  const total = rows.reduce((n, r) => n + Number(r.weight || 0), 0);
  const refresh = async () => setRows((await gradebook.grid(classSubject, grid.term || '')).categories);
  return (
    <Modal open onClose={onClose} title="Categories and weights" size="lg">
      <div className="space-y-3 text-sm">
        <p className="text-slate-600">Each category is a share of the term grade. "Drop lowest" ignores that many of a student's weakest scores in the category.</p>
        {rows.length === 0 && (
          <button onClick={async () => { await gradebook.addCategory({ class_subject: classSubject, preset: 'standard' }); refresh(); }} className="px-3 py-2 rounded-lg bg-brand-soft font-semibold">
            Use a common set: Homework 20, Quizzes 20, Tests 40, Projects 10, Participation 10
          </button>
        )}
        <table className="w-full">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left py-1">Category</th><th className="text-left py-1">Weight %</th><th className="text-left py-1">Drop lowest</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="py-1 pr-2"><input className={`${input} w-full`} defaultValue={c.name} aria-label="Category name" onBlur={(e) => e.target.value !== c.name && gradebook.updateCategory(c.id, { name: e.target.value }).then(refresh)} /></td>
                <td className="py-1 pr-2"><input type="number" min={0} max={100} className={`${input} w-24`} defaultValue={c.weight} aria-label={`${c.name} weight`} onBlur={(e) => Number(e.target.value) !== c.weight && gradebook.updateCategory(c.id, { weight: Number(e.target.value) }).then(refresh)} /></td>
                <td className="py-1 pr-2"><input type="number" min={0} max={10} className={`${input} w-20`} defaultValue={c.drop_lowest} aria-label={`${c.name} drop lowest`} onBlur={(e) => Number(e.target.value) !== c.drop_lowest && gradebook.updateCategory(c.id, { drop_lowest: Number(e.target.value) }).then(refresh)} /></td>
                <td className="py-1"><button onClick={async () => { await gradebook.deleteCategory(c.id); refresh(); }} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" aria-label={`Delete ${c.name}`}><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`font-semibold ${Math.round(total) === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>Total: {total}%</p>
        <div className="flex gap-2 items-end">
          <div className="flex-1"><label className={lbl} htmlFor="cat-n">New category</label><input id="cat-n" className={`${input} w-full`} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></div>
          <div><label className={lbl} htmlFor="cat-w">Weight %</label><input id="cat-w" type="number" className={`${input} w-24`} value={add.weight} onChange={(e) => setAdd({ ...add, weight: e.target.value })} /></div>
          <button onClick={async () => { try { await gradebook.addCategory({ class_subject: classSubject, name: add.name, weight: Number(add.weight || 0) }); setAdd({ name: '', weight: '' }); refresh(); } catch (e) { toast.error(err(e, 'Could not add the category.')); } }} className="px-3 py-2 rounded-lg bg-brand text-white font-semibold">Add</button>
        </div>
      </div>
    </Modal>
  );
}
