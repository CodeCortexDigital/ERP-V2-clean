# Generated manually: leave balance tracking

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('education_academics', '0014_leave_applicant'),
    ]

    operations = [
        migrations.CreateModel(
            name='LeaveBalance',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('applicant_email', models.CharField(blank=True, default='', max_length=255)),
                ('annual_entitlement', models.IntegerField(default=0, help_text='Total leave days allowed per year')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('teacher', models.ForeignKey(
                    blank=True, null=True, on_delete=models.CASCADE,
                    related_name='leave_balance', to='education_academics.teacher')),
            ],
            options={
                'constraints': [
                    models.UniqueConstraint(
                        condition=models.Q(teacher__isnull=False),
                        fields=['teacher'], name='uniq_leave_balance_teacher'),
                    models.UniqueConstraint(
                        condition=models.Q(applicant_email__gt=''),
                        fields=['applicant_email'], name='uniq_leave_balance_email'),
                ],
            },
        ),
    ]
