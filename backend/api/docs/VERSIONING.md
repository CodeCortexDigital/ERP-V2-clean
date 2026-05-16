# API versioning

This project uses **URL path versioning** for long-term API stability.

## Supported versions

| Version | Base URL    | Status      | Notes                          |
|---------|-------------|-------------|--------------------------------|
| v1      | `/api/v1/`  | Deprecated  | Sunset **2026-11-16**          |
| v2      | `/api/v2/`  | Current     | Preferred for new integrations |

Unversioned `/api/...` requests are treated as **v1** for backward compatibility.

## Rules

1. **v1 is frozen** — no fields removed; only additive changes go to v2.
2. **v2 is additive** — includes all v1 fields plus new ones.
3. **Deprecated fields** stay in responses with `help_text` / OpenAPI deprecation notes.
4. **6-month deprecation window** for v1 after announcement (see [DEPRECATION_SCHEDULE.md](./DEPRECATION_SCHEDULE.md)).

## Headers

Responses under `/api/` include:

- `API-Version`: resolved version (`v1` or `v2`)
- `Deprecation: true` on v1 (after announcement date)
- `Sunset: 2026-11-16` on v1
- `Link: </api/v2/>; rel="successor-version"` on v1

Clients may send `API-Version: v2` on legacy paths as a hint; path prefix wins when present.

## Documentation

- [v1 reference](./v1/README.md)
- [v2 reference](./v2/README.md)
- [Deprecation schedule](./DEPRECATION_SCHEDULE.md)

## OpenAPI

- v1 schema: `/api/v1/schema/` — Swagger `/api/v1/docs/`
- v2 schema: `/api/v2/schema/` — Swagger `/api/v2/docs/`
