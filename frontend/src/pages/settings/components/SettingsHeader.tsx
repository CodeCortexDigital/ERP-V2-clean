import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';

interface SettingsHeaderProps {
  title: string;
  isStudent: boolean;
  onBack: () => void;
}

export default function SettingsHeader({ title, isStudent, onBack }: SettingsHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <p className="text-xs text-slate-400">
            {isStudent ? 'Student Dashboard Settings' : 'Configure your school settings'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-slate-400" />
        <span className="text-[10px] text-slate-400 font-medium">v2.0</span>
      </div>
    </div>
  );
}