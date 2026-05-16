#!/bin/bash

################################################################################
# Master Backup Script
# Purpose: Daily backup of PostgreSQL, media, Redis, and configuration
# Usage: ./backup.sh [output_directory] [retention_days]
################################################################################

set -e

# Configuration
OUTPUT_DIR="${1:-/backups}"
RETENTION_DAYS="${2:-30}"
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
BACKUP_DIR="$OUTPUT_DIR/backup_$TIMESTAMP"
LOG_FILE="/var/log/erp_backup.log"

DB_NAME="${DB_NAME:-erp_core}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_SCHEMA="${DB_SCHEMA:-public}"
MEDIA_ROOT="${MEDIA_ROOT:-backend/media}"
STATIC_ROOT="${STATIC_ROOT:-backend/staticfiles}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_DUMP_FILE="${REDIS_DUMP_FILE:-/var/lib/redis/dump.rdb}"
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

################################################################################
# Helper Functions
################################################################################

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

send_slack_notification() {
  local status="$1"
  local message="$2"

  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    return
  fi

  local color="good"
  if [ "$status" != "success" ]; then
    color="danger"
  fi

  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Backup $status\",\"text\":\"$message\"}]}" > /dev/null || true
}

create_backup_directory() {
  log_info "Creating backup directory: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  touch "$LOG_FILE"
}

backup_database() {
  log_info "Starting PostgreSQL backup..."
  local backup_file="$BACKUP_DIR/database_$TIMESTAMP.sql.gz"
  local export_cmd="PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME"

  if eval "$export_cmd" 2>/dev/null | gzip > "$backup_file"; then
    log_info "Database backup completed: $backup_file"
    sha256sum "$backup_file" > "$backup_file.sha256"
  else
    log_error "Database backup failed"
    return 1
  fi
}

backup_media_files() {
  log_info "Backing up media files..."

  if [ ! -d "$MEDIA_ROOT" ]; then
    log_warning "Media directory not found: $MEDIA_ROOT"
    return 0
  fi

  local media_backup="$BACKUP_DIR/media_$TIMESTAMP.tar.gz"
  if tar -czf "$media_backup" -C "$(dirname "$MEDIA_ROOT")" "$(basename "$MEDIA_ROOT")" 2>>"$LOG_FILE"; then
    log_info "Media backup completed: $media_backup"
    sha256sum "$media_backup" > "$media_backup.sha256"
  else
    log_error "Media backup failed"
    return 1
  fi
}

backup_static_files() {
  log_info "Backing up static files..."

  if [ ! -d "$STATIC_ROOT" ]; then
    log_warning "Static files directory not found: $STATIC_ROOT"
    return 0
  fi

  local static_backup="$BACKUP_DIR/static_$TIMESTAMP.tar.gz"
  if tar -czf "$static_backup" -C "$(dirname "$STATIC_ROOT")" "$(basename "$STATIC_ROOT")" 2>>"$LOG_FILE"; then
    log_info "Static files backup completed: $static_backup"
    sha256sum "$static_backup" > "$static_backup.sha256"
  else
    log_error "Static files backup failed"
    return 1
  fi
}

backup_config_files() {
  log_info "Backing up configuration files..."

  local config_backup="$BACKUP_DIR/config_$TIMESTAMP.tar.gz"
  local config_files=()

  [ -f ".env" ] && config_files+=(".env")
  [ -f ".env.production" ] && config_files+=(".env.production")
  [ -f "backend/erp_core/settings.py" ] && config_files+=("backend/erp_core/settings.py")

  if [ ${#config_files[@]} -eq 0 ]; then
    log_warning "No configuration files found to back up"
    return 0
  fi

  if tar -czf "$config_backup" "${config_files[@]}" 2>>"$LOG_FILE"; then
    log_info "Configuration backup completed: $config_backup"
    sha256sum "$config_backup" > "$config_backup.sha256"
  else
    log_error "Configuration backup failed"
    return 1
  fi
}

backup_redis() {
  log_info "Backing up Redis data..."
  local redis_backup="$BACKUP_DIR/redis_$TIMESTAMP.rdb"

  if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$redis_backup" 2>/dev/null; then
      gzip "$redis_backup"
      log_info "Redis backup completed: $redis_backup.gz"
      sha256sum "$redis_backup.gz" > "$redis_backup.gz.sha256"
    else
      log_warning "Redis backup failed or Redis unavailable"
      return 0
    fi
  else
    log_warning "redis-cli not installed, skipping Redis backup"
  fi
}

verify_backups() {
  log_info "Verifying backup integrity..."

  local failed=0
  for checksum in "$BACKUP_DIR"/*.sha256; do
    [ -e "$checksum" ] || continue
    if ! sha256sum -c "$checksum" >/dev/null 2>&1; then
      log_error "Checksum failed: $checksum"
      failed=1
    fi
  done

  local size_ok=0
  for file in "$BACKUP_DIR"/*; do
    [ -f "$file" ] || continue
    if [ $(stat -c%s "$file") -lt 1024 ]; then
      log_warning "Backup file too small: $file"
      size_ok=1
    fi
  done

  if [ $failed -ne 0 ] || [ $size_ok -ne 0 ]; then
    return 1
  fi

  log_info "All backup files verified"
  return 0
}

upload_to_s3() {
  if [ -z "$AWS_S3_BUCKET" ]; then
    log_warning "AWS_S3_BUCKET not configured, skipping S3 upload"
    return 0
  fi

  if ! command -v aws >/dev/null 2>&1; then
    log_warning "AWS CLI not installed, skipping S3 upload"
    return 0
  fi

  log_info "Uploading backups to S3 bucket: $AWS_S3_BUCKET"
  aws s3 sync "$BACKUP_DIR" "s3://$AWS_S3_BUCKET/backups/$(date +%Y/%m/%d)/" \
    --region "$AWS_DEFAULT_REGION" \
    --sse AES256 \
    --only-show-errors || {
      log_error "S3 upload failed"
      return 1
    }

  log_info "S3 upload completed"
}

cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$OUTPUT_DIR" -maxdepth 1 -type d -name 'backup_*' -mtime +$RETENTION_DAYS -exec rm -rf {} +
  log_info "Old backups cleanup completed"
}

monitor_backup_storage() {
  log_info "Monitoring backup storage usage..."
  local usage=$(df -h "$OUTPUT_DIR" | awk 'NR==2 {print $5}')
  local available=$(df -h "$OUTPUT_DIR" | awk 'NR==2 {print $4}')
  log_info "Backup volume usage: $usage available: $available"
}

print_summary() {
  echo "" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
  echo "Backup Summary" | tee -a "$LOG_FILE"
  echo "Timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"
  echo "Directory: $BACKUP_DIR" | tee -a "$LOG_FILE"
  echo "Total Size: $(du -sh "$BACKUP_DIR" | cut -f1)" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
}

main() {
  create_backup_directory

  local failed=0

  backup_database || failed=1
  backup_media_files || failed=1
  backup_static_files || failed=1
  backup_config_files || failed=1
  backup_redis || true

  if ! verify_backups; then
    failed=1
  fi

  upload_to_s3 || failed=1
  cleanup_old_backups
  monitor_backup_storage
  print_summary

  if [ $failed -eq 0 ]; then
    log_info "Backup completed successfully"
    send_slack_notification "success" "Backup completed successfully for $TIMESTAMP"
    exit 0
  else
    log_error "Backup completed with errors"
    send_slack_notification "failure" "Backup completed with errors for $TIMESTAMP"
    exit 1
  fi
}

main "$@"
  
  if ! backup_database; then
    log_error "Backup failed at database backup stage"
    exit 1
  fi
  
  backup_media_files
  backup_static_files
  backup_config_files
  
  if ! verify_backup; then
    log_error "Backup verification failed"
    exit 1
  fi
  
  cleanup_old_backups
  
  print_backup_summary
  log_info "Backup completed successfully"
}

main "$@"
