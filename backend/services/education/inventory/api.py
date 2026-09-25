"""Inventory API (mounted at ``/api/v1/auth/inventory/``). The office runs the store room."""
from __future__ import annotations

import csv
import re
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin

from .models import Category, Item, Movement, PurchaseLine, PurchaseOrder, Supplier

ITEM_FIELDS = ('sku', 'name', 'unit', 'description', 'location', 'reorder_level', 'reorder_quantity', 'unit_cost', 'sale_price', 'is_active')
SUPPLIER_FIELDS = ('name', 'contact_person', 'phone', 'email', 'address', 'tax_number', 'notes', 'is_active')
NUMBERS = ('reorder_level', 'reorder_quantity', 'unit_cost', 'sale_price')


class Refused(Exception):
    """A stock change that can't be made; the message is shown to the user."""


def _err(msg, code=400):
    return Response({'error': msg}, status=code)


def _school(request):
    return getattr(request, 'tenant', None)


def _office(request):
    return is_admin(request.user)


def _dec(value, what='Quantity', allow_blank=False):
    if value in (None, '') and allow_blank:
        return None
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise Refused(f'{what} must be a number.')
    if d < 0:
        raise Refused(f'{what} cannot be negative.')
    return d


def _num(d):
    """Decimals as plain numbers for JSON (5 rather than 5.00)."""
    if d is None:
        return None
    f = float(d)
    return int(f) if f.is_integer() else f


def _next_code(model, field, prefix, school, width=4):
    values = model.all_objects.filter(tenant=school, **{f'{field}__startswith': prefix}).values_list(field, flat=True)
    nums = [int(m.group(1)) for v in values if (m := re.match(rf'^{re.escape(prefix)}(\d+)$', v))]
    return f'{prefix}{str((max(nums) if nums else 0) + 1).zfill(width)}'


# ---------------------------------------------------------------------------
# Stock changes (all go through here)
# ---------------------------------------------------------------------------

def _tell_office(item, title, message):
    from services.core.user_notifications.utils import create_user_notification
    from services.education.communication.inbox import admin_users

    if item.tenant_id:
        for u in admin_users(item.tenant):
            create_user_notification(u, title, message, 'system')


def record(item: Item, kind: str, quantity, *, unit_cost=None, by=None, **extra) -> Movement:
    """Change an item's stock by one movement; keeps the average cost and sends a low-stock alert once."""
    if kind not in dict(Movement.KINDS):
        raise Refused('Choose what happened to the stock.')
    qty = _dec(quantity)
    if qty == 0:
        raise Refused('Enter a quantity above zero.')
    with transaction.atomic():
        item = Item.objects.select_for_update().get(pk=item.pk)
        coming_in = kind in Movement.IN_KINDS
        if not coming_in and qty > item.quantity:
            raise Refused(f'Only {_num(item.quantity)} {item.get_unit_display().lower()} of {item.name} in stock.')
        cost = item.unit_cost
        if kind == 'received':
            cost = _dec(unit_cost, 'Unit cost') if unit_cost not in (None, '') else item.unit_cost
            total = item.quantity + qty
            item.unit_cost = ((item.quantity * item.unit_cost + qty * cost) / total).quantize(Decimal('0.01')) if total else cost
        item.quantity = item.quantity + qty if coming_in else item.quantity - qty
        was_low = item.low_alert_sent
        if item.is_low and not was_low and item.reorder_level > 0:
            item.low_alert_sent = True
        elif not item.is_low:
            item.low_alert_sent = False
        item.save(update_fields=['quantity', 'unit_cost', 'low_alert_sent', 'updated_at'])
        m = Movement.objects.create(tenant=item.tenant, item=item, kind=kind, quantity=qty if coming_in else -qty,
                                    unit_cost=cost, balance_after=item.quantity, by=by, **extra)
    if item.low_alert_sent and not was_low:
        _tell_office(item, 'Low stock', f'{item.name} is down to {_num(item.quantity)} {item.get_unit_display().lower()} '
                                        f'(reorder at {_num(item.reorder_level)}).')
    return m


# ---------------------------------------------------------------------------
# Payloads
# ---------------------------------------------------------------------------

def _item_payload(i: Item) -> dict:
    return {'id': str(i.id), 'sku': i.sku, 'name': i.name, 'unit': i.unit, 'unit_label': i.get_unit_display(),
            'category': {'id': str(i.category_id), 'name': i.category.name} if i.category_id else None,
            'description': i.description, 'location': i.location, 'quantity': _num(i.quantity),
            'reorder_level': _num(i.reorder_level), 'reorder_quantity': _num(i.reorder_quantity),
            'unit_cost': _num(i.unit_cost), 'value': _num((i.quantity * i.unit_cost).quantize(Decimal('0.01'))),
            'sale_price': _num(i.sale_price), 'is_active': i.is_active, 'low': i.is_low,
            'preferred_supplier': {'id': str(i.preferred_supplier_id), 'name': i.preferred_supplier.name} if i.preferred_supplier_id else None}


def _movement_payload(m: Movement) -> dict:
    return {'id': str(m.id), 'item': {'id': str(m.item_id), 'name': m.item.name, 'sku': m.item.sku, 'unit': m.item.unit},
            'kind': m.kind, 'kind_label': m.get_kind_display(), 'quantity': _num(m.quantity), 'unit_cost': _num(m.unit_cost),
            'balance_after': _num(m.balance_after), 'issued_to': m.issued_to,
            'student': {'id': str(m.student_id), 'full_name': m.student.full_name} if m.student_id else None,
            'invoice_number': m.invoice.invoice_number if m.invoice_id else None, 'reference': m.reference, 'note': m.note,
            'by': (m.by.full_name or m.by.email) if m.by_id else '', 'at': m.at.isoformat()}


def _supplier_payload(s: Supplier) -> dict:
    return {**{f: getattr(s, f) for f in SUPPLIER_FIELDS}, 'id': str(s.id),
            'orders': s.orders.exclude(status='cancelled').count()}


def _order_payload(o: PurchaseOrder, lines=True) -> dict:
    ls = list(o.lines.select_related('item'))
    total = sum((l.quantity * l.unit_cost for l in ls), Decimal('0'))
    out = {'id': str(o.id), 'number': o.number, 'status': o.status, 'status_label': o.get_status_display(),
           'supplier': {'id': str(o.supplier_id), 'name': o.supplier.name},
           'order_date': o.order_date.isoformat() if o.order_date else None,
           'expected_date': o.expected_date.isoformat() if o.expected_date else None,
           'supplier_invoice': o.supplier_invoice, 'notes': o.notes, 'total': _num(total.quantize(Decimal('0.01'))),
           'created_at': o.created_at.isoformat(), 'line_count': len(ls)}
    if lines:
        out['lines'] = [{'id': str(l.id), 'item': {'id': str(l.item_id), 'name': l.item.name, 'sku': l.item.sku, 'unit': l.item.unit},
                         'quantity': _num(l.quantity), 'unit_cost': _num(l.unit_cost), 'received_quantity': _num(l.received_quantity),
                         'outstanding': _num(max(l.quantity - l.received_quantity, Decimal('0'))),
                         'total': _num((l.quantity * l.unit_cost).quantize(Decimal('0.01')))} for l in ls]
    return out


# ---------------------------------------------------------------------------
# Categories and suppliers
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def categories(request):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    if request.method == 'POST':
        name = str(request.data.get('name') or '').strip()
        if not name:
            return _err('A category needs a name.')
        if Category.objects.filter(name__iexact=name).exists():
            return _err('That category already exists.')
        c = Category.objects.create(tenant=_school(request), name=name[:100], description=str(request.data.get('description') or '')[:255])
        return Response({'id': str(c.id), 'name': c.name, 'description': c.description, 'items': 0}, status=201)
    return Response([{'id': str(c.id), 'name': c.name, 'description': c.description, 'items': c.items.count()} for c in Category.objects.all()])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, category_id):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    c = get_object_or_404(Category, pk=category_id)
    if request.method == 'DELETE':
        c.delete()  # its items keep going, without a category
        return Response(status=204)
    if request.data.get('name'):
        c.name = str(request.data['name']).strip()[:100]
    if 'description' in request.data:
        c.description = str(request.data['description'] or '')[:255]
    c.save()
    return Response({'id': str(c.id), 'name': c.name, 'description': c.description, 'items': c.items.count()})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def suppliers(request):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    if request.method == 'GET':
        return Response([_supplier_payload(s) for s in Supplier.objects.all()])
    s = Supplier(tenant=_school(request))
    return _save_supplier(request, s, 201)


def _save_supplier(request, s, code):
    for f in SUPPLIER_FIELDS:
        if f in request.data:
            v = request.data[f]
            setattr(s, f, str(v).lower() in ('1', 'true', 'yes', 'on') if f == 'is_active' else str(v or '').strip()[:500])
    if not s.name:
        return _err('A supplier needs a name.')
    s.save()
    return Response(_supplier_payload(s), status=code)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def supplier_detail(request, supplier_id):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    s = get_object_or_404(Supplier, pk=supplier_id)
    if request.method == 'DELETE':
        if s.orders.exists():
            return _err('This supplier has purchase orders on record. Mark it inactive instead.')
        s.delete()
        return Response(status=204)
    return _save_supplier(request, s, 200)


# ---------------------------------------------------------------------------
# Items and stock
# ---------------------------------------------------------------------------

def _apply_item(request, i: Item):
    for f in ITEM_FIELDS:
        if f not in request.data:
            continue
        v = request.data[f]
        if f in NUMBERS:
            v = _dec(v, f.replace('_', ' ').capitalize(), allow_blank=(f == 'sale_price'))
            if v is None and f != 'sale_price':
                v = Decimal('0')
        elif f == 'is_active':
            v = str(v).lower() in ('1', 'true', 'yes', 'on')
        elif f == 'unit':
            if v not in dict(Item.UNITS):
                continue
        else:
            v = str(v or '').strip()[:500]
        setattr(i, f, v)
    if 'category_id' in request.data:
        i.category = Category.objects.filter(pk=request.data['category_id']).first() if request.data['category_id'] else None
    if 'preferred_supplier_id' in request.data:
        i.preferred_supplier = Supplier.objects.filter(pk=request.data['preferred_supplier_id']).first() if request.data['preferred_supplier_id'] else None
    if not i.name:
        raise Refused('An item needs a name.')
    school = i.tenant or _school(request)
    if not i.sku:
        i.sku = _next_code(Item, 'sku', 'ITM-', school)
    elif Item.objects.filter(sku__iexact=i.sku).exclude(pk=i.pk).exists():
        raise Refused(f'Another item already has the code {i.sku}.')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def items(request):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    if request.method == 'POST':
        i = Item(tenant=_school(request))
        try:
            _apply_item(request, i)
            opening = request.data.get('opening_quantity')
            with transaction.atomic():
                i.save()
                if opening not in (None, '', 0, '0'):
                    record(i, 'count_up', opening, by=request.user, note='Opening stock')
        except Refused as exc:
            return _err(str(exc))
        i.refresh_from_db()
        return Response(_item_payload(i), status=201)
    qs = Item.objects.select_related('category', 'preferred_supplier')
    q = (request.query_params.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(sku__iexact=q) | Q(sku__icontains=q) | Q(location__icontains=q))
    if request.query_params.get('category'):
        qs = qs.filter(category_id=request.query_params['category'])
    if request.query_params.get('active') != 'all':
        qs = qs.filter(is_active=True)
    rows = [_item_payload(i) for i in qs]
    if request.query_params.get('low') in ('1', 'true'):
        rows = [r for r in rows if r['low']]
    if request.query_params.get('sellable') in ('1', 'true'):
        rows = [r for r in rows if r['sale_price'] is not None]
    return Response({'results': rows, 'low_count': sum(1 for r in rows if r['low']),
                     'value': _num(sum((Decimal(str(r['value'])) for r in rows), Decimal('0')))})


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def item_detail(request, item_id):
    if not _office(request):
        return _err('Only the office can manage inventory.', 403)
    i = get_object_or_404(Item.objects.select_related('category', 'preferred_supplier'), pk=item_id)
    if request.method == 'DELETE':
        if i.movements.exists():
            return _err('This item has stock history. Mark it inactive instead.')
        i.delete()
        return Response(status=204)
    if request.method == 'PATCH':
        try:
            _apply_item(request, i)
        except Refused as exc:
            return _err(str(exc))
        if 'reorder_level' in request.data and not i.is_low:
            i.low_alert_sent = False
        i.save()
    out = _item_payload(i)
    out['movements'] = [_movement_payload(m) for m in i.movements.select_related('item', 'student', 'invoice', 'by')[:100]]
    return Response(out)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_stock(request, item_id):
    """``{kind, quantity, unit_cost?, issued_to?, student_id?, reference?, note?}``. Selling to a student bills the family."""
    from services.education.finance.models import Invoice
    from services.education.students.models import Student

    if not _office(request):
        return _err('Only the office can change stock.', 403)
    i = get_object_or_404(Item, pk=item_id)
    kind = request.data.get('kind')
    extra = {'issued_to': str(request.data.get('issued_to') or '')[:150], 'reference': str(request.data.get('reference') or '')[:100],
             'note': str(request.data.get('note') or '')[:255]}
    try:
        if kind == 'sold':
            s = Student.objects.filter(pk=request.data.get('student_id'), is_active=True).first()
            if s is None:
                raise Refused('Choose the student this is sold to.')
            if i.sale_price is None:
                raise Refused(f'{i.name} has no sale price. Set one on the item first.')
            qty = _dec(request.data.get('quantity'))
            with transaction.atomic():
                m = record(i, 'sold', qty, by=request.user, student=s, **extra)
                amount = (qty * i.sale_price).quantize(Decimal('0.01'))
                if amount > 0:
                    today = timezone.localdate()
                    inv = Invoice.objects.create(
                        student=s, invoice_type='miscellaneous', amount=amount, due_date=today + timedelta(days=7),
                        invoice_month=today.replace(day=1), status='issued',
                        description=f'School shop: {_num(qty)} × {i.name}',
                        breakdown={'items': [{'sku': i.sku, 'name': i.name, 'quantity': str(qty), 'price': str(i.sale_price)}]})
                    m.invoice = inv
                    m.save(update_fields=['invoice'])
        elif kind == 'issued' and not extra['issued_to']:
            raise Refused('Say who the stock was issued to (a department, classroom or person).')
        else:
            m = record(i, kind, request.data.get('quantity'), unit_cost=request.data.get('unit_cost'), by=request.user, **extra)
    except Refused as exc:
        return _err(str(exc))
    m = Movement.objects.select_related('item', 'student', 'invoice', 'by').get(pk=m.pk)
    i.refresh_from_db()
    return Response({'movement': _movement_payload(m), 'item': _item_payload(i)}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def movements(request):
    if not _office(request):
        return _err('Only the office can see stock history.', 403)
    qs = Movement.objects.select_related('item', 'student', 'invoice', 'by')
    if request.query_params.get('kind'):
        qs = qs.filter(kind=request.query_params['kind'])
    start = request.query_params.get('from')
    if start:
        qs = qs.filter(at__date__gte=start)
    if request.query_params.get('q'):
        q = request.query_params['q']
        qs = qs.filter(Q(item__name__icontains=q) | Q(issued_to__icontains=q) | Q(student__full_name__icontains=q) | Q(reference__icontains=q))
    return Response([_movement_payload(m) for m in qs[:300]])


# ---------------------------------------------------------------------------
# Purchase orders
# ---------------------------------------------------------------------------

def _set_lines(o: PurchaseOrder, rows):
    if not isinstance(rows, list) or not rows:
        raise Refused('Add at least one item to the order.')
    keep = []
    for row in rows:
        item = Item.objects.filter(pk=row.get('item_id')).first()
        if item is None:
            raise Refused('One of the items was not found.')
        qty, cost = _dec(row.get('quantity')), _dec(row.get('unit_cost') or item.unit_cost, 'Unit cost')
        if qty == 0:
            raise Refused(f'Enter how many {item.name} to order.')
        keep.append((item, qty, cost))
    o.lines.all().delete()
    for item, qty, cost in keep:
        PurchaseLine.objects.create(tenant=o.tenant, order=o, item=item, quantity=qty, unit_cost=cost)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def orders(request):
    if not _office(request):
        return _err('Only the office can manage purchases.', 403)
    if request.method == 'GET':
        qs = PurchaseOrder.objects.select_related('supplier')
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])
        return Response([_order_payload(o, lines=False) for o in qs[:200]])
    s = Supplier.objects.filter(pk=request.data.get('supplier_id')).first()
    if s is None:
        return _err('Choose a supplier.')
    school = _school(request)
    try:
        with transaction.atomic():
            o = PurchaseOrder.objects.create(tenant=school, supplier=s, created_by=request.user,
                                             number=_next_code(PurchaseOrder, 'number', f'PO-{timezone.localdate().year}-', school),
                                             expected_date=request.data.get('expected_date') or None,
                                             notes=str(request.data.get('notes') or ''))
            _set_lines(o, request.data.get('lines'))
    except Refused as exc:
        return _err(str(exc))
    return Response(_order_payload(o), status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    if not _office(request):
        return _err('Only the office can manage purchases.', 403)
    o = get_object_or_404(PurchaseOrder.objects.select_related('supplier'), pk=order_id)
    if request.method == 'DELETE':
        if o.status != 'draft':
            return _err('Only a draft can be deleted. Cancel the order instead.')
        o.delete()
        return Response(status=204)
    if request.method == 'PATCH':
        try:
            if 'lines' in request.data:
                if o.status != 'draft':
                    raise Refused('The items can only be changed while the order is a draft.')
                _set_lines(o, request.data['lines'])
            for f in ('supplier_invoice', 'notes'):
                if f in request.data:
                    setattr(o, f, str(request.data[f] or '')[:2000])
            if 'expected_date' in request.data:
                o.expected_date = request.data['expected_date'] or None
            o.save()
        except Refused as exc:
            return _err(str(exc))
    return Response(_order_payload(o))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def order_action(request, order_id, action):
    """``order`` (send it), ``receive`` {lines: [{line_id, quantity}]} or ``cancel``."""
    if not _office(request):
        return _err('Only the office can manage purchases.', 403)
    o = get_object_or_404(PurchaseOrder.objects.select_related('supplier'), pk=order_id)
    try:
        if action == 'order':
            if o.status != 'draft':
                raise Refused('This order has already been sent.')
            o.status, o.order_date = 'ordered', timezone.localdate()
            o.save(update_fields=['status', 'order_date'])
        elif action == 'cancel':
            if o.status in ('received', 'cancelled') or o.lines.filter(received_quantity__gt=0).exists():
                raise Refused('Goods have already been received on this order, so it cannot be cancelled.')
            o.status = 'cancelled'
            o.save(update_fields=['status'])
        elif action == 'receive':
            if o.status not in ('ordered', 'partial'):
                raise Refused('Mark the order as sent before receiving goods.')
            lines = {str(l.id): l for l in o.lines.select_related('item')}
            rows = request.data.get('lines')
            if not rows:  # receive everything still outstanding
                rows = [{'line_id': lid, 'quantity': str(l.quantity - l.received_quantity)} for lid, l in lines.items()]
            got = False
            with transaction.atomic():
                for row in rows:
                    line = lines.get(str(row.get('line_id')))
                    if line is None:
                        raise Refused('One of the lines is not on this order.')
                    qty = _dec(row.get('quantity') or 0)
                    if qty == 0:
                        continue
                    if line.received_quantity + qty > line.quantity:
                        raise Refused(f'Only {_num(line.quantity - line.received_quantity)} more {line.item.name} are due on this order.')
                    record(line.item, 'received', qty, unit_cost=line.unit_cost, by=request.user, purchase_line=line,
                           reference=o.number + (f' / {o.supplier_invoice}' if o.supplier_invoice else ''))
                    line.received_quantity += qty
                    line.save(update_fields=['received_quantity'])
                    got = True
                if not got:
                    raise Refused('Enter what arrived.')
                done = all(l.received_quantity >= l.quantity for l in o.lines.all())
                o.status = 'received' if done else 'partial'
                if request.data.get('supplier_invoice'):
                    o.supplier_invoice = str(request.data['supplier_invoice'])[:100]
                o.save(update_fields=['status', 'supplier_invoice'])
        else:
            return _err('Unknown action.', 404)
    except Refused as exc:
        return _err(str(exc))
    return Response(_order_payload(o))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reorder(request):
    """Low items with how much to order, grouped by their usual supplier: ready to turn into purchase orders."""
    if not _office(request):
        return _err('Only the office can see this.', 403)
    groups = defaultdict(list)
    for i in Item.objects.filter(is_active=True).select_related('preferred_supplier', 'category'):
        if not i.is_low:
            continue
        on_order = sum((l.quantity - l.received_quantity for l in
                        PurchaseLine.objects.filter(item=i, order__status__in=('draft', 'ordered', 'partial'))), Decimal('0'))
        want = i.reorder_quantity or max(i.reorder_level * 2 - i.quantity, Decimal('1'))
        groups[str(i.preferred_supplier_id or '')].append({**_item_payload(i), 'on_order': _num(on_order),
                                                            'suggested': _num(max(want - on_order, Decimal('0')))})
    names = {str(s.id): s.name for s in Supplier.objects.filter(id__in=[k for k in groups if k])}
    return Response([{'supplier': {'id': k, 'name': names.get(k)} if k else None, 'items': v} for k, v in groups.items()])


# ---------------------------------------------------------------------------
# Report and export
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    if not _office(request):
        return _err('Only the office can see inventory reports.', 403)
    today = timezone.localdate()
    days = max(min(int(request.query_params.get('days') or 30), 366), 1)
    since = today - timedelta(days=days)
    items_ = list(Item.objects.filter(is_active=True).select_related('category'))
    by_cat = defaultdict(lambda: {'items': 0, 'value': Decimal('0'), 'low': 0})
    for i in items_:
        c = by_cat[i.category.name if i.category_id else 'No category']
        c['items'] += 1
        c['value'] += i.quantity * i.unit_cost
        c['low'] += int(i.is_low)
    moves = Movement.objects.filter(at__date__gte=since).select_related('item')
    used = defaultdict(lambda: [Decimal('0'), Decimal('0')])  # quantity, value
    by_dept = defaultdict(lambda: Decimal('0'))
    sold = Decimal('0')
    for m in moves:
        if m.kind in ('issued', 'sold', 'damaged'):
            used[(m.item_id, m.item.name, m.item.get_unit_display())][0] += -m.quantity
            used[(m.item_id, m.item.name, m.item.get_unit_display())][1] += -m.quantity * m.unit_cost
        if m.kind == 'issued':
            by_dept[m.issued_to or 'Unspecified'] += -m.quantity * m.unit_cost
        if m.kind == 'sold' and m.item.sale_price is not None:
            sold += -m.quantity * m.item.sale_price
    purchases = defaultdict(lambda: Decimal('0'))
    for l in PurchaseLine.objects.filter(order__order_date__gte=since).exclude(order__status='cancelled').select_related('order__supplier'):
        purchases[l.order.supplier.name] += l.quantity * l.unit_cost
    q2 = lambda d: _num(Decimal(d).quantize(Decimal('0.01')))  # noqa: E731
    return Response({
        'days': days, 'items': len(items_), 'value': q2(sum((i.quantity * i.unit_cost for i in items_), Decimal('0'))),
        'low': [_item_payload(i) for i in items_ if i.is_low],
        'by_category': [{'category': k, 'items': v['items'], 'value': q2(v['value']), 'low': v['low']} for k, v in sorted(by_cat.items())],
        'most_used': [{'id': str(k[0]), 'name': k[1], 'unit': k[2], 'quantity': _num(v[0]), 'value': q2(v[1])}
                      for k, v in sorted(used.items(), key=lambda kv: -kv[1][1])[:10]],
        'by_department': [{'issued_to': k, 'value': q2(v)} for k, v in sorted(by_dept.items(), key=lambda kv: -kv[1])],
        'purchases_by_supplier': [{'supplier': k, 'value': q2(v)} for k, v in sorted(purchases.items(), key=lambda kv: -kv[1])],
        'sales': q2(sold),
        'open_orders': PurchaseOrder.objects.filter(status__in=('ordered', 'partial')).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_stock(request):
    """The stock list as CSV (for audits and stock counts)."""
    if not _office(request):
        return _err('Only the office can export inventory.', 403)
    resp = HttpResponse(content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = f'attachment; filename="stock-{timezone.localdate().isoformat()}.csv"'
    resp.write('﻿')
    w = csv.writer(resp)
    w.writerow(['Code', 'Item', 'Category', 'Unit', 'Location', 'In stock', 'Reorder level', 'Unit cost', 'Value', 'Sale price', 'Low'])
    for i in Item.objects.filter(is_active=True).select_related('category'):
        w.writerow([i.sku, i.name, i.category.name if i.category_id else '', i.get_unit_display(), i.location, _num(i.quantity),
                    _num(i.reorder_level), _num(i.unit_cost), _num((i.quantity * i.unit_cost).quantize(Decimal('0.01'))),
                    _num(i.sale_price) if i.sale_price is not None else '', 'yes' if i.is_low else ''])
    return resp
