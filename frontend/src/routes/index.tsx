/**
 * Application Routes with Lazy Loading and Route Guards
 * All routes are defined here with code splitting for performance
 */

import { lazy, Suspense } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Layouts
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AnalyticsPage = lazy(() => import('../pages/Analytics'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const StudentDashboard = lazy(() => import('../pages/portals/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('../pages/portals/teacher/TeacherDashboard'));
const ParentDashboard = lazy(() => import('../pages/portals/parent/ParentDashboard'));

// Education Module
const StudentsListPage = lazy(() => import('../pages/education/StudentsListPage'));
const CoursesListPage = lazy(() => import('../pages/education/CoursesListPage'));
const AcademicsPage = lazy(() => import('../pages/education/AcademicsPage'));
const CurriculumManagement = lazy(() => import('../pages/education/curriculum/SyllabusManagement'));
const TopicBreakdownPage = lazy(() => import('../pages/education/curriculum/TopicBreakdown'));
const ResourceManagementPage = lazy(() => import('../pages/education/curriculum/ResourceManagement'));
const HomeworkManagementPage = lazy(() => import('../pages/education/assignments/HomeworkManagementPage'));
const AdmissionsPage = lazy(() => import('../pages/education/AdmissionsPage'));
const RateBehavioursPage = lazy(() => import('../pages/education/behaviour/RateBehavioursPage'));
const RateSkillsPage = lazy(() => import('../pages/education/behaviour/RateSkillsPage'));
const ObservationsPage = lazy(() => import('../pages/education/behaviour/ObservationsPage'));
const AffectiveDomainReportPage = lazy(() => import('../pages/education/behaviour/AffectiveDomainReportPage'));
const PsycomotorDomainReportPage = lazy(() => import('../pages/education/behaviour/PsycomotorDomainReportPage'));
const ExamsPage = lazy(() => import('../pages/education/ExamsPage'));
const FeesPage = lazy(() => import('../pages/education/FeesPage'));
const AttendancePage = lazy(() => import('../pages/education/attendance/AttendancePage'));
const AttendanceAnalyticsDashboard = lazy(() => import('../pages/education/attendance/dashboard/AttendanceAnalyticsDashboard'));

// Timetable Module
const TimetableManagement = lazy(() => import('../pages/education/timetable/TimetableManagement'));
const TimetableEditorPage = lazy(() => import('../pages/education/timetable/TimetableEditorPage'));
const TimetableViewPage = lazy(() => import('../pages/education/timetable/TimetableViewPage'));
const PeriodManagementPage = lazy(() => import('../pages/education/timetable/PeriodManagementPage'));
const WeekdayManagementPage = lazy(() => import('../pages/education/timetable/WeekdayManagementPage'));
const ClassroomManagementPage = lazy(() => import('../pages/education/timetable/ClassroomManagementPage'));
const ClassTimetableListPage = lazy(() => import('../pages/education/timetable/ClassTimetableListPage'));
const TeacherTimetableListPage = lazy(() => import('../pages/education/timetable/TeacherTimetableListPage'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public route component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// All application routes
export const routes: RouteObject[] = [
  // Public routes
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  
  // Protected routes with Layout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>,
      },
      {
        path: 'analytics',
        element: <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
      },
      
      // Education Module
      {
        path: 'education/students',
        element: <Suspense fallback={<PageLoader />}><StudentsListPage /></Suspense>,
      },
      {
        path: 'education/courses',
        element: <Suspense fallback={<PageLoader />}><CoursesListPage /></Suspense>,
      },
      {
        path: 'education/academics',
        element: <Suspense fallback={<PageLoader />}><AcademicsPage /></Suspense>,
      },
      {
        path: 'education/curriculum',
        element: <Suspense fallback={<PageLoader />}><CurriculumManagement /></Suspense>,
      },
      {
        path: 'education/curriculum/topics',
        element: <Suspense fallback={<PageLoader />}><TopicBreakdownPage /></Suspense>,
      },
      {
        path: 'education/curriculum/resources',
        element: <Suspense fallback={<PageLoader />}><ResourceManagementPage /></Suspense>,
      },
      {
        path: 'education/homework',
        element: <Suspense fallback={<PageLoader />}><HomeworkManagementPage /></Suspense>,
      },
      {
        path: 'education/admissions',
        element: <Suspense fallback={<PageLoader />}><AdmissionsPage /></Suspense>,
      },
      {
        path: 'education/behaviour/rate',
        element: <Suspense fallback={<PageLoader />}><RateBehavioursPage /></Suspense>,
      },
      {
        path: 'education/skills/rate',
        element: <Suspense fallback={<PageLoader />}><RateSkillsPage /></Suspense>,
      },
      {
        path: 'education/behaviour/observations',
        element: <Suspense fallback={<PageLoader />}><ObservationsPage /></Suspense>,
      },
      {
        path: 'education/behaviour/affective-report',
        element: <Suspense fallback={<PageLoader />}><AffectiveDomainReportPage /></Suspense>,
      },
      {
        path: 'education/behaviour/psycomotor-report',
        element: <Suspense fallback={<PageLoader />}><PsycomotorDomainReportPage /></Suspense>,
      },
      {
        path: 'education/exams',
        element: <Suspense fallback={<PageLoader />}><ExamsPage /></Suspense>,
      },
      {
        path: 'education/fees',
        element: <Suspense fallback={<PageLoader />}><FeesPage /></Suspense>,
      },
      {
        path: 'education/attendance',
        element: <Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>,
      },
      {
        path: 'education/attendance/analytics',
        element: <Suspense fallback={<PageLoader />}><AttendanceAnalyticsDashboard /></Suspense>,
      },
      {
        path: 'education/timetable',
        element: <Suspense fallback={<PageLoader />}><TimetableManagement /></Suspense>,
      },
      {
        path: 'education/timetable/editor',
        element: <Suspense fallback={<PageLoader />}><TimetableEditorPage /></Suspense>,
      },
      {
        path: 'education/timetable/view',
        element: <Suspense fallback={<PageLoader />}><TimetableViewPage /></Suspense>,
      },
      {
        path: 'education/timetable/periods',
        element: <Suspense fallback={<PageLoader />}><PeriodManagementPage /></Suspense>,
      },
      {
        path: 'education/timetable/weekdays',
        element: <Suspense fallback={<PageLoader />}><WeekdayManagementPage /></Suspense>,
      },
      {
        path: 'education/timetable/rooms',
        element: <Suspense fallback={<PageLoader />}><ClassroomManagementPage /></Suspense>,
      },
      {
        path: 'education/timetable/class',
        element: <Suspense fallback={<PageLoader />}><ClassTimetableListPage /></Suspense>,
      },
      {
        path: 'education/timetable/teacher',
        element: <Suspense fallback={<PageLoader />}><TeacherTimetableListPage /></Suspense>,
      },
      {
        path: 'student',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/profile',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/attendance',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/results',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/fees',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/timetable',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'student/notifications',
        element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
      },
      {
        path: 'teacher',
        element: <Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>,
      },
      {
        path: 'teacher/students',
        element: <Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>,
      },
      {
        path: 'parent',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
      {
        path: 'parent/children',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
      {
        path: 'parent/attendance',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
      {
        path: 'parent/results',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
      {
        path: 'parent/fees',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
      {
        path: 'parent/notifications',
        element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
      },
    ],
  },
  
  // Catch-all redirect to dashboard
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];

export default routes;