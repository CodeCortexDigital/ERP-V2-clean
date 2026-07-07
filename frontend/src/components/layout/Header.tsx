import React, { useState } from 'react';
import { 
  Menu, Search, Maximize2, ShoppingBag, MessageSquare, Bell, ShoppingCart, Building, ChevronDown, GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const [headerClass, setHeaderClass] = useState('bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white');

  React.useEffect(() => {
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
        } catch (e) {}
      } else {
        setHeaderClass('bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white');
      }
    };

    updateHeaderColor();
    window.addEventListener('theme-changed', updateHeaderColor);
    return () => window.removeEventListener('theme-changed', updateHeaderColor);
  }, []);

  return (
    <header className={`${headerClass} h-14 px-4 flex items-center justify-between shadow-md z-30 transition-colors duration-250`}>
      {/* Left Navigation Actions */}
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button onClick={onMobileMenuToggle} className="lg:hidden text-white/90 hover:text-white p-1">
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo & Institute Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-xs">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-black tracking-tight">CodeCortex</span>
            <span className="text-blue-200 text-[10px] font-light tracking-widest uppercase">ERP®</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors">
            <Building className="w-4 h-4 text-blue-100" />
            <span>Institute Name</span>
            <ChevronDown className="w-3 h-3 text-blue-200" />
          </div>
        </div>

        {/* Menu Toggle & Quick Action Icons */}
        <div className="hidden md:flex items-center gap-3 text-white/90">
          <button onClick={onMobileMenuToggle} className="hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Toggle Sidebar">
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

      {/* Right Action Icons & Mobile App Badges */}
      <div className="flex items-center gap-3">
        {/* App Store & Google Play Pill Buttons */}
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

        {/* Action Icon Badges */}
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

          <div className="w-8 h-8 rounded-full bg-white/20 p-1 flex items-center justify-center border border-white/30 ml-1">
            <Building className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
