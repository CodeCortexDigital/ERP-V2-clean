import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';  // Default import
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/store/uiStore';
import { initGlobalTheme } from '@/utils/theme';
import { useLocaleStore } from '@/store/localeStore';
import AiAssistant, { type ChatMode } from '@/components/AiAssistant';
import { useIdleSignOut } from '@/hooks/useIdleSignOut';
import SubscriptionBanner from '@/components/billing/SubscriptionBanner';
import { usePlanStore } from '@/store/planStore';

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  // One assistant for every portal; its welcome text and suggestions follow the role.
  const assistantMode: ChatMode =
    role === 'teacher' || role === 'parent' || role === 'student' ? role : 'admin';
  const { sidebarCollapsed } = useUIStore();
  useIdleSignOut();
  const hasAi = usePlanStore((s) => s.has('ai'));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Apply General Settings theme globally (sidebar/header/accent) to all pages
  useEffect(() => {
    initGlobalTheme();
    // The school's currency and language (Settings → Language & currency).
    useLocaleStore.getState().refresh();
    // The school's plan: which optional areas are open, and the trial / payment banner.
    usePlanStore.getState().refresh();
  }, []);

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setMobileSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile */}
      {mobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar isMobile onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMobileMenuToggle={toggleMobileSidebar}
        />
        <SubscriptionBanner />
        <main className="flex-1 overflow-y-auto p-4">
          {children || <Outlet />}
        </main>
      </div>

      {hasAi && <AiAssistant key={assistantMode} mode={assistantMode} />}
    </div>
  );
}
// Remove any duplicate exports and add only this at the end
export default Layout;