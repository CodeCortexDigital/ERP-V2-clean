from django.urls import path

from .views import WhatsAppWebhookView, WhatsAppTestSendView

urlpatterns = [
    path('test-send/', WhatsAppTestSendView.as_view(), name='whatsapp-test-send'),
    path('webhook/', WhatsAppWebhookView.as_view(), name='whatsapp-webhook'),
]
