from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views

urlpatterns = [
    # Ruta para obtener token de autenticación
    path('token/', obtain_auth_token, name='api_token_auth'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    
    
    # Si tienes vistas personalizadas para registro, puedes añadirlas aquí
    # path('register/', views.RegisterView.as_view(), name='register'),
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
]
