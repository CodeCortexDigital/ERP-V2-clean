#!/bin/bash
##############################################################################
# PostgreSQL Database Restore Script
# Purpose: Full and point-in-time database restoration
# Usage: ./restore_db.sh [backup_file] [target_db] [recovery_time]
##############################################################################

set -e

BACKUP_FILE="$1"
TARGET_DB="${2:-erp_core_restored}"
RECOVERY_TIME="${3:-}"  # ISO format: 2026-05-16 12:00:00
LOG_FILE="${4:-/var/log/db_restore.log}"

# Database configuration
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ WARNING: $1" | tee -a "$LOG_FILE"
}

##############################################################################
# VALIDATION
##############################################################################

validate_inputs() {
    log_info "Validating restore parameters..."
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Backup file not specified"
        echo "Usage: $0 [backup_file] [target_db] [recovery_time]"
        return 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        return 1
    fi
    
    # Validate backup integrity
    if [ -f "$BACKUP_FILE.sha256" ]; then
        if ! sha256sum -c "$BACKUP_FILE.sha256" >> "$LOG_FILE" 2>&1; then
            log_error "Backup file checksum failed - backup may be corrupted"
            return 1
        fi
        log_info "Backup integrity verified"
    fi
    
    log_info "Validation passed"
    return 0
}

##############################################################################
# CREATE TARGET DATABASE
##############################################################################

create_target_database() {
    log_info "Creating target database: $TARGET_DB"
    
    # Check if database already exists
    local export_cmd="PGPASSWORD=$DB_PASSWORD"
    
    if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -lqt | cut -d '|' -f 1 | grep -qw $TARGET_DB"; then
        log_warning "Database $TARGET_DB already exists"
        echo "Drop existing database and continue? (yes/no)"
        read -r response
        
        if [ "$response" != "yes" ]; then
            log_error "Restore cancelled"
            return 1
        fi
        
        log_info "Dropping existing database: $TARGET_DB"
        eval "$export_cmd psql -h $DB_HOST -U $DB_USER -c \"DROP DATABASE $TARGET_DB;\"" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Create new database
    if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -c \"CREATE DATABASE $TARGET_DB;\"" 2>&1 | tee -a "$LOG_FILE"; then
        log_info "Target database created successfully"
        return 0
    else
        log_error "Failed to create target database"
        return 1
    fi
}

##############################################################################
# RESTORE FROM BACKUP
##############################################################################

restore_from_dump() {
    log_info "Restoring database from backup: $BACKUP_FILE"
    
    local export_cmd="PGPASSWORD=$DB_PASSWORD"
    
    # Detect backup format (gzipped or plain)
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log_info "Detected gzipped backup, decompressing..."
        
        if zcat "$BACKUP_FILE" | eval "$export_cmd psql -h $DB_HOST -U $DB_USER -d $TARGET_DB" 2>&1 | tee -a "$LOG_FILE"; then
            log_info "Restore completed successfully"
            return 0
        else
            log_error "Restore failed"
            return 1
        fi
    else
        log_info "Detected plain SQL backup"
        
        if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -d $TARGET_DB -f $BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
            log_info "Restore completed successfully"
            return 0
        else
            log_error "Restore failed"
            return 1
        fi
    fi
}

##############################################################################
# RESTORE TO SPECIFIC POINT IN TIME (PITR)
##############################################################################

restore_pitr() {
    log_info "Attempting point-in-time recovery to: $RECOVERY_TIME"
    
    # Check if base backup and WAL files are available
    local basebackup_dir="${BACKUP_FILE%/*}/basebackup_*"
    
    if [ ! -d "$basebackup_dir" ]; then
        log_error "Base backup directory not found - PITR not possible"
        log_info "Falling back to full restore"
        return $(restore_from_dump)
    fi
    
    log_warning "PITR requires WAL archiving to be configured"
    log_warning "This feature requires manual PostgreSQL configuration"
    
    return 0
}

##############################################################################
# VALIDATE RESTORED DATABASE
##############################################################################

validate_restore() {
    log_info "Validating restored database..."
    
    local export_cmd="PGPASSWORD=$DB_PASSWORD"
    
    # Check database exists
    if ! eval "$export_cmd psql -h $DB_HOST -U $DB_USER -lqt | cut -d '|' -f 1 | grep -qw $TARGET_DB"; then
        log_error "Target database not found after restore"
        return 1
    fi
    
    log_info "Database exists"
    
    # Check table count
    local table_count=$(eval "$export_cmd psql -h $DB_HOST -U $DB_USER -d $TARGET_DB -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';\"" 2>/dev/null || echo 0)
    
    if [ "$table_count" -eq 0 ]; then
        log_error "No tables found in restored database"
        return 1
    fi
    
    log_info "Database validation passed - $table_count tables found"
    
    # Check specific tables if ERP schema
    local key_tables=("auth_user" "students_student" "schools_schoolclass" "attendance_attendancerecord")
    
    for table in "${key_tables[@]}"; do
        if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -d $TARGET_DB -t -c \"SELECT to_regclass('public.$table');\"" 2>/dev/null | grep -q "$table"; then
            log_info "✓ Table found: $table"
        fi
    done
    
    return 0
}

##############################################################################
# SWITCH DATABASE (Move restored to production)
##############################################################################

switch_to_restored() {
    log_info "Ready to switch to restored database"
    
    echo ""
    echo "CAUTION: This will replace the production database!"
    echo "Current database will be renamed to: ${TARGET_DB}_old"
    echo ""
    echo "Are you sure you want to proceed? (yes/no)"
    read -r response
    
    if [ "$response" != "yes" ]; then
        log_error "Database switch cancelled"
        return 1
    fi
    
    local export_cmd="PGPASSWORD=$DB_PASSWORD"
    local production_db="erp_core"
    
    log_info "Switching databases..."
    log_info "1. Rename production database to ${production_db}_old"
    log_info "2. Rename restored database to $production_db"
    
    # Disconnect all connections
    eval "$export_cmd psql -h $DB_HOST -U $DB_USER -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$production_db' AND pid <> pg_backend_pid();\"" 2>&1 | tee -a "$LOG_FILE"
    
    # Rename databases
    if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -c \"ALTER DATABASE $production_db RENAME TO ${production_db}_backup_$(date +%Y%m%d_%H%M%S);\"" 2>&1 | tee -a "$LOG_FILE"; then
        if eval "$export_cmd psql -h $DB_HOST -U $DB_USER -c \"ALTER DATABASE $TARGET_DB RENAME TO $production_db;\"" 2>&1 | tee -a "$LOG_FILE"; then
            log_info "✓ Database switch completed successfully"
            return 0
        else
            log_error "Failed to rename restored database"
            return 1
        fi
    else
        log_error "Failed to rename production database"
        return 1
    fi
}

##############################################################################
# MAIN
##############################################################################

main() {
    log_info "=========================================="
    log_info "Database Restore Started"
    log_info "Backup File: $BACKUP_FILE"
    log_info "Target DB: $TARGET_DB"
    log_info "Recovery Time: ${RECOVERY_TIME:-Full restore}"
    log_info "=========================================="
    
    local failed=0
    
    # Validate inputs
    validate_inputs || failed=1
    
    # Create target database
    create_target_database || failed=1
    
    # Restore from backup
    if [ -n "$RECOVERY_TIME" ]; then
        restore_pitr || failed=1
    else
        restore_from_dump || failed=1
    fi
    
    # Validate restored database
    validate_restore || failed=1
    
    if [ $failed -eq 0 ]; then
        log_info "=========================================="
        log_info "✓ Restore completed successfully"
        log_info "✓ Restored database: $TARGET_DB"
        log_info "=========================================="
        
        # Offer to switch to restored database
        switch_to_restored
        
        exit 0
    else
        log_error "=========================================="
        log_error "✗ Restore completed with errors"
        log_error "=========================================="
        exit 1
    fi
}

# Show usage if no args
if [ $# -eq 0 ]; then
    echo "Usage: $0 [backup_file] [target_db] [recovery_time]"
    echo ""
    echo "Examples:"
    echo "  # Full restore"
    echo "  $0 /backups/database/full_20260516_020000.sql.gz"
    echo ""
    echo "  # Restore to specific database"
    echo "  $0 /backups/database/full_20260516_020000.sql.gz erp_test"
    echo ""
    echo "  # Point-in-time recovery"
    echo "  $0 /backups/database/basebackup_20260516_020000 erp_restored '2026-05-16 12:00:00'"
    exit 1
fi

main "$@"
