import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, CalendarCheck, CalendarDays, FileText, GraduationCap, Info, Loader2, Mail, Star, TrendingUp, Wallet,
} from 'lucide-react';
import portal, { Overview } from '@/services/portal.service';
import { formatMoney } from '@/utils/currency';
import ChildPicker, { usePortalChild, usePortalHome } from './ChildPicker';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const fmt = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '');
const ALERT: Record<string, string> = {
  danger: 'bg-rose-50 border-rose-200 text-rose-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

function Tile({ to, icon: Icon, title, children }: { to: string; icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`${card} block hover:border-blue-400 transition-colors`}>
      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Icon size={13} /> {title}</p>
      <div className="mt-2">{children}</div>
    </Link>
  );
}

/** One-screen summary of a student's school life: alerts, attendance, grades, work, fees, messages, calendar, behaviour and documents. */
export default function PortalOverview() {
  const { kids, id, setId, loading: kidsLoading } = usePortalChild();
  const home = usePortalHome();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setData(null);
    setError('');
    portal.overview(id).then(setData).catch(() => setError('Could not load the overview.'));
  }, [id]);

  if (kidsLoading || !kids.length) return null;

  return (
    <section className="space-y-3" aria-label="Portal overview">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-black text-slate-800 mr-auto">
          {data ? `${data.student.full_name}${data.student.class_name ? ` · ${data.student.class_name}` : ''}` : 'Overview'}
        </h2>
        <ChildPicker kids={kids} id={id} onChange={setId} />
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : !data ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : (
        <>
          {data.alerts.length > 0 && (
            <ul className="space-y-1.5">
              {data.alerts.map((a, i) => (
                <li key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${ALERT[a.level] || ALERT.info}`}>
                  {a.level === 'info' ? <Info size={15} /> : <AlertTriangle size={15} />} {a.text}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile to={`${home}/attendance`} icon={CalendarCheck} title="Attendance">
              <p className="text-2xl font-black text-slate-900">{data.attendance.rate != null ? `${data.attendance.rate}%` : '—'}</p>
              <p className="text-xs text-slate-500">
                {data.attendance.absent + data.attendance.excused} absent · {data.attendance.late} late {data.attendance.period}
                {data.attendance.today ? <> · today <b className="capitalize">{data.attendance.today.replace('_', ' ')}</b></> : null}
              </p>
            </Tile>
            <Tile to={`${home}/progress`} icon={GraduationCap} title={data.grades.term ? `Grades · ${data.grades.term.name}` : 'Grades'}>
              <p className="text-2xl font-black text-slate-900">{data.grades.average != null ? `${data.grades.average}%` : '—'}</p>
              <p className="text-xs text-slate-500">
                {data.grades.subjects.length} subject(s){data.grades.missing ? <span className="text-rose-600 font-semibold"> · {data.grades.missing} missing</span> : null}
              </p>
            </Tile>
            <Tile to={`${home}/assignments`} icon={BookOpen} title="Work due">
              <p className="text-2xl font-black text-slate-900">{data.assignments.due_count}</p>
              <p className="text-xs text-slate-500">
                next 2 weeks{data.assignments.overdue_count ? <span className="text-rose-600 font-semibold"> · {data.assignments.overdue_count} overdue</span> : null}
              </p>
            </Tile>
            <Tile to={`${home}/fees`} icon={Wallet} title="Fees">
              <p className={`text-2xl font-black ${data.fees.overdue_invoices ? 'text-rose-600' : 'text-slate-900'}`}>{formatMoney(data.fees.balance)}</p>
              <p className="text-xs text-slate-500">
                {data.fees.next_due ? `next due ${fmt(data.fees.next_due.due_date)}` : 'nothing due'}
                {data.fees.last_payment ? ` · last paid ${fmt(data.fees.last_payment.date)}` : ''}
              </p>
            </Tile>
            <Tile to="/messages" icon={Mail} title="Messages">
              <p className="text-2xl font-black text-slate-900">{data.messages.unread}</p>
              <p className="text-xs text-slate-500">unread · {data.messages.announcements} new announcement(s)</p>
            </Tile>
            <Tile to={`${home}/behaviour`} icon={Star} title="Behaviour">
              <p className="text-2xl font-black text-slate-900">{data.behaviour.points} pts</p>
              <p className="text-xs text-slate-500">{data.behaviour.merits} merits · {data.behaviour.incidents} incidents</p>
            </Tile>
            <Tile to={`${home}/progress`} icon={TrendingUp} title="Progress">
              <p className="text-sm font-semibold text-slate-700 mt-1">Term by term grades, attendance and behaviour</p>
            </Tile>
            <Tile to={`${home}/documents`} icon={FileText} title="Documents">
              <p className="text-2xl font-black text-slate-900">{data.documents.count}</p>
              <p className="text-xs text-slate-500 truncate">{data.documents.latest[0] ? `latest: ${data.documents.latest[0].title}` : 'no documents yet'}</p>
            </Tile>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className={card}>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><BookOpen size={14} /> Due soon</h3>
              {data.assignments.due_soon.length === 0 && data.assignments.overdue.length === 0 ? <p className="text-xs text-slate-400">Nothing due in the next two weeks.</p> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.assignments.overdue.map((w) => (
                    <li key={w.id} className="py-1.5 flex justify-between gap-2"><span className="truncate">{w.title} <span className="text-slate-400">· {w.subject}</span></span><span className="text-xs font-bold text-rose-600 whitespace-nowrap">{w.status === 'missing' ? 'Missing' : 'Overdue'}</span></li>
                  ))}
                  {data.assignments.due_soon.map((w) => (
                    <li key={w.id} className="py-1.5 flex justify-between gap-2"><span className="truncate">{w.title} <span className="text-slate-400">· {w.subject}</span></span><span className={`text-xs font-bold whitespace-nowrap ${w.status === 'due_today' ? 'text-amber-600' : 'text-slate-500'}`}>{w.status === 'due_today' ? 'Today' : fmt(w.due_date)}</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div className={card}>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><GraduationCap size={14} /> Recently marked</h3>
              {data.assignments.recently_marked.length === 0 ? <p className="text-xs text-slate-400">No marked work in the last month.</p> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.assignments.recently_marked.map((w) => (
                    <li key={w.id} className="py-1.5 flex justify-between gap-2">
                      <span className="truncate">{w.title} <span className="text-slate-400">· {w.subject}</span></span>
                      <b className="whitespace-nowrap">{w.points ?? '—'}{w.points_possible != null ? ` / ${w.points_possible}` : ''}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={card}>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><CalendarDays size={14} /> Coming up</h3>
              {data.upcoming.length === 0 ? <p className="text-xs text-slate-400">Nothing on the calendar for the next two weeks.</p> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {data.upcoming.map((e) => (
                    <li key={e.id} className="py-1.5 flex justify-between gap-2"><span className="truncate">{e.title}</span><span className="text-xs text-slate-500 whitespace-nowrap">{fmt(e.start_date)}</span></li>
                  ))}
                </ul>
              )}
              <Link to="/calendar" className="inline-block mt-2 text-xs font-bold text-blue-600">Open calendar</Link>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
