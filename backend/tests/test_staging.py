"""Staging copies are anonymised, and the anonymiser can never run on production (P5)."""
import pytest
from django.contrib.auth import authenticate
from django.core.management import call_command
from django.core.management.base import CommandError

from services.core.audit.models import AuditLog
from services.core.backup import anonymise, portable
from services.core.security.models import SignInEvent
from services.education.finance.models import PaymentGatewayConfig
from services.education.students.models import Student
from tests.conftest import SchoolFactory, StudentFactory, TeacherFactory, UserFactory


def _people():
    school = SchoolFactory()
    user = UserFactory(email='amina.khan@realschool.pk', first_name='Amina', last_name='Khan')
    teacher = TeacherFactory(school=school, full_name='Amina Khan', email='amina.khan@realschool.pk', national_id='35202-1234567-1')
    student = StudentFactory(full_name='Bilal Ahmed', father_name='Tariq Ahmed', address='12 Real Road, Lahore',
                             email='bilal@realschool.pk')
    PaymentGatewayConfig.objects.create(tenant=school, provider='stripe', api_key='pk_live_x', api_secret='sk_live_secret',
                                        webhook_secret='whsec_real')
    SignInEvent.objects.create(email='amina.khan@realschool.pk', outcome='success', ip_address='203.0.113.9')
    AuditLog.objects.create(user=user, action='UPDATE', resource_type='student', ip_address='203.0.113.9',
                            old_data={'address': '12 Real Road, Lahore'}, new_data={'email': 'bilal@realschool.pk'})
    return user, teacher, student


@pytest.mark.django_db
def test_refuses_outside_staging(settings):
    settings.APP_ENV, settings.DEBUG = 'production', False
    with pytest.raises(anonymise.NotStaging):
        anonymise.run('x')
    with pytest.raises(CommandError, match='APP_ENV=staging'):
        call_command('load_staging_data', '--anonymise-only')


@pytest.mark.django_db
def test_anonymises_people_secrets_and_logs(settings):
    settings.APP_ENV, settings.DEBUG = 'staging', False
    user, teacher, student = _people()
    dob_year = student.date_of_birth.year
    report = anonymise.run('Staging#2026')
    assert report['password'] == 'set'
    user.refresh_from_db(); teacher.refresh_from_db(); student.refresh_from_db()
    # The same real email becomes the same made-up one everywhere, so links by email still work.
    assert user.email.endswith('@example.test') and teacher.email == user.email
    assert (user.first_name, user.last_name) != ('Amina', 'Khan') and teacher.full_name != 'Amina Khan'
    assert teacher.national_id.startswith('X') and '35202' not in teacher.national_id
    assert student.full_name != 'Bilal Ahmed' and len(student.full_name.split()) == 2
    assert 'Real Road' not in student.address and student.father_name != 'Tariq Ahmed'
    assert student.date_of_birth.year == dob_year
    gw = PaymentGatewayConfig.objects.get()
    assert (gw.api_key, gw.api_secret, gw.webhook_secret) == ('', '', '')
    assert not SignInEvent.objects.exists()
    log = AuditLog.objects.get()
    assert log.action == 'UPDATE' and 'Real Road' not in str(log.old_data) and 'realschool' not in str(log.new_data)
    assert log.ip_address in (None, '0.0.0.0')
    assert authenticate(email=user.email, password='Staging#2026') is not None
    assert anonymise.leftovers() == []
    # Running again is harmless.
    anonymise.run('Staging#2026')
    assert anonymise.leftovers() == []


@pytest.mark.django_db(transaction=True)
def test_load_staging_data_restores_a_backup_and_anonymises(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.APP_ENV, settings.DEBUG = 'staging', False
    _people()
    log = portable.create('for staging')
    assert log.status == 'success', log.error_message
    Student.objects.all().delete()  # staging drifted; the load replaces everything
    call_command('load_staging_data', '--backup', 'latest')
    s = Student.objects.get()
    assert s.full_name != 'Bilal Ahmed' and s.email.endswith('@example.test')
    assert not PaymentGatewayConfig.objects.exclude(api_secret='').exists()
    # With no source it leaves the database alone.
    call_command('load_staging_data', '--backup', '')
    assert Student.objects.count() == 1
