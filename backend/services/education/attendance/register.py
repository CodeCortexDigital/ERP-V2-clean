"""Attendance codes, period attendance, absence reports and family alerts.

* Codes: present, absent (excused / unexcused), tardy with minutes late
  (excused / unexcused), early dismissal, holiday; each with a reason.
* Period attendance: teachers mark each lesson; in "period" mode the daily
  status is worked out from the lessons.
* Absence reports: parents report an absence; the office approves it and
  the days are marked excused.
* Alerts: guardians who receive school messages get an email and an in-app
  notice for unexcused absences and tardies, and a warning when absences add up.
"""
from __future__ import annotations

import calendar as _calendar
import logging
from datetime import date, timedelta

from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import (
    ensure_student_access, filter_students_for_user, get_user_role, is_admin, is_parent,
)

from .calendar import is_school_day
from .models import REASONS, AbsenceReport, AttendanceNotice, AttendanceRecord, PeriodAttendance

logger = logging.getLogger(__name__)

DEFAULTS = {
    'mode': 'daily',            # 'daily' (one register a day) or 'period' (each lesson)
    'alert_absent': True,       # tell families about unexcused absences
    'alert_tardy': True,        # ... and unexcused tardies
    'alert_email': True,
    'alert_in_app': True,
    'chronic_threshold': 3,     # warn after this many unexcused absences in 30 days (0 = off)
}
ATTENDED = ('present', 'late', 'early_dismissal')


def settings_for(school) -> dict:
    return clean_settings(((getattr(school, 'settings_json', None) or {}).get('attendance')) or {})


def clean_settings(raw: dict) -> dict:
    out = {**DEFAULTS, **{k: raw[k] for k in DEFAULTS if k in raw}}
    for key in ('alert_absent', 'alert_tardy', 'alert_email', 'alert_in_app'):
        out[key] = out[key] in (True, 'true', '1', 1, 'on')
    out['mode'] = out['mode'] if out['mode'] in ('daily', 'period') else 'daily'
    try:
        out['chronic_threshold'] = max(0, int(out['chronic_threshold']))
    except (TypeError, ValueError):
        out['chronic_threshold'] = DEFAULTS['chronic_threshold']
    return out


def code_for(record) -> str:
    """Human label: 'Absent (excused)', 'Tardy (unexcused)', ..."""
    status = getattr(record, 'status', '')
    excused = bool(getattr(record, 'is_excused', False)) or status == 'excused'
    if status in ('absent', 'excused'):
        return f"Absent ({'excused' if excused else 'unexcused'})"
    if status == 'late':
        return f"Tardy ({'excused' if excused else 'unexcused'})"
    return {'present': 'Present', 'holiday': 'No school', 'early_dismissal': 'Early dismissal'}.get(status, status)


# ---------------------------------------------------------------------------
# Family alerts
# ---------------------------------------------------------------------------

def _recipients(student):
    """Guardians who receive school messages, plus parent portal accounts."""
    from services.education.students.models import StudentGuardian

    emails, users = set(), set()
    for link in StudentGuardian.objects.filter(student=student, receives_messages=True).select_related('guardian'):
        if link.guardian.email:
            emails.add(link.guardian.email)
        if link.guardian.user_id:
            users.add(link.guardian.user)
    for profile in student.parents.select_related('user').all():
        if profile.user:
            users.add(profile.user)
            if profile.user.email:
                emails.add(profile.user.email)
    return sorted(emails), list(users)


def _school_name(student):
    school = getattr(student, 'tenant', None)
    return ((school.settings_json or {}).get('institute_name') or school.name) if school else 'School'


def send_notice(student, day: date, kind: str, message: str, texts_ctx: dict | None = None) -> AttendanceNotice | None:
    """Send one alert to the family (email + in-app, and SMS / WhatsApp if the school set them up: P16), at most once
    per student, day and kind."""
    cfg = settings_for(student.tenant)
    try:
        with transaction.atomic():
            notice = AttendanceNotice.objects.create(tenant_id=student.tenant_id, student=student, date=day,
                                                     kind=kind, message=message)
    except IntegrityError:
        return None  # already sent
    emails, users = _recipients(student)
    sent = []
    if cfg['alert_email'] and emails:
        try:
            send_mail(f'{_school_name(student)}: attendance for {student.full_name}', message, None, emails,
                      fail_silently=True)
            sent += emails
        except Exception:
            logger.exception('Attendance email failed')
    if cfg['alert_in_app'] and users:
        try:
            from services.core.user_notifications.utils import create_user_notification

            for u in users:
                create_user_notification(u, f'Attendance: {student.full_name}', message, 'attendance')
                sent.append(f'app:{u.email}')
        except Exception:
            logger.exception('In-app attendance notice failed')
    try:
        from services.education.communication import texts
        from services.education.communication.inbox import _in_background

        ctx = {'date': day.strftime('%d %b %Y'), **(texts_ctx or {})}
        _in_background(lambda: texts.notify_family(student, kind, ctx, key=day.isoformat()))
    except Exception:
        logger.exception('Attendance text failed')
    notice.sent_to = sent
    notice.save(update_fields=['sent_to'])
    return notice


def alert_for_record(record: AttendanceRecord):
    """Called after a daily record is saved. Unexcused absences and tardies alert the family."""
    student = record.student
    cfg = settings_for(student.tenant)
    excused = record.is_excused or record.status == 'excused'
    when = record.date.strftime('%A %d %B %Y')
    if record.status == 'absent' and not excused and cfg['alert_absent']:
        send_notice(student, record.date, 'absent',
                    f'{student.full_name} was marked absent on {when}. If you know the reason, please report it '
                    f'in the parent portal or contact the school office.')
    elif record.status == 'late' and not excused and cfg['alert_tardy']:
        mins = f' ({record.minutes_late} minutes late)' if record.minutes_late else ''
        send_notice(student, record.date, 'late', f'{student.full_name} arrived late on {when}{mins}.', {'minutes': mins})
    if record.status == 'absent' and not excused and cfg['chronic_threshold']:
        since = record.date - timedelta(days=30)
        count = AttendanceRecord.objects.filter(student=student, date__gt=since, date__lte=record.date,
                                                status='absent', is_excused=False).count()
        if count >= cfg['chronic_threshold']:
            recent = AttendanceNotice.objects.filter(student=student, kind='chronic', date__gt=since).exists()
            if not recent:
                send_notice(student, record.date, 'chronic',
                            f'{student.full_name} has missed {count} school days without an excuse in the last 30 days. '
                            f'Regular attendance matters. Please contact the school so we can help.', {'count': count})


# ---------------------------------------------------------------------------
# Period attendance and the daily roll-up
# ---------------------------------------------------------------------------

def rollup_daily(student, day: date, user=None):
    """In period mode, set the daily status from the lessons marked so far."""
    from .services import upsert_attendance_record

    marks = list(PeriodAttendance.objects.filter(student=student, date=day).order_by('period_number'))
    if not marks:
        return None
    statuses = [m.status for m in marks]
    if all(s in ('absent', 'excused') for s in statuses):
        status = 'absent'
        excused = all(m.is_excused or m.status == 'excused' for m in marks)
    elif statuses[0] == 'late' or (statuses[0] in ('absent', 'excused') and any(s in ('present', 'late') for s in statuses[1:])):
        status, excused = 'late', marks[0].is_excused
    elif any(s in ('absent', 'excused') for s in statuses[1:]) and statuses[0] == 'present':
        status, excused = 'early_dismissal', False
    else:
        status, excused = 'present', False
    with transaction.atomic():  # alerts go out after commit, once is_excused is set
        upsert_attendance_record(student=student, record_date=day, status=status, remarks='From lesson attendance',
                                 marked_by=user)
        rec = AttendanceRecord.objects.get(student=student, date=day)
        minutes = marks[0].minutes_late if status == 'late' else None
        AttendanceRecord.objects.filter(pk=rec.pk).update(is_excused=excused, minutes_late=minutes)
    rec.refresh_from_db()
    return rec


def _teacher_can_mark(user, school_class_id) -> bool:
    role = get_user_role(user)
    if role == 'admin':
        return True
    if role != 'teacher':
        return False
    from services.core.accounts.decorators import _get_teacher_class_ids

    return str(school_class_id) in {str(c) for c in _get_teacher_class_ids(user)}


def _periods_for(school_class_id, section_id, day: date):
    """Lessons for a class on a date: from the timetable, else every teaching period."""
    from services.education.academics.models import Period, TimetableEntry

    weekday = day.strftime('%A').lower()
    entries = (TimetableEntry.objects.filter(class_subject__class_ref_id=school_class_id, is_active=True)
               .select_related('period', 'class_subject__subject'))
    entries = [e for e in entries if str(e.day_of_week).lower() in (weekday, weekday[:3])
               and (not section_id or not e.section_id or str(e.section_id) == str(section_id))]
    if entries:
        seen, out = set(), []
        for e in sorted(entries, key=lambda e: e.period.period_number):
            if e.period.period_number in seen:
                continue
            seen.add(e.period.period_number)
            out.append({'period_number': e.period.period_number, 'period_id': str(e.period_id),
                        'name': e.period.name or f'Period {e.period.period_number}',
                        'subject': e.class_subject.subject.name if e.class_subject.subject_id else '',
                        'start': e.period.start_time.strftime('%H:%M') if e.period.start_time else ''})
        return out
    periods = Period.objects.filter(is_active=True, is_break=False).order_by('period_number')
    unique = {}
    for p in periods:
        unique.setdefault(p.period_number, p)
    return [{'period_number': n, 'period_id': str(p.id), 'name': p.name or f'Period {n}', 'subject': '',
             'start': p.start_time.strftime('%H:%M') if p.start_time else ''} for n, p in sorted(unique.items())]


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def _parse(value, default=None):
    try:
        return date.fromisoformat(str(value)) if value else default
    except ValueError:
        return default


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def attendance_settings(request):
    school = getattr(request, 'tenant', None)
    if school is None:
        return Response({'error': 'No school selected.'}, status=400)
    if request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'error': 'Only school administrators can change attendance settings.'}, status=403)
        from services.core.tenants.context import use_tenant
        from services.core.tenants.models import School

        cfg = settings_for(school)
        for key in DEFAULTS:
            if key in request.data:
                cfg[key] = request.data[key]
        with use_tenant(None):
            fresh = School.objects.get(pk=school.pk)
            fresh.settings_json = {**(fresh.settings_json or {}), 'attendance': clean_settings(cfg)}
            fresh.save(update_fields=['settings_json'])
        school = fresh
    return Response({**settings_for(school), 'reasons': [{'value': v, 'label': l} for v, l in REASONS]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def period_roster(request):
    """?class_id=&section_id=&date= → lessons for the day and each student's marks."""
    from services.education.students.models import Student

    class_id = request.query_params.get('class_id')
    if not class_id:
        return Response({'error': 'Choose a class.'}, status=400)
    if not _teacher_can_mark(request.user, class_id):
        return Response({'error': 'You can only take attendance for your own classes.'}, status=403)
    day = _parse(request.query_params.get('date'), timezone.localdate())
    section_id = request.query_params.get('section_id') or None
    students = Student.objects.filter(current_class_id=class_id, is_active=True).order_by('full_name')
    if section_id:
        students = students.filter(current_section_id=section_id)
    marks = {}
    for m in PeriodAttendance.objects.filter(student__in=students, date=day):
        marks.setdefault(str(m.student_id), {})[m.period_number] = {
            'status': m.status, 'is_excused': m.is_excused, 'minutes_late': m.minutes_late, 'remarks': m.remarks}
    daily = {str(r.student_id): {'status': r.status, 'is_excused': r.is_excused, 'code': code_for(r)}
             for r in AttendanceRecord.objects.filter(student__in=students, date=day)}
    return Response({
        'date': day.isoformat(), 'school_day': is_school_day(day), 'mode': settings_for(request.tenant)['mode'],
        'periods': _periods_for(class_id, section_id, day),
        'students': [{'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
                      'marks': marks.get(str(s.id), {}), 'daily': daily.get(str(s.id))} for s in students],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_period_attendance(request):
    """{date, class_id, period_number, subject?, records: [{student_id, status, minutes_late?, remarks?}]}"""
    from services.education.students.models import Student

    class_id = request.data.get('class_id')
    if not class_id or not _teacher_can_mark(request.user, class_id):
        return Response({'error': 'You can only take attendance for your own classes.'}, status=403)
    day = _parse(request.data.get('date'), timezone.localdate())
    if day > timezone.localdate():
        return Response({'error': 'You cannot take attendance for a future date.'}, status=400)
    try:
        number = int(request.data.get('period_number'))
    except (TypeError, ValueError):
        return Response({'error': 'Choose the lesson (period).'}, status=400)
    period_id = request.data.get('period_id') or None
    subject = str(request.data.get('subject') or '')[:120]
    mode = settings_for(request.tenant)['mode']
    saved = 0
    with transaction.atomic():
        for row in request.data.get('records') or []:
            student = Student.objects.filter(pk=row.get('student_id'), current_class_id=class_id).first()
            status = row.get('status')
            if not student or status not in dict(PeriodAttendance._meta.get_field('status').choices):
                continue
            late = row.get('minutes_late')
            PeriodAttendance.objects.update_or_create(
                student=student, date=day, period_number=number,
                defaults={'tenant_id': student.tenant_id, 'period_id': period_id, 'subject_name': subject,
                          'status': status, 'is_excused': status == 'excused',
                          'minutes_late': int(late) if status == 'late' and str(late or '').isdigit() else None,
                          'remarks': str(row.get('remarks') or '')[:255], 'marked_by': request.user},
            )
            saved += 1
            if mode == 'period':
                transaction.on_commit(lambda s=student: rollup_daily(s, day, request.user))
    return Response({'saved': saved, 'mode': mode})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_daily_record(request, student_id, day):
    """Office sets a day's code for a student: {status, is_excused, reason, minutes_late, remarks}."""
    from services.education.students.households import find_student

    from .services import upsert_attendance_record

    if not is_admin(request.user):
        return Response({'error': 'Only the school office can change attendance codes.'}, status=403)
    student = find_student(student_id)
    the_day = _parse(day)
    if not student or not the_day:
        return Response({'error': 'Student or date not found.'}, status=404)
    status = request.data.get('status')
    if status not in dict(AttendanceRecord._meta.get_field('status').choices):
        return Response({'error': 'Choose a valid attendance code.'}, status=400)
    reason = request.data.get('reason') or ''
    minutes = request.data.get('minutes_late')
    with transaction.atomic():  # alerts go out after commit, once is_excused is set
        upsert_attendance_record(student=student, record_date=the_day, status=status,
                                 remarks=str(request.data.get('remarks') or ''), marked_by=request.user)
        rec = AttendanceRecord.objects.get(student=student, date=the_day)
        AttendanceRecord.objects.filter(pk=rec.pk).update(
            is_excused=bool(request.data.get('is_excused')) or status == 'excused',
            reason=reason if reason in dict(REASONS) else '',
            minutes_late=int(minutes) if status == 'late' and str(minutes or '').isdigit() else None,
        )
    rec.refresh_from_db()
    return Response({'date': rec.date.isoformat(), 'status': rec.status, 'is_excused': rec.is_excused,
                     'reason': rec.reason, 'minutes_late': rec.minutes_late, 'code': code_for(rec)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_calendar(request, student_id):
    """?year=&month= → each day's code, lessons, reports and alerts for one student."""
    from services.education.students.households import find_student

    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    today = timezone.localdate()
    try:
        year = int(request.query_params.get('year') or today.year)
        month = int(request.query_params.get('month') or today.month)
        first = date(year, month, 1)
    except (TypeError, ValueError):
        first = today.replace(day=1)
    last = first.replace(day=_calendar.monthrange(first.year, first.month)[1])
    records = {r.date: r for r in AttendanceRecord.objects.filter(student=student, date__range=(first, last))}
    lessons = {}
    for m in PeriodAttendance.objects.filter(student=student, date__range=(first, last)):
        lessons.setdefault(m.date, []).append({'period': m.period_number, 'subject': m.subject_name, 'status': m.status,
                                               'is_excused': m.is_excused, 'minutes_late': m.minutes_late})
    days = []
    d = first
    while d <= last:
        r = records.get(d)
        days.append({'date': d.isoformat(), 'school_day': is_school_day(d),
                     'status': r.status if r else None, 'is_excused': bool(r and (r.is_excused or r.status == 'excused')),
                     'reason': r.reason if r else '', 'reason_label': r.get_reason_display() if r and r.reason else '',
                     'minutes_late': r.minutes_late if r else None, 'remarks': r.remarks if r else '',
                     'code': code_for(r) if r else '', 'lessons': lessons.get(d, [])})
        d += timedelta(days=1)
    year_start = date(today.year if today.month >= 8 else today.year - 1, 8, 1)
    year_records = AttendanceRecord.objects.filter(student=student, date__gte=year_start).exclude(status='holiday')
    total = year_records.count()
    summary = {
        'school_days': total,
        'present': year_records.filter(status__in=ATTENDED).count(),
        'absent_excused': year_records.filter(status__in=('absent', 'excused'), is_excused=True).count()
        + year_records.filter(status='excused', is_excused=False).count(),
        'absent_unexcused': year_records.filter(status='absent', is_excused=False).count(),
        'tardy': year_records.filter(status='late').count(),
        'early_dismissal': year_records.filter(status='early_dismissal').count(),
    }
    summary['rate'] = round(summary['present'] / total * 100, 1) if total else None
    return Response({
        'student': {'id': str(student.id), 'full_name': student.full_name},
        'month': first.strftime('%Y-%m'), 'days': days, 'year_summary': summary,
        'notices': [{'date': n.date.isoformat(), 'kind': n.get_kind_display(), 'message': n.message, 'sent_to': n.sent_to,
                     'at': n.created_at} for n in AttendanceNotice.objects.filter(student=student)[:20]],
        'reports': [_report_payload(r) for r in AbsenceReport.objects.filter(student=student)[:20]],
        'can_edit': is_admin(request.user),
    })


def _report_payload(r: AbsenceReport) -> dict:
    return {'id': str(r.id), 'student_id': str(r.student_id), 'student': r.student.full_name,
            'class_name': r.student.current_class.name if r.student.current_class_id else '',
            'start_date': r.start_date.isoformat(), 'end_date': r.end_date.isoformat(), 'kind': r.kind,
            'kind_label': r.get_kind_display(), 'reason': r.reason, 'reason_label': r.get_reason_display(),
            'note': r.note, 'status': r.status, 'status_label': r.get_status_display(),
            'submitted_by': r.submitted_by_name, 'response': r.response, 'created_at': r.created_at}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def absence_reports(request):
    """GET: the office sees reports (?status=pending); parents see their own children's.
    POST: {student_id, start_date, end_date, kind, reason, note} from a parent or the office."""
    from services.education.students.models import Student

    if request.method == 'GET':
        qs = AbsenceReport.objects.select_related('student__current_class')
        if not is_admin(request.user):
            qs = qs.filter(student__in=filter_students_for_user(request.user, Student.objects.all()))
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        return Response([_report_payload(r) for r in qs[:200]])

    student = Student.objects.filter(pk=request.data.get('student_id')).first()
    if not student or not (is_admin(request.user) or (is_parent(request.user) and ensure_student_access(request.user, student))):
        return Response({'error': 'You can only report absences for your own children.'}, status=403)
    start = _parse(request.data.get('start_date'))
    end = _parse(request.data.get('end_date'), start)
    if not start or not end or end < start:
        return Response({'error': 'Choose the first and last day of the absence.'}, status=400)
    if (end - start).days > 60:
        return Response({'error': 'Report up to 60 days at a time.'}, status=400)
    reason = request.data.get('reason') or 'illness'
    kind = request.data.get('kind') or 'absent'
    if reason not in dict(REASONS) or kind not in dict(AbsenceReport._meta.get_field('kind').choices):
        return Response({'error': 'Choose a reason.'}, status=400)
    report = AbsenceReport.objects.create(
        tenant_id=student.tenant_id, student=student, start_date=start, end_date=end, kind=kind, reason=reason,
        note=str(request.data.get('note') or '')[:2000], submitted_by=request.user,
        submitted_by_name=getattr(request.user, 'full_name', '') or request.user.email,
    )
    if is_admin(request.user):
        with transaction.atomic():
            _approve(report, request.user, 'Recorded by the school office')
    return Response(_report_payload(report), status=201)


def _approve(report: AbsenceReport, user, note=''):
    from .services import upsert_attendance_record

    day = report.start_date
    while day <= report.end_date:
        if is_school_day(day):
            upsert_attendance_record(student=report.student, record_date=day, status=report.kind,
                                     remarks=f'Reported: {report.get_reason_display()}', marked_by=user)
            AttendanceRecord.objects.filter(student=report.student, date=day).update(is_excused=True, reason=report.reason)
        day += timedelta(days=1)
    report.status = 'approved'
    report.reviewed_by = user
    report.reviewed_at = timezone.now()
    report.response = note[:255]
    report.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_absence_report(request, report_id):
    """{decision: 'approve' | 'decline', note}"""
    if not is_admin(request.user):
        return Response({'error': 'Only the school office can review absence reports.'}, status=403)
    report = get_object_or_404(AbsenceReport.objects.select_related('student'), pk=report_id)
    if report.status != 'pending':
        return Response({'error': 'This report has already been reviewed.'}, status=400)
    note = str(request.data.get('note') or '')
    if request.data.get('decision') == 'approve':
        with transaction.atomic():
            _approve(report, request.user, note)
        message = (f'The school has excused {report.student.full_name} from {report.start_date:%d %b} '
                   f'to {report.end_date:%d %b %Y}.')
    elif request.data.get('decision') == 'decline':
        report.status = 'declined'
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.response = note[:255]
        report.save()
        message = f'The school could not excuse the absence you reported for {report.student.full_name}. {note}'.strip()
    else:
        return Response({'error': 'Choose approve or decline.'}, status=400)
    if report.submitted_by and report.submitted_by != request.user:
        try:
            from services.core.user_notifications.utils import create_user_notification

            create_user_notification(report.submitted_by, 'Absence report', message, 'attendance')
        except Exception:
            logger.exception('Could not notify the parent about their absence report')
    return Response(_report_payload(report))
