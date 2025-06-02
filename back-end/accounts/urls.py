from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views

urlpatterns = [
    # Ruta para obtener token de autenticación
    path('token/', obtain_auth_token, name='api_token_auth'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    
    # Perfil de usuario
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # Calificaciones
    path('ratings/create/', views.RatingCreateView.as_view(), name='create-rating'),
    path('ratings/user/<int:user_id>/', views.UserRatingsView.as_view(), name='user-ratings'),
    path('ratings/user/<int:user_id>/my-rating/', views.UserRatingDetailView.as_view(), name='my-rating-for-user'),
]
