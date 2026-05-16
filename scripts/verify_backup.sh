#!/bin/bash
##############################################################################
# Backup Verification & Health Check Script
# Purpose: Verify backup integrity and generate health reports
# Usage: ./verify_backup.sh [backup_dir] [alert_email]
##############################################################################

set -e

BACKUP_DIR="${1:-/backups}"
ALERT_EMAIL="${2:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="/var/log/backup_verification_${TIMESTAMP}.log"

# Configuration
CRITICAL_BACKUP_AGE_DAYS=2
WARNING_BACKUP_AGE_DAYS=1
MIN_BACKUP_SIZE_MB=10
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1" | tee -a "$REPORT_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}" | tee -a "$REPORT_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}" | tee -a "$REPORT_FILE"
}

log_section() {
    echo -e "${BLUE}========================================${NC}" | tee -a "$REPORT_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$REPORT_FILE"
    echo -e "${BLUE}========================================${NC}" | tee -a "$REPORT_FILE"
}

##############################################################################
# SEND ALERTS
##############################################################################

send_slack_alert() {
    local status=$1
    local message=$2
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi
    
    local color="warning"
    local emoji="⚠️"
    
    case "$status" in
        error)
            color="danger"
            emoji="❌"
            ;;
        success)
            color="good"
            emoji="✅"
            ;;
    esac
    
    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d @- 2>/dev/null << EOF || true
{
    "attachments": [{
        "color": "$color",
        "title": "${emoji} Backup Verification",
        "text": "$message",
        "ts": $(date +%s)
    }]
}
EOF
}

send_email_alert() {
    local subject=$1
    local message=$2
    
    if [ -z "$ALERT_EMAIL" ] || ! command -v mail &> /dev/null; then
        return
    fi
    
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

##############################################################################
# BACKUP AGE CHECK
##############################################################################

check_backup_age() {
    log_section "Checking Backup Age"
    
    local latest_backup=$(find "$BACKUP_DIR" -type f -name "database_*.sql.gz" -o -name "media_*.tar.gz" | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backups found in $BACKUP_DIR"
        send_slack_alert "error" "No backups found in $BACKUP_DIR"
        return 1
    fi
    
    local backup_time=$(stat -c %Y "$latest_backup" 2>/dev/null || stat -f %m "$latest_backup")
    local current_time=$(date +%s)
    local age_seconds=$((current_time - backup_time))
    local age_days=$((age_seconds / 86400))
    
    log_info "Latest backup: $(basename $latest_backup)"
    log_info "Backup age: $age_days days"
    
    if [ $age_days -gt $CRITICAL_BACKUP_AGE_DAYS ]; then
        log_error "CRITICAL: Backup is $age_days days old (limit: $CRITICAL_BACKUP_AGE_DAYS days)"
        send_slack_alert "error" "CRITICAL: Last backup is $age_days days old"
        return 1
    elif [ $age_days -gt $WARNING_BACKUP_AGE_DAYS ]; then
        log_warning "WARNING: Backup is $age_days days old (limit: $WARNING_BACKUP_AGE_DAYS days)"
        send_slack_alert "warning" "Last backup is $age_days days old"
    else
        log_info "✓ Backup age is acceptable"
    fi
    
    return 0
}

##############################################################################
# BACKUP SIZE CHECK
##############################################################################

check_backup_size() {
    log_section "Checking Backup Size"
    
    local db_backups=$(find "$BACKUP_DIR" -type f -name "database_*.sql.gz" 2>/dev/null)
    local media_backups=$(find "$BACKUP_DIR" -type f -name "media_*.tar.gz" 2>/dev/null)
    
    local failed=0
    
    # Check database backups
    while IFS= read -r backup; do
        if [ -n "$backup" ]; then
            local size_bytes=$(stat --format=%s "$backup" 2>/dev/null || stat -f%z "$backup")
            local size_mb=$((size_bytes / 1024 / 1024))
            
            if [ $size_mb -lt $MIN_BACKUP_SIZE_MB ]; then
                log_error "Database backup too small: $(basename $backup) ($size_mb MB)"
                failed=1
            else
                log_info "✓ Database backup size OK: $(basename $backup) ($size_mb MB)"
            fi
        fi
    done <<< "$db_backups"
    
    # Check media backups
    while IFS= read -r backup; do
        if [ -n "$backup" ]; then
            local size_bytes=$(stat --format=%s "$backup" 2>/dev/null || stat -f%z "$backup")
            local size_mb=$((size_bytes / 1024 / 1024))
            
            log_info "Media backup: $(basename $backup) ($size_mb MB)"
        fi
    done <<< "$media_backups"
    
    return $failed
}

##############################################################################
# BACKUP INTEGRITY CHECK
##############################################################################

check_backup_integrity() {
    log_section "Checking Backup Integrity (Checksums)"
    
    local failed=0
    local checked=0
    local verified=0
    
    # Check all .sha256 files
    find "$BACKUP_DIR" -type f -name "*.sha256" | while read sha_file; do
        ((checked++))
        
        if sha256sum -c "$sha_file" >> "$REPORT_FILE" 2>&1; then
            log_info "✓ Checksum verified: $(dirname $sha_file | xargs basename)"
            ((verified++))
        else
            log_error "✗ Checksum failed: $(dirname $sha_file | xargs basename)"
            failed=1
        fi
    done
    
    if [ $checked -eq 0 ]; then
        log_warning "No checksum files found (*.sha256)"
    else
        log_info "$verified/$checked backups verified"
    fi
    
    return $failed
}

##############################################################################
# COMPRESSION TEST
##############################################################################

test_backup_compression() {
    log_section "Testing Backup Compression (Tar Integrity)"
    
    local failed=0
    
    # Test all tar.gz files
    find "$BACKUP_DIR" -type f -name "*.tar.gz" | while read tar_file; do
        if tar -tzf "$tar_file" > /dev/null 2>&1; then
            log_info "✓ Tar integrity OK: $(basename $tar_file)"
        else
            log_error "✗ Tar file corrupted: $(basename $tar_file)"
            failed=1
        fi
    done
    
    return $failed
}

##############################################################################
# DISK SPACE CHECK
##############################################################################

check_disk_space() {
    log_section "Checking Disk Space"
    
    local available=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local available_gb=$((available / 1024 / 1024))
    local total=$(df "$BACKUP_DIR" | awk 'NR==2 {print $2}')
    local total_gb=$((total / 1024 / 1024))
    local used=$(df "$BACKUP_DIR" | awk 'NR==2 {print $3}')
    local used_gb=$((used / 1024 / 1024))
    local usage_percent=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    
    log_info "Backup storage:"
    log_info "  Total: ${total_gb}GB"
    log_info "  Used: ${used_gb}GB ($usage_percent%)"
    log_info "  Available: ${available_gb}GB"
    
    # Thresholds
    if [ $usage_percent -gt 90 ]; then
        log_error "CRITICAL: Disk usage at ${usage_percent}% - May run out of space!"
        send_slack_alert "error" "CRITICAL: Backup disk usage at ${usage_percent}%"
        return 1
    elif [ $usage_percent -gt 75 ]; then
        log_warning "WARNING: Disk usage at ${usage_percent}%"
        send_slack_alert "warning" "Backup disk usage at ${usage_percent}%"
    else
        log_info "✓ Disk space usage acceptable"
    fi
    
    return 0
}

##############################################################################
# BACKUP RETENTION CHECK
##############################################################################

check_backup_retention() {
    log_section "Checking Backup Retention Policy"
    
    local daily_backups=$(find "$BACKUP_DIR" -type f -name "database_*.sql.gz" -mtime -30 | wc -l)
    local monthly_backups=$(find "$BACKUP_DIR" -type f -name "database_*.sql.gz" -mtime -365 | wc -l)
    
    log_info "Backups in last 30 days: $daily_backups"
    log_info "Backups in last 365 days: $monthly_backups"
    
    if [ $daily_backups -lt 20 ]; then
        log_warning "Low number of daily backups: $daily_backups (expected ~30)"
    else
        log_info "✓ Daily backup retention acceptable"
    fi
    
    return 0
}

##############################################################################
# RESTORE TEST (Weekly)
##############################################################################

test_restore() {
    log_section "Weekly Restore Test"
    
    # Only run on Sundays
    if [ "$(date +%A)" != "Sunday" ]; then
        log_info "Restore test skipped (runs weekly on Sunday)"
        return 0
    fi
    
    log_info "Running weekly restore test..."
    
    local latest_backup=$(find "$BACKUP_DIR" -type f -name "database_*.sql.gz" | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No database backup found for restore test"
        return 1
    fi
    
    # Test by extracting a small portion
    if zcat "$latest_backup" | head -100 > /dev/null 2>&1; then
        log_info "✓ Backup decompression test passed"
        return 0
    else
        log_error "✗ Backup decompression test failed"
        return 1
    fi
}

##############################################################################
# GENERATE REPORT
##############################################################################

generate_summary() {
    log_section "Backup Verification Summary"
    
    log_info "Report generated: $REPORT_FILE"
    log_info "Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    log_info "Backup location: $BACKUP_DIR"
    log_info "Verification timestamp: $TIMESTAMP"
}

##############################################################################
# MAIN
##############################################################################

main() {
    log_section "Backup Verification Report"
    log_info "Started at: $(date +'%Y-%m-%d %H:%M:%S')"
    log_info "Backup directory: $BACKUP_DIR"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        send_slack_alert "error" "Backup verification failed: directory not found"
        exit 1
    fi
    
    local failed=0
    
    # Run all checks
    check_backup_age || failed=1
    check_backup_size || failed=1
    check_backup_integrity || failed=1
    test_backup_compression || failed=1
    check_disk_space || failed=1
    check_backup_retention || failed=1
    test_restore || failed=1
    
    # Generate summary
    generate_summary
    
    if [ $failed -eq 0 ]; then
        log_section "✓ Verification Passed"
        send_slack_alert "success" "Backup verification completed successfully"
        exit 0
    else
        log_section "✗ Verification Failed"
        send_slack_alert "error" "Backup verification found issues. Check $REPORT_FILE"
        exit 1
    fi
}

main "$@"
