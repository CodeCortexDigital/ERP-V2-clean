"""Encrypted backups and the restore test (P2)."""
import gzip
import json
import os
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.backup import portable
from services.core.backup.models import BackupLog
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def bk(db, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    return dict(s=s, office=_client(admin), owner=_client(owner))


@pytest.mark.django_db
def test_backup_is_complete_encrypted_and_checked(bk):
    log = portable.create(note='test')
    assert log.status == 'success' and log.backup_path.startswith('backups/') and log.checksum
    with portable.storage().open(log.backup_path, 'rb') as fh:
        sealed = fh.read()
    assert b'Hillside School' not in sealed  # encrypted at rest
    with pytest.raises(Exception):
        gzip.decompress(sealed)
    raw = portable.read(log)
    models = {o['model'] for o in json.loads(raw)}
    assert 'core_tenants.school' in models and 'core_accounts.user' in models
    assert not any(m.startswith('contenttypes.') or m == 'sessions.session' for m in models)
    info = portable.notes(log)
    assert info['records'] == len(json.loads(raw)) and info['durable'] is False
    # A changed file is refused.
    from django.core.files.base import ContentFile

    portable.storage().delete(log.backup_path)
    tampered = portable.storage().save(log.backup_path, ContentFile(sealed[:-5] + b'xxxxx'))
    log.backup_path = tampered
    with pytest.raises(ValueError):
        portable.read(log)


@pytest.mark.django_db
def test_prune_and_who_may_see_backups(bk):
    old = portable.create()
    BackupLog.objects.filter(pk=old.pk).update(expires_at=timezone.now() - timedelta(days=1))
    keep = portable.create()
    assert portable.prune() == 1
    assert BackupLog.objects.get(pk=old.pk).cleanup_completed and not BackupLog.objects.get(pk=keep.pk).cleanup_completed
    assert not portable.storage().exists(BackupLog.objects.get(pk=old.pk).backup_path)
    assert bk['office'].get('/api/v1/backups/').status_code == 403
    data = bk['owner'].get('/api/v1/backups/').json()
    assert data['durable'] is False and data['last_backup_hours_ago'] is not None
    r = bk['owner'].post('/api/v1/backups/')
    assert r.status_code == 201 and r.json()['backup']['records'] > 0


@pytest.mark.django_db
@pytest.mark.skipif(os.environ.get('RUN_SLOW') != '1', reason='restore test takes minutes; set RUN_SLOW=1')
def test_a_backup_restores_into_an_empty_database(bk):
    log = portable.create()
    result = portable.verify(log)
    assert result['ok'] and result['records'] > 0 and BackupLog.objects.get(pk=log.pk).verified
