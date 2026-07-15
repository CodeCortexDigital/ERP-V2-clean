from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('education_academics', '0015_leave_balance'),
    ]

    operations = [
        migrations.CreateModel(
            name='Homework',
            fields=[
                ('id', models.UUIDField(default='uuid.uuid4', editable=False, primary_key=True)),
                ('class_name', models.CharField(blank=True, default='', max_length=100)),
                ('teacher_name', models.CharField(blank=True, default='', max_length=255)),
                ('subject_name', models.CharField(blank=True, default='', max_length=100)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('homework_date', models.DateField()),
                ('due_date', models.DateField(blank=True, null=True)),
                ('attachment_name', models.CharField(blank=True, default='', max_length=255)),
                ('attachment_data', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('assigned', 'Assigned'), ('collected', 'Collected'), ('evaluated', 'Evaluated')], default='assigned', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('academic_year', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='education_academics.academicyear')),
                ('class_ref', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='homeworks', to='education_academics.schoolclass')),
                ('teacher', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='homeworks', to='education_academics.teacher')),
            ],
            options={
                'ordering': ['-homework_date', '-created_at'],
            },
        ),
    ]
