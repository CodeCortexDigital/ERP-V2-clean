import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ArrowLeft, Loader2 } from 'lucide-react';
import attendanceService from '@/services/attendance.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/contexts/AuthContext';

type Row = { date: string; status: string; reason?: string };

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, total: 0, percent: 0 });
  const [error, setError] = useState('');

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
          attendanceService.getStudentHistory(sid, { limit: 60 }).catch(() => null),
          attendanceService.getSummary(sid).catch(() => null),
        ]);
        const list: any[] = Array.isArray(histRes?.data)
          ? histRes.data
          : (histRes?.data?.results || []);
        if (active) {
          setRows(
            list
              .map((r: any) => ({ date: r.date, status: (r.status || '').toLowerCase(), reason: r.reason || r.remarks }))
              .sort((a: Row, b: Row) => (a.date < b.date ? 1 : -1))
          );
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

  const statusStyle = (s: string) =>
    s.includes('present') ? 'bg-blue-100 text-blue-700'
    : s.includes('leave') ? 'bg-purple-100 text-purple-700'
    : s.includes('absent') ? 'bg-rose-100 text-rose-700'
    : 'bg-slate-200 text-slate-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <CalendarCheck size={16} className="text-blue-600" /> My Attendance
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Present', summary.present, 'text-blue-600'],
          ['Leave', summary.leave, 'text-purple-600'],
          ['Absent', summary.absent, 'text-rose-600'],
          ['Overall %', summary.percent + '%', 'text-emerald-600'],
        ].map(([label, val, cls]) => (
          <div key={label as string} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-xl font-black ${cls}`}>{val as string}</p>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label as string}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading attendance…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
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
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusStyle(r.status)}`}>{r.status || '—'}</span>
              <span className="text-slate-400 truncate max-w-[160px]">{r.reason || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
