from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SkillViewSet, BehaviourRatingViewSet, ObservationViewSet

router = DefaultRouter()
router.register(r'skills', SkillViewSet)
router.register(r'ratings', BehaviourRatingViewSet)
router.register(r'observations', ObservationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
