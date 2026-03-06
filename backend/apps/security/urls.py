from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import SecurityEventViewSet, DeviceTrustScoreViewSet, GlobalThreatScoreViewSet

router = DefaultRouter()
router.register(r'', SecurityEventViewSet, basename='securityevent')
router.register(r'trust', DeviceTrustScoreViewSet, basename='devicetrust')
router.register(r'threat', GlobalThreatScoreViewSet, basename='globalthreat')

urlpatterns = router.urls
