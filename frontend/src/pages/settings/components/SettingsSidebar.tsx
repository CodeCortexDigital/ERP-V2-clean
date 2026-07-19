import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Receipt, Landmark, Award,
  Palette, ShieldCheck, Tag, Languages
} from 'lucide-react';

interface SettingsSidebarProps {
  currentPath: string;
}

export interface SettingsTab {
  id: string;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dark: string;
  light: string;
  rgb: string;
}

export const menuItems: SettingsTab[] = [
  { id: 'profile', path: '/settings/profile', label: 'Profile', icon: Building2, dark: 'bg-blue-700', light: 'bg-blue-100', rgb: '29 78 216' },
  { id: 'theme', path: '/settings/theme', label: 'Theme', icon: Palette, dark: 'bg-cyan-700', light: 'bg-cyan-100', rgb: '14 116 144' },
  { id: 'language', path: '/settings/language', label: 'Language', icon: Languages, dark: 'bg-emerald-700', light: 'bg-emerald-100', rgb: '4 120 87' },
  { id: 'account', path: '/settings/account', label: 'Account', icon: ShieldCheck, dark: 'bg-slate-700', light: 'bg-slate-100', rgb: '51 65 85' },
  { id: 'role-permissions', path: '/settings/role-permissions', label: 'Role Permissions', icon: ShieldCheck, dark: 'bg-purple-700', light: 'bg-purple-100', rgb: '147 51 234' },
];

export const isSettingsTabActive = (t: SettingsTab, pathname: string) =>
  pathname === t.path || (t.path !== '/settings' && pathname.startsWith(t.path));

export default function SettingsSidebar({ currentPath }: SettingsSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((t) => {
        const Icon = t.icon;
        const isActive = isSettingsTabActive(t, currentPath);

        return (
          <button
            key={t.id}
            onClick={() => navigate(t.path)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              isActive
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
