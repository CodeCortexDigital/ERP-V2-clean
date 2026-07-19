import { Wifi, WifiOff } from 'lucide-react';

interface LiveDataBadgeProps {
  connected: boolean;
}

export default function LiveDataBadge({ connected }: LiveDataBadgeProps) {
  if (!connected) return null;
  return (
    <div className="flex justify-end">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live Data
      </span>
    </div>
  );
}
