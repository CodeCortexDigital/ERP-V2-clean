import React from 'react';
import { useNavigate } from 'react-router-dom';

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
  onClick
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
        ${color} text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden
        ${isClickable ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all duration-200' : ''}
      `}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold opacity-90">{title}</p>
            <div className="mt-3">{icon}</div>
          </div>
          <span className="text-4xl font-black truncate max-w-[180px]">{value}</span>
        </div>
      </div>

      {(suffix || subValue !== undefined) && (
        <div className="flex justify-between items-center text-[11px] font-semibold opacity-90 pt-4 mt-2 border-t border-white/10 relative z-10">
          <span>{suffix || 'This Month'}</span>
          <span>{currency ? `${currency} ` : ''}{subValue ?? value}</span>
        </div>
      )}

      {isClickable && (
        <div className="relative z-10 mt-2 text-[10px] font-medium text-white/60 flex items-center gap-1">
          <span>Click to view</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
