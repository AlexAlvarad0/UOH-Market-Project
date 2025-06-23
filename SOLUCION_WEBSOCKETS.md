# 🔌 SOLUCIÓN: Configuración de WebSockets para Railway

## 📋 Problema identificado

Los WebSockets estaban configurados con URLs hardcodeadas (`ws://127.0.0.1:8000`) en lugar de usar la URL de Railway.

## ✅ Cambios realizados

### 1. Configuración dinámica en `config.ts`

```typescript
// Nuevo código para generar URLs de WebSocket dinámicamente
export const getWebSocketURL = (): string => {
  if (!API_URL) return 'ws://localhost:8000';
  
  // Convertir HTTP/HTTPS a WS/WSS
  let wsUrl = API_URL;
  if (wsUrl.startsWith('https://')) {
    wsUrl = wsUrl.replace('https://', 'wss://');
  } else if (wsUrl.startsWith('http://')) {
    wsUrl = wsUrl.replace('http://', 'ws://');
  }
  
  // Remover /api del final si existe
  wsUrl = wsUrl.replace(/\/api\/?$/, '');
  
  return wsUrl;
};
```

### 2. URLs corregidas en `websocket.ts`

**Antes:**
```typescript
const wsUrl = `ws://127.0.0.1:8000/ws/chat/${conversationId}/?token=${this.token}`;
const wsUrl = `ws://127.0.0.1:8000/ws/notifications/?token=${this.token}`;
```

**Después:**
```typescript
const baseWsUrl = getWebSocketURL();
const wsUrl = `${baseWsUrl}/ws/chat/${conversationId}/?token=${this.token}`;
const wsUrl = `${baseWsUrl}/ws/notifications/?token=${this.token}`;
```

## 🌐 URLs resultantes

### Desarrollo (localhost):
- Chat: `ws://localhost:8000/ws/chat/1/?token=...`
- Notificaciones: `ws://localhost:8000/ws/notifications/?token=...`

### Producción (Railway):
- Chat: `wss://uoh-market-project-production-e906.up.railway.app/ws/chat/1/?token=...`
- Notificaciones: `wss://uoh-market-project-production-e906.up.railway.app/ws/notifications/?token=...`

## ⚙️ Configuración de Railway

### Backend ya configurado correctamente:
```bash
# Comando de inicio en Railway:
python manage.py migrate && daphne -b 0.0.0.0 -p $PORT backend.asgi:application
```

### Variable de entorno en Vercel:
```
VITE_API_URL=https://uoh-market-project-production-e906.up.railway.app/api
```

## 🧪 Verificación

Después del deploy, verifica en el navegador (consola de desarrollador):

**Antes (error):**
```
WebSocket connection to 'ws://127.0.0.1:8000/ws/notifications/' failed
```

**Después (éxito):**
```
WebSocket connection to 'wss://uoh-market-project-production-e906.up.railway.app/ws/notifications/' established
```

## 📦 Próximos pasos

1. **Hacer commit y push** de los cambios
2. **Deploy automático** en Vercel
3. **Verificar** que las conexiones WebSocket funcionen en producción

---

**🎯 Resultado esperado:**
- ✅ Chat en tiempo real funcionando
- ✅ Notificaciones en vivo
- ✅ Sin errores de conexión WebSocket

**⏰ Tiempo estimado: 5 minutos**
