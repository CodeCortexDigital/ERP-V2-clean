from django.db import migrations

# Frees the name `tenant_id` for the real school FK added in the next migration.
MODELS = ['message', 'notification', 'messagetemplate', 'autotrigger', 'whatsappconfig']


class Migration(migrations.Migration):
    dependencies = [
        ('education_communication', '0002_remove_whatsappconfig_api_key_and_more'),
    ]

    operations = [
        migrations.RenameField(model_name=m, old_name='tenant_id', new_name='legacy_tenant_code')
        for m in MODELS
    ]
