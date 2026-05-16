#!/bin/bash
# Shared backup utilities (sourced by backup scripts)

write_checksums() {
  local file="$1"
  [ -f "$file" ] || return 1
  if command -v md5sum >/dev/null 2>&1; then
    md5sum "$file" > "${file}.md5"
  elif command -v md5 >/dev/null 2>&1; then
    md5 -q "$file" | awk '{print $1 " '"$file"'"}' > "${file}.md5"
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" > "${file}.sha256"
  fi
}

verify_checksums() {
  local dir="$1"
  local failed=0
  for checksum in "$dir"/*.md5; do
    [ -e "$checksum" ] || continue
    if command -v md5sum >/dev/null 2>&1; then
      md5sum -c "$checksum" >/dev/null 2>&1 || failed=1
    fi
  done
  for checksum in "$dir"/*.sha256; do
    [ -e "$checksum" ] || continue
    sha256sum -c "$checksum" >/dev/null 2>&1 || failed=1
  done
  return $failed
}

upload_backup_to_s3() {
  local source_dir="$1"
  local bucket="${AWS_S3_BUCKET:-$BACKUP_S3_BUCKET}"
  local region="${AWS_DEFAULT_REGION:-us-east-1}"
  local prefix="${AWS_S3_PREFIX:-backups}"

  if [ -z "$bucket" ]; then
    return 0
  fi
  if ! command -v aws >/dev/null 2>&1; then
    return 0
  fi

  local s3_path="s3://${bucket}/${prefix}/$(date +%Y/%m/%d)/$(basename "$source_dir")/"
  aws s3 sync "$source_dir" "$s3_path" \
    --region "$region" \
    --sse AES256 \
    --storage-class STANDARD \
    --only-show-errors

  # Tag for lifecycle: daily -> monthly -> yearly via S3 rules on prefix
  aws s3api put-object-tagging \
    --bucket "$bucket" \
    --key "${prefix}/$(date +%Y/%m/%d)/$(basename "$source_dir")/" \
    --tagging "TagSet=[{Key=backup-tier,Value=daily},{Key=encrypted,Value=aes256}]" \
    2>/dev/null || true
}

send_slack_notification() {
  local status="$1"
  local message="$2"
  local webhook="${SLACK_WEBHOOK_URL:-}"

  [ -n "$webhook" ] || return 0

  local color="good"
  [ "$status" = "success" ] && color="good" || color="danger"

  curl -s -X POST "$webhook" \
    -H 'Content-Type: application/json' \
    -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Backup $status\",\"text\":\"$message\"}]}" >/dev/null || true
}
