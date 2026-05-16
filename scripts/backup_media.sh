#!/bin/bash
##############################################################################
# Media Files Incremental Backup Script
# Purpose: Daily incremental backup of user-uploaded media files
# Usage: ./backup_media.sh [backup_dir] [keep_days]
##############################################################################

set -e

BACKUP_DIR="${1:-/backups/media}"
KEEP_DAYS="${2:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${3:-/var/log/media_backup.log}"

# Media configuration
MEDIA_ROOT="${MEDIA_ROOT:-/app/media}"
SNAPSHOT_DIR="$BACKUP_DIR/.snapshots"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$BACKUP_DIR"
mkdir -p "$SNAPSHOT_DIR"

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
# FULL MEDIA BACKUP
##############################################################################

backup_full() {
    log_info "Starting full media backup..."
    
    if [ ! -d "$MEDIA_ROOT" ]; then
        log_warning "Media directory not found: $MEDIA_ROOT"
        return 0
    fi
    
    local backup_file="$BACKUP_DIR/media_full_${TIMESTAMP}.tar.gz"
    
    if tar -czf "$backup_file" \
        --exclude='*.tmp' \
        --exclude='*.lock' \
        -C "$(dirname $MEDIA_ROOT)" "$(basename $MEDIA_ROOT)" 2>/dev/null; then
        
        local size=$(du -h "$backup_file" | cut -f1)
        local file_count=$(find "$MEDIA_ROOT" -type f | wc -l)
        
        log_info "Full media backup completed: $size ($file_count files)"
        
        # Generate checksum
        sha256sum "$backup_file" > "$backup_file.sha256"
        
        # Store reference for incremental backups
        find "$MEDIA_ROOT" -type f -printf '%T@ %p\n' | sort -rn > "$SNAPSHOT_DIR/files_${TIMESTAMP}.snapshot"
        
        # Metadata
        cat > "$backup_file.meta" << EOF
timestamp=$TIMESTAMP
type=full
size=$(stat --format=%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")
file_count=$file_count
media_root=$MEDIA_ROOT
EOF
        
        return 0
    else
        log_error "Full media backup failed"
        return 1
    fi
}

##############################################################################
# INCREMENTAL MEDIA BACKUP (Changes since last backup)
##############################################################################

backup_incremental() {
    log_info "Starting incremental media backup..."
    
    if [ ! -d "$MEDIA_ROOT" ]; then
        log_warning "Media directory not found: $MEDIA_ROOT"
        return 0
    fi
    
    # Get the last snapshot file
    local last_snapshot=$(ls -t "$SNAPSHOT_DIR"/*.snapshot 2>/dev/null | head -1)
    
    if [ -z "$last_snapshot" ]; then
        log_info "No previous snapshot found, performing full backup instead"
        return $(backup_full)
    fi
    
    # Find files modified since last snapshot
    local backup_file="$BACKUP_DIR/media_incr_${TIMESTAMP}.tar.gz"
    local temp_file_list="/tmp/media_changes_$$.txt"
    
    # Get modification time of last snapshot
    local last_backup_time=$(stat -c %Y "$last_snapshot" 2>/dev/null || stat -f "%m" "$last_snapshot")
    
    # Find files modified since last backup
    find "$MEDIA_ROOT" -type f -newermt "@$last_backup_time" -printf '%p\n' > "$temp_file_list"
    
    local file_count=$(wc -l < "$temp_file_list")
    
    if [ "$file_count" -eq 0 ]; then
        log_info "No file changes since last backup"
        rm -f "$temp_file_list"
        return 0
    fi
    
    # Create incremental backup with changed files only
    if tar -czf "$backup_file" \
        -T "$temp_file_list" \
        --exclude='*.tmp' \
        --exclude='*.lock' 2>/dev/null; then
        
        local size=$(du -h "$backup_file" | cut -f1)
        log_info "Incremental backup completed: $size ($file_count changed files)"
        
        # Generate checksum
        sha256sum "$backup_file" > "$backup_file.sha256"
        
        # Update snapshot
        find "$MEDIA_ROOT" -type f -printf '%T@ %p\n' | sort -rn > "$SNAPSHOT_DIR/files_${TIMESTAMP}.snapshot"
        
        # Metadata
        cat > "$backup_file.meta" << EOF
timestamp=$TIMESTAMP
type=incremental
size=$(stat --format=%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")
file_count=$file_count
media_root=$MEDIA_ROOT
EOF
        
        rm -f "$temp_file_list"
        return 0
    else
        log_error "Incremental media backup failed"
        rm -f "$temp_file_list"
        return 1
    fi
}

##############################################################################
# VERIFY BACKUP INTEGRITY
##############################################################################

verify_backup() {
    log_info "Verifying media backup..."
    
    local backup_file="$BACKUP_DIR"/media_*_${TIMESTAMP}.tar.gz
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found for verification"
        return 1
    fi
    
    # Verify checksum
    if [ -f "$backup_file.sha256" ]; then
        if sha256sum -c "$backup_file.sha256" >> "$LOG_FILE" 2>&1; then
            log_info "Backup checksum verified"
        else
            log_error "Backup checksum verification failed"
            return 1
        fi
    fi
    
    # Test tar integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        log_info "Tar file integrity verified"
    else
        log_error "Tar file is corrupted"
        return 1
    fi
    
    return 0
}

##############################################################################
# CLEANUP OLD BACKUPS
##############################################################################

cleanup_old_backups() {
    log_info "Cleaning up media backups older than $KEEP_DAYS days..."
    
    local count=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "media_*.tar.gz" -mtime +$KEEP_DAYS | wc -l)
    
    find "$BACKUP_DIR" -maxdepth 1 -type f -name "media_*.tar.gz" -mtime +$KEEP_DAYS -delete
    find "$BACKUP_DIR" -maxdepth 1 -type f -name "media_*.tar.gz.sha256" -mtime +$KEEP_DAYS -delete
    find "$BACKUP_DIR" -maxdepth 1 -type f -name "media_*.tar.gz.meta" -mtime +$KEEP_DAYS -delete
    
    # Cleanup old snapshots (keep last 10)
    ls -t "$SNAPSHOT_DIR"/*.snapshot 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    log_info "Deleted $count old backup files"
}

##############################################################################
# MONITOR STORAGE
##############################################################################

monitor_storage() {
    log_info "Media backup statistics:"
    
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local file_count=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "media_*.tar.gz" | wc -l)
    
    echo "  Total backup size: $total_size" >> "$LOG_FILE"
    echo "  Backup file count: $file_count" >> "$LOG_FILE"
    
    # Disk space warning
    local available=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local available_gb=$((available / 1024 / 1024))
    
    if [ "$available_gb" -lt 50 ]; then
        log_warning "Low disk space: only ${available_gb}GB available"
    fi
    
    log_info "Storage stats logged"
}

##############################################################################
# MAIN
##############################################################################

main() {
    log_info "=========================================="
    log_info "Media Backup Started: $TIMESTAMP"
    log_info "Media Root: $MEDIA_ROOT"
    log_info "Backup Dir: $BACKUP_DIR"
    log_info "=========================================="
    
    local failed=0
    
    # Determine backup type (full on Sundays, incremental otherwise)
    if [ "$(date +%A)" = "Sunday" ]; then
        log_info "Sunday backup - performing full backup"
        backup_full || ((failed++))
    else
        log_info "Weekday backup - performing incremental backup"
        backup_incremental || ((failed++))
    fi
    
    # Verify backup
    verify_backup || ((failed++))
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Log statistics
    monitor_storage
    
    if [ $failed -eq 0 ]; then
        log_info "=========================================="
        log_info "✓ Media backup completed successfully"
        log_info "=========================================="
        exit 0
    else
        log_error "=========================================="
        log_error "✗ Media backup completed with $failed errors"
        log_error "=========================================="
        exit 1
    fi
}

main "$@"
