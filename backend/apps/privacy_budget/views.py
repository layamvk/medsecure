from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PrivacyBudget
from .serializers import PrivacyBudgetSerializer, PrivacyBudgetListSerializer


class PrivacyBudgetViewSet(viewsets.ModelViewSet):
    """ViewSet for privacy budget tracking."""
    
    queryset = PrivacyBudget.objects.all().order_by('-updated_at')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['consumed_budget', 'created_at', 'updated_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PrivacyBudgetListSerializer
        return PrivacyBudgetSerializer
    
    def get_queryset(self):
        """Filter privacy budgets based on user role."""
        user = self.request.user
        if user.role == 'admin':
            return PrivacyBudget.objects.all().order_by('-updated_at')
        return PrivacyBudget.objects.filter(user=user).order_by('-updated_at')
    
    @action(detail=False, methods=['get'])
    def my_budgets(self, request):
        """Get current user's privacy budgets."""
        budgets = PrivacyBudget.objects.filter(user=request.user).order_by('-updated_at')
        serializer = PrivacyBudgetListSerializer(budgets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reset_budget(self, request, pk=None):
        """Reset privacy budget for a user-patient pair."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        budget = self.get_object()
        budget.consumed_budget = 0.0
        budget.query_count = 0
        budget.reset_at = __import__('django.utils.timezone', fromlist=['now']).now()
        budget.save()
        
        serializer = PrivacyBudgetSerializer(budget)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def at_risk(self, request):
        """Get budgets where consumption > 80%."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        budgets = PrivacyBudget.objects.all()
        at_risk = [b for b in budgets if b.budget_percentage > 80]
        serializer = PrivacyBudgetListSerializer(at_risk, many=True)
        return Response(serializer.data)
