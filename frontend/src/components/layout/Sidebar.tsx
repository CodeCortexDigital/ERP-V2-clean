import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Settings, BookOpen, GraduationCap, Users,
  Wallet, Banknote, CreditCard, Hand, Calendar, FileText,
  Eye, MessageSquare, Video, FileQuestion,
  Edit, Award, Lock, Unlock, Search, X, ChevronRight, ChevronLeft, LogOut,
  DollarSign, User, Star
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { teacherQuickActions } from '@/config/teacherQuickActions';
import { readThemeSettings } from '@/utils/theme';

interface SubMenuItem {
  label: string;
  href: string;
  isLocked?: boolean;
  isLogout?: boolean;
  isDivider?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  isLocked?: boolean;
  isLogout?: boolean;
  subItems?: SubMenuItem[];
}

export function Sidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, role, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = (id: string, rect: DOMRect, count: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    const estHeight = Math.min(count * 34 + 16, window.innerHeight * 0.8);
    let top = rect.top;
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - estHeight - 8);
    }
    setHoveredId(id);
    setFlyoutPos({ top, left: rect.right });
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setHoveredId(null);
      setFlyoutPos(null);
    }, 180);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const [theme, setTheme] = useState({ sidebarBg: readThemeSettings().sidebarBg });

  useEffect(() => {
    const updateTheme = () => setTheme({ sidebarBg: readThemeSettings().sidebarBg });
    window.addEventListener('theme-changed', updateTheme);
    return () => window.removeEventListener('theme-changed', updateTheme);
  }, []);

  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const { canView, canAccess } = usePermissions();

  // Admin always sees the full menu; other roles are filtered by permissions.
  const isAdmin = role === 'admin';

  // Map a sub-item href to the permission module it belongs to (best-effort).
  const moduleForHref = (href: string): string | null => {
    const map: Array<[RegExp, string]> = [
      [/\/education\/academic-setup/, 'academic-setup'],
      [/\/education\/timetable/, 'timetable'],
      [/\/education\/behaviour/, 'behaviour'],
      [/\/education\/skills/, 'behaviour'],
      [/\/education\/communication/, 'communication'],
      [/\/education\/exams/, 'exams'],
      [/\/education\/class-tests/, 'exams'],
      [/\/education\/analytics/, 'reports'],
      [/\/education\/attendance/, 'attendance'],
      [/\/education\/students/, 'students'],
      [/\/education\/teachers/, 'employees'],
      [/\/education\/accounts/, 'accounts'],
      [/\/education\/fees/, 'fees'],
      [/\/education\/salary/, 'salary'],
      [/\/education\/certificates/, 'certificates'],
      [/\/settings/, 'settings'],
    ];
    for (const [re, mod] of map) {
      if (re.test(href)) return mod;
    }
    return null;
  };

  // Filter a set of menu items by the current role's view permissions.
  const filterByPermissions = (items: MenuItem[]): MenuItem[] => {
    if (isAdmin) return items;
    return items
      .filter((item) => canView((item as any).module || item.id))
      .map((item) => {
        if (!item.subItems) return item;
        const subItems = item.subItems.filter((sub) => {
          if (sub.isLogout || sub.isDivider) return true;
          const mod = moduleForHref(sub.href);
          return mod ? canView(mod) : true;
        });
        return { ...item, subItems };
      });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSettingsActive = () => {
    return location.pathname.startsWith('/settings');
  };

  const isLinkActive = (href: string) => {
    if (!href) return false;
    if (href === '#') return false;
    if (href === '#logout') return false;
    if (href === '──────────') return false;
    
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    try {
      const hrefUrl = new URL(href, window.location.origin);
      const currentUrl = new URL(currentPath + currentSearch, window.location.origin);
      
      if (hrefUrl.pathname !== currentUrl.pathname) {
        return false;
      }
      
      const hrefParams = hrefUrl.searchParams;
      const currentParams = currentUrl.searchParams;
      
      for (const [key, value] of hrefParams) {
        if (currentParams.get(key) !== value) {
          return false;
        }
      }
      
      return true;
    } catch (err) {
      return location.pathname === href;
    }
  };

  // ============================================================
  // ADMIN MENU - Logout is INSIDE Settings subItems
  // ============================================================
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, href: '/dashboard' },
    { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" />, href: '/education/students' },
    { id: 'attendance', label: 'Attendance', icon: <Hand className="w-4 h-4" />, href: '/education/attendance' },
    { id: 'fees', label: 'Fees', icon: <Banknote className="w-4 h-4" />, href: '/education/fees/invoices' },
    { id: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" />, href: '/education/teachers' },
    { id: 'salary', label: 'Salary', icon: <DollarSign className="w-4 h-4" />, href: '/education/salary/generate' },
    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" />, href: '/education/timetable' },
    { id: 'examination', label: 'Examination', icon: <Edit className="w-4 h-4" />, href: '/education/exams' },
    { id: 'behaviour', label: 'Behaviour & Skills', icon: <Eye className="w-4 h-4" />, href: '/education/behaviour?tab=rate-behaviour' },
    { id: 'accounts', label: 'Finance', icon: <Wallet className="w-4 h-4" />, href: '/education/accounts/chart-of-accounts' },
    { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-4 h-4" />, href: '/education/communication' },
    { id: 'academic-setup', label: 'Academic Setup', icon: <GraduationCap className="w-4 h-4" />, href: '/education/academic-setup' },
    { id: 'reports', label: 'Reports', icon: <Award className="w-4 h-4" />, href: '/education/analytics' },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" />, href: '/education/certificates' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, href: '/settings' },
  ];

  // Teacher Menu - derived from the SAME permission-filtered quick
  // actions as the dashboard, so the sidebar and portal stay in sync.
  // Only "Dashboard" is kept as a fixed item; everything else comes
  // from the RBAC-driven quick-action list (filtered by `canView`).
  const teacherMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/teacher',
    },
    ...teacherQuickActions
      .filter((q) => canView(q.module))
      .map((q) => ({
        id: q.id,
        module: q.module,
        label: q.label,
        icon: <q.icon className="w-4 h-4" />,
        href: q.href,
      })),
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      subItems: [
        { label: 'Account Settings', href: '/settings/account' },
        { label: '──────────', href: '#', isDivider: true },
        { label: 'Log out', href: '#logout', isLogout: true },
      ],
    },
  ];


  // Student Menu - with Logout inside Settings
  const studentMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/student'
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
      href: '/student/profile'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Calendar className="w-4 h-4" />,
      href: '/student/attendance'
    },
    {
      id: 'results',
      label: 'Results',
      icon: <Award className="w-4 h-4" />,
      href: '/student/results'
    },
    {
      id: 'homework',
      label: 'Homework',
      icon: <BookOpen className="w-4 h-4" />,
      href: '/student/homework'
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: <Calendar className="w-4 h-4" />,
      href: '/student/timetable'
    },
    {
      id: 'behaviour',
      label: 'Behaviour & Skills',
      icon: <Star className="w-4 h-4" />,
      href: '/student/behaviour'
    },
    {
      id: 'fees',
      label: 'Fees',
      icon: <Wallet className="w-4 h-4" />,
      href: '/student/fees'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <Award className="w-4 h-4" />,
      href: '/student/certificates'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/student/notifications'
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      subItems: [
        { label: 'Account Settings', href: '/settings/account' },
        { label: '──────────', href: '#', isDivider: true },
        { label: 'Log out', href: '#logout', isLogout: true }
      ]
    }
  ];

  let menuItems = isTeacher ? teacherMenuItems : isStudent ? studentMenuItems : adminMenuItems;
  menuItems = filterByPermissions(menuItems);

  // Auto-expand settings when on settings page
  useEffect(() => {
    if (isSettingsActive()) {
      setExpandedItems(prev => {
        if (!prev.includes('settings')) {
          return [...prev, 'settings'];
        }
        return prev;
      });
    }
  }, [location.pathname]);

  // Auto-expand items with active sub-items
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.subItems) {
        const hasActiveChild = item.subItems.some(sub => isLinkActive(sub.href));
        if (hasActiveChild) {
          setExpandedItems(prev => {
            if (prev.includes(item.id)) return prev;
            return [...prev, item.id];
          });
        }
      }
    });
  }, [location.pathname, location.search, menuItems]);

  const toggleExpand = (id: string) => {
    if (expandedItems.includes(id)) {
      setExpandedItems(expandedItems.filter(item => item !== id));
    } else {
      setExpandedItems([...expandedItems, id]);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!searchQuery) return true;
    const matchLabel = item.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSub = item.subItems?.some(sub => sub.label.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchLabel || matchSub;
  });

  const isCollapsed = sidebarCollapsed && !isMobile;

  const isDarkSidebar = theme.sidebarBg === 'Dark';
  const containerClass = isDarkSidebar 
    ? 'bg-slate-900 text-slate-200 border-r border-slate-800' 
    : 'bg-white text-slate-700 border-r border-slate-200/80';
  const searchBarClass = isDarkSidebar
    ? 'p-4 space-y-3 bg-slate-900 border-b border-slate-800'
    : 'p-4 space-y-3 bg-white border-b border-slate-100';
  const inputClass = isDarkSidebar
    ? 'w-full bg-slate-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-[color:var(--app-accent)] transition-colors placeholder:text-slate-500'
    : 'w-full bg-white text-xs text-slate-700 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[color:var(--app-accent)] transition-colors placeholder:text-slate-400';

  // Active item uses the brand accent from Settings -> Theme.
  const activeStyle = { bg: 'bg-brand', text: 'text-white font-bold' };

  // Self-contained keyframes for entrance/hover motion — no external
  // animation library required, mirrors the approach used on the dashboard.
  const SIDEBAR_ANIMATION_STYLES = `
    @keyframes sbFadeIn {
      from { opacity: 0; transform: translateX(-6px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes sbFlyoutIn {
      from { opacity: 0; transform: translateX(-4px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    .sb-fade-in {
      opacity: 0;
      animation: sbFadeIn 0.35s ease-out forwards;
    }
    .sb-flyout-in {
      animation: sbFlyoutIn 0.15s ease-out forwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .sb-fade-in, .sb-flyout-in { animation: none; opacity: 1; }
    }
  `;

  // Render a divider line
  const renderDivider = () => (
    <div className="flex items-center justify-center px-3 py-1">
      <div className="w-full border-t border-slate-200 dark:border-slate-700" />
    </div>
  );

  const portalLabel = isTeacher ? 'Teacher Portal' : isStudent ? 'Student Portal' : isParent ? 'Parent Portal' : 'Admin Portal';

  return (
    <aside className={`flex flex-col h-full transition-all duration-300 z-40 ${containerClass} ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <style>{SIDEBAR_ANIMATION_STYLES}</style>

      {/* Brand header */}
      <div className={`flex items-center gap-2 px-4 py-3.5 border-b ${isDarkSidebar ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-brand`}>
          <GraduationCap className="w-4.5 h-4.5" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${isDarkSidebar ? 'text-white' : 'text-slate-900'}`}>
              {portalLabel}
            </p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className={`shrink-0 p-1.5 rounded-md transition-colors duration-150 ${isDarkSidebar ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      {!isCollapsed && (
        <div className={searchBarClass}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="sidebar-nav flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        {filteredMenuItems.map((item, itemIndex) => {
          const hasSub = item.subItems && item.subItems.length > 0;
          const hasActiveSub = item.subItems?.some(sub => isLinkActive(sub.href));
          const isSettingsItem = item.id === 'settings';

          // Single item without sub-items
          if (!hasSub) {
            // Top-level logout button
            if (item.isLogout) {
              return (
                <button
                  key={item.id}
                  onClick={handleLogout}
                  className={`sb-fade-in w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 text-left ${isDarkSidebar ? 'text-slate-300 hover:bg-rose-900/40 hover:text-rose-300' : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'} ${isCollapsed ? 'justify-center' : ''}`}
                  style={{ animationDelay: `${itemIndex * 30}ms` }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                </button>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={item.href || '#'}
                onClick={isMobile && onClose ? onClose : undefined}
                className={({ isActive }) => `
                  sb-fade-in relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold
                  transition-all duration-150
                  ${isActive 
                    ? `${activeStyle.bg} ${activeStyle.text} shadow-sm` 
                    : isDarkSidebar ? 'text-slate-300 hover:bg-slate-800 hover:text-white hover:translate-x-0.5' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                style={{ animationDelay: `${itemIndex * 30}ms` }}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                {!isCollapsed && (
                  <span className="flex-1 truncate flex items-center justify-between">
                    {item.label}
                    {item.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500 ml-2" />}
                  </span>
                )}
              </NavLink>
            );
          }

          // Item with sub-items (expandable)
          const isActive = isSettingsItem ? isSettingsActive() : hasActiveSub;

          const isExpanded = expandedItems.includes(item.id) && !isCollapsed;

          return (
            <div
              key={item.id}
              className="sb-fade-in space-y-0.5"
              style={{ animationDelay: `${itemIndex * 30}ms` }}
              onMouseEnter={(e) => openFlyout(item.id, e.currentTarget.getBoundingClientRect(), item.subItems?.length || 0)}
              onMouseLeave={scheduleClose}
            >
              {/* Parent Toggle Item */}
              <button
                onClick={() => isCollapsed ? toggleSidebar() : toggleExpand(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 text-left
                  ${isActive || hoveredId === item.id
                    ? `${activeStyle.bg} ${activeStyle.text} shadow-sm`
                    : isDarkSidebar ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-50'
                  }
                  ${isCollapsed ? 'justify-center' : 'justify-between'}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="flex-shrink-0">{item.icon}</div>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    {item.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                    <span className={`text-slate-400 hover:text-slate-600 text-xs font-bold px-1 transition-transform duration-200 ${expandedItems.includes(item.id) ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </button>

              {/* Expanded Sub-Items (when sidebar is open) — animated via a
                  grid-row transition so it grows/shrinks smoothly instead
                  of popping in and out. */}
              {!isCollapsed && item.subItems && (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-3 pl-3 mt-0.5 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
                      {item.subItems.map((sub, idx) => {
                        if (sub.isDivider) {
                          return (
                            <div key={`divider-${idx}`} className="flex items-center justify-center px-2 py-0.5">
                              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                            </div>
                          );
                        }
                        if (sub.isLogout) {
                          return (
                            <button
                              key={`logout-${idx}`}
                              onClick={handleLogout}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 text-left ${isDarkSidebar ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Log out</span>
                            </button>
                          );
                        }
                        const subActive = isLinkActive(sub.href);
                        return (
                          <NavLink
                            key={`${sub.href}-${idx}`}
                            to={sub.href}
                            onClick={(e) => {
                              if (isMobile && onClose) {
                                onClose();
                              }
                            }}
                            className={`
                              relative flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150
                              ${subActive 
                                ? `${activeStyle.bg} ${activeStyle.text}` 
                                : isDarkSidebar ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                              }
                            `}
                          >
                            {sub.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 ml-auto" />}
                            <span className="truncate">{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Right-side Flyout Sub-Menu */}
              {hoveredId === item.id && flyoutPos && (
                <div
                  className={`sidebar-nav sb-flyout-in fixed z-50 min-w-[220px] max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl shadow-2xl border py-2 px-2 space-y-1 ${isDarkSidebar ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  style={{ top: flyoutPos.top, left: flyoutPos.left, transformOrigin: 'left center' }}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {item.subItems?.map((sub, idx) => {
                    // Render divider
                    if (sub.isDivider) {
                      return (
                        <div key={`divider-${idx}`} className="flex items-center justify-center px-3 py-1">
                          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                      );
                    }

                    // Render logout button
                    if (sub.isLogout) {
                      return (
                        <button
                          key={`logout-${idx}`}
                          onClick={handleLogout}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all text-left ${isDarkSidebar ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log out</span>
                        </button>
                      );
                    }

                    const subActive = isLinkActive(sub.href);
                    return (
                      <NavLink
                        key={`${sub.href}-${idx}`}
                        to={sub.href}
                        onClick={(e) => {
                          if (isMobile && onClose) {
                            onClose();
                          }
                        }}
                        className={`
                          relative flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-all
                          ${subActive 
                            ? `${activeStyle.bg} ${activeStyle.text}` 
                            : isDarkSidebar ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }
                        `}
                      >
                        {/* Active Blue Dot Indicator */}
                        {subActive && (
                          <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand ring-4 ring-white" />
                        )}
                        <span className="truncate">{sub.label}</span>
                        {sub.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 ml-1" />}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className={`shrink-0 border-t ${isDarkSidebar ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className={`w-full flex items-center gap-3 px-3 py-3 text-xs font-semibold transition-colors duration-150 ${
            isDarkSidebar
              ? 'text-rose-300 hover:text-rose-200 hover:bg-rose-900/40'
              : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
          } ${isCollapsed ? 'justify-center' : ''}`}
          title="Logout"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>


    </aside>
  );
}

export default Sidebar;