from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer

class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

class NotificationMarkReadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, recipient=request.user)
            notification.is_read = True
            notification.save()
            return Response({'status': 'marked as read'})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)

class NotificationMarkAllReadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

class UnreadCountView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': count})
