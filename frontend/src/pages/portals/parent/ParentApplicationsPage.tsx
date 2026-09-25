import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, FileText, Loader2, RefreshCcw } from 'lucide-react';
import portal, { FamilyApplications } from '@/services/portal.service';
import ReenrollmentCard from '@/components/admissions/ReenrollmentCard';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const TONE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700', reviewing: 'bg-blue-100 text-blue-700', approved: 'bg-emerald-100 text-emerald-700',
  enrolled: 'bg-emerald-100 text-emerald-700', waitlisted: 'bg-amber-100 text-amber-700', rejected: 'bg-rose-100 text-rose-700',
  withdrawn: 'bg-slate-100 text-slate-500',
};
const INTENT: Record<string, string> = { pending: 'Not answered yet', returning: 'Returning', undecided: 'Undecided', not_returning: 'Not returning' };
const when = (d?: string | null) => (d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Parent portal: the family's admission applications with their progress, re-enrolment answers, and applying for a sibling. */
export default function ParentApplicationsPage() {
  const [data, setData] = useState<FamilyApplications | null>(null);
  useEffect(() => { portal.applications().then(setData).catch(() => setData({ applications: [], reenrollment: [], apply_url: null })); }, []);

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading applications…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><ClipboardCheck size={18} className="text-blue-600" /> Applications</h1>
        {data.apply_url && (
          <a href={data.apply_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">
            Apply for a brother or sister <ExternalLink size={14} />
          </a>
        )}
      </div>

      <ReenrollmentCard />

      <section className="space-y-3">
        <h2 className="font-black text-slate-900">Admission applications</h2>
        {data.applications.length === 0 ? (
          <p className={`${card} text-sm text-slate-500`}>No applications yet.{data.apply_url ? ' Use "Apply for a brother or sister" to start one.' : ''}</p>
        ) : data.applications.map((a) => (
          <article key={a.id} className={card}>
            <div className="flex flex-wrap items-start gap-2">
              <div className="mr-auto">
                <p className="font-black text-slate-900">{a.student}</p>
                <p className="text-xs text-slate-500">{a.application_no} · {a.applying_for}{a.academic_year ? ` · ${a.academic_year}` : ''} · sent {when(a.submitted_at)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${TONE[a.status] || TONE.pending}`}>{a.status_label}</span>
            </div>
            <ol className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
              <li className="rounded-full bg-slate-50 px-2 py-0.5">Received {when(a.submitted_at)}</li>
              {a.steps.map((s, i) => <li key={i} className="rounded-full bg-slate-50 px-2 py-0.5">→ {s.label} {when(s.at)}</li>)}
            </ol>
            {a.interview_date && <p className="text-sm text-slate-700 mt-2">Interview / assessment: <b>{new Date(a.interview_date).toLocaleString()}</b></p>}
            {a.decision_note && <p className="text-sm text-slate-700 mt-2 rounded-lg bg-slate-50 px-3 py-2">{a.decision_note}</p>}
            <p className="text-xs text-slate-400 mt-2 inline-flex items-center gap-1"><FileText size={12} /> {a.documents} document(s) on file</p>
          </article>
        ))}
      </section>

      {data.reenrollment.length > 0 && (
        <section className={card}>
          <h2 className="font-black text-slate-900 flex items-center gap-2 mb-2"><RefreshCcw size={15} /> Re-enrolment answers</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {data.reenrollment.map((r) => (
              <li key={r.id} className="py-2 flex flex-wrap gap-2">
                <span className="font-semibold mr-auto">{r.student} <span className="text-slate-400 font-normal">· {r.campaign}</span></span>
                <span className={r.intent === 'pending' ? 'text-amber-700 font-bold' : 'font-bold'}>{INTENT[r.intent] || r.intent}</span>
                <span className="text-xs text-slate-400">{r.open ? (r.closes_on ? `closes ${when(r.closes_on)}` : 'open') : 'closed'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
