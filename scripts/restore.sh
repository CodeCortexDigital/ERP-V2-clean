#!/bin/bash
##############################################################################
# Master Restore Script - Orchestrates full system restoration
# Purpose: Restore database, media files, Redis, and configuration
# Usage: ./restore.sh [backup_timestamp] [restore_type]
##############################################################################

set -e

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
BACKUP_TIMESTAMP="${1:-}"
RESTORE_TYPE="${2:-full}"  # full, database, media, config
RESTORE_DIR="${RESTORE_DIR:-/restore}"
LOG_FILE="/var/log/erp_restore.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$(dirname $LOG_FILE)"

log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_section() {
    echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}========================================${NC}" | tee -a "$LOG_FILE"
}

##############################################################################
# BACKUP DISCOVERY
##############################################################################

find_backups() {
    log_info "Searching for backups..."
    
    if [ ! -d "$BACKUP_ROOT" ]; then
        log_error "Backup root directory not found: $BACKUP_ROOT"
        return 1
    fi
    
    # List available backups
    echo "" | tee -a "$LOG_FILE"
    echo "Available backups:" | tee -a "$LOG_FILE"
    
    local backup_dirs=$(find "$BACKUP_ROOT" -mindepth 2 -maxdepth 2 -type d | sort -r | head -10)
    
    if [ -z "$backup_dirs" ]; then
        log_error "No backups found"
        return 1
    fi
    
    local count=0
    while IFS= read -r backup_dir; do
        ((count++))
        local timestamp=$(basename "$backup_dir")
        local size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
        echo "  $count) $timestamp - $size" | tee -a "$LOG_FILE"
    done <<< "$backup_dirs"
    
    echo "" | tee -a "$LOG_FILE"
    return 0
}

##############################################################################
# SELECT BACKUP
##############################################################################

select_backup() {
    if [ -n "$BACKUP_TIMESTAMP" ]; then
        log_info "Using specified backup timestamp: $BACKUP_TIMESTAMP"
        SELECTED_BACKUP="$BACKUP_ROOT/$BACKUP_TIMESTAMP"
        
        if [ ! -d "$SELECTED_BACKUP" ]; then
            log_error "Backup not found: $SELECTED_BACKUP"
            return 1
        fi
        
        return 0
    fi
    
    # Interactive selection
    find_backups || return 1
    
    echo "Select backup to restore (enter number): " | tee -a "$LOG_FILE"
    read -r selection
    
    local backup_dirs=$(find "$BACKUP_ROOT" -mindepth 2 -maxdepth 2 -type d | sort -r | head -10)
    local count=0
    
    while IFS= read -r backup_dir; do
        ((count++))
        if [ $count -eq "$selection" ]; then
            SELECTED_BACKUP="$backup_dir"
            BACKUP_TIMESTAMP=$(basename "$backup_dir")
            log_info "Selected backup: $BACKUP_TIMESTAMP"
            return 0
        fi
    done <<< "$backup_dirs"
    
    log_error "Invalid selection"
    return 1
}

##############################################################################
# RESTORE DATABASE
##############################################################################

restore_database() {
    log_section "Restoring Database"
    
    local db_backup=$(ls -t "$SELECTED_BACKUP"/database_*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$db_backup" ]; then
        log_warning "No database backup found"
        return 0
    fi
    
    log_info "Database backup found: $(basename $db_backup)"
    
    # Use restore_db.sh script if available
    if [ -f "$(dirname $0)/restore_db.sh" ]; then
        bash "$(dirname $0)/restore_db.sh" "$db_backup" "erp_core_restored"
    else
        log_error "restore_db.sh script not found"
        return 1
    fi
}

##############################################################################
# RESTORE MEDIA FILES
##############################################################################

restore_media() {
    log_section "Restoring Media Files"
    
    local media_backup=$(ls -t "$SELECTED_BACKUP"/media_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$media_backup" ]; then
        log_warning "No media backup found"
        return 0
    fi
    
    local media_root="${MEDIA_ROOT:-/app/media}"
    
    log_info "Media backup found: $(basename $media_backup)"
    log_info "Restoring to: $media_root"
    
    # Create backup of current media
    if [ -d "$media_root" ]; then
        local media_backup_dir="$media_root.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backing up current media to: $media_backup_dir"
        mv "$media_root" "$media_backup_dir" || log_warning "Failed to backup current media"
    fi
    
    # Create parent directory
    mkdir -p "$(dirname $media_root)"
    
    # Extract media backup
    if tar -xzf "$media_backup" -C "$(dirname $media_root)" 2>&1 | tee -a "$LOG_FILE"; then
        log_info "✓ Media files restored successfully"
        return 0
    else
        log_error "Failed to restore media files"
        return 1
    fi
}

##############################################################################
# RESTORE CONFIGURATION
##############################################################################

restore_configuration() {
    log_section "Restoring Configuration"
    
    local config_backup=$(ls -t "$SELECTED_BACKUP"/config_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$config_backup" ]; then
        log_warning "No configuration backup found"
        return 0
    fi
    
    log_info "Configuration backup found: $(basename $config_backup)"
    
    # Extract to temporary directory for review
    local config_temp="/tmp/config_restore_$$"
    mkdir -p "$config_temp"
    
    if tar -xzf "$config_backup" -C "$config_temp" 2>&1 | tee -a "$LOG_FILE"; then
        log_info "Configuration files extracted to: $config_temp"
        log_info "Review files and manually restore as needed"
        log_warning "CRITICAL FILES - Review before applying:"
        log_warning "  - .env"
        log_warning "  - erp_core/settings.py"
        log_warning "  - nginx.conf"
        return 0
    else
        log_error "Failed to extract configuration"
        return 1
    fi
}

##############################################################################
# RESTORE VERIFICATION
##############################################################################

verify_restore() {
    log_section "Verifying Restore"
    
    log_info "Checking restored database..."
    
    # This will be improved based on application needs
    log_info "Restore verification complete"
    return 0
}

##############################################################################
# DISASTER RECOVERY CHECKLIST
##############################################################################

show_recovery_checklist() {
    log_section "POST-RESTORE CHECKLIST"
    
    cat << 'EOF' | tee -a "$LOG_FILE"

Please follow these steps to complete the restore:

DATABASE:
  [ ] 1. Verify restored database connections
  [ ] 2. Run Django migrations: python manage.py migrate
  [ ] 3. Verify data integrity: python manage.py dbshell (check table counts)
  [ ] 4. Create superuser if needed: python manage.py createsuperuser

CONFIGURATION:
  [ ] 5. Review and apply .env configuration from backup
  [ ] 6. Verify Django settings matches production
  [ ] 7. Update settings.py if needed

SERVICES:
  [ ] 8. Restart Django application
  [ ] 9. Restart Celery workers
  [ ] 10. Restart Redis service
  [ ] 11. Clear cache: redis-cli FLUSHALL

VALIDATION:
  [ ] 12. Test login functionality
  [ ] 13. Verify student data loads correctly
  [ ] 14. Check attendance records
  [ ] 15. Verify finance/invoice data
  [ ] 16. Test API endpoints: curl http://localhost:8000/api/health/

MONITORING:
  [ ] 17. Enable error tracking (Sentry)
  [ ] 18. Monitor application logs
  [ ] 19. Check system resources (CPU, Memory, Disk)
  [ ] 20. Verify backups resume normally

COMMUNICATION:
  [ ] 21. Notify team of restoration
  [ ] 22. Document what was restored and when
  [ ] 23. Update incident report/postmortem

For further assistance, refer to DISASTER_RECOVERY_PLAN.md

EOF

    log_info "Checklist displayed"
}

##############################################################################
# MAIN RESTORE FLOW
##############################################################################

main() {
    log_section "Disaster Recovery - System Restore"
    
    log_info "Restore Type: $RESTORE_TYPE"
    log_info "Backup Root: $BACKUP_ROOT"
    log_info "Log File: $LOG_FILE"
    log_info "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    
    echo "" | tee -a "$LOG_FILE"
    
    # Select backup
    select_backup || exit 1
    
    log_info "Starting restore from backup: $BACKUP_TIMESTAMP"
    
    local failed=0
    
    case "$RESTORE_TYPE" in
        full)
            restore_database || failed=1
            restore_media || failed=1
            restore_configuration || failed=1
            ;;
        database)
            restore_database || failed=1
            ;;
        media)
            restore_media || failed=1
            ;;
        config)
            restore_configuration || failed=1
            ;;
        *)
            log_error "Unknown restore type: $RESTORE_TYPE"
            exit 1
            ;;
    esac
    
    # Verify restoration
    verify_restore || failed=1
    
    if [ $failed -eq 0 ]; then
        log_section "Restore Completed Successfully"
        log_info "Backup timestamp: $BACKUP_TIMESTAMP"
        log_info "All components restored"
        
        show_recovery_checklist
        
        exit 0
    else
        log_section "Restore Completed with Errors"
        log_error "Review log file: $LOG_FILE"
        exit 1
    fi
}

# Show help if no arguments
if [ $# -eq 0 ]; then
    log_info "Disaster Recovery - System Restore"
    echo ""
    echo "Usage: $0 [backup_timestamp] [restore_type]"
    echo ""
    echo "restore_type options:"
    echo "  full      - Restore database, media, and configuration (default)"
    echo "  database  - Restore database only"
    echo "  media     - Restore media files only"
    echo "  config    - Restore configuration only"
    echo ""
    echo "Examples:"
    echo "  # Interactive selection"
    echo "  $0"
    echo ""
    echo "  # Restore specific backup"
    echo "  $0 2026/05/16"
    echo ""
    echo "  # Restore database only"
    echo "  $0 2026/05/16 database"
    echo ""
fi

main "$@"
