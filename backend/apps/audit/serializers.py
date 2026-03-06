from rest_framework import serializers
from .models import AuditLog
from ..users.serializers import UserListSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    
    user = UserListSerializer(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'resource_type', 'resource_id',
            'ip_address', 'user_agent', 'details', 'timestamp', 'success'
        ]
        read_only_fields = ['id', 'timestamp', 'user']
    
    def create(self, validated_data):
        # Get the user from context
        user = self.context['request'].user if hasattr(self.context.get('request'), 'user') else None
        validated_data['user'] = user
        return super().create(validated_data)


class AuditLogListSerializer(serializers.ModelSerializer):
    """Simplified serializer for audit log list endpoints."""
    
    user = UserListSerializer(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'resource_type', 'resource_id',
            'timestamp', 'success', 'ip_address'
        ]
