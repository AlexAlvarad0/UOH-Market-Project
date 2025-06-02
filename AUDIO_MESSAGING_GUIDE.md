# 🎤 Guía de Mensajería de Audio - UOH Market

## ✅ Funcionalidad Implementada

La aplicación UOH Market ahora cuenta con un sistema completo de mensajería de audio similar a WhatsApp, que permite a los usuarios enviar, recibir y reproducir mensajes de audio en tiempo real.

---

## 🏗️ Arquitectura del Sistema

### Backend (Django)

#### 1. **Modelo Message Actualizado**
```python
# chat/models.py
class Message(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Texto'),
        ('audio', 'Audio'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(blank=True, null=True)  # Opcional para audio
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    audio_file = models.FileField(upload_to='audio_messages/', null=True, blank=True)
    audio_duration = models.PositiveIntegerField(null=True, blank=True, help_text='Duración en segundos')
    created_at = models.DateTimeField(auto_now_add=True)
    # ... otros campos existentes
```

#### 2. **Serializer Mejorado**
```python
# chat/serializers.py
class MessageSerializer(serializers.ModelSerializer):
    audio_url = serializers.SerializerMethodField()
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
        return None
```

#### 3. **Vista para Manejo de Audio**
```python
# chat/views.py
def create(self, request, *args, **kwargs):
    message_type = request.data.get('message_type', 'text')
    
    if message_type == 'audio':
        audio_file = request.FILES.get('audio_file')
        audio_duration = request.data.get('audio_duration')
        # Procesamiento específico para audio
```

### Frontend (React + TypeScript)

#### 1. **Hook useAudioRecorder**
Maneja toda la lógica de grabación de audio:
- ✅ Grabación con MediaRecorder API
- ✅ Control de tiempo en vivo
- ✅ Reproducción previa
- ✅ Manejo de estados (grabando, pausado, reproduciendo)
- ✅ Gestión de permisos de micrófono

#### 2. **Componente AudioRecorder**
Interfaz de usuario para grabación:
- ✅ Botón de micrófono con hold-to-record
- ✅ Indicador visual de grabación
- ✅ Modo preview con controles
- ✅ Botones de enviar/cancelar

#### 3. **Componente AudioMessage**
Reproductor de mensajes de audio:
- ✅ Controles de reproducción (play/pause)
- ✅ Barra de progreso interactiva
- ✅ Visualización de duración
- ✅ Botón de descarga
- ✅ Diseño adaptado a mensajes propios/ajenos

---

## 🎯 Características Principales

### 🎙️ Grabación de Audio
- **Hold to Record**: Mantener presionado el botón de micrófono para grabar
- **Grabación Mínima**: 500ms para evitar grabaciones accidentales
- **Límite de Tiempo**: Configurable (actualmente sin límite)
- **Calidad**: Audio web comprimido optimizado

### 🎧 Reproducción de Audio
- **Controles Intuitivos**: Play/pause con iconos claros
- **Progreso Visual**: Barra de progreso que muestra tiempo actual/total
- **Auto-pausa**: Se detiene automáticamente al finalizar
- **Descarga**: Opción para descargar el archivo de audio

### 💬 Integración en Chat
- **Tipos de Mensaje**: Soporte para texto y audio en la misma conversación
- **UI Consistente**: Diseño unificado con los mensajes de texto
- **Metadatos**: Timestamp, remitente y duración visible
- **Estados**: Indicadores para mensajes propios vs. recibidos

---

## 🚀 Cómo Usar

### Para Usuarios Finales

1. **Enviar Audio**:
   - Ve a cualquier conversación de chat
   - Mantén presionado el botón del micrófono (🎤)
   - Habla tu mensaje
   - Suelta para entrar en modo preview
   - Presiona ▶️ para escuchar o ✅ para enviar

2. **Recibir/Reproducir Audio**:
   - Los mensajes de audio aparecen con un reproductor
   - Presiona ▶️ para reproducir
   - Usa la barra de progreso para navegar
   - Presiona ⬇️ para descargar

### Para Desarrolladores

1. **Configuración del Backend**:
```bash
# Asegurar migración aplicada
python manage.py migrate

# Configurar settings.py para servir archivos de media
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

2. **API Endpoints**:
```bash
# Enviar mensaje de audio
POST /api/messages/
Content-Type: multipart/form-data
{
  "conversation": 1,
  "message_type": "audio",
  "audio_file": <file>,
  "audio_duration": 15
}

# Obtener mensajes (incluye audio_url)
GET /api/conversations/{id}/messages/
```

3. **Estructura de Respuesta**:
```typescript
interface Message {
  id: number;
  message_type: 'text' | 'audio';
  content?: string;
  audio_url?: string;
  audio_duration?: number;
  // ... otros campos
}
```

---

## 🔧 Configuración Avanzada

### Permisos de Micrófono
```javascript
// El hook maneja automáticamente los permisos
// Pero puedes personalizar el comportamiento:
const { startRecording, error } = useAudioRecorder({
  onPermissionDenied: () => {
    alert('Se necesita acceso al micrófono para enviar mensajes de audio');
  }
});
```

### Personalización de UI
```tsx
// Personalizar el componente AudioRecorder
<AudioRecorder
  onSendAudio={handleSendAudio}
  disabled={isEditing}
  maxDuration={60} // Máximo 60 segundos
  theme="dark" // Tema personalizado
/>
```

### Almacenamiento de Archivos
```python
# En settings.py - personalizar ubicación de audio
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Para producción, usar cloud storage
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

---

## 🎨 Diseño y UX

### Principios de Diseño
- **Familiar**: Interfaz similar a WhatsApp para facilidad de uso
- **Visual**: Indicadores claros de estado (grabando, reproduciendo)
- **Accesible**: Controles táctiles grandes y tooltips informativos
- **Responsivo**: Funciona perfecto en móvil y desktop

### Estados Visuales
- 🎤 **Normal**: Botón de micrófono disponible
- 🔴 **Grabando**: Botón rojo con timer en tiempo real
- ▶️ **Preview**: Controles de reproducción y opciones
- ⏸️ **Reproduciendo**: Barra de progreso activa

---

## 🐛 Solución de Problemas

### Errores Comunes

1. **"Micrófono no disponible"**
   - Verificar permisos del navegador
   - Usar HTTPS en producción
   - Verificar que el dispositivo tenga micrófono

2. **"Error al subir audio"**
   - Verificar configuración MEDIA_ROOT
   - Comprobar permisos de escritura
   - Revisar tamaño máximo de archivos

3. **"Audio no reproduce"**
   - Verificar que audio_url esté presente
   - Comprobar CORS settings
   - Verificar codec de audio soportado

### Debug Mode
```typescript
// Activar logs detallados
const { startRecording } = useAudioRecorder({
  debug: true // Mostrará logs en consola
});
```

---

## 🔮 Futuras Mejoras

### Próximas Características
- [ ] **Compresión de Audio**: Reducir tamaño de archivos
- [ ] **Transcripción**: Convertir audio a texto automáticamente
- [ ] **Efectos de Voz**: Filtros y efectos para el audio
- [ ] **Audio Notas**: Grabación más larga para notas de voz
- [ ] **Visualización de Ondas**: Mostrar forma de onda del audio

### Optimizaciones Técnicas
- [ ] **Caching**: Cache de archivos de audio reproducidos
- [ ] **Streaming**: Reproducción progresiva para archivos grandes
- [ ] **CDN**: Distribución de archivos a través de CDN
- [ ] **Compresión Real-time**: Compresión durante la grabación

---

## 📝 Testing

### Tests Automatizados
```bash
# Backend tests
python manage.py test chat.tests.test_audio_messages

# Frontend tests
npm run test -- AudioRecorder AudioMessage useAudioRecorder
```

### Tests Manuales
1. ✅ Grabar audio de diferentes duraciones
2. ✅ Enviar y recibir en conversaciones múltiples
3. ✅ Reproducir en diferentes dispositivos
4. ✅ Verificar descarga de archivos
5. ✅ Probar en conexiones lentas

---

## 🏆 Logros Técnicos

### Backend
✅ Modelo de datos flexible para múltiples tipos de mensaje  
✅ API robusta con manejo de FormData  
✅ Almacenamiento eficiente de archivos de audio  
✅ Serialización optimizada con URLs absolutas  

### Frontend
✅ Hook personalizado reutilizable para audio  
✅ Componentes modulares y reutilizables  
✅ Integración perfecta con el chat existente  
✅ Manejo completo de estados y errores  
✅ UI/UX de calidad profesional  

### Integración
✅ Sincronización en tiempo real entre usuarios  
✅ Compatibilidad con funcionalidades existentes (likes, edición, eliminación)  
✅ Performance optimizada para audio  
✅ Manejo robusto de errores  

---

## 📞 Soporte

Para reportar bugs o sugerir mejoras, crear un issue en el repositorio del proyecto.

**¡La funcionalidad de mensajes de audio está lista y funcionando perfectamente! 🎉**
