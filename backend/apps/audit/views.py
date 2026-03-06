from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AuditLog
from .serializers import AuditLogSerializer, AuditLogListSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for audit log viewing (read-only)."""
    
    queryset = AuditLog.objects.all().order_by('-timestamp')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['resource_id', 'resource_type', 'user__username', 'ip_address']
    ordering_fields = ['timestamp', 'action']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AuditLogListSerializer
        return AuditLogSerializer
    
    def get_queryset(self):
        """Filter audit logs based on user role."""
        user = self.request.user
        if user.role == 'admin':
            return AuditLog.objects.all().order_by('-timestamp')
        # Other roles can only see their own actions
        return AuditLog.objects.filter(user=user).order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """Get current user's audit logs."""
        logs = AuditLog.objects.filter(user=request.user).order_by('-timestamp')[:50]
        serializer = AuditLogListSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_resource(self, request):
        """Get audit logs for a specific resource."""
        resource_type = request.query_params.get('type')
        resource_id = request.query_params.get('id')
        
        if not resource_type or not resource_id:
            return Response({'error': 'type and id parameters required'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        logs = AuditLog.objects.filter(
            resource_type=resource_type,
            resource_id=resource_id
        ).order_by('-timestamp')
        
        serializer = AuditLogListSerializer(logs, many=True)
        return Response(serializer.data)
