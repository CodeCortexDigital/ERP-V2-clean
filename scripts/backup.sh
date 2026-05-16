#!/bin/bash

################################################################################
# Database Backup Script
# Creates backups of PostgreSQL database, media files, and configuration
# Usage: ./backup.sh [output_directory] [retention_days]
################################################################################

set -e

# Configuration
OUTPUT_DIR="${1:-.}/backups"
RETENTION_DAYS="${2:-30}"
TIMESTAMP=$(date +'%Y-%m-%d_%H-%M-%S')
BACKUP_DIR="$OUTPUT_DIR/backup_$TIMESTAMP"
LOG_FILE="$BACKUP_DIR/backup.log"

# Database configuration (load from environment)
DB_NAME="${DB_NAME:-erp_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

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

create_backup_directory() {
  log_info "Creating backup directory: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  touch "$LOG_FILE"
}

backup_database() {
  log_info "Starting database backup..."
  
  local backup_file="$BACKUP_DIR/database.sql"
  
  if ! pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F p > "$backup_file" 2>>"$LOG_FILE"; then
    log_error "Failed to backup database"
    return 1
  fi
  
  log_info "Database backed up successfully"
  ls -lh "$backup_file" >> "$LOG_FILE"
}

backup_media_files() {
  log_info "Backing up media files..."
  
  if [ ! -d "backend/media" ]; then
    log_warning "Media directory not found, skipping media backup"
    return 0
  fi
  
  local media_backup="$BACKUP_DIR/media.tar.gz"
  
  if tar -czf "$media_backup" -C backend media/ 2>>"$LOG_FILE"; then
    log_info "Media files backed up successfully"
    ls -lh "$media_backup" >> "$LOG_FILE"
  else
    log_error "Failed to backup media files"
    return 1
  fi
}

backup_static_files() {
  log_info "Backing up static files..."
  
  if [ ! -d "backend/staticfiles" ]; then
    log_warning "Static files directory not found, skipping static backup"
    return 0
  fi
  
  local static_backup="$BACKUP_DIR/static.tar.gz"
  
  if tar -czf "$static_backup" -C backend staticfiles/ 2>>"$LOG_FILE"; then
    log_info "Static files backed up successfully"
    ls -lh "$static_backup" >> "$LOG_FILE"
  else
    log_error "Failed to backup static files"
    return 1
  fi
}

backup_config_files() {
  log_info "Backing up configuration files..."
  
  local config_backup="$BACKUP_DIR/config.tar.gz"
  
  if tar -czf "$config_backup" \
    -C backend erp_core/settings.py .env 2>>"$LOG_FILE"; then
    log_info "Configuration backed up successfully"
    ls -lh "$config_backup" >> "$LOG_FILE"
  else
    log_warning "Some configuration files not found, continuing..."
  fi
}

verify_backup() {
  log_info "Verifying backup integrity..."
  
  if [ ! -f "$BACKUP_DIR/database.sql" ]; then
    log_error "Database backup file not found"
    return 1
  fi
  
  local db_size=$(wc -c < "$BACKUP_DIR/database.sql")
  
  if [ "$db_size" -lt 1000 ]; then
    log_error "Database backup file too small ($db_size bytes)"
    return 1
  fi
  
  log_info "Backup verified successfully"
  
  # Print backup summary
  echo ""
  echo "================================" >> "$LOG_FILE"
  echo "Backup Summary" >> "$LOG_FILE"
  echo "================================" >> "$LOG_FILE"
  echo "Timestamp: $TIMESTAMP" >> "$LOG_FILE"
  echo "Location: $BACKUP_DIR" >> "$LOG_FILE"
  echo "Total Size: $(du -sh "$BACKUP_DIR" | cut -f1)" >> "$LOG_FILE"
  echo "Files:" >> "$LOG_FILE"
  find "$BACKUP_DIR" -type f -exec ls -lh {} \; >> "$LOG_FILE"
}

cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETENTION_DAYS days..."
  
  if [ ! -d "$OUTPUT_DIR" ]; then
    return 0
  fi
  
  find "$OUTPUT_DIR" -type d -name "backup_*" -mtime +"$RETENTION_DAYS" | while read -r old_backup; do
    log_info "Removing old backup: $old_backup"
    rm -rf "$old_backup"
  done
  
  log_info "Cleanup completed"
}

print_backup_summary() {
  echo ""
  echo "========================================"
  echo "Backup Completed Successfully!"
  echo "========================================"
  echo "Timestamp: $TIMESTAMP"
  echo "Location: $BACKUP_DIR"
  echo "Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
  echo "Log: $LOG_FILE"
  echo "========================================"
}

################################################################################
# Main Execution
################################################################################

main() {
  log_info "Starting database backup process..."
  
  create_backup_directory
  
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
