from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """Patient admin configuration."""
    
    list_display = ('patient_id', 'first_name', 'last_name', 'date_of_birth', 'sensitivity_level', 'assigned_doctor', 'created_at')
    list_filter = ('sensitivity_level', 'gender', 'blood_type', 'created_at')
    search_fields = ('patient_id', 'first_name', 'last_name', 'email', 'phone_number')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('patient_id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone_number', 'email', 'address')
        }),
        ('Medical Information', {
            'fields': ('blood_type', 'allergies', 'medical_conditions', 'medications', 'emergency_contact', 'emergency_phone')
        }),
        ('Access Control', {
            'fields': ('sensitivity_level', 'assigned_doctor', 'created_by')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
