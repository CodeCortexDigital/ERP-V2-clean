import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  CreditCard, 
  Percent, 
  FileText, 
  BookOpen, 
  Palette, 
  User,
  Shield,
  Award,
  Users,
  DollarSign,
  School,
  Calendar,
  Settings,
  LayoutGrid,
  List,
  Plus
} from 'lucide-react';

const settingsCards = [
  {
    id: 'profile',
    title: 'Institute Profile',
    description: 'Manage school information, logo, and contact details',
    icon: Building2,
    color: 'bg-blue-50 text-blue-600',
    path: '/settings/profile'
  },
  {
    id: 'fee-particulars',
    title: 'Fee Particulars',
    description: 'Configure fee components and structures',
    icon: CreditCard,
    color: 'bg-emerald-50 text-emerald-600',
    path: '/settings/fee-particulars'
  },
  {
    id: 'fee-structure',
    title: 'Fee Structure',
    description: 'Set up fee plans and payment schedules',
    icon: DollarSign,
    color: 'bg-purple-50 text-purple-600',
    path: '/settings/fee-structure'
  },
  {
    id: 'discount-type',
    title: 'Discount Type',
    description: 'Manage fee waivers, percentage, and fixed amount discounts',
    icon: Percent,
    color: 'bg-amber-50 text-amber-600',
    path: '/settings/discount-type'
  },
  {
    id: 'bank-accounts',
    title: 'Accounts For Fees Invoice',
    description: 'Configure bank accounts for fee collection',
    icon: School,
    color: 'bg-indigo-50 text-indigo-600',
    path: '/settings/bank-accounts'
  },
  {
    id: 'rules',
    title: 'Rules & Regulations',
    description: 'Define school policies and rules',
    icon: Shield,
    color: 'bg-rose-50 text-rose-600',
    path: '/settings/rules'
  },
  {
    id: 'grading',
    title: 'Marks Grading',
    description: 'Configure grade scales and grading systems',
    icon: Award,
    color: 'bg-cyan-50 text-cyan-600',
    path: '/settings/grading'
  },
  {
    id: 'theme',
    title: 'Theme & Language',
    description: 'Customize appearance and language settings',
    icon: Palette,
    color: 'bg-fuchsia-50 text-fuchsia-600',
    path: '/settings/theme'
  },
  {
    id: 'account',
    title: 'Account Settings',
    description: 'Manage your profile and security settings',
    icon: User,
    color: 'bg-slate-50 text-slate-600',
    path: '/settings/account'
  }
];

export default function SettingsOverview() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Page description */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-slate-700">Configure your school settings</h2>
        </div>
        <p className="text-xs text-slate-500 ml-6">Manage all your school configurations from one place</p>
      </div>

      {/* Settings Grid - Cards, NOT sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsCards.map((card) => (
          <button
            key={card.id}
            onClick={() => navigate(card.path)}
            className="bg-white p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left group"
          >
            <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
              <card.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">{card.title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}