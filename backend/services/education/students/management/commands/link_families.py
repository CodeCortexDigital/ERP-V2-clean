"""Backfill family grouping for existing students.

Scans every (tenant, parent-NIC) group and assigns a shared ``select_family``
label plus an accurate ``total_siblings`` count, using the same matching rules
as live student creation (father NIC first, then mother NIC).

    python manage.py link_families            # apply changes
    python manage.py link_families --dry-run  # report only, no writes
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from services.education.students.models import Student
from services.education.students.family_utils import resolve_family_key


class Command(BaseCommand):
    help = 'Group existing students into families by shared parent national id.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report the families that would be created without writing.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Bucket students by (tenant, matched-field, nic-value).
        groups = defaultdict(list)
        for student in Student.objects.all():
            field_name, key_value = resolve_family_key(student)
            if not key_value:
                continue
            groups[(student.tenant_id, field_name, key_value.lower())].append(student)

        families = 0
        siblings = 0
        updated = 0

        with transaction.atomic():
            for (_, _field, _value), members in groups.items():
                if len(members) < 2:
                    continue

                families += 1
                siblings += len(members)

                label = ''
                for m in members:
                    if (m.select_family or '').strip():
                        label = m.select_family.strip()
                        break
                if not label:
                    base = (members[0].father_name or members[0].mother_name or '').strip()
                    label = f'{base} Family' if base else f'FAM-{_value}'

                names = ', '.join(m.full_name for m in members)
                self.stdout.write(
                    f'  {label}: {len(members)} students -> {names}'
                )

                if not dry_run:
                    member_ids = [m.pk for m in members]
                    updated += Student.objects.filter(pk__in=member_ids).update(
                        select_family=label,
                        total_siblings=len(members),
                    )

            if dry_run:
                transaction.set_rollback(True)

        prefix = '[dry-run] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}Families detected: {families} | students in families: {siblings}'
            + ('' if dry_run else f' | rows updated: {updated}')
        ))
