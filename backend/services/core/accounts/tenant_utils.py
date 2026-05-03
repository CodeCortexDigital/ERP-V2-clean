from accounts.rbac_models import UserTenant

class TenantFilterMixin:
    def get_queryset(self):
        user = self.request.user
        tenant = UserTenant.objects.get(user=user).tenant
        return super().get_queryset().filter(tenant=tenant)
