import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/uiStore';

export default function Layout() {
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setMobileSidebarOpen]);

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
        <Header onMobileMenuToggle={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
