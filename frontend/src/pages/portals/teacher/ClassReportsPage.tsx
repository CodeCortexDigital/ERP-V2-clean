import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Loader2, Printer } from 'lucide-react';
import workspace, { ClassReport } from '@/services/workspace.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-x-auto';
const pct = (v: number | null) => (v == null ? '—' : `${v}%`);

/** Teacher workspace: grades and attendance across the teacher's classes, and everyone who needs attention. */
export default function ClassReportsPage() {
  const [data, setData] = useState<ClassReport | null>(null);
  useEffect(() => { workspace.report().then(setData).catch(() => setData(null)); }, []);

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Building the report…</div>;
  const letters = Array.from(new Set(data.grades.flatMap((g) => Object.keys(g.letters)))).sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><BarChart3 size={18} className="text-blue-600" /> Class reports</h1>
        <span className="text-xs text-slate-500">{data.term ? data.term.name : 'Last 90 days'}</span>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold print:hidden"><Printer size={13} /> Print</button>
      </div>

      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2 flex items-center gap-2"><AlertTriangle size={15} className="text-rose-600" /> Students who need attention ({data.attention.length})</h2>
        {data.attention.length === 0 ? <p className="text-sm text-slate-500">Nobody right now.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Student</th><th>Class</th><th>Attendance</th><th>Average</th><th>Missing</th><th>Incidents</th><th>Why</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.attention.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-semibold"><Link to={`/education/students/${r.id}`} className="hover:underline">{r.full_name}</Link></td>
                  <td>{r.class_name}</td><td>{pct(r.attendance_rate)}</td><td>{pct(r.average)}</td><td>{r.missing}</td><td>{r.incidents}</td>
                  <td className="text-xs text-rose-700 font-semibold">{r.attention.join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Grades by class and subject</h2>
        {data.grades.length === 0 ? <p className="text-sm text-slate-500">No marks this term yet.</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-1.5">Class</th><th>Subject</th><th>Students</th><th>Average</th><th>Highest</th><th>Lowest</th>
                {letters.map((l) => <th key={l}>{l}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.grades.map((g) => (
                <tr key={`${g.class_name}-${g.subject}`}>
                  <td className="py-2 font-semibold">{g.class_name}</td><td>{g.subject}</td><td>{g.students}</td>
                  <td className="font-bold">{pct(g.average)}</td><td>{pct(g.highest)}</td><td>{pct(g.lowest)}</td>
                  {letters.map((l) => <td key={l}>{g.letters[l] || ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Attendance by class</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Class</th><th>Students</th><th>Attendance</th><th>Days absent</th><th>Late arrivals</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.attendance.map((a) => (
              <tr key={a.class_name}>
                <td className="py-2 font-semibold">{a.class_name}</td><td>{a.students}</td>
                <td className={a.attendance_rate != null && a.attendance_rate < 90 ? 'text-rose-600 font-bold' : ''}>{pct(a.attendance_rate)}</td>
                <td>{a.absences}</td><td>{a.late}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
