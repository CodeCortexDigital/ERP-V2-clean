"""Portal login credentials for students, parents and staff.

Accounts are created by the signals in signals.py when a Student or Teacher is
saved. Each gets its own random password, recorded in PortalCredential so the
admission / job offer letter can print it. Usernames are the IDs people already
know: student ID for students, employee ID for staff, email for parents.
"""
import secrets

from django.apps import apps

from .models import PortalCredential

# Shared passwords older versions gave every auto-created account. Anyone who
# still has one gets a fresh password the next time an admin views their login.
LEGACY_DEFAULT_PASSWORDS = ('student123', 'teacher123', 'parent123')

# No look-alike characters (0/O, 1/l/I) so printed passwords are easy to type.
_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
_DIGITS = '23456789'


def generate_password() -> str:
    """Readable random password, e.g. 'kqmz-4827'."""
    letters = ''.join(secrets.choice(_LETTERS) for _ in range(4))
    digits = ''.join(secrets.choice(_DIGITS) for _ in range(4))
    return f'{letters}-{digits}'


def issue_credential(user, password: str | None = None) -> str:
    """Set a new portal password on ``user`` and remember it for letters."""
    password = password or generate_password()
    user.set_password(password)
    user.save(update_fields=['password'])
    PortalCredential.objects.update_or_create(
        user=user,
        defaults={'initial_password': password, 'changed_by_user': False},
    )
    return password


def mark_changed_by_user(user) -> None:
    """The user chose their own password: stop showing the issued one."""
    PortalCredential.objects.update_or_create(
        user=user,
        defaults={'initial_password': '', 'changed_by_user': True},
    )


def current_password(user) -> tuple[str | None, bool]:
    """(printable password or None, changed_by_user) for an existing account.

    Accounts created before credentials were tracked get a new password here
    if they still use a shared legacy default (which is not a secret).
    """
    cred = PortalCredential.objects.filter(user=user).first()
    if cred:
        return (cred.initial_password or None, cred.changed_by_user)
    if not user.has_usable_password() or any(user.check_password(p) for p in LEGACY_DEFAULT_PASSWORDS):
        return (issue_credential(user), False)
    # The user set a password we never issued: we can't show it.
    return (None, True)


def _user_for_email(email):
    User = apps.get_model('core_accounts', 'User')
    return User.objects.filter(email__iexact=email).first() if email else None


def _payload(username, user, reset_url, issue=True):
    if not user:
        return {'username': username, 'password': None, 'status': 'no_account', 'reset_url': None}
    if issue:
        password, changed = current_password(user)
    else:
        # Lists: report what is stored without hashing (issuing is slow per user).
        cred = PortalCredential.objects.filter(user=user).first()
        if not cred:
            return {'username': username, 'password': None, 'status': 'not_issued', 'reset_url': reset_url}
        password, changed = cred.initial_password or None, cred.changed_by_user
    return {
        'username': username,
        'password': password,
        'status': 'changed_by_user' if changed else 'issued',
        'reset_url': reset_url,
    }


def parent_user_for_student(student):
    ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
    profile = ParentProfile.objects.filter(linked_students=student).select_related('user').first()
    return profile.user if profile else None


def student_credentials(student, issue=True) -> dict:
    base = f'/api/v1/auth/credentials/student/{student.pk}/reset/'
    parent = parent_user_for_student(student)
    return {
        'student': _payload(student.student_id, _user_for_email(student.email), base + '?who=student', issue),
        'parent': _payload(parent.email, parent, base + '?who=parent', issue) if parent else None,
    }


def teacher_credentials(teacher, issue=True) -> dict:
    return {
        'staff': _payload(
            teacher.employee_id,
            _user_for_email(teacher.email),
            f'/api/v1/auth/credentials/teacher/{teacher.pk}/reset/',
            issue,
        ),
    }
