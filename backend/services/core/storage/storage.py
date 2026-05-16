"""
High-level storage service: upload, signed URLs, delete, temp cleanup.
"""

from __future__ import annotations

import logging
import uuid
from typing import BinaryIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from .backends import get_storage_for_bucket
from .models import StoredFile
from .utils import (
    build_invoice_pdf_key,
    build_report_key,
    build_student_profile_key,
    build_student_thumbnail_key,
    build_temp_key,
    optimize_profile_image,
    resolve_tenant_code,
    scan_file_for_virus,
    validate_upload,
)

logger = logging.getLogger('erp.storage')


class StorageService:
    """Facade for tenant-scoped object storage."""

    def __init__(self, bucket_type: str = 'media'):
        self.bucket_type = bucket_type
        self.storage = get_storage_for_bucket(bucket_type)

    def upload(
        self,
        file_obj: BinaryIO,
        filename: str,
        storage_key: str,
        *,
        user=None,
        content_type: str | None = None,
        is_public: bool = False,
        related_model: str = '',
        related_id=None,
        run_virus_scan: bool = True,
    ) -> StoredFile:
        validated = validate_upload(file_obj, filename, declared_content_type=content_type)
        if run_virus_scan and not scan_file_for_virus(file_obj, filename=filename):
            from django.core.exceptions import ValidationError
            raise ValidationError('File failed virus scan.')

        file_obj.seek(0)
        saved_name = self.storage.save(storage_key, ContentFile(file_obj.read()))
        tenant_code = storage_key.split('/')[1] if storage_key.startswith('tenant/') else 'default'

        record, _ = StoredFile.objects.update_or_create(
            storage_key=saved_name,
            defaults={
                'tenant_code': tenant_code,
                'bucket_type': self.bucket_type,
                'original_name': validated.name,
                'content_type': validated.content_type,
                'size_bytes': validated.size,
                'is_public': is_public,
                'uploaded_by': user,
                'related_model': related_model,
                'related_id': related_id,
            },
        )
        return record

    def upload_student_profile(
        self,
        file_obj: BinaryIO,
        filename: str,
        *,
        student,
        user=None,
    ) -> tuple[StoredFile, StoredFile]:
        tenant = resolve_tenant_code(instance=student, user=user)
        profile_buf, thumb_buf = optimize_profile_image(file_obj)
        profile_key = build_student_profile_key(tenant, student.id, 'webp')
        thumb_key = build_student_thumbnail_key(tenant, student.id)

        profile_record = self.upload(
            profile_buf,
            'profile.webp',
            profile_key,
            user=user,
            content_type='image/webp',
            related_model='education_students.Student',
            related_id=student.id,
            run_virus_scan=False,
        )
        thumb_record = self.upload(
            thumb_buf,
            'profile_thumb.webp',
            thumb_key,
            user=user,
            content_type='image/webp',
            related_model='education_students.Student',
            related_id=student.id,
            run_virus_scan=False,
        )
        return profile_record, thumb_record

    def upload_invoice_pdf(
        self,
        file_obj: BinaryIO,
        *,
        tenant_code: str,
        year: int,
        invoice_id: uuid.UUID,
        user=None,
    ) -> StoredFile:
        key = build_invoice_pdf_key(tenant_code, year, invoice_id)
        return self.upload(
            file_obj,
            f'{invoice_id}.pdf',
            key,
            user=user,
            content_type='application/pdf',
            related_model='education_finance.Invoice',
            related_id=invoice_id,
        )

    def upload_report(
        self,
        file_obj: BinaryIO,
        filename: str,
        *,
        tenant_code: str,
        month: str | None = None,
        user=None,
    ) -> StoredFile:
        month = month or timezone.now().strftime('%Y-%m')
        key = build_report_key(tenant_code, month, filename)
        reports = StorageService(bucket_type='reports')
        return reports.upload(
            file_obj,
            filename,
            key,
            user=user,
            related_model='report',
        )

    def get_signed_download_url(
        self,
        storage_key: str,
        *,
        expires_in: int | None = None,
    ) -> str:
        expires = expires_in or int(getattr(settings, 'STORAGE_SIGNED_URL_EXPIRY', 3600))
        if hasattr(self.storage, 'url'):
            try:
                return self.storage.url(storage_key, expire=expires)
            except TypeError:
                return self.storage.url(storage_key)
        return self.storage.url(storage_key)

    def delete(self, storage_key: str) -> None:
        if self.storage.exists(storage_key):
            self.storage.delete(storage_key)
        StoredFile.objects.filter(storage_key=storage_key).delete()

    def upload_temp(
        self,
        file_obj: BinaryIO,
        filename: str,
        *,
        tenant_code: str,
        user=None,
    ) -> StoredFile:
        upload_id = uuid.uuid4().hex
        key = build_temp_key(tenant_code, upload_id, filename)
        return self.upload(
            file_obj,
            filename,
            key,
            user=user,
            related_model='temp',
        )


def get_media_service() -> StorageService:
    return StorageService('media')
