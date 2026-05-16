from django.contrib import admin

from .models import School, TenantMembership


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('school_id', 'tenant_code', 'name', 'subdomain', 'is_active', 'created_at')
    search_fields = ('tenant_code', 'name', 'subdomain', 'school_id')
    list_filter = ('is_active',)


@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'school', 'role', 'is_primary', 'is_active', 'joined_at')
    list_filter = ('role', 'is_active')
