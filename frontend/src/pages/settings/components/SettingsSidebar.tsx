import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Receipt, Landmark, BookOpenCheck, Award,
  Palette, ShieldCheck, Tag, LayoutGrid
} from 'lucide-react';

interface SettingsSidebarProps {
  currentPath: string;
}

const menuItems = [
  { id: 'overview', path: '/settings', label: 'Overview', icon: LayoutGrid },
  { id: 'profile', path: '/settings/profile', label: 'Institute Profile', icon: Building2 },
  { id: 'fee-particulars', path: '/settings/fee-particulars', label: 'Fee Particulars', icon: Receipt },
  { id: 'fee-structure', path: '/settings/fee-structure', label: 'Fee Structure', icon: Receipt },
  { id: 'discount-type', path: '/settings/discount-type', label: 'Discount Type', icon: Tag },
  { id: 'bank-accounts', path: '/settings/bank-accounts', label: 'Accounts For Fees Invoice', icon: Landmark },
  { id: 'rules', path: '/settings/rules', label: 'Rules & Regulations', icon: BookOpenCheck },
  { id: 'grading', path: '/settings/grading', label: 'Marks Grading', icon: Award },
  { id: 'theme', path: '/settings/theme', label: 'Theme & Language', icon: Palette },
  { id: 'account', path: '/settings/account', label: 'Account Settings', icon: ShieldCheck },
];

export default function SettingsSidebar({ currentPath }: SettingsSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-3">Settings</h3>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || 
          (item.path !== '/settings' && currentPath.startsWith(item.path));
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-purple-50 text-purple-700 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}