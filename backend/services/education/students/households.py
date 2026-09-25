"""Households, guardians and health records: serializers, API views and helpers.

Read access follows the student (admin, the student's teachers, linked parents,
the student). Changes are limited to school administrators.
"""
from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from services.core.accounts.decorators import ensure_student_access, is_admin

from .models import Guardian, Household, Immunization, Student, StudentGuardian, StudentHealth


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean(value):
    return (value or '').strip()


def _split(name):
    parts = _clean(name).split(None, 1)
    return (parts[0], parts[1] if len(parts) > 1 else '') if parts else ('', '')


def find_student(identifier) -> Student | None:
    """Look a student up by UUID or by their school student number."""
    import uuid

    try:
        uuid.UUID(str(identifier))
        return Student.objects.filter(Q(id=identifier) | Q(student_id=identifier)).first()
    except (ValueError, TypeError):
        return Student.objects.filter(student_id=identifier).first()


def ensure_household(student: Student) -> Household | None:
    """Give a student created through the classic form a household and guardians.

    Uses the father/mother/guardian fields and groups siblings on the father's
    (or else mother's) national ID, exactly like the one-off migration did.
    Does nothing once the student already has a household.
    """
    if student.household_id:
        return student.household
    people = [
        ('father', student.father_name, student.father_mobile, student.father_national_id, student.father_occupation),
        ('mother', student.mother_name, student.mother_mobile, student.mother_national_id, student.mother_occupation),
    ]
    if _clean(student.guardian_name) and _clean(student.guardian_name) not in (
        _clean(student.father_name), _clean(student.mother_name)
    ):
        people.append(('legal_guardian', student.guardian_name, student.guardian_phone, '', ''))
    people = [p for p in people if _clean(p[1])]
    if not people:
        return None

    with transaction.atomic():
        household = None
        for field in ('father_national_id', 'mother_national_id'):
            nic = _clean(getattr(student, field))
            if nic:
                sibling = (Student.objects.filter(**{f'{field}__iexact': nic}, household__isnull=False)
                           .exclude(pk=student.pk).select_related('household').first())
                if sibling:
                    household = sibling.household
                    break
        if household is None:
            # Siblings who share a parent portal login belong together too.
            sibling = (Student.objects.filter(parents__in=student.parents.all(), household__isnull=False)
                       .exclude(pk=student.pk).select_related('household').first())
            if sibling:
                household = sibling.household
        if household is None:
            surname = _split(people[0][1])[1] or _clean(people[0][1])
            household = Household.objects.create(
                tenant_id=student.tenant_id,
                name=_clean(student.select_family) or f'{surname} family',
                address=student.address or '', city=student.city or '', state=student.state or '',
                postal_code=student.postal_code or '',
                phone=_clean(student.father_mobile) or _clean(student.mother_mobile) or _clean(student.guardian_phone),
            )
        Student.objects.filter(pk=student.pk).update(household=household)
        student.household = household

        for priority, (relationship, name, phone, nic, occupation) in enumerate(people, start=1):
            first, last = _split(name)
            guardian = household.guardians.filter(
                relationship=relationship, first_name__iexact=first, last_name__iexact=last,
            ).first()
            if guardian is None:
                guardian = Guardian.objects.create(
                    tenant_id=student.tenant_id, household=household, first_name=first, last_name=last,
                    relationship=relationship, mobile_phone=_clean(phone), national_id=_clean(nic),
                    occupation=_clean(occupation),
                )
            StudentGuardian.objects.get_or_create(
                student=student, guardian=guardian,
                defaults={'tenant_id': student.tenant_id, 'is_primary': priority == 1,
                          'receives_billing': priority == 1, 'priority': priority},
            )
    return household


def merge_households(keep: Household, others) -> Household:
    """Move students, guardians and credit from ``others`` into ``keep``; drop duplicate guardians."""
    from django.apps import apps

    AccountCredit = apps.get_model('education_finance', 'AccountCredit')
    with transaction.atomic():
        for other in others:
            if other.pk == keep.pk:
                continue
            Student.objects.filter(household=other).update(household=keep)
            AccountCredit.objects.filter(household=other).update(household=keep)
            for g in list(other.guardians.all()):
                twin = keep.guardians.filter(relationship=g.relationship, first_name__iexact=g.first_name,
                                             last_name__iexact=g.last_name).first()
                if twin is None:
                    g.household = keep
                    g.save(update_fields=['household'])
                    continue
                for link in g.student_links.all():
                    if twin.student_links.filter(student_id=link.student_id).exists():
                        link.delete()
                    else:
                        link.guardian = twin
                        link.save(update_fields=['guardian'])
                if not twin.email and g.email:
                    twin.email = g.email
                if not twin.mobile_phone and g.mobile_phone:
                    twin.mobile_phone = g.mobile_phone
                twin.save()
                g.delete()
            other.delete()
    return keep


def merge_households_sharing_a_parent_login() -> int:
    """One-off repair: children linked to the same parent login end up in one household."""
    from django.apps import apps

    from services.core.tenants.context import use_tenant

    ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
    merged = 0
    with use_tenant(None):  # a maintenance task across all schools
        for profile in ParentProfile.objects.all():
            ids = {pk for pk in profile.linked_students.values_list('household_id', flat=True) if pk}
            if len(ids) > 1:
                homes = sorted(Household.all_objects.filter(pk__in=ids), key=lambda h: h.created_at)
                merge_households(homes[0], homes[1:])
                merged += len(homes) - 1
    return merged


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

class GuardianSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    relationship_label = serializers.CharField(source='get_relationship_display', read_only=True)
    has_portal_login = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    class Meta:
        model = Guardian
        exclude = ['tenant', 'user']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_has_portal_login(self, obj):
        return bool(obj.user_id)

    def get_students(self, obj):
        return [
            {'id': str(link.student_id), 'full_name': link.student.full_name, 'student_id': link.student.student_id}
            for link in obj.student_links.select_related('student').all()
        ]


class StudentGuardianSerializer(serializers.ModelSerializer):
    guardian = GuardianSerializer(read_only=True)
    guardian_id = serializers.PrimaryKeyRelatedField(
        source='guardian', queryset=Guardian.objects.all(), write_only=True, required=False,
    )

    class Meta:
        model = StudentGuardian
        exclude = ['tenant', 'student']
        read_only_fields = ['id', 'created_at', 'updated_at']


class HouseholdSerializer(serializers.ModelSerializer):
    students = serializers.SerializerMethodField()
    guardians = serializers.SerializerMethodField()
    billing_balance = serializers.SerializerMethodField()

    class Meta:
        model = Household
        exclude = ['tenant']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_students(self, obj):
        return [
            {'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
             'class_name': s.current_class.name if s.current_class_id else '', 'is_active': s.is_active}
            for s in obj.students.select_related('current_class').all()
        ]

    def get_guardians(self, obj):
        return [
            {'id': str(g.id), 'full_name': g.full_name, 'relationship': g.relationship,
             'relationship_label': g.get_relationship_display(), 'mobile_phone': g.mobile_phone, 'email': g.email}
            for g in obj.guardians.all()
        ]

    def get_billing_balance(self, obj):
        if not self.context.get('with_balance'):
            return None
        from services.education.finance.models import Invoice

        return float(sum(
            inv.balance_due or 0
            for inv in Invoice.objects.filter(student__household=obj).exclude(status='cancelled')
        ))


class StudentHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentHealth
        exclude = ['tenant', 'student']
        read_only_fields = ['id', 'updated_at']


class ImmunizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Immunization
        exclude = ['tenant', 'student']
        read_only_fields = ['id', 'created_at']


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

class AdminWritesOnly(BasePermission):
    message = 'Only school administrators can change family and health records.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or is_admin(request.user)


class AdminOnly(BasePermission):
    message = 'Only school administrators can see all households.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))


def _student_or_404(request, student_id) -> Student:
    student = find_student(student_id)
    if not student or not ensure_student_access(request.user, student):
        from django.http import Http404

        raise Http404('Student not found')
    return student


# ---------------------------------------------------------------------------
# Households and guardians (school-wide lists: admins)
# ---------------------------------------------------------------------------

class HouseholdListCreateView(generics.ListCreateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = HouseholdSerializer

    def get_queryset(self):
        qs = Household.objects.prefetch_related('students__current_class', 'guardians')
        q = _clean(self.request.query_params.get('search'))
        if q:
            qs = qs.filter(
                Q(name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q)
                | Q(guardians__first_name__icontains=q) | Q(guardians__last_name__icontains=q)
                | Q(students__full_name__icontains=q) | Q(students__student_id__icontains=q)
            ).distinct()
        return qs


class HouseholdDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AdminOnly]
    serializer_class = HouseholdSerializer
    queryset = Household.objects.all()
    lookup_field = 'pk'

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'with_balance': True}


class GuardianListCreateView(generics.ListCreateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = GuardianSerializer

    def get_queryset(self):
        qs = Guardian.objects.prefetch_related('student_links__student')
        q = _clean(self.request.query_params.get('search'))
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
                | Q(mobile_phone__icontains=q) | Q(national_id__icontains=q)
            )
        household = self.request.query_params.get('household')
        if household:
            qs = qs.filter(household_id=household)
        return qs


class GuardianDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AdminOnly]
    serializer_class = GuardianSerializer
    queryset = Guardian.objects.all()


# ---------------------------------------------------------------------------
# One student's guardians, health and immunizations
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([AdminWritesOnly])
def student_guardians(request, id):
    """GET the student's guardians. POST links an existing guardian (guardian_id)
    or creates a new one from a nested ``guardian`` object."""
    student = _student_or_404(request, id)
    if request.method == 'GET':
        links = student.guardian_links.select_related('guardian').prefetch_related('guardian__student_links__student')
        return Response(StudentGuardianSerializer(links, many=True).data)

    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    new_guardian = data.pop('guardian', None)
    with transaction.atomic():
        if not student.household_id:
            household = Household.objects.create(
                tenant_id=student.tenant_id,
                name=f"{_split(student.full_name)[1] or student.full_name} family",
                address=student.address or '', city=student.city or '',
            )
            Student.objects.filter(pk=student.pk).update(household=household)
            student.household = household
        if new_guardian and not data.get('guardian_id'):
            gs = GuardianSerializer(data=new_guardian)
            gs.is_valid(raise_exception=True)
            guardian = gs.save(tenant_id=student.tenant_id, household=student.household)
            data['guardian_id'] = str(guardian.pk)
        if not data.get('guardian_id'):
            return Response({'error': 'Choose an existing guardian or enter a new one.'}, status=400)
        if student.guardian_links.filter(guardian_id=data['guardian_id']).exists():
            return Response({'error': 'This guardian is already linked to the student.'}, status=400)
        serializer = StudentGuardianSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('is_primary'):
            student.guardian_links.update(is_primary=False)
        link = serializer.save(student=student, tenant_id=student.tenant_id)
    return Response(StudentGuardianSerializer(link).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([AdminWritesOnly])
def student_guardian_detail(request, id, link_id):
    student = _student_or_404(request, id)
    link = get_object_or_404(StudentGuardian, pk=link_id, student=student)
    if request.method == 'DELETE':
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = StudentGuardianSerializer(link, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        if serializer.validated_data.get('is_primary'):
            student.guardian_links.exclude(pk=link.pk).update(is_primary=False)
        link = serializer.save()
    return Response(StudentGuardianSerializer(link).data)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([AdminWritesOnly])
def student_health(request, id):
    student = _student_or_404(request, id)
    health = StudentHealth.objects.filter(student=student).first()
    if request.method == 'GET':
        return Response(StudentHealthSerializer(health).data if health else StudentHealthSerializer().data)
    serializer = StudentHealthSerializer(health, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(student=student, tenant_id=student.tenant_id)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([AdminWritesOnly])
def student_immunizations(request, id):
    student = _student_or_404(request, id)
    if request.method == 'GET':
        return Response(ImmunizationSerializer(student.immunizations.all(), many=True).data)
    serializer = ImmunizationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(student=student, tenant_id=student.tenant_id)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([AdminWritesOnly])
def student_immunization_detail(request, id, imm_id):
    student = _student_or_404(request, id)
    record = get_object_or_404(Immunization, pk=imm_id, student=student)
    if request.method == 'DELETE':
        record.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ImmunizationSerializer(record, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AdminOnly])
def student_household(request, id):
    """Move a student into another household: {"household_id": "..."}."""
    student = _student_or_404(request, id)
    household = get_object_or_404(Household, pk=request.data.get('household_id'))
    Student.objects.filter(pk=student.pk).update(household=household)
    return Response(HouseholdSerializer(household).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_profile(request, id):
    """Everything the tabbed student page needs, in one request."""
    from services.education.attendance.models import AttendanceRecord
    from services.education.exams.models import ExamResult
    from services.education.finance.models import Invoice

    from .serializers import StudentSerializer

    student = _student_or_404(request, id)
    if not student.household_id and is_admin(request.user):
        ensure_household(student)

    records = AttendanceRecord.objects.filter(student=student).exclude(status='holiday')
    counts = {row: records.filter(status=row).count() for row in ('present', 'absent', 'late', 'excused')}
    total = records.count()

    invoices = list(Invoice.objects.filter(student=student).exclude(status='cancelled').order_by('-due_date'))
    balance = sum((inv.balance_due or 0) for inv in invoices)

    results = ExamResult.objects.filter(student=student).select_related('exam').order_by('-exam__exam_date')[:10]

    health = StudentHealth.objects.filter(student=student).first()
    siblings = []
    household = None
    if student.household_id:
        household = HouseholdSerializer(student.household).data
        siblings = [s for s in household['students'] if s['id'] != str(student.id)]

    links = student.guardian_links.select_related('guardian')
    return Response({
        'student': StudentSerializer(student).data,
        'household': household,
        'siblings': siblings,
        'guardians': StudentGuardianSerializer(links, many=True).data,
        'health': StudentHealthSerializer(health).data if health else None,
        'immunizations': ImmunizationSerializer(student.immunizations.all(), many=True).data,
        'attendance': {
            'total_days': total, **counts,
            'rate': round((counts['present'] + counts['late']) / total * 100, 1) if total else None,
            'recent': [{'date': r.date.isoformat(), 'status': r.status} for r in records.order_by('-date')[:30]],
        },
        'billing': {
            'balance_due': float(balance),
            'invoices': [
                {'id': str(inv.id), 'number': inv.invoice_number, 'due_date': inv.due_date.isoformat() if inv.due_date else None,
                 'amount': float(inv.amount or 0), 'paid': float(inv.paid_amount or 0),
                 'balance': float(inv.balance_due or 0), 'status': inv.status, 'description': inv.description}
                for inv in invoices[:12]
            ],
        },
        'results': [
            {'exam': r.exam.title, 'date': r.exam.exam_date.isoformat(), 'obtained': float(r.obtained_marks), 'percentage': float(r.percentage or 0),
             'grade': r.grade, 'passed': r.is_pass}
            for r in results
        ],
        'can_edit': is_admin(request.user),
    })
