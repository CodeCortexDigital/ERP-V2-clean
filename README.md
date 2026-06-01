# 🎓 ERP V2 - Complete School Management System

[![Django](https://img.shields.io/badge/Django-6.0.4-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.0-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🚀 Overview

**ERP V2** is a production-ready, multi-tenant school management platform built with Django REST Framework and React. It supports student management, academics, attendance, exams, finance, admissions, notifications, analytics, and automation.

## ✨ Key Features

- Multi-tenant student lifecycle management
- Attendance tracking, notifications, and low-attendance alerts
- Exam management, results publishing, and performance analytics
- Fee management, invoices, payments, and overdue workflows
- WhatsApp integration for parent communication
- AI-powered insights and risk scoring
- Role-based access control and JWT authentication
- Production-ready environment configuration and security hardening

## 🔒 Production Hardening & Security Improvements

This repository has been updated to remove insecure defaults and hard-coded credentials, and to support a secure production deployment.

Key security improvements:
- Environment-driven configuration for secrets and credentials
- All users now authenticate with `user_id`/UUID rather than email-based login
- `DEBUG=False` enforced in production
- `SECRET_KEY` must be provided through `.env`
- `ALLOWED_HOSTS` must list real deployment hostnames
- Removed frontend demo credentials and insecure alert patterns
- Replaced hard-coded audit/verification credentials in scripts with env variables
- Support for admin password reset via `ADMIN_PASSWORD_RESET_KEY` if the admin account is forgotten
- Frontend `.env.example` updated with production API/WebSocket endpoints and `VITE_APP_ENV=production`
- `backend/services/education/academics/.env.example` updated with production-ready placeholders
- CI gating tightened to ensure security and quality checks fail correctly

> Important: never commit `.env` files or real secrets. Use your deployment platform’s secret store for production credentials.

## 🛠️ Technology Stack

### Backend
- Django 6.x
- Django REST Framework
- Simple JWT
- PostgreSQL (production) / SQLite (development)
- Celery + Redis
- DRF API documentation

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide icons

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
git clone https://github.com/CodeCortexDigital/ERP-V2-clean.git
cd ERP-V2-clean/backend
python -m venv venv
# Windows:
venv\\Scripts\\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env with secure production values
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

## � API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | User login with `user_id` or email |
| POST | `/api/auth/reset-password/` | Reset password for admin or user |
| GET | `/api/auth/me/` | Get current user |
| GET | `/forgot-password` | Frontend admin password reset form |
### Admin password reset example
```bash
curl -X POST https://api.yourdomain.com/api/auth/reset-password/ \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<ADMIN_USER_ID>","new_password":"NewStrongPass123!","reset_key":"your-admin-password-reset-key"}'
```
## 🧑‍💼 Admin Login and User Creation

### Admin login
- Use the frontend login page at `/login`.
- The API accepts either `user_id` or `email` with the password payload:

```bash
curl -X POST https://api.yourdomain.com/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<ADMIN_USER_ID>","password":"<ADMIN_PASSWORD>"}'
```

- For the admin account, prefer `user_id`/UUID login to avoid exposing email as the primary credential.
- If the admin account is lost, use `/forgot-password` or the `/api/auth/reset-password/` endpoint with `ADMIN_PASSWORD_RESET_KEY`.

### Development sample accounts
For local development, seed default accounts so the quick-login buttons work:

```bash
cd backend
python manage.py seed_sample_users
# or to force-update passwords/status for all sample users:
python manage.py seed_sample_users --force
```

Sample accounts (default):
- Admin: `admin@code.com` / `Admin@123`
- Teacher: `teacher@code.com` / `Teacher@123`
- Parent: `parent@code.com` / `Parent@123`
- Student: `student@code.com` / `Student@123`

Notes and verification
- If you previously had an `admin@code.com` user with a different password, the original seeder skipped updating it; use `--force` to overwrite passwords and set accounts to `ACTIVE`.
- To verify backend accepts admin credentials locally, run this small script in the `backend` folder:

```bash
python test_login_client.py
```

- To test from the frontend, start the backend and frontend servers and use the quick-login buttons on the login page. If you run into a `400` from `/api/auth/login/`, confirm the request payload contains `{ "user_id": "<email-or-uuid>", "password": "<password>" }`.

- To reset the admin password from the API (requires `ADMIN_PASSWORD_RESET_KEY` env var):

```bash
curl -X POST http://localhost:8000/api/auth/reset-password/ \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"admin@code.com","new_password":"NewStrongPass123!","reset_key":"<ADMIN_PASSWORD_RESET_KEY>"}'
```

### Create users by role
- The most reliable way to create users and assign roles is via the Django admin interface.
- Admin users can also be created using Django management commands:

```bash
cd backend
python manage.py createsuperuser
```

- Role-based users should be assigned the appropriate backend role/group, for example:
  - `admin` / `super_admin`
  - `school_admin`
  - `teacher`
  - `parent`
  - `student`
  - `accountant`

- If you use API registration, ensure the created user is associated with the correct role or tenant role field in the backend.
- In production, make sure only trusted admin accounts get `admin`/`super_admin` access and tenant users receive their specific role permissions.
## �📁 Environment Configuration

The project now relies on `.env.example` templates for secure configuration. Populate these files before running the application:

- Root `.env.example`
- `frontend/.env.example`
- `backend/services/education/academics/.env.example`

### Core backend variables
- `DEBUG`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `REDIS_URL`, `CACHE_URL`, `CHANNEL_REDIS_URL`
- `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`
- `USE_S3_STORAGE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PASSWORD_RESET_KEY`
- `AUDIT_EMAIL`, `AUDIT_PASSWORD`, `VERIFY_EMAIL`, `VERIFY_PASSWORD`, `VERIFY_BASE_URL`

### Frontend variables
- `VITE_API_URL`
- `VITE_API_PREFIX`
- `VITE_WS_URL`
- `VITE_APP_ENV=production`
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_WEBSOCKET`
- `VITE_ENABLE_NOTIFICATIONS`

### Service-specific env example
- `backend/services/education/academics/.env.example` includes production service URLs, secure credentials, JWT settings, and RabbitMQ/Redis configuration.

## ✅ What Changed

- Removed hard-coded admin and audit credentials
- Updated production `.env.example` files with secure placeholders
- Removed demo login credentials from frontend docs
- Hardened `backend/erp_core/settings.py` for production
- Updated audit and verification scripts to use env variables
- Aligned frontend env values for production deployment

## 📌 Deployment Guidance

- Do not commit `.env` files
- Use environment variables or a secrets manager for production credentials
- Keep `DEBUG=False` in production and verify `ALLOWED_HOSTS`
- Verify `VITE_API_URL` and `VITE_WS_URL` point to real production endpoints
- Keep Sentry, email, and storage credentials under secret management

## 🧪 Testing

```bash
# Backend tests
python manage.py test

# Frontend tests
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m "Add feature"`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👥 Authors

- **Code Cortex Digital** - Initial work

## 🙏 Acknowledgments

- Django REST Framework community
- React team
- Tailwind CSS
- Open-source contributors

## 📞 Support

For support, email: support@codecortex.com or open an issue on GitHub.
