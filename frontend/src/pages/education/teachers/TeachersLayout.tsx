import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, IdCard, FileText, KeyRound, BookOpenCheck
} from 'lucide-react';

const tabs = [
  { id: 'list', path: '/education/teachers', label: 'All Employees', icon: Users, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'add', path: '/education/teachers/add', label: 'New Employee', icon: UserPlus, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'job', path: '/education/teachers/job-letter', label: 'Job Letter', icon: FileText, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'idcards', path: '/education/teachers/id-cards', label: 'ID Cards', icon: IdCard, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'logins', path: '/education/teachers/logins', label: 'Portal Logins', icon: KeyRound, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'rules', path: '/education/teachers/rules', label: 'Staff Rules', icon: BookOpenCheck, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
];

const isTabActive = (t: typeof tabs[number], pathname: string) =>
  t.path === '/education/teachers'
    ? pathname === t.path
    : pathname.startsWith(t.path);

export default function TeachersLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) => isTabActive(t, location.pathname)) || tabs[0];
  const accent = `rgb(${activeTab.rgb})`;
  const accentSoft = `rgb(${activeTab.rgb} / 0.12)`;

  return (
    <div className="employees-scope min-h-full" style={{ ['--sa' as string]: activeTab.rgb }}>
      {/* Top Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = isTabActive(t, location.pathname);

            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs transition-all ${
                  isActive
                    ? `${t.dark} text-white shadow-md ring-2 ring-black/10 scale-102 font-extrabold`
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-semibold border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`} style={!isActive ? { color: `rgb(${t.rgb})` } : undefined} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Themed sub-header */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b border-black/5"
        style={{ backgroundColor: accentSoft }}
      >
        <div
          className="w-9 h-9 rounded-lg text-white flex items-center justify-center shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <activeTab.icon className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold" style={{ color: accent }}>{activeTab.label}</h2>
      </div>

      {/* Content - light tint matching the active tab */}
      <div className={`p-6 min-h-full ${activeTab.light}`}>
        <Outlet />
      </div>
    </div>
  );
}
