from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer
from ..audit.models import AuditLog


class PatientViewSet(viewsets.ModelViewSet):
    """ViewSet for patient management."""
    
    queryset = Patient.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['patient_id', 'first_name', 'last_name', 'email', 'phone_number']
    ordering_fields = ['created_at', 'first_name', 'sensitivity_level']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer
    
    def get_queryset(self):
        """Filter patients based on user role."""
        user = self.request.user
        if user.role == 'admin':
            return Patient.objects.all().order_by('-created_at')
        elif user.role == 'doctor':
            return Patient.objects.filter(assigned_doctor=user).order_by('-created_at')
        elif user.role == 'patient':
            return Patient.objects.filter(id=user.id).order_by('-created_at')
        return Patient.objects.none()
    
    def perform_create(self, serializer):
        """Create patient and log the action."""
        patient = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action='create',
            resource_type='Patient',
            resource_id=str(patient.id),
            ip_address=self.get_client_ip(),
            success=True,
            details={'patient_id': patient.patient_id}
        )
    
    def perform_update(self, serializer):
        """Update patient and log the action."""
        patient = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action='update',
            resource_type='Patient',
            resource_id=str(patient.id),
            ip_address=self.get_client_ip(),
            success=True,
            details={'patient_id': patient.patient_id}
        )
    
    def perform_destroy(self, instance):
        """Delete patient and log the action."""
        patient_id = str(instance.id)
        patient_ref = instance.patient_id
        instance.delete()
        AuditLog.objects.create(
            user=self.request.user,
            action='delete',
            resource_type='Patient',
            resource_id=patient_id,
            ip_address=self.get_client_ip(),
            success=True,
            details={'patient_id': patient_ref}
        )
    
    @action(detail=False, methods=['get'])
    def my_patients(self, request):
        """Get patients assigned to the current doctor."""
        if request.user.role != 'doctor':
            return Response({'error': 'Only doctors can view their patients'},
                          status=status.HTTP_403_FORBIDDEN)
        
        patients = Patient.objects.filter(assigned_doctor=request.user)
        serializer = PatientListSerializer(patients, many=True)
        return Response(serializer.data)
    
    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip
