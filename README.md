# ERP-V2 — School & Institute Management System

A full-stack, multi-tenant school/ERP management platform with a **React + TypeScript (Vite/Tailwind)** frontend and a **Django REST (Python)** backend featuring role-based portals, real-time WebSockets, finance & payroll, and AI/ML-powered analytics.

## Features

- **Role-based portals** — Admin, Teacher/Employee, Student, and Parent dashboards with RBAC-scoped navigation and route guards.
- **Academics** — classes, sections, subjects, curriculum (syllabus → topic → sub-topic), timetable & period scheduling, homework, class tests.
- **Students & Teachers** — full lifecycle management: admission, profiles, history timelines, promotions, ID cards, letters, login management.
- **Exams & Results** — exam hub, marks entry, result cards, mark-sheets, grade scales, report cards, admit cards.
- **Attendance** — student & staff attendance with bulk entry, reports, and facial-recognition embeddings.
- **Finance & Payroll** — fee structure, invoices, installments, discounts, late fees, payment gateways (JazzCash/Easypaisa), salary generation and slips.
- **Communication** — in-app chat, SMS/WhatsApp broadcast (Meta Graph API), notifications, announcements.
- **Analytics & AI** — executive dashboard with real-time KPIs, risk scoring, performance prediction, anomaly detection, and a voice-enabled AI assistant.
- **Real-time** — WebSocket KPI/attendance/notification broadcasts.
- **Multi-tenancy** — tenant resolution via header/subdomain/session with per-tenant data scoping.

See [docs/README.md](docs/README.md) for the full feature breakdown.

## Tech Stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router v6, Recharts, Framer Motion, Sonner |
| Backend    | Django 5, Django REST Framework, SimpleJWT, PostgreSQL, Celery, Redis, Django Channels, drf-spectacular, ReportLab |
| AI/ML      | External Python pipeline (`ai-ml/`) — Random Forest predictor, Isolation-Forest anomaly detection, facial embeddings |
| Infra      | Docker, GitHub Actions CI/CD, S3/R2 object storage, Sentry, Prometheus |

## Repository Structure

```
├── backend/                 # Django REST API
│   ├── api/                 # Versioned API endpoints (/api/v1, /api/v2)
│   ├── erp_core/            # Core project (settings, URLs, ASGI, consumers)
│   ├── services/            # Domain apps: accounts, education, finance, analytics, pdf, core
│   └── tests/
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── components/      # Shared UI + dashboard widgets
│       ├── pages/           # Feature pages grouped by module/role
│       ├── services/        # API clients
│       └── store/           # Zustand stores
├── ai-ml/                   # ML training, infra verification & data audit
├── docs/                    # Feature documentation
├── scripts/                 # Backup/restore & ops scripts
└── .github/workflows/       # CI/CD, security & backup pipelines
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL (or SQLite for quick local dev)
- Redis (optional for dev — required for Celery/WebSockets in production)

### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate  |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

On Windows you can also run `setup.bat` for a scripted fresh install (venv, deps, migrations, superuser, sample data).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Configuration

Copy the example env files and fill in your values:

- Backend: `.env.example` → `.env` (database, Redis/Celery, email, S3, WhatsApp, payment gateways, JWT, feature flags)
- Frontend: `frontend/.env.example` → `frontend/.env.local` (API/WS URLs, Firebase, app settings)

**Never commit real secrets** — keep production credentials out of the repository.

### API Docs

Versioned OpenAPI docs are auto-generated with drf-spectacular:

- `/api/v1/schema/swagger-ui/`
- `/api/v1/schema/redoc/`

## Testing

```bash
# Backend (pytest + coverage)
cd backend
pytest tests/ --cov=services --cov=auth_api

# Frontend (Vitest)
cd frontend
npm run test
npm run lint
```

## CI/CD

GitHub Actions runs backend/frontend tests, linting (flake8, ESLint), type checking (mypy), security audits (bandit, safety, npm audit), migration safety checks, and build artifacts on push/PR to `main`, `staging`, and `develop`.

## License

Proprietary — all rights reserved.
