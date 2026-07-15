# Generated manually: make leave teacher optional + record applicant details

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('education_academics', '0013_teacher_type_leave_substitution'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teacherleave',
            name='teacher',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name='leaves',
                to='education_academics.teacher',
            ),
        ),
        migrations.AddField(
            model_name='teacherleave',
            name='applicant_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='teacherleave',
            name='applicant_email',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
