# Backend Folder Structure

## Overview
The backend is a Django project with versioned REST APIs, modular education services, shared core services, and automation scripts. The structure below focuses on the project root and the important service trees down to depth 4 to 5.

## Top-Level Backend Tree
```text
backend/
├── manage.py
├── README.md
├── requirements.txt
├── pytest.ini
├── CELERY_SETUP.md
├── api/
├── auth_api/
├── config/
├── erp_core/
├── erp_kernel/
├── pdf_engine/
├── portals/
├── services/
├── tests/
├── media/
├── logs/
├── scripts/
├── db.sqlite3
└── many utility scripts (*.py)
```

## Core Project Tree
```text
erp_core/
├── __init__.py
├── asgi.py
├── auth.py
├── celery.py
├── consumers.py
├── dashboard_signals.py
├── kernel.py
├── settings.py
├── settings_fixed.py
├── settings_minimal.py
├── signals.py
├── urls.py
└── wsgi.py
```

## API Tree
```text
api/
├── __init__.py
├── schema.py
├── versioning.py
├── docs/
│   ├── DEPRECATION_SCHEDULE.md
│   ├── VERSIONING.md
│   ├── v1/
│   │   └── README.md
│   └── v2/
│       └── README.md
├── v1/
│   ├── __init__.py
│   ├── serializers.py
│   ├── student_urls.py
│   ├── urls.py
│   └── views.py
└── v2/
    ├── __init__.py
    ├── serializers.py
    ├── student_urls.py
    ├── urls.py
    └── views.py
```

## Services Tree Up To Depth 5
```text
services/
├── analytics/
│   ├── ai_urls.py
│   ├── ai_views.py
│   ├── engine.py
│   ├── event_handlers.py
│   ├── migrations/
│   └── models.py
├── communication/
│   └── whatsapp/
│       ├── service.py
│       ├── tasks.py
│       ├── urls.py
│       └── views.py
├── core/
│   ├── api/
│   │   ├── base_viewset.py
│   │   ├── response.py
│   │   └── tenant_mixin.py
│   ├── audit/
│   ├── audit_api/
│   ├── backup/
│   ├── consumers/
│   ├── db/
│   │   ├── archival.py
│   │   ├── archive_models.py
│   │   ├── archive_tasks.py
│   │   ├── cache.py
│   │   ├── migrations/
│   │   ├── monitoring.py
│   │   ├── optimization.py
│   │   ├── partitioning.py
│   │   └── softdelete.py
│   ├── events/
│   ├── features/
│   ├── health/
│   ├── management/
│   ├── monitoring/
│   ├── search/
│   ├── storage/
│   ├── tasks/
│   ├── tenants/
│   ├── user_notifications/
│   └── utils/
├── education/
│   ├── admissions/
│   ├── academics/
│   ├── attendance/
│   ├── communication/
│   ├── exams/
│   ├── families/
│   ├── finance/
│   ├── students/
│   └── timetable/
├── pdf/
│   └── pdf_generator.py
└── rbac_models/
    ├── admin.py
    ├── models.py
    ├── tests.py
    └── views.py
```

## Education Module Tree
```text
services/education/
├── admissions/
│   ├── admin.py
│   ├── apps.py
│   ├── migrations/
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   └── views.py
├── academics/
│   ├── admin.py
│   ├── api/
│   ├── apps.py
│   ├── authentication.py
│   ├── base_model.py
│   ├── class_subject.py
│   ├── filters.py
│   ├── management/
│   ├── migrations/
│   ├── models.py
│   ├── permissions.py
│   ├── serializers.py
│   ├── tests.py
│   ├── throttling.py
│   ├── urls.py
│   ├── views.py
│   └── views_api.py
├── attendance/
│   ├── admin.py
│   ├── analytics_models.py
│   ├── analytics_views.py
│   ├── api/
│   ├── authentication.py
│   ├── base_model.py
│   ├── calendar.py
│   ├── detection.py
│   ├── filters.py
│   ├── management/
│   ├── migrations/
│   ├── models.py
│   ├── permissions.py
│   ├── serializers.py
│   ├── services.py
│   ├── signals.py
│   ├── tests.py
│   ├── urls.py
│   └── views.py
├── communication/
│   ├── __init__.py
│   ├── models.py
│   ├── signals.py
│   └── tasks.py
├── finance/
│   ├── admin.py
│   ├── apps.py
│   ├── management/
│   ├── migrations/
│   ├── models.py
│   ├── payments/
│   ├── serializers.py
│   ├── signals.py
│   ├── templates/
│   ├── urls.py
│   └── views.py
├── exams/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── migrations/
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   └── views.py
├── families/
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py
│   └── views.py
├── students/
│   ├── admin.py
│   ├── api/
│   ├── authentication.py
│   ├── base_model.py
│   ├── constants.py
│   ├── exceptions.py
│   ├── filters.py
│   ├── management/
│   ├── migrations/
│   ├── middleware.py
│   ├── models.py
│   ├── pagination.py
│   ├── permissions.py
│   ├── serializers.py
│   ├── service_integration.py
│   ├── signals.py
│   ├── tests.py
│   ├── throttling.py
│   ├── urls.py
│   ├── utils.py
│   └── views.py
├── timetable/
│   ├── management/
│   ├── migrations/
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   └── views.py
└── ...
```

## Utility Scripts And Support Files
- Data generation and seeding scripts for students, teachers, school data, attendance, exams, finance, and timetable data
- Audit scripts for attendance, finance, and system verification
- Sync and restore scripts for backups and passwords
- Test scripts for login, analytics, attendance triggers, and integration coverage

## Key Backend Capabilities
- Versioned REST API for v1 and v2 consumers
- JWT authentication and account management
- Multi-tenant data handling and tenant-aware utilities
- Attendance processing, alerts, analytics, and face/behavior related support
- Exams, results, grading, and analytics workflows
- Finance, invoicing, receipts, reminders, and payment processing
- Admissions and student lifecycle workflows
- Realtime notifications, WhatsApp service integration, and background tasks
- PDF document generation and reporting
- Monitoring, backup, archival, caching, and database optimization utilities

## Notes
The tree above focuses on the major runtime folders and the most important nested modules. The repository also contains generated artifacts, media files, coverage output, and temporary backups that are intentionally excluded from the structure summary.
