from django.contrib import admin
from .models import SecurityEvent


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """Security event admin configuration."""
    
    list_display = ('timestamp', 'event_type', 'severity', 'user', 'ip_address', 'resolved')
    list_filter = ('event_type', 'severity', 'resolved', 'timestamp')
    search_fields = ('user__username', 'event_type', 'ip_address', 'description')
    readonly_fields = ('timestamp', 'user', 'event_type', 'severity', 'ip_address', 'user_agent', 'description', 'details')
    
    fieldsets = (
        ('Event Information', {
            'fields': ('event_type', 'severity', 'description', 'details')
        }),
        ('User Information', {
            'fields': ('user', 'ip_address', 'user_agent', 'timestamp')
        }),
        ('Resolution', {
            'fields': ('resolved', 'resolved_by', 'resolved_at')
        }),
    )
