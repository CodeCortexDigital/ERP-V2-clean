"""Global search (``/api/v1/search/?q=``): one box for the whole school, limited to what the signed-in person may see.

- The office: students, parents & guardians, staff, classes, invoices, applications, library books, transport routes
  and vehicles, inventory items and suppliers.
- Teachers: the students and classes they teach, and library books.
- Parents and students: their own children (or themselves) and library books.

Results come grouped by type (``groups``), best match first (exact, then starts with, then contains). Each result has
the address in the app that opens it (``url``). ``?type=<group>&limit=50`` returns more of one group.
"""
from __future__ import annotations

from urllib.parse import quote

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import _get_teacher_class_ids, filter_students_for_user, get_user_role

GROUP_LABELS = {
    'students': 'Students', 'guardians': 'Parents & guardians', 'staff': 'Staff', 'classes': 'Classes',
    'invoices': 'Invoices', 'applications': 'Applications', 'books': 'Library books', 'transport': 'Transport',
    'inventory': 'Inventory',
}


def _rank(q: str, *texts) -> int:
    """3 exact, 2 starts with, 1 contains (the best of the given fields)."""
    q = q.lower()
    best = 0
    for t in texts:
        t = (t or '').lower()
        if not t:
            continue
        best = max(best, 3 if t == q else 2 if t.startswith(q) or f' {q}' in f' {t}' else 1 if q in t else 0)
    return best


def _row(type_, id_, title, subtitle, url, rank):
    return {'type': type_, 'id': str(id_), 'title': title, 'subtitle': subtitle, 'url': url, 'rank': rank}


# ---------------------------------------------------------------------------
# One finder per group
# ---------------------------------------------------------------------------

def _students(q, user, role, cap):
    from services.education.students.models import Student

    base = Student.objects.filter(is_active=True)
    if role == 'teacher':
        base = base.filter(current_class_id__in=_get_teacher_class_ids(user))
    elif role in ('parent', 'student'):
        base = filter_students_for_user(user, base)
    elif role != 'admin':
        return []
    qs = base.filter(Q(full_name__icontains=q) | Q(student_id__icontains=q) | Q(email__icontains=q)
                     | (Q(phone__icontains=q) | Q(father_name__icontains=q) if role == 'admin' else Q(pk__in=[])))
    out = []
    for s in qs.select_related('current_class')[:cap]:
        url = '/parent/children' if role == 'parent' else '/student/profile' if role == 'student' else f'/education/students/{s.id}'
        out.append(_row('student', s.id, s.full_name, ' · '.join(x for x in (s.current_class.name if s.current_class_id else '', s.student_id) if x),
                        url, _rank(q, s.full_name, s.student_id, s.email)))
    return out


def _guardians(q, cap):
    from services.education.students.models import Guardian

    qs = Guardian.objects.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
                                 | Q(mobile_phone__icontains=q) | Q(national_id__icontains=q))
    if ' ' in q:
        first, _, last = q.partition(' ')
        qs = qs | Guardian.objects.filter(first_name__icontains=first, last_name__icontains=last)
    out = []
    for g in qs.distinct().prefetch_related('student_links__student')[:cap]:
        kids = [l.student for l in g.student_links.all()]
        url = f'/education/students/{kids[0].id}?tab=family' if kids else '/education/students/families'
        out.append(_row('guardian', g.id, g.full_name, ' · '.join(x for x in (g.get_relationship_display(), ', '.join(k.full_name for k in kids[:3]), g.mobile_phone) if x),
                        url, _rank(q, g.full_name, g.email, g.mobile_phone)))
    return out


def _staff(q, cap):
    from services.education.academics.models import Teacher

    qs = Teacher.objects.filter(Q(full_name__icontains=q) | Q(employee_id__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
    return [_row('staff', t.id, t.full_name, ' · '.join(x for x in (t.employee_id, t.email) if x), f'/education/teachers/{t.id}',
                 _rank(q, t.full_name, t.employee_id, t.email)) for t in qs[:cap]]


def _classes(q, user, role, cap):
    from services.education.academics.models import SchoolClass

    qs = SchoolClass.objects.filter(Q(name__icontains=q) | Q(code__icontains=q))
    if role == 'teacher':
        qs = qs.filter(id__in=_get_teacher_class_ids(user))
    elif role != 'admin':
        return []
    return [_row('class', c.id, c.name, c.code or '', f'/teacher/classes/{c.id}', _rank(q, c.name, c.code)) for c in qs[:cap]]


def _invoices(q, cap):
    from services.education.finance.models import Invoice

    qs = Invoice.objects.filter(Q(invoice_number__icontains=q) | Q(student__full_name__icontains=q)).exclude(status='cancelled') \
        .select_related('student').order_by('-issue_date')
    return [_row('invoice', i.id, i.invoice_number, f'{i.student.full_name} · {i.get_status_display()} · due {i.due_date:%d %b %Y}',
                 f'/education/fees/invoices?q={quote(i.invoice_number)}', _rank(q, i.invoice_number) + 1) for i in qs[:cap]]


def _applications(q, cap):
    from services.education.admissions.models import Application

    qs = Application.objects.filter(Q(application_no__icontains=q) | Q(applicant__full_name__icontains=q) | Q(applicant__email__icontains=q))
    school = None
    try:
        from services.core.tenants.context import get_current_tenant
        school = get_current_tenant()
    except Exception:
        pass
    if school is not None:
        qs = qs.filter(applicant__tenant=school)
    return [_row('application', a.id, f'{a.applicant.full_name}', f'{a.application_no} · {a.get_status_display()} · {a.applicant.applying_for_class}',
                 f'/education/admissions?open={a.id}', _rank(q, a.applicant.full_name, a.application_no))
            for a in qs.select_related('applicant').order_by('-submitted_at')[:cap]]


def _books(q, role, cap):
    from services.education.library.models import Book

    qs = Book.objects.filter(Q(title__icontains=q) | Q(authors__icontains=q) | Q(isbn__icontains=q.replace('-', '')) | Q(copies__barcode__iexact=q)).distinct()
    base = {'admin': '/education/library/catalogue', 'teacher': '/library', 'parent': '/parent/library', 'student': '/student/library'}.get(role)
    if base is None:
        return []
    return [_row('book', b.id, b.title, ' · '.join(x for x in (b.authors, b.subject, b.call_number) if x), f'{base}?q={quote(b.title)}',
                 _rank(q, b.title, b.authors, b.isbn)) for b in qs[:cap]]


def _transport(q, cap):
    from services.education.transport.models import Route, Vehicle

    out = [_row('route', r.id, r.name, 'Transport route', '/education/transport/routes', _rank(q, r.name, r.code))
           for r in Route.objects.filter(Q(name__icontains=q) | Q(code__icontains=q))[:cap]]
    out += [_row('vehicle', v.id, v.name, f'{v.registration_no} · {v.capacity} seats', '/education/transport/fleet', _rank(q, v.name, v.registration_no))
            for v in Vehicle.objects.filter(Q(name__icontains=q) | Q(registration_no__icontains=q))[:cap]]
    return out


def _inventory(q, cap):
    from services.education.inventory.models import Item, Supplier

    out = [_row('item', i.id, i.name, f'{i.sku} · {float(i.quantity):g} {i.get_unit_display().lower()} in stock', f'/education/inventory?q={quote(i.sku)}',
                _rank(q, i.name, i.sku)) for i in Item.objects.filter(Q(name__icontains=q) | Q(sku__icontains=q))[:cap]]
    out += [_row('supplier', s.id, s.name, 'Supplier', '/education/inventory/suppliers', _rank(q, s.name))
            for s in Supplier.objects.filter(name__icontains=q)[:cap]]
    return out


def _groups_for(role):
    if role == 'admin':
        return ['students', 'guardians', 'staff', 'classes', 'invoices', 'applications', 'books', 'transport', 'inventory']
    if role == 'teacher':
        return ['students', 'classes', 'books']
    if role in ('parent', 'student'):
        return ['students', 'books']
    return []


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search(request):
    q = (request.query_params.get('q') or '').strip()[:100]
    role = get_user_role(request.user)
    only = request.query_params.get('type')
    try:
        limit = max(1, min(int(request.query_params.get('limit') or (50 if only else 5)), 50))
    except ValueError:
        limit = 5
    if len(q) < 2:
        return Response({'query': q, 'groups': [], 'total': 0})
    cap = 60  # read a little more than we show, so the best matches can be ranked to the top
    finders = {
        'students': lambda: _students(q, request.user, role, cap),
        'guardians': lambda: _guardians(q, cap),
        'staff': lambda: _staff(q, cap),
        'classes': lambda: _classes(q, request.user, role, cap),
        'invoices': lambda: _invoices(q, cap),
        'applications': lambda: _applications(q, cap),
        'books': lambda: _books(q, role, cap),
        'transport': lambda: _transport(q, cap),
        'inventory': lambda: _inventory(q, cap),
    }
    groups = []
    for key in _groups_for(role):
        if only and key != only:
            continue
        rows = sorted(finders[key](), key=lambda r: (-r['rank'], r['title'].lower()))
        if rows:
            groups.append({'type': key, 'label': GROUP_LABELS[key], 'count': len(rows), 'more': len(rows) > limit,
                           'results': [{k: v for k, v in r.items() if k != 'rank'} for r in rows[:limit]]})
    # The group with the best match goes first.
    best = {g['type']: max((_rank(q, r['title']) for r in g['results']), default=0) for g in groups}
    groups.sort(key=lambda g: (-best[g['type']], _groups_for(role).index(g['type'])))
    return Response({'query': q, 'groups': groups, 'total': sum(g['count'] for g in groups)})
