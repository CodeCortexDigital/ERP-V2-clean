from django.db import migrations


def enable_online_payments(apps, schema_editor):
    FeatureFlag = apps.get_model('core_features', 'FeatureFlag')
    FeatureFlag.objects.filter(name='online_payments', tenant__isnull=True).update(
        is_enabled=True,
        rollout_percentage=100,
    )
    try:
        from services.core.features.services import invalidate_feature_cache
        invalidate_feature_cache()
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('core_features', '0002_enable_advanced_analytics'),
    ]

    operations = [
        migrations.RunPython(enable_online_payments, migrations.RunPython.noop),
    ]
