"""Transport API (mounted at ``/api/v1/auth/transport/``).

The office sets up vehicles, drivers and attendants, routes with stops, and which students ride where. A route's
driver or attendant (when they have a login) runs that route's trips: start, delay, who got on and off. Families
see their children's route, stops, times, crew and today's trips, and are told as the day goes.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import filter_students_for_user, get_user_role, is_admin

from .models import Rider, Route, Stop, TransportStaff, Trip, TripEvent, Vehicle

SOON = 30  # days: documents expiring within this are flagged


def _err(msg, code=400):
    return Response({'error': msg}, status=code)


def _school(request):
    return getattr(request, 'tenant', None)


def _today():
    return timezone.localdate()


def _date(value, default=None):
    if not value:
        return default
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return default


def _time(value):
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:5], '%H:%M').time()
    except ValueError:
        return None


def _money(value, default=None):
    if value in (None, ''):
        return default
    try:
        return max(Decimal(str(value)), Decimal('0'))
    except InvalidOperation:
        return default


def _hm(t):
    return t.strftime('%H:%M') if t else None


# ---------------------------------------------------------------------------
# Who can do what
# ---------------------------------------------------------------------------

def _crew_route_ids(user) -> set:
    return set(Route.objects.filter(Q(driver__user=user) | Q(attendant__user=user)).values_list('id', flat=True))


def _can_run(user, route) -> bool:
    return is_admin(user) or route.id in _crew_route_ids(user)


def _riding(route, day, kind=None):
    qs = Rider.objects.filter(route=route, start_date__lte=day).filter(Q(end_date__isnull=True) | Q(end_date__gte=day))
    if kind == 'morning':
        qs = qs.filter(direction__in=('both', 'morning'))
    elif kind == 'afternoon':
        qs = qs.filter(direction__in=('both', 'afternoon'))
    return qs.select_related('student__current_class', 'pickup_stop', 'dropoff_stop')


def _absent(student, day) -> str | None:
    """Why a student won't be on the bus today (marked absent, or a parent's absence note), if they won't."""
    from services.education.attendance.models import AbsenceReport, AttendanceRecord

    if AttendanceRecord.objects.filter(student=student, date=day, status='absent').exists():
        return 'Marked absent'
    r = AbsenceReport.objects.filter(student=student, start_date__lte=day, end_date__gte=day, kind='absent').exclude(status='declined').first()
    return f'Absence note: {r.get_reason_display()}' if r else None


def _family_users(student) -> list:
    """Parents and guardians with a login, and the student's own login."""
    from services.core.user_notifications.utils import get_user_by_email
    from services.education.attendance.register import _recipients

    _, users = _recipients(student)
    users = list(users)
    own = get_user_by_email(student.email)
    if own and own not in users:
        users.append(own)
    return users


def _tell_family(student, title, message):
    from services.core.user_notifications.utils import create_user_notification

    users = _family_users(student)
    for u in users:
        create_user_notification(u, title, message, 'system')
    return len(users)


# ---------------------------------------------------------------------------
# Payloads
# ---------------------------------------------------------------------------

def _vehicle_payload(v: Vehicle, today=None) -> dict:
    today = today or _today()
    warn = [label for label, d in (('Insurance', v.insurance_expiry), ('Fitness', v.fitness_expiry))
            if d and d <= today + timedelta(days=SOON)]
    return {'id': str(v.id), 'name': v.name, 'registration_no': v.registration_no, 'kind': v.kind, 'capacity': v.capacity,
            'make_model': v.make_model, 'insurance_expiry': v.insurance_expiry.isoformat() if v.insurance_expiry else None,
            'fitness_expiry': v.fitness_expiry.isoformat() if v.fitness_expiry else None, 'notes': v.notes,
            'is_active': v.is_active, 'expiring': warn}


def _staff_payload(s: TransportStaff, today=None) -> dict:
    today = today or _today()
    return {'id': str(s.id), 'role': s.role, 'name': s.name, 'phone': s.phone, 'licence_no': s.licence_no,
            'licence_expiry': s.licence_expiry.isoformat() if s.licence_expiry else None, 'national_id': s.national_id,
            'user_email': s.user.email if s.user_id else '', 'is_active': s.is_active,
            'expiring': ['Licence'] if s.licence_expiry and s.licence_expiry <= today + timedelta(days=SOON) else []}


def _stop_payload(s: Stop) -> dict:
    return {'id': str(s.id), 'name': s.name, 'address': s.address, 'order': s.order,
            'morning_time': _hm(s.morning_time), 'afternoon_time': _hm(s.afternoon_time),
            'latitude': float(s.latitude) if s.latitude is not None else None,
            'longitude': float(s.longitude) if s.longitude is not None else None}


def _route_payload(r: Route, day=None) -> dict:
    day = day or _today()
    riders = _riding(r, day).count()
    out = {'id': str(r.id), 'name': r.name, 'code': r.code, 'monthly_fee': float(r.monthly_fee), 'notes': r.notes,
           'is_active': r.is_active, 'riders': riders,
           'vehicle': {'id': str(r.vehicle_id), 'name': r.vehicle.name, 'registration_no': r.vehicle.registration_no,
                       'capacity': r.vehicle.capacity} if r.vehicle_id else None,
           'driver': {'id': str(r.driver_id), 'name': r.driver.name, 'phone': r.driver.phone} if r.driver_id else None,
           'attendant': {'id': str(r.attendant_id), 'name': r.attendant.name, 'phone': r.attendant.phone} if r.attendant_id else None,
           'stops': [_stop_payload(s) for s in r.stops.all()]}
    out['seats_left'] = (r.vehicle.capacity - riders) if r.vehicle_id else None
    return out


def _rider_payload(x: Rider) -> dict:
    fee = x.monthly_fee if x.monthly_fee is not None else x.route.monthly_fee
    s = x.student
    return {'id': str(x.id), 'student': {'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
                                         'class_name': s.current_class.name if s.current_class_id else ''},
            'route_id': str(x.route_id), 'route_name': x.route.name,
            'pickup_stop': _stop_payload(x.pickup_stop) if x.pickup_stop_id else None,
            'dropoff_stop': _stop_payload(x.dropoff_stop) if x.dropoff_stop_id else None,
            'direction': x.direction, 'direction_label': x.get_direction_display(),
            'start_date': x.start_date.isoformat(), 'end_date': x.end_date.isoformat() if x.end_date else None,
            'monthly_fee': float(fee), 'own_fee': x.monthly_fee is not None, 'notes': x.notes}


def _trip_payload(t: Trip | None, kind: str) -> dict:
    if t is None:
        return {'id': None, 'kind': kind, 'status': 'not_started', 'status_label': 'Not started', 'started_at': None,
                'completed_at': None, 'delay_minutes': 0, 'note': ''}
    return {'id': str(t.id), 'kind': t.kind, 'status': t.status, 'status_label': t.get_status_display(),
            'started_at': t.started_at.isoformat() if t.started_at else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None,
            'delay_minutes': t.delay_minutes, 'note': t.note}


# ---------------------------------------------------------------------------
# Vehicles and crew (office)
# ---------------------------------------------------------------------------

VEHICLE_FIELDS = ('name', 'registration_no', 'kind', 'capacity', 'make_model', 'insurance_expiry', 'fitness_expiry', 'notes', 'is_active')
STAFF_FIELDS = ('role', 'name', 'phone', 'licence_no', 'licence_expiry', 'national_id', 'is_active')


def _apply(obj, data, fields):
    for f in fields:
        if f not in data:
            continue
        v = data[f]
        if f.endswith('_expiry'):
            v = _date(v)
        elif f == 'capacity':
            try:
                v = max(int(v), 1)
            except (TypeError, ValueError):
                raise ValueError('Capacity must be a number.')
        elif f == 'is_active':
            v = str(v).lower() in ('1', 'true', 'yes', 'on')
        elif f == 'kind' and v not in dict(Vehicle.KINDS):
            continue
        elif f == 'role' and v not in dict(TransportStaff.ROLES):
            continue
        else:
            v = str(v or '').strip()[:255]
        setattr(obj, f, v)


def _crud(request, model, fields, payload, obj=None, required=('name',)):
    if not is_admin(request.user):
        return _err('Only the office can manage transport.', 403)
    if request.method == 'DELETE':
        in_use = obj.routes.exists() if isinstance(obj, Vehicle) else (obj.driven_routes.exists() or obj.attended_routes.exists())
        if in_use:
            return _err('This is used on a route. Take it off the route first, or mark it inactive.')
        obj.delete()
        return Response(status=204)
    obj = obj or model(tenant=_school(request))
    try:
        _apply(obj, request.data, fields)
    except ValueError as exc:
        return _err(str(exc))
    for f in required:
        if not getattr(obj, f):
            return _err(f'{f.replace("_", " ").capitalize()} is required.')
    if model is TransportStaff and 'user_email' in request.data:
        from django.contrib.auth import get_user_model

        email = str(request.data.get('user_email') or '').strip()
        obj.user = get_user_model().objects.filter(email__iexact=email).first() if email else None
        if email and obj.user is None:
            return _err(f'No login exists for {email}. Create the account first, or leave this blank.')
    obj.save()
    if model is TransportStaff and obj.user_id and obj.tenant_id:
        # The crew's login must belong to this school to run its trips.
        from services.core.tenants.models import TenantMembership

        TenantMembership.objects.get_or_create(user=obj.user, school=obj.tenant,
                                               defaults={'role': 'staff', 'is_primary': not TenantMembership.objects.filter(user=obj.user).exists()})
    return Response(payload(obj), status=201 if request.method == 'POST' else 200)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def vehicles(request):
    if request.method == 'POST':
        return _crud(request, Vehicle, VEHICLE_FIELDS, _vehicle_payload, required=('name', 'registration_no'))
    if not is_admin(request.user):
        return _err('Only the office can see vehicles.', 403)
    return Response([_vehicle_payload(v) for v in Vehicle.objects.all()])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def vehicle_detail(request, vehicle_id):
    return _crud(request, Vehicle, VEHICLE_FIELDS, _vehicle_payload, get_object_or_404(Vehicle, pk=vehicle_id), ('name', 'registration_no'))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def staff(request):
    if request.method == 'POST':
        return _crud(request, TransportStaff, STAFF_FIELDS, _staff_payload)
    if not is_admin(request.user):
        return _err('Only the office can see transport staff.', 403)
    return Response([_staff_payload(s) for s in TransportStaff.objects.select_related('user')])


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def staff_detail(request, staff_id):
    return _crud(request, TransportStaff, STAFF_FIELDS, _staff_payload, get_object_or_404(TransportStaff, pk=staff_id))


# ---------------------------------------------------------------------------
# Routes and stops
# ---------------------------------------------------------------------------

def _route_from(request, r: Route):
    for f in ('name', 'code', 'notes'):
        if f in request.data:
            setattr(r, f, str(request.data[f] or '').strip()[:255])
    if 'monthly_fee' in request.data:
        fee = _money(request.data['monthly_fee'])
        if fee is None:
            raise ValueError('The monthly fee must be a number.')
        r.monthly_fee = fee
    if 'is_active' in request.data:
        r.is_active = str(request.data['is_active']).lower() in ('1', 'true', 'yes', 'on')
    for f, model, role in (('vehicle_id', Vehicle, None), ('driver_id', TransportStaff, 'driver'), ('attendant_id', TransportStaff, 'attendant')):
        if f not in request.data:
            continue
        ref = request.data[f]
        if not ref:
            setattr(r, f, None)
            continue
        obj = model.objects.filter(pk=ref).first()
        if obj is None:
            raise ValueError(f'{f[:-3].capitalize()} not found.')
        setattr(r, f, obj.pk)
    if not r.name:
        raise ValueError('A route needs a name.')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def routes(request):
    if request.method == 'POST':
        if not is_admin(request.user):
            return _err('Only the office can add routes.', 403)
        r = Route(tenant=_school(request))
        try:
            _route_from(request, r)
        except ValueError as exc:
            return _err(str(exc))
        r.save()
        return Response(_route_payload(r), status=201)
    qs = Route.objects.select_related('vehicle', 'driver', 'attendant').prefetch_related('stops')
    if not is_admin(request.user):
        qs = qs.filter(id__in=_crew_route_ids(request.user))
    return Response([_route_payload(r) for r in qs])


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def route_detail(request, route_id):
    r = get_object_or_404(Route.objects.select_related('vehicle', 'driver', 'attendant'), pk=route_id)
    if request.method == 'GET':
        if not _can_run(request.user, r):
            return _err('Route not found.', 404)
        out = _route_payload(r)
        out['rider_list'] = [_rider_payload(x) for x in _riding(r, _today()).select_related('route')]
        return Response(out)
    if not is_admin(request.user):
        return _err('Only the office can change routes.', 403)
    if request.method == 'DELETE':
        if Rider.objects.filter(route=r).exists() or Trip.objects.filter(route=r).exists():
            return _err('This route has riders or trips on record. Mark it inactive instead.')
        r.delete()
        return Response(status=204)
    try:
        _route_from(request, r)
    except ValueError as exc:
        return _err(str(exc))
    r.save()
    return Response(_route_payload(r))


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def route_stops(request, route_id):
    """Replace a route's stops, in order: ``[{id?, name, address, morning_time, afternoon_time, latitude, longitude}]``.
    Stops that keep their id keep their riders; a stop that still has riders cannot be removed."""
    if not is_admin(request.user):
        return _err('Only the office can change stops.', 403)
    r = get_object_or_404(Route, pk=route_id)
    rows = request.data.get('stops') if isinstance(request.data, dict) else request.data
    if not isinstance(rows, list):
        return _err('Send the list of stops.')
    keep = {str(x.get('id')) for x in rows if x.get('id')}
    existing = {str(s.id): s for s in r.stops.all()}
    gone = [s for sid, s in existing.items() if sid not in keep]
    for s in gone:
        if Rider.objects.filter(Q(pickup_stop=s) | Q(dropoff_stop=s), Q(end_date__isnull=True) | Q(end_date__gte=_today())).exists():
            return _err(f'Students still use the stop "{s.name}". Move them to another stop first.')
    with transaction.atomic():
        for s in gone:
            s.delete()
        for i, row in enumerate(rows):
            name = str(row.get('name') or '').strip()
            if not name:
                return _err(f'Stop {i + 1} needs a name.')
            s = existing.get(str(row.get('id'))) or Stop(tenant=r.tenant, route=r)
            s.name, s.address, s.order = name[:120], str(row.get('address') or '')[:255], i + 1
            s.morning_time, s.afternoon_time = _time(row.get('morning_time')), _time(row.get('afternoon_time'))
            for f in ('latitude', 'longitude'):
                try:
                    setattr(s, f, Decimal(str(row[f])) if row.get(f) not in (None, '') else None)
                except InvalidOperation:
                    setattr(s, f, None)
            s.save()
    return Response([_stop_payload(s) for s in r.stops.all()])


# ---------------------------------------------------------------------------
# Riders
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def riders(request):
    from services.education.students.models import Student

    if not is_admin(request.user):
        return _err('Only the office can manage riders.', 403)
    if request.method == 'GET':
        today = _today()
        qs = Rider.objects.filter(Q(end_date__isnull=True) | Q(end_date__gte=today)).select_related(
            'student__current_class', 'route', 'pickup_stop', 'dropoff_stop')
        if request.query_params.get('route'):
            qs = qs.filter(route_id=request.query_params['route'])
        if request.query_params.get('q'):
            q = request.query_params['q']
            qs = qs.filter(Q(student__full_name__icontains=q) | Q(student__student_id__icontains=q))
        return Response([_rider_payload(x) for x in qs[:500]])

    s = Student.objects.filter(pk=request.data.get('student_id'), is_active=True).first()
    r = Route.objects.select_related('vehicle').filter(pk=request.data.get('route_id')).first()
    if s is None or r is None:
        return _err('Choose a student and a route.', 404)
    start = _date(request.data.get('start_date'), _today())
    stops = {str(x.id): x for x in r.stops.all()}
    pick, drop = stops.get(str(request.data.get('pickup_stop_id') or '')), stops.get(str(request.data.get('dropoff_stop_id') or ''))
    direction = request.data.get('direction') if request.data.get('direction') in dict(Rider.DIRECTIONS) else 'both'
    if direction in ('both', 'morning') and pick is None:
        return _err('Choose the stop where the student is picked up.')
    if direction in ('both', 'afternoon') and drop is None:
        drop = pick
        if drop is None:
            return _err('Choose the stop where the student is dropped off.')
    current = Rider.objects.filter(student=s).filter(Q(end_date__isnull=True) | Q(end_date__gte=start)).first()
    if r.vehicle_id and (current is None or current.route_id != r.id):
        if _riding(r, start).count() >= r.vehicle.capacity:
            return _err(f'{r.vehicle.name} is full ({r.vehicle.capacity} seats).')
    with transaction.atomic():
        if current:
            if current.start_date >= start:
                current.delete()
            else:
                current.end_date = start - timedelta(days=1)
                current.save(update_fields=['end_date'])
        x = Rider.objects.create(tenant=s.tenant, student=s, route=r, pickup_stop=pick if direction != 'afternoon' else None,
                                 dropoff_stop=drop if direction != 'morning' else None, direction=direction, start_date=start,
                                 monthly_fee=_money(request.data.get('monthly_fee')), notes=str(request.data.get('notes') or '')[:255])
    x = Rider.objects.select_related('student__current_class', 'route', 'pickup_stop', 'dropoff_stop').get(pk=x.pk)
    return Response(_rider_payload(x), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def rider_detail(request, rider_id):
    if not is_admin(request.user):
        return _err('Only the office can manage riders.', 403)
    x = get_object_or_404(Rider.objects.select_related('student__current_class', 'route', 'pickup_stop', 'dropoff_stop'), pk=rider_id)
    if request.method == 'DELETE':
        end = _date(request.query_params.get('end_date'), _today())
        if end < x.start_date:
            x.delete()
        else:
            x.end_date = end
            x.save(update_fields=['end_date'])
        return Response(status=204)
    stops = {str(s.id): s for s in x.route.stops.all()}
    if 'pickup_stop_id' in request.data:
        x.pickup_stop = stops.get(str(request.data['pickup_stop_id'] or ''))
    if 'dropoff_stop_id' in request.data:
        x.dropoff_stop = stops.get(str(request.data['dropoff_stop_id'] or ''))
    if request.data.get('direction') in dict(Rider.DIRECTIONS):
        x.direction = request.data['direction']
    if 'monthly_fee' in request.data:
        x.monthly_fee = _money(request.data['monthly_fee'])
    if 'notes' in request.data:
        x.notes = str(request.data['notes'] or '')[:255]
    x.save()
    return Response(_rider_payload(x))


# ---------------------------------------------------------------------------
# Trips: today's board, the manifest, running a trip
# ---------------------------------------------------------------------------

def _trip(route, day, kind, create=False):
    t = Trip.objects.filter(route=route, date=day, kind=kind).first()
    if t is None and create:
        try:
            t = Trip.objects.create(tenant=route.tenant, route=route, date=day, kind=kind)
        except IntegrityError:
            t = Trip.objects.get(route=route, date=day, kind=kind)
    return t


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today(request):
    """Every route's two trips for a day with counts; the crew sees only their routes."""
    day = _date(request.query_params.get('date'), _today())
    qs = Route.objects.filter(is_active=True).select_related('vehicle', 'driver', 'attendant')
    if not is_admin(request.user):
        qs = qs.filter(id__in=_crew_route_ids(request.user))
    out = []
    for r in qs:
        trips = []
        for kind in ('morning', 'afternoon'):
            t = _trip(r, day, kind)
            riding = list(_riding(r, day, kind))
            events = TripEvent.objects.filter(trip=t) if t else TripEvent.objects.none()
            ev = {(e.student_id, e.event) for e in events}
            trips.append({**_trip_payload(t, kind), 'riders': len(riding),
                          'absent': sum(1 for x in riding if _absent(x.student, day)),
                          'boarded': sum(1 for x in riding if (x.student_id, 'boarded') in ev),
                          'dropped': sum(1 for x in riding if (x.student_id, 'dropped') in ev),
                          'no_show': sum(1 for x in riding if (x.student_id, 'no_show') in ev)})
        out.append({'route': {'id': str(r.id), 'name': r.name, 'vehicle': r.vehicle.name if r.vehicle_id else '',
                              'driver': r.driver.name if r.driver_id else '', 'driver_phone': r.driver.phone if r.driver_id else ''},
                    'trips': trips})
    return Response({'date': day.isoformat(), 'routes': out})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def manifest(request, route_id):
    """Who should be on this trip, stop by stop, with who may collect them and whether they are absent today."""
    from services.education.students.models import StudentGuardian

    r = get_object_or_404(Route.objects.select_related('vehicle', 'driver', 'attendant'), pk=route_id)
    if not _can_run(request.user, r):
        return _err('Route not found.', 404)
    day = _date(request.query_params.get('date'), _today())
    kind = request.query_params.get('kind') if request.query_params.get('kind') in ('morning', 'afternoon') else 'morning'
    t = _trip(r, day, kind)
    events = {}
    for e in (TripEvent.objects.filter(trip=t).select_related('stop') if t else []):
        events.setdefault(e.student_id, {})[e.event] = timezone.localtime(e.at).strftime('%H:%M')
    rows = []
    for x in _riding(r, day, kind):
        stop = x.pickup_stop if kind == 'morning' else x.dropoff_stop
        links = StudentGuardian.objects.filter(student=x.student).select_related('guardian')
        rows.append({
            'rider_id': str(x.id), 'student': {'id': str(x.student.id), 'full_name': x.student.full_name,
                                               'class_name': x.student.current_class.name if x.student.current_class_id else ''},
            'stop': _stop_payload(stop) if stop else None, 'absent': _absent(x.student, day),
            'events': events.get(x.student.id, {}), 'notes': x.notes,
            'may_collect': [{'name': l.guardian.full_name, 'relationship': l.guardian.get_relationship_display(),
                             'phone': l.guardian.mobile_phone} for l in links if l.can_pickup],
            'may_not_collect': [l.guardian.full_name for l in links if not l.can_pickup],
            'contacts': [{'name': l.guardian.full_name, 'phone': l.guardian.mobile_phone} for l in links
                         if l.is_emergency_contact and l.guardian.mobile_phone][:3],
        })
    rows.sort(key=lambda row: (row['stop']['order'] if row['stop'] else 999, row['student']['full_name']))
    return Response({'route': _route_payload(r, day), 'date': day.isoformat(), 'kind': kind, 'trip': _trip_payload(t, kind),
                     'students': rows})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trip_action(request, route_id):
    """``{kind, action: start|delay|complete, minutes?, note?}`` for today's trip. Families of today's riders are told."""
    r = get_object_or_404(Route.objects.select_related('vehicle'), pk=route_id)
    if not _can_run(request.user, r):
        return _err('Only the office or this route’s crew can run its trips.', 403)
    kind = request.data.get('kind')
    action = request.data.get('action')
    if kind not in ('morning', 'afternoon') or action not in ('start', 'delay', 'complete'):
        return _err('Choose the trip and what happened.')
    day = _today()
    t = _trip(r, day, kind, create=True)
    bus = r.vehicle.name if r.vehicle_id else r.name
    to = 'school' if kind == 'morning' else 'home'
    title, msg = None, None
    if action == 'start':
        if t.status != 'not_started':
            return _err('This trip has already started.')
        t.status, t.started_at = 'en_route', timezone.now()
        title, msg = 'School transport on the way', f'{bus} ({r.name}) has left for {to}.'
    elif action == 'delay':
        try:
            t.delay_minutes = max(int(request.data.get('minutes') or 0), 0)
        except (TypeError, ValueError):
            return _err('Say how many minutes late.')
        t.note = str(request.data.get('note') or '')[:255]
        title = 'School transport delayed'
        msg = f'{bus} ({r.name}) is running about {t.delay_minutes} minutes late{": " + t.note if t.note else "."}'
    else:
        if t.status == 'completed':
            return _err('This trip is already completed.')
        t.status, t.completed_at = 'completed', timezone.now()
        if t.started_at is None:
            t.started_at = t.completed_at
    t.save()
    told = 0
    if title:
        # One notice per person, naming all of their children on this trip (brothers and sisters share a bus).
        from services.core.user_notifications.utils import create_user_notification

        children = {}
        for x in _riding(r, day, kind):
            if not _absent(x.student, day):
                for u in _family_users(x.student):
                    children.setdefault(u, []).append(x.student.full_name.split(' ')[0])
        for u, names in children.items():
            create_user_notification(u, title, f'{msg} ({", ".join(names)})', 'system')
        told = len(children)
    return Response({**_trip_payload(t, kind), 'people_told': told})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def trip_event(request, trip_id):
    """POST ``{student_id, event: boarded|dropped|no_show}``; DELETE ``?student_id=&event=`` to undo a mistake."""
    t = get_object_or_404(Trip.objects.select_related('route__vehicle'), pk=trip_id)
    if not _can_run(request.user, t.route):
        return _err('Only the office or this route’s crew can mark riders.', 403)
    sid = request.data.get('student_id') if request.method == 'POST' else request.query_params.get('student_id')
    event = request.data.get('event') if request.method == 'POST' else request.query_params.get('event')
    if event not in dict(TripEvent.EVENTS):
        return _err('Choose got on, dropped off or not at the stop.')
    x = _riding(t.route, t.date, t.kind).filter(student_id=sid).first()
    if x is None:
        return _err('This student is not on this trip.', 404)
    if request.method == 'DELETE':
        TripEvent.objects.filter(trip=t, student=x.student, event=event).delete()
        return Response(status=204)
    if t.status == 'not_started':
        t.status, t.started_at = 'en_route', timezone.now()
        t.save(update_fields=['status', 'started_at'])
    stop = x.pickup_stop if t.kind == 'morning' else x.dropoff_stop
    if event == 'no_show':
        TripEvent.objects.filter(trip=t, student=x.student, event='boarded').delete()
    elif event == 'boarded':
        TripEvent.objects.filter(trip=t, student=x.student, event='no_show').delete()
    e, created = TripEvent.objects.get_or_create(trip=t, student=x.student, event=event,
                                                 defaults={'tenant': t.tenant, 'stop': stop, 'by': request.user})
    if created:
        now = timezone.localtime(e.at).strftime('%H:%M')
        bus = t.route.vehicle.name if t.route.vehicle_id else t.route.name
        name = x.student.full_name
        texts = {
            ('boarded', 'morning'): (f'{name} got on the bus', f'{name} got on {bus} at {now}{" at " + stop.name if stop else ""}.'),
            ('boarded', 'afternoon'): (f'{name} is on the way home', f'{name} got on {bus} at school at {now}.'),
            ('dropped', 'morning'): (f'{name} arrived at school', f'{name} arrived at school on {bus} at {now}.'),
            ('dropped', 'afternoon'): (f'{name} was dropped off', f'{name} was dropped off{" at " + stop.name if stop else ""} at {now}.'),
            ('no_show', 'morning'): (f'{name} was not at the bus stop', f'{bus} did not pick up {name} this morning: they were not at {stop.name if stop else "the stop"}.'),
            ('no_show', 'afternoon'): (f'{name} did not take the bus home', f'{name} did not get on {bus} after school today.'),
        }
        title, msg = texts[(event, t.kind)]
        _tell_family(x.student, title, msg)
    return Response({'student_id': str(x.student.id), 'event': event, 'at': timezone.localtime(e.at).strftime('%H:%M'),
                     'created': created}, status=201 if created else 200)


# ---------------------------------------------------------------------------
# Families
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mine(request):
    """Each of my children (or me, for a student): route, stops and times, vehicle, crew, and today's trips."""
    from services.education.students.models import Student

    if get_user_role(request.user) not in ('parent', 'student'):
        return Response({'children': []})
    day = _today()
    out = []
    for s in filter_students_for_user(request.user, Student.objects.filter(is_active=True)).order_by('full_name'):
        x = Rider.objects.filter(student=s, start_date__lte=day).filter(Q(end_date__isnull=True) | Q(end_date__gte=day)) \
            .select_related('route__vehicle', 'route__driver', 'route__attendant', 'pickup_stop', 'dropoff_stop').first()
        if x is None:
            out.append({'student': {'id': str(s.id), 'full_name': s.full_name}, 'rider': None})
            continue
        r = x.route
        trips = []
        for kind in ('morning', 'afternoon'):
            if kind == 'morning' and x.direction == 'afternoon' or kind == 'afternoon' and x.direction == 'morning':
                continue
            t = _trip(r, day, kind)
            ev = {e.event: timezone.localtime(e.at).strftime('%H:%M') for e in TripEvent.objects.filter(trip=t, student=s)} if t else {}
            trips.append({**_trip_payload(t, kind), 'events': ev})
        out.append({
            'student': {'id': str(s.id), 'full_name': s.full_name}, 'rider': _rider_payload(x),
            'route': {'name': r.name, 'code': r.code},
            'vehicle': {'name': r.vehicle.name, 'registration_no': r.vehicle.registration_no, 'kind': r.vehicle.get_kind_display()} if r.vehicle_id else None,
            'driver': {'name': r.driver.name, 'phone': r.driver.phone} if r.driver_id else None,
            'attendant': {'name': r.attendant.name, 'phone': r.attendant.phone} if r.attendant_id else None,
            'absent_today': _absent(s, day), 'trips': trips,
        })
    return Response({'date': day.isoformat(), 'children': out})


# ---------------------------------------------------------------------------
# Billing and report
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invoices(request):
    """``{month: 'YYYY-MM', due_date?, route_id?}``: a transport invoice for every rider that month (once per month)."""
    from services.education.finance.models import Invoice

    if not is_admin(request.user):
        return _err('Only the office can bill transport.', 403)
    first = _date(f"{request.data.get('month', '')}-01")
    if first is None:
        return _err('Choose the month, e.g. 2026-10.')
    last = date(first.year + (first.month == 12), first.month % 12 + 1, 1) - timedelta(days=1)
    due = _date(request.data.get('due_date'), first.replace(day=10))
    qs = Rider.objects.filter(start_date__lte=last).filter(Q(end_date__isnull=True) | Q(end_date__gte=first)) \
        .select_related('student', 'route')
    if request.data.get('route_id'):
        qs = qs.filter(route_id=request.data['route_id'])
    made, skipped, free = 0, 0, 0
    seen = set()
    for x in qs:
        if x.student_id in seen:
            continue
        seen.add(x.student_id)
        fee = x.monthly_fee if x.monthly_fee is not None else x.route.monthly_fee
        if not fee:
            free += 1
            continue
        if Invoice.objects.filter(student=x.student, invoice_type='transport', invoice_month=first).exclude(status='cancelled').exists():
            skipped += 1
            continue
        Invoice.objects.create(student=x.student, invoice_type='transport', amount=fee, due_date=due, invoice_month=first,
                               status='issued', description=f'Transport – {x.route.name} – {first:%B %Y}',
                               breakdown={'transport': str(fee), 'route': x.route.name})
        made += 1
    return Response({'created': made, 'already_billed': skipped, 'no_fee': free, 'month': first.isoformat()[:7]}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    if not is_admin(request.user):
        return _err('Only the office can see transport reports.', 403)
    today = _today()
    since = today - timedelta(days=30)
    route_rows = []
    monthly = Decimal('0')
    for r in Route.objects.filter(is_active=True).select_related('vehicle'):
        riding = list(_riding(r, today).select_related('route'))
        fees = sum(((x.monthly_fee if x.monthly_fee is not None else r.monthly_fee) for x in riding), Decimal('0'))
        monthly += fees
        cap = r.vehicle.capacity if r.vehicle_id else None
        route_rows.append({'id': str(r.id), 'name': r.name, 'vehicle': r.vehicle.name if r.vehicle_id else '', 'capacity': cap,
                           'riders': len(riding), 'full_percent': round(len(riding) * 100 / cap) if cap else None,
                           'monthly_fees': float(fees), 'stops': r.stops.count()})
    trips = Trip.objects.filter(date__gte=since, date__lte=today)
    delayed = trips.filter(delay_minutes__gt=0)
    expiring = [{'what': f"{v['name']} ({v['registration_no']})", 'items': v['expiring']}
                for v in (_vehicle_payload(v, today) for v in Vehicle.objects.filter(is_active=True)) if v['expiring']]
    expiring += [{'what': s['name'], 'items': s['expiring']}
                 for s in (_staff_payload(s, today) for s in TransportStaff.objects.filter(is_active=True)) if s['expiring']]
    return Response({
        'routes': route_rows, 'riders': sum(r['riders'] for r in route_rows), 'monthly_fees': float(monthly),
        'trips_30_days': trips.count(), 'completed_30_days': trips.filter(status='completed').count(),
        'delayed_30_days': delayed.count(),
        'average_delay': round(sum(delayed.values_list('delay_minutes', flat=True)) / delayed.count(), 1) if delayed.exists() else 0,
        'no_shows_30_days': TripEvent.objects.filter(trip__in=trips, event='no_show').count(),
        'expiring': expiring,
    })
