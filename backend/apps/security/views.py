from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SecurityEvent, DeviceTrustScore, GlobalThreatScore
from .serializers import SecurityEventSerializer, DeviceTrustScoreSerializer, GlobalThreatScoreSerializer
from .models import SecurityEvent
from .serializers import SecurityEventSerializer, SecurityEventListSerializer


class SecurityEventViewSet(viewsets.ModelViewSet):
    """ViewSet for security event management."""
    
    queryset = SecurityEvent.objects.all().order_by('-timestamp')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'ip_address', 'user__username']
    ordering_fields = ['timestamp', 'severity']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SecurityEventListSerializer
        return SecurityEventSerializer
    
    def get_queryset(self):
        """Filter security events based on user role."""
        user = self.request.user
        if user.role == 'admin':
            return SecurityEvent.objects.all().order_by('-timestamp')
        return SecurityEvent.objects.filter(user=user).order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get unresolved security events."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        events = SecurityEvent.objects.filter(resolved=False).order_by('-timestamp')
        serializer = SecurityEventListSerializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark security event as resolved."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        event = self.get_object()
        event.resolved = True
        event.resolved_by = request.user
        event.resolved_at = __import__('django.utils.timezone', fromlist=['now']).now()
        event.save()
        
        serializer = SecurityEventSerializer(event)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def critical_events(self, request):
        """Get critical severity security events."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        events = SecurityEvent.objects.filter(severity='critical').order_by('-timestamp')
        serializer = SecurityEventListSerializer(events, many=True)
        return Response(serializer.data)


# additional endpoints for trust and global threat scores
class DeviceTrustScoreViewSet(viewsets.ModelViewSet):
    """Manage device trust scores (admins can view/edit)."""
    queryset = DeviceTrustScore.objects.all()
    serializer_class = DeviceTrustScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return DeviceTrustScore.objects.all()
        return DeviceTrustScore.objects.filter(user=user)


class GlobalThreatScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """Return the current global threat score (singleton)."""
    serializer_class = GlobalThreatScoreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ensure there is always one record
        obj, created = GlobalThreatScore.objects.get_or_create(id=1)
        return GlobalThreatScore.objects.filter(id=obj.id)
