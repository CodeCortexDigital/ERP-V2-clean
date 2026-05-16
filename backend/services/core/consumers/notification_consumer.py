import json

from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for user notification push delivery."""

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or self.user.is_anonymous:
            await self.close(code=4401)
            return

        self.group_name = f'user_notifications_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send(text_data=json.dumps({
            'type': 'connection',
            'status': 'connected',
            'message': 'Notifications WebSocket connected',
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            return

        message_type = payload.get('type')
        if message_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    async def send_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event.get('data', {}),
        }))
