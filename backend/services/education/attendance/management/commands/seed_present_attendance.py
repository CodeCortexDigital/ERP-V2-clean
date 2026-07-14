import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from services.education.students.models import Student
from services.education.attendance.models import AttendanceRecord


WEEKDAY_CODES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

DEFAULT_ACTIVE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']


class Command(BaseCommand):
    help = (
        'Seed student attendance marking everyone Present on active school days '
        '(as per the Weekdays Configuration) from a start date up to today. '
        'Existing records are never overwritten, so manual changes are preserved.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--start',
            default='2026-04-01',
            help='Start date (YYYY-MM-DD). Default: 2026-04-01',
        )
        parser.add_argument(
            '--end',
            default=None,
            help='End date (YYYY-MM-DD). Default: today',
        )
        parser.add_argument(
            '--days',
            default=','.join(DEFAULT_ACTIVE_DAYS),
            help=(
                'Comma-separated active weekday codes to mark present. '
                'Default: monday,tuesday,wednesday,thursday,friday'
            ),
        )
        parser.add_argument(
            '--status',
            default='present',
            help="Status to seed. Default: present",
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing records for the given range (WARNING: discards manual changes).',
        )

    def handle(self, *args, **options):
        start_date = datetime.date.fromisoformat(options['start'])
        end_date = (
            datetime.date.fromisoformat(options['end'])
            if options['end']
            else timezone.localdate()
        )
        status = options['status']
        overwrite = options['overwrite']

        active_codes = [c.strip().lower() for c in options['days'].split(',') if c.strip()]
        active_weekday_nums = {WEEKDAY_CODES.index(c) for c in active_codes if c in WEEKDAY_CODES}

        if not active_weekday_nums:
            self.stderr.write(self.style.ERROR('No valid active weekdays supplied.'))
            return

        if end_date < start_date:
            self.stderr.write(self.style.ERROR('End date is before start date.'))
            return

        students = list(Student.objects.filter(is_active=True))
        self.stdout.write(
            f'Loaded {len(students)} active students. '
            f'Seeding "{status}" from {start_date} to {end_date} '
            f'on: {", ".join(sorted(active_codes))}.'
        )

        # Build the list of active school days in range
        school_days = []
        d = start_date
        while d <= end_date:
            if d.weekday() in active_weekday_nums:
                school_days.append(d)
            d += datetime.timedelta(days=1)

        self.stdout.write(f'Identified {len(school_days)} active school days.')

        if overwrite:
            deleted, _ = AttendanceRecord.objects.filter(
                date__gte=start_date, date__lte=end_date
            ).delete()
            self.stdout.write(self.style.WARNING(f'Deleted {deleted} existing records in range.'))
            existing = set()
        else:
            existing = set(
                AttendanceRecord.objects.filter(
                    date__gte=start_date, date__lte=end_date
                ).values_list('student_id', 'date')
            )

        to_create = []
        for day in school_days:
            for s in students:
                if (s.id, day) in existing:
                    continue
                to_create.append(
                    AttendanceRecord(student=s, date=day, status=status)
                )

        if to_create:
            AttendanceRecord.objects.bulk_create(to_create, batch_size=2000, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f'Created {len(to_create)} attendance records.'))
        else:
            self.stdout.write(self.style.WARNING('Nothing to create — all records already exist.'))

        self.stdout.write(self.style.SUCCESS('Done.'))
