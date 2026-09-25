"""School reports & analytics (mounted at ``/api/v1/auth/insights/``). Office only; every report is for one school.

Each report takes ``?from=YYYY-MM-DD&to=YYYY-MM-DD`` (default: the last 30 days) and compares with the period of the
same length just before. ``?export=csv`` downloads the report's main table.

- ``overview/``     headline numbers with the change against the previous period
- ``enrolment/``    students on roll by month, joiners and leavers, by grade and gender, and the admissions funnel
- ``attendance/``   attendance rate by month, class and weekday, lateness, and students often absent
- ``finance/``      billed vs collected by month, collection rate, what is owed and how late, by fee type, methods, expenses
- ``academics/``    term averages by class and subject, grade spread, and students who need attention
- ``teachers/``     each teacher's classes, lessons, marking and their classes' attendance and averages
"""
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractWeekDay, TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin

ATTENDED = ('present', 'late', 'early_dismissal')
WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


def _n(d):
    if d is None:
        return None
    f = float(d)
    return int(f) if f.is_integer() else round(f, 2)


def _pct(part, whole):
    return round(float(part) * 100 / float(whole), 1) if whole else None


def _period(request):
    today = timezone.localdate()
    try:
        end = date.fromisoformat(request.query_params['to']) if request.query_params.get('to') else today
        start = date.fromisoformat(request.query_params['from']) if request.query_params.get('from') else end - timedelta(days=29)
    except ValueError:
        start, end = today - timedelta(days=29), today
    if start > end:
        start, end = end, start
    length = (end - start).days + 1
    # The period before: the same number of days, ending the day before this one starts.
    return start, end, start - timedelta(days=length), start - timedelta(days=1)


def _months(end: date, count=12):
    """The first day of the last ``count`` months up to ``end``, oldest first."""
    out, y, m = [], end.year, end.month
    for _ in range(count):
        out.append(date(y, m, 1))
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return out[::-1]


def _month_end(first: date) -> date:
    return date(first.year + (first.month == 12), first.month % 12 + 1, 1) - timedelta(days=1)


def _change(now, before):
    if now is None or before is None:
        return None
    return round(float(now) - float(before), 1)


def _csv(name, header, rows):
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="{name}-{timezone.localdate().isoformat()}.csv"'
    resp.write('﻿')
    w = csv.writer(resp)
    w.writerow(header)
    for r in rows:
        w.writerow(r)
    return resp


def _office(request):
    return is_admin(request.user)


def _denied():
    return Response({'error': 'Only the office can see school reports.'}, status=403)


def _meta(start, end, pstart, pend):
    return {'from': start.isoformat(), 'to': end.isoformat(), 'previous': {'from': pstart.isoformat(), 'to': pend.isoformat()}}


# ---------------------------------------------------------------------------
# Building blocks (shared by the reports and the overview)
# ---------------------------------------------------------------------------

def attendance_counts(start, end, **filters):
    from services.education.attendance.models import AttendanceRecord

    qs = AttendanceRecord.objects.filter(date__range=(start, end), **filters).exclude(status='holiday')
    c = Counter()
    for status, excused, n in qs.values_list('status', 'is_excused').annotate(n=Count('id')):
        c['excused' if status == 'absent' and excused else status] += n
    total = sum(c.values())
    return {'records': total, 'present': c['present'], 'late': c['late'], 'absent': c['absent'], 'excused': c['excused'],
            'early_dismissal': c['early_dismissal'], 'rate': _pct(sum(c[s] for s in ATTENDED), total)}


def money_in(start, end):
    """Payments received minus refunds made, in the period."""
    from services.education.finance.models import Payment, Refund

    paid = Payment.objects.filter(payment_date__range=(start, end)).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    back = Refund.objects.filter(created_at__date__range=(start, end)).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    return paid - back


def billed(start, end):
    """What was charged in the period (this period's fees, late fees less discounts; not balances brought forward)."""
    from services.education.finance.models import Invoice

    qs = Invoice.objects.filter(issue_date__range=(start, end)).exclude(status__in=('cancelled', 'draft'))
    a = qs.aggregate(a=Sum('amount'), l=Sum('late_fee_amount'), d=Sum('discount_amount'))
    return (a['a'] or Decimal('0')) + (a['l'] or Decimal('0')) - (a['d'] or Decimal('0'))


def owed(on: date):
    """Open invoices on a day: total still owed and how late it is."""
    from services.education.finance.models import Invoice

    buckets = {'not_due': Decimal('0'), '1_30': Decimal('0'), '31_60': Decimal('0'), '61_90': Decimal('0'), 'over_90': Decimal('0')}
    for inv in Invoice.objects.exclude(status__in=('cancelled', 'carried_forward', 'draft', 'paid')).only(
            'amount', 'opening_balance', 'discount_amount', 'late_fee_amount', 'paid_amount', 'status', 'due_date'):
        bal = inv.balance_due
        if not bal:
            continue
        late = (on - inv.due_date).days
        key = 'not_due' if late <= 0 else '1_30' if late <= 30 else '31_60' if late <= 60 else '61_90' if late <= 90 else 'over_90'
        buckets[key] += bal
    total = sum(buckets.values(), Decimal('0'))
    return total, total - buckets['not_due'], buckets


def enrolment_numbers(start, end):
    from services.education.students.models import Enrollment, Student

    joined = Student.objects.filter(Q(admission_date__range=(start, end)) | Q(admission_date__isnull=True, created_at__date__range=(start, end))).count()
    left = Enrollment.objects.filter(status__in=('withdrawn', 'graduated'), end_date__range=(start, end)).values('student').distinct().count()
    return joined, left


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
    from services.education.behaviour.models import BehaviourIncident
    from services.education.students.models import Student

    if not _office(request):
        return _denied()
    start, end, pstart, pend = _period(request)
    att, patt = attendance_counts(start, end), attendance_counts(pstart, pend)
    got, pgot = money_in(start, end), money_in(pstart, pend)
    bill, pbill = billed(start, end), billed(pstart, pend)
    total_owed, overdue, _ = owed(end)
    joined, left = enrolment_numbers(start, end)
    pjoined, pleft = enrolment_numbers(pstart, pend)
    inc = BehaviourIncident.objects.filter(date__range=(start, end), kind='negative').count()
    pinc = BehaviourIncident.objects.filter(date__range=(pstart, pend), kind='negative').count()
    tiles = [
        {'key': 'students', 'label': 'Students on roll', 'value': Student.objects.filter(is_active=True).count(), 'unit': 'count',
         'note': f'{joined} joined · {left} left'},
        {'key': 'joined', 'label': 'New students', 'value': joined, 'previous': pjoined, 'change': joined - pjoined, 'unit': 'count', 'up_is_good': True},
        {'key': 'attendance', 'label': 'Attendance', 'value': att['rate'], 'previous': patt['rate'], 'change': _change(att['rate'], patt['rate']),
         'unit': 'percent', 'up_is_good': True},
        {'key': 'collected', 'label': 'Fees collected', 'value': _n(got), 'previous': _n(pgot), 'change': _n(got - pgot), 'unit': 'money', 'up_is_good': True},
        {'key': 'collection_rate', 'label': 'Collection rate', 'value': _pct(got, bill), 'previous': _pct(pgot, pbill),
         'change': _change(_pct(got, bill), _pct(pgot, pbill)), 'unit': 'percent', 'up_is_good': True, 'note': 'collected ÷ billed in the period'},
        {'key': 'overdue', 'label': 'Overdue fees', 'value': _n(overdue), 'unit': 'money', 'also': {'value': _n(total_owed), 'label': 'owed in all'}},
        {'key': 'incidents', 'label': 'Behaviour incidents', 'value': inc, 'previous': pinc, 'change': inc - pinc, 'unit': 'count', 'up_is_good': False},
    ]
    return Response({**_meta(start, end, pstart, pend), 'tiles': tiles})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enrolment(request):
    from services.education.admissions.models import Application
    from services.education.students.models import Enrollment, Student

    if not _office(request):
        return _denied()
    start, end, pstart, pend = _period(request)
    months = []
    for first in _months(end):
        last = min(_month_end(first), end)
        on_roll = Student.objects.filter(Q(admission_date__lte=last) | Q(admission_date__isnull=True, created_at__date__lte=last)).exclude(
            id__in=Enrollment.objects.filter(status__in=('withdrawn', 'graduated'), end_date__lte=last).values('student')).count()
        j, l = enrolment_numbers(first, last)
        months.append({'month': first.isoformat()[:7], 'label': first.strftime('%b %Y'), 'on_roll': on_roll, 'joined': j, 'left': l})
    active = Student.objects.filter(is_active=True)
    by_class = [{'name': r['current_class__name'] or 'No class', 'grade_level': r['current_class__grade_level'], 'students': r['n']}
                for r in active.values('current_class__name', 'current_class__grade_level').annotate(n=Count('id'))
                .order_by('current_class__grade_level', 'current_class__name')]
    gender = {(g or 'not recorded'): n for g, n in active.values_list('gender').annotate(n=Count('id'))}
    apps = Application.objects.filter(submitted_at__date__range=(start, end))
    status_counts = dict(apps.values_list('status').annotate(n=Count('id')))
    funnel = [{'stage': 'Applied', 'count': apps.count()},
              {'stage': 'Accepted', 'count': sum(status_counts.get(s, 0) for s in ('approved', 'enrolled'))},
              {'stage': 'Enrolled', 'count': status_counts.get('enrolled', 0)}]
    joined, left = enrolment_numbers(start, end)
    if request.query_params.get('export') == 'csv':
        return _csv('enrolment', ['Month', 'On roll', 'Joined', 'Left'], [[m['label'], m['on_roll'], m['joined'], m['left']] for m in months])
    return Response({**_meta(start, end, pstart, pend), 'on_roll': active.count(), 'joined': joined, 'left': left,
                     'months': months, 'by_class': by_class, 'gender': gender, 'funnel': funnel,
                     'applications_by_status': status_counts,
                     'conversion': _pct(funnel[2]['count'], funnel[0]['count'])})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance(request):
    from services.education.attendance.models import AttendanceRecord

    if not _office(request):
        return _denied()
    start, end, pstart, pend = _period(request)
    now, before = attendance_counts(start, end), attendance_counts(pstart, pend)
    months = []
    for first in _months(end, 6):
        c = attendance_counts(first, min(_month_end(first), end))
        months.append({'month': first.isoformat()[:7], 'label': first.strftime('%b %Y'), 'rate': c['rate'], 'records': c['records']})
    qs = AttendanceRecord.objects.filter(date__range=(start, end)).exclude(status='holiday')
    per_class = defaultdict(Counter)
    for cname, status, n in qs.values_list('student__current_class__name', 'status').annotate(n=Count('id')):
        per_class[cname or 'No class'][status] += n
    by_class = sorted(({'name': k, 'rate': _pct(sum(v[s] for s in ATTENDED), sum(v.values())), 'records': sum(v.values()),
                        'absent': v['absent'], 'late': v['late']} for k, v in per_class.items()), key=lambda r: (r['rate'] is None, r['rate'] or 0))
    per_day = defaultdict(Counter)
    for wd, status, n in qs.annotate(wd=ExtractWeekDay('date')).values_list('wd', 'status').annotate(n=Count('id')):
        per_day[wd][status] += n
    by_weekday = [{'day': WEEKDAYS[wd - 1], 'rate': _pct(sum(v[s] for s in ATTENDED), sum(v.values())), 'absent': v['absent']}
                  for wd, v in sorted(per_day.items(), key=lambda kv: (kv[0] + 5) % 7)]
    per_student = defaultdict(Counter)
    names = {}
    for sid, name, cname, status, n in qs.values_list('student_id', 'student__full_name', 'student__current_class__name', 'status').annotate(n=Count('id')):
        per_student[sid][status] += n
        names[sid] = (name, cname or '')
    often = []
    for sid, v in per_student.items():
        total = sum(v.values())
        rate = _pct(sum(v[s] for s in ATTENDED), total)
        if total >= 10 and rate is not None and rate < 90:
            often.append({'id': str(sid), 'name': names[sid][0], 'class_name': names[sid][1], 'rate': rate, 'absent': v['absent'], 'late': v['late'], 'days': total})
    often.sort(key=lambda r: r['rate'])
    if request.query_params.get('export') == 'csv':
        return _csv('attendance-often-absent', ['Student', 'Class', 'Attendance %', 'Absent', 'Late', 'Days recorded'],
                    [[r['name'], r['class_name'], r['rate'], r['absent'], r['late'], r['days']] for r in often])
    return Response({**_meta(start, end, pstart, pend), 'summary': now, 'previous': before, 'change': _change(now['rate'], before['rate']),
                     'months': months, 'by_class': by_class, 'by_weekday': by_weekday, 'often_absent': often[:50],
                     'often_absent_count': len(often)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance(request):
    from services.education.finance.models import Invoice, LedgerEntry, Payment

    if not _office(request):
        return _denied()
    start, end, pstart, pend = _period(request)
    months = []
    for first in _months(end):
        last = min(_month_end(first), end)
        b, g = billed(first, last), money_in(first, last)
        months.append({'month': first.isoformat()[:7], 'label': first.strftime('%b %Y'), 'billed': _n(b), 'collected': _n(g), 'rate': _pct(g, b)})
    total_owed, overdue, buckets = owed(end)
    by_type = []
    for t, label in Invoice.INVOICE_TYPE_CHOICES:
        qs = Invoice.objects.filter(issue_date__range=(start, end), invoice_type=t).exclude(status__in=('cancelled', 'draft'))
        a = qs.aggregate(a=Sum('amount'), l=Sum('late_fee_amount'), d=Sum('discount_amount'), p=Sum('paid_amount'))
        b = (a['a'] or 0) + (a['l'] or 0) - (a['d'] or 0)
        if b:
            by_type.append({'type': t, 'label': label, 'billed': _n(b), 'paid': _n(a['p'] or 0)})
    methods = [{'method': dict(Payment.PAYMENT_METHODS).get(m, m), 'amount': _n(s)}
               for m, s in Payment.objects.filter(payment_date__range=(start, end)).values_list('payment_method').annotate(s=Sum('amount')).order_by('-s')]
    debtors = defaultdict(lambda: {'owed': Decimal('0'), 'invoices': 0})
    for inv in Invoice.objects.exclude(status__in=('cancelled', 'carried_forward', 'draft', 'paid')).select_related('student__current_class'):
        if inv.balance_due and inv.due_date < end:
            d = debtors[inv.student_id]
            d['owed'] += inv.balance_due
            d['invoices'] += 1
            d['name'], d['class_name'] = inv.student.full_name, inv.student.current_class.name if inv.student.current_class_id else ''
    top = sorted(({'id': str(k), **{**v, 'owed': _n(v['owed'])}} for k, v in debtors.items()), key=lambda r: -r['owed'])[:15]
    exp = LedgerEntry.objects.filter(type='expense', date__range=(start, end)).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    inc = LedgerEntry.objects.filter(type='income', date__range=(start, end)).aggregate(s=Sum('amount'))['s'] or Decimal('0')
    got, bill = money_in(start, end), billed(start, end)
    if request.query_params.get('export') == 'csv':
        return _csv('finance-by-month', ['Month', 'Billed', 'Collected', 'Collection %'], [[m['label'], m['billed'], m['collected'], m['rate']] for m in months])
    return Response({**_meta(start, end, pstart, pend), 'billed': _n(bill), 'collected': _n(got), 'collection_rate': _pct(got, bill),
                     'previous': {'billed': _n(billed(pstart, pend)), 'collected': _n(money_in(pstart, pend))},
                     'owed': _n(total_owed), 'overdue': _n(overdue), 'ageing': {k: _n(v) for k, v in buckets.items()},
                     'months': months, 'by_type': by_type, 'methods': methods, 'top_owed': top,
                     'ledger': {'income': _n(inc), 'expenses': _n(exp), 'fees_collected': _n(got), 'net': _n(got + inc - exp)}})


def _class_rows(term):
    from services.education.academics.models import SchoolClass
    from services.education.academics.workspace import _my_class_subjects, _student_rows

    subjects = _my_class_subjects(None, None)
    return [(c, _student_rows(c, subjects, term)) for c in SchoolClass.objects.order_by('grade_level', 'name')]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def academics(request):
    from services.education.students.portal import _current_term

    if not _office(request):
        return _denied()
    term = _current_term()
    classes, subjects, letters, attention = [], defaultdict(list), Counter(), []
    for cls, rows in _class_rows(term):
        if not rows:
            continue
        avgs = [r['average'] for r in rows if r['average'] is not None]
        classes.append({'name': cls.name, 'students': len(rows), 'average': round(sum(avgs) / len(avgs), 1) if avgs else None,
                        'missing': sum(r['missing'] for r in rows), 'attention': sum(1 for r in rows if r['attention'])})
        for r in rows:
            for g in r['grades']:
                if g['percent'] is not None:
                    subjects[g['subject']].append(g['percent'])
                if g['letter']:
                    letters[g['letter']] += 1
            if r['attention']:
                attention.append({'id': r['id'], 'name': r['full_name'], 'class_name': cls.name, 'reasons': r['attention']})
    by_subject = sorted(({'subject': k, 'average': round(sum(v) / len(v), 1), 'grades': len(v)} for k, v in subjects.items()), key=lambda r: r['average'])
    if request.query_params.get('export') == 'csv':
        return _csv('academics-by-class', ['Class', 'Students', 'Average %', 'Missing work', 'Need attention'],
                    [[c['name'], c['students'], c['average'], c['missing'], c['attention']] for c in classes])
    return Response({'term': {'id': str(term.id), 'name': term.name} if term else None, 'by_class': classes, 'by_subject': by_subject,
                     'letters': dict(sorted(letters.items())), 'attention': attention[:100], 'attention_count': len(attention)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teachers(request):
    from services.education.academics.models import Teacher, TeacherSubjectAssignment, TimetableEntry
    from services.education.behaviour.models import BehaviourIncident
    from services.education.gradebook.models import Assignment, Score
    from services.education.students.models import Student

    if not _office(request):
        return _denied()
    start, end, pstart, pend = _period(request)
    from django.contrib.auth import get_user_model

    users = {u.email.lower(): u for u in get_user_model().objects.filter(email__in=list(Teacher.objects.values_list('email', flat=True))) if u.email}
    rows = []
    for t in Teacher.objects.all().order_by('full_name'):
        cs_ids = set(TeacherSubjectAssignment.objects.filter(teacher=t).values_list('class_subject_id', flat=True))
        cs_ids |= set(TimetableEntry.objects.filter(teacher=t, is_active=True).values_list('class_subject_id', flat=True))
        class_ids = set(TimetableEntry.objects.filter(teacher=t, is_active=True).values_list('class_subject__class_ref_id', flat=True))
        class_ids |= set(TeacherSubjectAssignment.objects.filter(teacher=t).values_list('class_subject__class_ref_id', flat=True))
        students = Student.objects.filter(current_class_id__in=class_ids, is_active=True).count()
        work = list(Assignment.objects.filter(class_subject_id__in=cs_ids, due_date__range=(start, end)).select_related('class_subject'))
        expected = marked = 0
        for a in work:
            n = Student.objects.filter(current_class_id=a.class_subject.class_ref_id, is_active=True).count()
            expected += n
            marked += Score.objects.filter(assignment=a).filter(Q(points__isnull=False) | Q(status__in=('missing', 'excused'))).count()
        att = attendance_counts(start, end, student__current_class_id__in=class_ids) if class_ids else {'rate': None}
        u = users.get((t.email or '').lower())
        rows.append({'id': str(t.id), 'name': t.full_name, 'classes': len(class_ids), 'students': students,
                     'lessons_per_week': TimetableEntry.objects.filter(teacher=t, is_active=True).count(),
                     'assignments': len(work), 'marked_percent': _pct(marked, expected),
                     'behaviour_logged': BehaviourIncident.objects.filter(reported_by=u, date__range=(start, end)).count() if u else 0,
                     'class_attendance': att['rate']})
    if request.query_params.get('export') == 'csv':
        return _csv('teachers', ['Teacher', 'Classes', 'Students', 'Lessons a week', 'Work due in period', 'Marked %', 'Behaviour logged', 'Class attendance %'],
                    [[r['name'], r['classes'], r['students'], r['lessons_per_week'], r['assignments'], r['marked_percent'], r['behaviour_logged'], r['class_attendance']] for r in rows])
    return Response({**_meta(start, end, pstart, pend), 'teachers': rows})
