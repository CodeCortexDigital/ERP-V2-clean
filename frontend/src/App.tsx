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
import CoursesListPage from './pages/education/CoursesListPage'
import ExamsListPage from './pages/education/exams/ExamsListPage'
import AttendancePage from './pages/education/attendance/AttendancePage'
import AcademicsPage from './pages/education/AcademicsPage'
import AdmissionsPage from './pages/education/AdmissionsPage'
import FinancePage from './pages/education/FinancePage'
import CommunicationPage from './pages/education/CommunicationPage'
import AnalyticsPage from './pages/education/AnalyticsPage'
import SettingsPage from './pages/settings/SettingsPage'

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
              <Route path="education/students" element={<StudentsListPage />} />
              <Route path="education/students/:id" element={<StudentProfilePage />} />
              <Route path="education/courses" element={<CoursesListPage />} />
              <Route path="education/exams" element={<ExamsListPage />} />
              <Route path="education/attendance" element={<AttendancePage />} />
              <Route path="education/academics" element={<AcademicsPage />} />
              <Route path="education/admissions" element={<AdmissionsPage />} />
              <Route path="education/finance" element={<FinancePage />} />
              <Route path="education/communication" element={<CommunicationPage />} />
              <Route path="education/analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <AppToaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default memo(App)
