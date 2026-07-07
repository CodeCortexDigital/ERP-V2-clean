"""
WebSocket Consumers for ERP Dashboard
Provides real-time updates for analytics and notifications
"""

import json
import asyncio
from datetime import datetime

from asgiref.sync import async_to_sync
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@database_sync_to_async
def _fetch_kpi_from_db():
    """Fetch live KPI counts from the database using safe model lookups."""
    from django.apps import apps

    def safe_count(app_label, model_name, **filters):
        try:
            Model = apps.get_model(app_label, model_name)
            return Model.objects.filter(**filters).count()
        except Exception:
            return 0

    total_students = safe_count('education_students', 'Student', is_active=True)
    total_teachers = safe_count('education_academics', 'Teacher', is_active=True)
    total_classes  = safe_count('education_academics', 'SchoolClass')

    return {
        'total_students': total_students,
        'total_teachers': total_teachers,
        'total_classes': total_classes,
        'timestamp': datetime.now().isoformat(),
    }


def broadcast_dashboard_kpi():
    """
    Synchronous helper – call from Django signals / Celery tasks to push
    a fresh kpi_update to every connected DashboardConsumer.
    """
    import asyncio as _asyncio

    async def _push():
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        kpi_data = await _fetch_kpi_from_db()
        await channel_layer.group_send(
            'dashboard_updates',
            {
                'type': 'kpi_notification',
                'data': kpi_data,
            },
        )

    try:
        loop = _asyncio.get_event_loop()
        if loop.is_running():
            # Already inside an async context (Channels / Daphne)
            loop.create_task(_push())
        else:
            loop.run_until_complete(_push())
    except RuntimeError:
        # No loop in this thread – create one
        _asyncio.run(_push())


# ---------------------------------------------------------------------------
# Consumers
# ---------------------------------------------------------------------------

class DashboardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for dashboard real-time updates.
    Handles KPI updates, notifications, and analytics data.
    """

    async def connect(self):
        self.room_group_name = 'dashboard_updates'
        self.user = self.scope.get('user')

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Confirm connection
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'status': 'connected',
            'message': 'WebSocket connected successfully',
        }))

        # Push fresh KPI data immediately on connect
        await self.send_kpi_update()

        # Start keep-alive heartbeat
        self.heartbeat_task = asyncio.create_task(self.heartbeat())

    async def disconnect(self, close_code):
        if hasattr(self, 'heartbeat_task'):
            self.heartbeat_task.cancel()
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': datetime.now().isoformat(),
                }))
            elif message_type == 'subscribe':
                stream = data.get('stream')
                if stream:
                    await self.subscribe_to_stream(stream)
            elif message_type == 'unsubscribe':
                stream = data.get('stream')
                if stream:
                    await self.unsubscribe_from_stream(stream)
            elif message_type == 'request_kpi':
                await self.send_kpi_update()
            elif message_type == 'request_notifications':
                await self.send_notifications()

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format',
            }))

    async def heartbeat(self):
        """Send periodic ping to keep the connection alive."""
        while True:
            await asyncio.sleep(30)
            try:
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat',
                    'timestamp': datetime.now().isoformat(),
                }))
            except Exception:
                break

    async def subscribe_to_stream(self, stream: str):
        """Subscribe to a specific data stream."""
        await self.send(text_data=json.dumps({
            'type': 'subscribed',
            'stream': stream,
            'message': f'Subscribed to {stream}',
        }))

    async def unsubscribe_from_stream(self, stream: str):
        """Unsubscribe from a specific data stream."""
        await self.send(text_data=json.dumps({
            'type': 'unsubscribed',
            'stream': stream,
            'message': f'Unsubscribed from {stream}',
        }))

    async def send_kpi_update(self):
        """Fetch live DB counts and send kpi_update to this client."""
        kpi_data = await _fetch_kpi_from_db()
        await self.send(text_data=json.dumps({
            'type': 'kpi_update',
            'data': kpi_data,
        }))

    async def send_notifications(self):
        """Send recent notifications to client."""
        notifications = [
            {
                'id': 1,
                'title': 'Dashboard Loaded',
                'message': 'Real-time sync active',
                'type': 'info',
                'timestamp': datetime.now().isoformat(),
            }
        ]
        await self.send(text_data=json.dumps({
            'type': 'notifications',
            'data': notifications,
        }))

    # ------------------------------------------------------------------
    # Channel-layer group message handlers
    # ------------------------------------------------------------------

    async def dashboard_update(self, event):
        """Handle generic dashboard update messages from group."""
        await self.send(text_data=json.dumps(event['data']))

    async def kpi_notification(self, event):
        """Handle KPI notification messages from group."""
        await self.send(text_data=json.dumps({
            'type': 'kpi_update',
            'data': event['data'],
        }))

    async def alert_notification(self, event):
        """Handle alert notification messages from group."""
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'data': event['data'],
        }))

    async def attendance_update(self, event):
        """Handle attendance update messages from group — push to client."""
        await self.send(text_data=json.dumps({
            'type': 'attendance_update',
            'data': event['data'],
        }))


class AnalyticsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for analytics data streams.
    """

    async def connect(self):
        self.room_group_name = 'analytics_updates'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'chart_update':
            await self.send_chart_data(data.get('chart_type'))

    async def send_chart_data(self, chart_type: str):
        """Send chart data to client."""
        chart_data = {
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            'datasets': [{'label': 'Revenue', 'data': [30000, 45000, 35000, 50000, 42000, 55000]}],
        }
        await self.send(text_data=json.dumps({
            'type': 'chart_data',
            'chart_type': chart_type,
            'data': chart_data,
        }))

    async def analytics_update(self, event):
        """Handle analytics update messages from group."""
        await self.send(text_data=json.dumps(event['data']))