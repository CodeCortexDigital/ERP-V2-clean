from django.db import migrations


def enable_advanced_analytics(apps, schema_editor):
    FeatureFlag = apps.get_model('core_features', 'FeatureFlag')
    FeatureFlag.objects.filter(name='advanced_analytics', tenant__isnull=True).update(
        is_enabled=True,
        rollout_percentage=100,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('core_features', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(enable_advanced_analytics, migrations.RunPython.noop),
    ]
