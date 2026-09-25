import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import portal, { Progress } from '@/services/portal.service';
import ChildPicker, { usePortalChild, usePortalHome } from '@/components/portal/ChildPicker';
import { Modal } from '@/components/ui/Modal';
import { ReportCardView } from '@/components/gradebook/ReportCardView';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
const tone = (v: number | null | undefined) =>
  v == null ? 'text-slate-400' : v >= 80 ? 'text-emerald-700' : v >= 60 ? 'text-slate-800' : 'text-rose-600';

/** Academic progress over time: each term's average, attendance and behaviour, grades per subject, and attendance by month. */
export default function StudentProgressPage() {
  const home = usePortalHome();
  const { kids, id, setId, loading: kidsLoading } = usePortalChild();
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportCards, setReportCards] = useState(false);

  useEffect(() => {
    if (!id) { if (!kidsLoading) setLoading(false); return; }
    setLoading(true);
    portal.progress(id).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id, kidsLoading]);

  const anyReport = data?.terms.some((t) => t.report_card);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mr-auto">
          <TrendingUp size={16} className="text-blue-600" /> Academic progress
        </h3>
        <ChildPicker kids={kids} id={id} onChange={setId} />
        {anyReport && (
          <button onClick={() => setReportCards(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">
            <FileText size={13} /> Report cards
          </button>
        )}
        <Link to={home} className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><ArrowLeft size={13} /> Dashboard</Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="animate-spin mr-2" size={18} /> Loading progress…</div>
      ) : !data ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">No progress to show for this account.</div>
      ) : (
        <>
          {data.trend != null && (
            <div className={`${card} flex items-center gap-3`}>
              {data.trend >= 0 ? <TrendingUp className="text-emerald-600" /> : <TrendingDown className="text-rose-600" />}
              <p className="text-sm font-semibold text-slate-700">
                The average is <b className={data.trend >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{data.trend >= 0 ? 'up' : 'down'} {Math.abs(data.trend)} points</b> on the term before.
              </p>
            </div>
          )}

          <div className={`${card} overflow-x-auto`}>
            <h4 className="text-sm font-black text-slate-800 mb-2">Term by term</h4>
            {data.terms.length === 0 ? <p className="text-xs text-slate-400">No terms yet.</p> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-1.5 pr-3">Term</th><th className="pr-3">Average</th><th className="pr-3">Attendance</th>
                    <th className="pr-3">Absences</th><th className="pr-3">Late</th><th className="pr-3">Merits</th><th>Incidents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.terms.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 pr-3 font-semibold whitespace-nowrap">
                        {t.name}{t.year ? <span className="text-slate-400 font-normal"> · {t.year}</span> : null}
                        {t.current && <span className="ml-2 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-black uppercase">Now</span>}
                      </td>
                      <td className={`pr-3 font-bold ${tone(t.average)}`}>{pct(t.average)}</td>
                      <td className={`pr-3 ${t.attendance_rate != null && t.attendance_rate < 90 ? 'text-rose-600 font-semibold' : ''}`}>{pct(t.attendance_rate)}</td>
                      <td className="pr-3">{t.absences}</td><td className="pr-3">{t.late}</td>
                      <td className="pr-3 text-emerald-700">{t.merits}</td><td className="text-rose-600">{t.incidents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.subjects.length > 0 && (
            <div className={`${card} overflow-x-auto`}>
              <h4 className="text-sm font-black text-slate-800 mb-2">Grades by subject</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-1.5 pr-3">Subject</th>
                    {data.terms.map((t) => <th key={t.id} className="pr-3 whitespace-nowrap">{t.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.subjects.map((s) => (
                    <tr key={s.subject}>
                      <td className="py-2 pr-3 font-semibold">{s.subject}</td>
                      {data.terms.map((t) => <td key={t.id} className={`pr-3 font-bold ${tone(s.terms[t.id])}`}>{pct(s.terms[t.id])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={card}>
            <h4 className="text-sm font-black text-slate-800 mb-3">Attendance by month</h4>
            <div className="grid grid-cols-6 gap-2 items-end h-36">
              {data.months.map((m) => (
                <div key={m.month} className="flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[11px] font-bold text-slate-700">{pct(m.rate)}</span>
                  <div className="w-full max-w-10 rounded-t bg-slate-100 flex-1 flex items-end" title={`${m.label}: ${m.days} school day(s) recorded`}>
                    <div className={`w-full rounded-t ${m.rate != null && m.rate < 90 ? 'bg-rose-400' : 'bg-blue-500'}`} style={{ height: `${m.rate ?? 0}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {reportCards && id && (
        <Modal open onClose={() => setReportCards(false)} title="Report cards" size="xl">
          <div className="max-h-[72vh] overflow-y-auto"><ReportCardView studentId={id} /></div>
        </Modal>
      )}
    </div>
  );
}
