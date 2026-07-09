import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function SettingsCard({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className = ''
}: SettingsCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-purple-50 rounded-xl">
              <Icon className="w-5 h-5 text-purple-600" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
            {description && (
              <p className="text-[11px] text-slate-400">{description}</p>
            )}
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}