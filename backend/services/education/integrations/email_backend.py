"""Send each school's email through its own mail server when it has set one up; otherwise use the server default.

settings.EMAIL_BACKEND points here; the previous choice (SMTP from env, or the console) is FALLBACK_EMAIL_BACKEND.
"""
from django.conf import settings
from django.core.mail import get_connection
from django.core.mail.backends.base import BaseEmailBackend


def school_smtp(school):
    """(connection, from address) for a school's own SMTP, or (None, None)."""
    if school is None:
        return None, None
    from .models import Integration
    from .secrets import unseal

    row = Integration.all_objects.filter(tenant=school, provider='email', enabled=True).first()
    if row is None or not row.config.get('host'):
        return None, None
    c, secret = row.config, unseal(row.secret_blob)
    conn = get_connection('django.core.mail.backends.smtp.EmailBackend', host=c['host'], port=int(c.get('port') or 587),
                          username=c.get('username') or None, password=secret.get('password') or None,
                          use_tls=bool(c.get('use_tls', True)) and not c.get('use_ssl'), use_ssl=bool(c.get('use_ssl')),
                          timeout=20)
    name, address = c.get('from_name') or school.name, c.get('from_email') or c.get('username')
    return conn, (f'{name} <{address}>' if address else None)


class TenantEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        from services.core.tenants.context import get_current_tenant

        conn, sender = school_smtp(get_current_tenant())
        if conn is None:
            return get_connection(getattr(settings, 'FALLBACK_EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend'),
                                  fail_silently=self.fail_silently).send_messages(email_messages)
        for m in email_messages:
            if sender and m.from_email in (None, '', settings.DEFAULT_FROM_EMAIL):
                m.from_email = sender
        conn.fail_silently = self.fail_silently
        return conn.send_messages(email_messages)
