import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export interface ModuleTab {
  id: string;
  path: string; // full path used for navigation AND active matching (may include ?query)
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  // Legacy per-tab colours; tabs now all use the theme accent.
  dark?: string;
  light?: string;
  rgb?: string;
  roles?: string[]; // when set, tab is only shown to these roles
}

interface Props {
  tabs: ModuleTab[];
  scopeClass: string;
  children?: React.ReactNode;
  /** Keep a tab highlighted on its sub-pages (e.g. /students/edit/5 under "Students"). */
  matchNested?: boolean;
}

const isActive = (t: ModuleTab, pathname: string, search: string, nestedBase?: string) => {
  const [path, query] = t.path.split('?');
  if (nestedBase !== undefined && !query) {
    return path === nestedBase ? pathname === path : pathname.startsWith(path);
  }
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

export default function ModuleTabsLayout({ tabs, scopeClass, children, matchNested }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const visibleTabs = tabs.filter((t) => !t.roles || (role && t.roles.includes(role)));
  const nestedBase = matchNested ? tabs[0]?.path.split('?')[0] : undefined;
  const activeTab = visibleTabs.find((t) => isActive(t, location.pathname, location.search, nestedBase)) || visibleTabs[0] || tabs[0];

  return (
    <div className={`${scopeClass} min-h-full`}>
      {/* Top Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sticky top-0 z-10">
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = isActive(t, location.pathname, location.search, nestedBase);

            return (
              <button
                key={t.id}
                onClick={() => navigate(t.path)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs transition-colors border ${
                  active
                    ? 'bg-brand border-transparent shadow-sm font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 font-semibold'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Themed sub-header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-200 bg-brand-soft">
        <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shadow-sm">
          <activeTab.icon className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-brand">{activeTab.label}</h2>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 min-h-full bg-slate-50">
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
