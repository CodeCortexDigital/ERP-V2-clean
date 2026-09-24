import json
import os
from typing import Any, Dict, Optional
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone

try:
    import requests
except ImportError:  # pragma: no cover
    requests = None

from services.education.communication.models import MessageTemplate, WhatsAppConfig


class WhatsAppService:
    GRAPH_API_BASE = 'https://graph.facebook.com/v17.0'
    DEFAULT_LANGUAGE = 'en_US'
    TEMPLATE_NAMES = {
        'attendance_absent': 'attendance_absent',
        'fee_reminder': 'fee_reminder',
        'result_published': 'result_published',
    }

    def __init__(self, tenant_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.config = self._get_active_config()

    def _get_active_config(self) -> Optional[WhatsAppConfig]:
        query = WhatsAppConfig.objects.filter(is_active=True)
        if self.tenant_id:
            query = query.filter(legacy_tenant_code=self.tenant_id)
        config = query.order_by('-updated_at').first()
        if config:
            return config

        phone_number_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID')
        access_token = os.environ.get('WHATSAPP_ACCESS_TOKEN')
        business_account_id = os.environ.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
        if phone_number_id and access_token:
            return WhatsAppConfig(
                phone_number_id=phone_number_id,
                access_token=access_token,
                business_account_id=business_account_id or '',
                webhook_verified=False,
                is_active=True,
                legacy_tenant_code=self.tenant_id or '',
            )
        return None

    @property
    def verify_token(self) -> str:
        return os.environ.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'whatsapp_verify_token')

    def _get_headers(self) -> Dict[str, str]:
        if not self.config or not self.config.access_token:
            raise ValueError('Active WhatsApp configuration is missing access token')
        return {
            'Authorization': f'Bearer {self.config.access_token}',
            'Content-Type': 'application/json',
        }

    def _build_template_payload(self, phone: str, template_name: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        body_parameters = []
        for value in variables.values():
            body_parameters.append({
                'type': 'text',
                'text': str(value),
            })

        return {
            'messaging_product': 'whatsapp',
            'recipient_type': 'individual',
            'to': phone,
            'type': 'template',
            'template': {
                'name': self.TEMPLATE_NAMES.get(template_name, template_name),
                'language': {'code': self.DEFAULT_LANGUAGE},
                'components': [
                    {
                        'type': 'body',
                        'parameters': body_parameters,
                    }
                ],
            },
        }

    def _build_text_payload(self, phone: str, text: str) -> Dict[str, Any]:
        return {
            'messaging_product': 'whatsapp',
            'to': phone,
            'type': 'text',
            'text': {
                'preview_url': False,
                'body': text,
            },
        }

    def _send_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.config or not self.config.phone_number_id:
            raise ValueError('Active WhatsApp configuration is missing phone number ID')

        url = f'{self.GRAPH_API_BASE}/{self.config.phone_number_id}/messages'
        headers = self._get_headers()

        if requests:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response_data = response.json()
            if response.status_code >= 400:
                raise RuntimeError(f'WhatsApp API request failed: {response_data}')
            return response_data

        data = json.dumps(payload).encode('utf-8')
        request = Request(url, data=data, headers=headers, method='POST')
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))

    def _resolve_template_name(self, template: str) -> Optional[str]:
        if template in self.TEMPLATE_NAMES:
            return self.TEMPLATE_NAMES[template]
        return None

    def send_message(
        self,
        phone: str,
        template: Optional[str],
        variables: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not phone:
            raise ValueError('Recipient phone number is required')

        if template and self._resolve_template_name(template):
            payload = self._build_template_payload(phone, template, variables)
        elif variables.get('body'):
            payload = self._build_text_payload(phone, variables.get('body', ''))
        else:
            payload = self._build_text_payload(phone, str(variables))

        response_data = self._send_payload(payload)
        external_id = None
        if isinstance(response_data, dict):
            data = response_data.get('messages')
            if isinstance(data, list) and data:
                external_id = data[0].get('id')

        return {
            'success': True,
            'external_id': external_id,
            'response': response_data,
        }

    def render_template(self, template_name: str, variables: Dict[str, Any]) -> str:
        template = MessageTemplate.objects.filter(template_type=template_name, is_active=True).first()
        if template:
            return template.render(variables)
        return ' '.join(str(v) for v in variables.values())
