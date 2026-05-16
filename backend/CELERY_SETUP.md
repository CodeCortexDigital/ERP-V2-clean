# Celery & Background Job Setup

This project uses Celery for event-driven background processing and Celery Beat for scheduled jobs.

## Requirements

- Redis (default broker/backend)
- Python packages: `celery`, `flower`
- Ensure `DJANGO_SETTINGS_MODULE=erp_core.settings`

## Environment Variables

- `CELERY_BROKER_URL` (default: `redis://localhost:6379/0`)
- `CELERY_RESULT_BACKEND` (default: same as broker URL)

## Start the Celery Worker

From the project root:

```bash
cd backend
celery -A erp_core worker --loglevel=info
```

## Start the Beat Scheduler

```bash
cd backend
celery -A erp_core beat --loglevel=info
```

## Start Flower Monitoring

```bash
cd backend
celery -A erp_core flower --port=5555
```

Then open `http://localhost:5555` in your browser.

## Event Dispatcher

The application uses `services.core.events.dispatcher.dispatch_event()` to queue background jobs. Current event mappings include:

- `attendance_marked`
- `invoice_created`
- `result_published`
- `student_enrolled`

These events are wired into signal handlers in:

- `services.education.attendance.signals`
- `services.education.finance.signals`
- `services.education.exams.signals`
- `services.education.students.signals`

## Notes

- Tasks are defined under `services.core.tasks`
- Retry/backoff is configured for all tasks using Celery retry settings
- Customize `backend/erp_core/celery.py` to add new periodic jobs or queues
