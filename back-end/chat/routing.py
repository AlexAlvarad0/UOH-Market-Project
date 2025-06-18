from django.urls import path, re_path
from chat import consumers

print("🚀 Cargando routing.py de WebSocket...")
print("📁 Módulo consumers cargado correctamente")

websocket_urlpatterns = [
    path('ws/chat/<int:conversation_id>/', consumers.ChatConsumer.as_asgi()),
    path('ws/notifications/', consumers.NotificationConsumer.as_asgi()),
]

print(f"✅ Rutas WebSocket configuradas: {len(websocket_urlpatterns)} rutas")
for i, pattern in enumerate(websocket_urlpatterns):
    print(f"   {i+1}. {pattern.pattern}")
