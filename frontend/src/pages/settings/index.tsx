import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Import all settings pages
import SettingsOverview from './SettingsOverview';
import InstituteProfile from './InstituteProfile';
import FeeParticulars from './FeeParticulars';
import FeeStructure from './FeeStructure';
import DiscountType from './DiscountType';
import FeeChallanDetails from './FeeChallanDetails';
import RulesRegulations from './RulesRegulations';
import MarksGrading from './MarksGrading';
import ThemeLanguage from './ThemeLanguage';
import AccountSettings from './AccountSettings';
import SettingsSidebar from './components/SettingsSidebar';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStudent = role === 'student';

  const getPageTitle = (path: string) => {
    const routes: Record<string, string> = {
      '/settings': 'General Settings',
      '/settings/profile': 'Institute Profile',
      '/settings/fee-particulars': 'Fee Particulars',
      '/settings/fee-structure': 'Fee Structure',
      '/settings/discount-type': 'Discount Type',
      '/settings/bank-accounts': 'Accounts For Fees Invoice',
      '/settings/rules': 'Rules & Regulations',
      '/settings/grading': 'Marks Grading',
      '/settings/theme': 'Theme & Language',
      '/settings/account': 'Account Settings',
    };
    return routes[path] || 'Settings';
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-full bg-slate-50 min-h-screen">
      {/* Sidebar - only one sidebar */}
      {!isStudent && (
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <SettingsSidebar currentPath={location.pathname} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
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
                <Settings className="w-5 h-5 text-purple-600" />
                <h1 className="text-xl font-bold text-slate-800">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">v2.0</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<SettingsOverview />} />
            <Route path="/profile" element={<InstituteProfile />} />
            <Route path="/fee-particulars" element={<FeeParticulars />} />
            <Route path="/fee-structure" element={<FeeStructure />} />
            <Route path="/discount-type" element={<DiscountType />} />
            <Route path="/bank-accounts" element={<FeeChallanDetails />} />
            <Route path="/rules" element={<RulesRegulations />} />
            <Route path="/grading" element={<MarksGrading />} />
            <Route path="/theme" element={<ThemeLanguage />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="*" element={<Navigate to="/settings" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}