from rest_framework import serializers
from .models import PrivacyBudget
from ..users.serializers import UserListSerializer


class PrivacyBudgetSerializer(serializers.ModelSerializer):
    """Serializer for PrivacyBudget model."""
    
    user = UserListSerializer(read_only=True)
    remaining_budget = serializers.ReadOnlyField()
    budget_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = PrivacyBudget
        fields = [
            'id', 'user', 'patient', 'epsilon', 'delta', 'total_budget',
            'consumed_budget', 'remaining_budget', 'budget_percentage',
            'query_count', 'last_query_at', 'created_at', 'updated_at', 'reset_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'consumed_budget', 'query_count', 'last_query_at']


class PrivacyBudgetListSerializer(serializers.ModelSerializer):
    """Simplified serializer for privacy budget list endpoints."""
    
    user = UserListSerializer(read_only=True)
    remaining_budget = serializers.ReadOnlyField()
    budget_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = PrivacyBudget
        fields = [
            'id', 'user', 'patient', 'consumed_budget', 'total_budget',
            'remaining_budget', 'budget_percentage', 'query_count'
        ]
