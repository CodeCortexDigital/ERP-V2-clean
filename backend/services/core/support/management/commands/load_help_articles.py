"""Add the starter help articles and saved replies that are missing (never overwrites edited ones)."""
from django.core.management.base import BaseCommand

from services.core.support.help_content import ARTICLES, CANNED
from services.core.support.models import CannedResponse, HelpArticle


class Command(BaseCommand):
    help = 'Add missing starter help articles and saved replies.'

    def handle(self, *args, **opts):
        added = sum(HelpArticle.objects.get_or_create(slug=a['slug'], defaults={k: v for k, v in a.items() if k != 'slug'})[1]
                    for a in ARTICLES)
        canned = sum(CannedResponse.objects.get_or_create(title=c['title'], defaults={'body': c['body']})[1] for c in CANNED)
        self.stdout.write(self.style.SUCCESS(f'Added {added} article(s) and {canned} saved repl(ies).'))
