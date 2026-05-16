from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def seed_default_flags(apps, schema_editor):
    FeatureFlag = apps.get_model('core_features', 'FeatureFlag')
    defaults = [
        ('whatsapp_integration', 'WhatsApp messaging and automation'),
        ('online_payments', 'Online payment gateway integration'),
        ('ai_insights', 'AI-powered student and risk insights'),
        ('realtime_notifications', 'WebSocket / realtime notification delivery'),
        ('advanced_analytics', 'Executive dashboards and advanced reporting'),
    ]
    for name, description in defaults:
        FeatureFlag.objects.get_or_create(
            name=name,
            tenant=None,
            defaults={
                'is_enabled': False,
                'rollout_percentage': 0,
                'description': description,
            },
        )


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core_tenants', '0002_backfill_default_tenant'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeatureFlag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=64)),
                ('is_enabled', models.BooleanField(default=False)),
                ('rollout_percentage', models.PositiveSmallIntegerField(
                    default=100,
                    help_text='0–100: share of tenants/users in rollout when enabled.',
                    validators=[
                        django.core.validators.MinValueValidator(0),
                        django.core.validators.MaxValueValidator(100),
                    ],
                )),
                ('description', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tenant', models.ForeignKey(
                    blank=True,
                    help_text='Null = global default; set for per-tenant override.',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='feature_flags',
                    to='core_tenants.school',
                )),
            ],
            options={
                'db_table': 'core_feature_flag',
                'ordering': ['name', 'tenant_id'],
            },
        ),
        migrations.AddIndex(
            model_name='featureflag',
            index=models.Index(fields=['name', 'tenant'], name='core_featur_name_6e0f0d_idx'),
        ),
        migrations.AddIndex(
            model_name='featureflag',
            index=models.Index(fields=['is_enabled'], name='core_featur_is_enab_8f3c2a_idx'),
        ),
        migrations.AddConstraint(
            model_name='featureflag',
            constraint=models.UniqueConstraint(
                condition=models.Q(('tenant__isnull', True)),
                fields=('name',),
                name='core_feature_flag_unique_global_name',
            ),
        ),
        migrations.AddConstraint(
            model_name='featureflag',
            constraint=models.UniqueConstraint(
                condition=models.Q(('tenant__isnull', False)),
                fields=('name', 'tenant'),
                name='core_feature_flag_unique_tenant_name',
            ),
        ),
        migrations.RunPython(seed_default_flags, migrations.RunPython.noop),
    ]
