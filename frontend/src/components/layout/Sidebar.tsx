import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Settings, BookOpen, GraduationCap, Users,
  Wallet, Banknote, CreditCard, Hand, Calendar, FileText,
  Eye, MessageSquare, Video, FileQuestion,
  Edit, Award, Lock, Unlock, Search, X, ChevronRight, ChevronLeft, LogOut,
  DollarSign, User, Star, Building2, ClipboardList, Mail, Megaphone, CalendarDays, Handshake, TrendingUp, Library, Bus, Boxes, UtensilsCrossed, Plug, FileSpreadsheet
} from 'lucide-react';
import cafeteriaService from '@/services/cafeteria.service';
import transportService from '@/services/transport.service';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { teacherQuickActions } from '@/config/teacherQuickActions';
import { readThemeSettings } from '@/utils/theme';
import { useTranslation } from 'react-i18next';
import { useRegion } from '@/utils/region';
import { buildSections, sectionOpen } from './navSections';
import { usePlanStore } from '@/store/planStore';

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
  /** Shown to every signed-in role (not filtered by module permissions). */
  always?: boolean;
  /** Sidebar section (nav.group_<name>); items without one sit at the top. */
  group?: string;
}

const CLOSED_KEY = 'sidebar_closed_groups';
// Menu entries that belong to an optional plan module (P11).
const PLAN_MODULE: Record<string, string> = {
  library: 'library', transport: 'transport', inventory: 'inventory', cafeteria: 'cafeteria', 'cafeteria-till': 'cafeteria',
  'bus-duty': 'transport', integrations: 'integrations', reports: 'reports',
};

const COMMS: MenuItem[] = [
  { id: 'messages', label: 'Messages', icon: <Mail className="w-4 h-4" />, href: '/messages', always: true, group: 'communication' },
  { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" />, href: '/announcements', always: true, group: 'communication' },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" />, href: '/calendar', always: true, group: 'communication' },
  { id: 'meetings', label: 'Meetings', icon: <Handshake className="w-4 h-4" />, href: '/meetings', always: true, group: 'communication' },
];

export function Sidebar({ isMobile = false, onClose }: { isMobile?: boolean; onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { t } = useTranslation();
  // Menu labels translate by their English text ("Academic Setup" -> nav.academic_setup);
  // labels without a translation yet stay in English.
  const { label: regionLabel } = useRegion();
  // Translated, then worded for the school's region (e.g. "Date Sheet" → "Exam Schedule" for a US school).
  const tl = (label: string) =>
    regionLabel(t(`nav.${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`, { defaultValue: label }));
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
  const [onBusDuty, setOnBusDuty] = useState(false);
  useEffect(() => {
    if (!role || ['admin', 'parent', 'student'].includes(role)) return;
    transportService.routes().then((r) => setOnBusDuty(r.length > 0)).catch(() => setOnBusDuty(false));
  }, [role]);
  // Cafeteria staff (a staff login at this school) get the till; the server decides who may use it.
  const [atTill, setAtTill] = useState(false);
  useEffect(() => {
    if (!role || ['admin', 'parent', 'student', 'teacher'].includes(role)) return;
    cafeteriaService.find('').then(() => setAtTill(true)).catch(() => setAtTill(false));
  }, [role]);

  // Admin always sees the full menu; other roles are filtered by permissions.
  const isAdmin = role === 'admin';
  usePlanStore((s) => s.sub);  // re-render when the plan loads
  const hasModule = usePlanStore((s) => s.has);

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
      .filter((item) => item.always || canView((item as any).module || item.id))
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
    { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" />, href: '/education/students', group: 'people' },
    { id: 'admissions', label: 'Admissions', icon: <ClipboardList className="w-4 h-4" />, href: '/education/admissions', group: 'people' },
    { id: 'employees', label: 'Staff', icon: <Users className="w-4 h-4" />, href: '/education/teachers', group: 'people' },
    { id: 'academic-setup', label: 'Academic Setup', icon: <GraduationCap className="w-4 h-4" />, href: '/education/academic-setup', group: 'academics' },
    { id: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" />, href: '/education/timetable', group: 'academics' },
    { id: 'attendance', label: 'Attendance', icon: <Hand className="w-4 h-4" />, href: '/education/attendance', group: 'academics' },
    { id: 'gradebook', label: 'Gradebook', icon: <BookOpen className="w-4 h-4" />, href: '/education/gradebook', group: 'academics' },
    { id: 'examination', label: 'Examination', icon: <Edit className="w-4 h-4" />, href: '/education/exams', group: 'academics' },
    { id: 'behaviour', label: 'Behaviour & Skills', icon: <Eye className="w-4 h-4" />, href: '/education/behaviour?tab=log', group: 'academics' },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" />, href: '/education/certificates', group: 'academics' },
    { id: 'fees', label: 'Fees', icon: <Banknote className="w-4 h-4" />, href: '/education/fees/invoices', group: 'billing' },
    { id: 'salary', label: 'Salary', icon: <DollarSign className="w-4 h-4" />, href: '/education/salary/generate', group: 'billing' },
    { id: 'accounts', label: 'Finance', icon: <Wallet className="w-4 h-4" />, href: '/education/accounts/chart-of-accounts', group: 'billing' },
    ...COMMS,
    { id: 'communication', label: 'Communication', icon: <MessageSquare className="w-4 h-4" />, href: '/education/communication', group: 'communication' },
    { id: 'library', label: 'Library', icon: <Library className="w-4 h-4" />, href: '/education/library', group: 'services' },
    { id: 'transport', label: 'Transport', icon: <Bus className="w-4 h-4" />, href: '/education/transport', group: 'services' },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" />, href: '/education/inventory', group: 'services' },
    { id: 'cafeteria', label: 'Cafeteria', icon: <UtensilsCrossed className="w-4 h-4" />, href: '/education/cafeteria', group: 'services' },
    { id: 'reports', label: 'Reports', icon: <TrendingUp className="w-4 h-4" />, href: isAdmin ? '/education/analytics/insights' : '/education/analytics', group: 'reports' },
    { id: 'security', label: 'Security & privacy', icon: <Lock className="w-4 h-4" />, href: '/settings/security', group: 'admin' },
    { id: 'import-data', label: 'Import data', icon: <FileSpreadsheet className="w-4 h-4" />, href: '/education/import', group: 'admin' },
    { id: 'integrations', label: 'Integrations', icon: <Plug className="w-4 h-4" />, href: '/settings/integrations', group: 'admin' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, href: '/settings', group: 'admin' },
    // Platform owner only: every school on this installation.
    ...(user?.is_superuser
      ? [{ id: 'platform', label: 'All Schools', icon: <Building2 className="w-4 h-4" />, href: '/platform/schools', group: 'admin' }]
      : []),
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
    { id: 'my-classes', label: 'My Classes', icon: <GraduationCap className="w-4 h-4" />, href: '/teacher/classes', always: true, group: 'teaching' },
    { id: 'class-reports', label: 'Class Reports', icon: <ClipboardList className="w-4 h-4" />, href: '/teacher/reports', always: true, group: 'teaching' },
    { id: 'library', label: 'Library', icon: <Library className="w-4 h-4" />, href: '/library', always: true, group: 'services' },
    ...teacherQuickActions
      .filter((q) => canView(q.module))
      .map((q) => ({
        id: q.id,
        module: q.module,
        label: q.label,
        icon: <q.icon className="w-4 h-4" />,
        href: q.href,
        group: 'teaching',
      })),
    ...COMMS,
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      group: 'account',
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
      href: '/student/profile',
      group: 'learning'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Calendar className="w-4 h-4" />,
      href: '/student/attendance',
      group: 'learning'
    },
    {
      id: 'results',
      label: 'Results',
      icon: <Award className="w-4 h-4" />,
      href: '/student/results',
      group: 'learning'
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: <BookOpen className="w-4 h-4" />,
      href: '/student/assignments',
      group: 'learning',
      always: true
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: <TrendingUp className="w-4 h-4" />,
      href: '/student/progress',
      group: 'learning',
      always: true
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: <Calendar className="w-4 h-4" />,
      href: '/student/timetable',
      group: 'learning'
    },
    {
      id: 'behaviour',
      label: 'Behaviour & Skills',
      icon: <Star className="w-4 h-4" />,
      href: '/student/behaviour',
      group: 'learning'
    },
    {
      id: 'fees',
      label: 'Fees',
      icon: <Wallet className="w-4 h-4" />,
      href: '/student/fees',
      group: 'billing'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-4 h-4" />,
      href: '/student/documents',
      group: 'learning',
      always: true
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <Award className="w-4 h-4" />,
      href: '/student/certificates',
      group: 'learning'
    },
    {
      id: 'library',
      label: 'Library',
      icon: <Library className="w-4 h-4" />,
      href: '/student/library',
      group: 'services',
      always: true
    },
    {
      id: 'transport',
      label: 'Transport',
      icon: <Bus className="w-4 h-4" />,
      href: '/student/transport',
      group: 'services',
      always: true
    },
    {
      id: 'cafeteria',
      label: 'Cafeteria',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      href: '/student/cafeteria',
      group: 'services',
      always: true
    },
    ...COMMS,
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/student/notifications',
      group: 'communication'
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      group: 'account',
      subItems: [
        { label: 'Account Settings', href: '/settings/account' },
        { label: '──────────', href: '#', isDivider: true },
        { label: 'Log out', href: '#logout', isLogout: true }
      ]
    }
  ];

  // Parent Menu - one account for the whole family; pages switch between children.
  const P = (id: string, label: string, icon: React.ReactNode, href: string, group?: string): MenuItem => ({ id, label, icon, href, always: true, group });
  const parentMenuItems: MenuItem[] = [
    P('dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />, '/parent'),
    P('my-family', 'My Family', <Users className="w-4 h-4" />, '/parent/children', 'family'),
    P('attendance', 'Attendance', <Calendar className="w-4 h-4" />, '/parent/attendance', 'family'),
    P('assignments', 'Assignments', <BookOpen className="w-4 h-4" />, '/parent/assignments', 'family'),
    P('progress', 'Progress', <TrendingUp className="w-4 h-4" />, '/parent/progress', 'family'),
    P('behaviour', 'Behaviour & Skills', <Star className="w-4 h-4" />, '/parent/behaviour', 'family'),
    P('fees', 'Fees & Billing', <Wallet className="w-4 h-4" />, '/parent/fees', 'billing'),
    P('documents', 'Documents', <FileText className="w-4 h-4" />, '/parent/documents', 'family'),
    P('applications', 'Applications', <ClipboardList className="w-4 h-4" />, '/parent/applications', 'family'),
    P('library', 'Library', <Library className="w-4 h-4" />, '/parent/library', 'services'),
    P('transport', 'Transport', <Bus className="w-4 h-4" />, '/parent/transport', 'services'),
    P('cafeteria', 'Cafeteria', <UtensilsCrossed className="w-4 h-4" />, '/parent/cafeteria', 'services'),
    ...COMMS,
    P('notifications', 'Notifications', <MessageSquare className="w-4 h-4" />, '/parent/notifications', 'communication'),
    {
      id: 'settings',
      label: 'Account Settings',
      icon: <Settings className="w-4 h-4" />,
      group: 'account',
      always: true,
      subItems: [
        { label: 'Account Settings', href: '/settings/account' },
        { label: '──────────', href: '#', isDivider: true },
        { label: 'Log out', href: '#logout', isLogout: true }
      ]
    }
  ];

  let menuItems = isTeacher ? teacherMenuItems : isStudent ? studentMenuItems : isParent ? parentMenuItems : adminMenuItems;
  // Drivers and attendants (often teachers or staff with a login) get "Bus duty" once they are on a route.
  if (onBusDuty && !isAdmin && !isParent && !isStudent) {
    const duty: MenuItem = { id: 'bus-duty', label: 'Bus Duty', icon: <Bus className="w-4 h-4" />, href: '/transport/duty', always: true };
    menuItems = [menuItems[0], duty, ...menuItems.slice(1)];
  }
  if (atTill && !isAdmin && !isParent && !isStudent) {
    const till: MenuItem = { id: 'cafeteria-till', label: 'Cafeteria Till', icon: <UtensilsCrossed className="w-4 h-4" />, href: '/cafeteria/till', always: true };
    menuItems = [menuItems[0], till, ...menuItems.slice(1)];
  }
  menuItems = filterByPermissions(menuItems);
  // Optional areas outside the school's plan are hidden (the server refuses them anyway).
  menuItems = menuItems.filter((item) => {
    const module = PLAN_MODULE[item.id];
    return !module || hasModule(module);
  });

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
    const q = searchQuery.toLowerCase();
    const matchLabel = item.label.toLowerCase().includes(q) || tl(item.label).toLowerCase().includes(q);
    const matchSub = item.subItems?.some(sub => sub.label.toLowerCase().includes(q));
    return matchLabel || matchSub;
  });

  // Sections: remembered open/closed per browser; the section with the current page is always open.
  const [closedGroups, setClosedGroups] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CLOSED_KEY) || '[]'); } catch { return []; }
  });
  const toggleGroup = (g: string) => setClosedGroups((prev) => {
    const next = prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g];
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });
  const itemIsCurrent = (item: MenuItem) => {
    const path = (item.href || '').split('?')[0];
    if (item.subItems?.some((sub) => isLinkActive(sub.href))) return true;
    if (!path || path === '#') return false;
    if (item.id === 'dashboard') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path.endsWith('/') ? path : `${path}/`);
  };
  const sections = buildSections(filteredMenuItems);

  // Keep the current page's link in view (a long menu otherwise hides it below the fold).
  const navRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const current = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
      current?.scrollIntoView({ block: 'nearest' });
    }, 350);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

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

  const renderItem = (item: MenuItem, itemIndex: number) => {
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
                  {!isCollapsed && <span className="flex-1 truncate">{tl(item.label)}</span>}
                </button>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={item.href || '#'}
                // A portal's dashboard (/parent, /student) must not light up on every page under it.
                end={item.id === 'dashboard'}
                onClick={isMobile && onClose ? onClose : undefined}
                className={({ isActive }) => `
                  sb-fade-in relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold
                  transition-all duration-150
                  ${isActive && (!item.href?.includes('?') || isLinkActive(item.href))
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
                    {tl(item.label)}
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
                  {!isCollapsed && <span className="truncate">{tl(item.label)}</span>}
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
                            <span className="truncate">{tl(sub.label)}</span>
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
                        <span className="truncate">{tl(sub.label)}</span>
                        {sub.isLocked && <Unlock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 ml-1" />}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
  };

  const portalLabel = t(`portal.${isTeacher ? 'teacher' : isStudent ? 'student' : isParent ? 'parent' : 'admin'}`);

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
              type="search"
              placeholder={t('portal.searchMenu')}
              aria-label={t('portal.searchMenu')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter opens the first matching page, or searches the whole school when no page matches.
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const first = filteredMenuItems.find((i) => i.href && i.href !== '#');
                  navigate(first?.href || `/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                  if (isMobile && onClose) onClose();
                }
                if (e.key === 'Escape') setSearchQuery('');
              }}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav ref={navRef} aria-label={portalLabel} className="sidebar-nav flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        {sections.map((sec, secIndex) => {
          const open = sectionOpen(sec.group, { closed: closedGroups, searching: !!searchQuery, collapsed: isCollapsed, hasCurrentPage: sec.items.some(itemIsCurrent) });
          const groupLabel = sec.group ? t(`nav.group_${sec.group}`, { defaultValue: sec.group }) : '';
          return (
            <div key={sec.group || 'top'} role={sec.group ? 'group' : undefined} aria-label={groupLabel || undefined}>
              {sec.group && isCollapsed && secIndex > 0 && renderDivider()}
              {sec.group && !isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(sec.group)}
                  aria-expanded={open}
                  aria-controls={`nav-group-${sec.group}`}
                  className={`w-full flex items-center justify-between px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${isDarkSidebar ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span>{groupLabel}</span>
                  {!searchQuery && <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />}
                </button>
              )}
              {open && (
                <div id={sec.group ? `nav-group-${sec.group}` : undefined} className="space-y-1">
                  {sec.items.map((item, itemIndex) => renderItem(item, itemIndex))}
                </div>
              )}
            </div>
          );
        })}
        {searchQuery.trim() && !isCollapsed && (
          <button
            type="button"
            onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery(''); if (isMobile && onClose) onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-xl text-xs font-semibold border border-dashed ${isDarkSidebar ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t('portal.searchEverywhere')}: “{searchQuery.trim()}”</span>
          </button>
        )}
      </nav>

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
          {!isCollapsed && <span>{t('portal.logout')}</span>}
        </button>
      </div>


    </aside>
  );
}

export default Sidebar;