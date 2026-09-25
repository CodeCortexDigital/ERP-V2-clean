"""Give existing skills and observations a school.

Observations take the school of their student, class or teacher. Skills used to be
shared by every school; each school now gets its own copy (ratings refer to skills by
name, so nothing else changes)."""
from django.db import migrations


def forwards(apps, schema_editor):
    School = apps.get_model('core_tenants', 'School')
    Skill = apps.get_model('behaviour', 'Skill')
    Observation = apps.get_model('behaviour', 'Observation')

    for o in Observation.objects.filter(tenant__isnull=True).select_related('student', 'class_ref', 'teacher'):
        tenant_id = ((o.student.tenant_id if o.student_id else None)
                     or (o.class_ref.tenant_id if o.class_ref_id else None)
                     or (o.teacher.tenant_id if o.teacher_id else None))
        if tenant_id:
            Observation.objects.filter(pk=o.pk).update(tenant_id=tenant_id)

    schools = list(School.objects.values_list('pk', flat=True))
    if not schools:
        return
    for skill in list(Skill.objects.filter(tenant__isnull=True)):
        first, rest = schools[0], schools[1:]
        for school_id in rest:
            if not Skill.objects.filter(tenant_id=school_id, name=skill.name, domain=skill.domain).exists():
                Skill.objects.create(tenant_id=school_id, name=skill.name, domain=skill.domain, description=skill.description,
                                     max_rating=skill.max_rating, is_active=skill.is_active, order=skill.order)
        Skill.objects.filter(pk=skill.pk).update(tenant_id=first)


class Migration(migrations.Migration):

    dependencies = [
        ('behaviour', '0003_discipline_and_tenancy'),
        ('core_tenants', '0003_assign_unowned_rows'),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
