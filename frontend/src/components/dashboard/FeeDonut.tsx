import { getCurrencySymbol } from '@/utils/currency';

interface FeeDonutProps {
  collections: number;
  remainings: number;
  currency?: string;
}

export default function FeeDonut({ collections, remainings, currency = getCurrencySymbol() }: FeeDonutProps) {
  const total = collections + remainings || 1;
  const pct = Math.round((collections / total) * 100);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
      <h3 className="font-bold text-xs text-slate-800">Estimated Fee This Month</h3>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center gap-1">
          💳 Monthly Target
        </p>
        <p className="text-2xl font-black text-emerald-600">
          {currency} {total.toLocaleString()}
        </p>
      </div>
      <div className="relative w-28 h-28 mx-auto my-4 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-100"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-emerald-500 transition-all duration-500"
            strokeDasharray={`${pct}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute font-black text-xs text-slate-800">{pct}%</div>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
        <div className="text-left">
          <p className="font-black text-slate-800">{currency} {collections.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">💳 Collections</p>
        </div>
        <div className="text-right">
          <p className="font-black text-slate-800">{currency} {remainings.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-rose-400 flex items-center gap-1">⚡ Remainings</p>
        </div>
      </div>
    </div>
  );
}
