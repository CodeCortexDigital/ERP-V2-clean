"""School transport: vehicles, drivers and attendants, routes with stops, riders, and each day's trips."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class Vehicle(TenantScopedModel):
    KINDS = [('bus', 'Bus'), ('coaster', 'Coaster'), ('van', 'Van'), ('car', 'Car')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=60, help_text='e.g. Bus 3')
    registration_no = models.CharField(max_length=30)
    kind = models.CharField(max_length=10, choices=KINDS, default='bus')
    capacity = models.PositiveSmallIntegerField(default=30)
    make_model = models.CharField(max_length=100, blank=True, default='')
    insurance_expiry = models.DateField(null=True, blank=True)
    fitness_expiry = models.DateField(null=True, blank=True, help_text='Road-worthiness / fitness certificate')
    notes = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']


class TransportStaff(TenantScopedModel):
    ROLES = [('driver', 'Driver'), ('attendant', 'Attendant')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=ROLES, default='driver')
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True, default='')
    licence_no = models.CharField(max_length=50, blank=True, default='')
    licence_expiry = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, blank=True, default='')
    # A login lets this person run their route's trips from a phone (start, boarded, dropped off).
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']


class Route(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text='e.g. Route 3 – Gulberg')
    code = models.CharField(max_length=20, blank=True, default='')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='routes')
    driver = models.ForeignKey(TransportStaff, on_delete=models.SET_NULL, null=True, blank=True, related_name='driven_routes')
    attendant = models.ForeignKey(TransportStaff, on_delete=models.SET_NULL, null=True, blank=True, related_name='attended_routes')
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    notes = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']


class Stop(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='stops')
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveSmallIntegerField(default=0)
    morning_time = models.TimeField(null=True, blank=True, help_text='Pick-up time on the way to school')
    afternoon_time = models.TimeField(null=True, blank=True, help_text='Drop-off time on the way home')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['route', 'order']


class Rider(TenantScopedModel):
    """A student's place on a route: where they are picked up and dropped off."""
    DIRECTIONS = [('both', 'To and from school'), ('morning', 'To school only'), ('afternoon', 'Home only')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='transport')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='riders')
    pickup_stop = models.ForeignKey(Stop, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    dropoff_stop = models.ForeignKey(Stop, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    direction = models.CharField(max_length=10, choices=DIRECTIONS, default='both')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                      help_text="Leave blank to use the route's fee")
    notes = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['route', 'student__full_name']


class Trip(TenantScopedModel):
    """One run of a route on one day: the morning run to school or the afternoon run home."""
    KINDS = [('morning', 'Morning (to school)'), ('afternoon', 'Afternoon (home)')]
    STATUSES = [('not_started', 'Not started'), ('en_route', 'On the way'), ('completed', 'Completed')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='trips')
    date = models.DateField(db_index=True)
    kind = models.CharField(max_length=10, choices=KINDS)
    status = models.CharField(max_length=12, choices=STATUSES, default='not_started')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    delay_minutes = models.PositiveSmallIntegerField(default=0)
    note = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['date', 'kind']
        constraints = [models.UniqueConstraint(fields=['route', 'date', 'kind'], name='uniq_transport_trip')]


class TripEvent(TenantScopedModel):
    """A student got on, got off, or was not at the stop."""
    EVENTS = [('boarded', 'Got on'), ('dropped', 'Dropped off'), ('no_show', 'Not at the stop')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='events')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='+')
    event = models.CharField(max_length=10, choices=EVENTS)
    stop = models.ForeignKey(Stop, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)
    by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['at']
        constraints = [models.UniqueConstraint(fields=['trip', 'student', 'event'], name='uniq_trip_event')]
