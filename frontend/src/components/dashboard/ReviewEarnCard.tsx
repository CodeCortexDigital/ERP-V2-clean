import { Gift, Star } from 'lucide-react';

export default function ReviewEarnCard() {
  return (
    <div className="bg-[#EEF2FF] p-6 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-2xs">
      <div className="space-y-1.5">
        <div className="flex gap-0.5 text-emerald-500 text-xs">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-emerald-500" />
          ))}
        </div>
        <h4 className="font-bold text-slate-800 text-xs">Review & earn</h4>
        <p className="text-[10px] text-slate-500 leading-tight">
          Receive <strong className="text-slate-800">$10</strong> as a reward plus<br/>Chance to win a Desktop plan
        </p>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
        <Gift className="w-7 h-7" />
      </div>
    </div>
  );
}
