"""Region style: Pakistan / International / UK / US wording, dates, forms and payment methods (Phase 20)."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.localization import school_locale
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory

URL = '/api/v1/tenants/locale/'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def rg(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher')
    return dict(s=s, admin=admin, teacher=teacher)


@pytest.mark.django_db
def test_defaults_follow_the_currency(rg):
    s = rg['s']
    loc = school_locale(s)
    assert loc['region'] == 'pk' and loc['terms']['challan'] == 'Challan' and loc['hidden_fields'] == []
    assert loc['date_format'] == 'DD/MM/YYYY' and loc['week_start'] == 1
    assert [m['code'] for m in loc['payment_methods']][:4] == ['cash', 'bank_transfer', 'jazzcash', 'easypaisa']
    s.settings_json = {'currency': 'EUR'}
    assert school_locale(s)['region'] == 'pk'  # never chose: nothing changes for existing schools


@pytest.mark.django_db
def test_switching_region(rg):
    office = _client(rg['admin'])
    r = office.put(URL, {'region': 'us', 'apply_defaults': True}, format='json').json()['locale']
    assert r['region'] == 'us' and r['currency'] == 'USD' and r['timezone'] == 'America/New_York'
    assert r['date_format'] == 'MM/DD/YYYY' and r['date_locale'] == 'en-US' and r['week_start'] == 0
    assert r['terms']['challan'] == 'Invoice' and r['terms']['date_sheet'] == 'Exam Schedule' and r['terms']['cheque'] == 'Check'
    assert r['terms']['enrolment'] == 'Enrollment' and 'cast' in r['hidden_fields']
    assert [m['code'] for m in r['payment_methods']] == ['card', 'ach', 'check', 'cash']
    # Overrides stick; switching region again brings that region's date format back, and keeps the currency.
    r = office.put(URL, {'date_format': 'YYYY-MM-DD', 'week_start': 1}, format='json').json()['locale']
    assert r['date_format'] == 'YYYY-MM-DD' and r['date_locale'] == 'sv-SE' and r['week_start'] == 1
    r = office.put(URL, {'region': 'uk'}, format='json').json()['locale']
    assert r['date_format'] == 'DD/MM/YYYY' and r['currency'] == 'USD' and r['terms']['principal'] == 'Head Teacher'
    # Bad values and other roles are refused; everyone signed in can read it.
    assert office.put(URL, {'region': 'mars'}, format='json').status_code == 400
    assert office.put(URL, {'date_format': 'DD.MM.YY'}, format='json').status_code == 400
    assert office.put(URL, {'week_start': 3}, format='json').status_code == 400
    assert _client(rg['teacher']).put(URL, {'region': 'pk'}, format='json').status_code == 403
    got = _client(rg['teacher']).get(URL).json()
    assert got['locale']['region'] == 'uk' and {x['code'] for x in got['regions']} == {'pk', 'intl', 'uk', 'us'}
    assert got['date_formats'] == ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']


@pytest.mark.django_db
def test_new_schools_start_in_the_style_of_their_currency(db):
    from services.core.tenants.signup import create_school_with_admin

    pk, _ = create_school_with_admin(school_name='Lahore Grammar', admin_email='a@lg.test', admin_name='A', password='Secret-123x', currency='PKR')
    eu, _ = create_school_with_admin(school_name='Berlin Academy', admin_email='b@ba.test', admin_name='B', password='Secret-123x', currency='EUR')
    assert school_locale(pk)['region'] == 'pk' and school_locale(pk)['terms']['date_sheet'] == 'Date Sheet'
    assert school_locale(eu)['region'] == 'intl' and school_locale(eu)['terms']['date_sheet'] == 'Exam Timetable'
    assert 'cast' in school_locale(eu)['hidden_fields']
