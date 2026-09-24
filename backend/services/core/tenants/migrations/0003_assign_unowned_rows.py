"""Give every school-owned row without a school to the existing school.

Before multi-school isolation, rows were created without a tenant. This assigns
them to the school most users belong to (the one the installation has been
running as), creating the default school only if none exists, and links
superusers that have no school to it so their normal screens stay populated.
Rows that already have a school are left alone.
"""

from django.db import migrations
from django.db.models import Count

# Same list as services/core/tenants/registry.py DIRECT (copied: migrations must
# not import app code that can change later).
DIRECT = [
    'education_students.Student',
    'education_students.Certificate',
    'education_academics.SchoolClass',
    'education_academics.Section',
    'education_academics.Teacher',
    'education_academics.AcademicYear',
    'education_academics.Subject',
    'education_academics.GradeScale',
    'education_academics.AssessmentType',
    'education_academics.Classroom',
    'education_academics.TeacherLeave',
    'education_academics.LeaveBalance',
    'education_academics.Homework',
    'education_academics.LiveMeeting',
    'education_attendance.AttendanceRecord',
    'education_attendance.StudentFaceEncoding',
    'education_exams.Exam',
    'education_exams.ExamResult',
    'education_finance.PaymentGatewayConfig',
    'education_finance.InstallmentPlan',
    'education_finance.Scholarship',
    'education_finance.LateFeeRule',
    'education_finance.TransactionLog',
    'education_finance.FinanceSettings',
    'education_finance.AccountHead',
    'education_finance.LedgerEntry',
    'education_finance.WeekdayConfig',
    'education_admissions.Applicant',
    'education_communication.Message',
    'education_communication.Notification',
    'education_communication.MessageTemplate',
    'education_communication.AutoTrigger',
    'education_communication.WhatsAppConfig',
    'ai.AIConversation',
    'ai.AIUsage',
]


def _target_school(apps):
    School = apps.get_model('core_tenants', 'School')
    Membership = apps.get_model('core_tenants', 'TenantMembership')
    busiest = (
        Membership.objects.filter(is_active=True, school__is_active=True)
        .values('school').annotate(n=Count('id')).order_by('-n').first()
    )
    if busiest:
        return School.objects.get(pk=busiest['school'])
    school = School.objects.filter(is_active=True).order_by('created_at').first()
    if school:
        return school
    return School.objects.create(
        tenant_code='DEF', name='Default School', subdomain='default', school_id='DEF-001', is_active=True,
    )


def assign(apps, schema_editor):
    models = []
    for label in DIRECT:
        app_label, name = label.split('.')
        try:
            models.append(apps.get_model(app_label, name))
        except LookupError:
            continue
    unowned = [M for M in models if M.objects.filter(tenant__isnull=True).exists()]
    if not unowned:
        return
    school = _target_school(apps)
    for M in unowned:
        M.objects.filter(tenant__isnull=True).update(tenant=school)

    User = apps.get_model('core_accounts', 'User')
    Membership = apps.get_model('core_tenants', 'TenantMembership')
    for user in User.objects.filter(is_superuser=True):
        if not Membership.objects.filter(user=user, is_active=True).exists():
            Membership.objects.create(user=user, school=school, role='admin', is_active=True, is_primary=True)


class Migration(migrations.Migration):
    dependencies = [
        ('core_tenants', '0002_backfill_default_tenant'),
        ('core_accounts', '0006_portal_credential'),
        ('education_students', '0008_school_tenant'),
        ('education_academics', '0024_school_tenant'),
        ('education_attendance', '0008_school_tenant'),
        ('education_exams', '0004_examschedule_examregistration'),
        ('education_finance', '0014_school_tenant'),
        ('education_admissions', '0002_school_tenant'),
        ('education_communication', '0004_school_tenant'),
        ('ai', '0001_ai_conversations'),
    ]

    operations = [migrations.RunPython(assign, migrations.RunPython.noop)]
