from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Audit log admin configuration."""
    
    list_display = ('timestamp', 'user', 'action', 'resource_type', 'resource_id', 'success', 'ip_address')
    list_filter = ('action', 'success', 'resource_type', 'timestamp')
    search_fields = ('user__username', 'resource_type', 'resource_id', 'ip_address')
    readonly_fields = ('timestamp', 'user', 'action', 'resource_type', 'resource_id', 'ip_address', 'user_agent', 'details', 'success')
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
