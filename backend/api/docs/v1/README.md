# API v1 reference

**Base URL:** `https://<host>/api/v1/`  
**Status:** Deprecated (sunset 2026-11-16)  
**OpenAPI:** `/api/v1/schema/` · Swagger `/api/v1/docs/`

## Authentication

```
POST /api/v1/auth/login/
POST /api/v1/auth/token/refresh/
GET  /api/v1/auth/me/
```

## Students

```
GET    /api/v1/students/
POST   /api/v1/students/
GET    /api/v1/students/{id}/
PATCH  /api/v1/students/{id}/
DELETE /api/v1/students/{id}/
GET    /api/v1/students/by-id/{student_id}/
```

Legacy alias (same handlers):

```
GET /api/v1/auth/students/
```

### Response fields (excerpt)

All model fields plus:

- `class_name` — **deprecated**, use v2 `current_class_name`
- `section_name` — **deprecated**, use v2 `current_section_name`

## Other v1 modules

Unchanged paths under `/api/v1/auth/` (attendance, exams, finance, academics, analytics, etc.), plus `tenants/`, `features/`, `storage/`, `education/`.

See OpenAPI for the full surface.
