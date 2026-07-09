import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Receipt, Landmark, BookOpenCheck, Award,
  Palette, ShieldCheck, Tag, LayoutGrid
} from 'lucide-react';

const settingsItems = [
  { id: 'profile', label: 'Institute Profile', icon: Building2, desc: 'School name, logo, address' },
  { id: 'fee-particulars', label: 'Fee Particulars', icon: Receipt, desc: 'Manage fee categories' },
  { id: 'fee-structure', label: 'Fee Structure', icon: Receipt, desc: 'Set fees per class' },
  { id: 'discount-type', label: 'Discount Type', icon: Tag, desc: 'Manage scholarships' },
  { id: 'bank-accounts', label: 'Accounts For Fees Invoice', icon: Landmark, desc: 'Bank account details' },
  { id: 'rules', label: 'Rules & Regulations', icon: BookOpenCheck, desc: 'Student & employee rules' },
  { id: 'grading', label: 'Marks Grading', icon: Award, desc: 'Grade scale settings' },
  { id: 'theme', label: 'Theme & Language', icon: Palette, desc: 'Customize appearance' },
  { id: 'account', label: 'Account Settings', icon: ShieldCheck, desc: 'Profile & security' },
];

export default function SettingsOverview() {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">General Settings</h2>
          <p className="text-xs text-slate-500">
            Configure institutional parameters, branding, bank accounts, and grading standards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/settings/${item.id}`)}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-500 hover:shadow-md transition-all text-left group"
            >
              <div className="p-2.5 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Icon className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-800">{item.label}</h4>
                <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}