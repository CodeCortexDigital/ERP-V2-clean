"""School years, terms (semesters/quarters), year rollover and student schedules."""
from __future__ import annotations

from datetime import date, timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import ensure_student_access, is_admin

from .models import AcademicYear, SchoolClass, Section, Term, TimetableEntry

DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def _d(value):
    try:
        return date.fromisoformat(str(value)) if value else None
    except ValueError:
        return None


def _year_payload(y: AcademicYear) -> dict:
    today = timezone.localdate()
    return {
        'id': str(y.id), 'name': y.name, 'start_date': y.start_date.isoformat(), 'end_date': y.end_date.isoformat(),
        'is_active': y.is_active,
        'terms': [_term_payload(t, today) for t in y.terms.all()],
    }


def _term_payload(t: Term, today=None) -> dict:
    today = today or timezone.localdate()
    return {'id': str(t.id), 'academic_year': str(t.academic_year_id), 'name': t.name, 'kind': t.kind,
            'order': t.order, 'start_date': t.start_date.isoformat(), 'end_date': t.end_date.isoformat(),
            'is_current': t.start_date <= today <= t.end_date}


def current_term(school=None) -> Term | None:
    today = timezone.localdate()
    return Term.objects.filter(start_date__lte=today, end_date__gte=today).order_by('order').first()


def _admin_or_403(request):
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can change the school year set-up.'}, status=403)
    return None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def years(request):
    """GET: school years with their terms. POST {name, start_date, end_date, make_active?}."""
    if request.method == 'GET':
        return Response([_year_payload(y) for y in AcademicYear.objects.prefetch_related('terms').order_by('-start_date')])
    if (denied := _admin_or_403(request)):
        return denied
    start, end = _d(request.data.get('start_date')), _d(request.data.get('end_date'))
    name = str(request.data.get('name') or '').strip()
    if not name or not start or not end or end <= start:
        return Response({'error': 'Give the year a name and a start date before the end date.'}, status=400)
    with transaction.atomic():
        y = AcademicYear.objects.create(tenant=getattr(request, 'tenant', None), name=name, start_date=start, end_date=end)
        if request.data.get('make_active') or not AcademicYear.objects.exclude(pk=y.pk).filter(is_active=True).exists():
            AcademicYear.objects.exclude(pk=y.pk).update(is_active=False)
            AcademicYear.objects.filter(pk=y.pk).update(is_active=True)
            y.refresh_from_db()
    return Response(_year_payload(y), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def year_detail(request, year_id):
    if (denied := _admin_or_403(request)):
        return denied
    y = get_object_or_404(AcademicYear, pk=year_id)
    if request.method == 'DELETE':
        if y.is_active:
            return Response({'error': 'You cannot delete the current school year.'}, status=400)
        y.delete()
        return Response(status=204)
    for key in ('name',):
        if key in request.data:
            setattr(y, key, str(request.data[key]).strip() or getattr(y, key))
    for key in ('start_date', 'end_date'):
        if key in request.data and _d(request.data[key]):
            setattr(y, key, _d(request.data[key]))
    if y.end_date <= y.start_date:
        return Response({'error': 'The start date must be before the end date.'}, status=400)
    y.save()
    if request.data.get('is_active'):
        AcademicYear.objects.exclude(pk=y.pk).update(is_active=False)
        AcademicYear.objects.filter(pk=y.pk).update(is_active=True)
        y.refresh_from_db()
    return Response(_year_payload(y))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_terms(request, year_id):
    """Split a year into equal terms: {kind: semester|trimester|quarter|term, count?}. Replaces its terms."""
    if (denied := _admin_or_403(request)):
        return denied
    y = get_object_or_404(AcademicYear, pk=year_id)
    kind = request.data.get('kind') or 'semester'
    default_count = {'semester': 2, 'trimester': 3, 'quarter': 4, 'term': 3}.get(kind)
    if default_count is None:
        return Response({'error': 'Choose semesters, trimesters, quarters or terms.'}, status=400)
    count = int(request.data.get('count') or default_count)
    if not 1 <= count <= 6:
        return Response({'error': 'Choose between 1 and 6 periods.'}, status=400)
    total = (y.end_date - y.start_date).days + 1
    label = {'semester': 'Semester', 'trimester': 'Trimester', 'quarter': 'Quarter', 'term': 'Term'}[kind]
    with transaction.atomic():
        y.terms.all().delete()
        start = y.start_date
        for i in range(count):
            end = y.end_date if i == count - 1 else y.start_date + timedelta(days=round(total * (i + 1) / count) - 1)
            Term.objects.create(tenant_id=y.tenant_id, academic_year=y, name=f'{label} {i + 1}', kind=kind, order=i + 1,
                                start_date=start, end_date=end)
            start = end + timedelta(days=1)
    y.refresh_from_db()
    return Response(_year_payload(y), status=201)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def terms(request):
    """GET ?academic_year=  POST {academic_year, name, kind, start_date, end_date, order}."""
    if request.method == 'GET':
        qs = Term.objects.select_related('academic_year')
        if request.query_params.get('academic_year'):
            qs = qs.filter(academic_year_id=request.query_params['academic_year'])
        return Response([_term_payload(t) for t in qs])
    if (denied := _admin_or_403(request)):
        return denied
    y = get_object_or_404(AcademicYear, pk=request.data.get('academic_year'))
    err, values = _validate_term(y, request.data)
    if err:
        return Response({'error': err}, status=400)
    t = Term.objects.create(tenant_id=y.tenant_id, academic_year=y, **values)
    return Response(_term_payload(t), status=201)


def _validate_term(y: AcademicYear, data, instance: Term | None = None):
    name = str(data.get('name') or (instance.name if instance else '')).strip()
    start = _d(data.get('start_date')) or (instance.start_date if instance else None)
    end = _d(data.get('end_date')) or (instance.end_date if instance else None)
    kind = data.get('kind') or (instance.kind if instance else 'term')
    if not name or not start or not end or end < start:
        return 'Give the term a name, and a start date on or before its end date.', None
    if start < y.start_date or end > y.end_date:
        return f'The term must fall inside the school year ({y.start_date:%d %b %Y} to {y.end_date:%d %b %Y}).', None
    overlap = Term.objects.filter(academic_year=y, start_date__lte=end, end_date__gte=start)
    if instance:
        overlap = overlap.exclude(pk=instance.pk)
    if overlap.exists():
        return f'The dates overlap with {overlap.first().name}.', None
    if kind not in dict(Term.KINDS):
        return 'Choose term, semester, trimester or quarter.', None
    return None, {'name': name, 'start_date': start, 'end_date': end, 'kind': kind,
                  'order': int(data.get('order') or (instance.order if instance else Term.objects.filter(academic_year=y).count() + 1))}


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def term_detail(request, term_id):
    if (denied := _admin_or_403(request)):
        return denied
    t = get_object_or_404(Term, pk=term_id)
    if request.method == 'DELETE':
        t.delete()
        return Response(status=204)
    err, values = _validate_term(t.academic_year, request.data, t)
    if err:
        return Response({'error': err}, status=400)
    for k, v in values.items():
        setattr(t, k, v)
    t.save()
    return Response(_term_payload(t))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def term_now(request):
    t = current_term()
    y = AcademicYear.objects.filter(is_active=True).first()
    return Response({'term': _term_payload(t) if t else None, 'year': {'id': str(y.id), 'name': y.name} if y else None})


# ---------------------------------------------------------------------------
# Year rollover
# ---------------------------------------------------------------------------

def _rollover_plan(target_year: AcademicYear):
    """Where each active student goes: the class one grade up (same section name), or graduation."""
    from services.education.students.models import Student

    classes = list(SchoolClass.objects.filter(is_active=True).exclude(grade_level__isnull=True))
    by_level = {}
    for c in classes:
        by_level.setdefault(c.grade_level, []).append(c)
    top = max(by_level) if by_level else None
    plan, unknown = [], []
    for s in Student.objects.filter(is_active=True).select_related('current_class', 'current_section'):
        cls = s.current_class
        if cls is None or cls.grade_level is None:
            unknown.append(s)
            continue
        if cls.grade_level == top:
            plan.append((s, None, None, 'graduate'))
            continue
        options = by_level.get(cls.grade_level + 1) or []
        if not options:
            unknown.append(s)
            continue
        target = next((c for c in options if c.name.split()[0] == cls.name.split()[0]), options[0])
        section = None
        if s.current_section_id:
            section = Section.objects.filter(class_ref=target, name=s.current_section.name).first()
        plan.append((s, target, section, 'promote'))
    return plan, unknown


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rollover(request, year_id):
    """Start a new school year. {preview: true} shows the plan; {preview: false, repeat: [student ids]} runs it.

    Students move up one grade (same section name where it exists); the top grade graduates;
    students listed in ``repeat`` stay in their class. The new year becomes the current year.
    """
    from services.education.students.models import Enrollment, Student

    if (denied := _admin_or_403(request)):
        return denied
    target = get_object_or_404(AcademicYear, pk=year_id)
    if target.is_active:
        return Response({'error': 'This year is already the current year.'}, status=400)
    plan, unknown = _rollover_plan(target)
    repeat = {str(x) for x in request.data.get('repeat') or []}
    summary = {
        'promote': sum(1 for p in plan if p[3] == 'promote' and str(p[0].id) not in repeat),
        'graduate': sum(1 for p in plan if p[3] == 'graduate' and str(p[0].id) not in repeat),
        'repeat': len(repeat),
        'needs_attention': [{'id': str(s.id), 'full_name': s.full_name,
                             'class_name': s.current_class.name if s.current_class_id else 'No class'} for s in unknown],
        'moves': [{'id': str(s.id), 'full_name': s.full_name, 'from': s.current_class.name,
                   'to': t.name if t else 'Graduates', 'section': sec.name if sec else ''}
                  for s, t, sec, _ in plan if str(s.id) not in repeat][:500],
    }
    if request.data.get('preview', True) in (True, 'true', '1', 1):
        return Response(summary)

    today = timezone.localdate()
    with transaction.atomic():
        AcademicYear.objects.exclude(pk=target.pk).update(is_active=False)
        AcademicYear.objects.filter(pk=target.pk).update(is_active=True)
        for s, new_class, section, action in plan:
            if str(s.id) in repeat:
                Enrollment.objects.filter(student=s, end_date__isnull=True).update(end_date=today, status='repeated')
                Enrollment.objects.create(tenant_id=s.tenant_id, student=s, academic_year=target, school_class=s.current_class,
                                          section_id=s.current_section_id, class_name=s.current_class.name, start_date=today,
                                          note='Repeating the year')
                continue
            if action == 'graduate':
                Enrollment.objects.filter(student=s, end_date__isnull=True).update(end_date=today, status='graduated')
                Student.objects.filter(pk=s.pk).update(is_active=False)
                continue
            s.current_class = new_class
            s.current_section = section
            s.save()  # the enrollment signal closes the old one (promoted) and opens the new one in this year
    return Response({**summary, 'done': True})


# ---------------------------------------------------------------------------
# Student schedule
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_schedule(request, student_id):
    """The student's weekly lessons from the timetable of their class and section."""
    from services.education.students.households import find_student

    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    if not student.current_class_id:
        return Response({'days': [], 'class_name': ''})
    entries = (TimetableEntry.objects.filter(class_subject__class_ref_id=student.current_class_id, is_active=True)
               .select_related('period', 'class_subject__subject', 'teacher', 'classroom'))
    by_day = {}
    for e in entries:
        if e.section_id and student.current_section_id and e.section_id != student.current_section_id:
            continue
        day = str(e.day_of_week).lower()
        day = next((d for d in DAYS if d.startswith(day[:3])), day)
        by_day.setdefault(day, []).append({
            'period': e.period.period_number, 'start': e.period.start_time.strftime('%H:%M') if e.period.start_time else '',
            'end': e.period.end_time.strftime('%H:%M') if e.period.end_time else '',
            'subject': e.class_subject.subject.name, 'teacher': e.teacher.full_name if e.teacher_id else '',
            'room': e.classroom.name if e.classroom_id else '',
        })
    days = [{'day': d.title(), 'lessons': sorted(by_day[d], key=lambda x: x['period'])} for d in DAYS if d in by_day]
    return Response({'class_name': student.current_class.name,
                     'section': student.current_section.name if student.current_section_id else '', 'days': days})
