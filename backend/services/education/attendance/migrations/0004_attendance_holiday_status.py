from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('education_attendance', '0003_add_tenant_nullable'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attendancerecord',
            name='status',
            field=models.CharField(
                choices=[
                    ('present', 'Present'),
                    ('absent', 'Absent'),
                    ('late', 'Late'),
                    ('excused', 'Excused'),
                    ('holiday', 'Holiday'),
                ],
                max_length=20,
            ),
        ),
    ]
