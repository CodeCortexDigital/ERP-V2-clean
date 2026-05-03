"""
Minimal Django settings for erp_core project.
"""

from pathlib import Path
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = "django-insecure-change-this-in-production"
DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

# Core apps only - no duplicates
INSTALLED_APPS = [
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
    "erp_core.apps.CoreConfig",
    "drf_spectacular",
    
    # Core system apps
    "apps.core.tenants",
    "apps.system.accounts",
    "apps.system.core",
    "apps.core.modules",
    "apps.core.integrations",
    "apps.core.notifications",
    "apps.system.exports",
    "apps.system.automation",
    "apps.system.background_tasks",
    "apps.core.audit_logs",
    "apps.core.audit_compliance",
    "apps.system.audit_education",
    "apps.system.audit_trail_finance",
    "apps.system.executive_dashboard",
    
    # Shared apps
    "apps.shared.ai_engine",
    "apps.shared.data_privacy",
    "apps.shared.master_data",
    "apps.shared.entities",
    "apps.shared.language_support",
    "apps.core.workflows",
    "apps.shared.communications",
    "apps.shared.portal",
]

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

ROOT_URLCONF = "erp_core.urls"
WSGI_APPLICATION = "erp_core.wsgi.application"

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

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173"]
