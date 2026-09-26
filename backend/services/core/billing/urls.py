from django.urls import path

from . import api, invoice_api

urlpatterns = [
    path('details/', invoice_api.details, name='billing-details'),
    path('invoices/', invoice_api.invoices, name='billing-invoices'),
    path('invoices/<uuid:invoice_id>/', invoice_api.invoice_detail, name='billing-invoice'),
    path('invoices/<uuid:invoice_id>/pay/', invoice_api.pay, name='billing-invoice-pay'),
    path('stripe/webhook/', invoice_api.stripe_webhook, name='billing-stripe-webhook'),
    path('platform/invoices/', invoice_api.platform_invoices, name='billing-platform-invoices'),
    path('platform/invoices/<uuid:invoice_id>/', invoice_api.platform_invoice_action, name='billing-platform-invoice'),
    path('platform/run/', invoice_api.platform_run, name='billing-platform-run'),
    path('platform/tax/', invoice_api.platform_tax, name='billing-platform-tax'),
    path('plans/', api.plans, name='billing-plans'),
    path('subscription/', api.my_subscription, name='billing-subscription'),
    path('subscription/change/', api.change, name='billing-change'),
    path('subscription/cancel/', api.cancel, name='billing-cancel'),
    path('platform/', api.platform_overview, name='billing-platform'),
    path('platform/schools/<uuid:school_id>/', api.platform_school, name='billing-platform-school'),
    path('platform/plans/<slug:code>/', api.platform_plan, name='billing-platform-plan'),
]
