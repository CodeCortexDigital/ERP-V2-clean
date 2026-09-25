import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardList, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import portal, { WorkItem } from '@/services/portal.service';
import ChildPicker, { usePortalChild, usePortalHome } from '@/components/portal/ChildPicker';

const STATUS: Record<WorkItem['status'], [string, string]> = {
  overdue: ['Overdue', 'bg-rose-100 text-rose-700'],
  missing: ['Missing', 'bg-rose-100 text-rose-700'],
  due_today: ['Due today', 'bg-amber-100 text-amber-700'],
  upcoming: ['Upcoming', 'bg-blue-100 text-blue-700'],
  submitted: ['Submitted', 'bg-indigo-100 text-indigo-700'],
  graded: ['Marked', 'bg-emerald-100 text-emerald-700'],
  excused: ['Excused', 'bg-slate-100 text-slate-600'],
  incomplete: ['Incomplete', 'bg-amber-100 text-amber-700'],
};
const FILTERS: Array<[string, string, WorkItem['status'][]]> = [
  ['all', 'All', []],
  ['todo', 'To do', ['upcoming', 'due_today']],
  ['late', 'Overdue / missing', ['overdue', 'missing', 'incomplete']],
  ['done', 'Marked', ['graded', 'submitted', 'excused']],
];
const fmt = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Gradebook assignments and class homework for a student, with status, marks and teacher comments. */
export default function StudentAssignmentsPage() {
  const home = usePortalHome();
  const { kids, id, setId, loading: kidsLoading } = usePortalChild();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [subject, setSubject] = useState('');

  useEffect(() => {
    if (!id) { if (!kidsLoading) setLoading(false); return; }
    setLoading(true);
    portal.assignments(id)
      .then((r) => { setItems(r.items); setSubjects(r.subjects); })
      .catch(() => toast.error('Could not load assignments.'))
      .finally(() => setLoading(false));
  }, [id, kidsLoading]);

  const shown = useMemo(() => {
    const want = FILTERS.find((f) => f[0] === filter)?.[2] || [];
    return items.filter((i) => (!want.length || want.includes(i.status)) && (!subject || i.subject === subject));
  }, [items, filter, subject]);

  const count = (f: WorkItem['status'][]) => (f.length ? items.filter((i) => f.includes(i.status)).length : items.length);

  const openAttachment = async (w: WorkItem) => {
    try {
      const a = await portal.homeworkAttachment(id, w.id.split(':')[1]);
      const link = document.createElement('a');
      link.href = a.data;
      link.download = a.name;
      link.click();
    } catch {
      toast.error('The attachment could not be opened.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mr-auto">
          <BookOpen size={16} className="text-blue-600" /> Assignments & homework
        </h3>
        <ChildPicker kids={kids} id={id} onChange={setId} />
        <Link to={home} className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><ArrowLeft size={13} /> Dashboard</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label, st]) => (
          <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filter === key ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>
            {label} <span className="opacity-70">{count(st)}</span>
          </button>
        ))}
        {subjects.length > 1 && (
          <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
            <option value="">All subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="animate-spin mr-2" size={18} /> Loading assignments…</div>
      ) : !id ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">No student record is linked to this account.</div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">Nothing here.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shown.map((w) => {
            const [label, cls] = STATUS[w.status] || [w.status, 'bg-slate-100 text-slate-600'];
            return (
              <article key={w.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClipboardList size={15} className="text-blue-500 shrink-0" />
                    <p className="text-sm font-bold text-slate-800 truncate">{w.title}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${cls}`}>{label}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {w.subject}{w.category ? ` · ${w.category}` : ''}{w.teacher ? ` · ${w.teacher}` : ''}
                </p>
                {w.description && <p className="text-xs text-slate-500 mt-2 line-clamp-3">{w.description}</p>}
                {(w.points != null || w.comment) && (
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    {w.points != null && <p className="font-bold text-slate-800">Mark: {w.points}{w.points_possible != null ? ` / ${w.points_possible}` : ''}{w.late ? ' (late)' : ''}</p>}
                    {w.comment && <p className="text-slate-600 mt-0.5">“{w.comment}”</p>}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] font-semibold text-slate-400">
                  {w.assigned_date && <span>Given: {fmt(w.assigned_date)}</span>}
                  {w.due_date && <span className={['overdue', 'missing'].includes(w.status) ? 'text-rose-500' : ''}>Due: {fmt(w.due_date)}</span>}
                  {w.points_possible != null && w.points == null && <span>Out of {w.points_possible}</span>}
                  {w.has_attachment && (
                    <button onClick={() => openAttachment(w)} className="ml-auto inline-flex items-center gap-1 text-blue-600 font-bold"><Paperclip size={12} /> Attachment</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
