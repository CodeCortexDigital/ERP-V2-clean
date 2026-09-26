"""Who belongs to a school, what each role may do, and how an API path reads as an area of the app."""
from __future__ import annotations

import re

from django.apps import apps

ROLE_ORDER = ['admin', 'teacher', 'staff', 'parent', 'student']
ROLE_LABELS = {'admin': 'Administrator', 'teacher': 'Teacher', 'staff': 'Staff',
               'parent': 'Parent / guardian', 'student': 'Student'}


def school_people(school) -> dict:
    """{user_id: role} for everyone who can sign in to this school. A school membership wins over the person's records."""
    from django.contrib.auth import get_user_model
    from django.db.models.functions import Lower

    from services.core.tenants.models import TenantMembership

    User = get_user_model()
    Student = apps.get_model('education_students', 'Student')
    Teacher = apps.get_model('education_academics', 'Teacher')
    ParentProfile = apps.get_model('core_accounts', 'ParentProfile')

    def emails(model):
        return {e.lower() for e in model._base_manager.filter(tenant=school).exclude(email__isnull=True).exclude(email='').values_list('email', flat=True)}

    student_emails, teacher_emails = emails(Student), emails(Teacher)
    people: dict = {}
    matched = User.objects.annotate(e=Lower('email')).filter(e__in=list(student_emails | teacher_emails)).values_list('id', 'e')
    for uid, email in matched:
        people[uid] = 'teacher' if email in teacher_emails else 'student'
    for uid in ParentProfile.objects.filter(linked_students__tenant=school).values_list('user_id', flat=True).distinct():
        people.setdefault(uid, 'parent')
        if people[uid] == 'student':
            people[uid] = 'parent'
    for uid, role in TenantMembership.objects.filter(school=school, is_active=True).values_list('user_id', 'role'):
        # An accountant membership signs in with staff access (see get_user_role), so it is shown as staff.
        people[uid] = 'staff' if role == 'accountant' else role
    return people


# What each role can see and do. The rules are enforced in each module's API; this is the plain-language summary
# shown to administrators on Settings → Security → Roles & access.
ROLE_MATRIX = [
    ('Students & families', {
        'admin': 'Everything', 'teacher': 'Students in their classes',
        'staff': '—', 'parent': 'Their own children', 'student': 'Themselves'}),
    ('Admissions', {
        'admin': 'Everything', 'teacher': '—', 'staff': '—',
        'parent': 'Their own applications', 'student': '—'}),
    ('Attendance', {
        'admin': 'Everything', 'teacher': 'Take and view for their classes', 'staff': '—',
        'parent': "Their children's attendance", 'student': 'Their own'}),
    ('Gradebook & exams', {
        'admin': 'Everything', 'teacher': 'Enter and publish marks for their classes', 'staff': '—',
        'parent': "Their children's published results", 'student': 'Their own published results'}),
    ('Fees & payments', {
        'admin': 'Everything', 'teacher': '—', 'staff': '—',
        'parent': "Their family's invoices, pay online", 'student': 'Their own invoices'}),
    ('Messages & announcements', {
        'admin': 'Send to anyone, see all announcements',
        'teacher': 'Families and students of their classes', 'staff': 'Their own messages',
        'parent': "Their children's teachers and the office", 'student': 'Their own messages'}),
    ('Library', {
        'admin': 'Everything', 'teacher': 'Catalogue, their own loans', 'staff': 'Catalogue, their own loans',
        'parent': "Catalogue, their children's loans", 'student': 'Catalogue, their own loans'}),
    ('Transport', {
        'admin': 'Everything', 'teacher': '—', 'staff': 'Bus duty on their own routes',
        'parent': "Their child's bus and trip updates", 'student': 'Their own bus'}),
    ('Cafeteria', {
        'admin': 'Everything', 'teacher': '—', 'staff': 'The till (sales and balances)',
        'parent': 'Menu, meal plans, top-ups', 'student': 'Menu and their balance'}),
    ('Inventory', {
        'admin': 'Everything', 'teacher': '—', 'staff': '—', 'parent': '—', 'student': '—'}),
    ('Reports', {
        'admin': 'All school reports', 'teacher': 'Reports for their classes',
        'staff': '—', 'parent': '—', 'student': '—'}),
    ('Search', {
        'admin': 'Everything', 'teacher': 'Their students and classes, the library',
        'staff': 'The library', 'parent': 'Their children, the library', 'student': 'Themselves, the library'}),
    ('Security & activity log', {
        'admin': 'Everything, including locking accounts',
        'teacher': 'Their own sign-ins and data', 'staff': 'Their own sign-ins and data',
        'parent': 'Their own sign-ins and data', 'student': 'Their own sign-ins and data'}),
    ('School settings', {
        'admin': 'Everything', 'teacher': '—', 'staff': '—', 'parent': '—', 'student': '—'}),
]

# First meaningful path segment → area shown in the activity log.
AREAS = [
    ('students', 'Students'), ('households', 'Families'), ('family', 'Families'), ('admissions', 'Admissions'),
    ('attendance', 'Attendance'), ('gradebook', 'Gradebook'), ('exams', 'Exams'), ('academics', 'Classes & timetable'),
    ('finance', 'Fees & payments'), ('billing', 'Fees & payments'), ('invoices', 'Fees & payments'), ('fees', 'Fees & payments'),
    ('payroll', 'Salaries'), ('teachers', 'Staff'), ('employees', 'Staff'), ('communication', 'Messages'),
    ('messaging', 'Messages'), ('announcements', 'Announcements'), ('calendar', 'Calendar'), ('behaviour', 'Behaviour'),
    ('library', 'Library'), ('transport', 'Transport'), ('inventory', 'Inventory'), ('cafeteria', 'Cafeteria'),
    ('integrations', 'Integrations'), ('credentials', 'Portal logins'), ('security', 'Security'),
    ('tenants', 'School settings'), ('settings', 'Settings'), ('insights', 'Reports'), ('reports', 'Reports'),
    ('portal', 'Portal'), ('workspace', 'Teacher workspace'), ('certificates', 'Certificates'),
]
_AREA = dict(AREAS)
_SKIP = {'api', 'v1', 'v2', 'auth', 'education', 'core'}


def area_of(path: str) -> str:
    for part in (path or '').strip('/').split('/'):
        if not part or part in _SKIP:
            continue
        return _AREA.get(part, part.replace('-', ' ').replace('_', ' ').capitalize())
    return 'Other'


UUID_RE = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', re.I)
