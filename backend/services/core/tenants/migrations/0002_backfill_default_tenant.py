"""Create default tenant and assign to rows missing tenant_id."""

from django.db import migrations


def create_default_and_backfill(apps, schema_editor):
    School = apps.get_model('core_tenants', 'School')
    school, created = School.objects.get_or_create(
        tenant_code='DEF',
        defaults={
            'name': 'Default School',
            'subdomain': 'default',
            'school_id': 'DEF-001',
            'email_domain': '',
            'is_active': True,
        },
    )
    if created:
        pass

    models_to_backfill = [
        ('education_students', 'Student'),
        ('education_academics', 'SchoolClass'),
        ('education_academics', 'Section'),
        ('education_academics', 'Teacher'),
        ('education_attendance', 'AttendanceRecord'),
        ('education_exams', 'Exam'),
        ('education_exams', 'ExamResult'),
        ('education_finance', 'Invoice'),
        ('user_notifications', 'Notification'),
    ]

    for app_label, model_name in models_to_backfill:
        try:
            Model = apps.get_model(app_label, model_name)
        except LookupError:
            continue
        if not hasattr(Model, '_meta'):
            continue
        field_names = {f.name for f in Model._meta.fields}
        if 'tenant' in field_names:
            Model.objects.filter(tenant__isnull=True).update(tenant=school)
        elif 'tenant_id' in field_names:
            Model.objects.filter(tenant_id__isnull=True).update(tenant_id=school.id)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core_tenants', '0001_add_tenant_nullable'),
        ('education_students', '0004_add_tenant_nullable'),
        ('education_academics', '0005_add_tenant_nullable'),
        ('education_attendance', '0003_add_tenant_nullable'),
        ('education_exams', '0002_add_tenant_nullable'),
        ('education_finance', '0005_add_tenant_nullable'),
        ('user_notifications', '0003_add_tenant_nullable'),
    ]

    operations = [
        migrations.RunPython(create_default_and_backfill, noop),
    ]
