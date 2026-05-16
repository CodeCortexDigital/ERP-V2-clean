import os
from pathlib import Path
from datetime import timedelta

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
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-final-key-2026-erp-system')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
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
    
    # Core apps
    'services.core.accounts',
    'services.core.user_notifications',
    'services.rbac_models',
    'services.core.audit',
    'services.core.backup',
    
    # Education apps
    'services.education.academics',
    'services.education.students',
    'services.education.attendance',
    'services.education.exams',
    'services.education.finance',
    'services.education.admissions',
    'services.education.communication',
    'services.analytics',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'services.education.students.middleware.StudentActivityMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'services.core.accounts.middleware.AuditMiddleware',
    'services.core.audit.middleware.AuditMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
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
    DATABASES = {
        'default': {
            'ENGINE': os.environ.get(
                'DB_ENGINE', 'django.db.backends.postgresql'
            ),
            'NAME': os.environ.get('DB_NAME', 'postgres'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }

# Redis / cache
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')
CACHE_URL = os.environ.get('CACHE_URL', 'redis://127.0.0.1:6379/1')

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

if CACHE_URL.startswith('redis://'):
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
                'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                'LOCATION': CACHE_URL,
                'TIMEOUT': CACHE_TIMEOUTS['student_list'],
                'KEY_PREFIX': os.environ.get('CACHE_KEY_PREFIX', 'erp'),
                'OPTIONS': {
                    'pool_class': 'redis.connection.BlockingConnectionPool',
                    'pool_class_kwargs': {
                        'max_connections': _REDIS_POOL_MAX,
                        'timeout': _REDIS_SOCKET_TIMEOUT,
                    },
                },
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
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'core_accounts.User'

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'services.core.utils.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
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


