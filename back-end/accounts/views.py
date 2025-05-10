from rest_framework import generics, status, viewsets, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .serializers import RegisterSerializer, ProfileSerializer, LoginSerializer
from .models import Profile
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        logger.debug(f"Registration data received: {request.data}")
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            user.is_active = True
            user.save()
            return Response({"message": "Usuario registrado exitosamente."}, status=status.HTTP_201_CREATED)
        except IntegrityError as e:
            logger.error(f"IntegrityError: {str(e)}")
            return Response(
                {"username": ["Este nombre de usuario ya está en uso."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        except serializers.ValidationError as e:
            logger.error(f"ValidationError: {str(e)}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            raise

class ProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer
    
    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAdminUser])
def check_email_exists(request):
    """Admin-only endpoint to check if an email exists in the database"""
    email = request.query_params.get('email', '')
    
    if not email:
        return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get all emails for comparison
    all_emails = User.objects.values_list('email', flat=True)
    
    # Check if the email exists (case-insensitive)
    exists = User.objects.filter(email__iexact=email).exists()
    
    return Response({
        "email": email,
        "exists": exists,
        "all_emails": list(all_emails)  # Lists all emails in the database for debugging
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def check_email_availability(request):
    """
    Check if an email is available for registration
    Public endpoint - for development use only
    """
    email = request.query_params.get('email', '')
    
    if not email:
        return Response({"error": "Email parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get case-insensitive matching users
    matching_users = User.objects.filter(email__iexact=email)
    
    # Format the response
    users_info = []
    for user in matching_users:
        users_info.append({
            'id': user.id,
            'username': user.username,
            'is_active': user.is_active,
            'date_joined': user.date_joined,
        })
    
    return Response({
        'email': email,
        'is_available': not matching_users.exists(),
        'matching_users': users_info,
        'count': matching_users.count(),
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def debug_email_check(request):
    """Admin-only endpoint to check email uniqueness issues"""
    email = request.query_params.get('email', '')
    
    if not email:
        return Response({"error": "Email parameter required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Find all users with this email (case insensitive)
    users = User.objects.filter(email__iexact=email)
    
    user_data = []
    for user in users:
        user_data.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "date_joined": user.date_joined.isoformat()
        })
    
    # Check if the email already exists
    email_exists = User.objects.filter(email__iexact=email).exists()
    
    return Response({
        "email": email,
        "email_exists": email_exists,
        "user_count": users.count(),
        "users": user_data
    })

from rest_framework.authtoken.models import Token

class LoginView(generics.GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username or user.email,
            }
        })