import { AlertCircle } from 'lucide-react';
import type { PresentEmployee } from './types';

interface PresentEmployeesListProps {
  presentEmployees: PresentEmployee[];
  attendanceTotal: number | null;
  loading: boolean;
}

export default function PresentEmployeesList({ presentEmployees, attendanceTotal, loading }: PresentEmployeesListProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-bold text-xs text-blue-600">Today Present Employees</h3>
        <span className="text-[10px] font-semibold text-slate-400">
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
      {loading ? (
        <div className="py-8 text-center">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : presentEmployees.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-xs font-bold text-rose-500">
            {attendanceTotal && attendanceTotal > 0 ? 'No Employee Records Yet' : 'Attendance Not Marked Yet !'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {presentEmployees.map((r, i) => (
            <div key={r.id || i} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-slate-700 truncate">
                {r.employee_name || r.employee || 'Employee'}
              </span>
              <span className="ml-auto text-emerald-600 font-bold">Present</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
