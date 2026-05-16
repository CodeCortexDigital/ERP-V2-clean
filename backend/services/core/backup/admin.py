from django.contrib import admin

from .models import BackupLog, BackupRestoreLog, DisasterRecoveryPlan


@admin.register(BackupLog)
class BackupLogAdmin(admin.ModelAdmin):
    list_display = ('backup_type', 'status', 'started_at', 'size_bytes', 'verified')
    list_filter = ('status', 'backup_type')
    readonly_fields = ('id', 'started_at', 'completed_at')


@admin.register(BackupRestoreLog)
class BackupRestoreLogAdmin(admin.ModelAdmin):
    list_display = ('restore_type', 'status', 'target_environment', 'started_at')
    list_filter = ('status', 'restore_type', 'target_environment')


@admin.register(DisasterRecoveryPlan)
class DisasterRecoveryPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'is_active', 'recovery_time_objective_hours', 'recovery_point_objective_hours')
