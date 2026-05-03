from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

class Module(models.Model):
    name = models.CharField(max_length=50, unique=True)

class Permission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.ForeignKey(Module, on_delete=models.CASCADE)

    can_create = models.BooleanField(default=False)
    can_read = models.BooleanField(default=False)
    can_update = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
from django.db import models
from django.contrib.auth import get_user_model
from .tenant_models import Tenant

User = get_user_model()

class UserTenant(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
