class TenantQuerySetMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(tenant=self.request.user.tenant)
