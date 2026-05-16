#!/bin/bash
################################################################################
# Master Backup Script
# Schedule: daily at 02:00 (cron: 0 2 * * *)
# Components: PostgreSQL, media (incremental via backup_media.sh), Redis, config
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/backup_common.sh
source "$SCRIPT_DIR/lib/backup_common.sh"

OUTPUT_DIR="${1:-${BACKUP_OUTPUT_DIR:-/backups}}"
RETENTION_DAYS="${2:-${BACKUP_RETENTION_DAYS:-30}}"
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
BACKUP_DIR="$OUTPUT_DIR/backup_$TIMESTAMP"
LOG_FILE="${BACKUP_LOG_FILE:-/var/log/erp_backup.log}"

DB_NAME="${DB_NAME:-erp_core}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
MEDIA_ROOT="${MEDIA_ROOT:-backend/media}"
STATIC_ROOT="${STATIC_ROOT:-backend/staticfiles}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }

create_backup_directory() {
  mkdir -p "$BACKUP_DIR"
  touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/erp_backup.log"
  log_info "Backup directory: $BACKUP_DIR"
}

backup_database() {
  log_info "PostgreSQL backup..."
  local backup_file="$BACKUP_DIR/database_$TIMESTAMP.sql.gz"
  export PGPASSWORD="$DB_PASSWORD"

  if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl 2>>"$LOG_FILE" | gzip > "$backup_file"; then
    write_checksums "$backup_file"
    echo "database_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")" > "$backup_file.meta"
    log_info "Database backup OK: $backup_file"
  else
    log_error "Database backup failed"
    return 1
  fi
}

backup_media_files() {
  if [ -x "$SCRIPT_DIR/backup_media.sh" ]; then
    BACKUP_DIR_MEDIA="$BACKUP_DIR/media"
    mkdir -p "$BACKUP_DIR_MEDIA"
  export MEDIA_ROOT
    "$SCRIPT_DIR/backup_media.sh" "$BACKUP_DIR_MEDIA" "$RETENTION_DAYS" "$LOG_FILE" || return 1
    return 0
  fi

  log_info "Media backup (inline)..."
  [ -d "$MEDIA_ROOT" ] || { log_warning "Media not found: $MEDIA_ROOT"; return 0; }
  local media_backup="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"
  tar -czf "$media_backup" -C "$(dirname "$MEDIA_ROOT")" "$(basename "$MEDIA_ROOT")" 2>>"$LOG_FILE"
  write_checksums "$media_backup"
}

backup_config_files() {
  log_info "Configuration backup..."
  local config_backup="$BACKUP_DIR/config_$TIMESTAMP.tar.gz"
  local config_files=()
  [ -f ".env" ] && config_files+=(".env")
  [ -f ".env.production" ] && config_files+=(".env.production")
  [ -f "backend/erp_core/settings.py" ] && config_files+=("backend/erp_core/settings.py")

  if [ ${#config_files[@]} -eq 0 ]; then
    log_warning "No config files found"
    return 0
  fi

  tar -czf "$config_backup" "${config_files[@]}" 2>>"$LOG_FILE"
  write_checksums "$config_backup"
}

backup_redis() {
  log_info "Redis backup..."
  local redis_backup="$BACKUP_DIR/redis_$TIMESTAMP.rdb"

  if ! command -v redis-cli >/dev/null 2>&1; then
    log_warning "redis-cli not found, skipping Redis"
    return 0
  fi

  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$redis_backup" 2>>"$LOG_FILE"; then
    gzip -f "$redis_backup"
    write_checksums "$redis_backup.gz"
    log_info "Redis backup OK"
  else
    log_warning "Redis backup skipped (service unavailable)"
  fi
}

verify_backups() {
  log_info "Verifying checksums and sizes..."
  verify_checksums "$BACKUP_DIR" || return 1

  local small=0
  for file in "$BACKUP_DIR"/*; do
    [ -f "$file" ] || continue
    [[ "$file" == *.md5 || "$file" == *.sha256 || "$file" == *.meta ]] && continue
    local sz
    sz=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    if [ "$sz" -lt 1024 ]; then
      log_warning "Suspiciously small file: $file ($sz bytes)"
      small=1
    fi
  done
  [ "$small" -eq 0 ]
}

cleanup_old_backups() {
  log_info "Local retention: ${RETENTION_DAYS} days"
  find "$OUTPUT_DIR" -maxdepth 1 -type d -name 'backup_*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
}

print_summary() {
  echo "========================================" | tee -a "$LOG_FILE"
  echo "Backup: $TIMESTAMP | Dir: $BACKUP_DIR" | tee -a "$LOG_FILE"
  echo "Size: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
}

main() {
  create_backup_directory
  local failed=0

  backup_database || failed=1
  backup_media_files || failed=1
  backup_config_files || failed=1
  backup_redis || true

  verify_backups || failed=1
  upload_backup_to_s3 "$BACKUP_DIR" || failed=1
  cleanup_old_backups
  print_summary

  if [ "$failed" -eq 0 ]; then
    send_slack_notification "success" "ERP backup $TIMESTAMP completed"
    exit 0
  fi
  send_slack_notification "failure" "ERP backup $TIMESTAMP failed — check $LOG_FILE"
  exit 1
}

main "$@"
