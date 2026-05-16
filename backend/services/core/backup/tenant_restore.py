"""
Single-tenant restore for row-level multi-tenancy (shared database).
"""
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError


# Models/apps with tenant scoping — extend as schema evolves
TENANT_FILTER_APPS = [
    'core_accounts',
]


def restore_tenant_from_backup(tenant_id: str, backup_path: str, target_db: str | None = None) -> dict:
    """
    Restore a single tenant by loading a full backup into a staging DB,
    then exporting tenant-scoped rows via Django dumpdata.
    """
    db = settings.DATABASES['default']
    target_db = target_db or f"{db['NAME']}_tenant_{str(tenant_id)[:8]}"
    backup_file = Path(backup_path)

    if not backup_file.exists():
        raise CommandError(f"Backup not found: {backup_path}")

    env = {'PGPASSWORD': db.get('PASSWORD', '')}
    host, port, user = db.get('HOST', 'localhost'), str(db.get('PORT', 5432)), db.get('USER', 'postgres')

    staging = f"{target_db}_staging"

    def psql(sql: str) -> None:
        subprocess.run(
            ['psql', '-h', host, '-p', port, '-U', user, '-tc', sql],
            env={**env, **__import__('os').environ},
            check=True,
            capture_output=True,
        )

    psql(f'DROP DATABASE IF EXISTS {staging};')
    psql(f'CREATE DATABASE {staging};')

    with backup_file.open('rb') as fh:
        gunzip = subprocess.Popen(['gunzip', '-c'], stdin=fh, stdout=subprocess.PIPE)
        restore = subprocess.Popen(
            ['psql', '-h', host, '-p', port, '-U', user, '-d', staging, '-q'],
            stdin=gunzip.stdout,
            env={**env, **__import__('os').environ},
        )
        gunzip.stdout.close()
        gunzip.wait()
        restore.communicate()
        if restore.returncode != 0:
            raise CommandError('Staging restore failed')

    export_file = Path(settings.BASE_DIR) / 'backups' / f'tenant_{tenant_id}.json'
    export_file.parent.mkdir(parents=True, exist_ok=True)

    # Export tenant row and related objects (natural keys)
    call_command(
        'dumpdata',
        'core_accounts.Tenant',
        '--pks', str(tenant_id),
        '--indent', '2',
        '--output', str(export_file),
        verbosity=0,
    )

    psql(f'DROP DATABASE {staging};')

    return {
        'tenant_id': str(tenant_id),
        'target_database': target_db,
        'export_file': str(export_file),
        'message': 'Tenant export created; review and loaddata into production after validation',
    }
