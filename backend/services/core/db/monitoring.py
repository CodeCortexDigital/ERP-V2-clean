"""
Database monitoring: slow queries, index usage, connection pool stats.
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Generator

from django.conf import settings
from django.db import connection

logger = logging.getLogger('erp.db.slow_query')

SLOW_QUERY_MS = getattr(settings, 'DB_SLOW_QUERY_MS', 200)


class SlowQueryLoggingMiddleware:
    """Log queries exceeding DB_SLOW_QUERY_MS (default 200ms)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        threshold_ms = getattr(settings, 'DB_SLOW_QUERY_MS', 200)
        with _query_timer(threshold_ms, path=request.path):
            return self.get_response(request)


@contextmanager
def _query_timer(threshold_ms: int, path: str = '') -> Generator[None, None, None]:
    if not getattr(settings, 'DB_QUERY_MONITORING', True):
        yield
        return

    start = time.perf_counter()
    initial = len(connection.queries)
    try:
        yield
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        if elapsed_ms >= threshold_ms:
            log_slow_query(
                sql=f'REQUEST {path}',
                duration_ms=elapsed_ms,
                extra={'query_count': len(connection.queries) - initial},
            )


def log_slow_query(
    sql: str,
    duration_ms: float,
    *,
    extra: dict[str, Any] | None = None,
) -> None:
    payload = {'duration_ms': round(duration_ms, 2), 'sql': sql[:2000]}
    if extra:
        payload.update(extra)
    logger.warning('Slow query detected', extra=payload)


def install_execute_wrapper() -> None:
    """
    Register Django connection execute_wrapper for per-query timing (PostgreSQL/SQLite).
    Call from AppConfig.ready().
    """
    if not getattr(settings, 'DB_QUERY_MONITORING', True):
        return

    threshold_ms = getattr(settings, 'DB_SLOW_QUERY_MS', 200)

    def wrapper(execute, sql, params, many, context):
        start = time.perf_counter()
        try:
            return execute(sql, params, many, context)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            if duration_ms >= threshold_ms:
                log_slow_query(sql, duration_ms)

    connection.execute_wrappers.append(wrapper)


def get_connection_stats() -> dict[str, Any]:
    """Return Django DB connection + PostgreSQL pool-oriented metrics."""
    stats: dict[str, Any] = {
        'vendor': connection.vendor,
        'queries_logged': len(connection.queries),
    }
    if hasattr(connection, 'pool') and connection.pool is not None:
        stats['pool'] = {'has_pool': True}
    if connection.vendor != 'postgresql':
        return stats

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT count(*) AS total,
                   count(*) FILTER (WHERE state = 'active') AS active,
                   count(*) FILTER (WHERE state = 'idle') AS idle
            FROM pg_stat_activity
            WHERE datname = current_database()
            """
        )
        row = cursor.fetchone()
        stats['pg_connections'] = {
            'total': row[0],
            'active': row[1],
            'idle': row[2],
        }
        cursor.execute('SHOW max_connections')
        stats['pg_max_connections'] = cursor.fetchone()[0]
    return stats


def analyze_index_usage(*, min_scans: int = 0) -> list[dict[str, Any]]:
    """PostgreSQL index usage from pg_stat_user_indexes."""
    if connection.vendor != 'postgresql':
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT schemaname, relname, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE idx_scan >= %s
            ORDER BY idx_scan ASC, relname, indexrelname
            LIMIT 200
            """,
            [min_scans],
        )
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def unused_indexes() -> list[dict[str, Any]]:
    """Indexes with zero scans (candidates for review, not auto-drop)."""
    return analyze_index_usage(min_scans=0)
