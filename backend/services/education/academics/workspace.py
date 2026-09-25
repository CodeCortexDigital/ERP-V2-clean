"""Teacher workspace: the day, the classes and the students a teacher is responsible for.

- ``today/``                  today's lessons (with register status), registers due, work to mark, work due soon,
                              meetings, parents' absence notes, behaviour follow-ups, unread messages and the week ahead
- ``classes/``                every class the teacher teaches, with attendance, averages, missing work and incidents
- ``classes/<id>/``           the class roster, one row per student, with an "needs attention" flag and the reasons
- ``report/``                 grade spread per class and subject, attendance by class, and students who need attention

Teachers see their own classes; the office sees every class.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import _get_teacher_class_ids, get_user_role

from .models import ClassSubject, Homework, HomeworkSubmission, SchoolClass, Teacher, TeacherSubjectAssignment, TimetableEntry

LOW_ATTENDANCE, LOW_AVERAGE, MANY_MISSING, MANY_INCIDENTS = 90, 50, 3, 2


def _teacher(user):
    return Teacher.objects.filter(email__iexact=user.email).first() if user.email else None


def _scope(request):
    """(role, teacher record or None, class ids) — None means every class (the office)."""
    role = get_user_role(request.user)
    if role == 'admin':
        return role, _teacher(request.user), None
    if role != 'teacher':
        return role, None, []
    return role, _teacher(request.user), {str(c) for c in _get_teacher_class_ids(request.user)}


def _my_class_subjects(teacher, class_ids):
    """The class-subjects this teacher teaches (by assignment or timetable); the office gets all of them."""
    qs = ClassSubject.objects.select_related('subject', 'class_ref')
    if class_ids is None:
        return list(qs)
    ids = set()
    if teacher is not None:
        ids |= set(TeacherSubjectAssignment.objects.filter(teacher=teacher).values_list('class_subject_id', flat=True))
        ids |= set(TimetableEntry.objects.filter(teacher=teacher, is_active=True).values_list('class_subject_id', flat=True))
    mine = [cs for cs in qs.filter(id__in=ids)]
    # A homeroom / class teacher without subject assignments still sees the class's subjects.
    covered = {str(cs.class_ref_id) for cs in mine}
    extra = qs.filter(class_ref_id__in=[c for c in class_ids if c not in covered])
    return mine + list(extra)


def _active_students(class_id):
    from services.education.students.models import Student

    return list(Student.objects.filter(current_class_id=class_id, is_active=True).order_by('full_name'))


def _term():
    from services.education.students.portal import _current_term

    return _current_term()


# ---------------------------------------------------------------------------
# Today
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today(request):
    from services.education.attendance.calendar import is_school_day
    from services.education.attendance.models import AbsenceReport, AttendanceRecord, PeriodAttendance
    from services.education.behaviour.models import BehaviourIncident
    from services.education.communication.models import ConversationParticipant
    from services.education.gradebook.models import Assignment, Score
    from services.education.schoolcalendar.api import feed_for
    from services.education.schoolcalendar.models import MeetingSlot

    role, teacher, class_ids = _scope(request)
    if role not in ('teacher', 'admin'):
        return Response({'error': 'The workspace is for school staff.'}, status=403)
    now = timezone.localtime()
    day = now.date()
    school_day = is_school_day(day)
    weekday = day.strftime('%A').lower()

    # Lessons from the timetable, with whether the register for that lesson is done.
    lessons = []
    if teacher is not None:
        entries = (TimetableEntry.objects.filter(teacher=teacher, is_active=True)
                   .select_related('period', 'class_subject__subject', 'class_subject__class_ref', 'classroom', 'section'))
        for e in sorted([e for e in entries if str(e.day_of_week).lower() in (weekday, weekday[:3])],
                        key=lambda e: (e.period.start_time, e.period.period_number)):
            cls = e.class_subject.class_ref
            students = [s.id for s in _active_students(cls.id)]
            if e.section_id:
                from services.education.students.models import Student
                students = list(Student.objects.filter(id__in=students, current_section_id=e.section_id).values_list('id', flat=True))
            taken = PeriodAttendance.objects.filter(student_id__in=students, date=day,
                                                    period_number=e.period.period_number).count()
            start, end = e.period.start_time, e.period.end_time
            lessons.append({
                'id': str(e.id), 'period': e.period.name or f'Period {e.period.period_number}',
                'period_number': e.period.period_number, 'start': start.strftime('%H:%M'), 'end': end.strftime('%H:%M'),
                'class_id': str(cls.id), 'class_name': cls.name, 'section': e.section.name if e.section_id else '',
                'subject': e.class_subject.subject.name, 'room': getattr(e.classroom, 'name', '') or '',
                'students': len(students), 'register_taken': taken, 'register_done': bool(students) and taken >= len(students),
                'now': start <= now.time() <= end, 'past': end < now.time(),
            })

    # Daily registers for the teacher's classes.
    classes = SchoolClass.objects.all() if class_ids is None else SchoolClass.objects.filter(id__in=class_ids)
    registers = []
    if school_day:
        for order, cls in enumerate(classes.order_by('grade_level', 'name')):
            students = _active_students(cls.id)
            if not students:
                continue
            rows = AttendanceRecord.objects.filter(student__in=students, date=day)
            marked = rows.count()
            registers.append({'class_id': str(cls.id), 'class_name': cls.name, 'marked': marked, 'total': len(students),
                              'absent': rows.filter(status='absent').count(), 'late': rows.filter(status='late').count(),
                              'homeroom': bool(teacher and cls.homeroom_teacher_id == teacher.id), 'order': order})
        # Registers still to take first, the homeroom first among them, then by grade.
        registers.sort(key=lambda r: (r['marked'] >= r['total'], not r['homeroom'], r['order']))
        for r in registers:
            del r['order']

    # Gradebook work waiting for marks, and work due this week.
    cs_ids = [cs.id for cs in _my_class_subjects(teacher, class_ids)]
    to_mark = []
    for a in (Assignment.objects.filter(class_subject_id__in=cs_ids, due_date__lte=day, due_date__gte=day - timedelta(days=60))
              .select_related('class_subject__subject', 'class_subject__class_ref').order_by('-due_date')[:60]):
        students = _active_students(a.class_subject.class_ref_id)
        if a.section_id:
            students = [s for s in students if s.current_section_id == a.section_id]
        done = Score.objects.filter(assignment=a, student__in=students).filter(
            Q(points__isnull=False) | Q(status__in=('missing', 'excused'))).count()
        if students and done < len(students):
            to_mark.append({'id': str(a.id), 'title': a.title, 'subject': a.class_subject.subject.name,
                            'class_name': a.class_subject.class_ref.name, 'class_id': str(a.class_subject.class_ref_id),
                            'due_date': a.due_date.isoformat(), 'marked': done, 'total': len(students)})
    hw_qs = Homework.objects.filter(due_date__lte=day, due_date__gte=day - timedelta(days=30))
    hw_qs = hw_qs.filter(teacher=teacher) if teacher is not None and class_ids is not None else (hw_qs if class_ids is None else hw_qs.none())
    homework_to_mark = []
    for h in hw_qs.order_by('-due_date')[:30]:
        waiting = HomeworkSubmission.objects.filter(homework=h, status='submitted', obtained_marks__isnull=True).count()
        if waiting:
            homework_to_mark.append({'id': str(h.id), 'title': h.title, 'subject': h.subject_name, 'class_name': h.class_name,
                                     'due_date': h.due_date.isoformat(), 'waiting': waiting})
    due_soon = [{'id': str(a.id), 'title': a.title, 'subject': a.class_subject.subject.name, 'class_name': a.class_subject.class_ref.name,
                 'due_date': a.due_date.isoformat(), 'published': a.is_published}
                for a in Assignment.objects.filter(class_subject_id__in=cs_ids, due_date__gt=day, due_date__lte=day + timedelta(days=7))
                .select_related('class_subject__subject', 'class_subject__class_ref').order_by('due_date')[:20]]

    meetings = [{'id': str(m.id), 'start': m.start_time.strftime('%H:%M'), 'end': m.end_time.strftime('%H:%M'),
                 'location': m.location, 'with': (m.booked_by.full_name or m.booked_by.email) if m.booked_by_id else '',
                 'student': m.student.full_name if m.student_id else '', 'note': m.note}
                for m in MeetingSlot.objects.filter(host=request.user, date=day, booked_by__isnull=False)
                .select_related('booked_by', 'student').order_by('start_time')]

    reports = AbsenceReport.objects.filter(start_date__lte=day, end_date__gte=day).exclude(status='declined').select_related('student__current_class')
    if class_ids is not None:
        reports = reports.filter(student__current_class_id__in=class_ids)
    absence_notes = [{'id': str(r.id), 'student': r.student.full_name, 'class_name': r.student.current_class.name if r.student.current_class_id else '',
                      'kind': r.get_kind_display(), 'reason': r.get_reason_display(), 'note': r.note, 'status': r.get_status_display()}
                     for r in reports[:30]]

    fu = BehaviourIncident.objects.filter(follow_up_date__isnull=False, follow_up_date__lte=day).exclude(status='resolved').select_related('student', 'category')
    if class_ids is not None:
        fu = fu.filter(Q(reported_by=request.user) | Q(student__current_class_id__in=class_ids))
    follow_ups = [{'id': str(i.id), 'student': i.student.full_name, 'category': i.category.name if i.category_id else '',
                   'date': i.date.isoformat(), 'follow_up_date': i.follow_up_date.isoformat(), 'overdue': i.follow_up_date < day}
                  for i in fu.order_by('follow_up_date')[:20]]

    unread = 0
    for p in ConversationParticipant.objects.filter(user=request.user).select_related('conversation'):
        qs = p.conversation.messages.exclude(sender=request.user)
        unread += qs.filter(created_at__gt=p.last_read_at).count() if p.last_read_at else qs.count()

    return Response({
        'date': day.isoformat(), 'time': now.strftime('%H:%M'), 'school_day': school_day,
        'teacher': {'id': str(teacher.id), 'name': teacher.full_name} if teacher else None,
        'lessons': lessons, 'registers': registers,
        'to_mark': to_mark[:15], 'to_mark_count': len(to_mark), 'homework_to_mark': homework_to_mark,
        'due_soon': due_soon, 'meetings': meetings, 'absence_notes': absence_notes, 'follow_ups': follow_ups,
        'unread_messages': unread, 'upcoming': feed_for(request.user, day, day + timedelta(days=7))[:12],
    })


# ---------------------------------------------------------------------------
# Classes and roster
# ---------------------------------------------------------------------------

def _student_rows(cls, class_subjects, term):
    """Per student: attendance, average over the teacher's subjects, missing work, merits and incidents."""
    from services.education.behaviour.models import BehaviourIncident
    from services.education.gradebook import calc
    from services.education.gradebook.models import Assignment, Score
    from services.education.students.portal import _attendance

    day = timezone.localdate()
    start = term.start_date if term else day - timedelta(days=90)
    end = min(day, term.end_date) if term else day
    scale = calc.default_scale()
    students = _active_students(cls.id)
    subjects = [cs for cs in class_subjects if cs.class_ref_id == cls.id]
    items = {cs.id: list(Assignment.objects.filter(class_subject=cs, term=term).select_related('category')) if term else []
             for cs in subjects}
    all_items = [a for v in items.values() for a in v]
    scores = defaultdict(dict)
    for sc in Score.objects.filter(assignment__in=all_items, student__in=students):
        scores[sc.student_id][sc.assignment_id] = sc
    inc = defaultdict(lambda: {'positive': 0, 'negative': 0, 'open': 0})
    for sid, kind, status in BehaviourIncident.objects.filter(student__in=students, date__range=(start, end)).values_list('student_id', 'kind', 'status'):
        inc[sid][kind] += 1
        if kind == 'negative' and status != 'resolved':
            inc[sid]['open'] += 1
    rows = []
    for s in students:
        att = _attendance(s, start, end)
        grades, missing = [], 0
        for cs in subjects:
            mine = [a for a in items[cs.id] if not a.section_id or a.section_id == s.current_section_id]
            if not mine:
                continue
            g = calc.term_grade(s, cs, term, scale, assignments=mine, scores=scores[s.id])
            missing += g.missing
            grades.append({'subject': cs.subject.name, 'percent': float(g.percent) if g.percent is not None else None, 'letter': g.letter})
        vals = [g['percent'] for g in grades if g['percent'] is not None]
        average = round(sum(vals) / len(vals), 1) if vals else None
        b = inc[s.id]
        reasons = []
        if att['rate'] is not None and att['total'] >= 10 and att['rate'] < LOW_ATTENDANCE:
            reasons.append(f"Attendance {att['rate']}%")
        if average is not None and average < LOW_AVERAGE:
            reasons.append(f'Average {average}%')
        if missing >= MANY_MISSING:
            reasons.append(f'{missing} missing')
        if b['negative'] >= MANY_INCIDENTS:
            reasons.append(f"{b['negative']} incidents")
        rows.append({'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
                     'section': s.current_section.name if s.current_section_id else '',
                     'attendance_rate': att['rate'], 'absences': att['absent'] + att['excused'], 'late': att['late'],
                     'average': average, 'grades': grades, 'missing': missing,
                     'merits': b['positive'], 'incidents': b['negative'], 'open_incidents': b['open'],
                     'attention': reasons})
    return rows


def _class_summary(cls, rows, subjects, teacher):
    from services.education.attendance.models import AttendanceRecord

    day = timezone.localdate()
    today_rows = AttendanceRecord.objects.filter(student_id__in=[r['id'] for r in rows], date=day)
    rates = [r['attendance_rate'] for r in rows if r['attendance_rate'] is not None]
    avgs = [r['average'] for r in rows if r['average'] is not None]
    return {'id': str(cls.id), 'name': cls.name, 'grade_level': cls.grade_level,
            'homeroom': bool(teacher and cls.homeroom_teacher_id == teacher.id),
            'subjects': sorted({cs.subject.name for cs in subjects if cs.class_ref_id == cls.id}),
            'students': len(rows), 'today_marked': today_rows.count(), 'today_absent': today_rows.filter(status='absent').count(),
            'attendance_rate': round(sum(rates) / len(rates), 1) if rates else None,
            'average': round(sum(avgs) / len(avgs), 1) if avgs else None,
            'missing': sum(r['missing'] for r in rows), 'open_incidents': sum(r['open_incidents'] for r in rows),
            'attention': sum(1 for r in rows if r['attention'])}


def _classes_for(class_ids):
    qs = SchoolClass.objects.all() if class_ids is None else SchoolClass.objects.filter(id__in=class_ids)
    return list(qs.order_by('grade_level', 'name'))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classes(request):
    role, teacher, class_ids = _scope(request)
    if role not in ('teacher', 'admin'):
        return Response({'error': 'The workspace is for school staff.'}, status=403)
    term = _term()
    subjects = _my_class_subjects(teacher, class_ids)
    out = [_class_summary(c, _student_rows(c, subjects, term), subjects, teacher) for c in _classes_for(class_ids)]
    return Response({'term': {'id': str(term.id), 'name': term.name} if term else None, 'classes': out})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_detail(request, class_id):
    role, teacher, class_ids = _scope(request)
    if role not in ('teacher', 'admin') or (class_ids is not None and str(class_id) not in class_ids):
        return Response({'error': 'Class not found.'}, status=404)
    cls = SchoolClass.objects.filter(pk=class_id).first()
    if cls is None:
        return Response({'error': 'Class not found.'}, status=404)
    term = _term()
    subjects = _my_class_subjects(teacher, class_ids)
    rows = _student_rows(cls, subjects, term)
    return Response({'term': {'id': str(term.id), 'name': term.name} if term else None,
                     'class': _class_summary(cls, rows, subjects, teacher), 'students': rows,
                     'thresholds': {'attendance': LOW_ATTENDANCE, 'average': LOW_AVERAGE, 'missing': MANY_MISSING, 'incidents': MANY_INCIDENTS}})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    """Grade spread per class and subject, attendance by class, and everyone who needs attention."""
    role, teacher, class_ids = _scope(request)
    if role not in ('teacher', 'admin'):
        return Response({'error': 'The workspace is for school staff.'}, status=403)
    term = _term()
    subjects = _my_class_subjects(teacher, class_ids)
    spread, attendance, attention = [], [], []
    for cls in _classes_for(class_ids):
        rows = _student_rows(cls, subjects, term)
        if not rows:
            continue
        summary = _class_summary(cls, rows, subjects, teacher)
        attendance.append({'class_name': cls.name, 'attendance_rate': summary['attendance_rate'],
                           'absences': sum(r['absences'] for r in rows), 'late': sum(r['late'] for r in rows), 'students': len(rows)})
        by_subject = defaultdict(list)
        for r in rows:
            for g in r['grades']:
                by_subject[g['subject']].append(g)
            if r['attention']:
                attention.append({**{k: r[k] for k in ('id', 'full_name', 'attendance_rate', 'average', 'missing', 'incidents', 'attention')},
                                  'class_name': cls.name})
        for subject, grades in sorted(by_subject.items()):
            vals = [g['percent'] for g in grades if g['percent'] is not None]
            letters = Counter(g['letter'] for g in grades if g['letter'])
            spread.append({'class_name': cls.name, 'subject': subject, 'students': len(grades),
                           'average': round(sum(vals) / len(vals), 1) if vals else None,
                           'highest': max(vals) if vals else None, 'lowest': min(vals) if vals else None,
                           'letters': dict(sorted(letters.items()))})
    attention.sort(key=lambda r: (-len(r['attention']), r['full_name']))
    return Response({'term': {'id': str(term.id), 'name': term.name} if term else None,
                     'generated_at': datetime.now().isoformat(timespec='minutes'),
                     'grades': spread, 'attendance': attendance, 'attention': attention})
