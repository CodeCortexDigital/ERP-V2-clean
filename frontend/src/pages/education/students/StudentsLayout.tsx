import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Users2, ToggleLeft, FileText,
  IdCard, Printer, KeyRound, ArrowUpDown, BookOpenCheck
} from 'lucide-react';

const tabs = [
  { id: 'list', path: '/education/students', label: 'Students', icon: Users, dark: 'bg-blue-700', light: 'bg-blue-100', rgb: '29 78 216' },
  { id: 'add', path: '/education/students/add', label: 'Add', icon: UserPlus, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'families', path: '/education/students/families', label: 'Families', icon: Users2, dark: 'bg-purple-700', light: 'bg-purple-100', rgb: '126 34 206' },
  { id: 'status', path: '/education/students/status', label: 'Status', icon: ToggleLeft, dark: 'bg-amber-700', light: 'bg-amber-100', rgb: '180 83 9' },
  { id: 'admission', path: '/education/students/admission-letter', label: 'Admission', icon: FileText, dark: 'bg-teal-700', light: 'bg-teal-100', rgb: '15 118 110' },
  { id: 'idcards', path: '/education/students/id-cards', label: 'ID Cards', icon: IdCard, dark: 'bg-indigo-700', light: 'bg-indigo-100', rgb: '67 56 202' },
  { id: 'print', path: '/education/students/print-list', label: 'Print', icon: Printer, dark: 'bg-slate-700', light: 'bg-slate-200', rgb: '51 65 85' },
  { id: 'logins', path: '/education/students/logins', label: 'Logins', icon: KeyRound, dark: 'bg-cyan-700', light: 'bg-cyan-100', rgb: '14 116 144' },
  { id: 'promote', path: '/education/students/promote', label: 'Promote', icon: ArrowUpDown, dark: 'bg-rose-700', light: 'bg-rose-100', rgb: '190 24 93' },
  { id: 'rules', path: '/education/students/rules', label: 'Rules', icon: BookOpenCheck, dark: 'bg-indigo-700', light: 'bg-indigo-100', rgb: '67 56 202' },
];

const isTabActive = (t: typeof tabs[number], pathname: string) =>
  t.path === '/education/students'
    ? pathname === t.path
    : pathname.startsWith(t.path);

export default function StudentsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) => isTabActive(t, location.pathname)) || tabs[0];
  const accent = `rgb(${activeTab.rgb})`;
  const accentSoft = `rgb(${activeTab.rgb} / 0.12)`;

  return (
    <div className="students-scope min-h-full" style={{ ['--sa' as string]: activeTab.rgb }}>
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
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white transition-all ${t.dark} ${
                  isActive
                    ? 'ring-2 ring-offset-1 ring-black/20 shadow-md scale-105'
                    : 'opacity-90 hover:opacity-100 hover:shadow-sm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
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
