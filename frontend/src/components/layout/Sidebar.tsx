import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, BookOpen, Calendar, FileText,
  DollarSign, MessageSquare, Settings, GraduationCap,
  ClipboardList, BarChart3, ChevronLeft, ChevronRight,
  Menu, X
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  collapsed: boolean;
}

function SidebarItem({ icon, label, href, collapsed }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(href + '/');
  
  return (
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
  );
}

const navItems = [
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

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  
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
            <span className="text-white font-bold text-xs">CC</span>
          </div>
        )}
        {isMobile && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            collapsed={sidebarCollapsed && !isMobile}
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
