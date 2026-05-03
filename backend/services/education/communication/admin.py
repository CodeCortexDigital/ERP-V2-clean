from django.contrib import admin
from .models import Message, AutoTrigger, MessageTemplate, WhatsAppConfig, Notification

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'channel', 'is_delivered', 'created_at')
    list_filter = ('channel', 'is_delivered')
    search_fields = ('sender', 'recipient', 'message')

@admin.register(AutoTrigger)
class AutoTriggerAdmin(admin.ModelAdmin):
    list_display = ('name', 'trigger_event', 'channel', 'is_active')
    list_filter = ('trigger_event', 'channel', 'is_active')

@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template_type', 'is_active')
    list_filter = ('template_type', 'is_active')
    search_fields = ('name', 'body')

@admin.register(WhatsAppConfig)
class WhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ('is_active', 'updated_at')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient_type', 'channel', 'is_sent', 'created_at')
    list_filter = ('recipient_type', 'channel', 'is_sent')
