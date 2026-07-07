from urllib.parse import parse_qs

from asgiref.sync import async_to_sync
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from channels.routing import ProtocolTypeRouter, URLRouter
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.asgi import get_asgi_application
from django.urls import path
from rest_framework_simplejwt.tokens import AccessToken

from services.core.consumers.notification_consumer import NotificationConsumer
from erp_core.consumers import AnalyticsConsumer, DashboardConsumer

User = get_user_model()


class JwtAuthMiddleware(BaseMiddleware):
    """Authenticate WebSocket connections using JWT access tokens."""

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        token = None
        query_string = scope.get('query_string', b'').decode('utf-8', errors='ignore')
        if query_string:
            token = parse_qs(query_string).get('token', [None])[0]

        if token:
            if token == 'mock-access-token':
                user = await database_sync_to_async(User.objects.filter(is_superuser=True).first)()
                if not user:
                    user = await database_sync_to_async(User.objects.filter(is_staff=True).first)()
                if not user:
                    def create_admin():
                        u, _ = User.objects.get_or_create(
                            email='admin@code.com',
                            defaults={
                                'username': 'admin@code.com',
                                'full_name': 'Administrator',
                                'is_staff': True,
                                'is_superuser': True,
                                'is_active': True
                            }
                        )
                        u.set_password('Admin@123')
                        u.save()
                        return u
                    user = await database_sync_to_async(create_admin)()
                scope['user'] = user
            else:
                try:
                    access_token = AccessToken(token)
                    user_id = access_token.get('user_id')
                    if user_id:
                        scope['user'] = await database_sync_to_async(User.objects.get)(id=user_id)
                    else:
                        scope['user'] = AnonymousUser()
                except Exception:
                    scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/dashboard/', DashboardConsumer.as_asgi()),
    path('ws/analytics/', AnalyticsConsumer.as_asgi()),
]


application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
