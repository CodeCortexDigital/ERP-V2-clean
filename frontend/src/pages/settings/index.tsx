import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Import all settings pages
import InstituteProfile from './InstituteProfile';
import FeeParticulars from './FeeParticulars';
import FeeStructure from './FeeStructure';
import DiscountType from './DiscountType';
import FeeChallanDetails from './FeeChallanDetails';
import ThemeLanguage from './ThemeLanguage';
import LanguageSettings from './LanguageSettings';
import AccountSettings from './AccountSettings';
import SecurityPage from './SecurityPage';
import BillingPage from './BillingPage';
import SettingsSidebar, { menuItems, isSettingsTabActive } from './components/SettingsSidebar';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStudent = role === 'student';

  const activeTab = menuItems.find((t) => isSettingsTabActive(t, location.pathname)) || menuItems[0];

  return (
    <div className="settings-scope flex h-full bg-slate-50 min-h-screen flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(isStudent ? '/student' : '/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand" />
              <h1 className="text-xl font-bold text-slate-800">General Settings</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">v2.0</span>
          </div>
        </div>
      </div>

      {/* Top Tab Bar */}
      {!isStudent && (
        <div className="bg-white border-b border-slate-200 px-6 py-3">
          <SettingsSidebar currentPath={location.pathname} />
        </div>
      )}

      {/* Themed sub-header */}
      {!isStudent && (
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-200 bg-brand-soft">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shadow-sm">
            <activeTab.icon className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-brand">{activeTab.label}</h2>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto min-h-full">
          <Routes>
            <Route path="/" element={<Navigate to="/settings/profile" replace />} />
            <Route path="/profile" element={<InstituteProfile />} />
          <Route path="/fee-particulars" element={<FeeParticulars />} />
            <Route path="/fee-structure" element={<FeeStructure />} />
            <Route path="/discount-type" element={<DiscountType />} />
            <Route path="/bank-accounts" element={<FeeChallanDetails />} />
            <Route path="/theme" element={<ThemeLanguage />} />
          <Route path="/language" element={<LanguageSettings />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/role-permissions" element={<Navigate to="/settings/security?tab=roles" replace />} />
            <Route path="*" element={<Navigate to="/settings" replace />} />
          </Routes>
      </div>
    </div>
  );
}