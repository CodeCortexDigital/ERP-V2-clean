import { useEffect, useState } from 'react';
import { ChevronDown, FileText, GraduationCap } from 'lucide-react';
import gradebook from '@/services/gradebook.service';
import api from '@/services/api';
import { Modal } from '@/components/ui/Modal';
import { ReportCardView } from './ReportCardView';

type Grades = Awaited<ReturnType<typeof gradebook.studentGrades>>;
const STATUS: Record<string, string> = { missing: 'Missing', excused: 'Excused', late: 'Late', incomplete: 'Incomplete' };

/** Parent / student portal: current grades per subject with published assignments, and report cards. */
export default function GradesPortalCard() {
  const [kids, setKids] = useState<Array<{ id: string; full_name: string }>>([]);
  const [kid, setKid] = useState('');
  const [data, setData] = useState<Grades | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [card, setCard] = useState(false);

  useEffect(() => {
    api.get('/students/', { params: { page_size: 20 } }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[];
      setKids(rows.map((s) => ({ id: s.id, full_name: s.full_name })));
      if (rows[0]) setKid(rows[0].id);
    }).catch(() => setKids([]));
  }, []);
  useEffect(() => { if (kid) gradebook.studentGrades(kid).then(setData).catch(() => setData(null)); }, [kid]);

  if (!kids.length || !data || !data.term) return null;
  const graded = data.subjects.filter((s) => s.percent != null || s.assignments.length);

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold inline-flex items-center gap-2"><GraduationCap className="w-4 h-4 text-brand" /> Grades · {data.term.name}</h2>
        <div className="flex gap-2">
          {kids.length > 1 && <select aria-label="Child" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={kid} onChange={(e) => setKid(e.target.value)}>{kids.map((k) => <option key={k.id} value={k.id}>{k.full_name}</option>)}</select>}
          <button onClick={() => setCard(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold"><FileText className="w-4 h-4" /> Report cards</button>
        </div>
      </div>
      {graded.length === 0 ? <p className="text-sm text-slate-500">No grades yet this term.</p> : (
        <ul className="divide-y divide-slate-100">
          {graded.map((s) => (
            <li key={s.subject} className="py-2">
              <button onClick={() => setOpen(open === s.subject ? null : s.subject)} className="w-full flex items-center justify-between gap-2 text-sm" aria-expanded={open === s.subject}>
                <span className="font-semibold">{s.subject}{s.missing ? <span className="ml-2 text-xs font-semibold text-rose-600">{s.missing} missing</span> : null}</span>
                <span className="inline-flex items-center gap-2"><b className="text-lg">{s.letter || '—'}</b><span className="text-slate-500">{s.percent != null ? `${s.percent}%` : ''}</span><ChevronDown className={`w-4 h-4 transition-transform ${open === s.subject ? 'rotate-180' : ''}`} /></span>
              </button>
              {open === s.subject && (
                <table className="w-full text-sm mt-2">
                  <tbody className="divide-y divide-slate-50">
                    {s.assignments.map((a, i) => (
                      <tr key={i}>
                        <td className="py-1">{a.title}<span className="block text-xs text-slate-500">{a.category}{a.due_date ? ` · due ${new Date(`${a.due_date}T00:00:00`).toLocaleDateString()}` : ''}</span></td>
                        <td className="py-1 text-right whitespace-nowrap">{a.status && STATUS[a.status] ? <span className={`text-xs font-semibold ${a.status === 'missing' ? 'text-rose-600' : 'text-slate-500'}`}>{STATUS[a.status]}</span> : null} {a.points != null ? `${a.points}/${a.points_possible}` : a.status ? '' : 'Not graded'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </li>
          ))}
        </ul>
      )}
      {card && <Modal open onClose={() => setCard(false)} title="Report cards" size="xl"><div className="max-h-[72vh] overflow-y-auto"><ReportCardView studentId={kid} /></div></Modal>}
    </section>
  );
}
