"""Households, guardians, health and the tabbed student profile (Phase 1)."""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.models import TenantMembership
from services.education.students.models import Guardian, Household, Student, StudentGuardian
from tests.conftest import ClassFactory, SchoolFactory, StudentFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _admin(school):
    user = UserFactory(email=f'admin@{school.tenant_code.lower()}.test')
    TenantMembership.objects.create(user=user, school=school, role='admin', is_primary=True)
    return user


@pytest.fixture
def school(db):
    return SchoolFactory(name='Maple School')


@pytest.mark.django_db
def test_classic_form_creates_household_and_groups_siblings(school):
    cls = ClassFactory(school=school)
    a = StudentFactory(tenant=school, current_class=cls, full_name='Ali Khan', father_name='Imran Khan',
                       father_national_id='35202-1', mother_name='Sara Khan', father_mobile='0300', guardian_name='')
    b = StudentFactory(tenant=school, current_class=cls, full_name='Zara Khan', father_name='Imran Khan',
                       father_national_id='35202-1', mother_name='Sara Khan', guardian_name='')
    a.refresh_from_db()
    b.refresh_from_db()
    assert a.household_id and a.household_id == b.household_id
    household = Household.all_objects.get(pk=a.household_id)
    assert household.name == 'Khan family'
    names = sorted(Guardian.all_objects.filter(household=household).values_list('first_name', 'relationship'))
    assert names == [('Imran', 'father'), ('Sara', 'mother')]  # no duplicates for the sibling
    assert StudentGuardian.all_objects.filter(student=b).count() == 2
    primary = StudentGuardian.all_objects.get(student=a, is_primary=True)
    assert primary.guardian.relationship == 'father' and primary.receives_billing


@pytest.mark.django_db
def test_admin_manages_guardians_health_and_immunizations(school):
    admin = _admin(school)
    student = StudentFactory(tenant=school, full_name='Mia Lopez', father_name='', mother_name='', guardian_name='')
    api = _client(admin)
    base = f'/api/v1/students/{student.id}'

    res = api.post(f'{base}/guardians/', {
        'guardian': {'first_name': 'Ana', 'last_name': 'Lopez', 'relationship': 'mother',
                     'email': 'ana@example.com', 'mobile_phone': '555-0100'},
        'is_primary': True, 'receives_billing': True, 'can_pickup': True,
    }, format='json')
    assert res.status_code == 201, res.content
    link_id = res.json()['id']

    res = api.post(f'{base}/guardians/', {
        'guardian': {'first_name': 'Tom', 'last_name': 'Reed', 'relationship': 'stepfather'},
        'can_pickup': False, 'has_custody': False, 'custody_notes': 'Not allowed to collect (court order)',
    }, format='json')
    assert res.status_code == 201

    res = api.patch(f'{base}/guardians/{link_id}/', {'priority': 2}, format='json')
    assert res.status_code == 200 and res.json()['priority'] == 2

    assert api.put(f'{base}/health/', {'allergies': 'Peanuts', 'has_severe_allergy': True},
                   format='json').status_code == 200
    assert api.post(f'{base}/immunizations/', {'vaccine': 'MMR', 'dose': '1', 'date_given': '2020-05-01'},
                    format='json').status_code == 201

    profile = api.get(f'{base}/profile/').json()
    assert profile['can_edit'] is True
    assert profile['household']['name'] == 'Lopez family'
    assert {g['guardian']['first_name'] for g in profile['guardians']} == {'Ana', 'Tom'}
    tom = next(g for g in profile['guardians'] if g['guardian']['first_name'] == 'Tom')
    assert tom['can_pickup'] is False and 'court order' in tom['custody_notes']
    assert profile['health']['allergies'] == 'Peanuts' and profile['health']['has_severe_allergy'] is True
    assert profile['immunizations'][0]['vaccine'] == 'MMR'

    households = api.get('/api/v1/students/households/?search=lopez').json()
    rows = households.get('results', households)
    assert len(rows) == 1 and len(rows[0]['guardians']) == 2


@pytest.mark.django_db
def test_only_admins_change_family_records(school):
    student = StudentFactory(tenant=school, full_name='Kid One', email='kid@example.com')
    from django.contrib.auth import get_user_model

    student_user = (get_user_model().objects.filter(email='kid@example.com').first()
                    or UserFactory(email='kid@example.com'))
    api = _client(student_user)
    assert api.get(f'/api/v1/students/{student.id}/profile/').status_code == 200
    res = api.post(f'/api/v1/students/{student.id}/guardians/',
                   {'guardian': {'first_name': 'X'}}, format='json')
    assert res.status_code == 403
    assert api.put(f'/api/v1/students/{student.id}/health/', {'allergies': 'x'}, format='json').status_code == 403
    assert api.get('/api/v1/students/households/').status_code == 403


@pytest.mark.django_db
def test_households_are_isolated_between_schools(school):
    other = SchoolFactory(name='Other School')
    StudentFactory(tenant=other, full_name='Hidden Kid', father_name='Secret Parent')
    admin = _admin(school)
    body = _client(admin).get('/api/v1/students/households/').json()
    assert 'Secret' not in str(body)
    hidden = Household.all_objects.get(tenant=other)
    assert _client(admin).get(f'/api/v1/students/households/{hidden.id}/').status_code == 404


@pytest.mark.django_db
def test_siblings_sharing_a_parent_login_share_a_household(school):
    from services.core.accounts.models import ParentProfile
    from services.education.students.households import merge_households_sharing_a_parent_login

    parent = ParentProfile.objects.create(user=UserFactory(email='kashif@example.com'))
    a = StudentFactory(tenant=school, full_name='Ali Raza', father_name='Kashif Raza', mother_name='', guardian_name='')
    b = StudentFactory(tenant=school, full_name='Fatima Raza', father_name='Kashif Raza', mother_name='', guardian_name='')
    a.refresh_from_db(); b.refresh_from_db()
    assert a.household_id != b.household_id  # no national ID to match on
    parent.linked_students.add(a, b)
    assert merge_households_sharing_a_parent_login() == 1
    a.refresh_from_db(); b.refresh_from_db()
    assert a.household_id == b.household_id
    assert Guardian.all_objects.filter(household_id=a.household_id).count() == 1  # the father, once
    assert StudentGuardian.all_objects.filter(student__in=[a, b]).count() == 2

    # A new sibling linked to the same parent login joins the family automatically.
    c = StudentFactory(tenant=school, full_name='Zain Raza', father_name='', mother_name='', guardian_name='')
    parent.linked_students.add(c)
    Student.all_objects.filter(pk=c.pk).update(father_name='Kashif Raza', household=None)
    c.refresh_from_db()
    from services.education.students.households import ensure_household
    from services.core.tenants.context import use_tenant
    with use_tenant(school):
        assert ensure_household(c).pk == a.household_id
