# Generated manually for leave & substitution feature

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('education_academics', '0012_alter_timetableentry_unique_together'),
    ]

    operations = [
        migrations.AddField(
            model_name='teacher',
            name='teacher_type',
            field=models.CharField(
                choices=[('regular', 'Regular'), ('relief', 'Relief')],
                db_index=True,
                default='regular',
                max_length=20,
                help_text='Relief teachers are kept available to cover regular teachers on leave',
            ),
        ),
        migrations.CreateModel(
            name='TeacherLeave',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('leave_type', models.CharField(
                    choices=[('sick', 'Sick'), ('casual', 'Casual'), ('annual', 'Annual'),
                             ('maternity', 'Maternity'), ('emergency', 'Emergency'), ('other', 'Other')],
                    default='sick', max_length=20)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('reason', models.TextField(blank=True, default='')),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('approved', 'Approved'),
                             ('rejected', 'Rejected'), ('cancelled', 'Cancelled')],
                    default='approved', max_length=20)),
                ('substitute_assigned', models.BooleanField(default=False)),
                ('created_by', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('teacher', models.ForeignKey(
                    on_delete=models.CASCADE, related_name='leaves', to='education_academics.teacher')),
            ],
            options={
                'ordering': ['-start_date'],
            },
        ),
        migrations.CreateModel(
            name='TimetableSubstitution',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('leave', models.ForeignKey(
                    on_delete=models.CASCADE, related_name='substitutions',
                    to='education_academics.teacherleave')),
                ('original_entry', models.ForeignKey(
                    on_delete=models.CASCADE, related_name='substitutions',
                    to='education_academics.timetableentry')),
                ('relief_teacher', models.ForeignKey(
                    on_delete=models.CASCADE, related_name='substitute_assignments',
                    to='education_academics.teacher')),
            ],
            options={
                'unique_together': [('leave', 'original_entry')],
            },
        ),
    ]
