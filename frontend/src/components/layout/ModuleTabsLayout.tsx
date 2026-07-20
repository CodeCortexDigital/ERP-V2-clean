import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export interface ModuleTab {
  id: string;
  path: string; // full path used for navigation AND active matching (may include ?query)
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dark: string;
  light: string;
  rgb: string;
  roles?: string[]; // when set, tab is only shown to these roles
}

interface Props {
  tabs: ModuleTab[];
  scopeClass: string;
  children?: React.ReactNode;
}

const isActive = (t: ModuleTab, pathname: string, search: string) => {
  const [path, query] = t.path.split('?');
  if (pathname !== path) return false;
  const curParams = new URLSearchParams(search);
  if (!query) {
    // A query-less tab is only active when no query params are present
    return [...curParams.keys()].length === 0;
  }
  const tParams = new URLSearchParams(query);
  for (const [k, v] of tParams.entries()) {
    if (curParams.get(k) !== v) return false;
  }
  return true;
};

export default function ModuleTabsLayout({ tabs, scopeClass, children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const visibleTabs = tabs.filter((t) => !t.roles || (role && t.roles.includes(role)));
  const activeTab = visibleTabs.find((t) => isActive(t, location.pathname, location.search)) || visibleTabs[0] || tabs[0];
  const accent = `rgb(${activeTab.rgb})`;
  const accentSoft = `rgb(${activeTab.rgb} / 0.12)`;

  return (
    <div className={`${scopeClass} min-h-full`} style={{ ['--sa' as string]: activeTab.rgb }}>
      {/* Top Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = isActive(t, location.pathname, location.search);

            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs transition-all ${
                  active
                    ? `${t.dark} text-white shadow-md ring-2 ring-black/10 scale-102 font-extrabold`
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-semibold border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : ''}`} style={!active ? { color: `rgb(${t.rgb})` } : undefined} />
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
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
