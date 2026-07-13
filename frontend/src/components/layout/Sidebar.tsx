import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Settings, BookOpen, GraduationCap, Users, 
  Wallet, Banknote, CreditCard, Hand, Calendar, FileText, 
  Eye, MessageSquare, Mail, Video, FileQuestion, 
  Edit, Award, Lock, Unlock, Plus, Minus, Search, X, ChevronRight, ChevronLeft, LogOut,
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
      subItems: [
        { label: 'Institute Profile', href: '/settings/profile' },
        { label: 'Fees Particulars', href: '/settings/fee-particulars' },
        { label: 'Fees Structure', href: '/settings/fee-structure', isLocked: true },
        { label: 'Discount Type', href: '/settings/discount-type', isLocked: true },
        { label: 'Accounts For Fees Invoice', href: '/settings/bank-accounts' },
        { label: 'Rules & Regulations', href: '/settings/rules' },
        { label: 'Marks Grading', href: '/settings/grading' },
        { label: 'Theme & Language', href: '/settings/theme' },
        { label: 'Account Settings', href: '/settings/account' },
        { label: '──────────', href: '#', isDivider: true },
        { label: 'Log out', href: '#logout', isLogout: true }
      ]
    },
    {
      id: 'classes',
      label: 'Classes',
      icon: <GraduationCap className="w-4 h-4" />,
      subItems: [
        { label: 'All Classes', href: '/education/academics/classes' },
        { label: 'New Class', href: '/education/academics/classes/add' }
      ]
    },
    {
      id: 'subjects',
      label: 'Subjects',
      icon: <BookOpen className="w-4 h-4" />,
      subItems: [
        { label: 'All Subjects', href: '/education/subjects' },
        { label: 'Assign Subjects', href: '/education/subjects/assign' }
      ]
    },
    {
      id: 'students',
      label: 'Students',
      icon: <Users className="w-4 h-4" />,
      subItems: [
        { label: 'All Students', href: '/education/students' },
        { label: 'Add New', href: '/education/students/add' },
        { label: 'Manage Families', href: '/education/students/families', isLocked: true },
        { label: 'Active / Inactive', href: '/education/students/status', isLocked: true },
        { label: 'Admission Letter', href: '/education/students/admission-letter' },
        { label: 'Student ID Cards', href: '/education/students/id-cards' },
        { label: 'Print Basic List', href: '/education/students/print-list' },
        { label: 'Manage Login', href: '/education/students/logins' },
        { label: 'Promote Students', href: '/education/students/promote' }
      ]
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="w-4 h-4" />,
      subItems: [
        { label: 'All Employees', href: '/education/teachers' },
        { label: 'Add New', href: '/education/teachers/add' },
        { label: 'Staff ID Cards', href: '/education/teachers/id-cards' },
        { label: 'Job Letter', href: '/education/teachers/job-letter' },
        { label: 'Manage Login', href: '/education/teachers/logins' }
      ]
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: <Wallet className="w-4 h-4" />,
      subItems: [
        { label: 'Chart Of Account', href: '/education/finance/chart-of-accounts' },
        { label: 'Add Income', href: '/education/finance/add-income' },
        { label: 'Add Expense', href: '/education/finance/add-expense' },
        { label: 'Account Statement', href: '/education/finance/account-statement' }
      ]
    },
    {
      id: 'fees',
      label: 'Fees',
      icon: <Banknote className="w-4 h-4" />,
      subItems: [
        { label: 'Generate Fees Invoice', href: '/education/finance/generate-invoices' },
        { label: 'Invoices', href: '/education/finance/invoices' },
        { label: 'Collect Fees', href: '/education/finance/collect-fees' },
        { label: 'Fees Paid Slip', href: '/education/finance/fees-paid-slip' },
        { label: 'Fees Defaulters', href: '/education/finance/fees-defaulters' },
        { label: 'Fees Report', href: '/education/finance/report' }
      ]
    },
    {
      id: 'salary',
      label: 'Salary',
      icon: <DollarSign className="w-4 h-4" />,
      subItems: [
        { label: 'Generate Salary', href: '/education/salary/generate' },
        { label: 'Pay Salary', href: '/education/salary/pay' },
        { label: 'Salary Paid Slip', href: '/education/salary/slips' },
        { label: 'Salary Sheet', href: '/education/salary/sheet' },
        { label: 'Salary Report', href: '/education/salary/report' }
      ]
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <Hand className="w-4 h-4" />,
      subItems: [
        { label: 'Students Attendance', href: '/education/attendance' },
        { label: 'Employees Attendance', href: '/education/attendance?type=staff' },
        { label: 'Class wise Report', href: '/education/attendance?tab=class-report' },
        { label: 'Students Attendance Report', href: '/education/attendance?tab=student-report' },
        { label: 'Employees Attendance Report', href: '/education/attendance?tab=staff-report' }
      ]
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: <Calendar className="w-4 h-4" />,
      subItems: [
        { label: 'Weekdays', href: '/education/timetable/weekdays' },
        { label: 'Time Periods', href: '/education/timetable/periods' },
        { label: 'Class Rooms', href: '/education/timetable/rooms' },
        { label: 'Create Timetable', href: '/education/timetable' },
        { label: 'Generate For Class', href: '/education/timetable/class' },
        { label: 'Generate For Teacher', href: '/education/timetable/teacher' }
      ]
    },
    {
      id: 'homework',
      label: 'Homework',
      icon: <FileText className="w-4 h-4" />,
      href: '/education/homework'
    },
    {
      id: 'behaviour',
      label: 'Behaviour & Skills',
      icon: <Eye className="w-4 h-4" />,
      subItems: [
        { label: 'Rate Behaviours', href: '/education/behaviour/rate' },
        { label: 'Rate Skills', href: '/education/skills/rate' },
        { label: 'Observations', href: '/education/behaviour/observations' },
        { label: 'Affective Domain Rating Report', href: '/education/behaviour/affective-report' },
        { label: 'Psycomotor Domain Rating Report', href: '/education/behaviour/psycomotor-report' }
      ]
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/communication/whatsapp',
      isLocked: true
    },
    {
      id: 'messaging',
      label: 'Messaging',
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/education/communication'
    },
    {
      id: 'sms',
      label: 'SMS Services',
      icon: <Mail className="w-4 h-4" />,
      subItems: [
        { label: 'Free SMS Gateway', href: '/communication/sms-gateway' },
        { label: 'Branded SMS', href: '/communication/branded-sms', isLocked: true },
        { label: 'SMS Templates', href: '/communication/sms-templates', isLocked: true }
      ]
    },
    {
      id: 'liveclass',
      label: 'Live Class',
      icon: <Video className="w-4 h-4" />,
      href: '/education/live-class'
    },
    {
      id: 'questionpaper',
      label: 'Question Paper',
      icon: <FileQuestion className="w-4 h-4" />,
      subItems: [
        { label: 'Subject Chapters', href: '/education/question-bank/chapters', isLocked: true },
        { label: 'Question Bank', href: '/education/question-bank', isLocked: true },
        { label: 'Create Question Paper', href: '/education/question-bank/create', isLocked: true }
      ]
    },
    {
      id: 'exams',
      label: 'Exams',
      icon: <Edit className="w-4 h-4" />,
      subItems: [
        { label: 'Create New Exam', href: '/education/exams' },
        { label: 'Add / update Exam Marks', href: '/education/exams?tab=marks' },
        { label: 'Result Card', href: '/education/exams?tab=results' },
        { label: 'Result Sheet', href: '/education/exams/sheet' },
        { label: 'Exam Schedule', href: '/education/exams/schedule' },
        { label: 'Date Sheet', href: '/education/exams/datesheet' },
        { label: 'Blank Award List', href: '/education/exams/awardlist' }
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
        { label: 'Students info report', href: '/education/analytics?report=students-info' },
        { label: 'Parents info report', href: '/education/analytics?report=parents-info' },
        { label: 'Students Monthly Attendance Report', href: '/education/analytics/attendance-student' },
        { label: 'Staff Monthly Attendance Report', href: '/education/analytics/attendance-staff' },
        { label: 'Fee Collection Report', href: '/education/analytics/fees' },
        { label: 'Student Progress Report', href: '/education/analytics/progress' },
        { label: 'Accounts Report', href: '/education/analytics/accounts' },
        { label: 'Customised Reports', href: '/education/analytics/custom' }
      ]
    },
    {
      id: 'certificates',
      label: 'Certificates',
      icon: <Award className="w-4 h-4" />,
      subItems: [
        { label: 'Generate Certificate', href: '/education/certificates' },
        { label: 'Certificate Templates', href: '/education/certificates?tab=templates' }
      ]
    },
    {
      id: 'online-store',
      label: 'Online Store',
      icon: <ShoppingCart className="w-4 h-4" />,
      href: '/education/store'
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
      id: 'homework',
      label: 'Homework',
      icon: <FileText className="w-4 h-4" />,
      subItems: [
        { label: 'Daily Homework', href: '/education/homework' },
        { label: 'Add New Homework', href: '/education/homework/add' }
      ]
    },
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: <Calendar className="w-4 h-4" />,
      href: '/education/timetable/view'
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
      id: 'liveclass',
      label: 'Live Class',
      icon: <Video className="w-4 h-4" />,
      href: '/education/live-class'
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
      href: '/education/homework'
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
      id: 'liveclass',
      label: 'Live Class',
      icon: <Video className="w-4 h-4" />,
      href: '/education/live-class'
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
          <div className={`text-xs font-bold tracking-wider uppercase ${isDarkSidebar ? 'text-slate-400' : 'text-slate-800'}`}>menu</div>
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
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        {filteredMenuItems.map((item) => {
          const isExpanded = expandedItems.includes(item.id) || !!searchQuery;
          const hasSub = item.subItems && item.subItems.length > 0;
          const hasActiveSub = item.subItems?.some(sub => isLinkActive(sub.href));
          const isSettingsItem = item.id === 'settings';

          // Single item without sub-items (and not logout - logout is inside settings subItems)
          if (!hasSub) {
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
            <div key={item.id} className="space-y-0.5">
              {/* Parent Toggle Item */}
              <button
                onClick={() => isCollapsed ? toggleSidebar() : toggleExpand(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left
                  ${isActive || isExpanded
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
                    <span className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1">
                      {isExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </span>
                  </div>
                )}
              </button>

              {/* Nested Sub-Menu Items */}
              {!isCollapsed && isExpanded && (
                <div className={`relative ml-6 pl-3 border-l-2 ${isDarkSidebar ? 'border-slate-700' : 'border-blue-500'} space-y-1 py-1`}>
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