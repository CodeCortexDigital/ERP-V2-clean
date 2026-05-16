# Disaster Recovery Plan — ERP V2 Production

## Objectives

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | **4 hours** |
| **RPO** (Recovery Point Objective) | **24 hours** (daily backup at 02:00) |

## Architecture

- **Primary region**: application + PostgreSQL + Redis + local/S3 backups
- **Standby region**: `BACKUP_STANDBY_REGION` — restore latest S3 backup to standby RDS/EC2
- **Encryption**: AES-256 (S3 SSE-S3, optional KMS)
- **Integrity**: MD5 + SHA256 checksums per artifact

## Automated backup schedule

| Component        | Schedule        | Script / command              |
|------------------|-----------------|-------------------------------|
| PostgreSQL       | Daily 02:00     | `scripts/backup_db.sh`        |
| Media (incr.)    | Daily 02:00     | `scripts/backup_media.sh`     |
| Redis            | Daily 02:00     | `scripts/backup.sh`           |
| Configuration    | Daily 02:00     | `scripts/backup.sh`           |
| Verification     | Weekly (Sunday) | `scripts/verify_backup.sh`    |
| CI backup        | Daily 02:00 UTC | `.github/workflows/backup.yml`|

## Recovery procedures

### 1. Full system restore

```bash
export DB_PASSWORD=... AWS_S3_BUCKET=...
aws s3 sync s3://$BACKUP_S3_BUCKET/backups/YYYY/MM/DD/backup_TIMESTAMP/ /restore/
./scripts/restore.sh backup_TIMESTAMP full
```

### 2. Database only

```bash
./scripts/restore_db.sh /backups/database/full_YYYYMMDD.sql.gz erp_core_restored
# After validation:
# Answer "yes" to promote restored DB to production (restore_db.sh)
```

### 3. Point-in-time recovery (PITR)

Requires WAL archiving on PostgreSQL:

1. Set `archive_mode = on`, `archive_command` → `WAL_ARCHIVE_DIR`
2. Enable `ENABLE_BASEBACKUP=true` in `backup_db.sh`
3. Restore base backup, then replay WAL to `RECOVERY_TIME`:

```bash
./scripts/restore_db.sh /backups/database/basebackup_TS erp_restored '2026-05-16 12:00:00'
```

### 4. Single-tenant restore

```bash
./scripts/restore_tenant.sh <tenant-uuid> /backups/database/full_*.sql.gz
python manage.py restore_tenant <tenant-uuid> --backup-file /backups/...
```

### 5. Media restore

```bash
./scripts/restore.sh backup_TIMESTAMP media
```

## Failover to standby region (RTO ≤ 4h)

| Step | Action | Owner | ETA |
|------|--------|-------|-----|
| 1 | Declare incident, notify stakeholders | Ops lead | 0:00 |
| 2 | Confirm primary region unavailable | Ops | 0:15 |
| 3 | Pull latest backup from S3 (`aws s3 sync`) | Ops | 0:45 |
| 4 | Provision / start standby DB (RDS restore or EC2) | Ops | 1:30 |
| 5 | Run `restore_db.sh` + `restore.sh` on standby | Ops | 2:30 |
| 6 | Update DNS / ALB to standby region | Ops | 3:00 |
| 7 | Run post-restore checklist (below) | Dev + Ops | 4:00 |

## Post-restore checklist

- [ ] Database connections and migrations
- [ ] Login and tenant isolation verified
- [ ] Student, attendance, finance smoke tests
- [ ] `/api/v1/health/` and `/api/v1/metrics/backup/` green
- [ ] Celery workers and Redis restarted
- [ ] Sentry/monitoring active
- [ ] Resume `0 2 * * *` backup cron
- [ ] Incident postmortem documented

## Monitoring & alerts

- Prometheus: `backup_age_hours`, `backup_size_bytes`, `backup_failures_total`
- Endpoint: `GET /api/v1/metrics/backup/`
- Slack: `SLACK_WEBHOOK_URL` on backup/verify failure
- Alert if backup age > 26h (warning) or > 48h (critical)

## Contacts

Configure in `DisasterRecoveryPlan` model (`notification_emails`, `slack_webhook_url`) via Django admin after migration.
