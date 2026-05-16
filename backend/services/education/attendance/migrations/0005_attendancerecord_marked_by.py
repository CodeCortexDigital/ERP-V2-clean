from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('education_attendance', '0004_attendance_holiday_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='marked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='attendance_marked',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
