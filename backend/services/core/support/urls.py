from django.urls import path

from . import api

urlpatterns = [
    path('help/', api.help_list),
    path('help/manage/', api.help_manage),
    path('help/manage/<uuid:article_id>/', api.help_manage_one),
    path('help/<slug:slug>/', api.help_article),
    path('help/<slug:slug>/vote/', api.help_vote),
    path('tickets/', api.tickets),
    path('tickets/overview/', api.support_overview),
    path('tickets/<uuid:ticket_id>/', api.ticket_detail),
    path('tickets/<uuid:ticket_id>/manage/', api.ticket_manage),
]
