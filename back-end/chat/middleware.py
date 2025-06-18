from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from channels.auth import AuthMiddlewareStack
from django.conf import settings
from urllib.parse import parse_qs
from rest_framework.authtoken.models import Token

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    try:
        # Buscar el token en la base de datos (DRF Token)
        token_obj = Token.objects.get(key=token)
        user = token_obj.user
        print(f"✅ Usuario autenticado: {user.username} (ID: {user.id})")
        return user
    except Token.DoesNotExist:
        print(f"❌ Token no encontrado: {token}")
    except Exception as e:
        print(f"❌ Error en autenticación: {str(e)}")
    
    return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware para autenticación JWT en WebSockets
    """
    async def __call__(self, scope, receive, send):
        # Cerrar conexiones antiguas
        close_old_connections()
        
        # Debug - Log información del scope
        print(f"🔍 WebSocket request - Path: {scope.get('path', 'unknown')}")
        print(f"🔍 Scope type: {scope.get('type', 'unknown')}")
        
        # Obtener el token de la query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        print(f"🔑 Token recibido: {token[:20] if token else 'None'}...")
        
        # Autenticar usuario
        if token:
            try:
                scope['user'] = await get_user_from_token(token)
                if scope['user'] != AnonymousUser():
                    print(f"✅ Usuario {scope['user'].username} autenticado correctamente")
                else:
                    print("❌ Token inválido, usuario anónimo")
            except Exception as e:
                print(f"❌ Error en autenticación: {str(e)}")
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()
            print("❌ No se proporcionó token")
        
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """
    Stack de middleware JWT para WebSockets
    """
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
