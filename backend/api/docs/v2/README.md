# API v2 reference

**Base URL:** `https://<host>/api/v2/`  
**Status:** Current  
**OpenAPI:** `/api/v2/schema/` · Swagger `/api/v2/docs/`

## Authentication

```
POST /api/v2/auth/login/
POST /api/v2/auth/token/refresh/
GET  /api/v2/auth/me/
```

## Students

```
GET    /api/v2/students/
POST   /api/v2/students/
GET    /api/v2/students/{id}/
PATCH  /api/v2/students/{id}/
DELETE /api/v2/students/{id}/
GET    /api/v2/students/by-id/{student_id}/
```

### v2-only fields (additive)

| Field                 | Type   | Description |
|-----------------------|--------|-------------|
| `display_label`       | string | Human-readable label with class/section |
| `tenant_code`         | string | School tenant code (e.g. SPR) |
| `current_class_name`  | string | Canonical class name |
| `current_section_name`| string | Canonical section name |
| `enrollment_status`   | string | `active` or `inactive` |
| `api_version`         | string | Always `"2.0"` on v2 responses |

All **v1 fields remain** in v2 responses, including deprecated `class_name` and `section_name`.

## Version middleware

`request.version` is set to `v2` for paths under `/api/v2/`. Views select `StudentSerializerV2` automatically.
