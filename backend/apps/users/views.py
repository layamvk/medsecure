from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings

from .models import CustomUser
from .serializers import UserSerializer, UserListSerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management."""
    
    queryset = CustomUser.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users based on role permissions."""
        user = self.request.user
        if user.role == 'admin':
            return CustomUser.objects.all().order_by('-created_at')
        return CustomUser.objects.filter(id=user.id)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Blacklist the user's refresh token and clear cookie."""
        try:
            # Attempt to read refresh from cookie or request body
            refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        response = Response({'detail': 'Logged out'}, status=status.HTTP_205_RESET_CONTENT)
        response.delete_cookie('refresh_token')
        return response
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user information."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Change user password."""
        user = self.get_object()
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'password set'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        """Set user role (admin only)."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        role = request.data.get('role')
        if role not in [choice[0] for choice in CustomUser.ROLE_CHOICES]:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.role = role
        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create new user (admin only)."""
        if request.user.role != 'admin':
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)


# custom token views that set the refresh token in a secure cookie
class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh = response.data.get('refresh')
            # set cookie
            response.set_cookie(
                'refresh_token',
                refresh,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite='Strict',
                max_age=7 * 24 * 60 * 60,
            )
            # remove refresh from body so JS can't read it
            response.data['refresh'] = 'cookie'

            # Attach user info to response so frontend can set role immediately
            from django.contrib.auth import authenticate as auth_authenticate
            email = request.data.get('email', '')
            try:
                user = CustomUser.objects.get(email=email)
                response.data['user'] = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role,
                    'is_verified': user.is_verified,
                }
            except CustomUser.DoesNotExist:
                pass

        return response


class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # force refresh token from cookie
        refresh = request.COOKIES.get('refresh_token')
        request.data['refresh'] = refresh
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            new_refresh = response.data.get('refresh')
            response.set_cookie(
                'refresh_token',
                new_refresh,
                httponly=True,
                secure=settings.SESSION_COOKIE_SECURE,
                samesite='Strict',
                max_age=7 * 24 * 60 * 60,
            )
            response.data['refresh'] = 'cookie'
        return response
