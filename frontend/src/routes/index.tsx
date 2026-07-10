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
const SettingsPage = lazy(() => import('../pages/settings/oldSettingsPage'));
const StudentDashboard = lazy(() => import('../pages/portals/student/StudentDashboard'));
const TeacherDashboard = lazy(() => import('../pages/portals/teacher/TeacherDashboard'));
const ParentDashboard = lazy(() => import('../pages/portals/parent/ParentDashboard'));

// Education Module - Students
const StudentsListPage = lazy(() => import('../pages/education/StudentsListPage'));
const StudentProfilePage = lazy(() => import('../pages/education/students/StudentProfilePage'));
const StudentHistoryPage = lazy(() => import('../pages/education/students/StudentHistoryPage')); // ✅ ADD THIS
const AddStudentPage = lazy(() => import('../pages/education/students/AddStudentPage'));
const EditStudentPage = lazy(() => import('../pages/education/students/EditStudentPage'));

// Education Module - Other
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

// Academics - Classes
const AllClassesPage = lazy(() => import('../pages/education/academics/AllClassesPage'));
const AddClassPage = lazy(() => import('../pages/education/academics/AddClassPage'));
const EditClassPage = lazy(() => import('../pages/education/academics/EditClassPage'));

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
      
      // ============================================================
      // EDUCATION MODULE - STUDENTS (UPDATED)
      // ============================================================
      {
        path: 'education/students',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><StudentsListPage /></Suspense>,
          },
          {
            path: 'add',
            element: <Suspense fallback={<PageLoader />}><AddStudentPage /></Suspense>,
          },
          {
            path: ':id',
            element: <Suspense fallback={<PageLoader />}><StudentProfilePage /></Suspense>,
          },
          {
            path: ':id/edit',
            element: <Suspense fallback={<PageLoader />}><EditStudentPage /></Suspense>,
          },
          {
            path: ':id/history', // ✅ ADD THIS ROUTE
            element: <Suspense fallback={<PageLoader />}><StudentHistoryPage /></Suspense>,
          },
        ],
      },
      
      // ============================================================
      // EDUCATION MODULE - ACADEMICS / CLASSES (UPDATED)
      // ============================================================
      {
        path: 'education/academics',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><AcademicsPage /></Suspense>,
          },
          {
            path: 'classes',
            element: <Suspense fallback={<PageLoader />}><AllClassesPage /></Suspense>,
          },
          {
            path: 'classes/add',
            element: <Suspense fallback={<PageLoader />}><AddClassPage /></Suspense>,
          },
          {
            path: 'classes/edit/:id',
            element: <Suspense fallback={<PageLoader />}><EditClassPage /></Suspense>,
          },
        ],
      },
      
      // ============================================================
      // EDUCATION MODULE - OTHER
      // ============================================================
      {
        path: 'education/courses',
        element: <Suspense fallback={<PageLoader />}><CoursesListPage /></Suspense>,
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
      
      // ============================================================
      // TIMETABLE MODULE
      // ============================================================
      {
        path: 'education/timetable',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><TimetableManagement /></Suspense>,
          },
          {
            path: 'editor',
            element: <Suspense fallback={<PageLoader />}><TimetableEditorPage /></Suspense>,
          },
          {
            path: 'view',
            element: <Suspense fallback={<PageLoader />}><TimetableViewPage /></Suspense>,
          },
          {
            path: 'periods',
            element: <Suspense fallback={<PageLoader />}><PeriodManagementPage /></Suspense>,
          },
          {
            path: 'weekdays',
            element: <Suspense fallback={<PageLoader />}><WeekdayManagementPage /></Suspense>,
          },
          {
            path: 'rooms',
            element: <Suspense fallback={<PageLoader />}><ClassroomManagementPage /></Suspense>,
          },
          {
            path: 'class',
            element: <Suspense fallback={<PageLoader />}><ClassTimetableListPage /></Suspense>,
          },
          {
            path: 'teacher',
            element: <Suspense fallback={<PageLoader />}><TeacherTimetableListPage /></Suspense>,
          },
        ],
      },
      
      // ============================================================
      // PORTALS
      // ============================================================
      {
        path: 'student',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'profile',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'attendance',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'results',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'fees',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'timetable',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
          {
            path: 'notifications',
            element: <Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>,
          },
        ],
      },
      {
        path: 'teacher',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>,
          },
          {
            path: 'students',
            element: <Suspense fallback={<PageLoader />}><TeacherDashboard /></Suspense>,
          },
        ],
      },
      {
        path: 'parent',
        children: [
          {
            index: true,
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
          {
            path: 'children',
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
          {
            path: 'attendance',
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
          {
            path: 'results',
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
          {
            path: 'fees',
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
          {
            path: 'notifications',
            element: <Suspense fallback={<PageLoader />}><ParentDashboard /></Suspense>,
          },
        ],
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