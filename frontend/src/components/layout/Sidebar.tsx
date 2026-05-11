import { NavLink, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { 
  LayoutDashboard, Users, Calendar, FileText,
  DollarSign, MessageSquare, Settings, GraduationCap,
  ClipboardList, BarChart3, ChevronLeft, ChevronRight,
  X, UserCheck, UserCog, User, Award, Bell, BookOpen
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  collapsed: boolean;
  subItems?: { label: string; href: string }[];
}

function SidebarItem({ icon, label, href, collapsed, subItems }: SidebarItemProps) {
  const location = useLocation();
  const isActive =
    location.pathname === href ||
    location.pathname.startsWith(href + '/') ||
    !!subItems?.some((sub) => location.pathname === sub.href || location.pathname.startsWith(sub.href + '/'));

  return (
    <div className="space-y-1">
      <NavLink
        to={href}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl
          transition-all duration-200
          ${collapsed ? 'justify-center' : 'justify-start'}
          ${isActive 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }
        `}
        title={collapsed ? label : undefined}
      >
        <div className="flex-shrink-0">
          {icon}
        </div>
        {!collapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
      </NavLink>
      {!collapsed && subItems?.length ? (
        <div className="ml-10 flex flex-col gap-1">
          {subItems.map((sub) => {
            const subIsActive = location.pathname === sub.href || location.pathname.startsWith(sub.href + '/');
            return (
              <NavLink
                key={sub.href}
                to={sub.href}
                className={
                  `px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                    subIsActive ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {sub.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
  subItems?: { label: string; href: string }[];
}

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user } = useAuth();
  
  // Determine user role - FIXED to include student43@example.com
  const isParent = user?.email === 'parent@test.com' || user?.email === 'parent@erp.com';
  const isTeacher = user?.email === 'teacher@test.com' || user?.email === 'teacher@erp.com';
  const isStudent = user?.email === 'student43@example.com' || user?.email?.includes('@student.com') || user?.email === 'student@erp.com';
  const isAdmin = !isParent && !isTeacher && !isStudent;
  
  // Parent Navigation
  const parentNavItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/parent' },
    { icon: <Users className="w-5 h-5" />, label: 'My Children', href: '/parent/children' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Attendance', href: '/parent/attendance' },
    { icon: <FileText className="w-5 h-5" />, label: 'Results', href: '/parent/results' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Fees', href: '/parent/fees' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', href: '/parent/notifications' }
  ];
  
  // Teacher Navigation
  const teacherNavItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/teacher' },
    { icon: <Users className="w-5 h-5" />, label: 'My Students', href: '/teacher/students' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Attendance', href: '/education/attendance' },
    { icon: <FileText className="w-5 h-5" />, label: 'Exams', href: '/education/exams' }
  ];
  
  // Student Navigation
    // Student Navigation
  const studentNavItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/parent' },
    { icon: <Users className="w-5 h-5" />, label: 'Profile', href: '/parent' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Attendance', href: '/parent/attendance' },
    { icon: <FileText className="w-5 h-5" />, label: 'Results', href: '/parent/results' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Fees', href: '/parent/fees' },
    { icon: <Bell className="w-5 h-5" />, label: 'Notifications', href: '/parent/notifications' }
  ];
  
  // Admin Navigation
  const adminNavItems: NavItem[] = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Students', href: '/education/students' },
    { icon: <GraduationCap className="w-5 h-5" />, label: 'Academics', href: '/education/academics' },
    { icon: <Calendar className="w-5 h-5" />, label: 'Attendance', href: '/education/attendance' },
    { icon: <FileText className="w-5 h-5" />, label: 'Exams', href: '/education/exams' },
    { icon: <DollarSign className="w-5 h-5" />, label: 'Finance', href: '/education/finance' },
    { icon: <ClipboardList className="w-5 h-5" />, label: 'Admissions', href: '/education/admissions' },
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Communication', href: '/education/communication' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '/education/analytics' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
  ];
  
  // Select nav items based on role
  let navItems = adminNavItems;
  if (isParent) navItems = parentNavItems;
  else if (isTeacher) navItems = teacherNavItems;
  else if (isStudent) navItems = studentNavItems;
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo Area */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-800 ${sidebarCollapsed && !isMobile ? 'justify-center' : 'justify-between'}`}>
        {(!sidebarCollapsed || isMobile) && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="text-white font-semibold text-lg">Code Cortex</span>
          </div>
        )}
        {sidebarCollapsed && !isMobile && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xs">EDU</span>
          </div>
        )}
        {isMobile && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info */}
      {!sidebarCollapsed && !isMobile && user && (
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {isParent ? 'Parent' : isTeacher ? 'Teacher' : isStudent ? 'Student' : 'Administrator'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            collapsed={sidebarCollapsed && !isMobile}
            subItems={item.subItems}
          />
        ))}
      </div>

      {/* Collapse Button (Desktop Only) */}
      {!isMobile && (
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return sidebarContent;
}
