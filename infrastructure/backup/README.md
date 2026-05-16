# Backup infrastructure

## S3 bucket setup

```bash
aws s3api create-bucket --bucket "$BACKUP_S3_BUCKET" --region us-east-1
aws s3api put-bucket-encryption --bucket "$BACKUP_S3_BUCKET" --server-side-encryption-configuration '{
  "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
}'
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BACKUP_S3_BUCKET" \
  --lifecycle-configuration file://infrastructure/backup/s3-lifecycle-policy.json
```

## Retention targets

| Tier    | Count | Storage transition      |
|---------|-------|-------------------------|
| Daily   | 30    | S3 Standard (0–30 days) |
| Monthly | 12    | Glacier (~90 days)      |
| Yearly  | 7     | Deep Archive (365+ days)|

## Production cron (02:00 daily)

```cron
0 2 * * * cd /app && ./scripts/backup.sh /backups 30 >> /var/log/erp_backup.log 2>&1
0 3 * * 0 cd /app && ./scripts/verify_backup.sh /backups >> /var/log/backup_verify.log 2>&1
```
