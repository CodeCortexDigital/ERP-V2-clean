# ERP-V2 — Feature Documentation

A full-stack school/ERP management system: a **React + TypeScript (Vite/Tailwind)** frontend and a **Django REST (Python)** multi-tenant backend.

- **Frontend:** `frontend/` — role-based portals (Admin, Teacher/Employee, Student, Parent) with voice-enabled AI assistant.
- **Backend:** `backend/` — versioned REST API (`/api/v1`, `/api/v2`), WebSockets, Celery, analytics/AI.

---

## Frontend Features

### 1. Authentication & Authorization
- Role-based login (Admin / Employee→Teacher / Student) with local fallback — `src/pages/auth/LoginPage.tsx`
- Forgot / reset password — `src/pages/auth/ForgotPasswordPage.tsx`
- Protected & role-based route guards — `src/components/ProtectedRoute.tsx`, `src/components/auth/RoleBasedRoute.tsx`
- Auth store/context (session, token, role) — `src/store/authStore.ts`, `src/hooks/useAuth.ts`
- Google OAuth scaffold (provider mounted in `src/main.tsx`)
- Logout via Sidebar/Header

### 2. Admin Dashboard
- Extracted reusable widget components (StatCard, RevenueChart, ClassBarChart, AbsentStudentsList, PresentEmployeesList, NewAdmissions, FeeDonut, MetricsPills, SmartInsights, DynamicCalendar, etc.) — `src/components/dashboard/*`
- Single `executive-dashboard` API endpoint (primary) with 6-individual-API fallback — `src/services/analytics.service.ts`
- Per-widget error boundaries (`WidgetErrorBoundary`) prevent one broken widget from crashing the entire page
- 60-second auto-polling fallback when WebSocket is unavailable
- Live Data badge only appears when WebSocket is confirmed connected

### 3. Student Management
- Directory with search/filters, add/edit, full profile, history timeline, families, active/inactive toggle — `src/pages/education/students/*`
- Admission letter generator, bulk student ID cards, printable list, login management, grade promotion — `src/pages/education/students/*`

### 4. Employee / Teacher Management
- Teacher/employee list, add/edit, profile, history, job/offer letter, staff ID cards, staff login management — `src/pages/education/teachers/*`

### 5. Exams & Results
- Exams hub (create / marks entry / result card tabs) — `src/pages/education/ExamsPage.tsx`
- Exams list, dashboard, schedules, registrations, exam types, analytics, result processing — `src/pages/education/exams/*`
- Marks entry, per-exam results, mark-sheet generation, date sheet, blank award list — `src/pages/education/exams/*`
- Class tests management — `src/pages/education/ClassTestsPage.tsx`

### 6. Attendance (Student & Staff)
- Student attendance, staff attendance, and reports (class-wise / student / staff) via tabs — `src/pages/education/attendance/AttendancePage.tsx`

### 7. Academics (Classes, Subjects, Curriculum)
- Academics overview, all classes (add/edit), subjects list, assign subjects — `src/pages/education/academics/*`, `src/pages/education/subjects/*`
- Curriculum: syllabus, topic breakdown, resources — `src/pages/education/curriculum/*`

### 8. Timetable, Scheduling & Leave
- Timetable create/edit/view, period & weekday management, classrooms — `src/pages/education/timetable/*`
- Class & teacher timetable generation, staff leave (admin) and teacher leave apply — `src/pages/education/timetable/*`

### 9. Homework / Assignments (LMS-lite)
- Daily homework management — `src/pages/education/assignments/HomeworkManagementPage.tsx`

### 10. Progress Tracking
- Progress overview, lesson planner, syllabus coverage dashboard, student progress — `src/pages/education/progress/*`

### 11. Admissions
- Admissions overview, new application form — `src/pages/education/AdmissionsPage.tsx`, `src/pages/education/admissions/*`

### 12. Behaviour & Skills (Affective / Psychomotor)
- Rate behaviours, rate skills, observations, affective & psychomotor domain report — `src/pages/education/behaviour/*`
- Affective domain report includes an AI-generated summary

### 13. Fees / Billing / Finance
- Finance hub, chart of accounts, income/expense, account statement, fee invoices, collect fees, paid slip, defaulters, fees report — `src/pages/education/finance/*`

### 14. HR / Payroll / Salary
- Generate salary, pay salary, salary paid slip, salary sheet, salary report — `src/pages/education/finance/*`

### 15. Communication
- Messaging hub (SMS/WhatsApp broadcast + in-app student↔teacher/principal/finance chat) — `src/pages/education/CommunicationPage.tsx`
- Notification system (service/hook + bell component) — `src/services/notification.service.ts`

### 16. Analytics & Reporting
- Reports engine: report cards, student/parent info, monthly attendance, fee collection, progress, accounts, customised (CSV export) — `src/pages/education/AnalyticsPage.tsx`

### 17. Certificates
- Certificate generation with multiple templates (Bonafide, Study, Promotion, Completion, Graduation, Merit…) + template management — `src/pages/education/CertificatesPage.tsx`

### 18. Live Class
- Live class scheduling/management + live room (camera/mic, join with code) — `src/pages/education/LiveClassPage.tsx`, `src/pages/education/LiveRoomPage.tsx`

### 19. Role Portals (Dashboards)
- Parent portal — `src/pages/portals/parent/ParentDashboard.tsx`
- Teacher/Employee portal — `src/pages/portals/teacher/TeacherDashboard.tsx`
- Student portal — `src/pages/portals/student/StudentDashboard.tsx`

### 20. Settings
- Overview, institute profile, fee particulars/structure, discount type, fee challan details, rules & regulations, marks grading, theme & language, account settings — `src/pages/settings/*`

### 21. AI / ML Features
- AI Chatbot assistant ("CodeCortex") — floating chat bubble with 4 role modes (admin/teacher/student/parent), role-scoped DB tools, voice input (Web Speech API STT), voice output (SpeechSynthesis TTS) — `src/components/AiAssistant.tsx`
- AI affective-domain report summary — `src/pages/education/behaviour/AffectiveDomainReportPage.tsx`
- AI quiz generator modal — `src/components/exams/QuizGeneratorModal.tsx`
- AI personalized learning paths — `src/pages/education/personalized-learning/PersonalizedLearning.tsx`

### 22. Shared UI Infrastructure
- Reusable primitives: Button, Card, Modal, Table/DataTable, Tabs, Input, Select, Checkbox, Switch, Badge, Spinner, Progress, Pagination, Breadcrumb, SearchFilter, Charts (Recharts), Toast, Label — `src/components/ui/*`

> Note: A set of "extra" module pages (alumni, library, transportation, scholarships, transcripts, billing, LMS, etc.) exist in source but are not wired into `App.tsx` navigation, so they are not reachable in the running app.

---

## Backend Features

### 1. Authentication & Authorization
- JWT login/logout/refresh (SimpleJWT) — `services/core/accounts/`
- Firebase / Google OAuth login + account linking — `services/core/accounts/firebase_views.py`
- Custom email-based User model (verification, 2FA, lockout, social linking, GDPR, delegated permissions) — `services/core/accounts/models.py`
- RBAC roles + permission/role-based data scoping engine — `services/rbac_models/`, `services/core/accounts/decorators.py`
- Feature-flag route gating (payments, whatsapp, ai, realtime) — `services/core/features/`
- Per-request audit middleware — `services/core/audit/`

### 2. Student Management
- Rich Student model (guardian/family/address, soft-delete, tenant scoping) — `services/education/students/`
- Auto-provision student + parent accounts on save — `services/core/accounts/signals.py`
- Student 360 view, history timeline, activity tracking — `services/education/students/views.py`

### 3. Teacher / Employee (HR)
- Teacher model + TeacherProfile (salary, department, shift, qualifications) — `services/education/academics/`, `services/core/accounts/`
- Leave management + balance + auto-substitution of timetable periods — `services/education/academics/substitution.py`
- Teacher attendance (present/on-leave/absent) with bulk entry + auto backfill

### 4. Attendance (Student & Teacher)
- Student attendance (present/absent/late/excused/holiday) + facial-recognition embeddings — `services/education/attendance/`
- Bulk marking, stats, dashboard aggregates
- Signals: parent absence notification, WhatsApp trigger, `attendance_marked` event, live WebSocket broadcast

### 5. Exams, Results, Marks, Grading
- Exam, ExamResult (auto percentage + grade + pass/fail), Quiz, ExamSchedule, ExamRegistration — `services/education/exams/`
- Bulk result entry, exam summary, admit-card endpoint
- Grade scales, assessment types, assessment weightage — `services/education/academics/`

### 6. Academics (Classes, Subjects, Curriculum, Timetable)
- AcademicYear, SchoolClass, Section, Subject, ClassSubject — `services/education/academics/`
- Curriculum: Syllabus → Unit → Topic → SubTopic + LearningResource
- Coverage/progress: LessonPlan, TopicCoverage, StudentTopicProgress
- Scheduling: Period, Classroom, TimetableEntry, TeacherAvailability, TeacherSubjectAssignment
- Homework model; timetable generation/validation commands

### 7. Finance / Fees / Billing
- FeeStructure, Invoice (carry-forward, discounts, late fees, installments, soft-delete), Payment, InstallmentPlan, Scholarship, LateFeeRule, TransactionLog, FinanceSettings — `services/education/finance/`
- Payment gateways (JazzCash/Easypaisa) config + PaymentTransaction
- Invoices & fee-receipt PDF; scheduled commands (monthly invoices, late fees, reminders)
- Finance audit + parent notification signals

### 8. Payroll / Salary
- Teacher monthly salary stored on HR model — `services/education/academics/models.py`
- (Note: no dedicated payroll disbursement module; salary is an attribute only)

### 9. Behaviour Tracking
- TeacherFeedback (behaviour/concern types, private flag) — `services/education/academics/`

### 10. Analytics & Reporting
- InsightsEngine (risk score, recommendations, performance prediction) — `services/analytics/engine.py`
- AI risk store: StudentRisk, AcademicPrediction, Recommendation — `services/analytics/`
- Endpoints: student_insights, batch_risk_assessment, executive_dashboard
- Attendance analytics / ML pattern detection / alerts — `services/education/attendance/analytics_models.py`
- Dashboard aggregate endpoints (attendance/fee trends, at-risk, growth, teacher performance)

### 11. Notifications / Communication
- In-app Notification (attendance/finance/exam/admission/announcement/system) — `services/core/user_notifications/`
- WhatsApp (Meta Graph API): service, webhooks, templates, per-tenant config, Celery send
- Messaging models (Message, Notification, MessageTemplate, AutoTrigger) + announcement fan-out
- Event-driven dispatcher → Celery

### 12. PDF Generation
- ReportLab PDFGenerator: fee receipt + result card — `services/pdf/pdf_generator.py`

### 13. WebSocket / Real-time
- NotificationConsumer (per-user push), Dashboard/Analytics consumers (KPI/chart/alert pushes) — `erp_core/consumers.py`
- JWT auth for WebSocket + ASGI routing; live attendance broadcast

### 14. AI / ML
- Heuristic InsightsEngine risk/recommendation/prediction
- External ML pipeline (Random Forest performance predictor, Isolation-Forest attendance anomaly detector) invoked by `batch_risk_assessment`
- Facial-embedding attendance; template-driven WhatsApp automation; JWT Google/Firebase login

### 15. Multi-Tenancy
- School tenant model + TenantMembership (role + rbac_role) — `services/core/tenants/`
- TenantMiddleware resolution (header/subdomain/session) + per-tenant data scoping (`SchoolAliasMixin`)

### 16. API Versioning (v1 / v2)
- `/api/v1`, `/api/v2`, legacy `/api` → v1 — `erp_core/urls.py`
- Versioning middleware with deprecation headers (v1 sunset 2026-11-16)
- Version-aware serializers + per-version OpenAPI/Swagger/Redoc (drf-spectacular)

### 17. Management Commands / Data Seeding
- Accounts/students/teachers/classes/attendance/exams seeding
- Finance: `generate_monthly_invoices`, `apply_late_fees`, `send_fee_reminders`
- Core: backup/restore, archive, db partitioning, cleanup, monitoring

### 18. Cross-cutting / Infrastructure
- Audit logging (AuditLog + middleware + signals)
- Backup & Disaster Recovery (PITR, S3/WAL/Slack)
- DB archival & partitioning (nightly Celery beat)
- Object storage (S3/R2, signed URLs, AV scan)
- Soft-delete mixin, global search (pg_trgm), event dispatcher → Celery
- Redis caching layer (per-type TTLs), slow-query monitoring, health checks

---

## Layout & Navigation
- **Header** (`src/components/layout/Header.tsx`): Theme-aware, fullscreen toggle, sidebar collapse toggle, user avatar dropdown with logout, wired `NotificationBell` component.
- **Sidebar** (`src/components/layout/Sidebar.tsx`): Collapsible (w-64 / w-20) with persisted state via Zustand + localStorage. Items ordered by frequency of use. Flyout sub-menus on hover when collapsed. Role-based filtering (admin sees all, other roles filtered by RBAC permissions). Dark/light theme support with configurable active colors.
- **Breadcrumb** navigation auto-generated from route hierarchy.

## Architecture Summary
- **Frontend:** React 18 + TypeScript + Vite 5, Tailwind CSS, TanStack Query, Zustand, React Router v6, Recharts, Framer Motion, lucide-react, Sonner.
- **Backend:** Django + DRF, SimpleJWT, PostgreSQL (multi-tenant), Celery + Redis, Channels (WebSockets), drf-spectacular, ReportLab, external `ai-ml` Python models.
- **Real-time:** WebSocket KPI/attendance/notification broadcasts consumed by the admin dashboard.
