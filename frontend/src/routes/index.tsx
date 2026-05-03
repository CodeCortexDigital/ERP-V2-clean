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

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AnalyticsPage = lazy(() => import('../pages/analytics/Analytics'));
const ReportsPage = lazy(() => import('../pages/reports/Reports'));
const ReportViewer = lazy(() => import('../pages/reports/ReportViewer'));
const AccountsListPage = lazy(() => import('../pages/accounts/AccountsListPage'));
const ProductsListPage = lazy(() => import('../pages/inventory/ProductsListPage'));
const OrdersListPage = lazy(() => import('../pages/procurement/OrdersListPage'));
const TenantsListPage = lazy(() => import('../pages/tenants/TenantsListPage'));
const InvoicesListPage = lazy(() => import('../pages/finance/InvoicesListPage'));
const EmployeesListPage = lazy(() => import('../pages/hr/EmployeesListPage'));
const DocumentsListPage = lazy(() => import('../pages/documents/DocumentsListPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));

// Finance Module
const FinanceAccountsPage = lazy(() => import('../pages/finance/AccountsPage'));
const FinancePaymentsPage = lazy(() => import('../pages/finance/PaymentsPage'));
const FinanceReportsPage = lazy(() => import('../pages/finance/ReportsPage'));

// CRM Module
const CRMPage = lazy(() => import('../pages/crm/LeadsPage'));
const CRMOpportunitiesPage = lazy(() => import('../pages/crm/OpportunitiesPage'));
const CRMCustomersPage = lazy(() => import('../pages/crm/CustomersPage'));

// Commerce Module
const CommerceProductsPage = lazy(() => import('../pages/commerce/ProductsPage'));
const CommerceOrdersPage = lazy(() => import('../pages/commerce/OrdersPage'));
const CommerceCartPage = lazy(() => import('../pages/commerce/CartPage'));

// AI Module
const AIPredictiveAnalyticsPage = lazy(() => import('../pages/ai/PredictiveAnalytics'));
const AIRecommendationsPage = lazy(() => import('../pages/ai/Recommendations'));
const AIAnomalyDetectionPage = lazy(() => import('../pages/ai/AnomalyDetection'));
const AIChatbotPage = lazy(() => import('../pages/ai/Chatbot'));
const AIDocumentIntelligencePage = lazy(() => import('../pages/ai/DocumentIntelligence'));

// SCM Module
const SCMInventoryPage = lazy(() => import('../pages/scm/InventoryPage'));
const SCMWarehousePage = lazy(() => import('../pages/scm/WarehousePage'));
const SCMProcurementPage = lazy(() => import('../pages/scm/ProcurementPage'));
const SCMSuppliersPage = lazy(() => import('../pages/scm/SuppliersPage'));

// Business Module
const BusinessContractsPage = lazy(() => import('../pages/business/ContractsPage'));
const BusinessBudgetPage = lazy(() => import('../pages/business/BudgetPage'));
const BusinessRiskPage = lazy(() => import('../pages/business/RiskPage'));

// Education Module
const StudentsListPage = lazy(() => import('../pages/education/StudentsListPage'));
const CoursesListPage = lazy(() => import('../pages/education/CoursesListPage'));
const AcademicsPage = lazy(() => import('../pages/education/AcademicsPage'));
const AdmissionsPage = lazy(() => import('../pages/education/AdmissionsPage'));
const ExamsPage = lazy(() => import('../pages/education/ExamsPage'));
const FeesPage = lazy(() => import('../pages/education/FeesPage'));
const AttendancePage = lazy(() => import('../pages/education/AttendancePage'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public route component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
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
        path: 'accounts',
        element: <Suspense fallback={<PageLoader />}><AccountsListPage /></Suspense>,
      },
      {
        path: 'tenants',
        element: <Suspense fallback={<PageLoader />}><TenantsListPage /></Suspense>,
      },
      {
        path: 'inventory',
        element: <Suspense fallback={<PageLoader />}><ProductsListPage /></Suspense>,
      },
      {
        path: 'procurement',
        element: <Suspense fallback={<PageLoader />}><OrdersListPage /></Suspense>,
      },
      {
        path: 'finance',
        element: <Suspense fallback={<PageLoader />}><InvoicesListPage /></Suspense>,
      },
      {
        path: 'hr',
        element: <Suspense fallback={<PageLoader />}><EmployeesListPage /></Suspense>,
      },
      {
        path: 'documents',
        element: <Suspense fallback={<PageLoader />}><DocumentsListPage /></Suspense>,
      },
      {
        path: 'reports',
        element: <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>,
      },
      {
        path: 'reports/viewer/:reportId',
        element: <Suspense fallback={<PageLoader />}><ReportViewer /></Suspense>,
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
        path: 'education/admissions',
        element: <Suspense fallback={<PageLoader />}><AdmissionsPage /></Suspense>,
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
      
      // Finance Module
      {
        path: 'finance/accounts',
        element: <Suspense fallback={<PageLoader />}><FinanceAccountsPage /></Suspense>,
      },
      {
        path: 'finance/payments',
        element: <Suspense fallback={<PageLoader />}><FinancePaymentsPage /></Suspense>,
      },
      {
        path: 'finance/reports',
        element: <Suspense fallback={<PageLoader />}><FinanceReportsPage /></Suspense>,
      },
      
      // CRM Module
      {
        path: 'crm/leads',
        element: <Suspense fallback={<PageLoader />}><CRMPage /></Suspense>,
      },
      {
        path: 'crm/opportunities',
        element: <Suspense fallback={<PageLoader />}><CRMOpportunitiesPage /></Suspense>,
      },
      {
        path: 'crm/customers',
        element: <Suspense fallback={<PageLoader />}><CRMCustomersPage /></Suspense>,
      },
      
      // Commerce Module
      {
        path: 'commerce/products',
        element: <Suspense fallback={<PageLoader />}><CommerceProductsPage /></Suspense>,
      },
      {
        path: 'commerce/orders',
        element: <Suspense fallback={<PageLoader />}><CommerceOrdersPage /></Suspense>,
      },
      {
        path: 'commerce/cart',
        element: <Suspense fallback={<PageLoader />}><CommerceCartPage /></Suspense>,
      },
      
      // AI Module
      {
        path: 'ai/predictive-analytics',
        element: <Suspense fallback={<PageLoader />}><AIPredictiveAnalyticsPage /></Suspense>,
      },
      {
        path: 'ai/recommendations',
        element: <Suspense fallback={<PageLoader />}><AIRecommendationsPage /></Suspense>,
      },
      {
        path: 'ai/anomaly-detection',
        element: <Suspense fallback={<PageLoader />}><AIAnomalyDetectionPage /></Suspense>,
      },
      {
        path: 'ai/chatbot',
        element: <Suspense fallback={<PageLoader />}><AIChatbotPage /></Suspense>,
      },
      {
        path: 'ai/document-intelligence',
        element: <Suspense fallback={<PageLoader />}><AIDocumentIntelligencePage /></Suspense>,
      },
      
      // SCM Module
      {
        path: 'scm/inventory',
        element: <Suspense fallback={<PageLoader />}><SCMInventoryPage /></Suspense>,
      },
      {
        path: 'scm/warehouse',
        element: <Suspense fallback={<PageLoader />}><SCMWarehousePage /></Suspense>,
      },
      {
        path: 'scm/procurement',
        element: <Suspense fallback={<PageLoader />}><SCMProcurementPage /></Suspense>,
      },
      {
        path: 'scm/suppliers',
        element: <Suspense fallback={<PageLoader />}><SCMSuppliersPage /></Suspense>,
      },
      
      // Business Module
      {
        path: 'business/contracts',
        element: <Suspense fallback={<PageLoader />}><BusinessContractsPage /></Suspense>,
      },
      {
        path: 'business/budget',
        element: <Suspense fallback={<PageLoader />}><BusinessBudgetPage /></Suspense>,
      },
      {
        path: 'business/risk',
        element: <Suspense fallback={<PageLoader />}><BusinessRiskPage /></Suspense>,
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