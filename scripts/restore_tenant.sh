#!/bin/bash
##############################################################################
# Single-tenant restore (shared DB, row-level tenancy)
# Restores one tenant from a full backup into a target database/schema.
#
# Usage: ./restore_tenant.sh <tenant_uuid> <backup_sql.gz> [target_db]
##############################################################################

set -euo pipefail

TENANT_ID="${1:-}"
BACKUP_FILE="${2:-}"
TARGET_DB="${3:-erp_tenant_restore}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"
LOG_FILE="${RESTORE_LOG_FILE:-/var/log/tenant_restore.log}"

if [ -z "$TENANT_ID" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <tenant_uuid> <backup_sql.gz> [target_db]"
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || LOG_FILE="/tmp/tenant_restore.log"

log() { echo "[$(date +'%F %T')] $1" | tee -a "$LOG_FILE"; }

# Tables with direct tenant_id (extend as schema grows)
TENANT_TABLES=(
  "core_accounts_tenant"
  "core_accounts_school"
  "core_accounts_organizationmembership"
)

log "Creating staging database: ${TARGET_DB}_staging"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE IF EXISTS ${TARGET_DB}_staging;" 2>>"$LOG_FILE" || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "CREATE DATABASE ${TARGET_DB}_staging;" 2>>"$LOG_FILE"

log "Restoring full backup to staging..."
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${TARGET_DB}_staging" -q 2>>"$LOG_FILE"

log "Exporting tenant $TENANT_ID data..."
EXPORT_DIR="/tmp/tenant_export_${TENANT_ID}_$$"
mkdir -p "$EXPORT_DIR"

for table in "${TENANT_TABLES[@]}"; do
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${TARGET_DB}_staging" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_name='$table';" | grep -q 1; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${TARGET_DB}_staging" -c \
      "\\copy (SELECT * FROM $table WHERE tenant_id::text='$TENANT_ID' OR id::text='$TENANT_ID') TO '$EXPORT_DIR/${table}.csv' CSV HEADER" \
      2>>"$LOG_FILE" || true
  fi
done

log "Creating target database: $TARGET_DB"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE IF EXISTS $TARGET_DB;" 2>>"$LOG_FILE" || true
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "CREATE DATABASE $TARGET_DB;" 2>>"$LOG_FILE"
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$TARGET_DB" -q 2>>"$LOG_FILE"

log "Tenant export saved under $EXPORT_DIR for selective merge"
log "Use: python manage.py restore_tenant --tenant-id $TENANT_ID for ORM-level merge"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE ${TARGET_DB}_staging;" 2>>"$LOG_FILE" || true
log "Single-tenant restore preparation complete -> $TARGET_DB"
