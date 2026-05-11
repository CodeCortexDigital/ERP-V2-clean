import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, memo } from 'react'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'

// Education Module Imports
import StudentsListPage from './pages/education/StudentsListPage'
import StudentProfilePage from './pages/education/students/StudentProfilePage'
import EditStudentPage from './pages/education/students/EditStudentPage'
import AddStudentPage from './pages/education/students/AddStudentPage'
import CoursesListPage from './pages/education/CoursesListPage'
import TeachersManagementPage from './pages/education/teachers/TeachersManagement'
import TeacherProfilePage from './pages/education/teachers/TeacherProfilePage'
import ExamsPage from '@/pages/education/ExamsPage'
import ExamsListPage from './pages/education/exams/ExamsListPage'
import ExamDashboard from './pages/education/exams/dashboard/ExamDashboard'
import ExamSchedules from './pages/education/exams/ExamSchedules'
import ExamRegistrations from './pages/education/exams/registrations/ExamRegistrations'
import ExamResultsEntry from './pages/education/exams/ExamResultsEntry'
import ExamTypes from './pages/education/exams/ExamTypes'
import ExamAnalytics from './pages/education/exams/ExamAnalytics'
import ResultProcessing from './pages/education/exams/processing/ResultProcessing'
import ExamResultsPage from './pages/education/exams/ExamResultsPage'
import AttendancePage from './pages/education/attendance/AttendancePage'
import AcademicsPage from './pages/education/AcademicsPage'
import CurriculumManagementPage from './pages/education/curriculum/SyllabusManagement'
import TopicBreakdownPage from './pages/education/curriculum/TopicBreakdown'
import ResourceManagementPage from './pages/education/curriculum/ResourceManagement'
import TimetableManagement from './pages/education/timetable/TimetableManagement'
import TimetableViewPage from './pages/education/timetable/TimetableViewPage'
import PeriodManagementPage from './pages/education/timetable/PeriodManagementPage'
import TimetableEditorPage from './pages/education/timetable/TimetableEditorPage'
import ProgressTrackingPage from './pages/education/progress/ProgressTrackingPage'
import LessonPlannerPage from './pages/education/progress/LessonPlannerPage'
import CoverageDashboardPage from './pages/education/progress/CoverageDashboardPage'
import StudentProgressPage from './pages/education/progress/StudentProgressPage'
import AdmissionsPage from './pages/education/AdmissionsPage'
import FinancePage from './pages/education/FinancePage'
import CommunicationPage from './pages/education/CommunicationPage'
import AnalyticsPage from './pages/education/AnalyticsPage'
import SettingsPage from './pages/settings/SettingsPage'
import NewApplicationPage from '@/pages/education/admissions/NewApplicationPage'

// Portal Imports
import ParentDashboard from './pages/portals/parent/ParentDashboard'
import TeacherDashboard from './pages/portals/teacher/TeacherDashboard'

// Auth and Error Handling
import { AuthProvider } from './contexts/AuthContext'
import { setupGlobalErrorHandlers, ErrorBoundary } from './utils/errorHandler'

const AppToaster = memo(() => <Toaster position="top-right" />)
AppToaster.displayName = 'AppToaster'

function App() {
  useEffect(() => {
    setupGlobalErrorHandlers()
  }, [])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* Education Routes */}
              <Route path="education" element={<Navigate to="/education/academics" replace />} />
              <Route path="education/students" element={<StudentsListPage />} />
              <Route path="education/students/add" element={<AddStudentPage />} />
              <Route path="education/students/:id" element={<StudentProfilePage />} />
              <Route path="education/students/:id/edit" element={<EditStudentPage />} />
              <Route path="education/courses" element={<CoursesListPage />} />
              <Route path="education/teachers" element={<TeachersManagementPage />} />
              <Route path="education/teachers/:id" element={<TeacherProfilePage />} />
              <Route path="education/exams" element={<ExamsPage />} />
              <Route path="education/exams/list" element={<ExamsListPage />} />
              <Route path="education/exams/dashboard" element={<ExamDashboard />} />
              <Route path="education/exams/schedules" element={<ExamSchedules />} />
              <Route path="education/exams/registrations" element={<ExamRegistrations />} />
              <Route path="education/exams/results-entry" element={<ExamResultsEntry />} />
              <Route path="education/exams/types" element={<ExamTypes />} />
              <Route path="education/exams/analytics" element={<ExamAnalytics />} />
              <Route path="education/exams/processing" element={<ResultProcessing />} />
              <Route path="education/exams/:id/results" element={<ExamResultsPage />} />
              <Route path="education/attendance" element={<AttendancePage />} />
              <Route path="education/academics" element={<AcademicsPage />} />
              <Route path="education/curriculum" element={<CurriculumManagementPage />} />
              <Route path="education/curriculum/topics" element={<TopicBreakdownPage />} />
              <Route path="education/curriculum/resources" element={<ResourceManagementPage />} />
              <Route path="education/timetable" element={<TimetableManagement />} />
              <Route path="education/timetable/view" element={<TimetableViewPage />} />
              <Route path="education/timetable/periods" element={<PeriodManagementPage />} />
              <Route path="education/timetable/editor" element={<TimetableEditorPage />} />
              <Route path="education/progress" element={<ProgressTrackingPage />} />
              <Route path="education/progress/lesson-planner" element={<LessonPlannerPage />} />
              <Route path="education/progress/coverage" element={<CoverageDashboardPage />} />
              <Route path="education/progress/students" element={<StudentProgressPage />} />
              <Route path="education/admissions" element={<AdmissionsPage />} />
              <Route path="education/admissions/new" element={<NewApplicationPage />} />
              <Route path="education/finance" element={<FinancePage />} />
              <Route path="education/communication" element={<CommunicationPage />} />
              <Route path="education/analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Portal Routes */}
              <Route path="parent" element={<ParentDashboard />} />
              <Route path="parent/children" element={<ParentDashboard />} />
              <Route path="parent/attendance" element={<ParentDashboard />} />
              <Route path="parent/results" element={<ParentDashboard />} />
              <Route path="parent/fees" element={<ParentDashboard />} />
              <Route path="parent/notifications" element={<ParentDashboard />} />
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/students" element={<StudentsListPage />} />
              <Route path="teacher/profile" element={<TeacherProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <AppToaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default memo(App)


