from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Conversation, Message
from products.models import Product
from .serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retorna solo las conversaciones del usuario autenticado."""
        # Añadir conteo de mensajes no leídos para el usuario actual
        return Conversation.objects.filter(participants=self.request.user)
    
    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product_id')
        seller_id = request.data.get('seller_id')
        
        try:
            product = Product.objects.get(id=product_id)
            
            # Si ya existe una conversación para este producto y usuario
            existing_conversation = Conversation.objects.filter(
                product=product,
                participants=request.user
            ).first()
            
            if existing_conversation:
                serializer = self.get_serializer(existing_conversation)
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # Crear nueva conversación
            conversation = Conversation.objects.create(product=product)
            conversation.participants.add(request.user)
            conversation.participants.add(product.seller)
            
            serializer = self.get_serializer(conversation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Product.DoesNotExist:
            return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    
    def retrieve(self, request, *args, **kwargs):
        """Al acceder a una conversación, asegurar que los mensajes se marquen como leídos."""
        instance = self.get_object()
        # Marcar los mensajes no leídos dirigidos al usuario actual como leídos
        unread_messages = instance.messages.filter(is_read=False).exclude(sender=request.user)
        for message in unread_messages:
            message.is_read = True
            message.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def get_serializer_context(self):
        """Asegurar que el request context esté disponible en todos los serializers"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Obtiene los mensajes de una conversación y los marca como leídos."""
        conversation = self.get_object()
        messages = conversation.messages.all().order_by('created_at')
          # Marcar mensajes como leídos cuando el usuario actual accede a ellos
        unread_messages = messages.filter(is_read=False).exclude(sender=request.user)
        for message in unread_messages:
            message.is_read = True
            message.save()
            
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_context(self):
        """Asegurar que el request context esté disponible en todos los serializers"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            return Message.objects.filter(conversation_id=conversation_id).order_by('created_at')
        # Permitir acceso a todos los mensajes para operaciones como editar, eliminar y dar like
        return Message.objects.all()
    
    def update(self, request, *args, **kwargs):
        """Solo permitir actualizar mensajes enviados por el usuario."""
        instance = self.get_object()
        
        # Verificar que sea el remitente del mensaje
        if instance.sender != request.user:
            return Response(
                {"detail": "No tienes permiso para editar este mensaje."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Actualizar contenido y marcar como editado
        content = request.data.get('content')
        if content:
            instance.content = content
            instance.is_edited = True
            instance.edited_at = timezone.now()
            instance.save()
              # Actualizar timestamp de la conversación
            instance.conversation.updated_at = instance.edited_at
            instance.conversation.save()
            
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        # Buscar 'conversation' en lugar de 'conversation_id'
        conversation_id = request.data.get('conversation')
        
        try:
            conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
            
            # Determinar el tipo de mensaje
            message_type = request.data.get('message_type', 'text')
            
            # Crear el mensaje según el tipo
            if message_type == 'audio':
                # Para mensajes de audio
                audio_file = request.FILES.get('audio_file')
                audio_duration = request.data.get('audio_duration')
                
                if not audio_file:
                    return Response({'detail': 'Se requiere un archivo de audio.'}, status=status.HTTP_400_BAD_REQUEST)
                
                message = Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    message_type='audio',
                    audio_file=audio_file,
                    audio_duration=audio_duration,
                    liked=False
                )
            else:
                # Para mensajes de texto
                content = request.data.get('content')
                if not content:
                    return Response({'detail': 'El contenido del mensaje es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
                  # Obtener el mensaje al que se está respondiendo (si existe)
                reply_to_id = request.data.get('reply_to')
                reply_to_message = None
                
                print(f"🔗 Creating message with reply_to: {reply_to_id}")  # Debug log
                
                if reply_to_id:
                    try:
                        reply_to_message = Message.objects.get(id=reply_to_id, conversation=conversation)
                        # Manejar tanto mensajes de texto como de audio
                        content_preview = ""
                        if reply_to_message.content:
                            content_preview = reply_to_message.content[:50]
                        elif reply_to_message.message_type == 'audio':
                            content_preview = f"Audio message ({reply_to_message.audio_duration}s)"
                        else:
                            content_preview = "Empty message"
                        print(f"✅ Found reply_to message: {reply_to_message.id} - {content_preview}")  # Debug log
                    except Message.DoesNotExist:
                        print(f"❌ Reply_to message not found: {reply_to_id}")  # Debug log
                        return Response({'detail': 'El mensaje al que intentas responder no existe.'}, status=status.HTTP_400_BAD_REQUEST)
                
                message = Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=content,
                    message_type='text',
                    reply_to=reply_to_message,
                    liked=False
                )
                
                print(f"📨 Created message {message.id} with reply_to: {message.reply_to.id if message.reply_to else None}")  # Debug log
            
            conversation.updated_at = message.created_at
            conversation.save()
            
            serializer = MessageSerializer(message, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Conversation.DoesNotExist:
            return Response({'detail': 'Conversación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=True, methods=['post'], url_path='like')
    def like(self, request, pk=None):
        """Permitir dar like o remover like a mensajes (no propios)."""
        message = self.get_object()
        user = request.user
        if message.sender == user:
            return Response({'detail': 'No se puede dar like a tu propio mensaje.'}, status=status.HTTP_400_BAD_REQUEST)

        if user in message.liked_by.all():
            message.liked_by.remove(user)
            liked = False
        else:
            message.liked_by.add(user)
            liked = True
            
            # Crear notificación solo cuando se da like (no cuando se quita)
            from notifications.models import Notification
            Notification.objects.create(
                user=message.sender,
                from_user=user,
                type='like_message',
                title='Nuevo like en tu mensaje',
                message=f'{user.username} le ha dado like a tu mensaje',
                related_message=message,
                related_conversation=message.conversation
            )
        
        # Actualizar el campo "liked" si hay al menos un like
        message.liked = message.liked_by.count() > 0
        message.save()
        
        # Devolver información detallada de los usuarios que dieron like
        liked_by_users = [{'id': u.id, 'username': u.username} for u in message.liked_by.all()]
        
        return Response({
            'liked_by': [u.id for u in message.liked_by.all()],
            'liked': message.liked,
            'liked_by_users': liked_by_users
        })    
    def destroy(self, request, *args, **kwargs):
        """Marcar mensaje como eliminado en lugar de eliminarlos completamente."""
        instance = self.get_object()
        
        # Verificar que sea el remitente del mensaje
        if instance.sender != request.user:
            return Response(
                {"detail": "No tienes permiso para eliminar este mensaje."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Marcar como eliminado en lugar de eliminar
        instance.is_deleted = True
        instance.save()
        
        # Actualizar timestamp de la conversación
        instance.conversation.updated_at = timezone.now()
        instance.conversation.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)