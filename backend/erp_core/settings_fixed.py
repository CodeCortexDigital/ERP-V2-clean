"""
Django settings for ERP V2 - Services Architecture
Fixed for frontend development with single DB and port
"""

from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-erp-v2-dev-key-change-in-production"

DEBUG = True

ALLOWED_HOSTS = ["127.0.0.1", "localhost", "0.0.0.0"]


# =====================================================
# CORE APPS
# =====================================================

CORE_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_filters",
    "corsheaders",
    "rest_framework",
    "oauth2_provider",
    "drf_spectacular",
]

THIRD_PARTY_APPS = [
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
]


# =====================================================
# DISCOVER APPS FROM SERVICES
# =====================================================

def discover_services_apps():
    """Discover Django apps from services directory"""
    import os
    from pathlib import Path
    
    services_dir = BASE_DIR / "services"
    discovered = []
    
    if services_dir.exists():
        for root, dirs, files in os.walk(services_dir):
            # Skip non-app directories
            if any(x in root for x in ['venv', '__pycache__', '.git', 'db.sqlite3']):
                continue
                
            if 'apps.py' in files:
                rel_path = Path(root).relative_to(BASE_DIR)
                module_path = str(rel_path).replace(os.sep, '.')
                discovered.append(module_path)
    
    print(f"[DISCOVERY] Found {len(discovered)} service apps")
    return discovered


LOCAL_APPS = discover_services_apps()

INSTALLED_APPS = CORE_APPS + THIRD_PARTY_APPS + LOCAL_APPS

print(f"Total apps loaded: {len(INSTALLED_APPS)}")

DATA_UPLOAD_MAX_NUMBER_FIELDS = 50000


# =====================================================
# MIDDLEWARE
# =====================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =====================================================
# ROOT URLCONFIG
# =====================================================

ROOT_URLCONF = "erp_core.urls"
WSGI_APPLICATION = "erp_core.wsgi.application"


# =====================================================
# TEMPLATES
# =====================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# =====================================================
# DATABASE - Single SQLite for all services
# =====================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# =====================================================
# AUTH
# =====================================================

AUTH_USER_MODEL = "core.accounts.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]


# =====================================================
# PASSWORD VALIDATION
# =====================================================

AUTH_PASSWORD_VALIDATORS = []


# =====================================================
# INTERNATIONALIZATION
# =====================================================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# =====================================================
# STATIC FILES
# =====================================================

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# =====================================================
# DEFAULT AUTO FIELD
# =====================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =====================================================
# REST FRAMEWORK
# =====================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # Open for dev
    ],
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}


# =====================================================
# JWT SETTINGS
# =====================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# =====================================================
# CORS - Allow frontend
# =====================================================

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = True  # Dev mode


# =====================================================
# API DOCUMENTATION
# =====================================================

SPECTACULAR_SETTINGS = {
    "TITLE": "ERP V2 API",
    "DESCRIPTION": "Enterprise ERP API - Ready for Frontend",
    "VERSION": "2.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}


# =====================================================
# EMAIL
# =====================================================

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# =====================================================
# LOGGING
# =====================================================

LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] {name} | {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}