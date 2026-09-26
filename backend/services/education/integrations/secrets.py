"""Integration secrets are stored encrypted (Fernet, key derived from SECRET_KEY) and never sent to the browser.

After a SECRET_KEY change, secrets sealed with the old key still open while it is listed in SECRET_KEY_FALLBACKS;
`python manage.py rotate_secrets` re-seals them with the new key (P7, docs/KEY_ROTATION.md)."""
import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings


def _key(secret: str) -> Fernet:
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f'{secret}:integrations'.encode()).digest()))


def _fernet() -> MultiFernet:
    return MultiFernet([_key(s) for s in [settings.SECRET_KEY, *getattr(settings, 'SECRET_KEY_FALLBACKS', [])]])


def reseal(blob: str) -> str:
    """The same secrets, encrypted with the current key."""
    return _fernet().rotate(blob.encode()).decode() if blob else blob


def seal(data: dict) -> str:
    return _fernet().encrypt(json.dumps(data or {}).encode()).decode() if data else ''


def unseal(blob: str) -> dict:
    if not blob:
        return {}
    try:
        return json.loads(_fernet().decrypt(blob.encode()))
    except (InvalidToken, ValueError):
        return {}  # SECRET_KEY changed: the school has to enter its secrets again
