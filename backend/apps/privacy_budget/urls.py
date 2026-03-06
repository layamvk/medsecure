from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import PrivacyBudgetViewSet

router = DefaultRouter()
router.register(r'', PrivacyBudgetViewSet, basename='privacybudget')

urlpatterns = router.urls
