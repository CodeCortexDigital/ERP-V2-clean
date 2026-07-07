# Project Verification Sequence

This document provides a sequenced, step-by-step verification plan to validate the ERP-V2 project end-to-end. Execute steps in order. If a step fails, fix the issue before proceeding to later steps.

1) Prepare dev environment and prerequisites
   - Confirm Python 3.10+ installed: `python --version`
   - Confirm Node.js 18+ and npm/yarn installed: `node --version`
   - Confirm `rg` (ripgrep) available or fallback to `grep` for fast repository scanning
   - Install backend requirements: `pip install -r backend/requirements.txt`
   - Install frontend dependencies: `cd frontend && npm install` or `pnpm install`
      - Ensure Docker (optional) and Docker Compose available when testing container builds

   Runbook: commands and expected quick checks for steps 1-8
      - Check Python: `python --version` -> `Python 3.10.x` or later
      - Check Node: `node --version` -> `v18.x` or later
      - Install backend deps: `pip install -r backend/requirements.txt`
         - Expected: installs without unresolved dependency errors
      - Install frontend deps: `cd frontend && npm ci` (or `pnpm i`)
         - Expected: `node_modules` created and package manager exit code 0
      - Start a quick Postgres for local dev (Docker):
         - `docker run --name erp-postgres -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres:15`
         - Expected: container runs and `pg_isready` responds
      - Start Redis quick (Docker): `docker run --name erp-redis -p 6379:6379 -d redis:7`
         - Expected: Redis is listening on 6379
      - Apply migrations: `cd backend && python manage.py migrate --noinput`
         - Expected: migration messages and no errors
      - Seed sample data (quick seed): `cd backend && python manage.py loaddata initial_seed.json` or run provided generator script
         - Expected: sample tenants, admin user, and test data present

2) Run static checks (lint/format)
   - Backend: `flake8 backend/` or project linter command
   - Frontend: `cd frontend && npm run lint` and `npm run type-check`
   - Fix issues or record as tech debt

3) Run backend unit & integration tests
   - Run `cd backend && pytest -q` (use configured pytest.ini)
   - Run critical integration tests targeting database and Celery tasks
   - Expected: all tests pass or failing tests recorded with stack traces

4) Run frontend tests
   - `cd frontend && npm run test` (Vitest)
   - Run storybook or visual regression tests if available

5) Start core services (DB, Redis, Celery broker)
   - Start local DB (Postgres recommended) using Docker or local sqlite for smoke tests
   - Start Redis: `docker run -p 6379:6379 redis:7` or local service
   - Verify ports and accessibility

6) Apply database migrations
   - `cd backend && python manage.py migrate --noinput`
   - Confirm migration output and applied migration count

7) Seed sample data
   - Use provided generation scripts: `python manage.py loaddata` or `python backend/generate_data.py`
   - Alternatively run `backend/generate_data.py` utilities listed in backend/README.md

8) Start backend server (local)
   - Run development server: `cd backend && python manage.py runserver`
   - Confirm `/api/v2/health/` or `/api/v2/docs/` responds

9) Start frontend dev server
   - `cd frontend && npm run dev` (Vite)
   - Open app in browser and confirm login page loads

10) Verify authentication & sessions
   - Test login for admin, teacher, parent, student using seeded accounts
   - Check JWT token issuance and expiry, refresh token behavior
   - Confirm password reset flow via `/auth/password-reset/`

11) Verify RBAC and permissions
   - For each role, confirm access to protected routes and APIs
   - Attempt unauthorized access and confirm proper 403/401 responses

12) Verify tenant isolation and media
   - Create two tenants and upload media; ensure media path isolation
   - Confirm tenant-scoped queries return only tenant-specific records

13) Verify Student CRUD & profile features
   - Create, read, update, delete student
   - Upload photo, assign to class/section, check profile completeness

14) Verify Staff/Teacher management & ID generation
   - Create teacher, assign subjects, generate staff ID/paperwork

15) Verify Admissions workflow
   - Create applicant, change status, convert to student and verify records

16) Verify Academics & curriculum flows
   - Create course, syllabus, assign competencies and verify mapping to classes

17) Verify Timetable & scheduling functions
   - Create class timetable, add periods, conflict detection when assigning same room/teacher

18) Verify Attendance marking and analytics
   - Mark attendance via UI and API, test bulk actions and session date ranges
   - Test analytics dashboards and low-attendance alert triggers

19) Verify Exams scheduling, entry, and publishing
   - Create exam, register students, perform marks entry, publish results and download marksheet PDFs

20) Verify Finance: invoices, payments, reminders
   - Generate invoices, simulate payments, check ledger entries, run reminder tasks

21) Verify Communication: templates, WhatsApp, email
   - Create message templates, send test messages through WhatsApp task (stubbed) and email

22) Verify realtime notifications & WebSockets
   - Trigger an event that sends a websocket notification and observe frontend update

23) Verify PDF generation & exports
   - Generate invoice/receipt/transcript PDFs and confirm file integrity

24) Verify background tasks (Celery) and scheduled jobs
   - Start Celery worker: `celery -A erp_core worker -l info`
   - Run periodic tasks via beat or `django_celery_beat` and verify tasks run

25) Verify AI/ML scripts and data audits
   - Run `python ai-ml/attendance/anomaly_detector.py` and `python ai-ml/academics/lesson_generator.py` in dry-run

26) Verify backups, restore and tenant restore scripts
   - Run `scripts/backup_db.sh` (or Windows equivalent) and `scripts/restore_db.sh` in test env

27) Verify monitoring, logging and Sentry integration
   - Confirm logging outputs and Sentry events (send a test exception)

28) Verify security & env/configuration hygiene
   - Confirm absence of hard-coded secrets, run `truffleHog` or secret-scan tools if available

29) Verify Docker build and deployment artifacts
   - `docker build -t erp-frontend ./frontend` and `docker build -t erp-backend ./backend`

30) Run final end-to-end smoke test
   - From the UI, complete a core flow: login -> create student -> assign to class -> generate invoice -> mark attendance -> send notification

Appendix: Failure Handling
 - If a step fails, capture logs, reproduce on a fresh environment, and open an issue with: step number, failing command, error logs, and any stack trace.
 - Have a recovery checklist: revert recent changes, re-run migrations in a test DB, re-seed sample data, re-run the failing step.
