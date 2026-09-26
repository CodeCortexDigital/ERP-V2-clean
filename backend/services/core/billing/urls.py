from django.urls import path

from . import api

urlpatterns = [
    path('plans/', api.plans, name='billing-plans'),
    path('subscription/', api.my_subscription, name='billing-subscription'),
    path('subscription/change/', api.change, name='billing-change'),
    path('subscription/cancel/', api.cancel, name='billing-cancel'),
    path('platform/', api.platform_overview, name='billing-platform'),
    path('platform/schools/<uuid:school_id>/', api.platform_school, name='billing-platform-school'),
    path('platform/plans/<slug:code>/', api.platform_plan, name='billing-platform-plan'),
]
