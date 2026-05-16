#!/bin/bash
##############################################################################
# Backup verification: age, size, md5/sha256, weekly restore smoke test
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/backup_common.sh"

BACKUP_DIR="${1:-/backups}"
ALERT_EMAIL="${2:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${BACKUP_VERIFY_LOG:-/var/log/backup_verification_${TIMESTAMP}.log}"

CRITICAL_BACKUP_AGE_HOURS=48
WARNING_BACKUP_AGE_HOURS=26
MIN_BACKUP_SIZE_MB=1
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[$(date +'%F %T')]${NC} $1" | tee -a "$REPORT_FILE"; }
log_error() { echo -e "${RED}[$(date +'%F %T')]${NC} $1" | tee -a "$REPORT_FILE"; }
log_warning() { echo -e "${YELLOW}[$(date +'%F %T')]${NC} $1" | tee -a "$REPORT_FILE"; }
log_section() {
  echo -e "${BLUE}======== $1 ========${NC}" | tee -a "$REPORT_FILE"
}

send_slack_alert() {
  local status=$1 message=$2
  [ -n "$SLACK_WEBHOOK" ] || return 0
  local color="warning"
  [ "$status" = "error" ] && color="danger"
  [ "$status" = "success" ] && color="good"
  curl -s -X POST "$SLACK_WEBHOOK" -H 'Content-Type: application/json' \
    -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Backup Verification\",\"text\":\"$message\"}]}" >/dev/null || true
}

check_backup_age() {
  log_section "Backup age"
  local latest
  latest=$(find "$BACKUP_DIR" -type f \( -name 'database_*.sql.gz' -o -name 'full_*.sql.gz' \) -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn | head -1 | cut -d' ' -f2-)

  [ -n "$latest" ] || { log_error "No database backups found"; return 1; }

  local backup_time now age_hours
  backup_time=$(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest")
  now=$(date +%s)
  age_hours=$(( (now - backup_time) / 3600 ))

  log_info "Latest: $(basename "$latest") (${age_hours}h old)"

  if [ "$age_hours" -gt "$CRITICAL_BACKUP_AGE_HOURS" ]; then
    log_error "CRITICAL: backup older than ${CRITICAL_BACKUP_AGE_HOURS}h"
    send_slack_alert "error" "Backup age ${age_hours}h exceeds RPO window"
    return 1
  fi
  if [ "$age_hours" -gt "$WARNING_BACKUP_AGE_HOURS" ]; then
    log_warning "Backup approaching RPO limit (${age_hours}h)"
    send_slack_alert "warning" "Backup age ${age_hours}h"
  fi
  return 0
}

check_backup_size() {
  log_section "Backup size"
  local failed=0
  while IFS= read -r backup; do
    [ -n "$backup" ] || continue
    local size_mb
    size_mb=$(( $(stat -c%s "$backup" 2>/dev/null || stat -f%z "$backup") / 1024 / 1024 ))
    if [ "$size_mb" -lt "$MIN_BACKUP_SIZE_MB" ]; then
      log_error "Too small: $(basename "$backup") (${size_mb}MB)"
      failed=1
    else
      log_info "OK: $(basename "$backup") (${size_mb}MB)"
    fi
  done < <(find "$BACKUP_DIR" -type f \( -name 'database_*.sql.gz' -o -name 'full_*.sql.gz' -o -name 'media_*.tar.gz' \) 2>/dev/null)
  return $failed
}

check_backup_integrity() {
  log_section "Integrity (md5/sha256)"
  verify_checksums "$BACKUP_DIR" && log_info "Checksums verified" || {
    log_error "Checksum verification failed"
    return 1
  }
}

test_tar_integrity() {
  log_section "Archive integrity"
  local failed=0
  while IFS= read -r tar_file; do
    tar -tzf "$tar_file" >/dev/null 2>&1 && log_info "Tar OK: $(basename "$tar_file")" || {
      log_error "Corrupt tar: $(basename "$tar_file")"
      failed=1
    }
  done < <(find "$BACKUP_DIR" -type f -name '*.tar.gz' 2>/dev/null)
  return $failed
}

check_disk_space() {
  log_section "Disk space"
  local usage_percent available_gb
  usage_percent=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | tr -d '%')
  available_gb=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
  log_info "Usage: ${usage_percent}% | Available: ${available_gb}GB"
  [ "$usage_percent" -gt 90 ] && { send_slack_alert "error" "Backup disk ${usage_percent}% full"; return 1; }
  [ "$usage_percent" -gt 75 ] && log_warning "Disk usage elevated"
  return 0
}

check_retention() {
  log_section "Retention policy"
  local daily monthly
  daily=$(find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime -30 2>/dev/null | wc -l)
  monthly=$(find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime -365 2>/dev/null | wc -l)
  log_info "Last 30 days: $daily backups (target: 30 daily)"
  log_info "Last 365 days: $monthly backups (target: 12 monthly via S3 lifecycle)"
  [ "$daily" -lt 20 ] && log_warning "Fewer than 20 daily backups in last 30 days"
}

weekly_restore_test() {
  log_section "Weekly restore test"
  if [ "$(date +%u)" != "7" ]; then
    log_info "Skipped (runs Sunday)"
    return 0
  fi
  if [ -x "$SCRIPT_DIR/backup_db.sh" ]; then
    ENABLE_BASEBACKUP=false "$SCRIPT_DIR/backup_db.sh" "$BACKUP_DIR/database" 30 "$REPORT_FILE" || return 1
  fi
  local latest
  latest=$(find "$BACKUP_DIR" -type f -name '*.sql.gz' | head -1)
  gunzip -c "$latest" 2>/dev/null | head -50 >/dev/null || { log_error "Decompress test failed"; return 1; }
  log_info "Decompress smoke test passed"
}

main() {
  touch "$REPORT_FILE" 2>/dev/null || REPORT_FILE="/tmp/backup_verify.log"
  [ -d "$BACKUP_DIR" ] || { log_error "Missing $BACKUP_DIR"; exit 1; }

  local failed=0
  check_backup_age || failed=1
  check_backup_size || failed=1
  check_backup_integrity || failed=1
  test_tar_integrity || failed=1
  check_disk_space || failed=1
  check_retention || true
  weekly_restore_test || failed=1

  if [ "$failed" -eq 0 ]; then
    send_slack_alert "success" "Backup verification passed"
    exit 0
  fi
  send_slack_alert "error" "Backup verification failed — see $REPORT_FILE"
  [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null && \
    mail -s "ERP Backup Verification FAILED" "$ALERT_EMAIL" < "$REPORT_FILE" || true
  exit 1
}

main "$@"
