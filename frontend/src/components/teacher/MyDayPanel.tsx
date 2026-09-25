import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock, Handshake, Loader2, Mail, NotebookPen, UserX,
} from 'lucide-react';
import workspace, { MyDay } from '@/services/workspace.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const fmt = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

function Box({ icon: Icon, title, count, children, to, action }: {
  icon: typeof Clock; title: string; count?: number; children: React.ReactNode; to?: string; action?: string;
}) {
  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mr-auto"><Icon size={14} /> {title}</h3>
        {count != null && count > 0 && <span className="rounded-full bg-rose-100 text-rose-700 px-2 text-xs font-black">{count}</span>}
        {to && <Link to={to} className="text-xs font-bold text-blue-600">{action || 'Open'}</Link>}
      </div>
      {children}
    </div>
  );
}
const Empty = ({ text }: { text: string }) => <p className="text-xs text-slate-400">{text}</p>;

/** Teacher workspace: everything that needs the teacher today, in one place. */
export default function MyDayPanel() {
  const [data, setData] = useState<MyDay | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { workspace.today().then(setData).catch(() => setError('Could not load your day.')); }, []);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading your day…</div>;

  const openRegisters = data.registers.filter((r) => r.marked < r.total);
  return (
    <section className="space-y-3" aria-label="My day">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-black text-slate-900 mr-auto">My day · {fmt(data.date)}</h2>
        {!data.school_day && <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">No school today</span>}
        <Link to="/teacher/classes" className="text-xs font-bold text-blue-600">My classes</Link>
        <Link to="/teacher/reports" className="text-xs font-bold text-blue-600">Class reports</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        <Box icon={Clock} title="Today's lessons" to="/education/timetable/my" action="Timetable">
          {data.lessons.length === 0 ? <Empty text="No lessons on your timetable today." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.lessons.map((l) => (
                <li key={l.id} className={`py-2 flex items-center gap-2 ${l.now ? 'bg-blue-50 -mx-2 px-2 rounded-lg' : ''}`}>
                  <span className="w-20 text-xs font-bold text-slate-500">{l.start}–{l.end}</span>
                  <span className="min-w-0 mr-auto">
                    <span className="font-semibold text-slate-800">{l.subject}</span> <span className="text-slate-500">· {l.class_name}{l.section ? ` ${l.section}` : ''}</span>
                    {l.room && <span className="block text-[11px] text-slate-400">{l.room}{l.now ? ' · now' : ''}</span>}
                  </span>
                  {l.register_done
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={13} /> Register done</span>
                    : <Link to="/education/attendance/lessons" className={`text-[11px] font-bold ${l.past ? 'text-rose-600' : 'text-blue-600'}`}>
                        {l.register_taken ? `${l.register_taken}/${l.students} marked` : 'Take register'}
                      </Link>}
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box icon={ClipboardCheck} title="Daily registers" count={openRegisters.length}>
          {!data.school_day ? <Empty text="No register today." /> : data.registers.length === 0 ? <Empty text="No classes to register." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.registers.map((r) => (
                <li key={r.class_id} className="py-2 flex items-center gap-2">
                  <span className="mr-auto font-semibold">{r.class_name}{r.homeroom && <span className="ml-1 text-[10px] font-black uppercase text-blue-600">homeroom</span>}</span>
                  <span className="text-xs text-slate-500">{r.absent} absent · {r.late} late</span>
                  {r.marked >= r.total
                    ? <CheckCircle2 size={15} className="text-emerald-600" aria-label="Done" />
                    : <Link to={`/education/attendance/mark?class=${r.class_id}`} className="text-[11px] font-bold text-blue-600">{r.marked}/{r.total} · Take register</Link>}
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box icon={NotebookPen} title="Work to mark" count={data.to_mark_count + data.homework_to_mark.length} to="/education/gradebook" action="Gradebook">
          {data.to_mark.length === 0 && data.homework_to_mark.length === 0 ? <Empty text="Everything is marked." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.to_mark.map((a) => (
                <li key={a.id} className="py-1.5 flex justify-between gap-2">
                  <span className="truncate">{a.title} <span className="text-slate-400">· {a.subject} · {a.class_name}</span></span>
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{a.marked}/{a.total}</span>
                </li>
              ))}
              {data.homework_to_mark.map((h) => (
                <li key={h.id} className="py-1.5 flex justify-between gap-2">
                  <Link to="/education/homework" className="truncate hover:underline">{h.title} <span className="text-slate-400">· homework · {h.class_name}</span></Link>
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{h.waiting} handed in</span>
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box icon={UserX} title="Absence notes from parents" count={data.absence_notes.length}>
          {data.absence_notes.length === 0 ? <Empty text="No absence notes for today." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.absence_notes.map((n) => (
                <li key={n.id} className="py-1.5">
                  <span className="font-semibold">{n.student}</span> <span className="text-slate-400">· {n.class_name}</span>
                  <span className="block text-xs text-slate-500">{n.kind} · {n.reason}{n.note ? ` · “${n.note}”` : ''} · {n.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box icon={Handshake} title="Meetings today" to="/meetings" action="Meetings">
          {data.meetings.length === 0 ? <Empty text="No parent meetings booked today." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.meetings.map((m) => (
                <li key={m.id} className="py-1.5">
                  <span className="font-semibold">{m.start}</span> {m.with}{m.student ? <span className="text-slate-500"> about {m.student}</span> : null}
                  {(m.location || m.note) && <span className="block text-xs text-slate-500">{[m.location, m.note].filter(Boolean).join(' · ')}</span>}
                </li>
              ))}
            </ul>
          )}
        </Box>

        <Box icon={AlertTriangle} title="Behaviour follow-ups" count={data.follow_ups.filter((f) => f.overdue).length} to="/education/behaviour?tab=log" action="Behaviour log">
          {data.follow_ups.length === 0 ? <Empty text="No follow-ups due." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.follow_ups.map((f) => (
                <li key={f.id} className="py-1.5 flex justify-between gap-2">
                  <span className="truncate">{f.student} <span className="text-slate-400">· {f.category}</span></span>
                  <span className={`text-xs font-bold whitespace-nowrap ${f.overdue ? 'text-rose-600' : 'text-slate-500'}`}>{f.overdue ? 'overdue' : 'today'}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        <Box icon={BookOpen} title="Due this week" to="/education/gradebook" action="Gradebook">
          {data.due_soon.length === 0 ? <Empty text="Nothing due this week." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.due_soon.map((a) => (
                <li key={a.id} className="py-1.5 flex justify-between gap-2">
                  <span className="truncate">{a.title} <span className="text-slate-400">· {a.class_name}</span>{!a.published && <span className="ml-1 text-[10px] font-black uppercase text-amber-600">not published</span>}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{fmt(a.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Box>
        <Box icon={Mail} title="Messages" to="/messages" action="Inbox">
          <p className="text-2xl font-black text-slate-900">{data.unread_messages}</p>
          <p className="text-xs text-slate-500">unread message(s)</p>
        </Box>
        <Box icon={CalendarDays} title="Next 7 days" to="/calendar" action="Calendar">
          {data.upcoming.length === 0 ? <Empty text="Nothing on the calendar." /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.upcoming.map((e) => (
                <li key={e.id} className="py-1.5 flex justify-between gap-2"><span className="truncate">{e.title}</span><span className="text-xs text-slate-500 whitespace-nowrap">{fmt(e.start_date)}</span></li>
              ))}
            </ul>
          )}
        </Box>
      </div>
    </section>
  );
}
