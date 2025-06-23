"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Inicializa Django antes de importar aplicaciones
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.middleware import JWTAuthMiddlewareStack
from chat.routing import websocket_urlpatterns

print("🚀 Configurando aplicación ASGI...")
print(f"📡 WebSocket routes registradas: {len(websocket_urlpatterns)}")
for i, pattern in enumerate(websocket_urlpatterns):
    print(f"   {i+1}. {pattern.pattern}")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})

print("✅ Aplicación ASGI configurada correctamente")
