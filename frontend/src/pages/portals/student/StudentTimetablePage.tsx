import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ArrowLeft, Loader2, Printer } from 'lucide-react';
import academicService from '@/services/academic.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/contexts/AuthContext';

interface Period {
  id: string;
  period_number: number;
  name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

interface TimetableEntry {
  id: string;
  day_of_week: string;
  period: string;
  subject_name: string;
  teacher_name: string;
  classroom_name: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export default function StudentTimetablePage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const me = await studentService.resolveMe(user);
        const classId = me?.current_class || me?.current_class_id || me?.class_name;

        const [periodsRes, entriesRes] = await Promise.all([
          academicService.getPeriods(),
          classId ? academicService.getTimetableEntries({ class_id: classId }) : Promise.resolve({ data: [] }),
        ]);

        const p = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data as any)?.results || [];
        p.sort((a: Period, b: Period) => a.period_number - b.period_number);
        setPeriods(p);

        const e = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || [];
        setEntries(e);

        setTitle(me?.current_class?.name || me?.class_name || 'My Timetable');
      } catch (err) {
        console.error('Failed to load timetable', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const getSlot = (day: string, periodId: string) =>
    entries.find((e) => e.day_of_week.toLowerCase() === day && String(e.period) === String(periodId));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading timetable…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <CalendarDays size={16} className="text-blue-600" /> {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer size={14} /> Print / PDF
          </button>
          <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
            <ArrowLeft size={13} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block text-center border-b pb-3 mb-4">
        <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        <p className="text-[11px] text-slate-500">Generated on {dateStr}</p>
      </div>

      {periods.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No timetable configured for your class.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DAYS.map((day) => {
            const hasEntries = periods.some((p) => !p.is_break && getSlot(day, p.id));
            return (
              <div key={day} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{day}</p>
                </div>
                {!hasEntries ? (
                  <div className="px-3 py-6 text-center text-[10px] text-slate-300 font-semibold">No classes</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {periods.map((period) => {
                      const slot = period.is_break ? null : getSlot(day, period.id);
                      if (period.is_break) {
                        return (
                          <div key={period.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50/40">
                            <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">
                              {period.start_time.substring(0, 5)}
                            </span>
                            <span className="text-[10px] text-amber-600 font-semibold italic">Break</span>
                          </div>
                        );
                      }
                      return (
                        <div key={period.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors min-h-[40px]">
                          <span className="text-[10px] font-mono text-slate-400 w-16 shrink-0">
                            {period.start_time.substring(0, 5)}
                          </span>
                          <div className="flex-1 min-w-0">
                            {slot ? (
                              <>
                                <p className="text-[11px] font-bold text-slate-800 truncate">{slot.subject_name}</p>
                                <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                                  {slot.teacher_name && <span>{slot.teacher_name}</span>}
                                  {slot.classroom_name && <span>· {slot.classroom_name}</span>}
                                </div>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic">Free</span>
                            )}
                          </div>
                          {slot && (
                            <span className="text-[9px] font-bold text-slate-300 w-5 text-right shrink-0">
                              P{period.period_number}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
