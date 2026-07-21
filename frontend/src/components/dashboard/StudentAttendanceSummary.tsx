interface ClassBreakdownItem {
  class_name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

interface StudentAttendanceSummaryProps {
  total: number;
  present: number;
  late: number;
  absent: number;
  classBreakdown?: ClassBreakdownItem[];
  loading: boolean;
  overallRate?: number | null;
  overallLabel?: string;
}

export default function StudentAttendanceSummary({
  total,
  present,
  late,
  absent,
  classBreakdown,
  loading,
  overallRate,
  overallLabel,
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
  if (total === 0) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <p className="text-[11px] font-bold text-slate-400 mb-2">No attendance marked for today</p>
        {overallRate != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(overallRate, 100)}%` }} />
            </div>
            <span className="text-[11px] font-black text-emerald-600">{overallRate}%</span>
            {overallLabel && <span className="text-[9px] text-slate-400 font-semibold">{overallLabel}</span>}
          </div>
        )}
      </div>
    );
  }

  const rate = Math.round(((present + late) / total) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
          Today&apos;s Attendance
        </h3>
      </div>

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

      {classBreakdown && classBreakdown.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="px-5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
            By Class
          </div>
          <div className="divide-y divide-slate-50">
            {classBreakdown.map((c) => (
              <div key={c.class_name} className="flex items-center gap-3 px-5 py-2.5">
                <span className="text-[11px] font-bold text-slate-700 w-24 truncate">{c.class_name}</span>
                <div className="flex-1 flex items-center gap-3 text-[10px] font-semibold">
                  {[
                    { label: 'P', value: c.present, color: 'text-emerald-600' },
                    { label: 'L', value: c.late, color: 'text-amber-500' },
                    { label: 'A', value: c.absent, color: 'text-rose-500' },
                  ].map(({ label, value, color }) => (
                    <span key={label} className={color}>
                      {label}:<span className="ml-0.5">{value}</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 w-7 text-right">{c.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
