"""
URL configuration for MedSecure Backend.
Complete API routing for healthcare management system.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenVerifyView,
)
# import custom views from users app
from apps.users.views import CookieTokenObtainPairView, CookieTokenRefreshView

urlpatterns = [
    # Admin Panel
    path('admin/', admin.site.urls),
    
    # JWT Authentication Endpoints (cookie-based)
    path('api/auth/token/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Resource API Routes
    path('api/users/', include('apps.users.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/security/', include('apps.security.urls')),
    path('api/privacy/', include('apps.privacy_budget.urls')),
]
