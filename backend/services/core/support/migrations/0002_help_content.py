from django.db import migrations


def load(apps, schema_editor):
    from services.core.support.help_content import ARTICLES, CANNED

    HelpArticle = apps.get_model('core_support', 'HelpArticle')
    CannedResponse = apps.get_model('core_support', 'CannedResponse')
    for a in ARTICLES:
        HelpArticle.objects.get_or_create(slug=a['slug'], defaults={k: v for k, v in a.items() if k != 'slug'})
    for c in CANNED:
        CannedResponse.objects.get_or_create(title=c['title'], defaults={'body': c['body']})


class Migration(migrations.Migration):
    dependencies = [('core_support', '0001_initial')]
    operations = [migrations.RunPython(load, migrations.RunPython.noop)]
