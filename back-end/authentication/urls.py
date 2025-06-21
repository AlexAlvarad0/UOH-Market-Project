from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from .views import LoginView, RegisterView, UserView, UserDetailView, ValidateTokenView, ChangePasswordView, GoogleLoginView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('login/google/', GoogleLoginView.as_view(), name='google-login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('validate-token/', ValidateTokenView.as_view(), name='validate-token'),
    path('user/', UserView.as_view(), name='user'),
    path('password/change/', ChangePasswordView.as_view(), name='password-change'),
]
