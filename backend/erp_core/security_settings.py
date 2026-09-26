"""Web security settings (P6), kept as plain functions so they can be tested without reloading Django's settings.

settings.py calls these with DEBUG and the environment; each returns the settings to apply.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Default addresses of the hosts this app is deployed on, used only when FRONTEND_ORIGINS is not set, so the live site
# keeps working until it is. Anyone can publish on these hosts, so set FRONTEND_ORIGINS in production.
HOSTED_ORIGIN_PATTERNS = [r'^https://[a-z0-9-]+\.vercel\.app$', r'^https://[a-z0-9-]+\.onrender\.com$']


def _split(value: str) -> list[str]:
    return [o.strip().rstrip('/') for o in (value or '').split(',') if o.strip()]


def cors(debug: bool, env: dict) -> dict:
    """Which web pages may call the API from a browser."""
    origins = _split(env.get('FRONTEND_ORIGINS', '')) + _split(env.get('CORS_EXTRA_ORIGINS', ''))
    conf = {
        'CORS_ALLOW_ALL_ORIGINS': False,
        'CORS_ALLOWED_ORIGINS': origins,
        'CORS_ALLOWED_ORIGIN_REGEXES': [],
        # The web app sends requests "with credentials"; that is safe because only the pages listed here are allowed.
        'CORS_ALLOW_CREDENTIALS': True,
        'CSRF_TRUSTED_ORIGINS': [o for o in origins if o.startswith('https://')],
    }
    if debug:
        conf['CORS_ALLOW_ALL_ORIGINS'] = True
    elif not origins:
        conf['CORS_ALLOWED_ORIGIN_REGEXES'] = HOSTED_ORIGIN_PATTERNS
        logger.warning('FRONTEND_ORIGINS is not set: allowing any *.vercel.app / *.onrender.com page to call the API. '
                       'Set it to the web app address.')
    return conf


def transport(debug: bool, env: dict) -> dict:
    """HTTPS only, secure cookies and browser protections in production. Each can be switched off by environment."""
    def flag(name, default=True):
        return env.get(name, '1' if default else '0').strip().lower() not in ('0', 'false', 'no', '')

    conf = {
        'X_FRAME_OPTIONS': 'DENY',
        'SECURE_CONTENT_TYPE_NOSNIFF': True,
        'SECURE_REFERRER_POLICY': 'strict-origin-when-cross-origin',
        'SECURE_CROSS_ORIGIN_OPENER_POLICY': 'same-origin',
        'SESSION_COOKIE_HTTPONLY': True,
        'SESSION_COOKIE_SAMESITE': 'Lax',
        'CSRF_COOKIE_SAMESITE': 'Lax',
    }
    if debug:
        return conf
    conf.update({
        # Render ends HTTPS at its proxy and passes the original scheme in this header.
        'SECURE_PROXY_SSL_HEADER': ('HTTP_X_FORWARDED_PROTO', 'https'),
        'SECURE_SSL_REDIRECT': flag('SECURE_SSL_REDIRECT'),
        # Health checks come from inside Render over plain HTTP.
        'SECURE_REDIRECT_EXEMPT': [r'^api/v1/health/'],
        'SECURE_HSTS_SECONDS': int(env.get('SECURE_HSTS_SECONDS', '31536000') or 0),
        'SECURE_HSTS_INCLUDE_SUBDOMAINS': flag('SECURE_HSTS_INCLUDE_SUBDOMAINS', False),
        'SECURE_HSTS_PRELOAD': False,
        'SESSION_COOKIE_SECURE': True,
        'CSRF_COOKIE_SECURE': True,
    })
    return conf


def trusted_proxies(debug: bool, env: dict) -> int:
    """How many proxies add themselves to X-Forwarded-For in front of the app (Render: 1). 0 = use the direct address."""
    raw = env.get('TRUSTED_PROXIES', '')
    if raw.strip().isdigit():
        return int(raw)
    return 0 if debug else 1
