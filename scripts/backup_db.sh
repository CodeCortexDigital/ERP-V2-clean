#!/bin/bash
##############################################################################
# PostgreSQL Database Backup Script with Point-in-Time Recovery Support
# Purpose: Daily database backup with WAL archiving for PITR
# Usage: ./backup_db.sh [backup_dir] [keep_days]
##############################################################################

set -e

BACKUP_DIR="${1:-/backups/database}"
KEEP_DAYS="${2:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${3:-/var/log/db_backup.log}"

# Database configuration
DB_NAME="${DB_NAME:-erp_core}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$BACKUP_DIR"

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $1" | tee -a "$LOG_FILE"
}

##############################################################################
# BACKUP USING pg_dump (Full backup)
##############################################################################

backup_full() {
    log_info "Starting full PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/full_${TIMESTAMP}.sql.gz"
    local export_cmd="PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME"
    
    if eval "$export_cmd" 2>/dev/null | gzip > "$backup_file"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_info "Full backup completed: $size"
        
        # Checksum
        sha256sum "$backup_file" > "$backup_file.sha256"
        
        # Backup metadata
        cat > "$backup_file.meta" << EOF
timestamp=$TIMESTAMP
size=$(stat --format=%s "$backup_file")
database=$DB_NAME
method=pg_dump
compression=gzip
EOF
        
        return 0
    else
        log_error "Full backup failed"
        return 1
    fi
}

##############################################################################
# BACKUP USING pg_basebackup (Binary backup for PITR)
##############################################################################

backup_basebackup() {
    log_info "Starting base backup for point-in-time recovery..."
    
    local backup_dir="$BACKUP_DIR/basebackup_${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    local export_cmd="PGPASSWORD=$DB_PASSWORD pg_basebackup -h $DB_HOST -U $DB_USER -D $backup_dir -Ft -z"
    
    if eval "$export_cmd" 2>&1 | tee -a "$LOG_FILE"; then
        log_info "Base backup completed"
        
        # Create backup label file with metadata
        cat > "$backup_dir.meta" << EOF
timestamp=$TIMESTAMP
backup_dir=$backup_dir
database=$DB_NAME
method=pg_basebackup
supports_pitr=true
wal_archiving_enabled=${WAL_ARCHIVE_ENABLED:-false}
EOF
        
        return 0
    else
        log_error "Base backup failed"
        return 1
    fi
}

##############################################################################
# VALIDATE BACKUP
##############################################################################

validate_backup() {
    log_info "Validating backup..."
    
    # Check if full backup exists and has content
    local backup_file="$BACKUP_DIR"/full_*.sql.gz
    
    if [ ! -f "$backup_file" ]; then
        log_error "No backup file found"
        return 1
    fi
    
    local size=$(stat --format=%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null)
    
    if [ "$size" -lt 10000 ]; then
        log_error "Backup file too small: $size bytes (expected > 10KB)"
        return 1
    fi
    
    # Verify checksum if it exists
    if [ -f "$backup_file.sha256" ]; then
        if sha256sum -c "$backup_file.sha256" >> "$LOG_FILE" 2>&1; then
            log_info "Backup checksum verified"
        else
            log_error "Backup checksum verification failed"
            return 1
        fi
    fi
    
    log_info "Backup validation passed"
    return 0
}

##############################################################################
# TEST RESTORE (Weekly)
##############################################################################

test_restore() {
    log_info "Testing backup restoration..."
    
    # Only run test restore on Sundays
    if [ "$(date +%A)" != "Sunday" ]; then
        log_info "Test restore skipped (runs weekly on Sunday)"
        return 0
    fi
    
    local backup_file="$BACKUP_DIR"/full_*.sql.gz | head -1
    
    if [ ! -f "$backup_file" ]; then
        log_error "No backup file found for restore test"
        return 1
    fi
    
    # Create temporary test database
    local test_db="erp_test_restore_$$"
    local export_cmd="PGPASSWORD=$DB_PASSWORD"
    
    # Create test database
    if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -tc \"CREATE DATABASE $test_db;\"" 2>&1 | tee -a "$LOG_FILE"; then
        log_info "Test database created"
        
        # Restore from backup
        if zcat "$backup_file" | eval "$export_cmd psql -h $DB_HOST -U $DB_USER -d $test_db" 2>&1 | tee -a "$LOG_FILE"; then
            log_info "Restore test passed"
            
            # Cleanup test database
            eval "$export_cmd psql -h $DB_HOST -U $DB_USER -tc \"DROP DATABASE $test_db;\"" 2>&1 | tee -a "$LOG_FILE"
            
            return 0
        else
            log_error "Restore test failed"
            eval "$export_cmd psql -h $DB_HOST -U $DB_USER -tc \"DROP DATABASE $test_db;\"" 2>&1 | tee -a "$LOG_FILE"
            return 1
        fi
    else
        log_error "Failed to create test database"
        return 1
    fi
}

##############################################################################
# CLEANUP OLD BACKUPS
##############################################################################

cleanup_old_backups() {
    log_info "Cleaning up backups older than $KEEP_DAYS days..."
    
    local count=$(find "$BACKUP_DIR" -type f -name "full_*.sql.gz" -mtime +$KEEP_DAYS | wc -l)
    
    find "$BACKUP_DIR" -type f -name "full_*.sql.gz" -mtime +$KEEP_DAYS -delete
    find "$BACKUP_DIR" -type f -name "full_*.sql.gz.sha256" -mtime +$KEEP_DAYS -delete
    find "$BACKUP_DIR" -type f -name "full_*.sql.gz.meta" -mtime +$KEEP_DAYS -delete
    
    log_info "Deleted $count old backup files"
}

##############################################################################
# MONITOR BACKUP STATS
##############################################################################

monitor_stats() {
    log_info "Backup Statistics:"
    
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local file_count=$(find "$BACKUP_DIR" -type f -name "full_*.sql.gz" | wc -l)
    local latest=$(ls -t "$BACKUP_DIR"/full_*.sql.gz 2>/dev/null | head -1)
    
    echo "  Total size: $total_size" >> "$LOG_FILE"
    echo "  File count: $file_count" >> "$LOG_FILE"
    
    if [ -n "$latest" ]; then
        local latest_size=$(du -h "$latest" | cut -f1)
        local latest_date=$(stat -c %y "$latest" 2>/dev/null | cut -d' ' -f1 || stat -f "%Sm" "$latest" 2>/dev/null)
        echo "  Latest backup: $latest_date ($latest_size)" >> "$LOG_FILE"
    fi
    
    log_info "Backup stats logged"
}

##############################################################################
# MAIN
##############################################################################

main() {
    log_info "=========================================="
    log_info "Database Backup Started: $TIMESTAMP"
    log_info "Database: $DB_NAME"
    log_info "Backup Dir: $BACKUP_DIR"
    log_info "=========================================="
    
    local failed=0
    
    # Create full backup
    backup_full || ((failed++))
    
    # Create base backup for PITR support
    # backup_basebackup || ((failed++))  # Uncomment if PITR needed
    
    # Validate backup
    validate_backup || ((failed++))
    
    # Test restore (weekly)
    test_restore || ((failed++))
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Log statistics
    monitor_stats
    
    if [ $failed -eq 0 ]; then
        log_info "=========================================="
        log_info "✓ Database backup completed successfully"
        log_info "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "✗ Database backup completed with $failed errors"
        log_error "=========================================="
        exit 1
    fi
}

main "$@"
