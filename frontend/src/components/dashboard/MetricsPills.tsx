interface MetricsPillsProps {
  studentPct: number | null;
  employeePct: number | null;
  feeCollectionPct: string;
  loading: boolean;
}

export default function MetricsPills({ studentPct, employeePct, feeCollectionPct, loading }: MetricsPillsProps) {
  const pills = [
    { label: 'Today Present Students', value: loading ? '…' : studentPct !== null ? `${studentPct}%` : '0%' },
    { label: 'Today Present Employees', value: loading ? '…' : employeePct !== null ? `${employeePct}%` : '0%' },
    { label: 'This Month Fee Collection', value: feeCollectionPct },
  ];

  return (
    <div className="space-y-2.5">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs flex justify-between items-center text-xs font-bold text-slate-700"
        >
          <span>{pill.label}</span>
          <span className="text-blue-600">{pill.value}</span>
        </div>
      ))}
    </div>
  );
}
