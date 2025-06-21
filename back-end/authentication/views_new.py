from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
# Importaciones para Google OAuth
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
import uuid
import random
import string

User = get_user_model()

def generate_verification_code(length=6):
    """Genera un código de verificación numérico"""
    return ''.join(random.choices(string.digits, k=length))

class LoginView(APIView):
    authentication_classes = []  # Permitir login sin CSRF/session
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        # Autenticar usando email (USERNAME_FIELD)
        user = authenticate(request, username=email, password=password)
        
        if user:
            login(request, user)
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Determine el usuario actual basado en el token.
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name
    })

class UserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class ValidateTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({'valid': True})

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(old_password):
            return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Password changed successfully'})

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response({
                'success': False,
                'error': 'Token de Google es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Verificar el token con Google
            # Usar el Client ID desde configuración
            client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
            
            if not client_id or client_id == 'your-google-client-id.apps.googleusercontent.com':
                # Modo de desarrollo - simular respuesta de Google
                return Response({
                    'success': False,
                    'error': 'Google OAuth no configurado. Consulta GOOGLE_OAUTH_SETUP.md para configurar las credenciales de Google Cloud Console.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                client_id
            )
            
            # Extraer información del usuario
            email = idinfo.get('email')
            given_name = idinfo.get('given_name', '')
            family_name = idinfo.get('family_name', '')
            name = idinfo.get('name', '')
            
            if not email:
                return Response({
                    'success': False,
                    'error': 'No se pudo obtener el email de Google'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el usuario ya existe
            try:
                user = User.objects.get(email=email)
                
                # Verificar si el usuario necesita verificación de email
                if not user.is_email_verified:
                    # Si no está verificado, generar nuevo código y enviar
                    verification_code = generate_verification_code()
                    user.verification_code = verification_code
                    user.save()
                    
                    return Response({
                        'success': True,
                        'data': {
                            'requires_verification': True,
                            'email': email,
                            'message': 'Tu cuenta requiere verificación de email. Se ha enviado un nuevo código.'
                        }
                    })
                
                # Usuario existe y está verificado - login directo
                auth_token, created = Token.objects.get_or_create(user=user)                
                return Response({
                    'success': True,
                    'token': auth_token.key,
                    'user': UserSerializer(user).data,
                    'message': 'Login exitoso con Google'
                })
                
            except User.DoesNotExist:
                # Usuario no existe - crear cuenta automáticamente
                # Generar username único
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                # Generar contraseña aleatoria para permitir login normal posterior
                random_password = ''.join(random.choices(string.ascii_letters + string.digits + '!@#$%^&*', k=12))
                
                # Crear el usuario con contraseña aleatoria
                user = User.objects.create_user(
                    email=email,
                    username=username,
                    password=random_password,  # Contraseña aleatoria pero funcional
                    first_name=given_name,
                    last_name=family_name,
                    is_email_verified=False  # Requerirá verificación OTP
                )
                
                # Generar código de verificación OTP
                verification_code = generate_verification_code()
                user.verification_code = verification_code
                user.save()
                
                # TODO: Enviar email con código de verificación
                # Por ahora, retornamos que requiere verificación
                
                return Response({
                    'success': True,
                    'data': {
                        'requires_verification': True,
                        'email': email,
                        'message': 'Cuenta creada exitosamente. Se requiere verificación por email.',
                        'generated_password': random_password  # Para desarrollo - remover en producción
                    }
                })
                
        except ValueError as e:
            return Response({
                'success': False,
                'error': f'Token de Google inválido: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error interno del servidor: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
