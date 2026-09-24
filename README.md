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
- **Analytics & AI** — executive dashboard with real-time KPIs, an AI assistant that answers questions from live school data (streaming, chat history, English/Urdu voice), AI lesson plans and quizzes, and ML risk scoring / anomaly detection. See [AI Features](#ai-features).
- **Real-time** — WebSocket KPI/attendance/notification broadcasts.
- **Multi-tenancy** — tenant resolution via header/subdomain/session with per-tenant data scoping.

See [docs/README.md](docs/README.md) for the full feature breakdown.

## Tech Stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router v6, Recharts, Framer Motion, Sonner |
| Backend    | Django 5, Django REST Framework, SimpleJWT, PostgreSQL, Celery, Redis, Django Channels, drf-spectacular, ReportLab |
| AI/ML      | OpenAI or Anthropic Claude via a provider-agnostic client (`backend/services/ai/llm/`); optional ML pipeline (`ai-ml/`) — Random Forest predictor, Isolation-Forest anomaly detection, facial embeddings |
| Infra      | Docker, GitHub Actions CI/CD, S3/R2 object storage, Sentry, Prometheus |

## Repository Structure

```
├── backend/                 # Django REST API
│   ├── api/                 # Versioned API endpoints (/api/v1, /api/v2)
│   ├── erp_core/            # Core project (settings, URLs, ASGI, consumers)
│   ├── services/            # Domain apps: accounts, education, finance, analytics, ai, pdf, core
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

## AI Features

All AI endpoints live under `/api/v1/ai/` and require a logged-in user. The user's role (admin, accountant, teacher, student, parent) and school are worked out on the server from their login, so the browser can't claim a different role.

### AI assistant (chat)

The floating **CodeCortex** assistant is available in every portal.

- **Answers from live school data.** The AI looks things up with read-only tools: student search and profiles, class strength, attendance, fee defaulters, finance summary, exams, homework, behaviour, certificates, payroll, timetable and notifications. It can use several tools in a row to answer one question.
- **Role and school limits.** Every lookup is checked centrally:
  - Admins see their whole school.
  - Accountants see finance and student lookups.
  - Teachers see only their own classes, and no fee data.
  - Students and parents see only their own (or their children's) records.
  - Data from other schools is never returned.
- **Privacy.** Phone numbers, emails, CNIC and addresses are masked before any data is sent to the AI provider (turn this off with `AI_SHARE_CONTACT_INFO=true`). Every lookup the AI makes is recorded in the audit log.
- **Chat experience.** Answers stream in as they're written, with a status such as "Checking attendance…" while the AI looks things up. Also: a stop button, saved chat history (open, continue, delete), copy, 👍/👎 feedback, tables in answers, and voice input/output in English or Urdu.
- **Basic mode.** If no AI provider is configured, or the provider is down, the assistant answers common questions ("fee defaulters", "my attendance", …) with simple keyword matching, under the same role limits.

### Lesson plans and quizzes (teachers and admins)

- **Lesson plans** (Lesson Planner page): the AI drafts objectives, materials, an introduction, timed activities, group work, support for weaker and stronger students, check-for-understanding questions and homework. The teacher reviews and edits the fields before saving.
- **Quizzes** (`POST /api/v1/ai/generate-quiz/`): the AI writes MCQ, true/false and short-answer questions with explanations, at the chosen difficulty. Questions with a broken answer key are dropped automatically. Quizzes are saved as drafts and published to a specific class with `publish-quiz`; teachers can only publish to their own classes. There is no quiz screen in the app yet, so this is API-only for now.

Both need an AI provider key. Without one they return a clear "not configured" error.

### Analytics (ML)

- **Risk scan** (admins): scores each student's dropout and fee-default risk. Results appear as "At-Risk Students" on the Analytics page.
- **Attendance anomalies** and **face-recognition attendance** (teachers and admins).

These need the packages in `ai-ml/requirements.txt` (scikit-learn, XGBoost, pandas, DeepFace). If they aren't installed on the server, the endpoints return **503 "not available"** instead of producing fake results.

### Usage limits and cost control

- Each user can send `AI_RATE_LIMIT` requests every `AI_RATE_WINDOW` seconds (default: 30 per 10 minutes).
- Each school has an optional monthly token cap (`AI_TENANT_MONTHLY_TOKENS`; 0 = unlimited).
- Token usage is stored per user, per feature and per day (`AIUsage`), and per message (`AIMessage`).
- AI features can be switched off per school with a feature flag (`ai_chat`, `ai_lesson_plans`, `ai_quiz`). With no flag set, a feature is on.

### Configuration

Set these in `.env` (or in the Render dashboard):

| Variable | Default | Purpose |
|----------|---------|---------|
| `AI_PROVIDER` | *(empty)* | `openai` or `anthropic`. Empty = whichever key is set (OpenAI first). |
| `OPENAI_API_KEY` | — | Enables OpenAI. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model. |
| `ANTHROPIC_API_KEY` | — | Enables Claude (default model `claude-opus-5`). |
| `AI_MODEL_FAST` / `AI_MODEL_SMART` | provider default | Override the chat model (fast) and the lesson/quiz model (smart). |
| `AI_CLAUDE_EFFORT` | `medium` | Claude effort level (`low` … `max`). |
| `AI_SHARE_CONTACT_INFO` | `false` | Send phone/email/CNIC/address to the AI provider. |
| `AI_RATE_LIMIT` / `AI_RATE_WINDOW` | `30` / `600` | Per-user request limit and window (seconds). |
| `AI_TENANT_MONTHLY_TOKENS` | `0` | Monthly token cap per school (0 = unlimited). |

### API endpoints

Paths are relative to `/api/v1`.

| Method | Path | Who | What |
|--------|------|-----|------|
| POST | `/ai/chat/` | all roles | Ask a question (`{"message", "conversation_id"?}`) and get a JSON answer |
| POST | `/ai/chat/stream/` | all roles | Same, as Server-Sent Events (`token`, `tool_start`, `tool_end`, `done`) |
| GET | `/ai/conversations/` | all roles | Your saved chats |
| GET / PATCH / DELETE | `/ai/conversations/<id>/` | owner | Open, rename or delete a chat |
| POST | `/ai/messages/<id>/feedback/` | owner | Rate an answer (`1`, `-1` or `null`) |
| POST | `/ai/lesson-plan/` | teacher, admin | Draft a lesson plan |
| POST | `/ai/generate-quiz/` | teacher, admin | Draft a quiz |
| POST | `/ai/publish-quiz/` | teacher, admin | Publish a quiz to a class |
| POST | `/ai/train-models/` | admin | Run the ML risk scan |
| GET | `/ai/student-predictions/` | all roles (scoped) | Risk scores you're allowed to see |
| GET | `/ai/attendance-anomalies/` | teacher, admin | Unresolved attendance alerts |
| POST | `/ai/face-register/`, `/ai/face-attendance/` | teacher, admin | Face recognition |

The code lives in `backend/services/ai/` (assistant, tools, AI providers, limits) and `backend/services/analytics/ai_views.py` (content generation and ML). The roadmap for further AI work is in [docs/AI_UPGRADE_TODO.md](docs/AI_UPGRADE_TODO.md).

## Deployment

The backend (Django + PostgreSQL + Redis + Celery + WebSockets) cannot run on static-only hosts. Use one of the prepared options:

### Recommended — Vercel (frontend) + Oracle Cloud Free ARM (backend)

Fully free, always-on, no expiry:

- **Frontend** → Vercel Hobby (static SPA, `frontend/vercel.json`)
- **Backend** → Oracle Cloud Always Free ARM VM running `docker compose up -d --build` (Django/daphne + PostgreSQL + Redis + Celery, all self-contained)

Step-by-step instructions: **[deploy/oracle-setup.md](deploy/oracle-setup.md)**

### Option A — Self-hosted with Docker (full stack, recommended)

```bash
cp .env.example .env   # set SECRET_KEY and DB_PASSWORD
docker compose up -d --build
```

Starts PostgreSQL, Redis, Django (daphne/ASGI), Celery worker + beat, and the Nginx-served frontend on port 80. Media and collected static files live in shared Docker volumes.

### Option B — Render blueprint

Import this repo into [Render](https://render.com) as a Blueprint (`render.yaml`). It provisions PostgreSQL, Redis, the Django web service and the frontend static site (Celery workers are not included on the free plan). After first deploy, set `VITE_API_URL` on the frontend to `https://<your-backend>.onrender.com/api`, and set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` on the backend to turn on the AI features.

### Option C — Vercel (frontend) + backend elsewhere

The SPA can be deployed to [Vercel](https://vercel.com) using the included `frontend/vercel.json`. Host the Django backend separately (Render/Railway/VPS) and set `VITE_API_URL` to its URL during the Vercel build.

> Production checklist: set a strong `SECRET_KEY`, restrict `ALLOWED_HOSTS` and CORS to your real domains, enable HTTPS, and set `USE_S3_STORAGE=true` for media once you have S3/R2 credentials.

## Testing

```bash
# Backend (pytest + coverage)
cd backend
pytest tests/ --cov=services --cov=auth_api

# AI features only (no API key needed — the AI provider is faked in tests)
pytest tests/test_ai_security.py tests/test_ai_platform.py tests/test_ai_generation.py

# Frontend (Vitest)
cd frontend
npm run test
npm run lint
```

## CI/CD

GitHub Actions runs backend/frontend tests, linting (flake8, ESLint), type checking (mypy), security audits (bandit, safety, npm audit), migration safety checks, and build artifacts on push/PR to `main`, `staging`, and `develop`.

## License

Proprietary — all rights reserved.
