"""Gradebook API: scales, categories, assignments, scores, standards, comments,
report cards (with release to families) and transcripts."""
from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import (
    _get_teacher_class_ids, ensure_student_access, get_user_role, is_admin,
)
from services.education.academics.models import ClassSubject, Term

from . import calc
from .models import (
    Assignment, Category, GradeBand, GradingScale, ReportCardRelease, ReportComment, Score, Standard, StandardRating,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dec(value, default=None):
    if value in (None, ''):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default


def _date(value):
    try:
        return date.fromisoformat(str(value)) if value else None
    except ValueError:
        return None


def can_grade(user, class_subject: ClassSubject) -> bool:
    role = get_user_role(user)
    if role == 'admin':
        return True
    if role != 'teacher':
        return False
    return str(class_subject.class_ref_id) in {str(c) for c in _get_teacher_class_ids(user)}


def _forbidden():
    return Response({'error': 'You can only grade your own classes.'}, status=403)


def _students_for(class_subject, section_id=None):
    from services.education.students.models import Student

    qs = Student.objects.filter(current_class_id=class_subject.class_ref_id, is_active=True).order_by('full_name')
    return qs.filter(current_section_id=section_id) if section_id else qs


def _cs_label(cs: ClassSubject) -> dict:
    return {'id': str(cs.id), 'class_id': str(cs.class_ref_id), 'class_name': cs.class_ref.name,
            'subject_id': str(cs.subject_id), 'subject': cs.subject.name, 'subject_code': cs.subject.code,
            'sections': [{'id': str(s.id), 'name': s.name} for s in cs.class_ref.sections.all()]}


def _scale_payload(s: GradingScale) -> dict:
    return {'id': str(s.id), 'name': s.name, 'kind': s.kind, 'passing_percent': float(s.passing_percent),
            'is_default': s.is_default,
            'bands': [{'label': b.label, 'min_percent': float(b.min_percent), 'gpa_points': float(b.gpa_points),
                       'description': b.description} for b in s.bands.all()]}


# ---------------------------------------------------------------------------
# Grading scales
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def scales(request):
    if request.method == 'GET':
        calc.default_scale()
        return Response([_scale_payload(s) for s in GradingScale.objects.prefetch_related('bands')])
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can change grading scales.'}, status=403)
    preset = request.data.get('preset')
    if preset in ('us', 'standards'):
        rows = calc.US_SCALE if preset == 'us' else calc.STANDARDS_SCALE
        s = GradingScale.objects.create(name='US letter grades (A–F)' if preset == 'us' else 'Standards levels (4–1)',
                                        kind='letter' if preset == 'us' else 'standards',
                                        passing_percent=60 if preset == 'us' else 60)
        GradeBand.objects.bulk_create([GradeBand(scale=s, label=r[0], min_percent=r[1], gpa_points=r[2],
                                                 description=r[3] if len(r) > 3 else '') for r in rows])
        return Response(_scale_payload(GradingScale.objects.prefetch_related('bands').get(pk=s.pk)), status=201)
    return _save_scale(GradingScale(), request.data, created=True)


def _save_scale(scale: GradingScale, data, created=False):
    bands = data.get('bands')
    name = str(data.get('name') or scale.name or '').strip()
    if not name:
        return Response({'error': 'Name the scale.'}, status=400)
    if bands is not None:
        clean = []
        for b in bands:
            label = str(b.get('label') or '').strip()
            mn = _dec(b.get('min_percent'))
            if not label or mn is None or not ZERO_TO_100(mn):
                return Response({'error': 'Every grade needs a label and a minimum percent between 0 and 100.'}, status=400)
            clean.append((label[:20], mn, _dec(b.get('gpa_points'), Decimal('0')), str(b.get('description') or '')[:120]))
        if not any(mn == 0 for _, mn, _, _ in clean):
            return Response({'error': 'One grade must start at 0% so every score gets a grade.'}, status=400)
    with transaction.atomic():
        scale.name = name[:80]
        scale.kind = data.get('kind') if data.get('kind') in dict(GradingScale.KINDS) else (scale.kind or 'letter')
        scale.passing_percent = _dec(data.get('passing_percent'), scale.passing_percent or Decimal('60'))
        scale.save()
        if bands is not None:
            scale.bands.all().delete()
            GradeBand.objects.bulk_create([GradeBand(scale=scale, label=l, min_percent=m, gpa_points=g, description=d)
                                           for l, m, g, d in clean])
        if data.get('is_default'):
            GradingScale.objects.exclude(pk=scale.pk).update(is_default=False)
            GradingScale.objects.filter(pk=scale.pk).update(is_default=True)
    return Response(_scale_payload(GradingScale.objects.prefetch_related('bands').get(pk=scale.pk)),
                    status=201 if created else 200)


def ZERO_TO_100(v):  # noqa: N802 - tiny readable guard
    return Decimal('0') <= v <= Decimal('100')


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def scale_detail(request, scale_id):
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can change grading scales.'}, status=403)
    scale = get_object_or_404(GradingScale, pk=scale_id)
    if request.method == 'DELETE':
        if scale.is_default:
            return Response({'error': 'Choose another default scale before deleting this one.'}, status=400)
        scale.delete()
        return Response(status=204)
    return _save_scale(scale, request.data)


# ---------------------------------------------------------------------------
# Classes, categories, assignments, scores
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_classes(request):
    """Class-subjects the user can grade."""
    qs = ClassSubject.objects.select_related('class_ref', 'subject').prefetch_related('class_ref__sections') \
        .order_by('class_ref__grade_level', 'class_ref__name', 'subject__name')
    if not is_admin(request.user):
        qs = qs.filter(class_ref_id__in=list(_get_teacher_class_ids(request.user)))
    return Response([_cs_label(cs) for cs in qs])


def _assignment_payload(a: Assignment) -> dict:
    return {'id': str(a.id), 'title': a.title, 'description': a.description, 'category': str(a.category_id) if a.category_id else None,
            'category_name': a.category.name if a.category_id else '', 'term': str(a.term_id) if a.term_id else None,
            'section': str(a.section_id) if a.section_id else None, 'due_date': a.due_date.isoformat() if a.due_date else None,
            'points_possible': float(a.points_possible), 'counts_toward_grade': a.counts_toward_grade,
            'is_published': a.is_published, 'exam': str(a.exam_id) if a.exam_id else None,
            'standards': [str(s.id) for s in a.standards.all()]}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grid(request):
    """?class_subject=&term=&section= → categories, assignments, students, scores and running grades."""
    cs = get_object_or_404(ClassSubject.objects.select_related('class_ref', 'subject'), pk=request.query_params.get('class_subject'))
    if not can_grade(request.user, cs):
        return _forbidden()
    term = Term.objects.filter(pk=request.query_params.get('term')).first() if request.query_params.get('term') else None
    section_id = request.query_params.get('section') or None
    scale = calc.default_scale()
    categories = list(Category.objects.filter(class_subject=cs))
    assignments = Assignment.objects.filter(class_subject=cs).select_related('category').prefetch_related('standards')
    if term:
        assignments = assignments.filter(term=term)
    if section_id:
        assignments = assignments.filter(Q(section__isnull=True) | Q(section_id=section_id))
    assignments = list(assignments)
    students = list(_students_for(cs, section_id))
    all_scores = Score.objects.filter(assignment__in=assignments, student__in=students)
    by_student: dict[str, dict] = {}
    for s in all_scores:
        by_student.setdefault(str(s.student_id), {})[s.assignment_id] = s
    rows = []
    for st in students:
        mine = by_student.get(str(st.id), {})
        own = [a for a in assignments if not a.section_id or a.section_id == st.current_section_id]
        g = calc.term_grade(st, cs, term, scale, assignments=own, scores=mine, categories=categories)
        rows.append({'id': str(st.id), 'full_name': st.full_name, 'student_id': st.student_id,
                     'scores': {str(aid): {'points': float(s.points) if s.points is not None else None, 'status': s.status,
                                           'comment': s.comment} for aid, s in mine.items()},
                     'grade': g.as_dict()})
    return Response({
        'class_subject': _cs_label(cs), 'term': str(term.id) if term else None, 'scale': _scale_payload(scale),
        'categories': [{'id': str(c.id), 'name': c.name, 'weight': float(c.weight), 'drop_lowest': c.drop_lowest,
                        'order': c.order} for c in categories],
        'weights_total': float(sum(c.weight for c in categories)),
        'assignments': [_assignment_payload(a) for a in assignments],
        'students': rows,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def categories(request):
    """{class_subject, name, weight, drop_lowest} — or {class_subject, preset: 'standard'} to add a common set."""
    cs = get_object_or_404(ClassSubject, pk=request.data.get('class_subject'))
    if not can_grade(request.user, cs):
        return _forbidden()
    if request.data.get('preset') == 'standard':
        preset = [('Homework', 20), ('Quizzes', 20), ('Tests', 40), ('Projects', 10), ('Participation', 10)]
        for i, (name, weight) in enumerate(preset, start=1):
            Category.objects.get_or_create(class_subject=cs, name=name,
                                           defaults={'tenant_id': cs.class_ref.tenant_id, 'weight': weight, 'order': i})
        return Response({'created': True}, status=201)
    name = str(request.data.get('name') or '').strip()
    weight = _dec(request.data.get('weight'), Decimal('0'))
    if not name or weight is None or not ZERO_TO_100(weight):
        return Response({'error': 'Give the category a name and a weight between 0 and 100.'}, status=400)
    if Category.objects.filter(class_subject=cs, name__iexact=name).exists():
        return Response({'error': 'There is already a category with that name.'}, status=400)
    c = Category.objects.create(tenant_id=cs.class_ref.tenant_id, class_subject=cs, name=name[:60], weight=weight,
                                drop_lowest=int(request.data.get('drop_lowest') or 0),
                                order=Category.objects.filter(class_subject=cs).count() + 1)
    return Response({'id': str(c.id)}, status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, category_id):
    c = get_object_or_404(Category.objects.select_related('class_subject__class_ref'), pk=category_id)
    if not can_grade(request.user, c.class_subject):
        return _forbidden()
    if request.method == 'DELETE':
        c.delete()  # its assignments stay, in "Other"
        return Response(status=204)
    if 'name' in request.data:
        c.name = str(request.data['name']).strip()[:60] or c.name
    if 'weight' in request.data:
        w = _dec(request.data['weight'])
        if w is None or not ZERO_TO_100(w):
            return Response({'error': 'The weight must be between 0 and 100.'}, status=400)
        c.weight = w
    if 'drop_lowest' in request.data:
        c.drop_lowest = max(0, int(request.data['drop_lowest'] or 0))
    c.save()
    return Response({'id': str(c.id)})


def _apply_assignment(a: Assignment, data):
    for key in ('title', 'description'):
        if key in data:
            setattr(a, key, str(data[key] or '').strip()[:200 if key == 'title' else 5000])
    if 'category' in data:
        a.category = Category.objects.filter(pk=data['category'], class_subject=a.class_subject).first() if data['category'] else None
    if 'term' in data:
        a.term = Term.objects.filter(pk=data['term']).first() if data['term'] else None
    if 'section' in data:
        a.section_id = data['section'] or None
    if 'due_date' in data:
        a.due_date = _date(data['due_date'])
    if 'points_possible' in data:
        pts = _dec(data['points_possible'])
        if pts is None or pts <= 0:
            raise ValueError('Points possible must be more than zero.')
        a.points_possible = pts
    for key in ('counts_toward_grade', 'is_published'):
        if key in data:
            setattr(a, key, bool(data[key]))
    if not a.title:
        raise ValueError('Give the assignment a title.')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assignments(request):
    cs = get_object_or_404(ClassSubject.objects.select_related('class_ref'), pk=request.data.get('class_subject'))
    if not can_grade(request.user, cs):
        return _forbidden()
    a = Assignment(tenant_id=cs.class_ref.tenant_id, class_subject=cs, created_by=request.user)
    try:
        _apply_assignment(a, request.data)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    a.save()
    if request.data.get('standards'):
        a.standards.set(Standard.objects.filter(pk__in=request.data['standards']))
    return Response(_assignment_payload(a), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def assignment_detail(request, assignment_id):
    a = get_object_or_404(Assignment.objects.select_related('class_subject__class_ref'), pk=assignment_id)
    if not can_grade(request.user, a.class_subject):
        return _forbidden()
    if request.method == 'DELETE':
        a.delete()
        return Response(status=204)
    try:
        _apply_assignment(a, request.data)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    a.save()
    if 'standards' in request.data:
        a.standards.set(Standard.objects.filter(pk__in=request.data['standards'] or []))
    return Response(_assignment_payload(a))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assignment_from_exam(request):
    """{exam, category?, term?} — bring an exam and its marks into the gradebook (kept in sync)."""
    from services.education.exams.models import Exam, ExamResult

    exam = get_object_or_404(Exam, pk=request.data.get('exam'))
    cs = ClassSubject.objects.filter(class_ref_id=exam.class_ref_id, subject_id=exam.subject_id).select_related('class_ref').first()
    if cs is None:
        return Response({'error': 'This exam’s subject is not assigned to its class.'}, status=400)
    if not can_grade(request.user, cs):
        return _forbidden()
    if Assignment.objects.filter(exam=exam).exists():
        return Response({'error': 'This exam is already in the gradebook.'}, status=400)
    term = Term.objects.filter(pk=request.data.get('term')).first() or \
        Term.objects.filter(start_date__lte=exam.exam_date, end_date__gte=exam.exam_date).first()
    with transaction.atomic():
        a = Assignment.objects.create(
            tenant_id=cs.class_ref.tenant_id, class_subject=cs, section_id=exam.section_id, term=term,
            category=Category.objects.filter(pk=request.data.get('category'), class_subject=cs).first(),
            title=exam.title, due_date=exam.exam_date, points_possible=exam.total_marks, exam=exam, created_by=request.user,
        )
        for r in ExamResult.objects.filter(exam=exam):
            Score.objects.update_or_create(assignment=a, student_id=r.student_id,
                                           defaults={'points': r.obtained_marks, 'status': 'graded'})
    return Response(_assignment_payload(a), status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_scores(request):
    """{assignment, scores: [{student, points, status, comment}]}"""
    a = get_object_or_404(Assignment.objects.select_related('class_subject__class_ref'), pk=request.data.get('assignment'))
    if not can_grade(request.user, a.class_subject):
        return _forbidden()
    allowed = {str(s.id) for s in _students_for(a.class_subject)}
    saved, errors = 0, []
    with transaction.atomic():
        for row in request.data.get('scores') or []:
            sid = str(row.get('student') or '')
            if sid not in allowed:
                continue
            status = row.get('status') or 'graded'
            if status not in dict(Score.STATUSES):
                errors.append(f'Unknown status for {sid}.')
                continue
            points = _dec(row.get('points'))
            if points is not None and (points < 0 or points > a.points_possible * 2):
                errors.append(f'Points must be between 0 and {a.points_possible * 2} (extra credit allowed).')
                continue
            if points is None and status == 'graded' and row.get('points') in (None, ''):
                Score.objects.filter(assignment=a, student_id=sid).delete()
                continue
            Score.objects.update_or_create(assignment=a, student_id=sid, defaults={
                'points': points, 'status': status, 'comment': str(row.get('comment') or '')[:255],
                'graded_by': request.user})
            saved += 1
    return Response({'saved': saved, 'errors': errors})


# ---------------------------------------------------------------------------
# Standards
# ---------------------------------------------------------------------------

def _standard_payload(s: Standard) -> dict:
    return {'id': str(s.id), 'code': s.code, 'description': s.description, 'subject': str(s.subject_id) if s.subject_id else None,
            'subject_name': s.subject.name if s.subject_id else '', 'grade_level': s.grade_level, 'is_active': s.is_active}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def standards(request):
    if request.method == 'GET':
        qs = Standard.objects.select_related('subject')
        if request.query_params.get('subject'):
            qs = qs.filter(subject_id=request.query_params['subject'])
        if request.query_params.get('grade_level') not in (None, ''):
            qs = qs.filter(Q(grade_level=request.query_params['grade_level']) | Q(grade_level__isnull=True))
        return Response([_standard_payload(s) for s in qs])
    if get_user_role(request.user) not in ('admin', 'teacher'):
        return Response({'error': 'Only staff can add standards.'}, status=403)
    desc = str(request.data.get('description') or '').strip()
    if not desc:
        return Response({'error': 'Describe the standard.'}, status=400)
    s = Standard.objects.create(tenant=getattr(request, 'tenant', None), description=desc[:300],
                                code=str(request.data.get('code') or '')[:40], subject_id=request.data.get('subject') or None,
                                grade_level=request.data.get('grade_level') if request.data.get('grade_level') not in (None, '') else None)
    return Response(_standard_payload(s), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def standard_detail(request, standard_id):
    if get_user_role(request.user) not in ('admin', 'teacher'):
        return Response({'error': 'Only staff can change standards.'}, status=403)
    s = get_object_or_404(Standard, pk=standard_id)
    if request.method == 'DELETE':
        s.delete()
        return Response(status=204)
    for key in ('code', 'description'):
        if key in request.data:
            setattr(s, key, str(request.data[key] or '')[:300 if key == 'description' else 40])
    if 'is_active' in request.data:
        s.is_active = bool(request.data['is_active'])
    s.save()
    return Response(_standard_payload(s))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def standard_ratings(request):
    """GET ?class_subject=&term= → standards × students grid. POST {term, ratings: [{student, standard, level, comment}]}."""
    if request.method == 'GET':
        cs = get_object_or_404(ClassSubject.objects.select_related('class_ref', 'subject'), pk=request.query_params.get('class_subject'))
        if not can_grade(request.user, cs):
            return _forbidden()
        term = get_object_or_404(Term, pk=request.query_params.get('term'))
        stds = Standard.objects.filter(subject_id=cs.subject_id, is_active=True).filter(
            Q(grade_level__isnull=True) | Q(grade_level=cs.class_ref.grade_level))
        students = list(_students_for(cs, request.query_params.get('section') or None))
        ratings = {(str(r.student_id), str(r.standard_id)): {'level': r.level, 'comment': r.comment}
                   for r in StandardRating.objects.filter(term=term, standard__in=stds, student__in=students)}
        return Response({'standards': [_standard_payload(s) for s in stds],
                         'students': [{'id': str(s.id), 'full_name': s.full_name,
                                       'ratings': {sid: ratings[(str(s.id), sid)] for (stu, sid) in ratings if stu == str(s.id)}}
                                      for s in students]})
    term = get_object_or_404(Term, pk=request.data.get('term'))
    saved = 0
    with transaction.atomic():
        for row in request.data.get('ratings') or []:
            std = Standard.objects.filter(pk=row.get('standard')).first()
            from services.education.students.models import Student

            student = Student.objects.filter(pk=row.get('student')).select_related('current_class').first()
            if not std or not student or not student.current_class_id:
                continue
            cs = ClassSubject.objects.filter(class_ref_id=student.current_class_id, subject_id=std.subject_id).first()
            if cs is None or not can_grade(request.user, cs):
                continue
            level = row.get('level')
            if level in (None, ''):
                StandardRating.objects.filter(student=student, standard=std, term=term).delete()
                continue
            if int(level) not in (1, 2, 3, 4):
                continue
            StandardRating.objects.update_or_create(student=student, standard=std, term=term, defaults={
                'tenant_id': student.tenant_id, 'level': int(level), 'comment': str(row.get('comment') or '')[:255],
                'rated_by': request.user})
            saved += 1
    return Response({'saved': saved})


# ---------------------------------------------------------------------------
# Comments, report cards, releases, transcripts
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment(request):
    """{student, term, class_subject (empty for the homeroom comment), comment}"""
    from services.education.students.models import Student

    student = get_object_or_404(Student, pk=request.data.get('student'))
    term = get_object_or_404(Term, pk=request.data.get('term'))
    cs = ClassSubject.objects.filter(pk=request.data.get('class_subject')).select_related('class_ref').first() \
        if request.data.get('class_subject') else None
    allowed = can_grade(request.user, cs) if cs else (is_admin(request.user) or (
        get_user_role(request.user) == 'teacher' and str(student.current_class_id) in {str(c) for c in _get_teacher_class_ids(request.user)}))
    if not allowed:
        return _forbidden()
    text = str(request.data.get('comment') or '').strip()
    if not text:
        ReportComment.objects.filter(student=student, term=term, class_subject=cs).delete()
        return Response({'deleted': True})
    ReportComment.objects.update_or_create(student=student, term=term, class_subject=cs, defaults={
        'tenant_id': student.tenant_id, 'comment': text[:4000], 'written_by': request.user})
    return Response({'saved': True})


def _released(term, student) -> bool:
    return ReportCardRelease.objects.filter(term=term).filter(
        Q(school_class__isnull=True) | Q(school_class_id=student.current_class_id)).exists()


def report_card_data(student, term, scale=None) -> dict:
    """Everything printed on one student's report card for one term."""
    from services.education.attendance.models import AttendanceRecord

    scale = scale or calc.default_scale()
    subjects, gpa_rows = [], []
    for cs in ClassSubject.objects.filter(class_ref_id=student.current_class_id).select_related('subject').order_by('subject__name'):
        g = calc.term_grade(student, cs, term, scale)
        stds = Standard.objects.filter(subject_id=cs.subject_id, is_active=True)
        ratings = {r.standard_id: r for r in StandardRating.objects.filter(student=student, term=term, standard__in=stds)}
        comment_row = ReportComment.objects.filter(student=student, term=term, class_subject=cs).first()
        if g.percent is None and not ratings and not comment_row:
            continue
        subjects.append({
            'class_subject': str(cs.id), 'subject': cs.subject.name, 'code': cs.subject.code, 'level': cs.subject.level,
            'credits': float(cs.subject.credit_value), **g.as_dict(),
            'comment': comment_row.comment if comment_row else '',
            'standards': [{'code': s.code, 'description': s.description, 'level': ratings[s.id].level,
                           'comment': ratings[s.id].comment} for s in stds if s.id in ratings],
        })
        if g.gpa_points is not None:
            gpa_rows.append((g.gpa_points, cs.subject.credit_value, cs.subject.level))
    homeroom = ReportComment.objects.filter(student=student, term=term, class_subject__isnull=True).first()
    att = AttendanceRecord.objects.filter(student=student, date__range=(term.start_date, term.end_date)).exclude(status='holiday')
    total = att.count()
    attended = att.filter(status__in=('present', 'late', 'early_dismissal')).count()
    school = student.tenant
    return {
        'school': {'name': ((school.settings_json or {}).get('institute_name') or school.name) if school else ''},
        'student': {'id': str(student.id), 'full_name': student.full_name, 'student_id': student.student_id,
                    'class_name': student.current_class.name if student.current_class_id else '',
                    'section': student.current_section.name if student.current_section_id else ''},
        'term': {'id': str(term.id), 'name': term.name, 'year': term.academic_year.name,
                 'start_date': term.start_date.isoformat(), 'end_date': term.end_date.isoformat()},
        'scale': _scale_payload(scale),
        'subjects': subjects,
        'gpa': calc.gpa(gpa_rows),
        'attendance': {'school_days': total, 'attended': attended,
                       'absent': att.filter(status__in=('absent', 'excused')).count(), 'tardy': att.filter(status='late').count(),
                       'rate': round(attended / total * 100, 1) if total else None},
        'homeroom_comment': homeroom.comment if homeroom else '',
        'released': _released(term, student),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_card(request, student_id):
    from services.education.students.households import find_student

    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    term = Term.objects.filter(pk=request.query_params.get('term')).select_related('academic_year').first()
    if term is None:
        from services.education.academics.structure import current_term

        term = current_term() or Term.objects.order_by('-end_date').first()
    if term is None:
        return Response({'error': 'Set up terms first (Academic Setup → School Years & Terms).'}, status=400)
    staff = get_user_role(request.user) in ('admin', 'teacher')
    if not staff and not _released(term, student):
        return Response({'error': f'The report card for {term.name} has not been released yet.', 'released': False}, status=403)
    data = report_card_data(student, term)
    data['terms'] = [{'id': str(t.id), 'name': t.name, 'year': t.academic_year.name,
                      'released': _released(t, student)} for t in Term.objects.select_related('academic_year').order_by('-start_date')[:12]
                     if staff or _released(t, student)]
    return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def releases(request):
    """GET ?term= → releases. POST {term, class_id?} → families can see those report cards (admin)."""
    if request.method == 'GET':
        qs = ReportCardRelease.objects.select_related('term', 'school_class')
        if request.query_params.get('term'):
            qs = qs.filter(term_id=request.query_params['term'])
        return Response([{'id': str(r.id), 'term': str(r.term_id), 'term_name': r.term.name,
                          'class_id': str(r.school_class_id) if r.school_class_id else None,
                          'class_name': r.school_class.name if r.school_class_id else 'All classes',
                          'released_at': r.released_at} for r in qs])
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can release report cards.'}, status=403)
    term = get_object_or_404(Term, pk=request.data.get('term'))
    r, created = ReportCardRelease.objects.get_or_create(term=term, school_class_id=request.data.get('class_id') or None,
                                                         defaults={'tenant_id': term.tenant_id, 'released_by': request.user})
    if created:
        _notify_release(term, r.school_class_id)
    return Response({'id': str(r.id), 'created': created}, status=201 if created else 200)


def _notify_release(term, class_id):
    """Tell families in-app that report cards are ready."""
    try:
        from services.core.user_notifications.utils import create_user_notification
        from services.education.students.models import Student

        students = Student.objects.filter(is_active=True)
        if class_id:
            students = students.filter(current_class_id=class_id)
        seen = set()
        for s in students.prefetch_related('parents__user'):
            for p in s.parents.all():
                if p.user_id and p.user_id not in seen:
                    seen.add(p.user_id)
                    create_user_notification(p.user, 'Report card ready',
                                             f'The {term.name} report card is ready in the parent portal.', 'academic')
    except Exception:
        pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def release_detail(request, release_id):
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can do this.'}, status=403)
    get_object_or_404(ReportCardRelease, pk=release_id).delete()
    return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transcript(request, student_id):
    """Every school year: courses, final grades, credits and GPA; cumulative GPA and credits.

    Families see years whose terms have all been released; staff see everything.
    """
    from services.education.students.households import find_student
    from services.education.students.models import Enrollment

    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    staff = get_user_role(request.user) in ('admin', 'teacher')
    scale = calc.default_scale()
    years, all_rows, credits_earned = [], [], Decimal('0')
    enrollments = (Enrollment.objects.filter(student=student, academic_year__isnull=False, school_class__isnull=False)
                   .select_related('academic_year', 'school_class').order_by('academic_year__start_date'))
    seen_years = set()
    for e in enrollments:
        if e.academic_year_id in seen_years:
            continue
        seen_years.add(e.academic_year_id)
        terms = list(Term.objects.filter(academic_year=e.academic_year).order_by('order'))
        if not terms:
            continue
        if not staff and not all(_released(t, student) for t in terms if t.end_date <= date.today()):
            continue
        courses, year_rows = [], []
        for cs in ClassSubject.objects.filter(class_ref=e.school_class).select_related('subject').order_by('subject__name'):
            term_grades = [calc.term_grade(student, cs, t, scale) for t in terms]
            percents = [g.percent for g in term_grades if g.percent is not None]
            if not percents:
                continue
            final = calc.q(sum(percents) / len(percents))
            band = calc.band_for(scale, final)
            passed = final >= scale.passing_percent
            credit = cs.subject.credit_value if passed else Decimal('0')
            credits_earned += credit
            if band is not None:
                year_rows.append((band.gpa_points, cs.subject.credit_value, cs.subject.level))
            courses.append({'subject': cs.subject.name, 'code': cs.subject.code, 'level': cs.subject.level,
                            'terms': [{'term': t.name, 'percent': float(g.percent) if g.percent is not None else None,
                                       'letter': g.letter} for t, g in zip(terms, term_grades)],
                            'final_percent': float(final), 'final_letter': band.label if band else '',
                            'credits_attempted': float(cs.subject.credit_value), 'credits_earned': float(credit)})
        if courses:
            all_rows += year_rows
            years.append({'year': e.academic_year.name, 'class_name': e.school_class.name, 'courses': courses,
                          'gpa': calc.gpa(year_rows)})
    school = student.tenant
    return Response({
        'school': {'name': ((school.settings_json or {}).get('institute_name') or school.name) if school else ''},
        'student': {'id': str(student.id), 'full_name': student.full_name, 'student_id': student.student_id,
                    'date_of_birth': student.date_of_birth.isoformat() if student.date_of_birth else None,
                    'admission_date': student.admission_date.isoformat() if student.admission_date else None},
        'scale': _scale_payload(scale),
        'years': years, 'cumulative_gpa': calc.gpa(all_rows), 'credits_earned': float(credits_earned),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_grades(request, student_id):
    """Current grades for families and students: each subject's grade and the published assignments."""
    from services.education.students.households import find_student

    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    term = Term.objects.filter(pk=request.query_params.get('term')).first()
    if term is None:
        from services.education.academics.structure import current_term

        term = current_term() or Term.objects.order_by('-end_date').first()
    scale = calc.default_scale()
    out = []
    for cs in ClassSubject.objects.filter(class_ref_id=student.current_class_id).select_related('subject').order_by('subject__name'):
        items = Assignment.objects.filter(class_subject=cs, term=term, is_published=True).filter(
            calc.models_section_filter(student)).select_related('category').order_by('-due_date')
        scores = {s.assignment_id: s for s in Score.objects.filter(student=student, assignment__in=items)}
        g = calc.term_grade(student, cs, term, scale, assignments=list(items), scores=scores)
        out.append({'subject': cs.subject.name, **g.as_dict(), 'assignments': [
            {'title': a.title, 'category': a.category.name if a.category_id else '', 'due_date': a.due_date.isoformat() if a.due_date else None,
             'points_possible': float(a.points_possible),
             'points': float(scores[a.id].points) if a.id in scores and scores[a.id].points is not None else None,
             'status': scores[a.id].status if a.id in scores else None, 'comment': scores[a.id].comment if a.id in scores else ''}
            for a in items]})
    return Response({'term': {'id': str(term.id), 'name': term.name} if term else None, 'subjects': out})
