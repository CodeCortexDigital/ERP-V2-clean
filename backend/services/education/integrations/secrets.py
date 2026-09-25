"""Integration secrets are stored encrypted (Fernet, key derived from SECRET_KEY) and never sent to the browser."""
import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    key = hashlib.sha256(f'{settings.SECRET_KEY}:integrations'.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def seal(data: dict) -> str:
    return _fernet().encrypt(json.dumps(data or {}).encode()).decode() if data else ''


def unseal(blob: str) -> dict:
    if not blob:
        return {}
    try:
        return json.loads(_fernet().decrypt(blob.encode()))
    except (InvalidToken, ValueError):
        return {}  # SECRET_KEY changed: the school has to enter its secrets again
