import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, memo } from 'react'
import Layout from '@/components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute'
import { RoleBasedRoute } from './components/auth/RoleBasedRoute'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'

// ============================================================
// EDUCATION MODULE IMPORTS
// ============================================================
// Students
import StudentsListPage from './pages/education/students/StudentsListPage'
import StudentProfilePage from './pages/education/students/StudentProfilePage'
import StudentHistoryPage from './pages/education/students/StudentHistoryPage' // ✅ ADD THIS
import EditStudentPage from './pages/education/students/EditStudentPage'
import AddStudentPage from './pages/education/students/AddStudentPage'
import AdmissionLetterPage from './pages/education/students/AdmissionLetterPage'
import StudentIdCardsPage from './pages/education/students/StudentIdCardsPage'
import PrintBasicListPage from './pages/education/students/PrintBasicListPage'
import StudentLoginsPage from './pages/education/students/StudentLoginsPage'
import PromoteStudentsPage from './pages/education/students/PromoteStudentsPage'
import FamiliesPage from './pages/education/students/FamiliesPage'
import ActiveInactivePage from './pages/education/students/ActiveInactivePage'

// Teachers
import TeachersManagementPage from './pages/education/teachers/TeachersManagement'
import AddTeacherPage from './pages/education/teachers/AddTeacherPage'
import TeacherProfilePage from './pages/education/teachers/TeacherProfilePage'
import EditTeacherPage from './pages/education/teachers/EditTeacherPage'
import EmployeeHistoryPage from './pages/education/teachers/EmployeeHistoryPage'
import JobLetterPage from './pages/education/teachers/JobLetterPage'
import StaffIdCardsPage from './pages/education/teachers/StaffIdCardsPage'
import StaffLoginsPage from './pages/education/teachers/StaffLoginsPage'

// Exams
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
import MarkSheetGeneration from './pages/education/exams/marksheets/MarkSheetGeneration'
import DateSheet from './pages/education/exams/DateSheet'
import BlankAwardList from './pages/education/exams/BlankAwardList'
import ClassTestsPage from './pages/education/ClassTestsPage'

// Attendance
import AttendancePage from './pages/education/attendance/AttendancePage'

// Academics
import AcademicsPage from './pages/education/AcademicsPage'
import AllClassesPage from './pages/education/academics/AllClassesPage'
import AddClassPage from './pages/education/academics/AddClassPage'
import EditClassPage from './pages/education/academics/EditClassPage'

// Subjects
import SubjectsPage from './pages/education/subjects/SubjectsPage'
import AssignSubjectsPage from './pages/education/subjects/AssignSubjectsPage'

// Curriculum
import CurriculumManagementPage from './pages/education/curriculum/SyllabusManagement'
import TopicBreakdownPage from './pages/education/curriculum/TopicBreakdown'
import ResourceManagementPage from './pages/education/curriculum/ResourceManagement'

// Homework & Store
import HomeworkManagementPage from './pages/education/assignments/HomeworkManagementPage'
import OnlineStorePage from './pages/education/OnlineStorePage'

// Timetable
import TimetableManagement from './pages/education/timetable/TimetableManagement'
import TimetableViewPage from './pages/education/timetable/TimetableViewPage'
import PeriodManagementPage from './pages/education/timetable/PeriodManagementPage'
import TimetableEditorPage from './pages/education/timetable/TimetableEditorPage'
import WeekdayManagementPage from './pages/education/timetable/WeekdayManagementPage'
import ClassroomManagementPage from './pages/education/timetable/ClassroomManagementPage'
import ClassTimetableListPage from './pages/education/timetable/ClassTimetableListPage'
import TeacherTimetableListPage from './pages/education/timetable/TeacherTimetableListPage'
import StaffLeavePage from './pages/education/timetable/StaffLeavePage'
import TeacherLeaveApplyPage from './pages/education/timetable/TeacherLeaveApplyPage'

// Progress
import ProgressTrackingPage from './pages/education/progress/ProgressTrackingPage'
import LessonPlannerPage from './pages/education/progress/LessonPlannerPage'
import CoverageDashboardPage from './pages/education/progress/CoverageDashboardPage'
import StudentProgressPage from './pages/education/progress/StudentProgressPage'

// Admissions
import AdmissionsPage from './pages/education/AdmissionsPage'
import NewApplicationPage from '@/pages/education/admissions/NewApplicationPage'

// Behaviour
import RateBehavioursPage from './pages/education/behaviour/RateBehavioursPage'
import RateSkillsPage from './pages/education/behaviour/RateSkillsPage'
import ObservationsPage from './pages/education/behaviour/ObservationsPage'
import AffectiveDomainReportPage from './pages/education/behaviour/AffectiveDomainReportPage'
import PsycomotorDomainReportPage from './pages/education/behaviour/PsycomotorDomainReportPage'

// Finance
import FinancePage from './pages/education/FinancePage'
import ChartOfAccountsPage from './pages/education/finance/ChartOfAccountsPage'
import AddIncomePage from './pages/education/finance/AddIncomePage'
import AddExpensePage from './pages/education/finance/AddExpensePage'
import AccountStatementPage from './pages/education/finance/AccountStatementPage'
import GenerateFeesInvoicePage from './pages/education/finance/GenerateFeesInvoicePage'
import InvoicesPage from './pages/education/finance/InvoicesPage'
import CollectFeesPage from './pages/education/finance/CollectFeesPage'
import FeesPaidSlipPage from './pages/education/finance/FeesPaidSlipPage'
import FeesDefaultersPage from './pages/education/finance/FeesDefaultersPage'
import FeesReportPage from './pages/education/finance/FeesReportPage'
import DeleteFeesPage from './pages/education/finance/DeleteFeesPage'

// Salary
import GenerateSalaryPage from './pages/education/finance/GenerateSalaryPage'
import PaySalaryPage from './pages/education/finance/PaySalaryPage'
import SalaryPaidSlipPage from './pages/education/finance/SalaryPaidSlipPage'
import SalarySheetPage from './pages/education/finance/SalarySheetPage'
import SalaryReportPage from './pages/education/finance/SalaryReportPage'

// Other
import CommunicationPage from './pages/education/CommunicationPage'
import AnalyticsPage from './pages/education/AnalyticsPage'
import CertificatesPage from './pages/education/CertificatesPage'
import LiveClassPage from './pages/education/LiveClassPage'
import LiveRoomPage from './pages/education/LiveRoomPage'

// ============================================================
// SETTINGS MODULE - NEW MODULAR VERSION
// ============================================================
import SettingsPage from './pages/settings'

// ============================================================
// PORTAL IMPORTS
// ============================================================
import ParentDashboard from './pages/portals/parent/ParentDashboard'
import TeacherDashboard from './pages/portals/teacher/TeacherDashboard'
import StudentDashboard from './pages/portals/student/StudentDashboard'

// ============================================================
// AUTH AND ERROR HANDLING
// ============================================================
import { AuthInitializer } from './providers/AuthInitializer'
import { QueryProvider } from './providers/QueryProvider'
import { setupGlobalErrorHandlers, ErrorBoundary } from './utils/errorHandler'
import CursorFollower from './components/common/CursorFollower'

const AppToaster = memo(() => <Toaster position="top-right" />)
AppToaster.displayName = 'AppToaster'

function App() {
  useEffect(() => {
    setupGlobalErrorHandlers()
    
    // Proactive database reset localStorage cleanup v2
    if (!localStorage.getItem('db_reset_v3')) {
      localStorage.removeItem('custom_teachers');
      localStorage.removeItem('custom_salaries');
      localStorage.removeItem('employees_extra_info');
      localStorage.removeItem('deleted_teacher_ids');
      localStorage.removeItem('custom_students');
      localStorage.setItem('db_reset_v3', 'done');
      console.log('🧹 Cleaned up local storage for fresh database reset');
    }
  }, [])

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthInitializer>
          <BrowserRouter>
            <CursorFollower />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                
                {/* ============================================================
                    EDUCATION ROUTES
                    ============================================================ */}
                <Route path="education" element={<Navigate to="/education/academics" replace />} />
                
                {/* ============================================================
                    STUDENTS ROUTES - ORDER MATTERS! Put specific routes first
                    ============================================================ */}
                <Route path="education/students" element={<StudentsListPage />} />
                <Route path="education/students/add" element={<AddStudentPage />} />
                <Route path="education/students/families" element={<FamiliesPage />} />
                <Route path="education/students/status" element={<ActiveInactivePage />} />
                <Route path="education/students/admission-letter" element={<AdmissionLetterPage />} />
                <Route path="education/students/id-cards" element={<StudentIdCardsPage />} />
                <Route path="education/students/print-list" element={<PrintBasicListPage />} />
                <Route path="education/students/logins" element={<StudentLoginsPage />} />
                <Route path="education/students/promote" element={<PromoteStudentsPage />} />
                
                {/* ✅ FIXED: Specific routes BEFORE the dynamic :id route */}
                <Route path="education/students/:id/history" element={<StudentHistoryPage />} />
                <Route path="education/students/:id/edit" element={<EditStudentPage />} />
                <Route path="education/students/:id" element={<StudentProfilePage />} />
                
                {/* Teachers */}
                <Route path="education/teachers" element={<TeachersManagementPage />} />
                <Route path="education/teachers/add" element={<AddTeacherPage />} />
                <Route path="education/teachers/job-letter" element={<JobLetterPage />} />
                <Route path="education/teachers/id-cards" element={<StaffIdCardsPage />} />
                <Route path="education/teachers/logins" element={<StaffLoginsPage />} />
                <Route path="education/teachers/:id" element={<TeacherProfilePage />} />
                <Route path="education/teachers/:id/edit" element={<EditTeacherPage />} />
                <Route path="education/teachers/:id/history" element={<EmployeeHistoryPage />} />
                

                {/* Exams */}
                <Route path="education/exams" element={<ExamsPage />} />
                <Route path="education/exams/list" element={<ExamsListPage />} />
                <Route path="education/exams/dashboard" element={<ExamDashboard />} />
                <Route path="education/exams/schedules" element={<ExamSchedules />} />
                <Route path="education/exams/schedule" element={<ExamSchedules />} />
                <Route path="education/exams/datesheet" element={<DateSheet />} />
                <Route path="education/exams/awardlist" element={<BlankAwardList />} />
                <Route path="education/exams/registrations" element={<ExamRegistrations />} />
                <Route path="education/exams/results-entry" element={<ExamResultsEntry />} />
                <Route path="education/exams/types" element={<ExamTypes />} />
                <Route path="education/exams/analytics" element={<ExamAnalytics />} />
                <Route path="education/exams/processing" element={<ResultProcessing />} />
                <Route path="education/exams/:id/results" element={<ExamResultsPage />} />
                <Route path="education/exams/sheet" element={<MarkSheetGeneration />} />
                
                {/* Class Tests & Attendance */}
                <Route path="education/class-tests" element={<ClassTestsPage />} />
                <Route path="education/attendance" element={<AttendancePage />} />
                
                {/* Academics */}
                <Route path="education/academics" element={<AcademicsPage />} />
                <Route path="education/academics/classes" element={<AllClassesPage />} />
                <Route path="education/academics/classes/add" element={<AddClassPage />} />
                <Route path="education/academics/classes/edit/:id" element={<EditClassPage />} />
                
                {/* Subjects */}
                <Route path="education/subjects" element={<SubjectsPage />} />
                <Route path="education/subjects/assign" element={<AssignSubjectsPage />} />
                
                {/* Curriculum */}
                <Route path="education/curriculum" element={<CurriculumManagementPage />} />
                <Route path="education/curriculum/topics" element={<TopicBreakdownPage />} />
                <Route path="education/curriculum/resources" element={<ResourceManagementPage />} />
                
                {/* Homework & Store */}
                <Route path="education/homework" element={<HomeworkManagementPage />} />
                <Route path="education/store" element={<OnlineStorePage />} />
                
                {/* Timetable */}
                <Route path="education/timetable" element={<TimetableManagement />} />
                <Route path="education/timetable/view" element={<TimetableViewPage />} />
                <Route path="education/timetable/periods" element={<PeriodManagementPage />} />
                <Route path="education/timetable/editor" element={<TimetableEditorPage />} />
                <Route path="education/timetable/weekdays" element={<WeekdayManagementPage />} />
                <Route path="education/timetable/rooms" element={<ClassroomManagementPage />} />
                <Route path="education/timetable/class" element={<ClassTimetableListPage />} />
                <Route path="education/timetable/teacher" element={<TeacherTimetableListPage />} />
                <Route path="education/timetable/leave" element={<StaffLeavePage />} />
                <Route path="education/timetable/my-leave" element={<TeacherLeaveApplyPage />} />
                
                {/* Progress */}
                <Route path="education/progress" element={<ProgressTrackingPage />} />
                <Route path="education/progress/lesson-planner" element={<LessonPlannerPage />} />
                <Route path="education/progress/coverage" element={<CoverageDashboardPage />} />
                <Route path="education/progress/students" element={<StudentProgressPage />} />
                
                {/* Admissions */}
                <Route path="education/admissions" element={<AdmissionsPage />} />
                <Route path="education/admissions/new" element={<NewApplicationPage />} />
                
                {/* Behaviour */}
                <Route path="education/behaviour/rate" element={<RateBehavioursPage />} />
                <Route path="education/skills/rate" element={<RateSkillsPage />} />
                <Route path="education/behaviour/observations" element={<ObservationsPage />} />
                <Route path="education/behaviour/affective-report" element={<AffectiveDomainReportPage />} />
                <Route path="education/behaviour/psycomotor-report" element={<PsycomotorDomainReportPage />} />
                
                {/* Finance */}
                <Route path="education/finance" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><FinancePage /></RoleBasedRoute>} />
                <Route path="education/finance/chart-of-accounts" element={<ChartOfAccountsPage />} />
                <Route path="education/finance/add-income" element={<AddIncomePage />} />
                <Route path="education/finance/add-expense" element={<AddExpensePage />} />
                <Route path="education/finance/account-statement" element={<AccountStatementPage />} />
                <Route path="education/finance/generate-invoices" element={<GenerateFeesInvoicePage />} />
                <Route path="education/finance/invoices" element={<InvoicesPage />} />
                <Route path="education/finance/collect-fees" element={<CollectFeesPage />} />
                <Route path="education/finance/fees-paid-slip" element={<FeesPaidSlipPage />} />
                <Route path="education/finance/fees-defaulters" element={<FeesDefaultersPage />} />
                <Route path="education/finance/report" element={<FeesReportPage />} />
                <Route path="education/finance/delete" element={<DeleteFeesPage />} />

                {/* Salary */}
                <Route path="education/salary/generate" element={<GenerateSalaryPage />} />
                <Route path="education/salary/pay" element={<PaySalaryPage />} />
                <Route path="education/salary/slips" element={<SalaryPaidSlipPage />} />
                <Route path="education/salary/sheet" element={<SalarySheetPage />} />
                <Route path="education/salary/report" element={<SalaryReportPage />} />

                {/* Communication & Analytics */}
                <Route path="education/communication" element={<CommunicationPage />} />
                <Route path="education/analytics" element={<AnalyticsPage />} />
                <Route path="education/analytics/attendance-student" element={<AnalyticsPage />} />
                <Route path="education/analytics/attendance-staff" element={<AnalyticsPage />} />
                <Route path="education/analytics/fees" element={<AnalyticsPage />} />
                <Route path="education/analytics/progress" element={<AnalyticsPage />} />
                <Route path="education/analytics/accounts" element={<AnalyticsPage />} />
                <Route path="education/analytics/custom" element={<AnalyticsPage />} />
                
                {/* Certificates & Live Class */}
                <Route path="education/certificates" element={<CertificatesPage />} />
                <Route path="education/certificates/templates" element={<CertificatesPage />} />
                <Route path="education/live-class" element={<LiveClassPage />} />
                <Route path="education/live-class/room" element={<LiveRoomPage />} />
                
                {/* ============================================================
                    SETTINGS ROUTES
                    ============================================================ */}
                <Route path="settings/*" element={<SettingsPage />} />
                
                {/* ============================================================
                    PORTAL ROUTES
                    ============================================================ */}
                <Route path="parent" element={<ParentDashboard />} />
                <Route path="parent/children" element={<ParentDashboard />} />
                <Route path="parent/attendance" element={<ParentDashboard />} />
                <Route path="parent/results" element={<ParentDashboard />} />
                <Route path="parent/fees" element={<ParentDashboard />} />
                <Route path="parent/notifications" element={<ParentDashboard />} />
                
                <Route path="teacher" element={<TeacherDashboard />} />
                <Route path="teacher/students" element={<StudentsListPage />} />
                
                <Route path="student" element={<StudentDashboard />} />
                <Route path="student/profile" element={<StudentDashboard />} />
                <Route path="student/attendance" element={<StudentDashboard />} />
                <Route path="student/results" element={<StudentDashboard />} />
                <Route path="student/fees" element={<StudentDashboard />} />
                <Route path="student/timetable" element={<StudentDashboard />} />
                <Route path="student/notifications" element={<StudentDashboard />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <AppToaster />
        </AuthInitializer>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default memo(App)