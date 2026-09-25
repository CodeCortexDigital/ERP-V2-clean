import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect, memo } from 'react'
import Layout from '@/components/layout/Layout';
import ModuleTabsLayout from './components/layout/ModuleTabsLayout';
import { gradebookTabs, accountsTabs, feesTabs, salaryTabs, attendanceTabs, timetableTabs, behaviourTabs, examTabs, subjectsTabs, communicationTabs, certificatesTabs, reportsTabs, academicSetupTabs } from './components/layout/moduleTabs';
import ProtectedRoute from './components/ProtectedRoute'
import { RoleBasedRoute } from './components/auth/RoleBasedRoute'
import { CanAccess } from './components/auth/CanAccess'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import SignupPage from './pages/auth/SignupPage'
import PlatformSchoolsPage from './pages/platform/PlatformSchoolsPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AuditLogViewer from './pages/admin/AuditLogViewer'

// ============================================================
// EDUCATION MODULE IMPORTS
// ============================================================
// Students
import StudentsLayout from './pages/education/students/StudentsLayout'
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
import TeachersLayout from './pages/education/teachers/TeachersLayout'
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
import ExamDashboard from './pages/education/exams/ExamDashboard'
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
import MarksGrading from './pages/settings/MarksGrading'
import ClassTestsPage from './pages/education/ClassTestsPage'

// Question Bank
import QuestionBankPage from './pages/education/questionbank/QuestionBankPage'
import QuestionChaptersPage from './pages/education/questionbank/QuestionChaptersPage'
import CreatePaperPage from './pages/education/questionbank/CreatePaperPage'

// Attendance
import AttendancePage from './pages/education/attendance/AttendancePage'
import TeacherMarkAttendance from './pages/education/attendance/TeacherMarkAttendance'

// Academics
import AcademicsPage from './pages/education/AcademicsPage'
import AllClassesPage from './pages/education/academics/AllClassesPage'
import AddClassPage from './pages/education/academics/AddClassPage'
import EditClassPage from './pages/education/academics/EditClassPage'
import ClassDetailPage from './pages/education/academics/ClassDetailPage'

// Subjects
import SubjectsPage from './pages/education/subjects/SubjectsPage'
import AssignSubjectsPage from './pages/education/subjects/AssignSubjectsPage'

// Curriculum
import CurriculumManagementPage from './pages/education/curriculum/SyllabusManagement'
import TopicBreakdownPage from './pages/education/curriculum/TopicBreakdown'
import ResourceManagementPage from './pages/education/curriculum/ResourceManagement'

// Homework & Store
import HomeworkManagementPage from './pages/education/assignments/HomeworkManagementPage'
import AssignmentGradingPage from './pages/education/homework/AssignmentGradingPage'
import InventoryStockPage from './pages/education/inventory/InventoryStockPage'
import InventoryPurchasesPage from './pages/education/inventory/InventoryPurchasesPage'
import InventorySuppliersPage from './pages/education/inventory/InventorySuppliersPage'
import InventoryReportPage from './pages/education/inventory/InventoryReportPage'
import { Boxes, ShoppingCart as PurchasesIcon, Factory, BarChart2 } from 'lucide-react'

// Timetable
import TimetableManagement from './pages/education/timetable/TimetableManagement'
import TimetableViewPage from './pages/education/timetable/TimetableViewPage'
import PeriodManagementPage from './pages/education/timetable/PeriodManagementPage'
import TimetableEditorPage from './pages/education/timetable/TimetableEditorPage'
import WeekdayManagementPage from './pages/education/timetable/WeekdayManagementPage'
import ClassroomManagementPage from './pages/education/timetable/ClassroomManagementPage'
import ClassTimetableListPage from './pages/education/timetable/ClassTimetableListPage'
import TeacherTimetableListPage from './pages/education/timetable/TeacherTimetableListPage'
import TeacherMyTimetablePage from './pages/education/timetable/TeacherMyTimetablePage'
import StaffLeavePage from './pages/education/timetable/StaffLeavePage'
import TeacherLeaveApplyPage from './pages/education/timetable/TeacherLeaveApplyPage'
import LeaveLimitsPage from './pages/education/timetable/LeaveLimitsPage'

// Progress
import ProgressTrackingPage from './pages/education/progress/ProgressTrackingPage'
import LessonPlannerPage from './pages/education/progress/LessonPlannerPage'
import CoverageDashboardPage from './pages/education/progress/CoverageDashboardPage'
import StudentProgressPage from './pages/education/progress/StudentProgressPage'

// Admissions
import AdmissionsPage from './pages/education/AdmissionsPage'
import NewApplicationPage from '@/pages/education/admissions/NewApplicationPage'
import ApplyPage, { ApplicationStatusPage } from '@/pages/public/ApplyPage'
import FamilyBillingPage from '@/pages/education/finance/FamilyBillingPage'
import PaymentPlansPage from '@/pages/education/finance/PaymentPlansPage'
import OnlinePaymentsPage from '@/pages/education/finance/OnlinePaymentsPage'
import IntegrationsPage from '@/pages/settings/IntegrationsPage'
import SchoolReportsPage from '@/pages/education/insights/SchoolReportsPage'
import SearchPage from '@/pages/SearchPage'
import LessonAttendancePage from '@/pages/education/attendance/LessonAttendancePage'
import AbsenceReportsPage from '@/pages/education/attendance/AbsenceReportsPage'
import SchoolYearsPage from '@/pages/education/academic-years/SchoolYearsPage'
import CourseCatalogPage from '@/pages/education/subjects/CourseCatalogPage'
import GradebookPage from '@/pages/education/gradebook/GradebookPage'
import ReportCardsPage from '@/pages/education/gradebook/ReportCardsPage'
import StandardsPage from '@/pages/education/gradebook/StandardsPage'
import GradingScalesPage from '@/pages/education/gradebook/GradingScalesPage'
import MessagesPage from '@/pages/messages/MessagesPage'
import AnnouncementsPage from '@/pages/messages/AnnouncementsPage'
import CalendarPage from '@/pages/calendar/CalendarPage'
import MeetingsPage from '@/pages/calendar/MeetingsPage'
import SmsPage from '@/pages/messages/SmsPage'

// Behaviour
import BehaviourPage from './pages/education/behaviour/BehaviourPage'

// Finance
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
import FeeParticulars from './pages/settings/FeeParticulars'
import FeeStructure from './pages/settings/FeeStructure'
import DiscountType from './pages/settings/DiscountType'
import FeeChallanDetails from './pages/settings/FeeChallanDetails'

// Salary
import PayslipsListPage from './pages/education/finance/PayslipsListPage'
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
import RulesRegulations from './pages/settings/RulesRegulations'

// ============================================================
// PORTAL IMPORTS
// ============================================================
import ParentDashboard from './pages/portals/parent/ParentDashboard'
import FamilyPage from './pages/portals/parent/FamilyPage'
import ParentAttendancePage from './pages/portals/parent/ParentAttendancePage'
import ParentFeesPage from './pages/portals/parent/ParentFeesPage'
import ParentApplicationsPage from './pages/portals/parent/ParentApplicationsPage'
import FamilyUpdatesPage from './pages/education/students/FamilyUpdatesPage'
import TeacherDashboard from './pages/portals/teacher/TeacherDashboard'
import LibraryDeskPage from './pages/education/library/LibraryDeskPage'
import LibraryCataloguePage from './pages/education/library/LibraryCataloguePage'
import LibraryMembersPage from './pages/education/library/LibraryMembersPage'
import LibraryLoansPage from './pages/education/library/LibraryLoansPage'
import LibraryReportPage from './pages/education/library/LibraryReportPage'
import LibraryLabelsPage from './pages/education/library/LibraryLabelsPage'
import MyLibraryPage from './pages/portals/MyLibraryPage'
import TransportTodayPage from './pages/education/transport/TransportTodayPage'
import TransportRoutesPage from './pages/education/transport/TransportRoutesPage'
import TransportRidersPage from './pages/education/transport/TransportRidersPage'
import TransportFleetPage from './pages/education/transport/TransportFleetPage'
import TransportReportPage from './pages/education/transport/TransportReportPage'
import MyTransportPage from './pages/portals/MyTransportPage'
import CafeteriaTillPage from './pages/education/cafeteria/CafeteriaTillPage'
import CafeteriaMenuPage from './pages/education/cafeteria/CafeteriaMenuPage'
import CafeteriaAccountsPage from './pages/education/cafeteria/CafeteriaAccountsPage'
import MyCafeteriaPage from './pages/portals/MyCafeteriaPage'
import { UtensilsCrossed, CalendarRange, Wallet as WalletIcon } from 'lucide-react'
import { Bus, Route as RouteIcon, Users2 as RidersIcon, Truck, PieChart as ReportIcon } from 'lucide-react'
import { BookOpen as LibIcon, ScanLine, Users as MembersIcon, ListChecks, BarChart3 } from 'lucide-react'
import MyClassesPage from './pages/portals/teacher/MyClassesPage'
import ClassRosterPage from './pages/portals/teacher/ClassRosterPage'
import ClassReportsPage from './pages/portals/teacher/ClassReportsPage'
import StudentDashboard from './pages/portals/student/StudentDashboard'
import StudentPortalLayout from './pages/portals/student/StudentPortalLayout'
import StudentAttendancePage from './pages/portals/student/StudentAttendancePage'
import StudentResultsPage from './pages/portals/student/StudentResultsPage'
import StudentTimetablePage from './pages/portals/student/StudentTimetablePage'
import StudentFeesPage from './pages/portals/student/StudentFeesPage'
import StudentNotificationsPage from './pages/portals/student/StudentNotificationsPage'
import StudentAssignmentsPage from './pages/portals/student/StudentAssignmentsPage'
import PortalProgressPage from './pages/portals/student/StudentProgressPage'
import StudentDocumentsPage from './pages/portals/student/StudentDocumentsPage'
import StudentBehaviourPage from './pages/portals/student/StudentBehaviourPage'
import StudentCertificatesPage from './pages/portals/student/StudentCertificatesPage'
import PortalStudentProfilePage from './pages/portals/student/StudentProfilePage'
import EmployeePortalPage from './pages/portals/employee/EmployeePortalPage'

// ============================================================
// AUTH AND ERROR HANDLING
// ============================================================
import { AuthInitializer } from './providers/AuthInitializer'
import { QueryProvider } from './providers/QueryProvider'
import { setupGlobalErrorHandlers, ErrorBoundary } from './utils/errorHandler'
import CursorFollower from './components/common/CursorFollower'

const AppToaster = memo(() => <Toaster position="top-right" />)
AppToaster.displayName = 'AppToaster'

const libraryTabs = [
  { id: 'desk', path: '/education/library', label: 'Desk', icon: ScanLine },
  { id: 'catalogue', path: '/education/library/catalogue', label: 'Catalogue', icon: LibIcon },
  { id: 'members', path: '/education/library/members', label: 'Members', icon: MembersIcon },
  { id: 'loans', path: '/education/library/loans', label: 'Loans & Reservations', icon: ListChecks },
  { id: 'report', path: '/education/library/report', label: 'Report & Rules', icon: BarChart3 },
]

const transportTabs = [
  { id: 'today', path: '/education/transport', label: 'Today', icon: Bus },
  { id: 'routes', path: '/education/transport/routes', label: 'Routes', icon: RouteIcon },
  { id: 'riders', path: '/education/transport/riders', label: 'Students', icon: RidersIcon },
  { id: 'fleet', path: '/education/transport/fleet', label: 'Fleet & Crew', icon: Truck },
  { id: 'report', path: '/education/transport/report', label: 'Report & Billing', icon: ReportIcon },
]

const inventoryTabs = [
  { id: 'stock', path: '/education/inventory', label: 'Stock', icon: Boxes },
  { id: 'purchases', path: '/education/inventory/purchases', label: 'Purchases', icon: PurchasesIcon },
  { id: 'suppliers', path: '/education/inventory/suppliers', label: 'Suppliers & Categories', icon: Factory },
  { id: 'report', path: '/education/inventory/report', label: 'Report', icon: BarChart2 },
]

const cafeteriaTabs = [
  { id: 'till', path: '/education/cafeteria', label: 'Till', icon: UtensilsCrossed },
  { id: 'menu', path: '/education/cafeteria/menu', label: 'Menu & Food', icon: CalendarRange },
  { id: 'accounts', path: '/education/cafeteria/accounts', label: 'Accounts, Plans & Report', icon: WalletIcon },
]

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
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/apply/status" element={<ApplicationStatusPage />} />
              <Route path="/apply/:slug" element={<ApplyPage />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<RoleBasedRoute allowedRoles={['admin', 'staff']}><DashboardPage /></RoleBasedRoute>} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="meetings" element={<MeetingsPage />} />
                <Route path="education/communication/sms" element={<RoleBasedRoute allowedRoles={['admin']}><SmsPage /></RoleBasedRoute>} />
                <Route path="admin/audit-logs" element={<RoleBasedRoute allowedRoles={['admin']}><AuditLogViewer /></RoleBasedRoute>} />
                
                {/* ============================================================
                    EDUCATION ROUTES
                    ============================================================ */}
                <Route path="education" element={<Navigate to="/education/academics" replace />} />
                
                {/* ============================================================
                    STUDENTS ROUTES - section pages share a top tab bar layout
                    ============================================================ */}
                <Route path="education/students" element={<StudentsLayout />}>
                  <Route index element={<StudentsListPage />} />
                  <Route path="add" element={<AddStudentPage />} />
                  <Route path="families" element={<FamiliesPage />} />
                  <Route path="family-updates" element={<RoleBasedRoute allowedRoles={['admin']}><FamilyUpdatesPage /></RoleBasedRoute>} />
                  <Route path="status" element={<ActiveInactivePage />} />
                  <Route path="admission-letter" element={<AdmissionLetterPage />} />
                  <Route path="id-cards" element={<StudentIdCardsPage />} />
                  <Route path="print-list" element={<PrintBasicListPage />} />
                  <Route path="logins" element={<StudentLoginsPage />} />
                  <Route path="promote" element={<PromoteStudentsPage />} />
                  <Route path="rules" element={<RulesRegulations mode="student" />} />
                </Route>

                {/* ✅ FIXED: Specific routes BEFORE the dynamic :id route */}
                <Route path="education/students/:id/history" element={<StudentHistoryPage />} />
                <Route path="education/students/:id/edit" element={<EditStudentPage />} />
                <Route path="education/students/:id" element={<StudentProfilePage />} />
                
                {/* Teachers / Employees - section pages share a top tab bar layout */}
                <Route path="education/teachers" element={<TeachersLayout />}>
                  <Route index element={<TeachersManagementPage />} />
                  <Route path="add" element={<AddTeacherPage />} />
                  <Route path="job-letter" element={<JobLetterPage />} />
                  <Route path="id-cards" element={<StaffIdCardsPage />} />
                  <Route path="logins" element={<StaffLoginsPage />} />
                  <Route path="rules" element={<RulesRegulations mode="employee" />} />
                </Route>
                <Route path="education/teachers/:id" element={<TeacherProfilePage />} />
                <Route path="education/teachers/:id/edit" element={<EditTeacherPage />} />
                <Route path="education/teachers/:id/history" element={<EmployeeHistoryPage />} />
                

                {/* Examination (Question Papers + Exams + Class Tests) */}
                <Route path="education/exams" element={<CanAccess module="exams" redirect><ModuleTabsLayout tabs={examTabs} scopeClass="exam-scope" /></CanAccess>}>
                  <Route index element={<ExamsPage />} />
                  <Route path="list" element={<ExamsListPage />} />
                  <Route path="dashboard" element={<ExamDashboard />} />
                  <Route path="schedules" element={<ExamSchedules />} />
                  <Route path="schedule" element={<ExamSchedules />} />
                  <Route path="datesheet" element={<DateSheet />} />
                  <Route path="awardlist" element={<BlankAwardList />} />
                  <Route path="grading" element={<MarksGrading />} />
                </Route>
                <Route path="education/exams/registrations" element={<ExamRegistrations />} />
                <Route path="education/exams/results-entry" element={<ExamResultsEntry />} />
                <Route path="education/exams/types" element={<ExamTypes />} />
                <Route path="education/exams/analytics" element={<ExamAnalytics />} />
                <Route path="education/exams/processing" element={<ResultProcessing />} />
                <Route path="education/exams/:id/results" element={<ExamResultsPage />} />
                <Route path="education/exams/sheet" element={<MarkSheetGeneration />} />
                
                {/* Class Tests & Attendance */}
                <Route path="education/class-tests" element={<CanAccess module="exams" redirect><ModuleTabsLayout tabs={examTabs} scopeClass="exam-scope" /></CanAccess>}>
                  <Route index element={<ClassTestsPage />} />
                </Route>

                {/* Question Bank */}
                <Route path="education/question-bank" element={<QuestionBankPage />} />
                <Route path="education/question-bank/chapters" element={<QuestionChaptersPage />} />
                <Route path="education/question-bank/create" element={<CreatePaperPage />} />
                <Route path="education/attendance" element={<ModuleTabsLayout tabs={attendanceTabs} scopeClass="attendance-scope" />}>
                  <Route index element={<AttendancePage />} />
                </Route>
                <Route path="education/attendance/mark" element={<CanAccess module="attendance" action="mark" redirect><TeacherMarkAttendance /></CanAccess>} />
                <Route path="education/attendance/lessons" element={<ModuleTabsLayout tabs={attendanceTabs} scopeClass="attendance-scope" />}>
                  <Route index element={<CanAccess module="attendance" action="mark" redirect><LessonAttendancePage /></CanAccess>} />
                </Route>
                <Route path="education/attendance/absence-reports" element={<ModuleTabsLayout tabs={attendanceTabs} scopeClass="attendance-scope" />}>
                  <Route index element={<RoleBasedRoute allowedRoles={['admin']}><AbsenceReportsPage /></RoleBasedRoute>} />
                </Route>
                
                {/* Academics */}
                <Route path="education/academics" element={<AcademicsPage />} />
                <Route path="education/academics/classes" element={<AllClassesPage />} />
                <Route path="education/academics/classes/add" element={<AddClassPage />} />
                <Route path="education/academics/classes/edit/:id" element={<EditClassPage />} />
                <Route path="education/academics/classes/view/:id" element={<ClassDetailPage />} />

                {/* Legacy aliases for Classes / Subjects / Homework (render without tab bar) */}
                <Route path="education/subjects" element={<SubjectsPage />} />
                <Route path="education/subjects/assign" element={<AssignSubjectsPage />} />
                <Route path="education/homework" element={<HomeworkManagementPage />} />
                <Route path="education/homework/grade/:id" element={<AssignmentGradingPage />} />

                {/* Academic Setup — Classes + Subjects + Homework merged into one tab bar */}
                <Route path="education/academic-setup" element={<CanAccess module="academic-setup" redirect><ModuleTabsLayout tabs={academicSetupTabs} scopeClass="academic-setup-scope" /></CanAccess>}>
                  <Route index element={<Navigate to="/education/academic-setup/classes" replace />} />
                  <Route path="classes" element={<AllClassesPage />} />
                  <Route path="classes/add" element={<AddClassPage />} />
                  <Route path="classes/edit/:id" element={<EditClassPage />} />
                  <Route path="classes/view/:id" element={<ClassDetailPage />} />
                  <Route path="subjects" element={<SubjectsPage />} />
                  <Route path="subjects/assign" element={<AssignSubjectsPage />} />
                  <Route path="years" element={<SchoolYearsPage />} />
                  <Route path="courses" element={<CourseCatalogPage />} />
                  <Route path="homework" element={<HomeworkManagementPage />} />
                  <Route path="live-class" element={<LiveClassPage />} />
                </Route>
                
                {/* Gradebook */}
                <Route path="education/gradebook" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><ModuleTabsLayout tabs={gradebookTabs} scopeClass="gradebook-scope" /></RoleBasedRoute>}>
                  <Route index element={<GradebookPage />} />
                  <Route path="standards" element={<StandardsPage />} />
                  <Route path="report-cards" element={<ReportCardsPage />} />
                  <Route path="scales" element={<RoleBasedRoute allowedRoles={['admin']}><GradingScalesPage /></RoleBasedRoute>} />
                </Route>

                {/* Curriculum */}
                <Route path="education/curriculum" element={<CurriculumManagementPage />} />
                <Route path="education/curriculum/topics" element={<TopicBreakdownPage />} />
                <Route path="education/curriculum/resources" element={<ResourceManagementPage />} />
                
                {/* Homework & Store */}
                <Route path="education/homework" element={<HomeworkManagementPage />} />
                <Route path="education/homework/grade/:id" element={<AssignmentGradingPage />} />
                {/* Inventory (the old browser-only "online store" page now opens the real stock) */}
                <Route path="education/store" element={<Navigate to="/education/inventory" replace />} />
                <Route path="education/inventory" element={<RoleBasedRoute allowedRoles={['admin']}><ModuleTabsLayout tabs={inventoryTabs} scopeClass="inventory-scope" /></RoleBasedRoute>}>
                  <Route index element={<InventoryStockPage />} />
                  <Route path="purchases" element={<InventoryPurchasesPage />} />
                  <Route path="suppliers" element={<InventorySuppliersPage />} />
                  <Route path="report" element={<InventoryReportPage />} />
                </Route>
                
                {/* Timetable */}
                <Route path="education/timetable" element={<CanAccess module="timetable" redirect><ModuleTabsLayout tabs={timetableTabs} scopeClass="timetable-scope" /></CanAccess>}>
                  <Route index element={<TimetableManagement />} />
                  <Route path="view" element={<TimetableViewPage />} />
                  <Route path="periods" element={<PeriodManagementPage />} />
                  <Route path="editor" element={<TimetableEditorPage />} />
                  <Route path="weekdays" element={<WeekdayManagementPage />} />
                  <Route path="rooms" element={<ClassroomManagementPage />} />
                  <Route path="class" element={<ClassTimetableListPage />} />
                  <Route path="teacher" element={<TeacherTimetableListPage />} />
                  <Route path="my" element={<TeacherMyTimetablePage />} />
                  <Route path="leave" element={<StaffLeavePage />} />
                  <Route path="my-leave" element={<TeacherLeaveApplyPage />} />
                  <Route path="leave-limits" element={<RoleBasedRoute allowedRoles={['admin']}><LeaveLimitsPage /></RoleBasedRoute>} />
                </Route>
                
                {/* Progress */}
                <Route path="education/progress" element={<ProgressTrackingPage />} />
                <Route path="education/progress/lesson-planner" element={<LessonPlannerPage />} />
                <Route path="education/progress/coverage" element={<CoverageDashboardPage />} />
                <Route path="education/progress/students" element={<StudentProgressPage />} />
                
                {/* Admissions */}
                <Route path="education/admissions" element={<AdmissionsPage />} />
                <Route path="education/admissions/new" element={<NewApplicationPage />} />
                
                {/* Behaviour & Skills */}
                <Route path="education/behaviour" element={<CanAccess module="behaviour" redirect><ModuleTabsLayout tabs={behaviourTabs} scopeClass="behaviour-scope" /></CanAccess>}>
                  <Route index element={<BehaviourPage />} />
                </Route>
                
                {/* Accounts */}
                <Route path="education/accounts" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><ModuleTabsLayout tabs={accountsTabs} scopeClass="finance-scope" /></RoleBasedRoute>}>
                  <Route index element={<Navigate to="/education/accounts/chart-of-accounts" replace />} />
                  <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
                  <Route path="add-income" element={<AddIncomePage />} />
                  <Route path="add-expense" element={<AddExpensePage />} />
                  <Route path="account-statement" element={<AccountStatementPage />} />
                </Route>

                {/* Fees */}
                <Route path="education/fees" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><ModuleTabsLayout tabs={feesTabs} scopeClass="finance-scope" /></RoleBasedRoute>}>
                  <Route index element={<Navigate to="/education/fees/invoices" replace />} />
                  <Route path="fee-items" element={<FeeParticulars />} />
                  <Route path="fee-plan" element={<FeeStructure />} />
                  <Route path="discount" element={<DiscountType />} />
                  <Route path="fee-accounts" element={<FeeChallanDetails />} />
                  <Route path="generate-invoices" element={<GenerateFeesInvoicePage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="collect-fees" element={<CollectFeesPage />} />
                  <Route path="families" element={<FamilyBillingPage />} />
                  <Route path="payment-plans" element={<PaymentPlansPage />} />
                  <Route path="online-payments" element={<OnlinePaymentsPage />} />
                  <Route path="fees-paid-slip" element={<FeesPaidSlipPage />} />
                  <Route path="fees-defaulters" element={<FeesDefaultersPage />} />
                  <Route path="report" element={<FeesReportPage />} />
                  <Route path="delete" element={<DeleteFeesPage />} />
                </Route>

                {/* Legacy Finance aliases (Accounts + Fees) */}
                <Route path="education/finance" element={<Navigate to="/education/accounts" replace />} />
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
                <Route path="education/salary" element={<ModuleTabsLayout tabs={salaryTabs} scopeClass="salary-scope" />}>
                  <Route index element={<Navigate to="/education/salary/list" replace />} />
                  <Route path="list" element={<PayslipsListPage />} />
                  <Route path="generate" element={<GenerateSalaryPage />} />
                  <Route path="pay" element={<PaySalaryPage />} />
                  <Route path="slips" element={<SalaryPaidSlipPage />} />
                  <Route path="sheet" element={<SalarySheetPage />} />
                  <Route path="report" element={<SalaryReportPage />} />
                </Route>

                {/* Communication & Analytics */}
                <Route path="education/communication" element={<CanAccess module="communication" redirect><ModuleTabsLayout tabs={communicationTabs} scopeClass="communication-scope" /></CanAccess>}>
                  <Route index element={<CommunicationPage />} />
                </Route>
                {/* Legacy/alias communication routes (Sidebar & deep links) */}
                <Route path="communication/whatsapp" element={<CanAccess module="communication" redirect><CommunicationPage /></CanAccess>} />
                <Route path="communication/sms-gateway" element={<CanAccess module="communication" redirect><CommunicationPage /></CanAccess>} />
                <Route path="communication/branded-sms" element={<CanAccess module="communication" redirect><CommunicationPage /></CanAccess>} />
                <Route path="communication/sms-templates" element={<CanAccess module="communication" redirect><CommunicationPage /></CanAccess>} />
                <Route path="education/analytics" element={<CanAccess module="reports" redirect><ModuleTabsLayout tabs={reportsTabs} scopeClass="reports-scope" /></CanAccess>}>
                  <Route index element={<AnalyticsPage />} />
                  <Route path="insights" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="overview" /></RoleBasedRoute>} />
                  <Route path="insights/enrolment" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="enrolment" /></RoleBasedRoute>} />
                  <Route path="insights/attendance" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="attendance" /></RoleBasedRoute>} />
                  <Route path="insights/finance" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="finance" /></RoleBasedRoute>} />
                  <Route path="insights/academics" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="academics" /></RoleBasedRoute>} />
                  <Route path="insights/teachers" element={<RoleBasedRoute allowedRoles={['admin']}><SchoolReportsPage view="teachers" /></RoleBasedRoute>} />
                  <Route path="attendance-student" element={<AnalyticsPage />} />
                  <Route path="attendance-staff" element={<AnalyticsPage />} />
                  <Route path="fees" element={<AnalyticsPage />} />
                  <Route path="progress" element={<AnalyticsPage />} />
                  <Route path="accounts" element={<AnalyticsPage />} />
                  <Route path="custom" element={<AnalyticsPage />} />
                </Route>
                
                {/* Certificates & Live Class */}
                <Route path="education/certificates" element={<ModuleTabsLayout tabs={certificatesTabs} scopeClass="certificates-scope" />}>
                  <Route index element={<CertificatesPage />} />
                  <Route path="templates" element={<CertificatesPage />} />
                </Route>
                <Route path="education/live-class" element={<LiveClassPage />} />
                {/* Library (the office runs the desk) */}
                <Route path="education/library/labels" element={<RoleBasedRoute allowedRoles={['admin']}><LibraryLabelsPage /></RoleBasedRoute>} />
                <Route path="education/library" element={<RoleBasedRoute allowedRoles={['admin']}><ModuleTabsLayout tabs={libraryTabs} scopeClass="library-scope" /></RoleBasedRoute>}>
                  <Route index element={<LibraryDeskPage />} />
                  <Route path="catalogue" element={<LibraryCataloguePage />} />
                  <Route path="members" element={<LibraryMembersPage />} />
                  <Route path="loans" element={<LibraryLoansPage />} />
                  <Route path="report" element={<LibraryReportPage />} />
                </Route>
                <Route path="library" element={<MyLibraryPage />} />
                <Route path="search" element={<SearchPage />} />
                {/* Transport (the office sets it up; drivers and attendants run their routes under Bus duty) */}
                <Route path="education/transport" element={<RoleBasedRoute allowedRoles={['admin']}><ModuleTabsLayout tabs={transportTabs} scopeClass="transport-scope" /></RoleBasedRoute>}>
                  <Route index element={<TransportTodayPage />} />
                  <Route path="routes" element={<TransportRoutesPage />} />
                  <Route path="riders" element={<TransportRidersPage />} />
                  <Route path="fleet" element={<TransportFleetPage />} />
                  <Route path="report" element={<TransportReportPage />} />
                </Route>
                <Route path="transport/duty" element={<TransportTodayPage crew />} />
                {/* Cafeteria (the office, or cafeteria staff at the till) */}
                <Route path="education/cafeteria" element={<RoleBasedRoute allowedRoles={['admin']}><ModuleTabsLayout tabs={cafeteriaTabs} scopeClass="cafeteria-scope" /></RoleBasedRoute>}>
                  <Route index element={<CafeteriaTillPage />} />
                  <Route path="menu" element={<CafeteriaMenuPage />} />
                  <Route path="accounts" element={<CafeteriaAccountsPage />} />
                </Route>
                <Route path="cafeteria/till" element={<CafeteriaTillPage standalone />} />
                <Route path="education/live-class/room" element={<LiveRoomPage />} />
                
                {/* ============================================================
                    SETTINGS ROUTES
                    ============================================================ */}
                <Route path="settings/integrations" element={<RoleBasedRoute allowedRoles={['admin']}><IntegrationsPage /></RoleBasedRoute>} />
                <Route path="settings/*" element={<SettingsPage />} />
                <Route path="platform/schools" element={<RoleBasedRoute allowedRoles={['admin']}><PlatformSchoolsPage /></RoleBasedRoute>} />
                {/* Legacy aliases: fee/settings moved to Fees top tabs */}
                <Route path="settings/fee-particulars" element={<Navigate to="/education/fees/fee-items" replace />} />
                <Route path="settings/fee-structure" element={<Navigate to="/education/fees/fee-plan" replace />} />
                <Route path="settings/discount-type" element={<Navigate to="/education/fees/discount" replace />} />
                <Route path="settings/bank-accounts" element={<Navigate to="/education/fees/fee-accounts" replace />} />
                {/* Legacy alias: Grading moved to Examination */}
                <Route path="settings/grading" element={<MarksGrading />} />
                
                {/* ============================================================
                    PORTAL ROUTES
                    ============================================================ */}
                <Route path="parent" element={<ParentDashboard />} />
                <Route path="parent/children" element={<FamilyPage />} />
                <Route path="parent/attendance" element={<ParentAttendancePage />} />
                <Route path="parent/results" element={<PortalProgressPage />} />
                <Route path="parent/progress" element={<PortalProgressPage />} />
                <Route path="parent/assignments" element={<StudentAssignmentsPage />} />
                <Route path="parent/behaviour" element={<StudentBehaviourPage />} />
                <Route path="parent/documents" element={<StudentDocumentsPage />} />
                <Route path="parent/library" element={<MyLibraryPage />} />
                <Route path="parent/transport" element={<MyTransportPage />} />
                <Route path="parent/cafeteria" element={<MyCafeteriaPage />} />
                <Route path="parent/fees" element={<ParentFeesPage />} />
                <Route path="parent/applications" element={<ParentApplicationsPage />} />
                <Route path="parent/notifications" element={<StudentNotificationsPage />} />
                
                <Route path="teacher" element={<TeacherDashboard />} />
                <Route path="teacher/students" element={<StudentsListPage />} />
                <Route path="teacher/classes" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><MyClassesPage /></RoleBasedRoute>} />
                <Route path="teacher/classes/:id" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><ClassRosterPage /></RoleBasedRoute>} />
                <Route path="teacher/reports" element={<RoleBasedRoute allowedRoles={['admin', 'teacher']}><ClassReportsPage /></RoleBasedRoute>} />
                
                <Route path="student" element={<StudentPortalLayout />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="attendance" element={<StudentAttendancePage />} />
                  <Route path="results" element={<StudentResultsPage />} />
                  <Route path="timetable" element={<StudentTimetablePage />} />
                  <Route path="fees" element={<StudentFeesPage />} />
                  <Route path="homework" element={<StudentAssignmentsPage />} />
                  <Route path="assignments" element={<StudentAssignmentsPage />} />
                  <Route path="progress" element={<PortalProgressPage />} />
                  <Route path="documents" element={<StudentDocumentsPage />} />
                  <Route path="library" element={<MyLibraryPage />} />
                  <Route path="transport" element={<MyTransportPage />} />
                  <Route path="cafeteria" element={<MyCafeteriaPage />} />
                  <Route path="behaviour" element={<StudentBehaviourPage />} />
                  <Route path="certificates" element={<StudentCertificatesPage />} />
                  <Route path="profile" element={<PortalStudentProfilePage />} />
                  <Route path="notifications" element={<StudentNotificationsPage />} />
                </Route>

                {/* Employee Portal is a self-contained portal (own sidebar +
                    header) and must NOT be nested inside <Layout/>, which already
                    renders a global sidebar — otherwise two sidebars stack. */}
              </Route>

              {/* Employee Portal — standalone, outside the global Layout */}
              <Route path="/employee" element={<ProtectedRoute><EmployeePortalPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <AppToaster />
        </AuthInitializer>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default memo(App)