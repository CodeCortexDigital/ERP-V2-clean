"""
Path builders, validation, image optimization, and virus-scan hook.
"""

from __future__ import annotations

import logging
import mimetypes
import os
import subprocess
import uuid
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from typing import BinaryIO

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger('erp.storage')

ALLOWED_EXTENSIONS = frozenset({'pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'})
ALLOWED_MIME_TYPES = frozenset({
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
})

MAX_IMAGE_BYTES = int(getattr(settings, 'STORAGE_MAX_IMAGE_BYTES', 10 * 1024 * 1024))
MAX_PDF_BYTES = int(getattr(settings, 'STORAGE_MAX_PDF_BYTES', 5 * 1024 * 1024))
MAX_DOCUMENT_BYTES = int(getattr(settings, 'STORAGE_MAX_DOCUMENT_BYTES', 10 * 1024 * 1024))

PROFILE_SIZE = getattr(settings, 'STORAGE_PROFILE_SIZE', (200, 200))
THUMBNAIL_SIZE = getattr(settings, 'STORAGE_THUMBNAIL_SIZE', (50, 50))
JPEG_QUALITY = int(getattr(settings, 'STORAGE_JPEG_QUALITY', 80))


@dataclass
class ValidatedFile:
    name: str
    extension: str
    content_type: str
    size: int
    category: str  # image | pdf | document


def resolve_tenant_code(*, user=None, tenant=None, instance=None, fallback: str | None = None) -> str:
    """Tenant path segment — uses subdomain as tenant_code."""
    if tenant is not None:
        return getattr(tenant, 'subdomain', None) or getattr(tenant, 'tenant_code', None) or 'default'
    if user is not None and hasattr(user, 'metadata') and isinstance(user.metadata, dict):
        code = user.metadata.get('tenant_code') or user.metadata.get('tenant_subdomain')
        if code:
            return str(code)
    if instance is not None:
        if hasattr(instance, 'tenant') and instance.tenant_id:
            tenant = instance.tenant
            return getattr(tenant, 'tenant_code', None) or str(instance.tenant_id)
        if hasattr(instance, 'tenant_id') and instance.tenant_id:
            return str(instance.tenant_id)
    return fallback or getattr(settings, 'DEFAULT_TENANT_CODE', 'default')


def build_student_profile_key(tenant_code: str, student_id: uuid.UUID | str, ext: str = 'webp') -> str:
    ext = ext.lstrip('.').lower() or 'webp'
    return f'tenant/{tenant_code}/students/{student_id}/profile.{ext}'


def build_student_thumbnail_key(tenant_code: str, student_id: uuid.UUID | str) -> str:
    return f'tenant/{tenant_code}/students/{student_id}/profile_thumb.webp'


def build_invoice_pdf_key(tenant_code: str, year: int, invoice_id: uuid.UUID | str) -> str:
    return f'tenant/{tenant_code}/invoices/{year}/{invoice_id}.pdf'


def build_report_key(tenant_code: str, month: str, filename: str) -> str:
    safe = os.path.basename(filename)
    return f'tenant/{tenant_code}/reports/{month}/{safe}'


def build_temp_key(tenant_code: str, upload_id: str, filename: str) -> str:
    ext = extension_from_name(filename)
    return f'tenant/{tenant_code}/temp/{upload_id}.{ext}'


def extension_from_name(filename: str) -> str:
    return os.path.splitext(filename)[1].lower().lstrip('.') or 'bin'


def validate_upload(
    file_obj: BinaryIO,
    filename: str,
    *,
    declared_content_type: str | None = None,
) -> ValidatedFile:
    """Validate type and size; raises ValidationError."""
    ext = extension_from_name(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f'File type .{ext} is not allowed.')

    content_type = declared_content_type or mimetypes.guess_type(filename)[0] or 'application/octet-stream'
    if content_type not in ALLOWED_MIME_TYPES and ext not in ('jpg', 'jpeg', 'png'):
        raise ValidationError(f'Content type {content_type} is not allowed.')

    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)

    if ext in ('jpg', 'jpeg', 'png') or content_type.startswith('image/'):
        category = 'image'
        limit = MAX_IMAGE_BYTES
    elif ext == 'pdf':
        category = 'pdf'
        limit = MAX_PDF_BYTES
    else:
        category = 'document'
        limit = MAX_DOCUMENT_BYTES

    if size > limit:
        mb = limit // (1024 * 1024)
        raise ValidationError(f'File exceeds maximum size of {mb}MB for {category} files.')

    return ValidatedFile(
        name=os.path.basename(filename),
        extension=ext,
        content_type=content_type,
        size=size,
        category=category,
    )


def scan_file_for_virus(file_obj: BinaryIO, *, filename: str = 'upload') -> bool:
    """
    ClamAV hook. Returns True if clean or scanning disabled.
    Set CLAMAV_ENABLED=true and install clamscan on the host.
    """
    if not getattr(settings, 'CLAMAV_ENABLED', False):
        return True

    bin_path = getattr(settings, 'CLAMAV_BIN', 'clamscan')
    import tempfile

    file_obj.seek(0)
    with tempfile.NamedTemporaryFile(delete=False, suffix=f'_{filename}') as tmp:
        tmp.write(file_obj.read())
        tmp_path = tmp.name
    file_obj.seek(0)

    try:
        result = subprocess.run(
            [bin_path, '--no-summary', tmp_path],
            capture_output=True,
            text=True,
            timeout=getattr(settings, 'CLAMAV_TIMEOUT', 60),
            check=False,
        )
        if result.returncode == 0:
            return True
        if result.returncode == 1:
            logger.warning('ClamAV detected threat in %s', filename)
            return False
        logger.error('ClamAV error: %s', result.stderr)
        raise ValidationError('Virus scan failed. Upload rejected.')
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def optimize_profile_image(file_obj: BinaryIO) -> tuple[BytesIO, BytesIO]:
    """
    Resize profile to 200x200 @ 80% quality and 50x50 thumbnail; output WebP.
    Returns (profile_buffer, thumbnail_buffer).
    """
    from PIL import Image

    file_obj.seek(0)
    image = Image.open(file_obj)
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGB')

    profile = image.copy()
    profile.thumbnail(PROFILE_SIZE, Image.Resampling.LANCZOS)
    profile_buf = BytesIO()
    profile.save(profile_buf, format='WEBP', quality=JPEG_QUALITY, method=6)
    profile_buf.seek(0)

    thumb = image.copy()
    thumb.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
    thumb_buf = BytesIO()
    thumb.save(thumb_buf, format='WEBP', quality=JPEG_QUALITY, method=6)
    thumb_buf.seek(0)

    return profile_buf, thumb_buf


def student_profile_upload_to(instance, filename: str) -> str:
    tenant = resolve_tenant_code(instance=instance, fallback='default')
    ext = extension_from_name(filename)
    if ext in ('jpg', 'jpeg', 'png'):
        ext = 'webp'
    return build_student_profile_key(tenant, instance.pk or uuid.uuid4(), ext)
