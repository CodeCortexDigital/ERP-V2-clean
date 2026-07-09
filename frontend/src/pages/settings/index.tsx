import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
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
import SettingsHeader from './components/SettingsHeader';

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
      {/* Sidebar - hidden for student */}
      {!isStudent && (
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 p-4">
          <SettingsSidebar currentPath={location.pathname} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        <SettingsHeader 
          title={pageTitle} 
          isStudent={isStudent}
          onBack={() => navigate(isStudent ? '/student' : '/dashboard')}
        />

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
  );
}