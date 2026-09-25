"""Stripe Checkout for card payments (Visa, Mastercard, Amex, Apple Pay, Google Pay).

Uses Stripe's REST API directly, so no extra dependency is needed. Each school
keeps its own keys (Fees → Online payments). The webhook is signed; we check the
signature with the school's webhook secret before recording any payment.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
from decimal import Decimal

import requests

API = 'https://api.stripe.com/v1'
# Currencies Stripe charges in whole units (no cents).
ZERO_DECIMAL = {'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV',
                'XAF', 'XOF', 'XPF'}
SIGNATURE_TOLERANCE = 300  # seconds


def secret_key(config) -> str:
    return (getattr(config, 'api_secret', '') or os.environ.get('STRIPE_SECRET_KEY', '')).strip()


def webhook_secret(config) -> str:
    return (getattr(config, 'webhook_secret', '') or os.environ.get('STRIPE_WEBHOOK_SECRET', '')).strip()


def to_minor_units(amount: Decimal, currency: str) -> int:
    amount = Decimal(str(amount))
    return int(amount) if currency.upper() in ZERO_DECIMAL else int((amount * 100).quantize(Decimal('1')))


def from_minor_units(value: int, currency: str) -> Decimal:
    return Decimal(value) if currency.upper() in ZERO_DECIMAL else (Decimal(value) / 100)


def create_checkout_session(config, transaction, *, success_url: str, cancel_url: str, customer_email: str = '') -> str:
    """Create a Stripe Checkout Session and return the URL to send the payer to."""
    key = secret_key(config)
    if not key:
        raise ValueError('Stripe is not set up for this school yet.')
    invoice = transaction.invoice
    data = {
        'mode': 'payment',
        'success_url': success_url,
        'cancel_url': cancel_url,
        'client_reference_id': transaction.gateway_reference,
        'metadata[gateway_reference]': transaction.gateway_reference,
        'metadata[invoice_number]': invoice.invoice_number,
        'payment_intent_data[metadata][gateway_reference]': transaction.gateway_reference,
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': transaction.currency.lower(),
        'line_items[0][price_data][unit_amount]': to_minor_units(transaction.amount, transaction.currency),
        'line_items[0][price_data][product_data][name]': f'Invoice {invoice.invoice_number}',
        'line_items[0][price_data][product_data][description]': (invoice.description or invoice.student.full_name)[:300],
    }
    if customer_email:
        data['customer_email'] = customer_email
    resp = requests.post(f'{API}/checkout/sessions', data=data, auth=(key, ''), timeout=20)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        raise ValueError((body.get('error') or {}).get('message') or 'Stripe could not start the payment.')
    transaction.request_payload = {**(transaction.request_payload or {}), 'stripe_session_id': body.get('id')}
    transaction.save(update_fields=['request_payload'])
    return body['url']


def verify_signature(raw_body: bytes, header: str, secret: str, now: float | None = None) -> bool:
    """Check a ``Stripe-Signature`` header (t=timestamp,v1=hmac)."""
    if not (raw_body is not None and header and secret):
        return False
    parts = {}
    for item in header.split(','):
        key, _, value = item.strip().partition('=')
        parts.setdefault(key, []).append(value)
    try:
        timestamp = int(parts.get('t', ['0'])[0])
    except ValueError:
        return False
    if abs((now or time.time()) - timestamp) > SIGNATURE_TOLERANCE:
        return False
    signed = f'{timestamp}.'.encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, sig) for sig in parts.get('v1', []))


def sign(raw_body: bytes, secret: str, timestamp: int | None = None) -> str:
    """Build a Stripe-Signature header (used by tests)."""
    timestamp = timestamp or int(time.time())
    digest = hmac.new(secret.encode(), f'{timestamp}.'.encode() + raw_body, hashlib.sha256).hexdigest()
    return f't={timestamp},v1={digest}'


def parse_event(raw_body: bytes) -> dict:
    return json.loads(raw_body.decode('utf-8') or '{}')


def refund_payment(config, payment_intent: str, amount: Decimal, currency: str) -> str:
    """Refund part or all of a card payment. Returns Stripe's refund id."""
    key = secret_key(config)
    if not key or not payment_intent:
        raise ValueError('This card payment cannot be refunded automatically. Refund it in Stripe, then record it here.')
    resp = requests.post(f'{API}/refunds', data={'payment_intent': payment_intent,
                                                 'amount': to_minor_units(amount, currency)},
                         auth=(key, ''), timeout=20)
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        raise ValueError((body.get('error') or {}).get('message') or 'Stripe could not refund the payment.')
    return body.get('id', '')
