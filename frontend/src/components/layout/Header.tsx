import { useState, useEffect } from 'react';
import { User, LogOut, Menu, Bell } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

const segmentLabels: { [key: string]: string } = {
  dashboard: 'Dashboard',
  education: 'Academics',
  admissions: 'Admissions',
  students: 'Students',
  attendance: 'Attendance',
  academics: 'Academics',
  teachers: 'Teachers',
  curriculum: 'Curriculum',
  timetable: 'Timetable',
  progress: 'Progress',
  finance: 'Finance',
  invoices: 'Invoices',
  receipts: 'Receipts',
  reports: 'Reports',
  settings: 'Settings',
  analytics: 'Analytics',
  'school-classes': 'School classs',
  class: 'School classs',
  'student-360': 'Student 360',
  add: 'Add',
  edit: 'Edit',
  new: 'New',
};

const entityMap: { [key: string]: string } = {
  students: 'Student',
  teachers: 'Teacher',
  exams: 'Exam',
  courses: 'Course',
  admissions: 'Application',
  finance: 'Finance',
  reports: 'Report',
  invoices: 'Invoice',
  receipts: 'Receipt',
  parents: 'Parent',
  curriculum: 'Curriculum',
  attendance: 'Attendance',
  communication: 'Communication',
};

const isIdSegment = (segment: string) => {
  return /^[0-9]+$/.test(segment) || /^[0-9a-fA-F]{8,}$/.test(segment);
};

const formatSegment = (segment: string, previousEntity?: string) => {
  if (segmentLabels[segment]) {
    if (segment === 'add' && previousEntity) return `Add ${previousEntity}`;
    if (segment === 'new' && previousEntity) return `New ${previousEntity}`;
    if (segment === 'edit' && previousEntity) return `Edit ${previousEntity}`;
    return segmentLabels[segment];
  }

  if (isIdSegment(segment)) {
    return previousEntity ? `${previousEntity}` : 'Details';
  }

  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getEntityFromSegments = (segments: string[], index: number) => {
  if (index < 1) return undefined;

  const previous = segments[index - 1];
  if (isIdSegment(previous) && index > 1) {
    return entityMap[segments[index - 2]];
  }

  return entityMap[previous];
};

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    generateBreadcrumbs(location.pathname);
  }, [location.pathname]);

  const generateBreadcrumbs = (pathname: string) => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/dashboard' }];
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const previousEntity = getEntityFromSegments(segments, index);
      const label = formatSegment(segment, previousEntity);
      crumbs.push({ label, href: currentPath });
    });

    setBreadcrumbs(crumbs);
  };

  const handleBreadcrumbClick = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Top Bar */}
      <div className="px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onMobileMenuToggle} className="lg:hidden text-gray-600">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Code Cortex</h1>
              <p className="text-xs text-gray-500">School Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-800 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{user?.email || 'Admin'}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-600 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-slate-900 px-6 py-3">
        <div className="max-w-screen-xl mx-auto">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <span className="text-slate-400">›</span>}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-white">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(crumb.href)}
                    className="text-slate-200 hover:text-white hover:underline"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

