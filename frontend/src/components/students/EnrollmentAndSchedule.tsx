import { useEffect, useState } from 'react';
import { CalendarClock, History } from 'lucide-react';
import api from '@/services/api';
import type { StudentProfile } from '@/services/household.service';

type Schedule = { class_name: string; section: string; days: Array<{ day: string; lessons: Array<{ period: number; start: string; end: string; subject: string; teacher: string; room: string }> }> };

const TONE: Record<string, string> = {
  enrolled: 'bg-emerald-100 text-emerald-700', promoted: 'bg-sky-100 text-sky-700', repeated: 'bg-amber-100 text-amber-800',
  transferred: 'bg-slate-100 text-slate-700', withdrawn: 'bg-rose-100 text-rose-700', graduated: 'bg-violet-100 text-violet-700',
};
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString();

/** Enrollment history and the weekly class schedule, shown on the student's Overview tab. */
export default function EnrollmentAndSchedule({ data }: { data: StudentProfile }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [day, setDay] = useState('');
  useEffect(() => {
    api.get<Schedule>(`/auth/academics/students/${data.student.id}/schedule/`).then((r) => {
      setSchedule(r.data);
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      setDay(r.data.days.find((d) => d.day === today)?.day || r.data.days[0]?.day || '');
    }).catch(() => setSchedule(null));
  }, [data.student.id]);

  const lessons = schedule?.days.find((d) => d.day === day)?.lessons || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><History className="w-4 h-4" /> Enrollment history</h2>
        {(data.enrollments || []).length === 0 ? <p className="text-sm text-slate-500">No enrollment recorded yet.</p> : (
          <ol className="space-y-2 text-sm">
            {data.enrollments.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2">
                <span>
                  <strong>{e.class_name}{e.section ? ` · ${e.section}` : ''}</strong>{e.academic_year ? <span className="text-slate-500"> · {e.academic_year}</span> : null}
                  <span className="block text-xs text-slate-500">{fmt(e.start_date)} – {e.end_date ? fmt(e.end_date) : 'now'}{e.note ? ` · ${e.note}` : ''}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TONE[e.status] || 'bg-slate-100'}`}>{e.status_label}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Class schedule</h2>
        {!schedule || schedule.days.length === 0 ? <p className="text-sm text-slate-500">No timetable for this class yet.</p> : (
          <>
            <div className="flex gap-1 mb-3 overflow-x-auto" role="tablist">
              {schedule.days.map((d) => (
                <button key={d.day} role="tab" aria-selected={day === d.day} onClick={() => setDay(d.day)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${day === d.day ? 'bg-brand text-white' : 'bg-slate-100'}`}>{d.day.slice(0, 3)}</button>
              ))}
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {lessons.map((l) => (
                <li key={l.period} className="py-1.5 flex justify-between gap-2">
                  <span><span className="text-slate-500 text-xs mr-2">{l.start}{l.end ? `–${l.end}` : ''}</span><strong>{l.subject}</strong></span>
                  <span className="text-xs text-slate-500">{[l.teacher, l.room].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
