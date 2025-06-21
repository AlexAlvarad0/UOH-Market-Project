from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'favorites', views.FavoriteViewSet, basename='favorite')

urlpatterns = [
    path('', include(router.urls)),
    path('debug_user_verification/', views.debug_user_verification, name='debug_user_verification'),
    path('debug_check_user/', views.debug_check_user, name='debug_check_user'),
]
