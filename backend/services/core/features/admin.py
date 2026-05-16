from django.contrib import admin

from .models import FeatureFlag


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_enabled', 'tenant', 'rollout_percentage', 'updated_at')
    list_filter = ('is_enabled', 'name', 'tenant')
    search_fields = ('name', 'description', 'tenant__name', 'tenant__tenant_code')
    list_editable = ('is_enabled', 'rollout_percentage')
    raw_id_fields = ('tenant',)
    ordering = ('name', 'tenant')
