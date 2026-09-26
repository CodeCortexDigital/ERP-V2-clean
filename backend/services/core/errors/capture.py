"""Record errors (server and browser) into groups, and tell the platform owner about new ones (P4)."""
from __future__ import annotations

import hashlib
import os
import re
import traceback
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

MAX_SAMPLES = 5
ALERT_EVERY = timedelta(hours=1)


def release() -> str:
    return (os.environ.get('RENDER_GIT_COMMIT') or os.environ.get('GIT_COMMIT') or '')[:12]


def _normalise(message: str) -> str:
    """Numbers, ids and quoted values vary between occurrences of the same error; drop them for grouping."""
    m = re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27}', '<id>', message or '', flags=re.I)
    m = re.sub(r"'[^']*'|\"[^\"]*\"", "'…'", m)
    return re.sub(r'\d+', '<n>', m)[:300]


def record(*, source: str, kind: str, message: str, location: str, stack: str = '', path: str = '', user=None, school=None,
           extra: dict | None = None):
    """Add an occurrence to its group (creating it the first time). Never raises."""
    from .models import ErrorGroup

    try:
        fingerprint = hashlib.sha256(f'{source}|{kind}|{location}|{_normalise(message)}'.encode()).hexdigest()
        sample = {'at': timezone.now().isoformat(), 'message': (message or '')[:500], 'stack': (stack or '')[-6000:], 'path': path[:300],
                  'user': getattr(user, 'email', '') if getattr(user, 'is_authenticated', False) else '',
                  'school': getattr(school, 'name', '') or '', 'release': release(), **(extra or {})}
        with transaction.atomic():
            group, created = ErrorGroup.objects.select_for_update().get_or_create(fingerprint=fingerprint, defaults={
                'source': source, 'kind': kind[:120], 'message': (message or '')[:500], 'location': location[:300]})
            reopened = group.status == 'resolved'
            group.count += 1
            group.status = 'open' if group.status == 'resolved' else group.status
            group.last_school, group.last_user, group.last_path = sample['school'][:255], sample['user'][:255], sample['path']
            group.release = release()
            group.samples = ([sample] + list(group.samples or []))[:MAX_SAMPLES]
            should_alert = (created or reopened) and group.status != 'ignored' and (
                group.alerted_at is None or timezone.now() - group.alerted_at > ALERT_EVERY)
            if should_alert:
                group.alerted_at = timezone.now()
            group.save()
        if should_alert:
            _alert(group, reopened)
        return group
    except Exception:
        return None


def _alert(group, reopened):
    from django.contrib.auth import get_user_model

    from services.core.security import mailer

    to = [e.strip() for e in os.environ.get('ERROR_ALERT_EMAILS', '').split(',') if e.strip()]
    if not to:
        to = list(get_user_model().objects.filter(is_superuser=True, is_active=True).values_list('email', flat=True))
    what = 'came back' if reopened else 'new error'
    text, html = mailer.layout(f'{group.get_source_display()} error ({what}): {group.kind}', [
        group.message, f'Where: {group.location or "unknown"}', f'Page: {group.last_path or "unknown"}',
        f'School: {group.last_school or "none"} · User: {group.last_user or "not signed in"}',
        'Open All Schools → Errors in the app to see the details and mark it resolved.',
    ])
    mailer.send('error_alert', to, f'[Error] {group.kind}: {group.message[:80]}', text, html)


def on_request_exception(sender, request=None, **kwargs):
    """Django signal: an unhandled exception while serving a request."""
    import sys

    exc_type, exc, tb = sys.exc_info()
    if exc is None:
        return
    frames = traceback.extract_tb(tb)
    ours = [f for f in frames if 'site-packages' not in f.filename] or frames
    last = ours[-1] if ours else None
    location = f'{os.path.relpath(last.filename, settings.BASE_DIR)}:{last.lineno} in {last.name}' if last else ''
    record(source='backend', kind=exc_type.__name__, message=str(exc), location=location,
           stack=''.join(traceback.format_exception(exc_type, exc, tb)), path=getattr(request, 'path', ''),
           user=getattr(request, 'user', None), school=getattr(request, 'tenant', None),
           extra={'method': getattr(request, 'method', '')})
    _sentry(exc)


def _sentry(exc):
    """Also forward to Sentry when SENTRY_DSN is set and the sentry-sdk package is installed (optional)."""
    if not os.environ.get('SENTRY_DSN'):
        return
    try:
        import sentry_sdk

        sentry_sdk.capture_exception(exc)
    except Exception:
        pass
