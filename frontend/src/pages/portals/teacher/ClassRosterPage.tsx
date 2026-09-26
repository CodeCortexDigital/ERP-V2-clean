import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ClipboardCheck, Loader2, NotebookPen, Star } from 'lucide-react';
import workspace, { ClassCard, RosterRow } from '@/services/workspace.service';
import { NoPhotoBadge, usePhotoConsent } from '@/components/privacy/PhotoConsent';

const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
const tone = (v: number | null, low: number) => (v == null ? 'text-slate-400' : v < low ? 'text-rose-600 font-bold' : 'text-slate-800');
type Sort = 'name' | 'attendance' | 'average' | 'attention';

/** Teacher workspace: one class, one row per student, with who needs attention and why. */
export default function ClassRosterPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [data, setData] = useState<{ term: { name: string } | null; class: ClassCard; students: RosterRow[]; thresholds: Record<string, number> } | null>(null);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const photos = usePhotoConsent((data?.students || []).map((s) => String(s.id)));

  useEffect(() => { workspace.roster(id).then(setData).catch(() => setError('Class not found.')); }, [id]);

  const rows = useMemo(() => {
    if (!data) return [];
    const list = data.students.filter((r) => !onlyAttention || r.attention.length);
    const num = (v: number | null) => (v == null ? 999 : v);
    return [...list].sort((a, b) => sort === 'attendance' ? num(a.attendance_rate) - num(b.attendance_rate)
      : sort === 'average' ? num(a.average) - num(b.average)
      : sort === 'attention' ? b.attention.length - a.attention.length || a.full_name.localeCompare(b.full_name)
      : a.full_name.localeCompare(b.full_name));
  }, [data, sort, onlyAttention]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading the class…</div>;
  const c = data.class, t = data.thresholds;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/teacher/classes" className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><ArrowLeft size={13} /> My classes</Link>
        <h1 className="text-lg font-black text-slate-900 mr-auto">{c.name} <span className="text-sm font-semibold text-slate-500">· {c.subjects.join(', ')} · {c.students} students{data.term ? ` · ${data.term.name}` : ''}</span></h1>
        <Link to={`/education/attendance/mark?class=${c.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"><ClipboardCheck size={13} /> Register</Link>
        <Link to="/education/gradebook" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"><NotebookPen size={13} /> Gradebook</Link>
        <Link to="/education/behaviour?tab=log" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"><Star size={13} /> Behaviour</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[['Attendance', pct(c.attendance_rate)], ['Average', pct(c.average)], ['Missing work', String(c.missing)], ['Open incidents', String(c.open_incidents)], ['Need attention', String(c.attention)]].map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</p>
            <p className="text-xl font-black text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500">Sort:</span>
        {(['name', 'attention', 'attendance', 'average'] as Sort[]).map((s) => (
          <button key={s} onClick={() => setSort(s)} aria-pressed={sort === s}
            className={`px-2.5 py-1 rounded-lg border font-bold capitalize ${sort === s ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>{s}</button>
        ))}
        <label className="ml-auto inline-flex items-center gap-1.5 font-semibold text-slate-600">
          <input type="checkbox" checked={onlyAttention} onChange={(e) => setOnlyAttention(e.target.checked)} /> Only students who need attention
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-2 px-3">Student</th><th className="pr-3">Attendance</th><th className="pr-3">Absent / late</th>
              {c.subjects.map((s) => <th key={s} className="pr-3">{s}</th>)}
              <th className="pr-3">Missing</th><th className="pr-3">Merits / incidents</th><th className="pr-3">Needs attention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.attention.length ? 'bg-rose-50/40' : ''}>
                <td className="py-2 px-3">
                  <Link to={`/education/students/${r.id}`} className="font-semibold text-slate-800 hover:underline">{r.full_name}</Link>
                  <span className="block text-[11px] text-slate-400">{r.student_id}{r.section ? ` · ${r.section}` : ''}</span>
                  <NoPhotoBadge consent={photos[String(r.id)]} />
                </td>
                <td className={`pr-3 ${tone(r.attendance_rate, t.attendance)}`}>{pct(r.attendance_rate)}</td>
                <td className="pr-3 text-slate-600">{r.absences} / {r.late}</td>
                {c.subjects.map((s) => {
                  const g = r.grades.find((x) => x.subject === s);
                  return <td key={s} className={`pr-3 ${tone(g?.percent ?? null, t.average)}`}>{g?.percent != null ? `${g.percent}%` : '—'}{g?.letter ? <span className="text-slate-400 font-normal"> {g.letter}</span> : null}</td>;
                })}
                <td className={`pr-3 ${r.missing >= t.missing ? 'text-rose-600 font-bold' : ''}`}>{r.missing}</td>
                <td className="pr-3"><span className="text-emerald-700">{r.merits}</span> / <span className="text-rose-600">{r.incidents}</span></td>
                <td className="pr-3">
                  {r.attention.length ? (
                    <span className="flex flex-wrap gap-1">{r.attention.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 text-[11px] font-bold"><AlertTriangle size={10} /> {a}</span>)}</span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No students to show.</p>}
      </div>
      <p className="text-[11px] text-slate-400">A student needs attention with attendance below {t.attendance}%, an average below {t.average}%, {t.missing} or more missing pieces of work, or {t.incidents} or more incidents this term.</p>
    </div>
  );
}
