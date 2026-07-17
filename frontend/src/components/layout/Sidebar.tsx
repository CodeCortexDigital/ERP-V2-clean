import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Settings, BookOpen, GraduationCap, Users, 
  Wallet, Banknote, CreditCard, Hand, Calendar, FileText, 
  Eye, MessageSquare, Video, FileQuestion, 
  Edit, Award, Lock, Unlock, Search, X, ChevronRight, ChevronLeft, LogOut,
  DollarSign, ShoppingCart
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';

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
  const [theme, setTheme] = useState({
    sidebarBg: 'Dark',
    activeColor: 'Soft Light Purple'
  });

  useEffect(() => {
    const updateTheme = () => {
      const saved = localStorage.getItem('theme_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTheme({
            sidebarBg: parsed.sidebarBg || 'Dark',
            activeColor: parsed.activeColor || 'Soft Light Purple'
          });
        } catch (e) {}
      } else {
        setTheme({
          sidebarBg: 'Dark',
          activeColor: 'Soft Light Purple'
        });
      }
    };
    updateTheme();
    window.addEventListener('theme-changed', updateTheme);
    return () => window.removeEventListener('theme-changed', updateTheme);
  }, []);

  const isParent = role === 'parent';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

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
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/dashboard'
    },
    {
      id: 'settings',
      label: 'General Settings',
      icon: <Settings className="w-4 h-4" />,
      href: '/settings'
    },
    {
      id: 'academic-setup',
      label: 'Academic Setup',
      icon: <GraduationCap className="w-4 h-4" />,
      href: '/education/academic-setup'
    },
    {
      id: 'students',
      label: 'Students',
      icon: <Users className="w-4 h-4" />,
      href: '/education/students'
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="w-4 h-4" />,
      href: '/education/teachers'
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <Wallet className="w-4 h-4" />,
      href: '/education/accounts/chart-of-accounts'
    },
    {
      id: 'fees',
      label: 'Fees',
      icon: <Banknote className="w-4 h-4" />,
      href: '/education/fees/invoices'
    },
    {
      id: 'salary',
      label: 'Salary',
      icon: <DollarSign className="w-4 h-4" />,
      href: '/education/salary/generate'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Hand className="w-4 h-4" />,
      href: '/education/attendance'
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: <Calendar className="w-4 h-4" />,
      href: '/education/timetable'
    },
    {
      id: 'behaviour',
      label: 'Behaviour & Skills',
      icon: <Eye className="w-4 h-4" />,
      href: '/education/behaviour/rate'
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/education/communication'
    },
    {
      id: 'examination',
      label: 'Examination',
      icon: <Edit className="w-4 h-4" />,
      href: '/education/exams'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <Award className="w-4 h-4" />,
      href: '/education/analytics'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <Award className="w-4 h-4" />,
      href: '/education/certificates'
    },
    {
      id: 'online-store',
      label: 'Online Store',
      icon: <ShoppingCart className="w-4 h-4" />,
      href: '/education/store'
    },
    {
      id: 'logout',
      label: 'Log out',
      icon: <LogOut className="w-4 h-4" />,
      isLogout: true
    }
  ];

  // Teacher Menu - with Logout inside Settings
  const teacherMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/teacher'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Calendar className="w-4 h-4" />,
      subItems: [
        { label: 'Student Attendance', href: '/education/attendance' },
        { label: 'Attendance Sheet', href: '/education/attendance/sheet' }
      ]
    },
    {
      id: 'academic-setup',
      label: 'Academic Setup',
      icon: <GraduationCap className="w-4 h-4" />,
      href: '/education/academic-setup'
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: <Calendar className="w-4 h-4" />,
      subItems: [
        { label: 'View Timetable', href: '/education/timetable/view' },
        { label: 'My Leave', href: '/education/timetable/my-leave' }
      ]
    },
    {
      id: 'behaviour',
      label: 'Behaviour & Skills',
      icon: <Eye className="w-4 h-4" />,
      subItems: [
        { label: 'Rate Behaviours', href: '/education/behaviour/rate' },
        { label: 'Rate Skills', href: '/education/skills/rate' },
        { label: 'Observations', href: '/education/behaviour/observations' }
      ]
    },
    {
      id: 'messaging',
      label: 'Messaging',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/education/communication'
    },
    {
      id: 'exams',
      label: 'Exams',
      icon: <Edit className="w-4 h-4" />,
      subItems: [
        { label: 'Add / update Exam Marks', href: '/education/exams?tab=marks' },
        { label: 'Result Card', href: '/education/exams?tab=results' },
        { label: 'Result Sheet', href: '/education/exams/sheet' }
      ]
    },
    {
      id: 'classtests',
      label: 'Class Tests',
      icon: <FileText className="w-4 h-4" />,
      subItems: [
        { label: 'Manage Test Marks', href: '/education/class-tests' },
        { label: 'Test Result', href: '/education/class-tests?tab=results' }
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <Award className="w-4 h-4" />,
      subItems: [
        { label: 'Students report Card', href: '/education/analytics?report=card' },
        { label: 'Students info report', href: '/education/analytics?report=students-info' }
      ]
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

  // Student Menu - with Logout inside Settings
  const studentMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/student'
    },
    {
      id: 'admission_letter',
      label: 'Admission Letter',
      icon: <FileText className="w-4 h-4" />,
      href: '/education/students/admission-letter'
    },
    {
      id: 'paid_fee_receipt',
      label: 'Paid Fee Receipt',
      icon: <CreditCard className="w-4 h-4" />,
      href: '/education/finance/fees-paid-slip'
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: <Calendar className="w-4 h-4" />,
      href: '/student/timetable'
    },
    {
      id: 'report_card',
      label: 'My Report Card',
      icon: <Award className="w-4 h-4" />,
      href: '/education/analytics?report=card'
    },
    {
      id: 'test_results',
      label: 'Test Results',
      icon: <Edit className="w-4 h-4" />,
      href: '/education/class-tests?tab=results'
    },
    {
      id: 'exam_result',
      label: 'Exam Result',
      icon: <Award className="w-4 h-4" />,
      href: '/education/exams?tab=results'
    },
    {
      id: 'home_assignments',
      label: 'Home Assignments',
      icon: <FileText className="w-4 h-4" />,
      href: '/education/academic-setup'
    },
    {
      id: 'online_store',
      label: 'Online Store',
      icon: <ShoppingCart className="w-4 h-4" />,
      href: '/education/store'
    },
    {
      id: 'messaging',
      label: 'Messaging',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/education/communication'
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
    ? 'w-full bg-slate-800 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-500'
    : 'w-full bg-white text-xs text-slate-700 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400';

  const colorMap: Record<string, { bg: string; text: string }> = {
    'Coral Red': { bg: 'bg-[#E55B4C]', text: 'text-white font-bold' },
    'Magenta': { bg: 'bg-[#D81B60]', text: 'text-white font-bold' },
    'Turquoise': { bg: 'bg-[#00BFA5]', text: 'text-slate-950 font-bold' },
    'Blue': { bg: 'bg-[#2E73D2]', text: 'text-white font-bold' },
    'Yellow': { bg: 'bg-[#F59E0B]', text: 'text-slate-950 font-bold' },
    'Red Orange': { bg: 'bg-[#F97316]', text: 'text-white font-bold' },
    'Soft Light Purple': { bg: 'bg-[#ECECFE]', text: 'text-purple-700 font-bold' },
    'Dark Slate Blue': { bg: 'bg-[#4D51B4]', text: 'text-white font-bold' },
    'Hot Pink': { bg: 'bg-[#EC4899]', text: 'text-white font-bold' },
    'Bright Orange': { bg: 'bg-[#FF4F00]', text: 'text-white font-bold' },
    'Green': { bg: 'bg-[#008744]', text: 'text-white font-bold' },
    'Dark Purple': { bg: 'bg-[#730073]', text: 'text-white font-bold' }
  };

  const activeStyle = colorMap[theme.activeColor] || { bg: 'bg-blue-50', text: 'text-blue-600 font-bold' };

  // Render a divider line
  const renderDivider = () => (
    <div className="flex items-center justify-center px-3 py-1">
      <div className="w-full border-t border-slate-200 dark:border-slate-700" />
    </div>
  );

  return (
    <aside className={`flex flex-col h-full transition-all duration-300 z-40 ${containerClass} ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Search Input Bar & Menu Title Header */}
      {!isCollapsed && (
        <div className={searchBarClass}>
          <div className={`text-xs font-bold tracking-wider uppercase font-display ${isDarkSidebar ? 'text-slate-400' : 'text-slate-800'}`}>menu</div>
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
        {filteredMenuItems.map((item) => {
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${isDarkSidebar ? 'text-slate-300 hover:bg-rose-900/40 hover:text-rose-300' : 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'} ${isCollapsed ? 'justify-center' : ''}`}
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
                  flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                  ${isActive 
                    ? `${activeStyle.bg} ${activeStyle.text}` 
                    : isDarkSidebar ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
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

          return (
            <div
              key={item.id}
              className="space-y-0.5"
              onMouseEnter={(e) => openFlyout(item.id, e.currentTarget.getBoundingClientRect(), item.subItems?.length || 0)}
              onMouseLeave={scheduleClose}
            >
              {/* Parent Toggle Item */}
              <button
                onClick={() => isCollapsed ? toggleSidebar() : toggleExpand(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left
                  ${isActive || hoveredId === item.id
                    ? `${activeStyle.bg} ${activeStyle.text}`
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

              {/* Expanded Sub-Items (when sidebar is open) */}
              {!isCollapsed && expandedItems.includes(item.id) && item.subItems && (
                <div className="ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5">
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
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all text-left ${isDarkSidebar ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
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
                        {sub.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 ml-auto" />}
                        <span className="truncate">{sub.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}

              {/* Right-side Flyout Sub-Menu */}
              {hoveredId === item.id && flyoutPos && (
                <div
                  className={`sidebar-nav fixed z-50 min-w-[220px] max-h-[80vh] overflow-y-auto custom-scrollbar rounded-lg shadow-2xl border py-2 px-2 space-y-1 ${isDarkSidebar ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                  style={{ top: flyoutPos.top, left: flyoutPos.left }}
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
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all text-left ${isDarkSidebar ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
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
                          <span className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-white" />
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
    </aside>
  );
}

export default Sidebar;