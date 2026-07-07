# ERP V2 Project Overview

## Summary
ERP V2 is a school and campus ERP platform built to manage the full student lifecycle across admissions, academics, attendance, exams, finance, communication, analytics, and role-based portals. The repository combines a Django backend, a React + TypeScript frontend, and supporting AI/ML utilities for auditing, automation, and predictive workflows.

## Stack
- Backend: Django, Django REST Framework, JWT auth, Celery, Redis, SQLite or PostgreSQL
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query
- AI/ML support: audit, chatbot, attendance, academics, predictions, setup, training utilities
- API documentation: versioned OpenAPI and Swagger/Redoc endpoints

## Product Capabilities
### Core platform
- Multi-tenant school administration
- Role-based access control for admins, teachers, parents, students, and finance users
- Authentication, password reset, and protected frontend routing
- Audit and monitoring utilities
- Media storage and document generation support

### Education management
- Student registration and profile management
- Teacher and staff management
- Academic years, classes, sections, courses, and curriculum setup
- Attendance capture, summaries, alerts, and analytics
- Exams, schedules, result entry, marksheets, and reporting
- Billing, fee structures, invoices, payments, reminders, and receipts
- Admissions and applicant workflows
- Timetable management with editor, period, weekday, room, class, and teacher views
- Behaviour, skills, and learning progress tracking
- Homework, assignments, and curriculum resource management
- Portals for students, teachers, and parents

### Communication and automation
- Notification system with realtime support
- WhatsApp-driven messaging workflows
- Auto-triggered alerts for attendance and finance events
- Templates for recurring communication
- Background jobs for notifications, analytics, and finance automation

### Analytics and AI readiness
- Operational analytics dashboards
- Risk and performance tracking utilities
- AI/ML preparation scripts for data audits and infrastructure checks
- Chatbot and prediction modules in the ai-ml workspace

## Major Backend Areas
- `erp_core`: Django project settings, routing, auth, Celery, ASGI/WSGI, signals, and shared services
- `api`: versioned REST API surface and schema docs
- `auth_api`: auth endpoints and login/password workflows
- `services/core`: tenants, features, audit, backup, storage, search, monitoring, and shared utilities
- `services/education`: students, academics, attendance, exams, finance, admissions, communication, timetable, and related APIs
- `services/analytics`: analytics engine, models, AI endpoints, and event handlers
- `services/rbac_models`: role and permission structures
- `services/pdf`: PDF generation helpers

## Major Frontend Areas
- `src/routes`: application routing and route guards
- `src/pages`: dashboard, analytics, settings, auth, and education feature pages
- `src/components`: reusable UI, layout, auth, notifications, AI, calendar, and domain-specific components
- `src/services`: API clients and feature services
- `src/store`: application state stores
- `src/hooks`: shared hooks for auth, APIs, notifications, websockets, storage, and debouncing
- `src/lib`: schemas, query keys, API helpers, export helpers, and utility code

## API Surface
- Versioned API support through `/api/v1/` and `/api/v2/`
- Current API documentation under `/api/v2/schema/`, `/api/v2/docs/`, and `/api/v2/redoc/`
- Legacy support remains available through v1 endpoints

## Feature List

### Authentication & Access
- **Multi-method Auth:** JWT-based API authentication, login with `user_id` (UUID or email), password reset endpoints, and admin password reset with `ADMIN_PASSWORD_RESET_KEY`.
- **Role-Based Access Control:** Role and permission engine with roles for `admin`, `school_admin`, `teacher`, `parent`, `student`, `accountant`, and custom tenant roles.
- **Protected Routes & Quick Login:** Frontend protected routes and development quick-login seeders for testing.

### Multi-Tenancy & Tenant Management
- **Tenant Isolation:** Tenant-aware models, middleware, and scoping utilities under `services/core/tenants`.
- **Tenant Media Namespacing:** Per-tenant media folders and S3-compatible storage support.

### Student & People Management
- **Student Profiles:** Full 360° student profile (contact, enrollment, current class/section, emergency contacts, profile photos).
- **Staff Management:** Teacher and staff CRUD, staff logins, ID card generation, and role assignments.
- **Import/Export:** CSV/Excel import and export utilities for bulk student/staff data.

### Admissions & Applicant Workflow
- **Application Intake:** Applicant records, document uploads, application statuses, and conversion-to-student action.
- **Admission Letters & Communication:** Generate admission letters and automated applicant notifications.

### Academics & Curriculum
- **Academic Years & Programs:** Program, course, and academic year management.
- **Curriculum Management:** Syllabi, versioning, topic breakdowns, resources, competencies, and course-competencies.
- **Course Offerings & Allocation:** Subject allocation, class/section linkage, and curriculum mapping.

### Timetabling & Scheduling
- **Timetable Editor:** Period, weekday, room, and class timetable editor with class and teacher views.
- **Room Booking & Conflict Detection:** Room bookings, conflict detection, and scheduling dashboards.

### Attendance
- **Marking & Sessions:** Mark attendance (grid/calendar views), session management, and bulk actions.
- **Analytics & Alerts:** Attendance dashboards, low-attendance alerts, patterns detection, and automated triggers.
- **Detection & Face Support:** Attendance detection helpers and hooks for face-encoding integration (attendance face encoding migrations present).

### Exams & Assessment
- **Exam Scheduling:** Create exams, schedules, and registrations.
- **Result Entry & Processing:** Marks entry grids, auto-calculation of percentage/grade, pass/fail flags, and result publishing.
- **Marksheet & Reports:** Marksheet generation, PDF exports, and reporting templates.
- **Malpractice Handling:** Exam malpractice reporting workflows.

### Finance & Billing
- **Fee Structures & Invoicing:** Define fee structures, recurring invoices, invoice generation, and receipt generation.
- **Payments & Gateways:** Payment records, multiple payment methods, transaction references, and online gateway plumbing.
- **Collections & Reminders:** Automated fee reminders, defaulter notices, overdue workflows, and reporting.

### Communication & Notifications
- **Message Center:** Compose and send messages via WhatsApp, SMS, email, and in-app channels.
- **Template Management & Variables:** Message templates with variable placeholders and preview/test capabilities.
- **Auto-Triggers:** Rule-based triggers for attendance, fee, exam, and birthday events.
- **Realtime Notifications:** WebSocket-based notifications and background delivery monitoring.

### Analytics, AI & ML
- **Dashboards & Reports:** Student/finance/attendance analytics dashboards and exportable charts.
- **Risk Scoring & Recommendations:** Student risk modeling, risk level and score calculation, and actionable recommendations.
- **AI/ML Workspace:** `ai-ml` scripts for data audits, infrastructure checks, training utilities, chatbot, lesson/quiz generators, and prediction models.

### Documents & PDF Generation
- **PDF Engine:** Server-side PDF generation for invoices, receipts, transcripts, and report cards.
- **Transcript Templates & Requests:** Transcript generation, template management, and verification flows.

### Integrations & Third-Party
- **WhatsApp Integration:** WhatsApp Business API service and Celery tasks for background delivery.
- **Firebase:** Frontend Firebase integration for optional services.
- **WebSockets/Channels:** ASGI consumers and frontend WebSocket wiring for realtime features.
- **Analytics & APM:** Optional Sentry integration and monitoring hooks.

### Background Processing & Reliability
- **Celery Workers:** Background tasks for notifications, analytics, invoice generation, and scheduled jobs.
- **Backup & Restore:** Tenant-aware backup and restore helpers and scripts.
- **Database Utilities:** Partitioning, archival, soft-delete helpers, and DB optimization scripts under `services/core/db`.

### Developer & DevOps Features
- **Versioned APIs:** `/api/v1/` (legacy) and `/api/v2/` (current) with OpenAPI/Swagger docs.
- **Seed & Data Tools:** Data generation, seeding, and test scripts for local development.
- **Docker & Deployment:** `Dockerfile`, `nginx.conf`, and Vite production setup for frontend.
- **TypeScript & Tests:** Type-safe frontend codebase with Vitest and backend tests with Django test suite examples.

### Security & Governance
- **Environment-driven Config:** All secrets via `.env` and removed hard-coded credentials.
- **Production Hardening:** `DEBUG=False` defaults for production, allowed hosts enforcement, and secure storage options.
- **Audit Trails:** Audit APIs, logging, and admin audit features present in core services.

### Testing & Quality
- **Automated Tests:** Frontend unit/integration tests under `src/test` and backend test suites and integration tests.
- **Linting & Formatting:** ESLint, Prettier, TypeScript checks, and formatting scripts for consistent code style.

### Miscellaneous Utilities
- **PDF/Report Templates:** Ready templates for invoices, receipts, and academic reports.
- **Export Helpers:** CSV/Excel export utilities and data export helpers in frontend and backend.
- **Admin Tools:** Django admin customizations, bulk actions, and management commands for maintenance.

- ## Notable Project Files

- [backend README](../backend/README.md)
- [frontend README](../frontend/README.md)
- [backend v1 API docs](../backend/api/docs/v1/README.md)
- [backend v2 API docs](../backend/api/docs/v2/README.md)
- [AI/ML README](../ai-ml/README.md)

## Notes
This document is intentionally broad so it can act as the project reference for onboarding, architecture review, and handoff work. The structure files provide the deeper folder maps for each side of the stack.
