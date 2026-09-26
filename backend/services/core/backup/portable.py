"""Portable, encrypted database backups and a real restore test (P2).

Works on any host (no pg_dump needed): the whole database is written with Django's dumpdata, compressed, encrypted
with a key that lives only in the environment (BACKUP_ENCRYPTION_KEY, or one derived from SECRET_KEY), and stored in
the backup storage (an S3 bucket when configured, otherwise the media storage). The restore test loads a backup into a
new, empty database in a separate process and compares the number of records of every kind.
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import time
from datetime import timedelta
from pathlib import Path

from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.utils import timezone

from .models import BackupLog

EXCLUDE = ['contenttypes', 'auth.permission', 'sessions', 'admin.logentry', 'token_blacklist']
PREFIX = 'backups/'


def _derived(secret: str) -> Fernet:
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(('backup:' + secret).encode()).digest()))


def _fernet() -> MultiFernet:
    """Encrypts with the current key; still reads backups made with an earlier one (P7 key rotation):
    BACKUP_ENCRYPTION_KEY_FALLBACKS, and keys derived from the current and old SECRET_KEYs."""
    key = os.environ.get('BACKUP_ENCRYPTION_KEY', '').strip()
    keys = [Fernet(key.encode())] if key else []
    keys += [Fernet(k.strip().encode()) for k in os.environ.get('BACKUP_ENCRYPTION_KEY_FALLBACKS', '').split(',') if k.strip()]
    keys += [_derived(s) for s in [settings.SECRET_KEY, *getattr(settings, 'SECRET_KEY_FALLBACKS', [])]]
    return MultiFernet(keys)


def storage():
    """Where backups go: a private S3 bucket when configured (durable), otherwise the media storage."""
    bucket = os.environ.get('BACKUP_S3_BUCKET', '').strip()
    if bucket and os.environ.get('AWS_ACCESS_KEY_ID'):
        from storages.backends.s3 import S3Storage

        return S3Storage(bucket_name=bucket, default_acl='private', file_overwrite=False, querystring_auth=True)
    from django.core.files.storage import default_storage

    return default_storage


def durable() -> bool:
    return bool(os.environ.get('BACKUP_S3_BUCKET', '').strip() and os.environ.get('AWS_ACCESS_KEY_ID'))


def _dump() -> bytes:
    out = io.StringIO()
    # Links to Django's own tables (content types, permissions) by name, so they line up in any database.
    call_command('dumpdata', '--natural-foreign', *[f'--exclude={e}' for e in EXCLUDE], stdout=out)
    return out.getvalue().encode('utf-8')


def counts(raw_json: bytes) -> dict:
    tally = {}
    for obj in json.loads(raw_json):
        tally[obj['model']] = tally.get(obj['model'], 0) + 1
    return tally


def create(note='') -> BackupLog:
    started = time.monotonic()
    now = timezone.now()
    log = BackupLog.objects.create(backup_type='database', status='running', backup_path='', media_backed_up=False,
                                   retention_days=settings.BACKUP_RETENTION_DAYS,
                                   expires_at=now + timedelta(days=settings.BACKUP_RETENTION_DAYS))
    try:
        raw = _dump()
        tally = counts(raw)
        sealed = _fernet().encrypt(gzip.compress(raw, 6))
        name = storage().save(f'{PREFIX}db-{timezone.localtime(now):%Y%m%d-%H%M%S}.json.gz.enc', ContentFile(sealed))
        log.backup_path, log.size_bytes = name, len(sealed)
        log.checksum = hashlib.sha256(sealed).hexdigest()
        log.status, log.completed_at = 'success', timezone.now()
        log.duration_seconds = int(time.monotonic() - started)
        _set_notes(log, {'records': sum(tally.values()), 'kinds': len(tally), 'counts': tally, 'note': note, 'durable': durable()})
        log.save()
    except Exception as exc:
        log.status, log.error_message, log.completed_at = 'failed', str(exc)[:2000], timezone.now()
        log.save()
    return log


def _set_notes(log, data):
    log.metadata = data


def notes(log) -> dict:
    return log.metadata if isinstance(log.metadata, dict) else {}


def read(log) -> bytes:
    with storage().open(log.backup_path, 'rb') as fh:
        sealed = fh.read()
    if log.checksum and hashlib.sha256(sealed).hexdigest() != log.checksum:
        raise ValueError('The backup file has changed since it was made (checksum mismatch).')
    return gzip.decompress(_fernet().decrypt(sealed))


def latest_name() -> str:
    """The newest backup file in the backup storage (for staging, which has no backup records of its own)."""
    _dirs, files = storage().listdir(PREFIX.rstrip('/'))
    files = sorted(f for f in files if f.startswith('db-') and f.endswith('.json.gz.enc'))
    if not files:
        raise FileNotFoundError('No backups found in the backup storage.')
    return PREFIX + files[-1]


def read_named(name: str) -> bytes:
    with storage().open(name, 'rb') as fh:
        return gzip.decompress(_fernet().decrypt(fh.read()))


def verify(log, timeout=1800) -> dict:
    """Restore the backup into a new, empty SQLite database in a separate process, and compare record counts."""
    raw = read(log)
    expected = counts(raw)
    with tempfile.TemporaryDirectory() as tmp:
        fixture = Path(tmp) / 'backup.json'
        fixture.write_bytes(raw)
        db = Path(tmp) / 'restore.sqlite3'
        env = {**os.environ, 'USE_SQLITE': '1', 'SQLITE_PATH': str(db), 'DEBUG': '1', 'RESTORE_TEST': '1'}
        manage = Path(settings.BASE_DIR) / 'manage.py'
        # Build the tables, empty the rows that set-up creates (default school, plans...), then load the backup.
        for cmd in (['migrate', '--noinput', '-v', '0'], ['flush', '--noinput', '-v', '0'], ['loaddata', str(fixture), '-v', '0']):
            done = subprocess.run([sys.executable, str(manage), *cmd], env=env, capture_output=True, text=True, timeout=timeout,
                                  cwd=str(settings.BASE_DIR))
            if done.returncode != 0:
                raise RuntimeError(f'{cmd[0]} failed: {(done.stderr or done.stdout)[-800:]}')
        script = ('import json,sys,django;django.setup();from django.apps import apps;'
                  'print(json.dumps({f"{m._meta.app_label}.{m._meta.model_name}": m._base_manager.count() '
                  'for m in apps.get_models()}))')
        done = subprocess.run([sys.executable, '-c', script], env={**env, 'DJANGO_SETTINGS_MODULE': 'erp_core.settings'},
                              capture_output=True, text=True, timeout=600, cwd=str(settings.BASE_DIR))
        if done.returncode != 0:
            raise RuntimeError(f'counting failed: {done.stderr[-800:]}')
        restored = json.loads(done.stdout.strip().splitlines()[-1])
    missing = {k: (v, restored.get(k, 0)) for k, v in expected.items() if restored.get(k, 0) < v}
    result = {'records': sum(expected.values()), 'kinds': len(expected), 'missing': missing, 'ok': not missing}
    log.verified = result['ok']
    log.verified_at = timezone.now()
    n = notes(log)
    n['restore_test'] = {**result, 'at': timezone.now().isoformat()}
    _set_notes(log, n)
    log.save()
    return result


def prune() -> int:
    """Delete backups past their retention date (their files and log rows)."""
    removed = 0
    for log in BackupLog.objects.filter(expires_at__lt=timezone.now(), cleanup_completed=False):
        try:
            if log.backup_path and log.backup_path.startswith(PREFIX):
                storage().delete(log.backup_path)
        except Exception:
            pass
        log.cleanup_completed = True
        log.save(update_fields=['cleanup_completed'])
        removed += 1
    return removed
