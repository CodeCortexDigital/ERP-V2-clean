"""
Sentry configuration for error tracking and monitoring.
"""
import os
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration


def init_sentry(environment: str = 'development'):
    """
    Initialize Sentry error tracking.
    
    Args:
        environment: The environment to configure for (development, staging, production)
    """
    sentry_dsn = os.getenv('SENTRY_DSN')
    
    if not sentry_dsn:
        # Sentry is optional - only initialize if DSN is provided
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=0.1 if environment == 'production' else 1.0,
        send_default_pii=False,  # Don't send PII in production
        environment=environment,
        # Performance Monitoring
        profiles_sample_rate=0.1 if environment == 'production' else 1.0,
        # Release tracking
        release=os.getenv('SENTRY_RELEASE', 'unknown'),
    )


def get_sentry_user_context(user):
    """
    Get user context for Sentry.
    
    Args:
        user: Django User object
    
    Returns:
        dict: User context for Sentry
    """
    if not user or not user.is_authenticated:
        return {}
    
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'ip_address': '{{auto}}',
    }


def set_sentry_user_context(user):
    """
    Set the current user context in Sentry.
    
    Args:
        user: Django User object
    """
    sentry_sdk.set_user(get_sentry_user_context(user))


def capture_exception(exc, level='error', **kwargs):
    """
    Capture an exception in Sentry.
    
    Args:
        exc: Exception to capture
        level: Severity level (fatal, error, warning, info, debug)
        **kwargs: Additional context
    """
    sentry_sdk.capture_exception(exc)


def capture_message(message, level='info', **kwargs):
    """
    Capture a message in Sentry.
    
    Args:
        message: Message to capture
        level: Severity level (fatal, error, warning, info, debug)
        **kwargs: Additional context
    """
    sentry_sdk.capture_message(message, level)


def add_breadcrumb(message, category='info', level='info', **data):
    """
    Add a breadcrumb to Sentry.
    
    Args:
        message: Breadcrumb message
        category: Breadcrumb category
        level: Severity level
        **data: Additional data
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data,
    )
