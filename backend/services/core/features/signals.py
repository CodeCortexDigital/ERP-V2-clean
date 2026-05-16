from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import FeatureFlag
from .services import invalidate_feature_cache


@receiver(post_save, sender=FeatureFlag)
@receiver(post_delete, sender=FeatureFlag)
def clear_feature_flag_cache(sender, instance, **kwargs):
    invalidate_feature_cache(instance.tenant_id)
