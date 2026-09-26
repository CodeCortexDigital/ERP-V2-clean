from django.db import migrations

PLANS = [
    dict(code='starter', name='Starter', sort=1, price_monthly=49, price_yearly=490, student_limit=150, staff_limit=20,
         description='For small schools: students, admissions, attendance, gradebook, fees and messages.', modules=[]),
    dict(code='standard', name='Standard', sort=2, price_monthly=99, price_yearly=990, student_limit=500, staff_limit=60,
         description='Everything in Starter, plus library, transport and advanced reports.',
         modules=['library', 'transport', 'reports']),
    dict(code='premium', name='Premium', sort=3, price_monthly=199, price_yearly=1990, student_limit=1500, staff_limit=150,
         description='Everything in Standard, plus inventory, cafeteria, integrations, AI assistant and online fee payments.',
         modules=['library', 'transport', 'reports', 'inventory', 'cafeteria', 'integrations', 'ai', 'online_payments']),
    dict(code='enterprise', name='Enterprise', sort=4, price_monthly=0, price_yearly=0, student_limit=None, staff_limit=None,
         contact_sales=True, description='Groups of schools and large campuses: no limits, every module, priced with our team.',
         modules=['library', 'transport', 'reports', 'inventory', 'cafeteria', 'integrations', 'ai', 'online_payments']),
]


def seed(apps, schema_editor):
    Plan = apps.get_model('core_billing', 'Plan')
    for p in PLANS:
        Plan.objects.update_or_create(code=p['code'], defaults=p)


def unseed(apps, schema_editor):
    apps.get_model('core_billing', 'Plan').objects.filter(code__in=[p['code'] for p in PLANS], subscriptions__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [('core_billing', '0001_initial')]
    operations = [migrations.RunPython(seed, unseed)]
