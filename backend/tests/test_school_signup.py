"""Self-service school signup: a new school starts empty and isolated, with its own admin."""
from unittest import mock

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.google_identity import GoogleIdentity
from services.core.tenants.models import School, TenantMembership
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

SIGNUP = '/api/v1/tenants/signup/'


def _bearer(access):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
    return c


@pytest.fixture(autouse=True)
def _no_throttle_cache(settings):
    settings.CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}


@pytest.mark.django_db
def test_signup_creates_school_admin_and_signs_in():
    res = APIClient().post(SIGNUP, {
        'school_name': 'Green Valley School', 'admin_name': 'Sana Malik',
        'email': 'sana@greenvalley.pk', 'password': 'Valley#School2026', 'city': 'Multan',
    }, format='json')

    assert res.status_code == 201, res.content
    body = res.json()
    assert body['user']['role'] == 'admin' and body['user']['portal_path'] == '/dashboard'
    assert body['tenant']['name'] == 'Green Valley School' and body['tenant']['tenant_code'] == 'GVS'
    school = School.objects.get(pk=body['tenant']['id'])
    assert TenantMembership.objects.filter(school=school, user__email='sana@greenvalley.pk', role='admin').exists()
    # and the password works at the normal login
    login = APIClient().post('/api/v1/auth/login/', {'user_id': 'sana@greenvalley.pk', 'password': 'Valley#School2026'},
                             format='json')
    assert login.status_code == 200


@pytest.mark.django_db
def test_new_school_starts_empty_and_cannot_see_existing_schools():
    existing = SchoolFactory(name='Old School')
    StudentFactory(tenant=existing, full_name='Existing Kid')
    res = APIClient().post(SIGNUP, {
        'school_name': 'Fresh Start Academy', 'admin_name': 'Ali', 'email': 'ali@fresh.pk', 'password': 'Fresh#Start2026',
    }, format='json')
    client = _bearer(res.json()['access'])

    students = client.get('/api/v1/students/').content.decode()
    assert 'Existing Kid' not in students
    onboarding = client.get('/api/v1/tenants/onboarding/').json()
    assert onboarding['school']['name'] == 'Fresh Start Academy'
    assert not onboarding['complete'] and not any(s['done'] for s in onboarding['steps'] if s['key'] == 'students')


@pytest.mark.django_db
def test_signup_rejects_existing_email_and_weak_password():
    UserFactory(email='taken@school.pk')
    taken = APIClient().post(SIGNUP, {'school_name': 'Any School', 'admin_name': 'X', 'email': 'taken@school.pk',
                                      'password': 'Good#Pass2026'}, format='json')
    assert taken.status_code == 400 and 'email' in taken.json()['fields']
    weak = APIClient().post(SIGNUP, {'school_name': 'Any School', 'admin_name': 'X', 'email': 'new@school.pk',
                                     'password': '123'}, format='json')
    assert weak.status_code == 400 and 'password' in weak.json()['fields']
    assert not School.objects.filter(name='Any School').exists()


@pytest.mark.django_db
def test_google_signup_and_login():
    ident = GoogleIdentity(uid='g-123', email='head@hilltop.pk', name='Hina Head', email_verified=True)
    with mock.patch('services.core.accounts.google_identity.verify_google_identity', return_value=ident):
        created = APIClient().post(SIGNUP, {'school_name': 'Hilltop School', 'id_token': 'tok'}, format='json')
        assert created.status_code == 201, created.content
        assert created.json()['user']['full_name'] == 'Hina Head'

        again = APIClient().post('/api/v1/auth/firebase/login/', {'id_token': 'tok'}, format='json')
        assert again.status_code == 200 and again.json()['tenant']['name'] == 'Hilltop School'


@pytest.mark.django_db
def test_unknown_google_user_is_sent_to_signup_not_given_an_account():
    ident = GoogleIdentity(uid='g-999', email='stranger@gmail.com', name='Stranger', email_verified=True)
    with mock.patch('services.core.accounts.google_identity.verify_google_identity', return_value=ident):
        res = APIClient().post('/api/v1/auth/firebase/login/', {'id_token': 'tok'}, format='json')
    assert res.status_code == 404 and res.json()['needs_signup'] is True
    from django.contrib.auth import get_user_model
    assert not get_user_model().objects.filter(email='stranger@gmail.com').exists()


@pytest.mark.django_db
def test_google_login_without_configuration_is_refused(monkeypatch):
    monkeypatch.delenv('FIREBASE_PROJECT_ID', raising=False)
    res = APIClient().post('/api/v1/auth/firebase/login/', {'id_token': 'anything'}, format='json')
    assert res.status_code == 401
    assert APIClient().get('/api/v1/tenants/signup/config/').json() == {'google_sign_in': False}


@pytest.mark.django_db
def test_platform_owner_sees_all_schools_and_can_suspend_one():
    owner = UserFactory(is_superuser=True, is_staff=True)
    res = APIClient().post(SIGNUP, {'school_name': 'Suspend Me School', 'admin_name': 'A', 'email': 'a@susp.pk',
                                    'password': 'Suspend#Me2026'}, format='json')
    school_id, admin_access = res.json()['tenant']['id'], res.json()['access']
    other = SchoolFactory(name='Other School')
    StudentFactory(tenant=other)

    client = _bearer(str(RefreshToken.for_user(owner).access_token))
    listing = client.get('/api/v1/tenants/platform/schools/').json()
    names = {s['name']: s for s in listing['schools']}
    assert 'Suspend Me School' in names and names['Other School']['students'] == 1

    assert client.post(f'/api/v1/tenants/platform/schools/{school_id}/status/', {'is_active': False},
                       format='json').status_code == 200
    # the suspended school's admin is locked out of the API and the login
    assert _bearer(admin_access).get('/api/v1/students/').status_code == 403
    login = APIClient().post('/api/v1/auth/login/', {'user_id': 'a@susp.pk', 'password': 'Suspend#Me2026'}, format='json')
    assert login.status_code == 403


@pytest.mark.django_db
def test_school_admin_cannot_open_platform_console():
    res = APIClient().post(SIGNUP, {'school_name': 'Plain School', 'admin_name': 'P', 'email': 'p@plain.pk',
                                    'password': 'Plain#School2026'}, format='json')
    assert _bearer(res.json()['access']).get('/api/v1/tenants/platform/schools/').status_code == 403
