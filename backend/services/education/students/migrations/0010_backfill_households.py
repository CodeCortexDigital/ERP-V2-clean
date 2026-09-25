"""Create households and guardians from the old father/mother/guardian fields.

Siblings sharing a father's (or else mother's) national ID land in one household,
matching how the old "family" grouping worked. Nothing is deleted: the old fields
stay on Student for schools that still use the Pakistani-style form.
"""
from django.db import migrations


def _clean(value):
    return (value or '').strip()


def _split(name):
    parts = _clean(name).split(None, 1)
    return (parts[0], parts[1] if len(parts) > 1 else '') if parts else ('', '')


def backfill(apps, schema_editor):
    Student = apps.get_model('education_students', 'Student')
    Household = apps.get_model('education_students', 'Household')
    Guardian = apps.get_model('education_students', 'Guardian')
    Link = apps.get_model('education_students', 'StudentGuardian')

    households = {}  # (tenant_id, family key) -> Household
    guardians = {}   # (household_id, relationship, name) -> Guardian

    for s in Student.objects.filter(deleted_at__isnull=True, household__isnull=True).order_by('created_at'):
        people = [
            ('father', s.father_name, s.father_mobile, s.father_national_id, s.father_occupation),
            ('mother', s.mother_name, s.mother_mobile, s.mother_national_id, s.mother_occupation),
        ]
        if _clean(s.guardian_name) and _clean(s.guardian_name) not in (_clean(s.father_name), _clean(s.mother_name)):
            people.append(('legal_guardian', s.guardian_name, s.guardian_phone, '', ''))
        people = [p for p in people if _clean(p[1])]
        if not people:
            continue

        key = _clean(s.father_national_id) or _clean(s.mother_national_id) or f'student:{s.pk}'
        hkey = (s.tenant_id, key.lower())
        household = households.get(hkey)
        if household is None:
            surname = _split(people[0][1])[1] or _clean(people[0][1])
            household = Household.objects.create(
                tenant_id=s.tenant_id,
                name=_clean(s.select_family) or f'{surname} family',
                address=s.address or '', city=s.city or '', state=s.state or '',
                postal_code=s.postal_code or '',
                phone=_clean(s.father_mobile) or _clean(s.mother_mobile) or _clean(s.guardian_phone),
            )
            households[hkey] = household
        s.household_id = household.pk
        s.save(update_fields=['household'])

        for priority, (relationship, name, phone, nic, occupation) in enumerate(people, start=1):
            gkey = (household.pk, relationship, _clean(name).lower())
            guardian = guardians.get(gkey)
            if guardian is None:
                first, last = _split(name)
                guardian = Guardian.objects.create(
                    tenant_id=s.tenant_id, household=household, first_name=first, last_name=last,
                    relationship=relationship, mobile_phone=_clean(phone), national_id=_clean(nic),
                    occupation=_clean(occupation),
                )
                guardians[gkey] = guardian
            Link.objects.get_or_create(
                student=s, guardian=guardian,
                defaults={'tenant_id': s.tenant_id, 'is_primary': priority == 1,
                          'receives_billing': priority == 1, 'priority': priority},
            )


class Migration(migrations.Migration):
    dependencies = [('education_students', '0009_households_guardians_health')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
