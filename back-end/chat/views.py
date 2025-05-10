from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
            
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            return Message.objects.filter(conversation_id=conversation_id).order_by('created_at')
        return Message.objects.none()
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Buscar 'conversation' en lugar de 'conversation_id'
        conversation_id = request.data.get('conversation')
        try:
            conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=request.data.get('content')
            )
            
            conversation.updated_at = message.created_at
            conversation.save()
            
            serializer = MessageSerializer(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Conversation.DoesNotExist:
            return Response({'detail': 'Conversación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)