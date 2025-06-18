# Solución para Errores WebSocket 404

## Problema
El frontend no puede conectarse a los endpoints WebSocket, recibiendo errores 404:
- `ws://127.0.0.1:8000/ws/chat/6/?token=...` → Error 404
- `ws://127.0.0.1:8000/ws/notifications/?token=...` → Error 404

## Solución Implementada

### 📁 Archivos Modificados/Creados

1. **`chat/middleware.py`** - Middleware de autenticación mejorado con debug
2. **`chat/consumers.py`** - Consumers con logging detallado
3. **`chat/routing.py`** - Rutas WebSocket con debug
4. **`simple_diagnostic.py`** - Script de diagnóstico sin dependencias
5. **`simple_websocket_test.py`** - Prueba manual de WebSocket
6. **`start_server.bat`** - Script mejorado para iniciar servidor
7. **`test_websocket.bat`** - Script para probar conexiones

### 🚀 Instrucciones de Uso

#### Paso 1: Ejecutar Diagnóstico
```batch
cd back-end
python simple_diagnostic.py
```

#### Paso 2: Iniciar Servidor
```batch
cd back-end
start_server.bat
```

#### Paso 3: Probar Conexiones (en otra terminal)
```batch
cd back-end
test_websocket.bat
```

### 🔍 Qué Buscar en los Logs

**En el servidor (start_server.bat):**
- ✅ "Django configurado correctamente"
- ✅ "WebSocket patterns importados: X rutas"
- ✅ "Channels routing importado"
- ✅ "Middleware de autenticación importado"
- ✅ "Consumers importados"

**En las pruebas (test_websocket.bat):**
- ✅ "Handshake WebSocket exitoso!" = Conexión funcionando
- ❌ "Error 404: Ruta no encontrada" = Problema de routing
- ❌ "Error 401: No autorizado" = Problema de autenticación
- ❌ "Conexión rechazada" = Servidor no ejecutándose

### 🛠️ Solución de Problemas

#### Error 404 - Ruta no encontrada
- Verificar que `chat/routing.py` se está cargando correctamente
- Revisar que `backend/asgi.py` incluye las rutas WebSocket
- Comprobar que no hay errores de sintaxis en los archivos

#### Error 401/403 - Problemas de autenticación
- Verificar que el token en el frontend es válido
- Revisar la tabla `authtoken_token` en la base de datos
- Comprobar que el middleware `JWTAuthMiddleware` está funcionando

#### Servidor no responde
- Verificar que el puerto 8000 no está siendo usado por otro proceso
- Revisar que `daphne` está instalado: `pip install daphne`
- Comprobar que todas las dependencias están instaladas

### 📋 Checklist de Verificación

- [ ] El diagnóstico muestra todas las importaciones exitosas
- [ ] El servidor inicia sin errores
- [ ] Los logs del servidor muestran información de debug cuando se intenta conectar
- [ ] Las pruebas manuales muestran handshake exitoso
- [ ] El frontend puede conectarse sin errores 404

### 🔧 Comandos de Debug Adicionales

**Verificar proceso en puerto 8000:**
```cmd
netstat -ano | findstr :8000
```

**Verificar instalación de dependencias:**
```cmd
pip list | findstr -i "django channels daphne"
```

**Probar conexión básica:**
```cmd
curl -I http://127.0.0.1:8000/
```

### 📞 Si el Problema Persiste

1. Revisa los logs completos del servidor
2. Verifica que la base de datos tiene datos de prueba (conversaciones, usuarios, tokens)
3. Prueba con diferentes IDs de conversación
4. Verifica que el frontend está usando el token correcto

### 🎯 Resultado Esperado

Después de aplicar esta solución:
- El servidor debería iniciar sin errores
- Las pruebas de WebSocket deberían mostrar "Handshake WebSocket exitoso!"
- El frontend debería conectarse sin errores 404
- Los mensajes de chat deberían funcionar normalmente
