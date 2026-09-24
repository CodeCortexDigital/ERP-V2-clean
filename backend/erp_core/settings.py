import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env (DB credentials, Redis, etc.)
_env_path = BASE_DIR / '.env'
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path, override=True)
    except ImportError:
        pass

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    SECRET_KEY = 'django-insecure-final-key-2026-erp-system'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('1', 'true', 'yes')

ALLOWED_HOSTS = [host.strip() for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver,*').split(',') if host.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

if not DEBUG and SECRET_KEY.startswith('django-insecure'):
    raise ImproperlyConfigured('A secure SECRET_KEY must be set in production via environment variables.')

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    'django_filters',
    'channels',
    'storages',
    
    # Core apps
    'services.core.accounts',
    'services.core.employee',
    'services.core.user_notifications',
    'services.rbac_models',
    'services.core.audit',
    'services.core.backup',
    'services.core.db',
    'services.core.storage',
    'services.core.tenants',
    'services.core.features',
    
    # Education apps
    'services.education.academics',
    'services.education.students',
    'services.education.attendance',
    'services.education.exams',
    'services.education.finance',
    'services.education.admissions',
    'services.education.communication',
    'services.education.behaviour',
    'services.analytics',
    'services.ai',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'services.education.students.middleware.StudentActivityMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'api.versioning.APIVersionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'services.core.tenants.middleware.TenantMiddleware',
    'services.core.features.middleware.FeatureFlagMiddleware',
    'services.core.audit.middleware.AuditMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'services.core.db.monitoring.SlowQueryLoggingMiddleware',
]

ROOT_URLCONF = 'erp_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'erp_core.wsgi.application'

# Database — set USE_SQLITE=true in .env for local dev without PostgreSQL
_use_sqlite = os.environ.get('USE_SQLITE', '').lower() in ('1', 'true', 'yes')

if _use_sqlite:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    _use_pgbouncer = os.environ.get('USE_PGBOUNCER', '').lower() in ('1', 'true', 'yes')
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get(
                'DB_ENGINE', 'django.db.backends.postgresql'
            ),
            'NAME': os.environ.get('DB_NAME', 'postgres'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '6432' if _use_pgbouncer else '5432'),
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '0')),
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'connect_timeout': int(os.environ.get('DB_CONNECT_TIMEOUT', '10')),
            },
        }
    }
    # A single DATABASE_URL (e.g. Render's "Internal Database URL") overrides the DB_* values.
    _database_url = os.environ.get('DATABASE_URL', '').strip()
    if _database_url:
        from urllib.parse import unquote, urlparse

        _u = urlparse(_database_url)
        DATABASES['default'].update({
            'NAME': unquote(_u.path.lstrip('/')) or DATABASES['default']['NAME'],
            'USER': unquote(_u.username or '') or DATABASES['default']['USER'],
            'PASSWORD': unquote(_u.password or ''),
            'HOST': _u.hostname or DATABASES['default']['HOST'],
            'PORT': str(_u.port or 5432),
        })
        # Honour ?sslmode=... and require TLS for external hosted hosts (Render rejects plain connections).
        from urllib.parse import parse_qs

        _sslmode = parse_qs(_u.query).get('sslmode', [''])[0]
        if not _sslmode and '.' in (_u.hostname or '') and _u.hostname not in ('127.0.0.1', 'localhost'):
            _sslmode = 'require'
        if _sslmode:
            DATABASES['default']['OPTIONS']['sslmode'] = _sslmode
    # One start-up line (no secrets) so deploy logs show which database settings are in use.
    import sys as _sys
    print(
        f"[settings] database from {'DATABASE_URL' if _database_url else 'DB_HOST/DB_* variables'}: "
        f"host={DATABASES['default']['HOST']} port={DATABASES['default']['PORT']} name={DATABASES['default']['NAME']}",
        file=_sys.stderr,
    )
    # Emergency fallback: if DB_HOST names a database that no longer exists (e.g. an expired
    # Render free Postgres) and no DATABASE_URL is set, start on a local SQLite file instead of
    # crash-looping. Data in that file is NOT durable on Render. Disable with DB_SQLITE_FALLBACK=0.
    if (
        not _database_url
        and os.environ.get('DB_SQLITE_FALLBACK', '1').lower() not in ('0', 'false', 'no')
        and DATABASES['default']['HOST'] not in ('', '127.0.0.1', 'localhost')
    ):
        import socket as _socket

        try:
            _socket.getaddrinfo(DATABASES['default']['HOST'], None)
        except _socket.gaierror:
            print(
                f"[settings] WARNING: database host {DATABASES['default']['HOST']} does not exist. "
                "Falling back to a temporary SQLite database; data will be lost on restart. "
                "Set DATABASE_URL to a real PostgreSQL database.",
                file=_sys.stderr,
            )
            DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
    if _use_pgbouncer and 'postgresql' in DATABASES['default']['ENGINE']:
        DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
        DATABASES['default']['CONN_MAX_AGE'] = 0
    _stmt_timeout = os.environ.get('DB_STATEMENT_TIMEOUT_MS', '30000')
    if _stmt_timeout and 'postgresql' in DATABASES['default']['ENGINE']:
        DATABASES['default']['OPTIONS']['options'] = (
            f"-c statement_timeout={_stmt_timeout}"
        )

# Database scalability & monitoring
DB_SLOW_QUERY_MS = int(os.environ.get('DB_SLOW_QUERY_MS', '200'))
DB_QUERY_MONITORING = os.environ.get('DB_QUERY_MONITORING', 'true').lower() in ('1', 'true', 'yes')
DB_ARCHIVAL_ENABLED = os.environ.get('DB_ARCHIVAL_ENABLED', 'true').lower() in ('1', 'true', 'yes')
DB_ARCHIVE_BATCH_SIZE = int(os.environ.get('DB_ARCHIVE_BATCH_SIZE', '1000'))
DB_ARCHIVE_ATTENDANCE_YEARS = int(os.environ.get('DB_ARCHIVE_ATTENDANCE_YEARS', '2'))
DB_ARCHIVE_NOTIFICATION_DAYS = int(os.environ.get('DB_ARCHIVE_NOTIFICATION_DAYS', '90'))
DB_ARCHIVE_AUDIT_DAYS = int(os.environ.get('DB_ARCHIVE_AUDIT_DAYS', '90'))

# Redis / cache
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CACHE_URL = os.environ.get('CACHE_URL', 'redis://127.0.0.1:6379/1')
CHANNEL_REDIS_URL = os.environ.get('CHANNEL_REDIS_URL', REDIS_URL)

# WebSockets (Django Channels) — InMemory fallback when USE_INMEMORY_CHANNELS=true,
# channels_redis missing, or the configured Redis is too old (< 5.0, no BZPOPMIN support).
_use_inmemory_channels = os.environ.get('USE_INMEMORY_CHANNELS', '').lower() in ('1', 'true', 'yes')
if not _use_inmemory_channels:
    try:
        import channels_redis  # noqa: F401
    except ImportError:
        _use_inmemory_channels = True
if not _use_inmemory_channels:
    # channels_redis uses BZPOPMIN (Redis >= 5.0); fall back if the server is too old.
    try:
        import redis as _redis_mod
        _ch_client = _redis_mod.from_url(CHANNEL_REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        _ch_client.ping()
        _ch_ver = _ch_client.info('server').get('redis_version', '0') or '0'
        _ch_major = int(_ch_ver.split('.')[0]) if _ch_ver.split('.')[0].isdigit() else 0
        if _ch_major < 5:
            _use_inmemory_channels = True
    except Exception:
        _use_inmemory_channels = True
if _use_inmemory_channels:
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [CHANNEL_REDIS_URL]},
        },
    }

ASGI_APPLICATION = 'services.core.routing.application'

# Per-strategy TTLs (seconds)
CACHE_TIMEOUTS = {
    'student_list': int(os.environ.get('CACHE_TTL_STUDENT_LIST', 300)),      # 5 min
    'class_list': int(os.environ.get('CACHE_TTL_CLASS_LIST', 3600)),         # 1 hour
    'dashboard': int(os.environ.get('CACHE_TTL_DASHBOARD', 60)),             # 1 min
    'analytics': int(os.environ.get('CACHE_TTL_ANALYTICS', 900)),            # 15 min
    'dropdown': int(os.environ.get('CACHE_TTL_DROPDOWN', 86400)),            # 1 day
}

_REDIS_POOL_MAX = int(os.environ.get('REDIS_POOL_MAX_CONNECTIONS', 50))
_REDIS_CONNECT_TIMEOUT = int(os.environ.get('REDIS_SOCKET_CONNECT_TIMEOUT', 5))
_REDIS_SOCKET_TIMEOUT = int(os.environ.get('REDIS_SOCKET_TIMEOUT', 5))

def _redis_available(url: str) -> bool:
    try:
        import redis
        client = redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
        client.ping()
        return True
    except Exception:
        return False


if CACHE_URL.startswith('redis://') and _redis_available(CACHE_URL):
    try:
        import django_redis  # noqa: F401
        CACHES = {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': CACHE_URL,
                'TIMEOUT': CACHE_TIMEOUTS['student_list'],
                'KEY_PREFIX': os.environ.get('CACHE_KEY_PREFIX', 'erp'),
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'CONNECTION_POOL_KWARGS': {
                        'max_connections': _REDIS_POOL_MAX,
                        'retry_on_timeout': True,
                    },
                    'SOCKET_CONNECT_TIMEOUT': _REDIS_CONNECT_TIMEOUT,
                    'SOCKET_TIMEOUT': _REDIS_SOCKET_TIMEOUT,
                    'IGNORE_EXCEPTIONS': True,
                    'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                },
            }
        }
    except ImportError:
        CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'erp-redis-fallback',
                'TIMEOUT': CACHE_TIMEOUTS['student_list'],
            }
        }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'erp-local',
            'TIMEOUT': CACHE_TIMEOUTS['student_list'],
        }
    }

# Backup & disaster recovery
BACKUP_OUTPUT_DIR = os.environ.get('BACKUP_OUTPUT_DIR', '/backups')
BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))
BACKUP_RETENTION_MONTHLY = int(os.environ.get('BACKUP_RETENTION_MONTHLY', '12'))
BACKUP_RETENTION_YEARLY = int(os.environ.get('BACKUP_RETENTION_YEARLY', '7'))
BACKUP_S3_BUCKET = os.environ.get('BACKUP_S3_BUCKET', os.environ.get('AWS_STORAGE_BUCKET_NAME', ''))
BACKUP_S3_PREFIX = os.environ.get('BACKUP_S3_PREFIX', 'backups')
BACKUP_STANDBY_REGION = os.environ.get('BACKUP_STANDBY_REGION', 'us-west-2')
BACKUP_SCHEDULE_CRON = os.environ.get('BACKUP_SCHEDULE', '0 2 * * *')
BACKUP_RTO_HOURS = int(os.environ.get('BACKUP_RTO_HOURS', '4'))
BACKUP_RPO_HOURS = int(os.environ.get('BACKUP_RPO_HOURS', '24'))
SLACK_WEBHOOK_URL = os.environ.get('SLACK_WEBHOOK_URL', '')
WAL_ARCHIVE_DIR = os.environ.get('WAL_ARCHIVE_DIR', '/backups/wal_archive')

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Karachi'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Object storage (AWS S3 / Cloudflare R2)
USE_S3_STORAGE = os.environ.get('USE_S3_STORAGE', '').lower() in ('1', 'true', 'yes')
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME', 'erp-media')
AWS_MEDIA_BUCKET_NAME = os.environ.get('AWS_MEDIA_BUCKET_NAME', AWS_STORAGE_BUCKET_NAME)
AWS_BACKUP_BUCKET_NAME = os.environ.get('AWS_BACKUP_BUCKET_NAME', os.environ.get('BACKUP_S3_BUCKET', 'erp-backups'))
AWS_REPORTS_BUCKET_NAME = os.environ.get('AWS_REPORTS_BUCKET_NAME', 'erp-reports')
AWS_PUBLIC_BUCKET_NAME = os.environ.get('AWS_PUBLIC_BUCKET_NAME', 'erp-public')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'auto')
AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL', '')  # R2: https://<account>.r2.cloudflarestorage.com
AWS_S3_SIGNATURE_VERSION = os.environ.get('AWS_S3_SIGNATURE_VERSION', 's3v4')
AWS_S3_ADDRESSING_STYLE = os.environ.get('AWS_S3_ADDRESSING_STYLE', 'auto')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN', '')
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = True
AWS_S3_FILE_OVERWRITE = False

STORAGE_SIGNED_URL_EXPIRY = int(os.environ.get('STORAGE_SIGNED_URL_EXPIRY', '3600'))
STORAGE_MAX_IMAGE_BYTES = int(os.environ.get('STORAGE_MAX_IMAGE_BYTES', str(10 * 1024 * 1024)))
STORAGE_MAX_PDF_BYTES = int(os.environ.get('STORAGE_MAX_PDF_BYTES', str(5 * 1024 * 1024)))
STORAGE_TEMP_MAX_AGE_HOURS = int(os.environ.get('STORAGE_TEMP_MAX_AGE_HOURS', '24'))
DEFAULT_TENANT_CODE = os.environ.get('DEFAULT_TENANT_CODE', 'DEF')
TENANT_BASE_DOMAIN = os.environ.get('TENANT_BASE_DOMAIN', 'erp.com')
CLAMAV_ENABLED = os.environ.get('CLAMAV_ENABLED', '').lower() in ('1', 'true', 'yes')
CLAMAV_BIN = os.environ.get('CLAMAV_BIN', 'clamscan')

if USE_S3_STORAGE:
    STORAGES = {
        'default': {
            'BACKEND': 'services.core.storage.backends.MediaStorage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
else:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
            'OPTIONS': {'location': MEDIA_ROOT, 'base_url': MEDIA_URL},
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'core_accounts.User'

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Employee-Id', 'X-CSRFToken', 'Cache-Control', 'Pragma']

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # JWT + binds the user's school, so every query is filtered to it.
        'services.core.tenants.authentication.TenantJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'services.core.utils.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 500,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1', 'v2'],
    'VERSION_PARAM': 'version',
}

# Spectacular Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'ERP V2 API',
    'DESCRIPTION': 'Enterprise ERP API - Standardized OpenAPI 3.0 schema',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# Celery — archival & partition maintenance (requires redis broker)
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_TRACK_STARTED = True
# Run tasks inline when asked to, or when the Redis broker can't be reached
# (local dev without Redis) — otherwise every task send blocks on reconnects.
_eager_env = os.environ.get('CELERY_TASK_ALWAYS_EAGER', '').lower()
if _eager_env:
    CELERY_TASK_ALWAYS_EAGER = _eager_env in ('1', 'true', 'yes')
else:
    CELERY_TASK_ALWAYS_EAGER = CELERY_BROKER_URL.startswith('redis://') and not _redis_available(CELERY_BROKER_URL)
if CELERY_TASK_ALWAYS_EAGER:
    CELERY_RESULT_BACKEND = 'cache+memory://'

try:
    from celery.schedules import crontab

    CELERY_BEAT_SCHEDULE = {
        'db-archive-nightly': {
            'task': 'services.core.db.archive_tasks.run_all_archival',
            'schedule': crontab(hour=2, minute=30),
        },
        'db-ensure-partitions-weekly': {
            'task': 'services.core.db.archive_tasks.ensure_partitions',
            'schedule': crontab(hour=3, minute=0, day_of_week='sun'),
        },
        'storage-cleanup-temp-daily': {
            'task': 'services.core.storage.tasks.cleanup_temp_files',
            'schedule': crontab(hour=4, minute=0),
        },
    }
except ImportError:
    CELERY_BEAT_SCHEDULE = {}

# ---------------------------------------------------------------------------
# AI Assistant (see docs/AI_UPGRADE_TODO.md)
# ---------------------------------------------------------------------------
# "openai" or "anthropic"; empty = first provider with a key configured.
AI_PROVIDER = os.environ.get("AI_PROVIDER", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
# Override the provider's default models (fast: chat; smart: content generation).
AI_MODEL_FAST = os.environ.get("AI_MODEL_FAST", "")
AI_MODEL_SMART = os.environ.get("AI_MODEL_SMART", "")
AI_CLAUDE_EFFORT = os.environ.get("AI_CLAUDE_EFFORT", "medium")
# Per-user requests per window, and per-school monthly token cap (0 = unlimited).
AI_RATE_LIMIT = int(os.environ.get("AI_RATE_LIMIT", "30"))
AI_RATE_WINDOW = int(os.environ.get("AI_RATE_WINDOW", "600"))
AI_TENANT_MONTHLY_TOKENS = int(os.environ.get("AI_TENANT_MONTHLY_TOKENS", "0"))
# When False, phone/email/CNIC/address are masked in data sent to external LLMs.
AI_SHARE_CONTACT_INFO = os.environ.get("AI_SHARE_CONTACT_INFO", "False").lower() in ("1", "true", "yes")


