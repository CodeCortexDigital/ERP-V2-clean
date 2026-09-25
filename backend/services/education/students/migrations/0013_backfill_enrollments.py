"""Record each current student's class as their open enrollment."""
from django.db import migrations


def backfill(apps, schema_editor):
    Student = apps.get_model('education_students', 'Student')
    Enrollment = apps.get_model('education_students', 'Enrollment')
    AcademicYear = apps.get_model('education_academics', 'AcademicYear')
    active_year = {}
    for s in Student.objects.filter(deleted_at__isnull=True, current_class__isnull=False).select_related('current_class'):
        if Enrollment.objects.filter(student=s).exists():
            continue
        cls = s.current_class
        year_id = cls.academic_year_id
        if not year_id:
            if s.tenant_id not in active_year:
                y = AcademicYear.objects.filter(tenant_id=s.tenant_id, is_active=True).first()
                active_year[s.tenant_id] = y.pk if y else None
            year_id = active_year[s.tenant_id]
        Enrollment.objects.create(
            tenant_id=s.tenant_id, student=s, academic_year_id=year_id, school_class=cls,
            section_id=s.current_section_id, class_name=cls.name,
            start_date=s.admission_date or s.created_at.date(),
            status='enrolled' if s.is_active else 'withdrawn',
        )


class Migration(migrations.Migration):
    dependencies = [
        ('education_students', '0012_enrollment'),
        ('education_academics', '0026_guess_grade_levels'),
    ]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
