import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  suffix?: string;
  subValue?: string | number;
  currency?: string;
}

export default function StatCard({ title, value, icon, color, suffix, subValue, currency }: StatCardProps) {
  return (
    <div className={`${color} text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold opacity-90">{title}</p>
          <div className="mt-3">{icon}</div>
        </div>
        <span className="text-4xl font-black truncate max-w-[180px]">{value}</span>
      </div>
      {(suffix || subValue !== undefined) && (
        <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10">
          <span>{suffix || 'This Month'}</span>
          <span>{currency ? `${currency} ` : ''}{subValue ?? value}</span>
        </div>
      )}
    </div>
  );
}
