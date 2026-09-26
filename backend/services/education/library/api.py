"""Library API (mounted at ``/api/v1/auth/library/``).

The office runs the library desk (catalogue, members, issue / return, fines, reports). Everyone in the school can
search the catalogue; students, parents (for their children) and staff reserve books and see their own loans.
"""
from __future__ import annotations

import re
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import ensure_student_access, filter_students_for_user, get_user_role, is_admin

from .models import Book, BookCopy, LibrarySettings, Loan, Member, Reservation

BOOK_FIELDS = ('title', 'subtitle', 'authors', 'isbn', 'publisher', 'year', 'edition', 'subject', 'language',
               'reading_level', 'call_number', 'description', 'cover_url')
SETTINGS_FIELDS = ('loan_days_student', 'loan_days_staff', 'max_loans_student', 'max_loans_staff', 'max_renewals',
                   'hold_days', 'fine_per_day', 'block_when_overdue')


def _err(msg, code=400):
    return Response({'error': msg}, status=code)


def _school(request):
    return getattr(request, 'tenant', None)


def settings_for(school) -> LibrarySettings:
    if school is None:
        return LibrarySettings()
    obj, _ = LibrarySettings.all_objects.get_or_create(tenant=school)
    return obj


def _today():
    return timezone.localdate()


def _next_code(model, field, prefix, school, width=6):
    """Next free code such as LIB-000042 within one school."""
    values = model.all_objects.filter(tenant=school, **{f'{field}__startswith': prefix}).values_list(field, flat=True)
    nums = [int(m.group(1)) for v in values if (m := re.match(rf'^{re.escape(prefix)}(\d+)$', v))]
    return f'{prefix}{str((max(nums) if nums else 0) + 1).zfill(width)}'


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

def member_for_student(student) -> Member:
    m = Member.all_objects.filter(student=student).first()
    if m is None:
        school = student.tenant
        m = Member.all_objects.create(tenant=school, kind='student', student=student, name=student.full_name,
                                      card_number=_next_code(Member, 'card_number', 'C-', school))
    return m


def member_for_user(user, school) -> Member:
    m = Member.all_objects.filter(tenant=school, kind='staff', user=user).first()
    if m is None:
        m = Member.all_objects.create(tenant=school, kind='staff', user=user, name=user.full_name or user.email,
                                      card_number=_next_code(Member, 'card_number', 'C-', school))
    return m


def _is_overdue(loan, today=None):
    return loan.returned_at is None and loan.due_date < (today or _today())


def _limits(member, cfg):
    staff = member.kind == 'staff'
    return (cfg.loan_days_staff if staff else cfg.loan_days_student), (cfg.max_loans_staff if staff else cfg.max_loans_student)


def _member_brief(m: Member, today=None) -> dict:
    today = today or _today()
    open_loans = list(m.loans.filter(returned_at__isnull=True))
    fines = sum((l.fine_amount for l in m.loans.filter(fine_status='due')), Decimal('0'))
    extra = {}
    if m.student_id:
        s = m.student
        extra = {'student_id': str(s.id), 'student_number': s.student_id,
                 'detail': s.current_class.name if s.current_class_id else ''}
    else:
        extra = {'detail': 'Staff', 'email': m.user.email if m.user_id else ''}
    return {'id': str(m.id), 'kind': m.kind, 'name': m.name, 'card_number': m.card_number, 'is_blocked': m.is_blocked,
            'blocked_reason': m.blocked_reason, 'loans_out': len(open_loans),
            'overdue': sum(1 for l in open_loans if l.due_date < today), 'fines_due': float(fines), **extra}


def _loan_payload(l: Loan, today=None) -> dict:
    today = today or _today()
    days_over = (today - l.due_date).days if l.returned_at is None and l.due_date < today else 0
    return {'id': str(l.id), 'book_id': str(l.copy.book_id), 'title': l.copy.book.title, 'authors': l.copy.book.authors,
            'barcode': l.copy.barcode, 'member': {'id': str(l.member_id), 'name': l.member.name, 'kind': l.member.kind,
                                                  'card_number': l.member.card_number},
            'issued_at': l.issued_at.isoformat(), 'due_date': l.due_date.isoformat(),
            'returned_at': l.returned_at.isoformat() if l.returned_at else None, 'renewals': l.renewals,
            'overdue': l.returned_at is None and l.due_date < today, 'days_overdue': days_over,
            'fine_amount': float(l.fine_amount), 'fine_status': l.fine_status, 'notes': l.notes}


def _reservation_payload(r: Reservation) -> dict:
    ahead = 0
    if r.status == 'waiting':
        ahead = Reservation.objects.filter(book_id=r.book_id, status='waiting', created_at__lt=r.created_at).count()
    return {'id': str(r.id), 'book_id': str(r.book_id), 'title': r.book.title, 'authors': r.book.authors,
            'member': {'id': str(r.member_id), 'name': r.member.name}, 'status': r.status,
            'status_label': r.get_status_display(), 'position': ahead + 1 if r.status == 'waiting' else None,
            'hold_until': r.hold_until.isoformat() if r.hold_until else None,
            'barcode': r.copy.barcode if r.copy_id else None, 'created_at': r.created_at.isoformat()}


def _tell(member: Member, title: str, message: str):
    """Portal notice and email to the member (for a student: the student and their parents)."""
    from services.core.user_notifications.utils import create_user_notification

    emails, users = set(), []
    if member.student_id:
        from services.education.attendance.register import _recipients

        from services.core.user_notifications.utils import get_user_by_email

        e, u = _recipients(member.student)
        emails |= set(e)
        users = list(u)
        own = get_user_by_email(member.student.email)  # the borrower too, not only the family
        if own and own not in users:
            users.append(own)
    elif member.user_id:
        users = [member.user]
        if member.user.email:
            emails.add(member.user.email)
    for u in users:
        create_user_notification(u, title, message, 'system')
    if emails:
        try:
            send_mail(title, message, None, sorted(emails), fail_silently=True)
        except Exception:  # email is best effort
            pass


def _find_member(request, member_id=None, student_id=None):
    """The member a request acts for: the office picks anyone; a student is themself; a parent picks a child;
    staff are themselves."""
    from services.education.students.models import Student

    role = get_user_role(request.user)
    school = _school(request)
    if is_admin(request.user) and member_id:
        return Member.objects.filter(pk=member_id).first()
    if student_id:
        s = Student.objects.filter(pk=student_id).first()
        if s and ensure_student_access(request.user, s) and role in ('parent', 'student', 'admin'):
            return member_for_student(s)
        return None
    if role == 'student':
        s = filter_students_for_user(request.user, Student.objects.filter(is_active=True)).first()
        return member_for_student(s) if s else None
    if role in ('teacher', 'admin') and school is not None:
        return member_for_user(request.user, school)
    return None


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def library_settings(request):
    cfg = settings_for(_school(request))
    if request.method == 'PATCH':
        if not is_admin(request.user):
            return _err('Only the office can change library rules.', 403)
        for f in SETTINGS_FIELDS:
            if f not in request.data:
                continue
            v = request.data[f]
            try:
                if f == 'fine_per_day':
                    v = max(Decimal(str(v or 0)), Decimal('0'))
                elif f == 'block_when_overdue':
                    v = str(v).lower() in ('1', 'true', 'yes', 'on')
                else:
                    v = max(int(v), 0 if f == 'max_renewals' else 1)
            except (ValueError, InvalidOperation):
                return _err(f'{f.replace("_", " ").capitalize()} must be a number.')
            setattr(cfg, f, v)
        cfg.save()
    return Response({f: (float(getattr(cfg, f)) if f == 'fine_per_day' else getattr(cfg, f)) for f in SETTINGS_FIELDS})


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------

def _book_payload(b: Book, staff=False, counts=None) -> dict:
    counts = counts or {}
    out = {f: getattr(b, f) for f in BOOK_FIELDS}
    out.update({'id': str(b.id), 'copies': counts.get('copies', 0), 'available': counts.get('available', 0),
                'on_loan': counts.get('on_loan', 0), 'waiting': counts.get('waiting', 0)})
    return out


def _counts_for(books) -> dict:
    ids = [b.id for b in books]
    out = {i: {'copies': 0, 'available': 0, 'on_loan': 0, 'waiting': 0} for i in ids}
    for book_id, status, n in (BookCopy.objects.filter(book_id__in=ids).exclude(status='withdrawn')
                               .values_list('book_id', 'status').annotate(n=Count('id'))):
        out[book_id]['copies'] += n
        if status in ('available', 'on_loan'):
            out[book_id][status] += n
    for book_id, n in (Reservation.objects.filter(book_id__in=ids, status='waiting')
                       .values_list('book_id').annotate(n=Count('id'))):
        out[book_id]['waiting'] = n
    return out


def _clean_book(data, book=None) -> tuple[dict, str | None]:
    vals = {}
    for f in BOOK_FIELDS:
        if f not in data:
            continue
        v = data[f]
        if f == 'year':
            v = int(v) if str(v or '').strip().isdigit() else None
        else:
            v = str(v or '').strip()[:300 if f in ('title', 'subtitle', 'authors') else 2000]
        if f == 'isbn':
            v = re.sub(r'[^0-9Xx]', '', v).upper()
        vals[f] = v
    title = vals.get('title', book.title if book else '')
    if not title:
        return vals, 'A book needs a title.'
    return vals, None


def _add_copies(book, n, school, location='', condition='good', price=None, acquired_on=None):
    made = []
    for _ in range(max(0, min(int(n or 0), 200))):
        for _attempt in range(5):
            try:
                with transaction.atomic():
                    made.append(BookCopy.all_objects.create(
                        tenant=school, book=book, barcode=_next_code(BookCopy, 'barcode', 'LIB-', school),
                        location=location, condition=condition, price=price, acquired_on=acquired_on))
                break
            except IntegrityError:
                continue
    return made


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def books(request):
    staff = is_admin(request.user)
    if request.method == 'POST':
        if not staff:
            return _err('Only the office can add books.', 403)
        vals, error = _clean_book(request.data)
        if error:
            return _err(error)
        school = _school(request)
        b = Book.objects.create(tenant=school, **vals)
        _add_copies(b, request.data.get('copies', 1), school, location=str(request.data.get('location') or '')[:100])
        return Response(_book_payload(b, staff, _counts_for([b])[b.id]), status=201)

    qs = Book.objects.all()
    q = (request.query_params.get('q') or '').strip()
    if q:
        digits = re.sub(r'[^0-9Xx]', '', q)
        match = Q(title__icontains=q) | Q(authors__icontains=q) | Q(subject__icontains=q) | Q(call_number__icontains=q)
        if len(digits) >= 10:
            match |= Q(isbn=digits.upper())
        match |= Q(copies__barcode__iexact=q)
        qs = qs.filter(match).distinct()
    if request.query_params.get('subject'):
        qs = qs.filter(subject__iexact=request.query_params['subject'])
    rows = list(qs[:300])
    counts = _counts_for(rows)
    items = [_book_payload(b, staff, counts[b.id]) for b in rows]
    if request.query_params.get('available') in ('1', 'true'):
        items = [i for i in items if i['available']]
    subjects = sorted({s for s in Book.objects.exclude(subject='').values_list('subject', flat=True)})
    return Response({'results': items, 'subjects': subjects, 'can_manage': staff})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def book_detail(request, book_id):
    b = get_object_or_404(Book, pk=book_id)
    staff = is_admin(request.user)
    if request.method == 'PATCH':
        if not staff:
            return _err('Only the office can change books.', 403)
        vals, error = _clean_book(request.data, b)
        if error:
            return _err(error)
        for k, v in vals.items():
            setattr(b, k, v)
        b.save()
    elif request.method == 'DELETE':
        if not staff:
            return _err('Only the office can remove books.', 403)
        if Loan.objects.filter(copy__book=b).exists():
            return _err('This book has been borrowed before, so it stays in the records. Withdraw its copies instead.')
        b.delete()
        return Response(status=204)
    out = _book_payload(b, staff, _counts_for([b])[b.id])
    today = _today()
    if staff:
        open_loans = {l.copy_id: l for l in Loan.objects.filter(copy__book=b, returned_at__isnull=True).select_related('member')}
        out['copy_list'] = [{'id': str(c.id), 'barcode': c.barcode, 'status': c.status, 'status_label': c.get_status_display(),
                             'condition': c.condition, 'location': c.location, 'notes': c.notes,
                             'price': float(c.price) if c.price is not None else None,
                             'borrower': open_loans[c.id].member.name if c.id in open_loans else None,
                             'due_date': open_loans[c.id].due_date.isoformat() if c.id in open_loans else None,
                             'overdue': c.id in open_loans and open_loans[c.id].due_date < today}
                            for c in b.copies.all()]
        out['queue'] = [_reservation_payload(r) for r in b.reservations.filter(status__in=('waiting', 'ready')).select_related('member', 'copy', 'book')]
        out['times_borrowed'] = Loan.objects.filter(copy__book=b).count()
    else:
        nxt = Loan.objects.filter(copy__book=b, returned_at__isnull=True).order_by('due_date').first()
        out['next_due_back'] = nxt.due_date.isoformat() if nxt and not out['available'] else None
    return Response(out)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_copies(request, book_id):
    if not is_admin(request.user):
        return _err('Only the office can add copies.', 403)
    b = get_object_or_404(Book, pk=book_id)
    try:
        price = Decimal(str(request.data['price'])) if request.data.get('price') not in (None, '') else None
    except InvalidOperation:
        return _err('Price must be a number.')
    made = _add_copies(b, request.data.get('count', 1), _school(request) or b.tenant,
                       location=str(request.data.get('location') or '')[:100],
                       condition=request.data.get('condition') if request.data.get('condition') in dict(BookCopy.CONDITIONS) else 'good',
                       price=price, acquired_on=request.data.get('acquired_on') or None)
    _serve_waiting(b)
    return Response({'barcodes': [c.barcode for c in made]}, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def copy_detail(request, copy_id):
    if not is_admin(request.user):
        return _err('Only the office can change copies.', 403)
    c = get_object_or_404(BookCopy, pk=copy_id)
    status = request.data.get('status')
    if status:
        if status not in ('available', 'lost', 'damaged', 'withdrawn'):
            return _err('Choose a valid status.')
        if c.status == 'on_loan':
            return _err('This copy is on loan. Return it (or mark the loan lost) first.')
        if c.status == 'on_hold' and status != 'available':
            Reservation.objects.filter(copy=c, status='ready').update(status='waiting', copy=None, hold_until=None, ready_at=None)
        c.status = status
    for f in ('location', 'notes'):
        if f in request.data:
            setattr(c, f, str(request.data[f] or '')[:255])
    if request.data.get('condition') in dict(BookCopy.CONDITIONS):
        c.condition = request.data['condition']
    c.save()
    if c.status == 'available':
        _serve_waiting(c.book)
    return Response({'id': str(c.id), 'barcode': c.barcode, 'status': c.status, 'status_label': c.get_status_display(),
                     'condition': c.condition, 'location': c.location, 'notes': c.notes})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def labels(request):
    """Printable labels: copies (?book=<id> or ?copies=a,b) or library cards (?members=a,b), each with a QR code."""
    if not is_admin(request.user):
        return _err('Only the office can print labels.', 403)
    try:
        import segno
    except ImportError:  # QR codes are optional; the barcode is drawn in the browser
        segno = None

    def qr(text):
        return segno.make(text, error='m').svg_inline(scale=3, border=1) if segno else ''

    out = []
    if request.query_params.get('members'):
        ids = [x for x in request.query_params['members'].split(',') if x]
        for m in Member.objects.filter(id__in=ids).select_related('student__current_class'):
            out.append({'code': m.card_number, 'title': m.name,
                        'detail': (m.student.current_class.name if m.student_id and m.student.current_class_id else m.get_kind_display()),
                        'qr': qr(m.card_number)})
    else:
        qs = BookCopy.objects.select_related('book')
        if request.query_params.get('book'):
            qs = qs.filter(book_id=request.query_params['book'])
        elif request.query_params.get('copies'):
            qs = qs.filter(id__in=[x for x in request.query_params['copies'].split(',') if x])
        else:
            qs = qs.none()
        for c in qs.exclude(status='withdrawn'):
            out.append({'code': c.barcode, 'title': c.book.title, 'detail': c.book.call_number or c.book.authors, 'qr': qr(c.barcode)})
    return Response({'labels': out, 'qr': segno is not None})


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def members(request):
    """GET ?q= : students and staff who match (with their card if they have one). POST {kind, ref_id}: make a card."""
    from django.contrib.auth import get_user_model

    from services.education.academics.models import Teacher
    from services.education.students.models import Student

    if not is_admin(request.user):
        return _err('Only the office can look up members.', 403)
    school = _school(request)
    User = get_user_model()
    if request.method == 'POST':
        group = request.data.get('group')
        if group:  # cards for many people at once: a class, all students, or all staff
            made = 0
            if group in ('class', 'students'):
                qs = Student.objects.filter(is_active=True)
                if group == 'class':
                    qs = qs.filter(current_class_id=request.data.get('class_id'))
                for s in qs.exclude(pk__in=Member.all_objects.filter(tenant=school, kind='student').values('student_id')):
                    member_for_student(s)
                    made += 1
            elif group == 'staff':
                emails = [e for e in Teacher.objects.filter(is_active=True).values_list('email', flat=True) if e]
                for u in User.objects.filter(email__in=emails, is_active=True):
                    if not Member.all_objects.filter(tenant=school, kind='staff', user=u).exists():
                        member_for_user(u, school)
                        made += 1
            else:
                return _err('Choose a class, all students or all staff.')
            return Response({'made': made, 'message': f'{made} new card(s) made.' if made else 'Everyone chosen already has a card.'}, status=201)
        kind, ref = request.data.get('kind'), request.data.get('ref_id')
        if kind == 'student':
            s = Student.objects.filter(pk=ref).first()
            if s is None:
                return _err('Student not found.', 404)
            return Response(_member_brief(member_for_student(s)), status=201)
        u = User.objects.filter(pk=ref).first()
        if u is None:
            return _err('Staff member not found.', 404)
        return Response(_member_brief(member_for_user(u, school)), status=201)

    q = (request.query_params.get('q') or '').strip()
    out = []
    if q:
        exact = Member.objects.filter(Q(card_number__iexact=q) | Q(student__student_id__iexact=q)).first()
        if exact:
            return Response({'results': [_member_brief(exact)], 'exact': True})
        for s in Student.objects.filter(is_active=True).filter(Q(full_name__icontains=q) | Q(student_id__icontains=q)) \
                .select_related('current_class')[:20]:
            m = Member.objects.filter(student=s).first()
            out.append(_member_brief(m) if m else {'id': None, 'kind': 'student', 'ref_id': str(s.id), 'name': s.full_name,
                                                   'student_number': s.student_id, 'card_number': None,
                                                   'detail': s.current_class.name if s.current_class_id else '',
                                                   'loans_out': 0, 'overdue': 0, 'fines_due': 0, 'is_blocked': False})
        emails = list(Teacher.objects.filter(Q(full_name__icontains=q) | Q(email__icontains=q)).values_list('email', flat=True)[:20])
        for u in User.objects.filter(email__in=[e for e in emails if e]):
            m = Member.objects.filter(kind='staff', user=u).first()
            out.append(_member_brief(m) if m else {'id': None, 'kind': 'staff', 'ref_id': str(u.pk), 'name': u.full_name or u.email,
                                                   'detail': 'Staff', 'card_number': None, 'loans_out': 0, 'overdue': 0,
                                                   'fines_due': 0, 'is_blocked': False})
    elif request.query_params.get('show') == 'loans':
        out = [_member_brief(m) for m in Member.objects.filter(loans__isnull=False, loans__returned_at__isnull=True).distinct()[:100]]
    else:  # every card holder
        out = [_member_brief(m) for m in Member.objects.select_related('student__current_class', 'user').order_by('name')[:300]]
    return Response({'results': out, 'exact': False})


def _member_detail(m: Member, today=None) -> dict:
    today = today or _today()
    loans = list(m.loans.select_related('copy__book', 'member').order_by('-issued_at')[:100])
    return {**_member_brief(m, today),
            'current': [_loan_payload(l, today) for l in loans if l.returned_at is None],
            'history': [_loan_payload(l, today) for l in loans if l.returned_at is not None][:50],
            'reservations': [_reservation_payload(r) for r in m.reservations.filter(status__in=('waiting', 'ready')).select_related('book', 'member', 'copy')],
            'notes': m.notes}


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def member_detail(request, member_id):
    if not is_admin(request.user):
        return _err('Only the office can open member records.', 403)
    m = get_object_or_404(Member, pk=member_id)
    if request.method == 'PATCH':
        if 'is_blocked' in request.data:
            m.is_blocked = str(request.data['is_blocked']).lower() in ('1', 'true', 'yes', 'on')
            m.blocked_reason = str(request.data.get('blocked_reason') or '')[:255] if m.is_blocked else ''
        if 'notes' in request.data:
            m.notes = str(request.data['notes'] or '')[:2000]
        m.save()
    return Response(_member_detail(m))


# ---------------------------------------------------------------------------
# Circulation
# ---------------------------------------------------------------------------

def _serve_waiting(book, copy=None) -> Reservation | None:
    """Give an available copy to the first person waiting for this book; the copy is held for them."""
    r = Reservation.objects.filter(book=book, status='waiting').select_related('member').order_by('created_at').first()
    if r is None:
        return None
    copy = copy or BookCopy.objects.filter(book=book, status='available').first()
    if copy is None:
        return None
    cfg = settings_for(book.tenant)
    copy.status = 'on_hold'
    copy.save(update_fields=['status'])
    r.status, r.copy, r.ready_at = 'ready', copy, timezone.now()
    r.hold_until = _today() + timedelta(days=cfg.hold_days)
    r.save()
    _tell(r.member, 'Library book ready',
          f'"{book.title}" is ready to collect from the library for {r.member.name}. It is kept until {r.hold_until:%d %b %Y}.')
    return r


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def issue(request):
    """{barcode, member_id} → a new loan."""
    if not is_admin(request.user):
        return _err('Only the library desk can issue books.', 403)
    code = str(request.data.get('barcode') or '').strip()
    copy = BookCopy.objects.select_related('book').filter(barcode__iexact=code).first()
    if copy is None:
        return _err(f'No copy has the barcode {code or "(blank)"}.', 404)
    m = Member.objects.filter(pk=request.data.get('member_id')).first()
    if m is None:
        return _err('Choose a member first.', 404)
    cfg = settings_for(copy.tenant)
    today = _today()
    if copy.status == 'on_loan':
        who = Loan.objects.filter(copy=copy, returned_at__isnull=True).select_related('member').first()
        return _err(f'This copy is already on loan{" to " + who.member.name if who else ""}. Return it first.')
    if copy.status in ('lost', 'damaged', 'withdrawn'):
        return _err(f'This copy is marked {copy.get_status_display().lower()} and cannot be lent.')
    held = None
    if copy.status == 'on_hold':
        held = Reservation.objects.filter(copy=copy, status='ready').select_related('member').first()
        if held and held.member_id != m.id:
            return _err(f'This copy is held for {held.member.name} until {held.hold_until:%d %b}.')
    if m.is_blocked:
        return _err(f'{m.name} cannot borrow right now{": " + m.blocked_reason if m.blocked_reason else "."}')
    open_loans = list(m.loans.filter(returned_at__isnull=True))
    days, limit = _limits(m, cfg)
    if len(open_loans) >= limit:
        return _err(f'{m.name} already has {len(open_loans)} book(s) out (the limit is {limit}).')
    if cfg.block_when_overdue and any(l.due_date < today for l in open_loans):
        return _err(f'{m.name} has an overdue book. Please return it before borrowing another.')
    with transaction.atomic():
        loan = Loan.objects.create(tenant=copy.tenant, copy=copy, member=m, due_date=today + timedelta(days=days),
                                   issued_by=request.user)
        copy.status = 'on_loan'
        copy.save(update_fields=['status'])
        mine = held or Reservation.objects.filter(book=copy.book, member=m, status='waiting').first()
        if mine:
            mine.status, mine.copy = 'collected', copy
            mine.save(update_fields=['status', 'copy'])
    loan = Loan.objects.select_related('copy__book', 'member').get(pk=loan.pk)
    return Response({'loan': _loan_payload(loan), 'member': _member_brief(m)}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def return_book(request):
    """{barcode, condition?, damaged?, notes?} → the loan is closed; any fine is worked out; a waiting reservation is served."""
    if not is_admin(request.user):
        return _err('Only the library desk can take returns.', 403)
    code = str(request.data.get('barcode') or '').strip()
    copy = BookCopy.objects.select_related('book').filter(barcode__iexact=code).first()
    if copy is None:
        return _err(f'No copy has the barcode {code or "(blank)"}.', 404)
    loan = Loan.objects.filter(copy=copy, returned_at__isnull=True).select_related('member', 'copy__book').first()
    if loan is None:
        return _err('This copy is not on loan.')
    cfg = settings_for(copy.tenant)
    today = _today()
    days_late = max((today - loan.due_date).days, 0)
    with transaction.atomic():
        loan.returned_at = timezone.now()
        loan.returned_to = request.user
        loan.notes = str(request.data.get('notes') or loan.notes)[:255]
        if request.data.get('condition') in dict(BookCopy.CONDITIONS):
            loan.condition_on_return = copy.condition = request.data['condition']
        if days_late and cfg.fine_per_day > 0:
            loan.fine_amount = cfg.fine_per_day * days_late
            loan.fine_status = 'due'
        loan.save()
        damaged = str(request.data.get('damaged', '')).lower() in ('1', 'true', 'yes', 'on')
        copy.status = 'damaged' if damaged else 'available'
        copy.save(update_fields=['status', 'condition'])
        held = None if damaged else _serve_waiting(copy.book, copy)
    loan.refresh_from_db()
    return Response({'loan': _loan_payload(loan), 'days_late': days_late, 'fine': float(loan.fine_amount),
                     'hold_for': {'name': held.member.name, 'until': held.hold_until.isoformat()} if held else None,
                     'member': _member_brief(loan.member)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew(request, loan_id):
    loan = get_object_or_404(Loan.objects.select_related('copy__book', 'member__student'), pk=loan_id)
    mine = _find_member(request, student_id=str(loan.member.student_id) if loan.member.student_id else None)
    if not is_admin(request.user) and (mine is None or mine.id != loan.member_id):
        return _err('You can only renew your own books.', 403)
    if loan.returned_at:
        return _err('This book has already been returned.')
    cfg = settings_for(loan.tenant)
    today = _today()
    if loan.renewals >= cfg.max_renewals:
        return _err(f'This book has been renewed {loan.renewals} time(s), the most allowed. Please return it.')
    if Reservation.objects.filter(book=loan.copy.book, status='waiting').exclude(member=loan.member).exists():
        return _err('Someone is waiting for this book, so it cannot be renewed.')
    if loan.due_date < today and not is_admin(request.user):
        return _err('This book is overdue. Please bring it to the library.')
    days, _ = _limits(loan.member, cfg)
    loan.due_date = max(loan.due_date, today) + timedelta(days=days)
    loan.renewals += 1
    loan.save(update_fields=['due_date', 'renewals'])
    return Response(_loan_payload(loan))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def loan_action(request, loan_id, action):
    """Office: ``fine`` {status: paid|waived}, or ``lost`` (closes the loan; the copy's price becomes the fine)."""
    if not is_admin(request.user):
        return _err('Only the library desk can do this.', 403)
    loan = get_object_or_404(Loan.objects.select_related('copy__book', 'member'), pk=loan_id)
    if action == 'fine':
        status = request.data.get('status')
        if status not in ('paid', 'waived') or loan.fine_status != 'due':
            return _err('There is no fine to settle on this loan.')
        loan.fine_status = status
        loan.save(update_fields=['fine_status'])
    elif action == 'lost':
        if loan.returned_at:
            return _err('This book has already been returned.')
        loan.returned_at = timezone.now()
        loan.returned_to = request.user
        loan.notes = 'Reported lost'
        if loan.copy.price:
            loan.fine_amount, loan.fine_status = loan.copy.price, 'due'
        loan.save()
        loan.copy.status = 'lost'
        loan.copy.save(update_fields=['status'])
    else:
        return _err('Unknown action.', 404)
    return Response(_loan_payload(loan))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def loans(request):
    """Office: ?status=active|overdue|returned|fines and ?q= (title, barcode or member)."""
    if not is_admin(request.user):
        return _err('Only the office can see all loans.', 403)
    today = _today()
    qs = Loan.objects.select_related('copy__book', 'member')
    status = request.query_params.get('status') or 'active'
    if status == 'active':
        qs = qs.filter(returned_at__isnull=True).order_by('due_date')
    elif status == 'overdue':
        qs = qs.filter(returned_at__isnull=True, due_date__lt=today).order_by('due_date')
    elif status == 'returned':
        qs = qs.filter(returned_at__isnull=False).order_by('-returned_at')
    elif status == 'fines':
        qs = qs.filter(fine_status='due').order_by('-returned_at')
    q = (request.query_params.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(copy__book__title__icontains=q) | Q(copy__barcode__iexact=q) | Q(member__name__icontains=q)
                       | Q(member__card_number__iexact=q))
    return Response({'results': [_loan_payload(l, today) for l in qs[:300]],
                     'counts': {'active': Loan.objects.filter(returned_at__isnull=True).count(),
                                'overdue': Loan.objects.filter(returned_at__isnull=True, due_date__lt=today).count(),
                                'fines': Loan.objects.filter(fine_status='due').count()}})


# ---------------------------------------------------------------------------
# Reservations and "my library"
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reservations(request):
    if request.method == 'POST':
        book = Book.objects.filter(pk=request.data.get('book_id')).first()
        if book is None:
            return _err('Book not found.', 404)
        m = _find_member(request, member_id=request.data.get('member_id'), student_id=request.data.get('student_id'))
        if m is None:
            return _err('You can only reserve books for yourself or your own children.', 403)
        if m.is_blocked:
            return _err(f'{m.name} cannot reserve books right now.')
        if Reservation.objects.filter(book=book, member=m, status__in=('waiting', 'ready')).exists():
            return _err(f'{m.name} has already reserved this book.')
        if Loan.objects.filter(copy__book=book, member=m, returned_at__isnull=True).exists():
            return _err(f'{m.name} already has this book.')
        if not BookCopy.objects.filter(book=book).exclude(status__in=('lost', 'withdrawn')).exists():
            return _err('The library has no copies of this book.')
        r = Reservation.objects.create(tenant=book.tenant, book=book, member=m, created_by=request.user)
        _serve_waiting(book)
        r.refresh_from_db()
        return Response(_reservation_payload(r), status=201)
    if not is_admin(request.user):
        return _err('Only the office can see every reservation.', 403)
    status = request.query_params.get('status')
    qs = Reservation.objects.select_related('book', 'member', 'copy')
    qs = qs.filter(status=status) if status else qs.filter(status__in=('waiting', 'ready'))
    return Response([_reservation_payload(r) for r in qs[:300]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_reservation(request, reservation_id):
    r = get_object_or_404(Reservation.objects.select_related('member', 'copy', 'book'), pk=reservation_id)
    mine = _find_member(request, student_id=str(r.member.student_id) if r.member.student_id else None)
    if not is_admin(request.user) and (mine is None or mine.id != r.member_id):
        return _err('You can only cancel your own reservations.', 403)
    if r.status not in ('waiting', 'ready'):
        return _err('This reservation is already closed.')
    with transaction.atomic():
        copy = r.copy if r.status == 'ready' else None
        r.status = 'cancelled'
        r.save(update_fields=['status'])
        if copy:
            copy.status = 'available'
            copy.save(update_fields=['status'])
            _serve_waiting(r.book, copy)
    return Response(_reservation_payload(r))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mine(request):
    """Students: their own card. Parents: each child's. Staff: their own."""
    from services.education.students.models import Student

    role = get_user_role(request.user)
    cards = []
    if role == 'parent':
        cards = [member_for_student(s) for s in filter_students_for_user(request.user, Student.objects.filter(is_active=True)).order_by('full_name')]
    else:
        m = _find_member(request)
        cards = [m] if m else []
    cfg = settings_for(_school(request) or (cards[0].tenant if cards else None))
    return Response({'members': [_member_detail(m) for m in cards],
                     'rules': {'loan_days_student': cfg.loan_days_student, 'loan_days_staff': cfg.loan_days_staff,
                               'max_loans_student': cfg.max_loans_student, 'max_loans_staff': cfg.max_loans_staff,
                               'max_renewals': cfg.max_renewals, 'fine_per_day': float(cfg.fine_per_day)}})


# ---------------------------------------------------------------------------
# Report and reminders
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    if not is_admin(request.user):
        return _err('Only the office can see library reports.', 403)
    today = _today()
    since = today - timedelta(days=90)
    copies = Counter(BookCopy.objects.values_list('status', flat=True))
    recent = Loan.objects.filter(issued_at__date__gte=since).select_related('copy__book', 'member')
    top_books = Counter((l.copy.book_id, l.copy.book.title) for l in recent).most_common(10)
    readers = Counter((l.member_id, l.member.name, l.member.kind) for l in recent).most_common(10)
    subjects = Counter((l.copy.book.subject or 'Other') for l in recent).most_common()
    months = []
    first = today.replace(day=1)
    for n in range(5, -1, -1):
        y, mth = first.year, first.month - n
        while mth <= 0:
            y, mth = y - 1, mth + 12
        start = date(y, mth, 1)
        end = date(y + (mth == 12), mth % 12 + 1, 1)
        months.append({'month': start.isoformat()[:7], 'label': start.strftime('%b %Y'),
                       'loans': Loan.objects.filter(issued_at__date__gte=start, issued_at__date__lt=end).count()})
    fines = Loan.objects.filter(fine_status__in=('due', 'paid'))
    return Response({
        'titles': Book.objects.count(), 'copies': sum(v for k, v in copies.items() if k != 'withdrawn'),
        'by_status': dict(copies),
        'on_loan': Loan.objects.filter(returned_at__isnull=True).count(),
        'overdue': Loan.objects.filter(returned_at__isnull=True, due_date__lt=today).count(),
        'loans_90_days': recent.count(), 'active_readers': len({l.member_id for l in recent}),
        'members': Member.objects.count(),
        'waiting_reservations': Reservation.objects.filter(status='waiting').count(),
        'fines_due': float(sum((l.fine_amount for l in fines if l.fine_status == 'due'), Decimal('0'))),
        'fines_paid': float(sum((l.fine_amount for l in fines if l.fine_status == 'paid'), Decimal('0'))),
        'top_books': [{'id': str(i), 'title': t, 'loans': n} for (i, t), n in top_books],
        'top_readers': [{'id': str(i), 'name': nm, 'kind': k, 'loans': n} for (i, nm, k), n in readers],
        'by_subject': [{'subject': s, 'loans': n} for s, n in subjects],
        'months': months,
    })


def send_reminders(day: date | None = None) -> dict:
    """Daily, per school (inside ``use_tenant``): remind about books due tomorrow, chase overdue books every 3 days,
    and release holds nobody collected."""
    day = day or _today()
    sent = {'due_tomorrow': 0, 'overdue': 0, 'holds_expired': 0}
    for loan in Loan.objects.filter(returned_at__isnull=True, due_date=day + timedelta(days=1)).exclude(last_reminded_at=day) \
            .select_related('copy__book', 'member__student', 'member__user'):
        _tell(loan.member, 'Library book due tomorrow',
              f'"{loan.copy.book.title}" borrowed by {loan.member.name} is due back tomorrow ({loan.due_date:%d %b}).')
        loan.last_reminded_at = day
        loan.save(update_fields=['last_reminded_at'])
        sent['due_tomorrow'] += 1
    for loan in Loan.objects.filter(returned_at__isnull=True, due_date__lt=day) \
            .filter(Q(last_reminded_at__isnull=True) | Q(last_reminded_at__lte=day - timedelta(days=3))) \
            .select_related('copy__book', 'member__student', 'member__user'):
        late = (day - loan.due_date).days
        _tell(loan.member, 'Library book overdue',
              f'"{loan.copy.book.title}" borrowed by {loan.member.name} was due on {loan.due_date:%d %b} '
              f'({late} day{"s" if late != 1 else ""} ago). Please return it to the library.')
        loan.last_reminded_at = day
        loan.save(update_fields=['last_reminded_at'])
        sent['overdue'] += 1
    for r in Reservation.objects.filter(status='ready', hold_until__lt=day).select_related('copy', 'book', 'member'):
        with transaction.atomic():
            copy = r.copy
            r.status = 'expired'
            r.save(update_fields=['status'])
            if copy and copy.status == 'on_hold':
                copy.status = 'available'
                copy.save(update_fields=['status'])
                _serve_waiting(r.book, copy)
        sent['holds_expired'] += 1
    return sent
