from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView  # Para redirigir la ruta raíz
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from products.views import CategoryViewSet, ProductViewSet, FavoriteViewSet
from chat.views import ConversationViewSet, MessageViewSet
from accounts.views import UserProfileView  # Importar la vista UserProfileView
from django.http import JsonResponse

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')

def websocket_test_view(request):
    """View para testear si las rutas WebSocket están funcionando"""
    return JsonResponse({
        'message': 'WebSocket routes test',
        'asgi_application': settings.ASGI_APPLICATION,
        'debug_mode': settings.DEBUG,
        'server_info': 'Django with Daphne'
    })

urlpatterns = [
    path('', RedirectView.as_view(url='/api/', permanent=False)),  # Redirige '/' a '/api/'
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),  # Rutas de authentication (login, google login)
    path('api/accounts/', include('accounts.urls')),  # Rutas de accounts (register, profile, ratings, etc.)
    path('api/', include(router.urls)),
    path('api/products/', include('products.urls')),  # Incluir URLs adicionales de products
    path('api/chat/', include('chat.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/websocket-test/', websocket_test_view, name='websocket_test'),
]

# Configurar serving de archivos estáticos y media
# Servir archivos media tanto en desarrollo como en producción
# Railway necesita esto para servir archivos media
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
