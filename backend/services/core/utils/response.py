from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response


def success_response(data=None, message='Success', status_code=200):
    return Response(
        {
            'success': True,
            'message': message,
            'data': data,
            'errors': [],
        },
        status=status_code,
    )


def error_response(message='Error', errors=None, status_code=400):
    return Response(
        {
            'success': False,
            'message': message,
            'data': None,
            'errors': errors or [],
        },
        status=status_code,
    )


class StandardizedJSONRenderer(JSONRenderer):
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None

        if data is None:
            return super().render(data, accepted_media_type, renderer_context)

        if isinstance(data, dict) and data.get('success') is not None:
            return super().render(data, accepted_media_type, renderer_context)

        if response is not None and response.status_code >= 400:
            if isinstance(data, dict):
                message = data.get('message') or 'Error'
                errors = data.get('errors') or data.get('detail') or data
            else:
                message = 'Error'
                errors = data
            payload = {
                'success': False,
                'message': message,
                'data': None,
                'errors': errors,
            }
            return super().render(payload, accepted_media_type, renderer_context)

        if isinstance(data, dict) and 'pagination' in data and 'results' in data:
            payload = {
                'success': True,
                'message': 'Success',
                'data': data['results'],
                'errors': [],
                'pagination': data['pagination'],
            }
            return super().render(payload, accepted_media_type, renderer_context)

        payload = {
            'success': True,
            'message': 'Success',
            'data': data,
            'errors': [],
        }
        return super().render(payload, accepted_media_type, renderer_context)
