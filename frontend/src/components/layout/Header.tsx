import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '@/components/notifications/NotificationBell';
import SearchBar from '@/components/SearchBar';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { resolveMediaUrl } from '@/utils/fileUpload';

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
  return (
    /^[0-9]+$/.test(segment) ||
    /^[0-9a-fA-F]{8,}$/.test(segment) ||
    /^[0-9a-fA-F]{8}[-\s]?[0-9a-fA-F]{4}[-\s]?[0-9a-fA-F]{4}[-\s]?[0-9a-fA-F]{4}[-\s]?[0-9a-fA-F]{12}$/.test(segment)
  );
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
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [entityNames, setEntityNames] = useState<{ [id: string]: string }>({});
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const fetchingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const loadAvatar = async () => {
      const path = user?.student?.profile_picture ?? user?.profile_picture;
      const url = await resolveMediaUrl(path);
      if (active) {
        setProfilePictureUrl(url);
      }
    };
    loadAvatar();
    return () => {
      active = false;
    };
  }, [user?.student?.profile_picture, user?.profile_picture]);

  const fetchEntityName = async (id: string, type: string) => {
    try {
      let url = '';
      if (type === 'students') {
        url = `/auth/students/${id}/`;
      } else if (type === 'teachers') {
        url = `/auth/academics/teachers/${id}/`;
      } else if (type === 'school-classes' || type === 'classes' || type === 'class') {
        url = `/auth/academics/classes/${id}/`;
      } else if (type === 'courses') {
        url = `/auth/courses/${id}/`;
      } else if (type === 'exams') {
        url = `/auth/exams/${id}/`;
      } else {
        return;
      }

      const res = await api.get(url);
      const name = res.data.full_name || res.data.name;
      if (name) {
        setEntityNames((prev) => ({ ...prev, [id]: name }));
      }
    } catch (err) {
      console.error('Error fetching entity name for breadcrumb:', err);
    }
  };

  const generateBreadcrumbs = (pathname: string) => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/dashboard' }];
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const previousEntity = getEntityFromSegments(segments, index);
      let label = formatSegment(segment, previousEntity);

      if (isIdSegment(segment)) {
        if (entityNames[segment]) {
          label = entityNames[segment];
        } else {
          if (!fetchingIds.current.has(segment)) {
            fetchingIds.current.add(segment);
            fetchEntityName(segment, segments[index - 1]);
          }
        }
      }

      crumbs.push({ label, href: currentPath });
    });

    setBreadcrumbs(crumbs);
  };

  useEffect(() => {
    generateBreadcrumbs(location.pathname);
  }, [location.pathname, entityNames]);

  const handleBreadcrumbClick = (href?: string) => {
    if (href) {
      navigate(href);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-card border-b border-border">
      {/* Top Bar */}
      <div className="px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onMobileMenuToggle} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">Code Cortex</h1>
                <p className="text-xs text-muted-foreground">School Management System</p>
              </div>
              <div className="hidden md:block">
                <SearchBar />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                {profilePictureUrl ? (
                  <img src={profilePictureUrl} alt={user?.student?.full_name ?? user?.full_name ?? 'User'} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user?.student?.full_name ?? user?.full_name ?? user?.email?.split('@')[0] ?? 'User'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.student || role === 'student'
                    ? 'Student'
                    : role === 'teacher'
                    ? 'Teacher'
                    : role === 'parent'
                    ? 'Parent'
                    : role === 'admin' || user?.is_superuser
                    ? 'Administrator'
                    : user?.is_staff
                    ? 'Staff'
                    : 'User'}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
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

