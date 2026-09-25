import { CalendarCheck, Loader2 } from 'lucide-react';
import ChildPicker, { usePortalChild } from '@/components/portal/ChildPicker';
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar';
import ReportAbsenceCard from '@/components/attendance/ReportAbsenceCard';

/** Parent portal: each child's attendance calendar, and telling the school about an absence. */
export default function ParentAttendancePage() {
  const { kids, id, setId, loading } = usePortalChild();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><CalendarCheck size={18} className="text-blue-600" /> Attendance</h1>
        <ChildPicker kids={kids} id={id} onChange={setId} />
      </div>
      <ReportAbsenceCard />
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>
        : id ? <AttendanceCalendar key={id} studentId={id} /> : <p className="text-sm text-slate-500">No children are linked to this account.</p>}
    </div>
  );
}
