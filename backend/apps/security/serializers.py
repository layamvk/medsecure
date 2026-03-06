from rest_framework import serializers
from .models import SecurityEvent, DeviceTrustScore, GlobalThreatScore
from ..users.serializers import UserListSerializer


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer for SecurityEvent model."""
    
    user = UserListSerializer(read_only=True)
    resolved_by = UserListSerializer(read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user', 'event_type', 'severity', 'ip_address',
            'user_agent', 'description', 'details', 'timestamp',
            'resolved', 'resolved_by', 'resolved_at'
        ]
        read_only_fields = ['id', 'timestamp', 'user']
    
    def create(self, validated_data):
        # Get the user from context
        user = self.context['request'].user if hasattr(self.context.get('request'), 'user') else None
        validated_data['user'] = user
        return super().create(validated_data)


class SecurityEventListSerializer(serializers.ModelSerializer):
    """Simplified serializer for security event list endpoints."""
    
    user = UserListSerializer(read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user', 'event_type', 'severity', 'timestamp',
            'resolved', 'ip_address'
        ]


# additional serializers for new models
class DeviceTrustScoreSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = DeviceTrustScore
        fields = ['id', 'user', 'device_id', 'trust_score', 'last_verified', 'notes']
        read_only_fields = ['id', 'user', 'last_verified']


class GlobalThreatScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalThreatScore
        fields = ['id', 'score', 'updated_at']
        read_only_fields = ['id', 'updated_at']
