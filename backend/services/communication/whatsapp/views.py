from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from services.education.communication.models import Message


class WhatsAppWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request, *args, **kwargs):
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode == 'subscribe' and token == getattr(settings, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', None):
            return Response(challenge, status=status.HTTP_200_OK)

        return Response({'detail': 'Invalid verification token'}, status=status.HTTP_403_FORBIDDEN)

    def _rate_limited(self, request):
        try:
            remote_addr = request.META.get('REMOTE_ADDR', 'unknown')
            cache_key = f'whatsapp_webhook_rate:{remote_addr}'
            return not cache.add(cache_key, 1, timeout=60)
        except Exception:
            return False

    def post(self, request, *args, **kwargs):
        if self._rate_limited(request):
            return Response({'detail': 'Rate limit exceeded'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        data = request.data
        statuses = []

        for entry in data.get('entry', []):
            for change in entry.get('changes', []):
                statuses.extend(change.get('value', {}).get('statuses', []))

        for status_payload in statuses:
            message_id = status_payload.get('id')
            phone = status_payload.get('recipient_id') or status_payload.get('recipient_phone')
            status_name = status_payload.get('status')
            timestamp = status_payload.get('timestamp')

            message = None
            if message_id:
                message = Message.objects.filter(external_id=message_id).first()
            if not message and phone:
                message = (
                    Message.objects.filter(recipient_phone=phone, channel='whatsapp', is_delivered=False)
                    .order_by('-created_at')
                    .first()
                )

            if not message:
                continue

            message.delivery_status = status_name or message.delivery_status
            if status_name in ['delivered', 'read', 'sent']:
                message.is_delivered = True
                message.delivered_at = timezone.now()
            if message_id:
                message.external_id = message_id
            message.save(update_fields=['delivery_status', 'is_delivered', 'delivered_at', 'external_id'])

        return Response({'success': True}, status=status.HTTP_200_OK)
