import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
  subValue?: string | number;
  currency?: string;
  navigateTo?: string;
  onClick?: () => void;
  /** Full value shown on hover when `value` is abbreviated (e.g. "Rs 2,028,500"). */
  fullValue?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color,
  suffix,
  subValue,
  currency,
  navigateTo,
  onClick,
  fullValue,
}: StatCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (navigateTo) {
      navigate(navigateTo);
    }
  };

  const isClickable = !!(onClick || navigateTo);

  return (
    <div
      onClick={handleClick}
      className={`
        group ${color} text-white p-5 rounded-2xl shadow-sm flex flex-col h-full relative overflow-hidden
        ${isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''}
      `}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${title}: ${fullValue || value}. Open details` : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full bg-white/5" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{title}</p>
        <span className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
          {icon}
        </span>
      </div>

      <p
        className="relative z-10 mt-1 text-[1.75rem] leading-tight font-extrabold tracking-tight tabular-nums break-words"
        title={fullValue}
      >
        {value}
      </p>

      {(suffix || subValue !== undefined) && (
        <p className="relative z-10 mt-1 text-xs text-white/75 truncate" title={String(subValue ?? '')}>
          <span className="font-semibold text-white/90">{suffix || 'This month'}:</span>{' '}
          {currency ? `${currency} ` : ''}{subValue ?? value}
        </p>
      )}

      {isClickable && (
        <div className="relative z-10 mt-auto pt-3 text-[11px] font-medium text-white/60 group-hover:text-white flex items-center gap-0.5 transition-colors">
          View details
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
}
