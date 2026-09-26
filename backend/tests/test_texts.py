"""Automatic SMS and WhatsApp (P16), with Twilio replaced by a fake."""
import base64
import hashlib
import hmac
from datetime import date
from decimal import Decimal
from unittest import mock

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.communication import texts
from services.education.communication.models import Announcement, Message, SmsConfig
from services.education.students.models import Guardian, StudentGuardian
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

T = '/api/v1/auth/communication/texts'


class FakeTwilio:
    def __init__(self, fail_to=()):
        self.sent, self.fail_to, self.n = [], set(fail_to), 0

    def __call__(self, url, data=None, auth=None, timeout=None):
        self.n += 1
        self.sent.append(data)
        resp = mock.Mock()
        if data['To'].replace('whatsapp:', '') in self.fail_to:
            resp.status_code, resp.content = 400, b'x'
            resp.json.return_value = {'message': "The 'To' number is not a valid phone number."}
        else:
            resp.status_code, resp.content = 201, b'x'
            resp.json.return_value = {'sid': f'SM{self.n:030d}', 'status': 'queued'}
        return resp


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def tx(db, settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    school = SchoolFactory(name='Hill School')
    admin = UserFactory(email='office@hill.test')
    TenantMembership.objects.create(user=admin, school=school, role='admin', is_primary=True)
    with use_tenant(school):
        SmsConfig.objects.create(tenant=school, account_sid='AC1', auth_token='tok', from_number='+15550001111',
                                 whatsapp_from='+15550002222', default_country_code='92')
        from services.education.academics.models import SchoolClass

        g5 = SchoolClass.objects.create(tenant=school, name='Grade 5', code='G5', grade_level=5)
    student = StudentFactory(tenant=school, current_class=g5, full_name='Sara Ali', father_name='', mother_name='',
                             guardian_name='', guardian_phone='')
    with use_tenant(school):
        g = Guardian.objects.create(tenant=school, first_name='Amna', last_name='Ali', mobile_phone='0300 1234567', email='amna@x.test')
        StudentGuardian.objects.create(tenant=school, student=student, guardian=g, receives_messages=True, receives_billing=True, is_primary=True)
    return dict(school=school, admin=admin, student=student)


@pytest.mark.django_db
def test_absence_alert_by_sms_and_whatsapp_once(tx, settings):
    settings.PUBLIC_API_URL = 'https://api.example.com'
    fake = FakeTwilio()
    school, student = tx['school'], tx['student']
    r = texts.rule('absent', school)
    r.whatsapp = True
    r.save()
    with mock.patch('services.education.communication.texts.requests.post', fake), use_tenant(school):
        from services.education.attendance.register import send_notice

        send_notice(student, date(2026, 9, 28), 'absent', 'Sara was absent.')
        send_notice(student, date(2026, 9, 28), 'absent', 'again')  # the same alert never goes twice
    assert len(fake.sent) == 2
    sms, wa = fake.sent
    assert sms['To'] == '+923001234567' and sms['From'] == '+15550001111' and 'Sara Ali was marked absent today (28 Sep 2026)' in sms['Body']
    assert wa['To'] == 'whatsapp:+923001234567' and wa['From'] == 'whatsapp:+15550002222'
    assert sms['StatusCallback'] == 'https://api.example.com/api/v1/auth/communication/texts/status/'
    logged = Message._base_manager.filter(event='absent')
    assert logged.count() == 2 and {m.channel for m in logged} == {'sms', 'whatsapp'} and all(m.delivery_status == 'queued' for m in logged)
    # Late arrivals are off until the school turns them on.
    with mock.patch('services.education.communication.texts.requests.post', fake), use_tenant(school):
        send_notice(student, date(2026, 9, 29), 'late', 'late', {'minutes': ' (10 minutes late)'})
    assert len(fake.sent) == 2


@pytest.mark.django_db
def test_rules_wording_and_test_send(tx):
    c = _client(tx['admin'])
    data = c.get(f'{T}/rules/').json()
    assert {r['event'] for r in data['rules']} == set(texts.DEFAULTS) and data['ready'] == {'sms': True, 'whatsapp': True}
    r = c.put(f'{T}/rules/', {'rules': [{'event': 'late', 'is_active': True, 'template': 'Late: {student} on {date}{minutes}. {oops}'}]},
              format='json').json()
    late = next(x for x in r['rules'] if x['event'] == 'late')
    assert late['is_active'] and late['template'].startswith('Late:')
    assert c.put(f'{T}/rules/', {'rules': [{'event': 'late', 'template': ' '}]}, format='json').status_code == 400
    assert texts.render('Hi {student} {oops}', {'student': 'Sara'}) == 'Hi Sara {oops}'  # a typo never stops an alert
    fake = FakeTwilio()
    with mock.patch('services.education.communication.texts.requests.post', fake):
        ok = c.post(f'{T}/test/', {'event': 'late', 'to': '+447700900123', 'channel': 'sms'}, format='json').json()
    assert 'Late: Ali Khan' in ok['body'] and fake.sent[0]['To'] == '+447700900123'
    # Families and teachers can't touch any of it.
    parent = UserFactory(email='p@hill.test')
    TenantMembership.objects.create(user=parent, school=tx['school'], role='parent', is_primary=True)
    assert _client(parent).get(f'{T}/rules/').status_code == 403


@pytest.mark.django_db
def test_fee_reminder_text_with_amount(tx):
    from services.education.finance.models import Invoice

    school, student = tx['school'], tx['student']
    school.settings_json = {**(school.settings_json or {}), 'currency': 'PKR'}
    school.save()
    with use_tenant(school):
        inv = Invoice.objects.create(student=student, invoice_number='INV-9', amount=Decimal('5000'),
                                     due_date=date(2026, 10, 5), invoice_month=date(2026, 10, 1), status='issued')
    fake = FakeTwilio()
    with mock.patch('services.education.communication.texts.requests.post', fake):
        sent = texts.fee_reminder(inv)
        again = texts.fee_reminder(inv)  # once a day
    assert len(sent) == 1 and again == []
    assert 'PKR 5,000' in fake.sent[0]['Body'] and '05 Oct 2026' in fake.sent[0]['Body'] and 'INV-9' in fake.sent[0]['Body']


@pytest.mark.django_db
def test_emergency_delivery_report_retry_and_status(tx, settings):
    settings.PUBLIC_API_URL = 'https://api.example.com'
    school = tx['school']
    with use_tenant(school):
        g2 = Guardian.objects.create(tenant=school, first_name='Bad', last_name='Number', mobile_phone='+1555000999', email='')
        StudentGuardian.objects.create(tenant=school, student=tx['student'], guardian=g2, receives_messages=True)
    c = _client(tx['admin'])
    fake = FakeTwilio(fail_to={'+1555000999'})
    with mock.patch('services.education.communication.texts.requests.post', fake):
        r = c.post(f'{T}/emergency/', {'message': 'School closed today due to flooding.', 'audience': 'parents',
                                       'channels': ['sms']}, format='json').json()
    assert r['texts'] == {'sent': 1, 'failed': 1} and 'URGENT: School closed' in fake.sent[0]['Body']
    ann = Announcement.objects.get(pk=r['announcement_id'])
    assert ann.is_pinned and ann.sent_at
    rep = c.get(f'{T}/log/', {'batch': r['batch']}).json()
    assert len(rep['messages']) == 2 and rep['week']['failed'] == 1
    bad = next(m for m in rep['messages'] if m['status'] == 'failed')
    assert 'not a valid phone number' in bad['error']
    # Retry the failed one (the number works now).
    fake.fail_to.clear()
    with mock.patch('services.education.communication.texts.requests.post', fake):
        again = c.post(f'{T}/retry/', {'batch': r['batch']}, format='json').json()
    assert again['sent'] == 1 and again['failed'] == 0
    # Twilio reports delivery: signed with the school's auth token.
    good = Message._base_manager.filter(batch=r['batch'], delivery_status='queued').first()
    params = {'MessageSid': good.external_id, 'MessageStatus': 'delivered'}
    url = 'https://api.example.com/api/v1/auth/communication/texts/status/'
    sig = base64.b64encode(hmac.new(b'tok', (url + ''.join(f'{k}{params[k]}' for k in sorted(params))).encode(), hashlib.sha1).digest()).decode()
    anon = APIClient()
    assert anon.post(f'{T}/status/', params, HTTP_X_TWILIO_SIGNATURE='forged').status_code == 403
    assert anon.post(f'{T}/status/', params, HTTP_X_TWILIO_SIGNATURE=sig).status_code == 204
    good.refresh_from_db()
    assert good.delivery_status == 'delivered' and good.is_delivered and good.delivered_at
    assert anon.post(f'{T}/status/', {'MessageSid': 'nope'}).status_code == 404


@pytest.mark.django_db
def test_nothing_is_sent_without_setup(tx):
    SmsConfig._base_manager.all().delete()
    with mock.patch('services.education.communication.texts.requests.post') as post:
        assert texts.notify_family(tx['student'], 'absent', {}, key='x') == []
        post.assert_not_called()
    assert not Message._base_manager.filter(channel__in=('sms', 'whatsapp')).exists()
