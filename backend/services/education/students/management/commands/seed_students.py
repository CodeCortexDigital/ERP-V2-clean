import csv
import os
from datetime import datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from services.education.academics.models import AcademicYear, Classroom, SchoolClass, Section
from services.education.students.models import Student


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


class Command(BaseCommand):
    help = 'Seed classes, sections and students from data/students_seed.csv (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Hard-delete existing seeded students (STU0001-STU0030) before seeding')
        parser.add_argument('--file', type=str, default=None,
                            help='Path to the CSV file (defaults to bundled students_seed.csv)')

    def handle(self, *args, **options):
        csv_path = options['file'] or os.path.join(os.path.dirname(__file__), 'data', 'students_seed.csv')
        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'CSV not found: {csv_path}'))
            return

        with open(csv_path, newline='', encoding='utf-8') as fh:
            rows = list(csv.DictReader(fh))

        if not rows:
            self.stderr.write(self.style.WARNING('No rows found in CSV.'))
            return

        active_year = AcademicYear.objects.filter(is_active=True).first() or AcademicYear.objects.first()

        # Count students per class so we can size max_students with a buffer.
        class_counts = {}
        for r in rows:
            class_counts[r['Class'].strip()] = class_counts.get(r['Class'].strip(), 0) + 1

        with transaction.atomic():
            if options['clear']:
                reg_ids = [r['RegNo'].strip() for r in rows]
                deleted, _ = Student.all_objects.filter(student_id__in=reg_ids).delete()
                self.stdout.write(self.style.WARNING(f'Cleared {deleted} existing student rows.'))

            classes = {}
            sections = {}
            used_classroom_ids = set(
                SchoolClass.objects.exclude(classroom__isnull=True).values_list('classroom_id', flat=True)
            )

            created_students = 0
            updated_students = 0

            for r in rows:
                class_name = r['Class'].strip()
                section_name = r['Section'].strip()

                # --- Class ---
                if class_name not in classes:
                    max_students = max(class_counts[class_name] + 10, 30)
                    school_class, _ = SchoolClass.objects.get_or_create(
                        name=class_name,
                        defaults={
                            'code': class_name.upper().replace(' ', ''),
                            'academic_year': active_year,
                            'max_students': max_students,
                            'is_active': True,
                        },
                    )
                    # Ensure capacity is large enough for the seeded cohort.
                    if school_class.max_students < class_counts[class_name]:
                        school_class.max_students = max_students
                        school_class.save(update_fields=['max_students'])
                    # Assign an unused classroom if the class has none yet.
                    if school_class.classroom_id is None:
                        free_room = (Classroom.objects
                                     .exclude(id__in=used_classroom_ids)
                                     .order_by('name').first())
                        if free_room:
                            school_class.classroom = free_room
                            school_class.save(update_fields=['classroom'])
                            used_classroom_ids.add(free_room.id)
                    classes[class_name] = school_class
                school_class = classes[class_name]

                # --- Section ---
                sec_key = (class_name, section_name)
                if sec_key not in sections:
                    section, _ = Section.objects.get_or_create(
                        class_ref=school_class,
                        name=section_name,
                        defaults={'capacity': max(class_counts[class_name] + 10, 30)},
                    )
                    sections[sec_key] = section
                section = sections[sec_key]

                # --- Student ---
                reg_no = r['RegNo'].strip()
                full_name = f"{r['FirstName'].strip()} {r['LastName'].strip()}".strip()
                gender_map = {'male': 'male', 'female': 'female', 'other': 'other'}
                gender = gender_map.get(r['Gender'].strip().lower(), 'other')
                total_siblings = clean(r.get('TotalSiblings'))

                defaults = {
                    'deleted_at': None,
                    'full_name': full_name,
                    'email': f"{reg_no.lower()}@school.test",
                    'date_of_birth': parse_date(r.get('DOB')),
                    'admission_date': parse_date(r.get('AdmissionDate')),
                    'gender': gender,
                    'blood_group': clean(r.get('BloodGroup')),
                    'father_name': clean(r.get('FatherName')),
                    'father_national_id': clean(r.get('FatherNIC')),
                    'father_occupation': clean(r.get('FatherOccupation')),
                    'father_education': clean(r.get('FatherEducation')),
                    'father_mobile': clean(r.get('FatherMobile')),
                    'father_profession': clean(r.get('FatherProfession')),
                    'father_income': clean(r.get('FatherIncome')),
                    'mother_name': clean(r.get('MotherName')),
                    'mother_national_id': clean(r.get('MotherNIC')),
                    'mother_occupation': clean(r.get('MotherOccupation')),
                    'mother_education': clean(r.get('MotherEducation')),
                    'mother_mobile': clean(r.get('MotherMobile')),
                    'mother_profession': clean(r.get('MotherProfession')),
                    'mother_income': clean(r.get('MotherIncome')),
                    'guardian_name': clean(r.get('FatherName')) or full_name,
                    'guardian_phone': clean(r.get('FatherMobile')),
                    'phone': clean(r.get('FatherMobile')),
                    'current_class': school_class,
                    'current_section': section,
                    'is_active': r['Status'].strip().lower() == 'active',
                    'discount_in_fee': clean(r.get('Discount')),
                    'address': clean(r.get('Address')),
                    'religion': clean(r.get('Religion')),
                    'cast': clean(r.get('Cast')),
                    'previous_school': clean(r.get('PreviousSchool')),
                    'previous_id': clean(r.get('PreviousID')),
                    'orphan_student': clean(r.get('OrphanStudent')),
                    'osc': clean(r.get('OSC')),
                    'total_siblings': int(total_siblings) if total_siblings.isdigit() else None,
                    'identification_mark': clean(r.get('IdentificationMark')),
                    'disease': clean(r.get('Disease')),
                    'additional_note': clean(r.get('AdditionalNote')),
                }

                obj, created = Student.all_objects.update_or_create(
                    student_id=reg_no, defaults=defaults
                )
                if created:
                    created_students += 1
                else:
                    updated_students += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seed complete: {created_students} created, {updated_students} updated.'
        ))
        for name, sc in classes.items():
            room = sc.classroom.name if sc.classroom_id else 'no room'
            self.stdout.write(f'  - {name}: {sc.students.filter(is_active=True).count()}/{sc.max_students} seats ({room})')
