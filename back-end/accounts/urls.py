from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views
from authentication.views import ChangePasswordView

urlpatterns = [
    # Ruta para obtener token de autenticación
    path('token/', obtain_auth_token, name='api_token_auth'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    
    # Usuario actual
    path('me/', views.current_user, name='current_user'),
      # Perfil de usuario
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('users/<int:user_id>/profile/', views.PublicUserProfileView.as_view(), name='public-user-profile'),
    
    # Calificaciones
    path('ratings/create/', views.RatingCreateView.as_view(), name='create-rating'),
    path('ratings/user/<int:user_id>/', views.UserRatingsView.as_view(), name='user-ratings'),
    path('ratings/user/<int:user_id>/my-rating/', views.UserRatingDetailView.as_view(), name='my-rating-for-user'),
    
    # Reseteo de contraseña
    path('password-reset/request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Verificación de email con OTP
    path('email-verification/verify/', views.EmailVerificationView.as_view(), name='email-verification'),
    path('email-verification/resend/', views.ResendVerificationCodeView.as_view(), name='resend-verification-code'),
      # Cambio de contraseña
    path('password/change/', ChangePasswordView.as_view(), name='password-change'),
    
    # Debug endpoint
    path('debug/user-status/', views.debug_user_status, name='debug-user-status'),
]
