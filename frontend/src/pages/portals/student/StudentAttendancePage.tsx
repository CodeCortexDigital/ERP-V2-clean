import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ArrowLeft, Loader2, ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react';
import attendanceService from '@/services/attendance.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/contexts/AuthContext';

type Row = { date: string; status: string; reason?: string };

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const normStatus = (s: string) => {
  const st = s.toLowerCase();
  if (st === 'excused' || st === 'onleave' || st === 'on_leave') return 'leave';
  return st;
};

const weekdayColors = [
  'bg-indigo-50 text-indigo-700',  // Mon
  'bg-cyan-50 text-cyan-700',      // Tue
  'bg-teal-50 text-teal-700',      // Wed
  'bg-orange-50 text-orange-700',  // Thu
  'bg-pink-50 text-pink-700',      // Fri
];

const statusColor = (s: string) => {
  const st = normStatus(s);
  return st === 'present' ? 'bg-green-500'
    : st === 'leave' ? 'bg-blue-500'
    : st === 'absent' ? 'bg-red-500'
    : st === 'holiday' ? 'bg-yellow-400'
    : '';
};

const statusBg = (s: string) => {
  const st = normStatus(s);
  return st === 'present' ? 'bg-green-100 text-green-700'
    : st === 'leave' ? 'bg-blue-100 text-blue-700'
    : st === 'absent' ? 'bg-red-100 text-red-700'
    : st === 'holiday' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-slate-200 text-slate-600';
};

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, total: 0, percent: 0 });
  const [error, setError] = useState('');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [calDate, setCalDate] = useState(new Date());
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentService.resolveMe(user);
        if (!me) {
          if (active) setError('Student profile not found for this account.');
          return;
        }
        const sid = String(me.id || me.student_id);
        const [histRes, sumRes] = await Promise.all([
          attendanceService.getStudentHistory(sid, { limit: 200 }).catch(() => null),
          attendanceService.getSummary(sid).catch(() => null),
        ]);
        const list: any[] = Array.isArray(histRes?.data)
          ? histRes.data
          : (histRes?.data?.results || []);
        if (active) {
          const normalizeStatus = (s: string) => {
            const st = s.toLowerCase();
            if (st === 'excused' || st === 'onleave' || st === 'on_leave') return 'leave';
            return st;
          };
          const mapped: Row[] = list
            .map((r: any) => ({ date: r.date, status: normalizeStatus(r.status || ''), reason: r.reason || r.remarks }))
            .sort((a: Row, b: Row) => (a.date < b.date ? 1 : -1));
          setRows(mapped);
          const map: Record<string, string> = {};
          mapped.forEach((r) => { map[r.date] = r.status; });
          setStatusMap(map);

          const s = sumRes?.data || {};
          const present = Number(s.present ?? s.present_days ?? 0);
          const absent = Number(s.absent ?? s.absent_days ?? 0);
          const leave = Number(s.leave ?? s.leave_days ?? 0);
          const total = Number(s.total ?? s.total_days ?? (present + absent + leave)) || 0;
          setSummary({
            present, absent, leave, total,
            percent: total > 0 ? Math.round(((present + leave) / total) * 100) : 0,
          });
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load attendance.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const calCells: { day: number; current: boolean; status?: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calCells.push({ day: d, current: false, status: statusMap[dateStr] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calCells.push({ day: d, current: true, status: statusMap[dateStr] });
  }
  const remaining = 42 - calCells.length;
  for (let d = 1; d <= remaining; d++) {
    const dateStr = `${calYear}-${String(calMonth + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calCells.push({ day: d, current: false, status: statusMap[dateStr] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <CalendarCheck size={16} className="text-blue-600" /> My Attendance
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            {view === 'calendar' ? <List size={14} /> : <CalendarDays size={14} />}
            {view === 'calendar' ? 'Detail' : 'Calendar'}
          </button>
          <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
            <ArrowLeft size={13} /> Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Present', summary.present, 'text-green-600', 'bg-green-500'],
          ['Leave', summary.leave, 'text-blue-600', 'bg-blue-500'],
          ['Absent', summary.absent, 'text-red-600', 'bg-red-500'],
          ['Overall %', summary.percent + '%', 'text-emerald-600', 'bg-emerald-500'],
        ].map(([label, val, cls, dotCls]) => (
          <div key={label as string} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-xl font-black ${cls}`}>{val as string}</p>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotCls}`} />
              {label as string}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading attendance…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : view === 'calendar' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-semibold text-slate-800">{MONTH_NAMES[calMonth]} {calYear}</p>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 border border-slate-200 rounded-lg overflow-hidden bg-white">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-2 text-center border-r border-b border-slate-200 last:border-r-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{d}</span>
              </div>
            ))}
            {calCells.map((cell, idx) => {
              const today = new Date();
              const isToday = cell.current && cell.day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
              return (
                <div
                  key={idx}
                  className={`px-2 py-2.5 text-center text-sm transition-colors relative border-r border-b border-slate-200 ${
                    (idx + 1) % 7 === 0 ? 'border-r-0' : ''
                  } ${
                    !cell.current ? 'text-slate-300'
                    : idx % 7 < 5 ? `${weekdayColors[idx % 7]}`
                    : 'text-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      !cell.current ? 'text-slate-300'
                      : cell.status === 'present' || cell.status === 'present_p' ? 'bg-green-500 text-white'
                      : cell.status === 'leave' || cell.status === 'excused' || cell.status === 'onleave' ? 'bg-blue-500 text-white'
                      : cell.status === 'absent' || cell.status === 'absent_p' ? 'bg-red-500 text-white'
                      : cell.status === 'holiday' || cell.status === 'non_school_day' ? 'bg-yellow-400 text-white'
                      : isToday ? 'ring-2 ring-blue-400 bg-white text-slate-700 font-bold'
                      : 'text-slate-700'
                    }`}>{cell.day}</span>
                    {(cell.status === 'present' || cell.status === 'present_p') && <span className="text-[8px] font-black text-green-600 leading-none">P</span>}
                    {(cell.status === 'leave' || cell.status === 'excused' || cell.status === 'onleave') && <span className="text-[8px] font-black text-blue-600 leading-none">L</span>}
                    {(cell.status === 'absent' || cell.status === 'absent_p') && <span className="text-[8px] font-black text-red-600 leading-none">A</span>}
                    {(cell.status === 'holiday' || cell.status === 'non_school_day') && <span className="text-[8px] font-black text-yellow-600 leading-none">H</span>}
                    {isToday && !cell.status && <span className="text-[8px] font-black text-blue-300 leading-none">P</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 text-[10px] font-semibold text-slate-500">
            <span><span className="font-black text-green-600">P</span> Present</span>
            <span><span className="font-black text-blue-600">L</span> Leave</span>
            <span><span className="font-black text-red-600">A</span> Absent</span>
            <span><span className="font-black text-yellow-600">H</span> Holiday</span>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No attendance records found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Date</span><span>Status</span><span>Note</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2.5 text-xs border-b border-slate-50 items-center">
              <span className="font-bold text-slate-700">{r.date}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusBg(r.status)}`}>{r.status || '—'}</span>
              <span className="text-slate-400 truncate max-w-[160px]">{r.reason || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
