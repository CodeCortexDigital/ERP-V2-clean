import { useState, useEffect, useRef } from 'react';
import {
  Menu, Maximize2, Minimize2, ChevronDown, GraduationCap, LogOut, User, Sun, Moon, Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessagesBadge from '@/components/notifications/MessagesBadge';
import tenantService from '@/services/tenant.service';
import { readThemeSettings, saveThemeSettings, isDarkMode } from '@/utils/theme';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@/store/localeStore';
import { LanguageMenuButton } from '@/components/common/LanguagePicker';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

// Settings -> Theme -> "Navbar Header Style". 'Brand' follows the accent colour.
const HEADER_STYLES: Record<string, string> = {
  Brand: 'bg-brand-gradient text-white',
  Dark: 'bg-slate-900 text-white',
  Red: 'bg-rose-600 text-white',
  'Dark Green': 'bg-teal-700 text-white',
  'Light Green': 'bg-teal-600 text-white',
  Green: 'bg-emerald-600 text-white',
  Blue: 'bg-blue-600 text-white',
  White: 'bg-white text-slate-800 border-b border-slate-200',
};

let cachedSchoolName = '';

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerStyle, setHeaderStyle] = useState(() => readThemeSettings().headerBg);
  const [dark, setDark] = useState(() => isDarkMode(readThemeSettings().themeMode));
  const [schoolName, setSchoolName] = useState(cachedSchoolName);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const userLanguage = useLocaleStore((s) => s.userLanguage);
  const schoolLanguage = useLocaleStore((s) => s.school.language);
  const setUserLanguage = useLocaleStore((s) => s.setUserLanguage);
  const roleLabel = t(`roles.${['admin', 'teacher', 'student', 'parent'].includes(role || '') ? role : 'user'}`);

  useEffect(() => {
    const sync = () => {
      const t = readThemeSettings();
      setHeaderStyle(t.headerBg);
      setDark(isDarkMode(t.themeMode));
    };
    window.addEventListener('theme-changed', sync);
    return () => window.removeEventListener('theme-changed', sync);
  }, []);

  useEffect(() => {
    if (cachedSchoolName) return;
    tenantService.current().then((tenant) => {
      const name = tenant?.settings_json?.institute_name || tenant?.name || '';
      if (name) {
        cachedSchoolName = name;
        setSchoolName(name);
      }
    });
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menuOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const toggleDark = () => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    saveThemeSettings({ themeMode: dark ? 'light' : 'dark' });
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isWhite = headerStyle === 'White';
  const iconBtn = `p-2 rounded-lg transition-colors ${isWhite ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-white/85 hover:text-white hover:bg-white/15'}`;
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className={`${HEADER_STYLES[headerStyle] || HEADER_STYLES.Brand} h-14 px-3 sm:px-4 flex items-center justify-between shadow-sm z-30 transition-colors`}>
      {/* Left: menu, brand, sidebar/fullscreen */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <button onClick={onMobileMenuToggle} className={`md:hidden ${iconBtn}`} aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center shrink-0 ${isWhite ? 'bg-brand text-white' : 'bg-white/15'}`}>
            <GraduationCap className="w-5 h-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-[15px] truncate">{schoolName || 'CodeCortex ERP'}</p>
            <p className={`hidden sm:block text-[11px] truncate ${isWhite ? 'text-slate-500' : 'text-white/70'}`}>
              {t('header.schoolErp')}
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 ml-2">
          <button onClick={toggleSidebar} className={iconBtn} title="Collapse / expand sidebar" aria-label="Toggle sidebar">
            <Menu className="w-4 h-4" />
          </button>
          <button onClick={toggleFullscreen} className={iconBtn} title={isFullscreen ? 'Exit full screen' : 'Full screen'} aria-label="Toggle full screen">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Right: theme, notifications, account */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={toggleDark}
          className={iconBtn}
          title={dark ? t('header.toLight') : t('header.toDark')}
          aria-label={dark ? t('header.toLight') : t('header.toDark')}
        >
          {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <LanguageMenuButton
          value={userLanguage}
          schoolDefault={schoolLanguage}
          onChange={setUserLanguage}
          buttonClassName={iconBtn}
        />

        <MessagesBadge className={iconBtn} />

        <div className={isWhite ? 'text-slate-500' : 'text-white'}>
          <NotificationBell />
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex items-center gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-full transition-colors ${isWhite ? 'hover:bg-slate-100' : 'hover:bg-white/15'}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isWhite ? 'bg-brand text-white' : 'bg-white/20 ring-1 ring-white/30'}`}>
              {initials || <User className="w-4 h-4" />}
            </span>
            <span className="hidden lg:block text-left leading-tight max-w-[160px]">
              <span className="block text-sm font-semibold truncate">{displayName}</span>
              <span className={`block text-[11px] ${isWhite ? 'text-slate-500' : 'text-white/70'}`}>{roleLabel}</span>
            </span>
            <ChevronDown className={`hidden sm:block w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-700">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-soft">
                  {roleLabel}
                </span>
              </div>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate('/settings/account'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" /> {t('header.accountSettings')}
              </button>
              <button
                role="menuitem"
                onClick={toggleDark}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
              >
                {dark ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
                {dark ? t('header.lightMode') : t('header.darkMode')}
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> {t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
