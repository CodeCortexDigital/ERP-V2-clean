import hmac
import hashlib
import json
import os
import uuid
from decimal import Decimal
from urllib.parse import quote_plus

from django.apps import apps
from django.conf import settings


def get_payment_gateway_config_model():
    return apps.get_model('education_finance', 'PaymentGatewayConfig')


def get_payment_transaction_model():
    return apps.get_model('education_finance', 'PaymentTransaction')


def get_invoice_model():
    return apps.get_model('education_finance', 'Invoice')


def _get_env_value(provider_key: str, *keys: str) -> str:
    for key in keys:
        value = os.environ.get(f'{provider_key}_{key}', '')
        if value:
            return value
    return ''


def _load_env_gateway_config(provider: str) -> dict:
    provider_key = provider.upper()
    alternate_key = 'EASYPAISA' if provider_key == 'EASYPAYSA' else provider_key
    return {
        'provider': provider,
        'name': provider.title(),
        'merchant_id': _get_env_value(provider_key, 'MERCHANT_ID', 'CLIENT_ID', 'PASSWORD') or _get_env_value(alternate_key, 'MERCHANT_ID', 'CLIENT_ID', 'PASSWORD'),
        'api_key': _get_env_value(provider_key, 'API_KEY', 'CLIENT_ID') or _get_env_value(alternate_key, 'API_KEY', 'CLIENT_ID'),
        'api_secret': _get_env_value(provider_key, 'API_SECRET', 'PASSWORD') or _get_env_value(alternate_key, 'API_SECRET', 'PASSWORD'),
        'api_url': _get_env_value(provider_key, 'API_URL') or _get_env_value(alternate_key, 'API_URL'),
        'webhook_secret': _get_env_value(provider_key, 'WEBHOOK_SECRET') or _get_env_value(alternate_key, 'WEBHOOK_SECRET'),
        'callback_url': _get_env_value(provider_key, 'REDIRECT_URL') or _get_env_value(alternate_key, 'REDIRECT_URL'),
        'is_active': bool(_get_env_value(provider_key, 'MERCHANT_ID', 'CLIENT_ID', 'PASSWORD') or _get_env_value(alternate_key, 'MERCHANT_ID', 'CLIENT_ID', 'PASSWORD')),
    }


def get_active_gateway_config(provider: str, tenant=None):
    provider = provider.lower()
    PaymentGatewayConfig = get_payment_gateway_config_model()
    qs = PaymentGatewayConfig.objects.filter(provider=provider, is_active=True)
    if tenant is not None:
        qs = qs.filter(tenant=tenant)
    config = qs.first()
    if config:
        return config

    if provider == 'stripe':
        # Platform-wide keys from the environment (single-school installs).
        key = os.environ.get('STRIPE_SECRET_KEY', '')
        return PaymentGatewayConfig(provider='stripe', name='Stripe', api_secret=key,
                                    webhook_secret=os.environ.get('STRIPE_WEBHOOK_SECRET', ''),
                                    is_active=True) if key else None

    env_config = _load_env_gateway_config(provider)
    if env_config['merchant_id']:
        return PaymentGatewayConfig(**env_config)

    return None


def _build_checkout_url(config, transaction):
    api_url = config.api_url or os.environ.get(f'{config.provider.upper()}_API_URL', '')
    if not api_url:
        return f'https://sandbox.payments.example.com/{config.provider}/checkout?ref={transaction.gateway_reference}'

    callback = config.callback_url or os.environ.get(f'{config.provider.upper()}_REDIRECT_URL', '')
    encoded_callback = quote_plus(callback) if callback else ''
    return (
        f"{api_url.rstrip('/')}/checkout?merchant_id={quote_plus(config.merchant_id)}"
        f"&amount={quote_plus(str(transaction.amount))}&currency={quote_plus(transaction.currency)}"
        f"&reference={quote_plus(transaction.gateway_reference)}&invoice_number={quote_plus(transaction.invoice.invoice_number)}"
        f"&callback_url={encoded_callback}"
    )


def invoice_currency(invoice) -> str:
    from services.core.tenants.localization import school_locale

    return school_locale(getattr(invoice.student, 'tenant', None))['currency']


def generate_payment_session(invoice, provider: str = 'jazzcash', customer_name: str | None = None,
                             customer_phone: str | None = None, success_url: str = '', cancel_url: str = '',
                             customer_email: str = ''):
    provider = provider.lower()
    if invoice.balance_due <= 0:
        raise ValueError('Invoice is already paid or has no balance due')

    config = get_active_gateway_config(provider, tenant=getattr(invoice.student, 'tenant', None))
    ready = getattr(config, 'api_secret', None) if provider == 'stripe' else getattr(config, 'merchant_id', None)
    if not config or not ready:
        raise ValueError(f'Online payment with {provider.title()} is not set up for this school.')

    PaymentTransaction = get_payment_transaction_model()
    gateway_reference = f'{provider.upper()}-{uuid.uuid4().hex[:20]}'

    transaction = PaymentTransaction.objects.create(
        invoice=invoice,
        gateway=provider,
        amount=invoice.balance_due,
        currency=invoice_currency(invoice),
        gateway_reference=gateway_reference,
        status='pending',
        request_payload={
            'provider': provider,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.invoice_number,
            'callback_url': config.callback_url or os.environ.get(f'{provider.upper()}_REDIRECT_URL', ''),
        },
    )

    if provider == 'stripe':
        from . import stripe_gateway

        checkout_url = stripe_gateway.create_checkout_session(
            config, transaction, success_url=success_url, cancel_url=cancel_url, customer_email=customer_email)
    else:
        checkout_url = _build_checkout_url(config, transaction)
    return transaction, checkout_url


def verify_gateway_webhook(provider: str, payload: dict, headers: dict) -> bool:
    provider = provider.lower()
    config = get_active_gateway_config(provider)
    if not config:
        return False

    secret = getattr(config, 'webhook_secret', '') or os.environ.get(f'{provider.upper()}_WEBHOOK_SECRET', '')
    if not secret:
        return False

    signature = headers.get('X-Payment-Signature') or headers.get('X-Signature')
    if not signature:
        return False

    message = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    expected = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def process_gateway_webhook(provider: str, payload: dict):
    provider = provider.lower()
    PaymentTransaction = get_payment_transaction_model()
    Invoice = get_invoice_model()
    Payment = apps.get_model('education_finance', 'Payment')

    reference = payload.get('transaction_reference') or payload.get('reference') or payload.get('gateway_reference')
    status = str(payload.get('status', '')).lower()
    amount = payload.get('amount')
    payment_id = payload.get('payment_id') or payload.get('transaction_id')

    transaction = None
    if reference:
        transaction = PaymentTransaction.objects.filter(gateway_reference=reference).first()

    if not transaction:
        invoice_number = payload.get('invoice_number')
        if invoice_number:
            invoice = Invoice.objects.filter(invoice_number=invoice_number).first()
            if invoice:
                transaction = PaymentTransaction.objects.filter(invoice=invoice, status='pending').order_by('-created_at').first()

    if not transaction:
        raise ValueError('Payment transaction not found')

    transaction.status = 'completed' if status in ('success', 'completed', 'paid') else 'failed' if status in ('failed', 'declined', 'cancelled') else transaction.status
    transaction.response_payload = payload
    transaction.is_confirmed = status in ('success', 'completed', 'paid')
    transaction.save()

    if transaction.is_confirmed:
        payment_amount = Decimal(str(amount or transaction.amount))
        existing_payment = Payment.objects.filter(invoice=transaction.invoice, transaction_id=transaction.gateway_reference).first()
        if not existing_payment:
            Payment.objects.create(
                invoice=transaction.invoice,
                amount=payment_amount,
                payment_method='online',
                transaction_id=transaction.gateway_reference,
                notes=f'{provider.title()} payment confirmed',
            )

    return transaction


def handle_stripe_webhook(raw_body: bytes, signature_header: str):
    """Verify and apply a Stripe event. Returns (ok, message).

    The payment is matched to our transaction first (by the reference we put in
    the session metadata), and the signature is checked with that school's
    webhook secret, so each school can use its own Stripe account.
    """
    from services.core.tenants.context import use_tenant

    from . import stripe_gateway

    try:
        event = stripe_gateway.parse_event(raw_body)
    except ValueError:
        return False, 'Unreadable event'
    obj = (event.get('data') or {}).get('object') or {}
    reference = (obj.get('metadata') or {}).get('gateway_reference') or obj.get('client_reference_id')
    PaymentTransaction = get_payment_transaction_model()
    Payment = apps.get_model('education_finance', 'Payment')
    with use_tenant(None):
        transaction = PaymentTransaction.objects.select_related('invoice__student__tenant').filter(
            gateway_reference=reference).first() if reference else None
        if transaction is None:
            return True, 'Ignored: not one of our payments'
        school = transaction.invoice.student.tenant
    with use_tenant(school):
        config = get_active_gateway_config('stripe', tenant=school)
        if not stripe_gateway.verify_signature(raw_body, signature_header, stripe_gateway.webhook_secret(config)):
            return False, 'Invalid signature'
        kind = event.get('type', '')
        if kind in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')                 and obj.get('payment_status') == 'paid':
            transaction.status = 'completed'
            transaction.is_confirmed = True
            transaction.response_payload = {'event': kind, 'session': obj.get('id'),
                                            'payment_intent': obj.get('payment_intent'),
                                            'amount_total': obj.get('amount_total')}
            transaction.save()
            if not Payment.objects.filter(invoice=transaction.invoice, transaction_id=transaction.gateway_reference).exists():
                amount = stripe_gateway.from_minor_units(obj.get('amount_total') or 0, transaction.currency)                     if obj.get('amount_total') else transaction.amount
                amount = min(Decimal(str(amount)), transaction.invoice.balance_due)
                if amount > 0:
                    Payment.objects.create(invoice=transaction.invoice, amount=amount, payment_method='online',
                                           transaction_id=transaction.gateway_reference, notes='Card payment (Stripe)')
        elif kind in ('checkout.session.expired', 'checkout.session.async_payment_failed'):
            transaction.status = 'failed' if 'failed' in kind else 'cancelled'
            transaction.save(update_fields=['status', 'updated_at'])
    return True, 'Processed'
