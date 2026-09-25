"""Children linked to the same parent login belong to one household.

The first conversion (0010) grouped siblings by the parents' national ID only,
so siblings without one were split into separate households. This merges them.
"""
from django.db import migrations


def merge(apps, schema_editor):
    ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
    Student = apps.get_model('education_students', 'Student')
    Guardian = apps.get_model('education_students', 'Guardian')
    Link = apps.get_model('education_students', 'StudentGuardian')
    Household = apps.get_model('education_students', 'Household')
    AccountCredit = apps.get_model('education_finance', 'AccountCredit')

    for profile in ParentProfile.objects.all():
        homes = sorted({s.household_id for s in profile.linked_students.all() if s.household_id},
                       key=lambda pk: Household.objects.get(pk=pk).created_at)
        if len(homes) < 2:
            continue
        keep, others = homes[0], homes[1:]
        for other in others:
            Student.objects.filter(household_id=other).update(household_id=keep)
            AccountCredit.objects.filter(household_id=other).update(household_id=keep)
            for g in Guardian.objects.filter(household_id=other):
                twin = Guardian.objects.filter(household_id=keep, relationship=g.relationship,
                                               first_name__iexact=g.first_name, last_name__iexact=g.last_name).first()
                if twin is None:
                    g.household_id = keep
                    g.save(update_fields=['household'])
                    continue
                for link in Link.objects.filter(guardian=g):
                    if Link.objects.filter(guardian=twin, student_id=link.student_id).exists():
                        link.delete()
                    else:
                        link.guardian = twin
                        link.save(update_fields=['guardian'])
                g.delete()
            Household.objects.filter(pk=other).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('education_students', '0010_backfill_households'),
        ('core_accounts', '0006_portal_credential'),
        ('education_finance', '0015_credits_refunds_stripe'),
    ]
    operations = [migrations.RunPython(merge, migrations.RunPython.noop)]
