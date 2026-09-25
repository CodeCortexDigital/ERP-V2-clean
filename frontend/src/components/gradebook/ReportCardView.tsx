import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Printer, ScrollText } from 'lucide-react';
import gradebook, { LEVEL_LABEL, type ReportCard, type Transcript } from '@/services/gradebook.service';
import { Modal } from '@/components/ui/Modal';

const LEVEL_TEXT: Record<number, string> = { 4: 'Exceeds', 3: 'Meets', 2: 'Approaching', 1: 'Beginning' };

function printArea(id: string, title: string) {
  const html = document.getElementById(id)?.innerHTML;
  const w = window.open('', '_blank');
  if (!w || !html) return toast.error('Allow pop-ups to print.');
  w.document.write(`<html><head><title>${title}</title><style>
    body{font-family:system-ui,sans-serif;color:#0f172a;padding:28px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border-bottom:1px solid #e2e8f0;padding:5px 6px;text-align:left}
    th{font-size:11px;text-transform:uppercase;color:#64748b}h1,h2,h3{margin:4px 0}.no-print{display:none}
    .grid{display:flex;gap:16px;flex-wrap:wrap}.box{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px}
  </style></head><body>${html}<script>window.print()</script></body></html>`);
  w.document.close();
}

/** A term report card: grades, categories, standards, comments, attendance and GPA. */
export function ReportCardView({ studentId, staff = false }: { studentId: string; staff?: boolean }) {
  const [term, setTerm] = useState('');
  const [card, setCard] = useState<ReportCard | null>(null);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState(false);

  useEffect(() => {
    setError('');
    gradebook.reportCard(studentId, term).then(setCard).catch((e) => { setCard(null); setError(e?.response?.data?.error || 'No report card yet.'); });
  }, [studentId, term]);

  const saveComment = async (classSubject: string | null, text: string) => {
    if (!card) return;
    try {
      await gradebook.comment({ student: studentId, term: card.term.id, class_subject: classSubject, comment: text });
      toast.success('Comment saved');
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save the comment.'); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {card && card.terms.length > 0 && (
          <select aria-label="Term" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={card.term.id} onChange={(e) => setTerm(e.target.value)}>
            {card.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.year}{staff && !t.released ? ' (not released)' : ''}</option>)}
          </select>
        )}
        {card && <button onClick={() => printArea('report-card', `Report card ${card.student.full_name}`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Printer className="w-4 h-4" /> Print</button>}
        <button onClick={() => setTranscript(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><ScrollText className="w-4 h-4" /> Transcript</button>
        {staff && card && !card.released && <span className="text-xs font-semibold text-amber-700">Families can't see this term yet. Release it in Gradebook → Report cards.</span>}
      </div>
      {error && !card && <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-6">{error}</p>}
      {!card && !error && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>}
      {card && (
        <div id="report-card" className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-sm">
          <div className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-3">
            <div><h2 className="text-lg font-bold">{card.school.name}</h2><p className="text-slate-500">Report card · {card.term.name} · {card.term.year}</p></div>
            <div className="text-right"><p className="font-bold">{card.student.full_name}</p><p className="text-slate-500">{card.student.student_id} · {card.student.class_name}{card.student.section ? ` ${card.student.section}` : ''}</p></div>
          </div>
          <table className="w-full">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left py-1">Subject</th><th className="text-left py-1">Grade</th><th className="text-left py-1">Percent</th><th className="text-left py-1">Breakdown</th><th className="text-left py-1">Teacher comment</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {card.subjects.map((s) => (
                <tr key={s.class_subject} className="align-top">
                  <td className="py-2 pr-2 font-semibold">{s.subject}{LEVEL_LABEL[s.level] ? <span className="ml-1 text-[11px] font-bold text-brand">{LEVEL_LABEL[s.level]}</span> : null}
                    {s.standards.length > 0 && (
                      <ul className="mt-1 space-y-0.5 font-normal text-xs text-slate-600">
                        {s.standards.map((st, i) => <li key={i}><b>{st.level}</b> {LEVEL_TEXT[st.level]} · {st.code ? `${st.code}: ` : ''}{st.description}</li>)}
                      </ul>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-lg font-bold">{s.letter || '—'}</td>
                  <td className="py-2 pr-2">{s.percent == null ? '—' : `${s.percent}%`}{s.missing ? <span className="block text-xs text-rose-600">{s.missing} missing</span> : null}</td>
                  <td className="py-2 pr-2 text-xs text-slate-600">{s.categories.filter((c) => c.percent != null).map((c) => `${c.name} ${c.percent}%`).join(' · ') || '—'}</td>
                  <td className="py-2 min-w-[220px]">
                    {staff ? (
                      <textarea className="w-full rounded border border-slate-200 px-2 py-1 text-sm no-print" rows={2} defaultValue={s.comment} aria-label={`Comment for ${s.subject}`}
                        onBlur={(e) => e.target.value !== s.comment && saveComment(s.class_subject, e.target.value)} />
                    ) : null}
                    <span className={staff ? 'hidden print:block' : ''}>{s.comment}</span>
                  </td>
                </tr>
              ))}
              {card.subjects.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No grades for this term yet.</td></tr>}
            </tbody>
          </table>
          <div className="grid">
            <div className="flex flex-wrap gap-3">
              <div className="box rounded-lg border border-slate-200 px-3 py-2"><p className="text-xs text-slate-500">GPA (unweighted)</p><p className="text-lg font-bold">{card.gpa.unweighted ?? '—'}</p></div>
              <div className="box rounded-lg border border-slate-200 px-3 py-2"><p className="text-xs text-slate-500">GPA (weighted)</p><p className="text-lg font-bold">{card.gpa.weighted ?? '—'}</p></div>
              <div className="box rounded-lg border border-slate-200 px-3 py-2"><p className="text-xs text-slate-500">Attendance</p><p className="text-lg font-bold">{card.attendance.rate == null ? '—' : `${card.attendance.rate}%`}</p><p className="text-xs text-slate-500">{card.attendance.absent} absent · {card.attendance.tardy} tardy</p></div>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Homeroom comment</h3>
            {staff ? <textarea className="w-full rounded border border-slate-200 px-2 py-1 no-print" rows={2} defaultValue={card.homeroom_comment} aria-label="Homeroom comment" onBlur={(e) => e.target.value !== card.homeroom_comment && saveComment(null, e.target.value)} /> : null}
            <p className={staff ? 'hidden print:block' : 'text-slate-700'}>{card.homeroom_comment || (staff ? '' : '—')}</p>
          </div>
          <p className="text-xs text-slate-500">Grading scale: {card.scale.bands.map((b) => `${b.label} ${b.min_percent}%+`).join(' · ')}</p>
        </div>
      )}
      {transcript && <TranscriptModal studentId={studentId} onClose={() => setTranscript(false)} />}
    </div>
  );
}

export function TranscriptModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [t, setT] = useState<Transcript | null>(null);
  useEffect(() => { gradebook.transcript(studentId).then(setT).catch(() => toast.error('Could not load the transcript.')); }, [studentId]);
  return (
    <Modal open onClose={onClose} title="Academic transcript" size="xl">
      {!t ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : (
        <div className="space-y-3 max-h-[72vh] overflow-y-auto">
          <button onClick={() => printArea('transcript', `Transcript ${t.student.full_name}`)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Printer className="w-4 h-4" /> Print</button>
          <div id="transcript" className="text-sm space-y-4">
            <div className="flex justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
              <div><h2 className="text-lg font-bold">{t.school.name}</h2><p className="text-slate-500">Official academic transcript</p></div>
              <div className="text-right"><p className="font-bold">{t.student.full_name}</p><p className="text-slate-500">{t.student.student_id}{t.student.date_of_birth ? ` · born ${new Date(`${t.student.date_of_birth}T00:00:00`).toLocaleDateString()}` : ''}</p></div>
            </div>
            {t.years.length === 0 && <p className="text-slate-500">No completed grades yet.</p>}
            {t.years.map((y) => (
              <div key={y.year}>
                <h3 className="font-bold">{y.year} · {y.class_name} <span className="font-normal text-slate-500">GPA {y.gpa.unweighted ?? '—'} (weighted {y.gpa.weighted ?? '—'})</span></h3>
                <table className="w-full">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="text-left py-1">Course</th>{y.courses[0]?.terms.map((tt) => <th key={tt.term} className="text-left py-1">{tt.term}</th>)}<th className="text-left py-1">Final</th><th className="text-left py-1">Credits</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {y.courses.map((c) => (
                      <tr key={c.subject}>
                        <td className="py-1.5">{c.subject}{LEVEL_LABEL[c.level] ? ` (${LEVEL_LABEL[c.level]})` : ''}</td>
                        {c.terms.map((tt) => <td key={tt.term} className="py-1.5">{tt.letter || '—'}</td>)}
                        <td className="py-1.5 font-bold">{c.final_letter} <span className="font-normal text-slate-500">{c.final_percent}%</span></td>
                        <td className="py-1.5">{c.credits_earned}/{c.credits_attempted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex gap-4 border-t border-slate-100 pt-2 font-semibold">
              <span>Cumulative GPA: {t.cumulative_gpa.unweighted ?? '—'} (weighted {t.cumulative_gpa.weighted ?? '—'})</span>
              <span>Credits earned: {t.credits_earned}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
