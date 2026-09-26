"""Retention by record type (P17)."""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.audit.models import AuditLog
from services.core.security import retention
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.admissions.models import Applicant, Application
from services.education.communication.models import Conversation
from services.education.finance.models import Invoice, Payment
from services.education.students.models import Enrollment, Guardian, Student, StudentGuardian, StudentHealth
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

YEARS = 365


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def rt(db):
    school = SchoolFactory(name='Hill School')
    admin = UserFactory(email='office@hill.test')
    TenantMembership.objects.create(user=admin, school=school, role='admin', is_primary=True)
    long_ago = timezone.now() - timedelta(days=4 * YEARS)
    with use_tenant(school):
        from services.education.academics.models import SchoolClass

        g5 = SchoolClass.objects.create(tenant=school, name='Grade 5', code='G5', grade_level=5)
    kw = dict(tenant=school, current_class=g5, father_name='Omar Khan', mother_name='', guardian_name='', guardian_phone='0300 1111111')
    left = StudentFactory(full_name='Bilal Khan', email='bilal@hill.test', address='12 Real Road', **kw)
    stays = StudentFactory(full_name='Sara Khan', **kw)
    with use_tenant(school):
        Student.objects.filter(pk=left.pk).update(is_active=False)
        Enrollment.objects.create(student=left, start_date=date(2018, 9, 1), end_date=(long_ago - timedelta(days=10)).date(), status='withdrawn')
        StudentHealth.objects.create(tenant=school, student=left, allergies='Peanuts')
        mum = Guardian.objects.create(tenant=school, first_name='Amna', last_name='Khan', mobile_phone='0300 2222222')
        uncle = Guardian.objects.create(tenant=school, first_name='Tariq', last_name='Khan', mobile_phone='0300 3333333')
        StudentGuardian.objects.create(tenant=school, student=left, guardian=mum)
        StudentGuardian.objects.create(tenant=school, student=stays, guardian=mum)  # mum still has a child here
        StudentGuardian.objects.create(tenant=school, student=left, guardian=uncle)  # only linked to the leaver
        applicant = Applicant.objects.create(tenant=school, full_name='Old Applicant', email='a@x.test', date_of_birth=date(2015, 1, 1))
        old_app = Application.objects.create(applicant=applicant, status='rejected')
        new_app = Application.objects.create(applicant=applicant, status='rejected')
        Application.objects.filter(pk=old_app.pk).update(updated_at=long_ago)
        conv = Conversation.objects.create(tenant=school, subject='Old chat')
        Conversation.objects.filter(pk=conv.pk).update(last_message_at=long_ago)
        Conversation.objects.create(tenant=school, subject='New chat')
        old_inv = Invoice.objects.create(student=stays, invoice_number='INV-OLD', amount=Decimal('100'),
                                         due_date=date.today() - timedelta(days=7 * YEARS), status='issued')
        Payment.objects.create(invoice=old_inv, amount=Decimal('100'), payment_method='cash')
        Invoice.objects.filter(pk=old_inv.pk).update(status='paid')
        Invoice.objects.create(student=stays, invoice_number='INV-NEW', amount=Decimal('100'), due_date=date.today(), status='paid')
    return dict(school=school, admin=admin, left=left, stays=stays, mum=mum, uncle=uncle, new_app=new_app)


@pytest.mark.django_db
def test_nothing_is_removed_until_the_school_decides(rt):
    assert retention.apply(rt['school']) == {}
    counts = retention.preview(rt['school'])
    assert counts['left_students'] == 1 and counts['declined_applications'] == 1 and counts['messages'] == 1
    assert counts['paid_invoices'] == 1
    assert Student._base_manager.get(pk=rt['left'].pk).full_name == 'Bilal Khan'


@pytest.mark.django_db
def test_rules_are_applied_by_record_type(rt):
    school = rt['school']
    assert retention.save(school, {'paid_invoices': 365})[1]  # accounts: at least 5 years
    assert retention.save(school, {'messages': 10})[1]
    rules, problem = retention.save(school, {'left_students': 3 * YEARS, 'declined_applications': YEARS, 'messages': YEARS,
                                             'paid_invoices': 6 * YEARS})
    assert problem is None
    done = retention.apply(school)
    assert done == {'left_students': 1, 'declined_applications': 1, 'messages': 1, 'paid_invoices': 1}
    left = Student._base_manager.get(pk=rt['left'].pk)
    assert left.full_name.startswith('Former student') and left.email == '' and left.address == '' and left.father_name == ''
    assert not StudentHealth._base_manager.filter(student=left).exists()
    assert not StudentGuardian._base_manager.filter(student=left).exists()
    rt['uncle'].refresh_from_db(); rt['mum'].refresh_from_db()
    assert rt['uncle'].first_name == 'Former' and rt['uncle'].mobile_phone == ''  # only the leaver's
    assert rt['mum'].first_name == 'Amna' and rt['mum'].mobile_phone  # still has a child here
    from django.contrib.auth import get_user_model

    assert not get_user_model()._base_manager.filter(email__iexact='bilal@hill.test').exists()  # the created login
    login = get_user_model()._base_manager.filter(email__startswith='former-').first()
    assert login is not None and not login.is_active and not login.has_usable_password()
    # Recent records and the pupil who stays are untouched; the old paid invoice and its payment are gone.
    assert Student._base_manager.get(pk=rt['stays'].pk).full_name == 'Sara Khan'
    assert list(Application._base_manager.values_list('pk', flat=True)) == [rt['new_app'].pk]
    assert list(Conversation._base_manager.values_list('subject', flat=True)) == ['New chat']
    assert list(Invoice._base_manager.values_list('invoice_number', flat=True)) == ['INV-NEW']
    assert not Payment._base_manager.exists()
    assert AuditLog.objects.filter(school=school, resource_type='v1/security/retention/').exists()
    assert retention.apply(school) == {'left_students': 0, 'declined_applications': 0, 'messages': 0, 'paid_invoices': 0}


@pytest.mark.django_db
def test_office_screen_and_the_daily_job(rt):
    c = _client(rt['admin'])
    data = c.get('/api/v1/security/retention/').json()
    by = {r['key']: r for r in data['rules']}
    assert by['left_students']['days'] == 0 and by['left_students']['due_now'] == 1 and by['paid_invoices']['minimum_days'] == 5 * YEARS
    assert c.put('/api/v1/security/retention/', {'messages': 5}, format='json').status_code == 400
    saved = c.put('/api/v1/security/retention/', {'messages': YEARS}, format='json').json()
    assert {r['key']: r for r in saved['rules']}['messages']['days'] == YEARS
    teacher = UserFactory(email='t@hill.test')
    TenantMembership.objects.create(user=teacher, school=rt['school'], role='teacher', is_primary=True)
    assert _client(teacher).get('/api/v1/security/retention/').status_code == 403
    call_command('apply_retention', '--dry-run')
    assert Conversation._base_manager.count() == 2  # a dry run changes nothing
    call_command('apply_retention')
    assert list(Conversation._base_manager.values_list('subject', flat=True)) == ['New chat']
