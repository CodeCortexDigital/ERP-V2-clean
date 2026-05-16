"""
WebSocket Consumers for ERP Dashboard
Provides real-time updates for analytics and notifications
"""

import json
import asyncio
from datetime import datetime

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model


class DashboardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for dashboard real-time updates
    Handles KPI updates, notifications, and analytics data
    """
    
    async def connect(self):
        self.room_group_name = 'dashboard_updates'
        self.user = self.scope.get('user')
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial connection message
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'status': 'connected',
            'message': 'WebSocket connected successfully'
        }))
        
        # Start heartbeat
        self.heartbeat_task = asyncio.create_task(self.heartbeat())
    
    async def disconnect(self, close_code):
        # Cancel heartbeat
        if hasattr(self, 'heartbeat_task'):
            self.heartbeat_task.cancel()
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': str(datetime.now())
                }))
            elif message_type == 'subscribe':
                # Subscribe to specific data streams
                stream = data.get('stream')
                if stream:
                    await self.subscribe_to_stream(stream)
            elif message_type == 'unsubscribe':
                stream = data.get('stream')
                if stream:
                    await self.unsubscribe_from_stream(stream)
            elif message_type == 'request_kpi':
                # Send current KPI data
                await self.send_kpi_update()
            elif message_type == 'request_notifications':
                # Send recent notifications
                await self.send_notifications()
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    async def heartbeat(self):
        """Send periodic heartbeat to keep connection alive"""
        while True:
            await asyncio.sleep(30)  # Heartbeat every 30 seconds
            try:
                await self.send(text_data=json.dumps({
                    'type': 'heartbeat',
                    'timestamp': str(datetime.now())
                }))
            except Exception:
                break
    
    async def subscribe_to_stream(self, stream: str):
        """Subscribe to a specific data stream"""
        await self.send(text_data=json.dumps({
            'type': 'subscribed',
            'stream': stream,
            'message': f'Subscribed to {stream}'
        }))
    
    async def unsubscribe_from_stream(self, stream: str):
        """Unsubscribe from a specific data stream"""
        await self.send(text_data=json.dumps({
            'type': 'unsubscribed',
            'stream': stream,
            'message': f'Unsubscribed from {stream}'
        }))
    
    async def send_kpi_update(self):
        """Send KPI data to client"""
        # This would typically fetch from database
        kpi_data = {
            'total_revenue': 125000,
            'total_students': 850,
            'total_employees': 120,
            'inventory_value': 45000,
            'revenue_change': 5.2,
            'students_change': 3.1,
            'employees_change': -1.2,
            'inventory_change': 2.8
        }
        
        await self.send(text_data=json.dumps({
            'type': 'kpi_update',
            'data': kpi_data
        }))
    
    async def send_notifications(self):
        """Send recent notifications to client"""
        notifications = [
            {
                'id': 1,
                'title': 'New Order Received',
                'message': 'Order #1234 has been placed',
                'type': 'order',
                'timestamp': str(datetime.now())
            }
        ]
        
        await self.send(text_data=json.dumps({
            'type': 'notifications',
            'data': notifications
        }))
    
    # Handle messages from room group
    async def dashboard_update(self, event):
        """Handle dashboard update messages"""
        await self.send(text_data=json.dumps(event['data']))
    
    async def kpi_notification(self, event):
        """Handle KPI notification messages"""
        await self.send(text_data=json.dumps({
            'type': 'kpi_update',
            'data': event['data']
        }))
    
    async def alert_notification(self, event):
        """Handle alert notification messages"""
        await self.send(text_data=json.dumps({
            'type': 'alert',
            'data': event['data']
        }))


class AnalyticsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for analytics data streams
    """
    
    async def connect(self):
        self.room_group_name = 'analytics_updates'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data.get('type') == 'chart_update':
            # Handle chart data update requests
            chart_type = data.get('chart_type')
            await self.send_chart_data(chart_type)
    
    async def send_chart_data(self, chart_type: str):
        """Send chart data to client"""
        # This would typically fetch from database
        chart_data = {
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            'datasets': [{
                'label': 'Revenue',
                'data': [30000, 45000, 35000, 50000, 42000, 55000]
            }]
        }
        
        await self.send(text_data=json.dumps({
            'type': 'chart_data',
            'chart_type': chart_type,
            'data': chart_data
        }))
    
    async def analytics_update(self, event):
        """Handle analytics update messages"""
        await self.send(text_data=json.dumps(event['data']))