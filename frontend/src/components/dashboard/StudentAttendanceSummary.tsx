interface StudentAttendanceSummaryProps {
  total: number;
  present: number;
  late: number;
  absent: number;
  loading: boolean;
  overallRate?: number | null;
  overallLabel?: string;
  empTotal?: number;
  empPresent?: number;
  empAbsent?: number;
  empLeave?: number;
  empRate?: number;
}

export default function StudentAttendanceSummary({
  total,
  present,
  late,
  absent,
  loading,
  overallRate,
  overallLabel,
  empTotal,
  empPresent,
  empAbsent,
  empLeave,
  empRate,
}: StudentAttendanceSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-8 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
          Today&apos;s Attendance
        </h3>
      </div>

      <div className="px-5 pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Students</div>
      {total === 0 ? (
        <div className="px-5 pb-3">
          <p className="text-[11px] font-bold text-slate-400">No attendance marked for today</p>
          {overallRate != null && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(overallRate, 100)}%` }} />
              </div>
              <span className="text-[11px] font-black text-emerald-600">{overallRate}%</span>
              {overallLabel && <span className="text-[9px] text-slate-400 font-semibold">{overallLabel}</span>}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-px bg-slate-100 mx-5 rounded-xl overflow-hidden text-center text-[11px] font-bold">
            <div className="bg-white py-3 text-slate-700">
              <span className="block text-lg font-black text-slate-800">{total}</span>
              Total
            </div>
            <div className="bg-white py-3 text-emerald-600">
              <span className="block text-lg font-black text-emerald-600">{present}</span>
              Present
            </div>
            <div className="bg-white py-3 text-amber-500">
              <span className="block text-lg font-black text-amber-500">{late}</span>
              Late
            </div>
            <div className="bg-white py-3 text-rose-500">
              <span className="block text-lg font-black text-rose-500">{absent}</span>
              Absent
            </div>
          </div>

          <div className="px-5 py-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${rate}%` }} />
            </div>
            <span className="text-[11px] font-black text-emerald-600">{rate}%</span>
          </div>
        </>
      )}

      {empTotal != null && (
        <div className="border-t border-slate-100">
          <div className="px-5 pt-3 pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Employees</div>
          <div className="grid grid-cols-4 gap-px bg-slate-100 mx-5 rounded-xl overflow-hidden text-center text-[11px] font-bold">
            <div className="bg-white py-3 text-slate-700">
              <span className="block text-lg font-black text-slate-800">{empTotal}</span>
              Total
            </div>
            <div className="bg-white py-3 text-emerald-600">
              <span className="block text-lg font-black text-emerald-600">{empPresent}</span>
              Present
            </div>
            <div className="bg-white py-3 text-rose-500">
              <span className="block text-lg font-black text-rose-500">{empAbsent ?? 0}</span>
              Absent
            </div>
            <div className="bg-white py-3 text-amber-500">
              <span className="block text-lg font-black text-amber-500">{empLeave ?? 0}</span>
              Leave
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(empRate ?? 0, 100)}%` }} />
            </div>
            <span className="text-[11px] font-black text-emerald-600">{empRate ?? 0}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
