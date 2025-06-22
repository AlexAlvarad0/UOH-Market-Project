from rest_framework import generics, status, viewsets, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import get_user_model
from django.db import IntegrityError, models
from django.shortcuts import get_object_or_404
from .serializers import RegisterSerializer, ProfileSerializer, LoginSerializer, RatingSerializer, RatingListSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from .models import Profile, Rating, PasswordResetToken, EmailVerificationOTP
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        logger.debug(f"=== REGISTRATION DEBUG ===")
        logger.debug(f"Request method: {request.method}")
        logger.debug(f"Content-Type: {request.content_type}")
        logger.debug(f"Raw request body: {request.body}")
        logger.debug(f"Registration data received: {request.data}")
        logger.debug(f"Data type: {type(request.data)}")
        
        # Log específico para verificar si password2 está presente
        password2_value = request.data.get('password2')
        logger.debug(f"password2 field value: {password2_value}")
        logger.debug(f"password2 type: {type(password2_value)}")
        logger.debug(f"All POST data keys: {list(request.data.keys())}")
        logger.debug(f"All POST data items: {list(request.data.items())}")        
        try:
            serializer = self.get_serializer(data=request.data)
            logger.debug(f"Serializer initial data: {serializer.initial_data}")
            is_valid = serializer.is_valid()
            logger.debug(f"Serializer is_valid: {is_valid}")
            if not is_valid:
                logger.debug(f"Serializer errors: {serializer.errors}")
            
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            
            # Verificación automática para usuarios UOH
            is_uoh_email = user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl')
            if is_uoh_email:
                user.is_verified_seller = True
                logger.info(f"Usuario UOH auto-verificado: {user.email}")
            
            # NO activar la cuenta inmediatamente - requiere verificación de email
            user.is_active = False
            user.is_email_verified = False
            user.save()
            
            # Crear código OTP para verificación
            otp = EmailVerificationOTP.create_for_user(user)
            
            # Enviar email de verificación
            email_sent = send_verification_email(user, otp.code)
            
            if email_sent:
                return Response({
                    "success": True,
                    "message": "Registro exitoso. Se ha enviado un código de verificación a tu email.",
                    "email": user.email,
                    "requires_verification": True
                }, status=status.HTTP_201_CREATED)
            else:
                # Si falló el envío del email, eliminar el usuario creado
                user.delete()
                return Response({
                    "success": False,
                    "error": "Error al enviar email de verificación. Por favor, intenta nuevamente."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
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
    authentication_classes = []  # Permitir login sin CSRF/session
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer   
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        
        # Verificación automática para usuarios UOH (failsafe en login)
        is_uoh_email = user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl')
        if is_uoh_email and not user.is_verified_seller:
            user.is_verified_seller = True
            user.save()
            logger.info(f"Usuario UOH auto-verificado en login: {user.email}")
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username or user.email,
                'is_verified_seller': user.is_verified_seller,  # Incluir estado de verificación
            }
        })

from rest_framework.generics import RetrieveUpdateAPIView

class UserProfileView(RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except serializers.ValidationError as e:
            # Las ValidationError del serializer deben pasarse tal como están
            logger.error(f"Error de validación al actualizar perfil: {str(e)}")
            raise e  # Re-lanzar para que DRF la maneje
        except IntegrityError as e:
            logger.error(f"IntegrityError al actualizar perfil: {str(e)}")
            # Si hay un error de integridad, probablemente sea por username duplicado
            if 'username' in str(e).lower() or 'unique' in str(e).lower():
                return Response({
                    "username": ["Este nombre de usuario ya está en uso."]
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    "error": "Error de integridad en los datos."
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error inesperado al actualizar perfil: {str(e)}")
            return Response({
                "error": "Error interno del servidor."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RatingCreateView(generics.CreateAPIView):
    """Vista para crear una nueva calificación"""
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Verificar si ya existe una calificación del usuario hacia el usuario objetivo
        rated_user = serializer.validated_data['rated_user']
        existing_rating = Rating.objects.filter(
            rated_user=rated_user,
            rater=self.request.user
        ).first()
        
        if existing_rating:
            # Actualizar la calificación existente
            for attr, value in serializer.validated_data.items():
                setattr(existing_rating, attr, value)
            existing_rating.save()
            return existing_rating
        else:
            # Crear nueva calificación
            return serializer.save()

class UserRatingsView(generics.ListAPIView):
    """Vista para obtener todas las calificaciones de un usuario"""
    serializer_class = RatingListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Rating.objects.filter(rated_user_id=user_id)

class UserRatingDetailView(generics.RetrieveUpdateAPIView):
    """Vista para obtener y actualizar la calificación que el usuario logueado le dio a otro usuario"""
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        rated_user_id = self.kwargs['user_id']
        try:
            return Rating.objects.get(
                rated_user_id=rated_user_id,
                rater=self.request.user
            )
        except Rating.DoesNotExist:
            return None

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            # Devolver un 404 cuando no existe la calificación para simplificar la lógica del frontend
            return Response(
                {"detail": "No existe una calificación para este usuario."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
        
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Si no existe la calificación, crear una nueva
        if instance is None:
            return Response(
                {"detail": "No existe una calificación para actualizar. Use el endpoint de creación."},
                status=status.HTTP_404_NOT_FOUND
            )
            
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

class PasswordResetRequestView(generics.GenericAPIView):
    """Vista para solicitar reseteo de contraseña"""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = User.objects.get(email__iexact=email)
        
        # Invalidar tokens anteriores no utilizados
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Crear nuevo token
        reset_token = PasswordResetToken.objects.create(user=user)
        
        # Enviar email
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token.token}"
        
        try:
            send_mail(
                subject='Restablecer contraseña - UOH Market',
                message=f'''
Hola {user.first_name or user.username},

Has solicitado restablecer tu contraseña en UOH Market.

Para crear una nueva contraseña, haz clic en el siguiente enlace:
{reset_url}

Este enlace expirará en 1 hora por seguridad.

Si no solicitaste este cambio, puedes ignorar este correo.

Saludos,
Equipo UOH Market
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,            )
            
            return Response({
                "message": "Se ha enviado un correo con las instrucciones para restablecer tu contraseña."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error enviando email de reseteo: {str(e)}")
            
            # Proporcionar respuestas más específicas según el tipo de error
            if "401" in str(e) or "Unauthorized" in str(e):
                error_message = "Error de configuración del servidor de correo. Contacta al administrador."
            elif "SendGrid" in str(e):
                error_message = "Error del servicio de correo. Inténtalo más tarde."
            else:
                error_message = "Hubo un problema al enviar el correo. Inténtalo más tarde."
            
            return Response({
                "error": error_message
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetConfirmView(generics.GenericAPIView):
    """Vista para confirmar reseteo de contraseña"""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
            
            if not reset_token.is_valid():
                return Response({
                    "error": "Este token ha expirado o ya fue utilizado."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Cambiar contraseña
            user = reset_token.user
            user.set_password(new_password)
            user.save()
            
            # Marcar token como usado
            reset_token.is_used = True
            reset_token.save()
            
            return Response({
                "message": "Tu contraseña ha sido actualizada exitosamente."
            }, status=status.HTTP_200_OK)
            
        except PasswordResetToken.DoesNotExist:
            return Response({
                "error": "Token inválido."
            }, status=status.HTTP_400_BAD_REQUEST)

def send_verification_email(user, otp_code):
    """Enviar email de verificación con código OTP"""
    try:
        subject = 'Verifica tu cuenta - UOH Market'
        
        # Crear contexto para el template
        context = {
            'user_name': user.first_name or user.username,
            'otp_code': otp_code,
            'site_name': 'UOH Market',
            'support_email': settings.DEFAULT_FROM_EMAIL
        }
        
        # HTML del email
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Verifica tu cuenta</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #002C54; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background-color: #f9f9f9; }}
                .otp-code {{ 
                    background-color: #002C54; 
                    color: white; 
                    font-size: 32px; 
                    font-weight: bold; 
                    text-align: center; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-radius: 8px; 
                    letter-spacing: 4px;
                }}
                .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>¡Bienvenido a UOH Market!</h1>
                </div>
                <div class="content">
                    <h2>Hola, {context['user_name']}!</h2>
                    <p>Gracias por registrarte en UOH Market. Para completar tu registro, necesitas verificar tu dirección de correo electrónico.</p>
                    
                    <p>Tu código de verificación es:</p>
                    <div class="otp-code">{context['otp_code']}</div>
                    
                    <div class="warning">
                        <strong>⏰ Importante:</strong> Este código expira en 30 minutos por seguridad.
                    </div>
                    
                    <p>Si no solicitaste este registro, simplemente ignora este correo.</p>
                    
                    <p>¡Esperamos verte pronto en la comunidad UOH Market!</p>
                </div>
                <div class="footer">
                    <p>Este es un correo automático, no respondas a este mensaje.</p>
                    <p>Si tienes problemas, contacta al soporte: {context['support_email']}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Versión texto plano
        plain_message = f"""
        ¡Bienvenido a UOH Market!
        
        Hola, {context['user_name']}!
        
        Gracias por registrarte en UOH Market. Para completar tu registro, necesitas verificar tu dirección de correo electrónico.
        
        Tu código de verificación es: {context['otp_code']}
        
        IMPORTANTE: Este código expira en 30 minutos por seguridad.
        
        Si no solicitaste este registro, simplemente ignora este correo.
        
        ¡Esperamos verte pronto en la comunidad UOH Market!
        
        ---
        Este es un correo automático, no respondas a este mensaje.
        Si tienes problemas, contacta al soporte: {context['support_email']}
        """
        
        # Enviar email
        result = send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        
        logger.info(f"Email de verificación enviado a {user.email} con código {otp_code}")
        return True
        
    except Exception as e:
        logger.error(f"Error enviando email de verificación a {user.email}: {str(e)}")
        return False


class EmailVerificationView(APIView):
    """Vista para verificar código OTP de email"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({
                "success": False,
                "error": "Email y código son requeridos"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscar usuario
            user = User.objects.get(email=email)
            
            # Buscar código OTP válido
            otp = EmailVerificationOTP.get_latest_valid_for_user(user)
            
            if not otp:
                return Response({
                    "success": False,
                    "error": "No se encontró un código válido. El código puede haber expirado."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar código
            if otp.code != code:
                return Response({
                    "success": False,
                    "error": "Código incorrecto"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Marcar código como usado
            otp.mark_as_used()
            
            # Activar cuenta
            user.is_active = True
            user.is_email_verified = True
            user.save()
            
            logger.info(f"Email verificado exitosamente para usuario {user.email}")
            
            return Response({
                "success": True,
                "message": "Email verificado exitosamente. Tu cuenta está ahora activa."
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": "Usuario no encontrado"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error en verificación de email: {str(e)}")
            return Response({
                "success": False,
                "error": "Error interno del servidor"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResendVerificationCodeView(APIView):
    """Vista para reenviar código OTP de verificación"""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response({
                "success": False,
                "error": "Email es requerido"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Buscar usuario
            user = User.objects.get(email=email)
            
            # Verificar si ya está verificado
            if user.is_email_verified:
                return Response({
                    "success": False,
                    "error": "Esta cuenta ya está verificada"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Buscar código OTP actual
            current_otp = EmailVerificationOTP.get_latest_valid_for_user(user)
            
            if current_otp:
                # Verificar si se puede reenviar
                can_resend, message = current_otp.can_resend()
                
                if not can_resend:
                    return Response({
                        "success": False,
                        "error": message
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
                # Incrementar contador de reenvío
                current_otp.increment_resend_count()
                
                # Enviar email con el mismo código
                email_sent = send_verification_email(user, current_otp.code)
                
                if email_sent:
                    # Calcular próximo tiempo de espera
                    wait_intervals = [1, 3, 5]
                    next_wait = None
                    if current_otp.resend_count < len(wait_intervals):
                        next_wait = wait_intervals[current_otp.resend_count]
                    
                    return Response({
                        "success": True,
                        "message": "Código reenviado exitosamente",
                        "resend_count": current_otp.resend_count,
                        "max_resends": 3,
                        "next_resend_wait_minutes": next_wait
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "success": False,
                        "error": "Error al enviar el email. Inténtalo más tarde."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            else:
                # No hay código válido, crear uno nuevo
                otp = EmailVerificationOTP.create_for_user(user)
                email_sent = send_verification_email(user, otp.code)
                
                if email_sent:
                    return Response({
                        "success": True,
                        "message": "Nuevo código enviado exitosamente",
                        "resend_count": 0,
                        "max_resends": 3,
                        "next_resend_wait_minutes": 1
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "success": False,
                        "error": "Error al enviar el email. Inténtalo más tarde."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except User.DoesNotExist:
            return Response({
                "success": False,
                "error": "Usuario no encontrado"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error en reenvío de código: {str(e)}")
            return Response({
                "success": False,
                "error": "Error interno del servidor"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password1 = request.data.get('new_password1')
        new_password2 = request.data.get('new_password2')

        if not user.check_password(old_password):
            return Response({'error': 'Contraseña actual incorrecta'}, status=status.HTTP_400_BAD_REQUEST)
        if new_password1 != new_password2:
            return Response({'error': 'Las nuevas contraseñas no coinciden'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password1)
        user.save()
        return Response({'detail': 'Contraseña cambiada exitosamente'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_user_status(request):
    """
    Endpoint de debug para verificar el estado del usuario actual
    """
    user = request.user
    return Response({
        'user_id': user.id,
        'email': user.email,
        'is_verified_seller': user.is_verified_seller,
        'is_active': user.is_active,
        'is_staff': user.is_staff,
        'date_joined': user.date_joined,
        'email_ends_with_uoh': user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl'),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Endpoint para obtener la información del usuario autenticado actual
    """
    try:
        user = request.user
        
        # Obtener el perfil si existe
        profile_data = {}
        if hasattr(user, 'profile'):
            profile_data = {
                'bio': user.profile.bio or '',
                'location': user.profile.location or '',
                'profile_picture': user.profile.profile_picture.url if user.profile.profile_picture else None,
                'birth_date': user.profile.birth_date.isoformat() if user.profile.birth_date else None,
            }
        
        return Response({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name or '',
            'last_name': user.last_name or '',
            'is_verified_seller': user.is_verified_seller,
            'is_email_verified': getattr(user, 'is_email_verified', False),
            'is_active': user.is_active,
            'date_joined': user.date_joined.isoformat(),
            'profile': profile_data
        })
    except Exception as e:
        logger.exception(f"Error getting current user: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PublicUserProfileView(generics.RetrieveAPIView):
    """Vista para obtener el perfil público de cualquier usuario"""
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación
    
    def get(self, request, user_id):
        try:
            # Obtener el usuario por ID
            user = get_object_or_404(User, id=user_id)
            
            # Obtener datos básicos del perfil
            profile_data = {}
            if hasattr(user, 'profile'):
                profile_picture_url = None
                if user.profile.profile_picture:
                    # Construir URL completa para la imagen
                    profile_picture_url = request.build_absolute_uri(user.profile.profile_picture.url)
                
                profile_data = {
                    'bio': user.profile.bio or '',
                    'location': user.profile.location or '',
                    'profile_picture': profile_picture_url,
                    'birth_date': user.profile.birth_date.isoformat() if user.profile.birth_date else None,
                }
            
            # Calcular calificaciones promedio
            ratings = Rating.objects.filter(rated_user=user)
            average_rating = 0
            total_ratings = ratings.count()
            
            if total_ratings > 0:
                average_rating = ratings.aggregate(avg_rating=models.Avg('rating'))['avg_rating'] or 0
            
            logger.info(f"Profile data for user {user_id}: {profile_data}")
            
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'is_verified_seller': user.is_verified_seller,
                'average_rating': round(average_rating, 2),
                'total_ratings': total_ratings,
                **profile_data  # Incluir datos del perfil
            })
            
        except Exception as e:
            logger.exception(f"Error getting user profile: {str(e)}")
            return Response({'error': 'Error al obtener el perfil del usuario'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
