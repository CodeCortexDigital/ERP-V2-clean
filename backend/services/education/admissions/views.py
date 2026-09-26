"""Admissions: online applications, review workflow, enrolment and re-enrolment.

Public (no login): a school's application form, submitting it with documents and
an electronic signature, and checking progress with the application number and
tracking code. Everything else is for school administrators, except re-enrolment
answers, which linked parents give from their portal.
"""
import json
import logging
import uuid

from django.apps import apps
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.decorators import (
    api_view, authentication_classes, parser_classes, permission_classes, throttle_classes,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from services.core.accounts.decorators import is_admin
from services.core.tenants.context import use_tenant

from .models import (
    Applicant, Application, ApplicationDocument, ApplicationEvent, ReEnrollmentCampaign, ReEnrollmentResponse,
)
from .serializers import ApplicantSerializer, ApplicationSerializer

logger = logging.getLogger(__name__)

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
School = apps.get_model('core_tenants', 'School')

DEFAULT_DOCUMENTS = ['Birth certificate', 'Recent report card', 'Passport-size photo']
DEFAULT_DECLARATION = (
    'I confirm that the information in this application is true and complete, and that I am the '
    "student's parent or legal guardian."
)
# Allowed moves in the review pipeline.
TRANSITIONS = {
    'pending': {'reviewing', 'approved', 'rejected', 'waitlisted', 'withdrawn'},
    'reviewing': {'approved', 'rejected', 'waitlisted', 'withdrawn', 'pending'},
    'waitlisted': {'approved', 'rejected', 'withdrawn', 'reviewing'},
    'approved': {'waitlisted', 'rejected', 'withdrawn', 'reviewing'},
    'rejected': {'reviewing'},
    'withdrawn': {'reviewing'},
    'enrolled': set(),
}
STATUS_MESSAGES = {
    'pending': 'We have received the application. The school will review it soon.',
    'reviewing': 'The school is reviewing the application.',
    'approved': 'Good news: the application has been accepted. The school will contact you about enrolment.',
    'waitlisted': 'The application is on the waiting list. The school will contact you if a place opens.',
    'rejected': 'The school was unable to offer a place this time.',
    'enrolled': 'The student is enrolled. Welcome to the school!',
    'withdrawn': 'The application was withdrawn.',
}


class AdminOnly(BasePermission):
    message = 'Only school administrators can manage admissions.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_admin(request.user))


class ApplyThrottle(AnonRateThrottle):
    scope = 'admission_apply'
    rate = '20/hour'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _settings(school):
    raw = dict((school.settings_json or {}).get('admissions') or {})
    return {
        'online_open': bool(raw.get('online_open', False)),
        'academic_year': raw.get('academic_year') or '',
        'intro': raw.get('intro') or '',
        'required_documents': raw.get('required_documents') or list(DEFAULT_DOCUMENTS),
        'declaration': raw.get('declaration') or DEFAULT_DECLARATION,
        'notify_email': raw.get('notify_email') or '',
    }


def _log(application, to_status='', note='', user=None, from_status=None, by_name=''):
    ApplicationEvent.objects.create(
        application=application,
        from_status=application.status if from_status is None else from_status,
        to_status=to_status, note=note, by=user if getattr(user, 'is_authenticated', False) else None,
        by_name=by_name or (getattr(user, 'full_name', '') or getattr(user, 'email', '') if user else ''),
    )


def _email(to, subject, body):
    if not to:
        return
    try:
        send_mail(subject, body, None, [to], fail_silently=True)
    except Exception:  # never block admissions on mail problems
        logger.exception('Admissions email failed')


def _client_ip(request):
    from services.core.security.policy import client_ip

    return client_ip(request)


def _public_school(slug):
    with use_tenant(None):
        return School.objects.filter(Q(subdomain__iexact=slug) | Q(tenant_code__iexact=slug), is_active=True).first()


def _doc_payload(doc, request=None):
    url = doc.file.url if doc.file else ''
    if request is not None and url and not url.startswith('http'):
        url = request.build_absolute_uri(url)
    return {'id': str(doc.id), 'doc_type': doc.doc_type, 'name': doc.original_name, 'size': doc.size,
            'url': url, 'uploaded_at': doc.uploaded_at}


def _save_documents(application, files):
    """Store uploaded files named ``doc:<type>`` (or ``documents``) after checking type and size."""
    from services.core.storage.utils import validate_upload

    saved = []
    for key in files:
        if not (key.startswith('doc:') or key == 'documents'):
            continue
        for f in files.getlist(key):
            try:
                info = validate_upload(f, f.name, declared_content_type=getattr(f, 'content_type', None))
            except DjangoValidationError as exc:
                raise serializers.ValidationError({'documents': exc.messages})
            saved.append(ApplicationDocument.objects.create(
                application=application, doc_type=(key[4:] if key.startswith('doc:') else 'Other')[:60] or 'Other',
                file=f, original_name=info.name, size=info.size,
            ))
    return saved


class OnlineApplicationSerializer(serializers.Serializer):
    """What the public form sends (JSON in the ``data`` field of a multipart request)."""
    GENDERS = {'male': 'M', 'female': 'F', 'other': 'O', 'm': 'M', 'f': 'F', 'o': 'O'}

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    date_of_birth = serializers.DateField()
    gender = serializers.CharField(max_length=10)
    applying_for_class = serializers.CharField(max_length=50)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    home_language = serializers.CharField(max_length=50, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    previous_school = serializers.CharField(max_length=200, required=False, allow_blank=True)
    previous_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    medical_notes = serializers.CharField(required=False, allow_blank=True)
    special_needs = serializers.CharField(required=False, allow_blank=True)
    sibling_at_school = serializers.CharField(max_length=200, required=False, allow_blank=True)
    guardians = serializers.ListField(child=serializers.DictField(), min_length=1, max_length=4)
    signature_name = serializers.CharField(max_length=200)
    agree_declaration = serializers.BooleanField()
    agree_privacy = serializers.BooleanField()
    consent_photos = serializers.BooleanField(required=False, default=False)

    def validate_gender(self, value):
        g = self.GENDERS.get(value.strip().lower())
        if not g:
            raise serializers.ValidationError('Choose male, female or other.')
        return g

    def validate_guardians(self, value):
        cleaned = []
        for g in value:
            first = str(g.get('first_name', '')).strip()
            if not first:
                raise serializers.ValidationError('Each parent or guardian needs a first name.')
            cleaned.append({
                'first_name': first[:100], 'last_name': str(g.get('last_name', '')).strip()[:100],
                'relationship': str(g.get('relationship', 'other'))[:20] or 'other',
                'email': str(g.get('email', '')).strip()[:254], 'mobile_phone': str(g.get('mobile_phone', '')).strip()[:30],
                'occupation': str(g.get('occupation', '')).strip()[:100],
                'lives_with': bool(g.get('lives_with', True)), 'has_custody': bool(g.get('has_custody', True)),
                'can_pickup': bool(g.get('can_pickup', True)), 'receives_billing': bool(g.get('receives_billing', False)),
            })
        if not any(g['email'] or g['mobile_phone'] for g in cleaned):
            raise serializers.ValidationError('Give an email address or phone number for at least one parent.')
        return cleaned

    def validate(self, attrs):
        if not attrs.get('agree_declaration') or not attrs.get('agree_privacy'):
            raise serializers.ValidationError('Please accept the declaration and the privacy notice.')
        return attrs


# ---------------------------------------------------------------------------
# Public: application form, submit, status
# ---------------------------------------------------------------------------

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def public_form(request, slug):
    school = _public_school(slug)
    if not school:
        return Response({'error': 'School not found.'}, status=404)
    cfg = _settings(school)
    with use_tenant(school):
        classes = list(SchoolClass.objects.order_by('name').values_list('name', flat=True))
    return Response({
        'school': {'name': (school.settings_json or {}).get('institute_name') or school.name, 'code': school.tenant_code},
        'open': cfg['online_open'],
        'academic_year': cfg['academic_year'],
        'intro': cfg['intro'],
        'classes': classes,
        'required_documents': cfg['required_documents'],
        'declaration': cfg['declaration'],
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ApplyThrottle])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def public_apply(request, slug):
    school = _public_school(slug)
    if not school:
        return Response({'error': 'School not found.'}, status=404)
    cfg = _settings(school)
    if not cfg['online_open']:
        return Response({'error': 'This school is not accepting online applications right now.'}, status=403)

    raw = request.data.get('data')
    try:
        payload = json.loads(raw) if isinstance(raw, str) else (raw or request.data)
    except ValueError:
        return Response({'error': 'The form could not be read. Please try again.'}, status=400)
    form = OnlineApplicationSerializer(data=payload)
    if not form.is_valid():
        return Response({'error': 'Please check the highlighted fields.', 'fields': form.errors}, status=400)
    d = form.validated_data

    contact = next((g for g in d['guardians'] if g['email']), d['guardians'][0])
    father = next((g for g in d['guardians'] if g['relationship'] == 'father'), None)
    mother = next((g for g in d['guardians'] if g['relationship'] == 'mother'), None)
    with use_tenant(school), transaction.atomic():
        applicant = Applicant.objects.create(
            tenant=school, full_name=f"{d['first_name']} {d['last_name']}".strip(),
            email=contact['email'] or f'no-email+{uuid.uuid4().hex[:8]}@applicant.invalid',
            phone=contact['mobile_phone'], date_of_birth=d['date_of_birth'], gender=d['gender'],
            nationality=d.get('nationality', ''), home_language=d.get('home_language', ''),
            address=d.get('address', ''), city=d.get('city', ''), state=d.get('state', ''),
            postal_code=d.get('postal_code', ''), country=d.get('country', ''),
            father_name=f"{father['first_name']} {father['last_name']}".strip() if father else '',
            father_phone=father['mobile_phone'] if father else '',
            mother_name=f"{mother['first_name']} {mother['last_name']}".strip() if mother else '',
            mother_phone=mother['mobile_phone'] if mother else '',
            guardians=d['guardians'], previous_school=d.get('previous_school', ''),
            previous_class=d.get('previous_class', ''), applying_for_class=d['applying_for_class'],
            academic_year=cfg['academic_year'] or Applicant._meta.get_field('academic_year').default,
            medical_notes=d.get('medical_notes', ''), special_needs=d.get('special_needs', ''),
            sibling_at_school=d.get('sibling_at_school', ''),
        )
        application = Application.objects.create(
            applicant=applicant, academic_year=applicant.academic_year, source='online',
            signature_name=d['signature_name'], signed_at=timezone.now(), signature_ip=_client_ip(request),
            consents={'declaration': True, 'privacy': True, 'photos': d.get('consent_photos', False),
                      'declaration_text': cfg['declaration']},
        )
        _save_documents(application, request.FILES)
        _log(application, 'pending', 'Submitted online', from_status='', by_name=d['signature_name'])

    school_name = (school.settings_json or {}).get('institute_name') or school.name
    _email(contact['email'], f'Application received: {school_name}',
           f"Thank you for applying to {school_name}.\n\nApplication number: {application.application_no}\n"
           f"Tracking code: {application.tracking_token}\n\nKeep these to check the status of the application online.")
    _email(cfg['notify_email'], f'New online application {application.application_no}',
           f'{applicant.full_name} applied for {applicant.applying_for_class}.')
    return Response({'application_no': application.application_no, 'tracking_token': application.tracking_token,
                     'school': school_name}, status=201)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ApplyThrottle])
def public_status(request):
    number = (request.query_params.get('no') or '').strip()
    token = (request.query_params.get('token') or '').strip()
    if not number or not token:
        return Response({'error': 'Enter the application number and tracking code.'}, status=400)
    with use_tenant(None):
        app = Application.objects.select_related('applicant').filter(application_no__iexact=number,
                                                                      tracking_token=token).first()
        if not app:
            return Response({'error': 'No application matches that number and tracking code.'}, status=404)
        school = School.objects.filter(pk=app.applicant.tenant_id).first()
    return Response({
        'application_no': app.application_no, 'student': app.applicant.full_name,
        'applying_for': app.applicant.applying_for_class, 'status': app.status,
        'status_label': app.get_status_display(), 'message': STATUS_MESSAGES.get(app.status, ''),
        'submitted_at': app.submitted_at, 'school': ((school.settings_json or {}).get('institute_name') or school.name) if school else '',
    })


# ---------------------------------------------------------------------------
# Admin: settings, pipeline, review, enrolment
# ---------------------------------------------------------------------------

@api_view(['GET', 'PUT'])
@permission_classes([AdminOnly])
def admissions_settings(request):
    school = getattr(request, 'tenant', None)
    if school is None:
        return Response({'error': 'No school selected.'}, status=400)
    if request.method == 'PUT':
        data = request.data
        cfg = _settings(school)
        for key in ('online_open',):
            if key in data:
                cfg[key] = bool(data[key])
        for key in ('academic_year', 'intro', 'declaration', 'notify_email'):
            if key in data:
                cfg[key] = str(data[key] or '').strip()
        if 'required_documents' in data:
            docs = data['required_documents']
            if isinstance(docs, str):
                docs = [x.strip() for x in docs.split('\n')]
            cfg['required_documents'] = [str(x).strip()[:60] for x in docs if str(x).strip()][:12]
        with use_tenant(None):
            fresh = School.objects.get(pk=school.pk)
            fresh.settings_json = {**(fresh.settings_json or {}), 'admissions': cfg}
            fresh.save(update_fields=['settings_json'])
        school = fresh
    return Response({**_settings(school), 'public_slug': school.subdomain})


class ApplicantListCreateView(generics.ListCreateAPIView):
    permission_classes = [AdminOnly]
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer


class ApplicantDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AdminOnly]
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer
    lookup_field = 'id'


class ApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [AdminOnly]
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        qs = Application.objects.select_related('applicant').prefetch_related('documents')
        params = self.request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('source'):
            qs = qs.filter(source=params['source'])
        if params.get('academic_year'):
            qs = qs.filter(academic_year=params['academic_year'])
        q = (params.get('search') or '').strip()
        if q:
            qs = qs.filter(Q(application_no__icontains=q) | Q(applicant__full_name__icontains=q)
                           | Q(applicant__email__icontains=q) | Q(applicant__applying_for_class__icontains=q))
        return qs.order_by('-submitted_at')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        counts = dict(Application.objects.values_list('status').annotate(n=Count('id')))
        data = response.data
        if isinstance(data, list):
            data = {'results': data}
        data['counts'] = counts
        response.data = data
        return response

    def perform_create(self, serializer):
        application = serializer.save(applicant_id=self.request.data.get('applicant_id')) \
            if self.request.data.get('applicant_id') else serializer.save()
        _log(application, application.status, 'Entered by the office', self.request.user, from_status='')


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [AdminOnly]
    queryset = Application.objects.select_related('applicant').all()
    serializer_class = ApplicationSerializer
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        app = self.get_object()
        data = ApplicationSerializer(app).data
        data['documents'] = [_doc_payload(d, request) for d in app.documents.all()]
        data['events'] = [
            {'id': str(e.id), 'from_status': e.from_status, 'to_status': e.to_status, 'note': e.note,
             'by': e.by_name, 'at': e.at}
            for e in app.events.all()
        ]
        data['allowed_next'] = sorted(TRANSITIONS.get(app.status, set()))
        return Response(data)

    def perform_update(self, serializer):
        before = serializer.instance.interview_date
        app = serializer.save()
        if app.interview_date and app.interview_date != before:
            _log(app, app.status, f'Interview scheduled for {timezone.localtime(app.interview_date):%d %b %Y %H:%M}',
                 self.request.user)


@api_view(['POST'])
@permission_classes([AdminOnly])
def update_application_status(request, id):
    application = get_object_or_404(Application.objects.select_related('applicant'), id=id)
    new_status = request.data.get('status')
    note = str(request.data.get('note') or '').strip()
    if new_status == application.status:
        return Response({'error': 'The application already has that status.'}, status=400)
    if new_status == 'enrolled':
        return Response({'error': 'Use Enroll to turn an accepted application into a student.'}, status=400)
    if new_status not in TRANSITIONS.get(application.status, set()):
        return Response({'error': f'An application that is {application.get_status_display().lower()} '
                                  f'cannot be moved to that status.'}, status=400)
    previous = application.status
    application.status = new_status
    if note:
        application.status_notes = note
    if new_status in ('approved', 'rejected', 'waitlisted'):
        application.decided_at = timezone.now()
    application.save()
    _log(application, new_status, note, request.user, from_status=previous)
    if new_status in ('approved', 'rejected', 'waitlisted') and request.data.get('notify', True):
        _email(application.applicant.email, f'Application {application.application_no}: {application.get_status_display()}',
               f"{STATUS_MESSAGES.get(new_status, '')}\n\n{note}".strip())
    return Response({'status': new_status, 'status_label': application.get_status_display()})


@api_view(['POST'])
@permission_classes([AdminOnly])
def add_note(request, id):
    application = get_object_or_404(Application, id=id)
    note = str(request.data.get('note') or '').strip()
    if not note:
        return Response({'error': 'Write a note first.'}, status=400)
    _log(application, application.status, note, request.user)
    return Response({'note': note}, status=201)


@api_view(['POST'])
@permission_classes([AdminOnly])
@parser_classes([MultiPartParser, FormParser])
def upload_documents(request, id):
    application = get_object_or_404(Application, id=id)
    docs = _save_documents(application, request.FILES)
    if not docs:
        return Response({'error': 'Choose a file to upload.'}, status=400)
    _log(application, application.status, f'Added {len(docs)} document(s)', request.user)
    return Response([_doc_payload(d, request) for d in docs], status=201)


@api_view(['DELETE'])
@permission_classes([AdminOnly])
def delete_document(request, id, doc_id):
    doc = get_object_or_404(ApplicationDocument, id=doc_id, application_id=id)
    doc.file.delete(save=False)
    doc.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([AdminOnly])
def convert_to_student(request, id):
    """Enrol an accepted application: create the student, household, guardians and health notes."""
    from services.education.students.models import Guardian, Household, StudentGuardian, StudentHealth

    application = get_object_or_404(Application.objects.select_related('applicant'), id=id)
    if application.converted_to_student_id or application.status == 'enrolled':
        return Response({'error': 'This application has already been enrolled.'}, status=400)
    if application.status != 'approved':
        return Response({'error': 'Accept the application before enrolling the student.'}, status=400)

    applicant = application.applicant
    class_id = request.data.get('class_id')
    school_class = (SchoolClass.objects.filter(id=class_id).first() if class_id
                    else SchoolClass.objects.filter(name__iexact=applicant.applying_for_class).first())
    section = None
    if school_class:
        section_id = request.data.get('section_id')
        sections = Section.objects.filter(class_ref=school_class) if hasattr(Section, 'class_ref') else Section.objects.filter(class_obj=school_class)
        section = sections.filter(id=section_id).first() if section_id else (
            sections.filter(name=applicant.applying_for_section).first() if applicant.applying_for_section else None)

    from services.education.students.serializers import generate_unique_student_id

    guardians = applicant.guardians or []
    with transaction.atomic():
        household = None
        if guardians:
            surname = (guardians[0].get('last_name') or applicant.full_name.split()[-1]).strip()
            household = Household.objects.create(
                tenant_id=applicant.tenant_id, name=f'{surname} family', address=applicant.address,
                city=applicant.city, state=applicant.state, postal_code=applicant.postal_code,
                country=applicant.country, phone=applicant.phone,
                email=next((g.get('email') for g in guardians if g.get('email')), ''),
            )
        student = Student.objects.create(
            tenant_id=applicant.tenant_id, student_id=generate_unique_student_id(),
            full_name=applicant.full_name, email=applicant.email, phone=applicant.phone,
            date_of_birth=applicant.date_of_birth,
            gender={'M': 'male', 'F': 'female', 'O': 'other'}.get(applicant.gender, 'other'),
            father_name=applicant.father_name, mother_name=applicant.mother_name or '',
            father_mobile=applicant.father_phone or '', mother_mobile=applicant.mother_phone or '',
            guardian_name=applicant.guardian_name or '', guardian_phone=applicant.guardian_phone or '',
            address=applicant.address or '', city=applicant.city, state=applicant.state,
            postal_code=applicant.postal_code, previous_school=applicant.previous_school,
            current_class=school_class, current_section=section, household=household,
            admission_date=request.data.get('admission_date') or timezone.localdate(), is_active=True,
        )
        for priority, g in enumerate(guardians, start=1):
            guardian = Guardian.objects.create(
                tenant_id=applicant.tenant_id, household=household, first_name=g.get('first_name', ''),
                last_name=g.get('last_name', ''), relationship=g.get('relationship') or 'other',
                email=g.get('email', ''), mobile_phone=g.get('mobile_phone', ''), occupation=g.get('occupation', ''),
            )
            StudentGuardian.objects.create(
                tenant_id=applicant.tenant_id, student=student, guardian=guardian, priority=priority,
                is_primary=priority == 1, lives_with=g.get('lives_with', True), has_custody=g.get('has_custody', True),
                can_pickup=g.get('can_pickup', True), receives_billing=g.get('receives_billing', priority == 1),
            )
        if applicant.medical_notes or applicant.special_needs:
            StudentHealth.objects.create(
                tenant_id=applicant.tenant_id, student=student, medical_conditions=applicant.medical_notes,
                notes=applicant.special_needs,
            )
        previous = application.status
        application.status = 'enrolled'
        application.converted_to_student = student
        application.save()
        _log(application, 'enrolled', f'Enrolled as student {student.student_id}', request.user, from_status=previous)

    # No 'success' key: the web client unwraps {'success': true, 'data': ...} envelopes.
    return Response({
        'message': f'{applicant.full_name} is now enrolled.',
        'student_id': student.student_id,
        'student_uuid': str(student.id),
        'student_name': student.full_name,
    })


# ---------------------------------------------------------------------------
# Re-enrolment
# ---------------------------------------------------------------------------

def _campaign_payload(c, with_responses=False):
    counts = dict(c.responses.values_list('intent').annotate(n=Count('id')))
    data = {'id': str(c.id), 'title': c.title, 'academic_year': c.academic_year, 'message': c.message,
            'closes_on': c.closes_on, 'is_open': c.is_open, 'created_at': c.created_at,
            'counts': {k: counts.get(k, 0) for k, _ in ReEnrollmentResponse.INTENTS},
            'total': sum(counts.values())}
    if with_responses:
        data['responses'] = [
            {'id': str(r.id), 'student_id': str(r.student_id), 'student': r.student.full_name,
             'student_number': r.student.student_id,
             'class_name': r.student.current_class.name if r.student.current_class_id else '',
             'intent': r.intent, 'reason': r.reason, 'signature_name': r.signature_name, 'responded_at': r.responded_at}
            for r in c.responses.select_related('student__current_class')
        ]
    return data


@api_view(['GET', 'POST'])
@permission_classes([AdminOnly])
def reenrollment_campaigns(request):
    if request.method == 'GET':
        return Response([_campaign_payload(c) for c in ReEnrollmentCampaign.objects.all()])
    title = str(request.data.get('title') or '').strip()
    year = str(request.data.get('academic_year') or '').strip()
    if not title or not year:
        return Response({'error': 'Give the campaign a title and the academic year it is for.'}, status=400)
    with transaction.atomic():
        campaign = ReEnrollmentCampaign.objects.create(
            tenant=getattr(request, 'tenant', None), title=title, academic_year=year,
            message=str(request.data.get('message') or ''), closes_on=request.data.get('closes_on') or None,
        )
        ReEnrollmentResponse.objects.bulk_create([
            ReEnrollmentResponse(campaign=campaign, student=s) for s in Student.objects.filter(is_active=True)
        ])
    return Response(_campaign_payload(campaign, True), status=201)


@api_view(['GET', 'PATCH'])
@permission_classes([AdminOnly])
def reenrollment_campaign_detail(request, id):
    campaign = get_object_or_404(ReEnrollmentCampaign, id=id)
    if request.method == 'PATCH':
        for key in ('title', 'message'):
            if key in request.data:
                setattr(campaign, key, str(request.data[key] or ''))
        if 'is_open' in request.data:
            campaign.is_open = bool(request.data['is_open'])
        if 'closes_on' in request.data:
            campaign.closes_on = request.data['closes_on'] or None
        campaign.save()
    return Response(_campaign_payload(campaign, True))


def _respond(response, request, allow_admin_override=False):
    intent = request.data.get('intent')
    if intent not in {'returning', 'not_returning', 'undecided'}:
        return Response({'error': 'Choose returning, not returning or undecided.'}, status=400)
    signature = str(request.data.get('signature_name') or '').strip()
    if not signature and not allow_admin_override:
        return Response({'error': 'Type your full name to sign.'}, status=400)
    response.intent = intent
    response.reason = str(request.data.get('reason') or '')
    response.signature_name = signature or f"Recorded by {getattr(request.user, 'email', 'office')}"
    response.responded_at = timezone.now()
    response.responded_by = request.user
    response.save()
    return Response({'id': str(response.id), 'intent': response.intent, 'responded_at': response.responded_at})


@api_view(['PATCH'])
@permission_classes([AdminOnly])
def reenrollment_record(request, id):
    """The office records a family's answer (for example, given by phone)."""
    return _respond(get_object_or_404(ReEnrollmentResponse, id=id), request, allow_admin_override=True)


def _family_student_ids(user):
    from services.education.students.models import StudentGuardian

    ids = set()
    if hasattr(user, 'parent_profile'):
        ids |= set(user.parent_profile.linked_students.values_list('id', flat=True))
    ids |= set(StudentGuardian.objects.filter(guardian__user=user, portal_access=True).values_list('student_id', flat=True))
    return ids


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reenrollments(request):
    """Open re-enrolment questions for the signed-in parent's children."""
    ids = _family_student_ids(request.user)
    rows = (ReEnrollmentResponse.objects.filter(student_id__in=ids, campaign__is_open=True)
            .select_related('campaign', 'student'))
    return Response([
        {'id': str(r.id), 'student': r.student.full_name, 'campaign': r.campaign.title,
         'academic_year': r.campaign.academic_year, 'message': r.campaign.message, 'closes_on': r.campaign.closes_on,
         'intent': r.intent, 'responded_at': r.responded_at}
        for r in rows
    ])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_reenrollment(request, id):
    response = get_object_or_404(ReEnrollmentResponse.objects.select_related('campaign'), id=id)
    if response.student_id not in _family_student_ids(request.user):
        return Response({'error': 'You can only answer for your own children.'}, status=403)
    if not response.campaign.is_open:
        return Response({'error': 'This re-enrolment has closed. Please contact the school.'}, status=400)
    return _respond(response, request)
