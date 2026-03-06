from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Custom User admin with additional fields."""
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Healthcare Information', {
            'fields': ('role', 'is_verified', 'is_mfa_enabled', 'phone_number', 'last_login_ip')
        }),
    )
    
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_verified', 'is_mfa_enabled')
    list_filter = BaseUserAdmin.list_filter + ('role', 'is_verified', 'is_mfa_enabled')
    search_fields = ('username', 'email', 'first_name', 'last_name')
