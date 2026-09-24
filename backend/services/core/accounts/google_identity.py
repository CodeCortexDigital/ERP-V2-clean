"""Verify a Firebase (Google sign-in) ID token and return who it belongs to.

Only the Firebase project id is needed on the server (FIREBASE_PROJECT_ID):
the token's signature is checked against Google's public keys. This never
creates accounts; callers decide what to do with the identity.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


class GoogleIdentityError(Exception):
    pass


@dataclass
class GoogleIdentity:
    uid: str
    email: str
    name: str
    email_verified: bool


# The Firebase project the web app is built against (frontend/src/services/firebase.ts).
# It is public, not a secret. Set FIREBASE_PROJECT_ID='' to turn Google sign-in off.
DEFAULT_FIREBASE_PROJECT_ID = 'school-erp-c53b4'


def firebase_project_id() -> str:
    pid = os.environ.get('FIREBASE_PROJECT_ID', DEFAULT_FIREBASE_PROJECT_ID).strip()
    return '' if pid in ('', 'your-project-id', 'your_project_id') else pid


def google_sign_in_enabled() -> bool:
    return bool(firebase_project_id())


def verify_google_identity(id_token_str: str) -> GoogleIdentity:
    project_id = firebase_project_id()
    if not project_id:
        raise GoogleIdentityError('Google sign-in is not configured on this server.')
    if not id_token_str:
        raise GoogleIdentityError('Missing Google sign-in token.')
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        claims = id_token.verify_firebase_token(id_token_str, google_requests.Request(), audience=project_id)
    except Exception as exc:  # invalid, expired, wrong project, network
        raise GoogleIdentityError(f'Google sign-in could not be verified: {exc}') from exc
    if not claims or not claims.get('email'):
        raise GoogleIdentityError('Google account has no email address.')
    return GoogleIdentity(
        uid=claims.get('user_id') or claims.get('sub') or '',
        email=claims['email'].strip().lower(),
        name=claims.get('name') or '',
        email_verified=bool(claims.get('email_verified')),
    )
