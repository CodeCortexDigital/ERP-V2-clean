import csv
import os
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.db import transaction

from services.education.academics.models import Teacher


def parse_date(value):
    value = (value or '').strip()
    if not value:
        return None
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%m/%d/%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def clean(value):
    value = (value or '').strip()
    return '' if value.lower() == 'none' else value


def parse_decimal(value):
    value = clean(value)
    if not value:
        return None
    try:
        return Decimal(value.replace(',', ''))
    except (InvalidOperation, ValueError):
        return None


def parse_int(value):
    value = clean(value)
    return int(value) if value.isdigit() else 0


class Command(BaseCommand):
    help = 'Seed employees/staff into the Teacher model from data/employees_seed.csv (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Delete employees matching the CSV emails before seeding')
        parser.add_argument('--file', type=str, default=None,
                            help='Path to the CSV file (defaults to bundled employees_seed.csv)')

    def handle(self, *args, **options):
        csv_path = options['file'] or os.path.join(os.path.dirname(__file__), 'data', 'employees_seed.csv')
        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'CSV not found: {csv_path}'))
            return

        with open(csv_path, newline='', encoding='utf-8') as fh:
            rows = list(csv.DictReader(fh))

        if not rows:
            self.stderr.write(self.style.WARNING('No rows found in CSV.'))
            return

        gender_map = {'male': 'male', 'female': 'female', 'other': 'other'}

        with transaction.atomic():
            if options['clear']:
                emails = [clean(r.get('EmailAddress')).lower() for r in rows]
                deleted, _ = Teacher.objects.filter(email__in=emails).delete()
                self.stdout.write(self.style.WARNING(f'Cleared {deleted} existing employee rows.'))

            created = 0
            updated = 0

            for idx, r in enumerate(rows, start=1):
                email = clean(r.get('EmailAddress')).lower()
                if not email:
                    self.stderr.write(self.style.WARNING(f'Skipping row {idx}: no email.'))
                    continue

                full_name = clean(r.get('EmployeeName'))
                education = clean(r.get('Education'))
                specialization = clean(r.get('SubjectSpecialization'))

                defaults = {
                    'employee_id': f'EMP{idx:04d}',
                    'full_name': full_name,
                    'phone': clean(r.get('MobileNo')),
                    'joining_date': parse_date(r.get('DateOfJoining')),
                    'experience_years': parse_int(r.get('Experience')),
                    'qualifications': [education] if education else [],
                    'specializations': [specialization] if specialization else [],
                    'monthly_salary': parse_decimal(r.get('MonthlySalary')),
                    'role': clean(r.get('EmployeeRole')),
                    'department': clean(r.get('Department')),
                    'shift': clean(r.get('Shift')),
                    'father_husband_name': clean(r.get('FatherHusbandName')),
                    'gender': gender_map.get(clean(r.get('Gender')).lower(), ''),
                    'national_id': clean(r.get('NationalID')),
                    'religion': clean(r.get('Religion')),
                    'education': education,
                    'blood_group': clean(r.get('BloodGroup')),
                    'home_address': clean(r.get('HomeAddress')),
                    'is_active': clean(r.get('Status')).lower() == 'active',
                }

                _, was_created = Teacher.objects.update_or_create(
                    email=email, defaults=defaults
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Employee seed complete: {created} created, {updated} updated.'
        ))
