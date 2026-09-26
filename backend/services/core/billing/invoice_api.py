"""Platform invoices and payment (P12). /api/v1/billing/"""
from __future__ import annotations

import os

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin
from services.core.accounts.permissions import IsPlatformOwner

from . import invoicing, stripe_platform
from .models import PlatformInvoice, TaxRule


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def invoice_json(inv):
    return {
        'id': str(inv.id), 'number': inv.number, 'kind': inv.kind, 'kind_label': inv.get_kind_display(), 'plan': inv.plan_name,
        'billing_cycle': inv.billing_cycle, 'period_start': inv.period_start, 'period_end': inv.period_end, 'currency': inv.currency,
        'subtotal': float(inv.subtotal), 'tax_label': inv.tax_label, 'tax_rate': float(inv.tax_rate), 'tax_amount': float(inv.tax_amount),
        'tax_note': inv.tax_note, 'total': float(inv.total), 'status': 'overdue' if inv.is_overdue() else inv.status,
        'issue_date': inv.issue_date, 'due_date': inv.due_date, 'paid_at': _local(inv.paid_at), 'paid_via': inv.paid_via,
        'payment_reference': inv.payment_reference, 'bill_to': inv.bill_to, 'school': inv.school.name,
    }


def payment_options():
    return {'card': stripe_platform.enabled(), 'bank_details': invoicing.bank_details()}


def _admin_only(request, what):
    if not is_admin(request.user):
        return Response({'error': f'Only school administrators can {what}.'}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def details(request):
    denied = _admin_only(request, 'see billing details')
    if denied:
        return denied
    if request.method == 'PUT':
        saved, problem = invoicing.save_billing_details(request.tenant, request.data or {})
        if problem:
            return Response({'error': problem}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'details': saved})
    return Response({'details': invoicing.billing_details(request.tenant)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoices(request):
    denied = _admin_only(request, 'see invoices')
    if denied:
        return denied
    rows = PlatformInvoice.objects.filter(school=request.tenant).select_related('school')[:100]
    return Response({'results': [invoice_json(i) for i in rows], 'payment': payment_options()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_detail(request, invoice_id):
    inv = get_object_or_404(PlatformInvoice.objects.select_related('school'), pk=invoice_id)
    mine = is_admin(request.user) and inv.school_id == getattr(getattr(request, 'tenant', None), 'pk', None)
    if not (request.user.is_superuser or mine):
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    seller = {'name': os.environ.get('PLATFORM_LEGAL_NAME', 'CodeCortex School ERP'),
              'address': os.environ.get('PLATFORM_ADDRESS', ''), 'tax_id': os.environ.get('PLATFORM_TAX_ID', '')}
    return Response({'invoice': invoice_json(inv), 'payment': payment_options(), 'seller': seller})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay(request, invoice_id):
    denied = _admin_only(request, 'pay invoices')
    if denied:
        return denied
    inv = get_object_or_404(PlatformInvoice, pk=invoice_id, school=request.tenant)
    if inv.status != 'open':
        return Response({'error': 'This invoice is not open.'}, status=status.HTTP_400_BAD_REQUEST)
    from services.education.integrations.api import safe_origin

    origin = safe_origin((request.data or {}).get('origin') or request.headers.get('Origin', ''))
    if not origin:
        return Response({'error': 'Unknown app address.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        url = stripe_platform.checkout(inv, success_url=f'{origin}/settings/billing?paid={inv.number}',
                                       cancel_url=f'{origin}/settings/billing?cancelled={inv.number}')
    except ValueError as exc:
        return Response({'error': str(exc), 'bank_details': invoicing.bank_details()}, status=status.HTTP_400_BAD_REQUEST)
    return Response({'url': url})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def stripe_webhook(request):
    """Stripe tells us a card payment went through. Only signed events are trusted."""
    secret = stripe_platform.webhook_secret()
    raw = request.body
    if not secret or not stripe_platform.verify_signature(raw, request.headers.get('Stripe-Signature', ''), secret):
        return Response({'error': 'Bad signature.'}, status=status.HTTP_400_BAD_REQUEST)
    event = stripe_platform.parse_event(raw)
    if event.get('type') in ('checkout.session.completed', 'checkout.session.async_payment_succeeded'):
        obj = (event.get('data') or {}).get('object') or {}
        inv_id = (obj.get('metadata') or {}).get('platform_invoice')
        if inv_id and obj.get('payment_status', 'paid') == 'paid':
            inv = PlatformInvoice.objects.filter(pk=inv_id).first()
            if inv is not None and inv.status == 'open':
                invoicing.mark_paid(inv, via='card', reference=str(obj.get('payment_intent') or obj.get('id') or ''))
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def platform_invoices(request):
    qs = PlatformInvoice.objects.select_related('school')
    state = request.GET.get('status')
    if state == 'overdue':
        qs = qs.filter(status='open', due_date__lt=timezone.localdate())
    elif state in ('open', 'paid', 'void'):
        qs = qs.filter(status=state)
    return Response({'results': [invoice_json(i) for i in qs[:300]]})


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def platform_invoice_action(request, invoice_id):
    inv = get_object_or_404(PlatformInvoice, pk=invoice_id)
    d = request.data or {}
    try:
        if d.get('action') == 'mark_paid':
            invoicing.mark_paid(inv, via=str(d.get('via') or 'bank_transfer')[:20], reference=str(d.get('reference') or ''), by=request.user)
        elif d.get('action') == 'void':
            invoicing.void(inv, by=request.user)
        else:
            return Response({'error': 'Unknown action.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    inv.refresh_from_db()
    return Response({'invoice': invoice_json(inv)})


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def platform_run(request):
    return Response(invoicing.run())


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsPlatformOwner])
def platform_tax(request):
    d = request.data or {}
    if request.method == 'PUT':
        country = str(d.get('country') or '').upper()
        if len(country) != 2 or not country.isalpha():
            return Response({'error': 'Country must be a two-letter code.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rate = float(d.get('rate'))
            if not 0 <= rate <= 50:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'error': 'Rate must be a percentage between 0 and 50.'}, status=status.HTTP_400_BAD_REQUEST)
        TaxRule.objects.update_or_create(country=country, defaults={
            'label': str(d.get('label') or 'VAT')[:30], 'rate': rate, 'exempt_with_tax_id': bool(d.get('exempt_with_tax_id'))})
    elif request.method == 'DELETE':
        TaxRule.objects.filter(country=str(d.get('country') or request.GET.get('country') or '').upper()).delete()
    return Response({'rules': [{'country': t.country, 'label': t.label, 'rate': float(t.rate), 'exempt_with_tax_id': t.exempt_with_tax_id}
                               for t in TaxRule.objects.all()]})
