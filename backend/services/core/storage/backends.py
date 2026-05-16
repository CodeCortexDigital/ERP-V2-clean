"""
S3-compatible storage backends (AWS S3, Cloudflare R2) and local fallback.
"""

from __future__ import annotations

from django.conf import settings
from django.core.files.storage import FileSystemStorage

try:
    from storages.backends.s3 import S3Storage
except ImportError:  # pragma: no cover
    S3Storage = None  # type: ignore[misc, assignment]


def _s3_options() -> dict:
    opts = {
        'access_key': getattr(settings, 'AWS_ACCESS_KEY_ID', None),
        'secret_key': getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        'region_name': getattr(settings, 'AWS_S3_REGION_NAME', 'auto'),
        'endpoint_url': getattr(settings, 'AWS_S3_ENDPOINT_URL', None),
        'signature_version': getattr(settings, 'AWS_S3_SIGNATURE_VERSION', 's3v4'),
        'addressing_style': getattr(settings, 'AWS_S3_ADDRESSING_STYLE', 'auto'),
    }
    return {k: v for k, v in opts.items() if v}


if S3Storage is not None:

    class MediaStorage(S3Storage):
        """Private tenant media (profile photos, documents)."""

        default_acl = 'private'
        file_overwrite = False
        querystring_auth = True

        def __init__(self, **kwargs):
            opts = _s3_options()
            opts.update(kwargs)
            super().__init__(
                bucket_name=getattr(
                    settings,
                    'AWS_MEDIA_BUCKET_NAME',
                    getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'erp-media'),
                ),
                **opts,
            )


    class BackupStorage(S3Storage):
        """Database / WAL backups — private."""

        default_acl = 'private'
        file_overwrite = True

        def __init__(self, **kwargs):
            opts = _s3_options()
            opts.update(kwargs)
            super().__init__(
                bucket_name=getattr(
                    settings,
                    'AWS_BACKUP_BUCKET_NAME',
                    getattr(
                        settings,
                        'BACKUP_S3_BUCKET',
                        getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'erp-backups'),
                    ),
                ),
                **opts,
            )


    class ReportsStorage(S3Storage):
        """Generated PDF reports — private with signed download."""

        default_acl = 'private'
        file_overwrite = False

        def __init__(self, **kwargs):
            opts = _s3_options()
            opts.update(kwargs)
            super().__init__(
                bucket_name=getattr(
                    settings,
                    'AWS_REPORTS_BUCKET_NAME',
                    getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'erp-reports'),
                ),
                **opts,
            )


    class PublicMediaStorage(S3Storage):
        """Optional public assets (tenant logos, marketing)."""

        default_acl = 'public-read'
        querystring_auth = False

        def __init__(self, **kwargs):
            opts = _s3_options()
            opts.update(kwargs)
            super().__init__(
                bucket_name=getattr(
                    settings,
                    'AWS_PUBLIC_BUCKET_NAME',
                    getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'erp-public'),
                ),
                **opts,
            )

else:

    class MediaStorage(FileSystemStorage):  # type: ignore[no-redef]
        def __init__(self):
            super().__init__(location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL)


    class BackupStorage(FileSystemStorage):  # type: ignore[no-redef]
        def __init__(self):
            root = getattr(settings, 'BACKUP_OUTPUT_DIR', settings.MEDIA_ROOT / 'backups')
            super().__init__(location=root, base_url=None)


    class ReportsStorage(FileSystemStorage):  # type: ignore[no-redef]
        def __init__(self):
            root = settings.MEDIA_ROOT / 'reports'
            super().__init__(location=root, base_url=settings.MEDIA_URL + 'reports/')


    class PublicMediaStorage(FileSystemStorage):  # type: ignore[no-redef]
        def __init__(self):
            root = settings.MEDIA_ROOT / 'public'
            super().__init__(location=root, base_url=settings.MEDIA_URL + 'public/')


def get_storage_for_bucket(bucket_type: str):
    mapping = {
        'media': MediaStorage,
        'backups': BackupStorage,
        'reports': ReportsStorage,
        'public': PublicMediaStorage,
    }
    factory = mapping.get(bucket_type, MediaStorage)
    return factory()
