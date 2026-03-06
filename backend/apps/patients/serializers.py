from rest_framework import serializers
from .models import Patient
from ..users.serializers import UserListSerializer


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model."""
    
    assigned_doctor = UserListSerializer(read_only=True)
    assigned_doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('apps.users.models', fromlist=['CustomUser']).CustomUser.objects.all(),
        write_only=True,
        required=False,
        source='assigned_doctor'
    )
    created_by = UserListSerializer(read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'first_name', 'last_name', 'date_of_birth',
            'gender', 'phone_number', 'email', 'address', 'blood_type',
            'allergies', 'medical_conditions', 'medications',
            'emergency_contact', 'emergency_phone', 'sensitivity_level',
            'assigned_doctor', 'assigned_doctor_id', 'created_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def create(self, validated_data):
        # Get the user from context
        user = self.context['request'].user if hasattr(self.context.get('request'), 'user') else None
        validated_data['created_by'] = user
        return super().create(validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for patient list endpoints."""
    
    assigned_doctor = UserListSerializer(read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'first_name', 'last_name', 'date_of_birth',
            'gender', 'sensitivity_level', 'assigned_doctor', 'created_at'
        ]
