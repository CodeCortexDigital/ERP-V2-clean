import { Link } from 'react-router-dom';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import TimetableViewPage from '@/pages/education/timetable/TimetableViewPage';

export default function StudentTimetablePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <CalendarDays size={16} className="text-blue-600" /> My Timetable
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>
      <TimetableViewPage />
    </div>
  );
}
