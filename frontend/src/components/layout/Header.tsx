import React, { useState, useEffect } from 'react';
import { 
  Menu, Search, Maximize2, ShoppingBag, MessageSquare, Bell, 
  ShoppingCart, Building, ChevronDown, GraduationCap, LogOut, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [headerClass, setHeaderClass] = useState('bg-blue-600 text-white');

  useEffect(() => {
    const updateHeaderColor = () => {
      const saved = localStorage.getItem('theme_settings');
      if (saved) {
        try {
          const t = JSON.parse(saved);
          if (t.headerBg === 'Dark') setHeaderClass('bg-slate-800 text-white');
          else if (t.headerBg === 'Red') setHeaderClass('bg-rose-600 text-white');
          else if (t.headerBg === 'Dark Green') setHeaderClass('bg-teal-700 text-white');
          else if (t.headerBg === 'Green') setHeaderClass('bg-emerald-600 text-white');
          else if (t.headerBg === 'Blue') setHeaderClass('bg-blue-600 text-white');
          else if (t.headerBg === 'White') setHeaderClass('bg-white text-slate-800 border-b border-slate-100');
          else setHeaderClass('bg-blue-600 text-white');
        } catch (e) {
          setHeaderClass('bg-blue-600 text-white');
        }
      } else {
        setHeaderClass('bg-blue-600 text-white');
      }
    };

    updateHeaderColor();
    window.addEventListener('theme-changed', updateHeaderColor);
    return () => window.removeEventListener('theme-changed', updateHeaderColor);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`${headerClass} h-14 px-4 flex items-center justify-between shadow-md z-30 transition-colors duration-250`}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMobileMenuToggle} 
          className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6" />
          <span className="font-bold text-lg hidden sm:block">CodeCortex ERP</span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-white/90">
          <button 
            onClick={onMobileMenuToggle} 
            className="hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" 
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button className="hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Search">
            <Search className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className="hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1 bg-sky-400 hover:bg-sky-300 text-white rounded-full text-[10px] font-bold shadow-xs transition-colors">
            <span></span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[8px] opacity-80 uppercase">Download on the</span>
              <span>APP STORE</span>
            </div>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-[10px] font-bold shadow-xs transition-colors">
            <span>▶</span>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[8px] opacity-80 uppercase">Get it on</span>
              <span>GOOGLE PLAY</span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 text-white/90">
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative" title="Store Bag">
            <ShoppingBag className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative" title="Messages">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-600" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative" title="Notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-blue-600" />
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors relative" title="Cart">
            <ShoppingCart className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-blue-600" />
          </button>

          {/* User Avatar */}
          <div 
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 cursor-pointer">
              <User className="w-4 h-4" />
            </div>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">{user?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-500">{user?.email || 'admin@school.com'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}