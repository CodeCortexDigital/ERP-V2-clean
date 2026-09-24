from django.contrib import admin
from .models import Message, AutoTrigger, MessageTemplate, WhatsAppConfig, Notification

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        'sender',
        'recipient',
        'channel',
        'template_name',
        'delivery_status',
        'is_delivered',
        'retry_count',
        'created_at',
    )
    list_filter = ('channel', 'is_delivered', 'delivery_status')
    search_fields = ('sender', 'recipient', 'message', 'template_name')

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
    list_display = (
        'business_account_id',
        'phone_number_id',
        'webhook_verified',
        'is_active',
        'legacy_tenant_code',
        'updated_at',
    )
    list_filter = ('is_active', 'webhook_verified')
    search_fields = ('phone_number_id', 'business_account_id', 'legacy_tenant_code')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient_type', 'channel', 'is_sent', 'created_at')
    list_filter = ('recipient_type', 'channel', 'is_sent')
