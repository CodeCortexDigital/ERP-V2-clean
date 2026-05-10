from django.contrib import admin
from .models import Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'role_type', 'is_active', 'created_at']
    list_filter = ['role_type', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['name']
