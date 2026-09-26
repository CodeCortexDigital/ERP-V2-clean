"""Card payment of platform invoices through Stripe Checkout, with the platform's own keys (P12).
Environment: PLATFORM_STRIPE_SECRET_KEY, PLATFORM_STRIPE_WEBHOOK_SECRET (separate from any school's fee keys)."""
from __future__ import annotations

import os

import requests

from services.education.finance.payments.stripe_gateway import API, parse_event, to_minor_units, verify_signature  # noqa: F401


def secret_key() -> str:
    return os.environ.get('PLATFORM_STRIPE_SECRET_KEY', '').strip()


def webhook_secret() -> str:
    return os.environ.get('PLATFORM_STRIPE_WEBHOOK_SECRET', '').strip()


def enabled() -> bool:
    return bool(secret_key())


def checkout(invoice, *, success_url: str, cancel_url: str) -> str:
    key = secret_key()
    if not key:
        raise ValueError('Card payment is not set up yet. Please pay by bank transfer.')
    data = {
        'mode': 'payment', 'success_url': success_url, 'cancel_url': cancel_url,
        'client_reference_id': str(invoice.id),
        'metadata[platform_invoice]': str(invoice.id),
        'payment_intent_data[metadata][platform_invoice]': str(invoice.id),
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': invoice.currency.lower(),
        'line_items[0][price_data][unit_amount]': to_minor_units(invoice.total, invoice.currency),
        'line_items[0][price_data][product_data][name]': f'{invoice.plan_name} plan – {invoice.number}',
    }
    if invoice.bill_to.get('email'):
        data['customer_email'] = invoice.bill_to['email']
    resp = requests.post(f'{API}/checkout/sessions', data=data, auth=(key, ''), timeout=20)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        raise ValueError((body.get('error') or {}).get('message') or 'Stripe could not start the payment.')
    invoice.stripe_session_id = body.get('id', '')[:120]
    invoice.save(update_fields=['stripe_session_id'])
    return body['url']
