"""Restore soft-deleted records by model and primary key."""

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError


RESTORABLE = {
    'student': ('education_students', 'Student'),
    'attendance': ('education_attendance', 'AttendanceRecord'),
    'notification': ('user_notifications', 'Notification'),
    'invoice': ('education_finance', 'Invoice'),
}


class Command(BaseCommand):
    help = 'Restore a soft-deleted row (sets deleted_at=NULL)'

    def add_arguments(self, parser):
        parser.add_argument('model', choices=sorted(RESTORABLE.keys()))
        parser.add_argument('pk', help='UUID primary key')

    def handle(self, *args, **options):
        app_label, model_name = RESTORABLE[options['model']]
        Model = apps.get_model(app_label, model_name)
        try:
            instance = Model.all_objects.get(pk=options['pk'])
        except Model.DoesNotExist as exc:
            raise CommandError(str(exc)) from exc
        if not instance.deleted_at:
            self.stdout.write(self.style.WARNING('Record is not deleted'))
            return
        instance.restore()
        self.stdout.write(self.style.SUCCESS(f'Restored {app_label}.{model_name} {options["pk"]}'))
