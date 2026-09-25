"""Gradebook: weighted grades, statuses, exam sync, standards, report cards and transcripts (Phase 6)."""
import datetime
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import AcademicYear, ClassSubject, SchoolClass, Subject, Term
from services.education.gradebook import calc
from tests.conftest import SchoolFactory, StudentFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def setup(db):
    s = SchoolFactory(name='Maple High')
    admin = UserFactory(email='admin@maple.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    with use_tenant(s):
        year = AcademicYear.objects.create(tenant=s, name='2026-27', start_date=datetime.date(2026, 8, 1),
                                           end_date=datetime.date(2027, 6, 30), is_active=True)
        t1 = Term.objects.create(tenant=s, academic_year=year, name='Semester 1', start_date=datetime.date(2026, 8, 1),
                                 end_date=datetime.date(2027, 1, 15), order=1)
        t2 = Term.objects.create(tenant=s, academic_year=year, name='Semester 2', start_date=datetime.date(2027, 1, 16),
                                 end_date=datetime.date(2027, 6, 30), order=2)
        cls = SchoolClass.objects.create(tenant=s, name='Grade 10', code='G10', grade_level=10)
        math = Subject.objects.create(tenant=s, name='Algebra II', code='ALG2', credit_value=Decimal('1'), level='honors')
        art = Subject.objects.create(tenant=s, name='Art', code='ART', credit_value=Decimal('0.5'))
        cs_math = ClassSubject.objects.create(class_ref=cls, subject=math)
        cs_art = ClassSubject.objects.create(class_ref=cls, subject=art)
    kid = StudentFactory(tenant=s, current_class=cls, full_name='Ava Chen')
    other = StudentFactory(tenant=s, current_class=cls, full_name='Ben Diaz')
    from services.education.students.models import Enrollment

    with use_tenant(s):
        Enrollment.objects.filter(student__in=[kid, other]).update(academic_year=year)
    return dict(school=s, admin=admin, year=year, t1=t1, t2=t2, cls=cls, cs_math=cs_math, cs_art=cs_art, kid=kid, other=other)


def _grid(api, cs, term):
    return api.get(f'/api/v1/auth/gradebook/grid/?class_subject={cs.id}&term={term.id}').json()


@pytest.mark.django_db
def test_weighted_categories_drop_lowest_missing_and_excused(setup):
    d = setup
    api = _client(d['admin'])
    base = '/api/v1/auth/gradebook'
    hw = api.post(f'{base}/categories/', {'class_subject': str(d['cs_math'].id), 'name': 'Homework', 'weight': 40,
                                          'drop_lowest': 1}, format='json').json()['id']
    tests = api.post(f'{base}/categories/', {'class_subject': str(d['cs_math'].id), 'name': 'Tests', 'weight': 60},
                     format='json').json()['id']

    def add(title, cat, pts=10):
        return api.post(f'{base}/assignments/', {'class_subject': str(d['cs_math'].id), 'term': str(d['t1'].id),
                                                 'category': cat, 'title': title, 'points_possible': pts}, format='json').json()['id']

    h1, h2, h3 = add('HW 1', hw), add('HW 2', hw), add('HW 3', hw)
    t1 = add('Test 1', tests, 100)
    t2 = add('Test 2', tests, 100)

    def score(a, points=None, status='graded'):
        return api.post(f'{base}/scores/', {'assignment': a, 'scores': [
            {'student': str(d['kid'].id), 'points': points, 'status': status}]}, format='json')

    score(h1, 10); score(h2, 2); score(h3, 8)       # lowest (2/10) dropped → 18/20 = 90%
    score(t1, 80); score(t2, status='excused')      # excused ignored → Tests 80%
    row = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['kid'].id))
    cats = {c['name']: c['percent'] for c in row['grade']['categories']}
    assert cats == {'Homework': 90.0, 'Tests': 80.0}
    assert row['grade']['percent'] == 84.0 and row['grade']['letter'] == 'B'  # 90*.4 + 80*.6

    score(t2, status='missing')                     # missing counts as zero → Tests 40%
    row = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['kid'].id))
    assert row['grade']['percent'] == 60.0 and row['grade']['missing'] == 1 and row['grade']['letter'] == 'D-'

    # Weights are re-scaled when a category has nothing graded yet.
    other = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['other'].id))
    assert other['grade']['percent'] is None
    api.post(f'{base}/scores/', {'assignment': t1, 'scores': [{'student': str(d['other'].id), 'points': 95}]}, format='json')
    other = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['other'].id))
    assert other['grade']['percent'] == 95.0 and other['grade']['letter'] == 'A'


@pytest.mark.django_db
def test_exam_marks_flow_into_the_gradebook(setup):
    d = setup
    from services.education.exams.models import Exam, ExamResult

    with use_tenant(d['school']):
        exam = Exam.objects.create(tenant=d['school'], title='Midterm', exam_type='midterm', class_ref=d['cls'],
                                   subject=d['cs_math'].subject, total_marks=50, passing_marks=20,
                                   exam_date=datetime.date(2026, 10, 10))
        ExamResult.objects.create(tenant=d['school'], exam=exam, student=d['kid'], obtained_marks=Decimal('45'))
    api = _client(d['admin'])
    res = api.post('/api/v1/auth/gradebook/assignments/from-exam/', {'exam': str(exam.id)}, format='json')
    assert res.status_code == 201, res.content
    assert res.json()['term'] == str(d['t1'].id)  # placed in the term that contains the exam date
    row = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['kid'].id))
    assert row['grade']['percent'] == 90.0
    with use_tenant(d['school']):
        r = ExamResult.objects.get(exam=exam, student=d['kid'])
        r.obtained_marks = Decimal('40')
        r.save()
    row = next(r for r in _grid(api, d['cs_math'], d['t1'])['students'] if r['id'] == str(d['kid'].id))
    assert row['grade']['percent'] == 80.0
    assert api.post('/api/v1/auth/gradebook/assignments/from-exam/', {'exam': str(exam.id)}, format='json').status_code == 400


@pytest.mark.django_db
def test_report_card_release_standards_and_transcript(setup):
    d = setup
    api = _client(d['admin'])
    base = '/api/v1/auth/gradebook'
    for cs, pct in ((d['cs_math'], 88), (d['cs_art'], 95)):
        for term in (d['t1'], d['t2']):
            a = api.post(f'{base}/assignments/', {'class_subject': str(cs.id), 'term': str(term.id), 'title': 'Project',
                                                  'points_possible': 100}, format='json').json()['id']
            api.post(f'{base}/scores/', {'assignment': a, 'scores': [{'student': str(d['kid'].id), 'points': pct}]},
                     format='json')
    std = api.post(f'{base}/standards/', {'subject': str(d['cs_math'].subject_id), 'code': 'A.REI.4',
                                          'description': 'Solve quadratic equations'}, format='json').json()['id']
    api.post(f'{base}/standard-ratings/', {'term': str(d['t1'].id), 'ratings': [
        {'student': str(d['kid'].id), 'standard': std, 'level': 3}]}, format='json')
    api.post(f'{base}/comments/', {'student': str(d['kid'].id), 'term': str(d['t1'].id),
                                   'class_subject': str(d['cs_math'].id), 'comment': 'Great progress.'}, format='json')

    card = api.get(f"{base}/report-card/{d['kid'].id}/?term={d['t1'].id}").json()
    math = next(s for s in card['subjects'] if s['subject'] == 'Algebra II')
    assert math['letter'] == 'B+' and math['comment'] == 'Great progress.'
    assert math['standards'][0]['level'] == 3
    # GPA: Algebra B+ (3.3, honors +0.5, 1 credit) and Art A (4.0, 0.5 credit)
    assert card['gpa']['unweighted'] == pytest.approx((3.3 * 1 + 4.0 * 0.5) / 1.5, abs=0.01)
    assert card['gpa']['weighted'] == pytest.approx((3.8 * 1 + 4.0 * 0.5) / 1.5, abs=0.01)
    assert card['released'] is False

    parent = UserFactory(email='parent.chen@example.com')
    ParentProfile.objects.create(user=parent).linked_students.add(d['kid'])
    fam = _client(parent)
    assert fam.get(f"{base}/report-card/{d['kid'].id}/?term={d['t1'].id}").status_code == 403
    assert api.post(f'{base}/releases/', {'term': str(d['t1'].id), 'class_id': str(d['cls'].id)},
                    format='json').status_code == 201
    shown = fam.get(f"{base}/report-card/{d['kid'].id}/?term={d['t1'].id}")
    assert shown.status_code == 200 and shown.json()['released'] is True
    assert fam.post(f'{base}/releases/', {'term': str(d['t2'].id)}, format='json').status_code == 403

    tr = api.get(f"{base}/transcript/{d['kid'].id}/").json()
    year = tr['years'][0]
    assert year['year'] == '2026-27' and {c['subject'] for c in year['courses']} == {'Algebra II', 'Art'}
    assert tr['credits_earned'] == 1.5 and tr['cumulative_gpa']['credits'] == 1.5


@pytest.mark.django_db
def test_only_the_classes_teachers_grade(setup):
    d = setup
    stranger = _client(UserFactory(email='x@maple.test'))
    assert stranger.get(f"/api/v1/auth/gradebook/grid/?class_subject={d['cs_math'].id}").status_code in (403, 404)
    assert stranger.post('/api/v1/auth/gradebook/assignments/', {'class_subject': str(d['cs_math'].id),
                         'title': 'x'}, format='json').status_code in (403, 404)


def test_gpa_math():
    assert calc.gpa([(Decimal('4.0'), 1, 'ap'), (Decimal('3.0'), 1, 'standard')]) == {
        'unweighted': 3.5, 'weighted': 4.0, 'credits': 2.0}
    assert calc.gpa([]) == {'unweighted': None, 'weighted': None, 'credits': 0}
