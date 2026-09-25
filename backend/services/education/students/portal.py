"""Student / family portal: one place for a student's day-to-day school life.

- ``children/``                      the students this account can see (a student sees themself)
- ``<id>/overview/``                 attendance, grades, work due, fees, messages, calendar, behaviour, alerts
- ``<id>/assignments/``              gradebook assignments and homework with their status and marks
- ``<id>/progress/``                 term-by-term grades, attendance and behaviour, and attendance by month
- ``<id>/documents/``                files on the student's record (GET list, POST upload)
- ``documents/<doc_id>/``            GET download, PATCH (staff), DELETE

Staff (office and the student's teachers) use the same endpoints from the student page.
"""
from __future__ import annotations

import mimetypes
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import (
    ensure_student_access, filter_students_for_user, get_user_role, is_admin,
)

from .households import find_student
from .models import Certificate, Enrollment, Student, StudentDocument

ATTENDED = ('present', 'late', 'early_dismissal')


def _staff(user) -> bool:
    return get_user_role(user) in ('admin', 'teacher')


def _student_or_404(request, student_id):
    s = find_student(student_id)
    if s is None or not ensure_student_access(request.user, s):
        return None
    return s


def _photo(request, s: Student) -> str:
    if not s.profile_picture:
        return ''
    try:
        url = s.profile_picture.url
    except Exception:  # missing storage backend or file
        return ''
    return url if url.startswith('http') else request.build_absolute_uri(url)


def _student_payload(request, s: Student) -> dict:
    return {'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
            'class_name': s.current_class.name if s.current_class_id else '',
            'section_name': s.current_section.name if s.current_section_id else '',
            'photo': _photo(request, s), 'admission_date': s.admission_date.isoformat() if s.admission_date else None}


def _current_term():
    from services.education.academics.models import Term
    from services.education.academics.structure import current_term

    return current_term() or Term.objects.filter(start_date__lte=timezone.localdate()).order_by('-end_date').first()


def _attendance(student, start: date, end: date) -> dict:
    from services.education.attendance.models import AttendanceRecord

    rows = AttendanceRecord.objects.filter(student=student, date__range=(start, end)).exclude(status='holiday')
    counts = defaultdict(int)
    for status, excused in rows.values_list('status', 'is_excused'):
        if status == 'absent' and excused:
            status = 'excused'
        counts[status] += 1
    total = sum(counts.values())
    attended = sum(counts[s] for s in ATTENDED)
    return {'total': total, 'present': counts['present'], 'late': counts['late'], 'absent': counts['absent'],
            'excused': counts['excused'], 'early_dismissal': counts['early_dismissal'],
            'rate': round(attended * 100 / total, 1) if total else None}


def _class_for_term(student, term):
    """The class the student was in during a term (enrollment history), else their current class."""
    e = (Enrollment.objects.filter(student=student, academic_year_id=term.academic_year_id, school_class__isnull=False)
         .order_by('-start_date').first()) if term.academic_year_id else None
    return e.school_class_id if e else student.current_class_id


def _subject_grades(student, term, class_id=None) -> list[dict]:
    """Each subject's grade from published assignments (what families are allowed to see)."""
    from services.education.academics.models import ClassSubject
    from services.education.gradebook import calc
    from services.education.gradebook.models import Assignment, Score

    class_id = class_id or student.current_class_id
    if not class_id or term is None:
        return []
    scale = calc.default_scale()
    out = []
    for cs in ClassSubject.objects.filter(class_ref_id=class_id).select_related('subject').order_by('subject__name'):
        items = list(Assignment.objects.filter(class_subject=cs, term=term, is_published=True)
                     .filter(calc.models_section_filter(student)).select_related('category'))
        if not items:
            continue
        scores = {s.assignment_id: s for s in Score.objects.filter(student=student, assignment__in=items)}
        g = calc.term_grade(student, cs, term, scale, assignments=items, scores=scores)
        out.append({'subject': cs.subject.name, 'percent': float(g.percent) if g.percent is not None else None,
                    'letter': g.letter, 'missing': g.missing})
    return out


def _average(subjects: list[dict]):
    vals = [s['percent'] for s in subjects if s['percent'] is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _released(term, student) -> bool:
    from services.education.gradebook.models import ReportCardRelease

    return ReportCardRelease.objects.filter(term=term).filter(
        Q(school_class__isnull=True) | Q(school_class_id=student.current_class_id)).exists()


# ---------------------------------------------------------------------------
# Assignments (gradebook + homework)
# ---------------------------------------------------------------------------

def assignment_items(student, since: date | None = None) -> list[dict]:
    """Published gradebook assignments for the student's classes plus class homework, newest first."""
    from services.education.academics.models import Homework, HomeworkSubmission
    from services.education.gradebook import calc
    from services.education.gradebook.models import Assignment, Score

    today = timezone.localdate()
    since = since or today - timedelta(days=120)
    items = []
    if student.current_class_id:
        qs = (Assignment.objects.filter(class_subject__class_ref_id=student.current_class_id, is_published=True)
              .filter(calc.models_section_filter(student))
              .filter(Q(due_date__gte=since) | Q(due_date__isnull=True, created_at__date__gte=since))
              .select_related('class_subject__subject', 'category'))
        scores = {s.assignment_id: s for s in Score.objects.filter(student=student, assignment__in=qs)}
        for a in qs:
            sc = scores.get(a.id)
            if sc and sc.status in ('missing', 'excused', 'incomplete'):
                status = sc.status
            elif sc and sc.points is not None:
                status = 'graded'
            elif a.due_date and a.due_date < today:
                status = 'overdue'
            elif a.due_date == today:
                status = 'due_today'
            else:
                status = 'upcoming'
            items.append({
                'id': f'gradebook:{a.id}', 'source': 'gradebook', 'title': a.title, 'description': a.description,
                'subject': a.class_subject.subject.name, 'category': a.category.name if a.category_id else '',
                'due_date': a.due_date.isoformat() if a.due_date else None, 'assigned_date': a.created_at.date().isoformat(),
                'status': status, 'points': float(sc.points) if sc and sc.points is not None else None,
                'points_possible': float(a.points_possible), 'comment': sc.comment if sc else '',
                'late': bool(sc and sc.status == 'late'), 'has_attachment': False,
            })

    hw = Homework.objects.filter(homework_date__gte=since)
    cls = student.current_class
    if cls is not None:
        hw = hw.filter(Q(class_ref=cls) | Q(class_ref__isnull=True, class_name__iexact=cls.name))
    else:
        hw = hw.none()
    subs = {s.homework_id: s for s in HomeworkSubmission.objects.filter(student=student, homework__in=hw)}
    for h in hw:
        sub = subs.get(h.id)
        if sub and (sub.status == 'graded' or sub.obtained_marks is not None):
            status = 'graded'
        elif sub and sub.status == 'submitted':
            status = 'submitted'
        elif h.due_date and h.due_date < today:
            status = 'overdue'
        elif h.due_date == today:
            status = 'due_today'
        else:
            status = 'upcoming'
        items.append({
            'id': f'homework:{h.id}', 'source': 'homework', 'title': h.title, 'description': h.description,
            'subject': h.subject_name, 'category': 'Homework', 'due_date': h.due_date.isoformat() if h.due_date else None,
            'assigned_date': h.homework_date.isoformat(), 'status': status,
            'points': float(sub.obtained_marks) if sub and sub.obtained_marks is not None else None,
            'points_possible': float(h.max_marks) if h.max_marks is not None else None,
            'comment': sub.remarks if sub else '', 'late': False, 'has_attachment': bool(h.attachment_data),
            'teacher': h.teacher_name,
        })
    items.sort(key=lambda i: (i['due_date'] or i['assigned_date'] or ''), reverse=True)
    return items


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assignments(request, student_id):
    s = _student_or_404(request, student_id)
    if s is None:
        return Response({'error': 'Student not found.'}, status=404)
    items = assignment_items(s)
    counts = defaultdict(int)
    for i in items:
        counts[i['status']] += 1
    return Response({'student': _student_payload(request, s), 'items': items, 'counts': counts,
                     'subjects': sorted({i['subject'] for i in items if i['subject']})})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def homework_attachment(request, student_id, homework_id):
    from services.education.academics.models import Homework

    s = _student_or_404(request, student_id)
    if s is None or not s.current_class_id:
        return Response({'error': 'Student not found.'}, status=404)
    h = Homework.objects.filter(pk=homework_id).filter(
        Q(class_ref_id=s.current_class_id) | Q(class_ref__isnull=True, class_name__iexact=s.current_class.name)).first()
    if h is None or not h.attachment_data:
        return Response({'error': 'No attachment.'}, status=404)
    return Response({'name': h.attachment_name or 'attachment', 'data': h.attachment_data})


# ---------------------------------------------------------------------------
# Children, overview, progress
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def children(request):
    """The students this account looks after. Staff get nothing here: they open a student from the list."""
    if get_user_role(request.user) not in ('parent', 'student'):
        return Response([])
    qs = filter_students_for_user(request.user, Student.objects.filter(is_active=True)) \
        .select_related('current_class', 'current_section').order_by('full_name')
    return Response([_student_payload(request, s) for s in qs])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request, student_id):
    from services.education.behaviour.models import BehaviourIncident
    from services.education.communication.models import AnnouncementReceipt, ConversationParticipant
    from services.education.finance.models import Invoice, Payment
    from services.education.schoolcalendar.api import feed_for

    s = _student_or_404(request, student_id)
    if s is None:
        return Response({'error': 'Student not found.'}, status=404)
    s = Student.objects.select_related('current_class', 'current_section').get(pk=s.pk)
    today = timezone.localdate()
    term = _current_term()
    alerts = []

    # Attendance: this term (or the last 90 days) and this month.
    start = term.start_date if term else today - timedelta(days=90)
    att = _attendance(s, start, min(today, term.end_date) if term else today)
    att['period'] = 'this term' if term else 'in the last 90 days'
    att['this_month'] = _attendance(s, today.replace(day=1), today)
    from services.education.attendance.models import AttendanceRecord
    att['recent_absences'] = [
        {'date': r.date.isoformat(), 'status': 'excused' if r.is_excused else r.status, 'reason': r.get_reason_display() if r.reason else ''}
        for r in AttendanceRecord.objects.filter(student=s, status__in=('absent', 'late', 'excused')).order_by('-date')[:5]]
    att['today'] = AttendanceRecord.objects.filter(student=s, date=today).values_list('status', flat=True).first()
    if att['rate'] is not None and att['rate'] < 90 and att['total'] >= 10:
        alerts.append({'level': 'warning', 'area': 'attendance', 'text': f"Attendance {att['period']} is {att['rate']}% (below 90%)."})

    # Grades.
    subjects = _subject_grades(s, term)
    grades = {'term': {'id': str(term.id), 'name': term.name} if term else None, 'average': _average(subjects),
              'subjects': subjects, 'missing': sum(x['missing'] for x in subjects)}
    if grades['missing']:
        alerts.append({'level': 'danger', 'area': 'grades', 'text': f"{grades['missing']} missing assignment(s) this term."})
    if term and _released(term, s):
        alerts.append({'level': 'info', 'area': 'grades', 'text': f'The {term.name} report card is ready.'})

    # Work due soon and recently marked.
    work = assignment_items(s, since=today - timedelta(days=30))
    due = sorted([w for w in work if w['status'] in ('upcoming', 'due_today') and w['due_date']
                  and w['due_date'] <= (today + timedelta(days=14)).isoformat()], key=lambda w: w['due_date'])
    overdue = [w for w in work if w['status'] in ('overdue', 'missing')]
    marked = [w for w in work if w['status'] == 'graded'][:5]
    if overdue:
        alerts.append({'level': 'warning', 'area': 'assignments', 'text': f'{len(overdue)} piece(s) of work overdue or missing.'})

    # Fees.
    inv = list(Invoice.objects.filter(student=s).exclude(status__in=('cancelled', 'carried_forward', 'draft')))
    open_inv = sorted([i for i in inv if i.balance_due > 0], key=lambda i: i.due_date)
    balance = sum((Decimal(i.balance_due) for i in open_inv), Decimal('0'))
    overdue_inv = [i for i in open_inv if i.due_date < today]
    last_pay = Payment.objects.filter(invoice__student=s).order_by('-payment_date', '-created_at').first()
    fees = {
        'balance': float(balance), 'open_invoices': len(open_inv), 'overdue_invoices': len(overdue_inv),
        'overdue_amount': float(sum((Decimal(i.balance_due) for i in overdue_inv), Decimal('0'))),
        'next_due': ({'invoice_number': open_inv[0].invoice_number, 'amount': float(open_inv[0].balance_due),
                      'due_date': open_inv[0].due_date.isoformat()} if open_inv else None),
        'last_payment': ({'amount': float(last_pay.amount), 'date': last_pay.payment_date.isoformat()} if last_pay else None),
    }
    if overdue_inv:
        alerts.append({'level': 'danger', 'area': 'fees', 'text': f"Fees overdue: {len(overdue_inv)} invoice(s)."})

    # Messages and announcements for the signed-in account.
    unread = 0
    for p in ConversationParticipant.objects.filter(user=request.user).select_related('conversation'):
        qs = p.conversation.messages.exclude(sender=request.user)
        unread += qs.filter(created_at__gt=p.last_read_at).count() if p.last_read_at else qs.count()
    messages = {'unread': unread,
                'announcements': AnnouncementReceipt.objects.filter(user=request.user, read_at__isnull=True).count()}

    # Calendar: the next two weeks.
    upcoming = feed_for(request.user, today, today + timedelta(days=14), student=s)

    # Behaviour (what families may see).
    inc = BehaviourIncident.objects.filter(student=s)
    if not _staff(request.user):
        inc = inc.filter(visible_to_family=True)
    rows = list(inc.values_list('kind', 'points', 'status'))
    behaviour = {'points': sum(p for _, p, _ in rows), 'merits': sum(1 for k, _, _ in rows if k == 'positive'),
                 'incidents': sum(1 for k, _, _ in rows if k == 'negative'),
                 'open_incidents': sum(1 for k, _, st in rows if k == 'negative' and st != 'resolved')}

    docs = StudentDocument.objects.filter(student=s)
    if not _staff(request.user):
        docs = docs.filter(Q(visible_to_family=True) | Q(from_family=True))

    return Response({
        'student': _student_payload(request, s), 'today': today.isoformat(), 'alerts': alerts,
        'attendance': att, 'grades': grades,
        'assignments': {'due_soon': due[:6], 'due_count': len(due), 'overdue': overdue[:5], 'overdue_count': len(overdue),
                        'recently_marked': marked},
        'fees': fees, 'messages': messages, 'upcoming': upcoming[:8], 'behaviour': behaviour,
        'documents': {'count': docs.count(), 'latest': [_doc_payload(d) for d in docs[:3]]},
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress(request, student_id):
    """Term-by-term average, per-subject grades, attendance and behaviour; attendance for the last six months."""
    from services.education.academics.models import Term
    from services.education.behaviour.models import BehaviourIncident

    s = _student_or_404(request, student_id)
    if s is None:
        return Response({'error': 'Student not found.'}, status=404)
    today = timezone.localdate()
    terms = list(Term.objects.filter(start_date__lte=today).select_related('academic_year').order_by('-start_date')[:6])[::-1]
    staff = _staff(request.user)
    inc = BehaviourIncident.objects.filter(student=s)
    if not staff:
        inc = inc.filter(visible_to_family=True)
    rows, by_subject = [], defaultdict(dict)
    for t in terms:
        subjects = _subject_grades(s, t, _class_for_term(s, t))
        for x in subjects:
            by_subject[x['subject']][str(t.id)] = x['percent']
        end = min(t.end_date, today)
        att = _attendance(s, t.start_date, end)
        in_term = inc.filter(date__range=(t.start_date, end)).values_list('kind', flat=True)
        rows.append({'id': str(t.id), 'name': t.name, 'year': t.academic_year.name if t.academic_year_id else '',
                     'start_date': t.start_date.isoformat(), 'end_date': t.end_date.isoformat(),
                     'current': t.start_date <= today <= t.end_date, 'average': _average(subjects),
                     'subjects': len(subjects), 'attendance_rate': att['rate'], 'absences': att['absent'] + att['excused'],
                     'late': att['late'], 'merits': sum(1 for k in in_term if k == 'positive'),
                     'incidents': sum(1 for k in in_term if k == 'negative'),
                     'report_card': staff or _released(t, s)})
    months = []
    first = today.replace(day=1)
    for n in range(5, -1, -1):
        y, m = first.year, first.month - n
        while m <= 0:
            y, m = y - 1, m + 12
        start = date(y, m, 1)
        end = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1))
        a = _attendance(s, start, min(end, today))
        months.append({'month': start.isoformat()[:7], 'label': start.strftime('%b %Y'), 'rate': a['rate'], 'days': a['total']})
    subjects = [{'subject': name, 'terms': vals} for name, vals in sorted(by_subject.items())]
    # Trend: compare the latest two terms with an average.
    graded = [r for r in rows if r['average'] is not None]
    trend = round(graded[-1]['average'] - graded[-2]['average'], 1) if len(graded) >= 2 else None
    return Response({'student': _student_payload(request, s), 'terms': rows, 'subjects': subjects, 'months': months,
                     'trend': trend})


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

def _doc_payload(d: StudentDocument, user=None) -> dict:
    return {'id': str(d.id), 'title': d.title, 'category': d.category, 'category_label': d.get_category_display(),
            'name': d.original_name, 'size': d.size, 'content_type': d.content_type,
            'visible_to_family': d.visible_to_family, 'from_family': d.from_family,
            'uploaded_by': (d.uploaded_by.full_name or d.uploaded_by.email) if d.uploaded_by_id else '',
            'uploaded_at': d.uploaded_at.isoformat(),
            'can_delete': bool(user and (is_admin(user) or (d.uploaded_by_id and d.uploaded_by_id == user.pk)))}


def _notify_family(student, title, message):
    from services.core.user_notifications.utils import create_user_notification
    from services.education.attendance.register import _recipients

    _, users = _recipients(student)
    for u in users:
        create_user_notification(u, title, message, 'announcement')


def _notify_staff(student, title, message):
    from services.core.user_notifications.utils import create_user_notification
    from services.education.communication.inbox import admin_users, teacher_users

    users = set(admin_users(student.tenant)) if student.tenant_id else set()
    if student.current_class_id:
        users |= set(teacher_users([student.current_class_id]))
    for u in users:
        create_user_notification(u, title, message, 'announcement')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def documents(request, student_id):
    """GET: the student's documents plus report cards and certificates. POST (multipart): upload a file."""
    from services.core.storage.utils import validate_upload

    s = _student_or_404(request, student_id)
    if s is None:
        return Response({'error': 'Student not found.'}, status=404)
    staff = _staff(request.user)
    if request.method == 'POST':
        f = request.FILES.get('file')
        if f is None:
            return Response({'error': 'Choose a file to upload.'}, status=400)
        try:
            info = validate_upload(f, f.name, declared_content_type=getattr(f, 'content_type', None))
        except DjangoValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=400)
        category = request.data.get('category') or 'other'
        if category not in dict(StudentDocument.CATEGORIES):
            category = 'other'
        visible = str(request.data.get('visible_to_family', 'true')).lower() in ('1', 'true', 'yes', 'on')
        d = StudentDocument.objects.create(
            student=s, tenant=s.tenant, title=(request.data.get('title') or info.name)[:200], category=category, file=f,
            original_name=info.name, size=info.size, content_type=getattr(f, 'content_type', '') or '',
            visible_to_family=visible if staff else True, from_family=not staff, uploaded_by=request.user)
        who = request.user.full_name or request.user.email
        if staff and d.visible_to_family:
            _notify_family(s, 'New document', f'{d.title} was added to {s.full_name}’s documents.')
        elif not staff:
            _notify_staff(s, 'Document from a family', f'{who} uploaded “{d.title}” for {s.full_name}.')
        return Response(_doc_payload(d, request.user), status=201)

    qs = StudentDocument.objects.filter(student=s).select_related('uploaded_by')
    if not staff:
        qs = qs.filter(Q(visible_to_family=True) | Q(from_family=True))
    from services.education.academics.models import Term

    report_cards = [{'term_id': str(t.id), 'term': t.name, 'year': t.academic_year.name if t.academic_year_id else ''}
                    for t in Term.objects.select_related('academic_year').order_by('-start_date')[:12]
                    if (staff and t.start_date <= timezone.localdate()) or _released(t, s)]
    certs = [{'id': str(c.id), 'template': c.template, 'issue_date': c.issue_date.isoformat()}
             for c in Certificate.objects.filter(recipient_type='student').filter(
                 Q(recipient_id__in=[s.student_id, str(s.id)]) | Q(recipient_id='', recipient_name=s.full_name))[:50]]
    return Response({'student': _student_payload(request, s), 'can_manage': staff,
                     'categories': [{'value': v, 'label': l} for v, l in StudentDocument.CATEGORIES],
                     'documents': [_doc_payload(d, request.user) for d in qs],
                     'report_cards': report_cards, 'certificates': certs})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_detail(request, doc_id):
    d = get_object_or_404(StudentDocument.objects.select_related('student', 'uploaded_by'), pk=doc_id)
    staff = _staff(request.user)
    if not ensure_student_access(request.user, d.student) or (not staff and not (d.visible_to_family or d.from_family)):
        return Response({'error': 'Document not found.'}, status=404)
    if request.method == 'GET':
        try:
            fh = d.file.open('rb')
        except (FileNotFoundError, OSError):
            return Response({'error': 'The file is no longer available.'}, status=404)
        ctype = d.content_type or mimetypes.guess_type(d.original_name)[0] or 'application/octet-stream'
        return FileResponse(fh, content_type=ctype, as_attachment=request.query_params.get('inline') != '1',
                            filename=d.original_name or 'document')
    if request.method == 'PATCH':
        if not staff:
            return Response({'error': 'Only school staff can change documents.'}, status=403)
        was_visible = d.visible_to_family
        if 'title' in request.data:
            d.title = str(request.data['title'])[:200] or d.title
        if request.data.get('category') in dict(StudentDocument.CATEGORIES):
            d.category = request.data['category']
        if 'visible_to_family' in request.data and not d.from_family:
            d.visible_to_family = str(request.data['visible_to_family']).lower() in ('1', 'true', 'yes', 'on')
        d.save()
        if d.visible_to_family and not was_visible:
            _notify_family(d.student, 'New document', f'{d.title} was shared in {d.student.full_name}’s documents.')
        return Response(_doc_payload(d, request.user))
    if not (is_admin(request.user) or d.uploaded_by_id == request.user.pk):
        return Response({'error': 'Only the office or the person who uploaded it can remove this document.'}, status=403)
    d.file.delete(save=False)
    d.delete()
    return Response(status=204)
