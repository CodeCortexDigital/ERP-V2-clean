import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, memo, lazy, Suspense } from 'react'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import { AuthProvider } from './contexts/AuthContext'
import { setupGlobalErrorHandlers, ErrorBoundary } from './utils/errorHandler'

// Lazy loaded components
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const StudentsListPage = lazy(() => import('./pages/education/StudentsListPage'))
const AddStudentPage = lazy(() => import('./pages/education/students/AddStudentPage'))
const StudentProfilePage = lazy(() => import('./pages/education/students/StudentProfilePage'))
const AttendancePage = lazy(() => import('./pages/education/attendance/AttendancePage'))
const ExamsListPage = lazy(() => import('./pages/education/exams/ExamsListPage'))
const FinancePage = lazy(() => import('./pages/education/FinancePage'))
const AdmissionsPage = lazy(() => import('./pages/education/AdmissionsPage'))
const CommunicationPage = lazy(() => import('./pages/education/CommunicationPage'))
const AnalyticsPage = lazy(() => import('./pages/education/AnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="education/students" element={<StudentsListPage />} />
                <Route path="education/students/add" element={<AddStudentPage />} />
                <Route path="education/students/:id" element={<StudentProfilePage />} />
                <Route path="education/attendance" element={<AttendancePage />} />
                <Route path="education/exams" element={<ExamsListPage />} />
                <Route path="education/finance" element={<FinancePage />} />
                <Route path="education/admissions" element={<AdmissionsPage />} />
                <Route path="education/communication" element={<CommunicationPage />} />
                <Route path="education/analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        <AppToaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default memo(App)
