#!/bin/bash
##############################################################################
# PostgreSQL backup with optional WAL/PITR base backup
# Schedule: daily 02:00 | Weekly test restore: Sunday
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/backup_common.sh"

BACKUP_DIR="${1:-/backups/database}"
KEEP_DAYS="${2:-30}"
LOG_FILE="${3:-/var/log/db_backup.log}"

DB_NAME="${DB_NAME:-erp_core}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backups/wal_archive}"
ENABLE_BASEBACKUP="${ENABLE_BASEBACKUP:-false}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR" "$WAL_ARCHIVE_DIR"
touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/db_backup.log"

log_info() { echo "[$(date +'%F %T')] OK $1" | tee -a "$LOG_FILE"; }
log_error() { echo "[$(date +'%F %T')] ERR $1" | tee -a "$LOG_FILE"; }

backup_full() {
  local backup_file="$BACKUP_DIR/full_${TIMESTAMP}.sql.gz"
  export PGPASSWORD="$DB_PASSWORD"

  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl 2>>"$LOG_FILE" | gzip > "$backup_file"

  write_checksums "$backup_file"
  cat > "$backup_file.meta" <<EOF
timestamp=$TIMESTAMP
database=$DB_NAME
method=pg_dump
compression=gzip
EOF
  log_info "Full backup: $backup_file ($(du -h "$backup_file" | cut -f1))"
}

backup_basebackup() {
  [ "$ENABLE_BASEBACKUP" = "true" ] || return 0
  local backup_dir="$BACKUP_DIR/basebackup_${TIMESTAMP}"
  mkdir -p "$backup_dir"
  export PGPASSWORD="$DB_PASSWORD"
  pg_basebackup -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -D "$backup_dir" -Ft -z -P 2>>"$LOG_FILE"
  write_checksums "$(ls "$backup_dir"/*.tar.gz 2>/dev/null | head -1)"
  log_info "Base backup for PITR: $backup_dir"
}

validate_backup() {
  local latest
  latest=$(ls -t "$BACKUP_DIR"/full_*.sql.gz 2>/dev/null | head -1)
  [ -n "$latest" ] || { log_error "No backup file"; return 1; }

  local size
  size=$(stat -c%s "$latest" 2>/dev/null || stat -f%z "$latest")
  [ "$size" -gt 10000 ] || { log_error "Backup too small: $size bytes"; return 1; }

  verify_checksums "$BACKUP_DIR"
  log_info "Validation passed: $(basename "$latest")"
}

test_restore() {
  if [ "$(date +%u)" != "7" ]; then
    log_info "Test restore runs weekly (Sunday)"
    return 0
  fi

  local backup_file
  backup_file=$(ls -t "$BACKUP_DIR"/full_*.sql.gz 2>/dev/null | head -1)
  [ -n "$backup_file" ] || { log_error "No backup for restore test"; return 1; }

  local test_db="erp_restore_test_$$"
  export PGPASSWORD="$DB_PASSWORD"

  log_info "Weekly restore test -> $test_db"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE IF EXISTS $test_db;" 2>>"$LOG_FILE" || true
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "CREATE DATABASE $test_db;" 2>>"$LOG_FILE"

  if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -q 2>>"$LOG_FILE"; then
    local tables
    tables=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -tAc \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
    log_info "Restore test OK ($tables tables)"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE $test_db;" 2>>"$LOG_FILE"
    return 0
  fi

  log_error "Restore test failed"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "DROP DATABASE IF EXISTS $test_db;" 2>>"$LOG_FILE" || true
  return 1
}

cleanup_old_backups() {
  find "$BACKUP_DIR" -type f \( -name 'full_*.sql.gz' -o -name 'full_*.md5' -o -name 'full_*.sha256' -o -name 'full_*.meta' \) \
    -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
  log_info "Retention cleanup (${KEEP_DAYS} days)"
}

main() {
  local failed=0
  backup_full || failed=1
  backup_basebackup || true
  validate_backup || failed=1
  test_restore || failed=1
  cleanup_old_backups
  upload_backup_to_s3 "$BACKUP_DIR" || failed=1

  [ "$failed" -eq 0 ] && exit 0
  send_slack_notification "failure" "Database backup failed at $TIMESTAMP"
  exit 1
}

main "$@"
