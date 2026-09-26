from django.db import migrations

# The services this system is built to use. Locations are left for the platform owner to fill in for their own accounts.
SEED = [
    ('Render', 'Hosting the application servers and database', 'All school records', False, 'https://render.com'),
    ('Vercel', 'Hosting the web app (the pages people open)', 'Pages and sign-in traffic; no records stored', False, 'https://vercel.com'),
    ('Stripe', 'Card payments (school fees and subscriptions), when switched on', 'Payer name, email and payment details', True, 'https://stripe.com'),
    ('OpenAI', 'AI assistant, when a school switches it on', 'Questions asked and the records needed to answer them', True, 'https://openai.com'),
    ('Anthropic', 'AI assistant, when a school switches it on', 'Questions asked and the records needed to answer them', True, 'https://www.anthropic.com'),
    ('Google', 'Sign in with Google and Google Classroom, when switched on', 'Name, email, class rosters', True, 'https://google.com'),
    ('Microsoft', 'Sign in with Microsoft 365, when switched on', 'Name and email', True, 'https://microsoft.com'),
    ('Twilio', 'Text messages (SMS), when a school sets it up', 'Phone numbers and message text', True, 'https://twilio.com'),
]


def seed(apps, schema_editor):
    SubProcessor = apps.get_model('core_privacy', 'SubProcessor')
    if SubProcessor.objects.exists():
        return
    for i, (name, purpose, data, optional, site) in enumerate(SEED):
        SubProcessor.objects.create(name=name, purpose=purpose, data=data, optional=optional, website=site, sort=i)


class Migration(migrations.Migration):
    dependencies = [('core_privacy', '0001_initial')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
