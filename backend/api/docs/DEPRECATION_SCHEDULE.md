# API deprecation schedule

## v1

| Milestone              | Date       | Action |
|------------------------|------------|--------|
| v2 released            | 2026-05-16 | v2 available at `/api/v2/` |
| v1 deprecation announced | 2026-05-16 | `Deprecation` + `Sunset` headers on v1 |
| v1 sunset (target)     | 2026-11-16 | v1 routes return **410 Gone** (planned) |
| v1 removal             | TBD        | After 6+ months post-sunset monitoring |

## v2

| Milestone   | Date       | Action |
|-------------|------------|--------|
| GA          | 2026-05-16 | Current recommended version |

## Migration checklist

1. Point new clients to `/api/v2/`.
2. Replace `class_name` / `section_name` with `current_class_name` / `current_section_name`.
3. Read `display_label`, `tenant_code`, `enrollment_status` where useful.
4. Monitor `Deprecation` headers on remaining v1 traffic.
5. Complete migration before **2026-11-16**.

## Field deprecation (students)

| Field (v1)     | Replacement (v2)     | Removed? |
|----------------|----------------------|----------|
| `class_name`   | `current_class_name` | No — kept in v2 |
| `section_name` | `current_section_name` | No — kept in v2 |
