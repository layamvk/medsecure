from django.contrib import admin
from .models import PrivacyBudget


@admin.register(PrivacyBudget)
class PrivacyBudgetAdmin(admin.ModelAdmin):
    """Privacy budget admin configuration."""
    
    list_display = ('user', 'patient', 'consumed_budget', 'total_budget', 'remaining_budget', 'query_count', 'last_query_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'patient__patient_id', 'patient__first_name', 'patient__last_name')
    readonly_fields = ('created_at', 'updated_at', 'query_count', 'last_query_at', 'budget_percentage')
    
    fieldsets = (
        ('User and Patient', {
            'fields': ('user', 'patient')
        }),
        ('Privacy Parameters', {
            'fields': ('epsilon', 'delta', 'total_budget', 'consumed_budget', 'budget_percentage')
        }),
        ('Query Information', {
            'fields': ('query_count', 'last_query_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'reset_at'),
            'classes': ('collapse',)
        }),
    )
    
    def remaining_budget(self, obj):
        return f"{obj.remaining_budget:.2f}"
    remaining_budget.short_description = 'Remaining Budget'
    
    def budget_percentage(self, obj):
        return f"{obj.budget_percentage:.1f}%"
    budget_percentage.short_description = 'Budget Used %'
