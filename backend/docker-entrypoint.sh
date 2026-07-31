#!/bin/sh
set -e

if [ "${SKIP_DB_SETUP:-0}" != "1" ]; then
    echo "[entrypoint] Applying database migrations..."
    python manage.py migrate --noinput

    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
