import { AlertCircle } from 'lucide-react';
import type { AbsentStudent } from './types';

interface AbsentStudentsListProps {
  absentStudents: AbsentStudent[];
  attendanceTotal: number | null;
  loading: boolean;
}

export default function AbsentStudentsList({ absentStudents, attendanceTotal, loading }: AbsentStudentsListProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-bold text-xs text-rose-500">Today Absent Students</h3>
        <span className="text-[10px] font-semibold text-slate-400">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
      {loading ? (
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : absentStudents.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-500">
            {attendanceTotal && attendanceTotal > 0 ? 'No Absences Today 🎉' : 'Attendance Not Marked Yet !'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {absentStudents.map((r, i) => (
            <div key={r.id || i} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              <span className="font-semibold text-slate-700 truncate">
                {r.name || r.student_name || 'Student'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {r.class || r.class_name || ''}
              </span>
              <span className="ml-auto text-rose-500 font-bold">Absent</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
