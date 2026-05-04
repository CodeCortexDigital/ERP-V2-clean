import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setMobileSidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Desktop Sidebar - Fixed, no scroll */}
      <div className={`hidden md:block transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0`}>
        <div className="fixed h-screen" style={{ width: sidebarCollapsed ? '5rem' : '16rem' }}>
          <div className="bg-gray-900 text-white h-full overflow-hidden flex flex-col">
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-64 z-50 md:hidden">
            <div className="bg-gray-900 text-white h-full overflow-y-auto">
              <Sidebar isMobile onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            
            {/* Page Title - Could be dynamic */}
            <h1 className="text-lg font-semibold text-gray-800 hidden sm:block">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {user?.full_name?.split(' ')[0] || 'Admin'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
