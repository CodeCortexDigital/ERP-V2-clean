import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, GraduationCap, Loader2 } from 'lucide-react';
import workspace, { ClassCard } from '@/services/workspace.service';

const pct = (v: number | null) => (v == null ? '—' : `${v}%`);

/** Teacher workspace: every class the teacher teaches, with how it is doing this term. */
export default function MyClassesPage() {
  const [data, setData] = useState<{ term: { name: string } | null; classes: ClassCard[] } | null>(null);
  useEffect(() => { workspace.classes().then(setData).catch(() => setData({ term: null, classes: [] })); }, []);

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading your classes…</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><GraduationCap size={18} className="text-blue-600" /> My classes</h1>
        <span className="text-xs text-slate-500">{data.term ? data.term.name : 'Last 90 days (no term set up)'}</span>
      </div>
      {data.classes.length === 0 ? <p className="text-sm text-slate-500">You are not assigned to any class yet. Ask the office to add you on the timetable or as a subject teacher.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.classes.map((c) => (
            <Link key={c.id} to={`/teacher/classes/${c.id}`} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-400 transition-colors">
              <div className="flex items-start gap-2">
                <div className="mr-auto">
                  <p className="font-black text-slate-900">{c.name} {c.homeroom && <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 text-[10px] font-black uppercase">Homeroom</span>}</p>
                  <p className="text-xs text-slate-500">{c.subjects.join(', ') || 'No subjects'} · {c.students} students</p>
                </div>
                {c.attention > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] font-bold"><AlertTriangle size={11} /> {c.attention}</span>}
              </div>
              <dl className="grid grid-cols-4 gap-2 mt-3 text-center">
                {[['Today', `${c.today_marked}/${c.students}`], ['Attendance', pct(c.attendance_rate)], ['Average', pct(c.average)], ['Missing', String(c.missing)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 py-2">
                    <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</dt>
                    <dd className="text-sm font-bold text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
              {(c.today_absent > 0 || c.open_incidents > 0) && (
                <p className="text-xs text-slate-500 mt-2">{c.today_absent} absent today · {c.open_incidents} open incident(s)</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
