"""Celery tasks for storage maintenance."""

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger('erp.storage.tasks')


@shared_task(name='services.core.storage.tasks.cleanup_temp_files')
def cleanup_temp_files():
    from .models import StoredFile
    from .storage import StorageService

    max_age_hours = int(getattr(settings, 'STORAGE_TEMP_MAX_AGE_HOURS', 24))
    cutoff = timezone.now() - timedelta(hours=max_age_hours)
    qs = StoredFile.objects.filter(related_model='temp', created_at__lt=cutoff)
    service = StorageService('media')
    removed = 0
    for record in qs.iterator():
        service.delete(record.storage_key)
        removed += 1
    logger.info('cleanup_temp_files removed=%s', removed)
    return {'removed': removed}
