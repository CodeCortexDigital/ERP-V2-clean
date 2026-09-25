"""School years, terms, enrollment history, year rollover and schedules (Phase 5)."""
import datetime

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import AcademicYear, SchoolClass, Section, Term
from services.education.students.models import Enrollment, Student
from tests.conftest import SchoolFactory, StudentFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def school(db):
    s = SchoolFactory(name='Cedar School')
    admin = UserFactory(email='admin@cedar.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    with use_tenant(s):
        year = AcademicYear.objects.create(tenant=s, name='2026-27', start_date=datetime.date(2026, 8, 1),
                                           end_date=datetime.date(2027, 6, 30), is_active=True)
        g5 = SchoolClass.objects.create(tenant=s, name='Grade 5', code='G5', grade_level=5)
        g6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        Section.objects.create(tenant=s, class_ref=g5, name='A')
        Section.objects.create(tenant=s, class_ref=g6, name='A')
    return s, admin, year, g5, g6


@pytest.mark.django_db
def test_terms_split_the_year_and_reject_overlaps(school):
    s, admin, year, *_ = school
    api = _client(admin)
    res = api.post(f'/api/v1/auth/academics/years/{year.id}/generate-terms/', {'kind': 'semester'}, format='json')
    assert res.status_code == 201, res.content
    terms = res.json()['terms']
    assert [t['name'] for t in terms] == ['Semester 1', 'Semester 2']
    assert terms[0]['start_date'] == '2026-08-01' and terms[-1]['end_date'] == '2027-06-30'
    assert terms[1]['start_date'] > terms[0]['end_date']

    bad = api.post('/api/v1/auth/academics/terms/', {'academic_year': str(year.id), 'name': 'Summer',
                   'start_date': '2027-06-01', 'end_date': '2027-07-15'}, format='json')
    assert bad.status_code == 400 and 'inside the school year' in bad.json()['error']
    overlap = api.post('/api/v1/auth/academics/terms/', {'academic_year': str(year.id), 'name': 'Extra',
                       'start_date': '2026-09-01', 'end_date': '2026-09-30'}, format='json')
    assert overlap.status_code == 400 and 'overlap' in overlap.json()['error']

    teacher = _client(UserFactory(email='t@cedar.test'))
    assert teacher.post(f'/api/v1/auth/academics/years/{year.id}/generate-terms/', {'kind': 'quarter'},
                        format='json').status_code == 403


@pytest.mark.django_db
def test_enrollment_history_follows_class_changes(school):
    s, admin, year, g5, g6 = school
    kid = StudentFactory(tenant=s, current_class=g5, full_name='Lily Park', admission_date=datetime.date(2026, 8, 20))
    with use_tenant(s):
        rows = list(Enrollment.objects.filter(student=kid))
        assert len(rows) == 1 and rows[0].school_class == g5 and rows[0].academic_year == year
        assert rows[0].start_date == datetime.date(2026, 8, 20)

        kid.current_class = g6
        kid.save()
        rows = list(Enrollment.objects.filter(student=kid).order_by('created_at'))
        assert [r.status for r in rows] == ['promoted', 'enrolled']
        assert rows[0].end_date is not None and rows[1].school_class == g6

        kid.is_active = False
        kid.save()
        assert Enrollment.objects.get(student=kid, school_class=g6).status == 'withdrawn'

    profile = _client(admin).get(f'/api/v1/students/{kid.id}/profile/').json()
    assert [e['status'] for e in profile['enrollments']] == ['withdrawn', 'promoted']


@pytest.mark.django_db
def test_year_rollover_promotes_repeats_and_graduates(school):
    s, admin, year, g5, g6 = school
    with use_tenant(s):
        a5 = Section.objects.get(class_ref=g5)
    moving = StudentFactory(tenant=s, current_class=g5, current_section=a5, full_name='Mover')
    staying = StudentFactory(tenant=s, current_class=g5, full_name='Stayer')
    leaving = StudentFactory(tenant=s, current_class=g6, full_name='Leaver')
    api = _client(admin)
    nxt = api.post('/api/v1/auth/academics/years/', {'name': '2027-28', 'start_date': '2027-08-01',
                                                     'end_date': '2028-06-30'}, format='json').json()
    assert nxt['is_active'] is False  # the current year stays current until the rollover

    preview = api.post(f"/api/v1/auth/academics/years/{nxt['id']}/rollover/", {'preview': True}, format='json').json()
    assert preview['promote'] == 2 and preview['graduate'] == 1 and 'done' not in preview

    done = api.post(f"/api/v1/auth/academics/years/{nxt['id']}/rollover/",
                    {'preview': False, 'repeat': [str(staying.id)]}, format='json').json()
    assert done['done'] and done['promote'] == 1 and done['graduate'] == 1 and done['repeat'] == 1
    with use_tenant(s):
        moving.refresh_from_db(); staying.refresh_from_db(); leaving.refresh_from_db()
        assert moving.current_class == g6 and moving.current_section.name == 'A'
        assert staying.current_class == g5
        assert leaving.is_active is False
        assert Enrollment.objects.get(student=leaving).status == 'graduated'
        new = Enrollment.objects.get(student=moving, end_date__isnull=True)
        assert new.academic_year_id == AcademicYear.objects.get(name='2027-28').id
        assert Enrollment.objects.filter(student=staying, status='repeated').exists()
        assert AcademicYear.objects.get(is_active=True).name == '2027-28'


@pytest.mark.django_db
def test_isolated_between_schools(school):
    s, admin, year, *_ = school
    other = SchoolFactory(name='Elsewhere')
    with use_tenant(other):
        oy = AcademicYear.objects.create(tenant=other, name='Secret year', start_date=datetime.date(2026, 1, 1),
                                         end_date=datetime.date(2026, 12, 31))
        Term.objects.create(tenant=other, academic_year=oy, name='Hidden term', start_date=datetime.date(2026, 1, 1),
                            end_date=datetime.date(2026, 6, 30))
    api = _client(admin)
    assert 'Secret' not in str(api.get('/api/v1/auth/academics/years/').json())
    assert 'Hidden' not in str(api.get('/api/v1/auth/academics/terms/').json())
    assert api.patch(f'/api/v1/auth/academics/years/{oy.id}/', {'name': 'x'}, format='json').status_code == 404
