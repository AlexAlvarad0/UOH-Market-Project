from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Solo muestra las notificaciones del usuario autenticado"""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Devuelve solo las notificaciones no leídas"""
        queryset = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'Todas las notificaciones marcadas como leídas'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca una notificación específica como leída"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Notificación marcada como leída'})
    
    @action(detail=False, methods=['post'])
    def mark_conversation_read(self, request):
        """Marca como leídas todas las notificaciones relacionadas con una conversación específica"""
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response(
                {"detail": "Se requiere el ID de la conversación"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Marcar como leídas todas las notificaciones de esta conversación para el usuario actual
        notifications = self.get_queryset().filter(
            related_conversation=conversation_id,
            is_read=False
        )
        
        count = notifications.count()
        notifications.update(is_read=True)
        
        return Response({
            'status': f'Se marcaron {count} notificaciones de la conversación como leídas',
            'count': count
        })
    
    @action(detail=False, methods=['post'])
    def mark_product_read(self, request):
        """Marca como leídas todas las notificaciones relacionadas con un producto específico"""
        product_id = request.data.get('product_id')
        if not product_id:
            return Response(
                {"detail": "Se requiere el ID del producto"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Marcar como leídas todas las notificaciones de este producto para el usuario actual
        notifications = self.get_queryset().filter(
            related_product=product_id,
            is_read=False
        )
        
        count = notifications.count()
        notifications.update(is_read=True)
        
        return Response({
            'status': f'Se marcaron {count} notificaciones del producto como leídas',
            'count': count
        })
    
    @action(detail=False, methods=['post'])
    def mark_message_read(self, request):
        """Marca como leídas todas las notificaciones relacionadas con un mensaje específico"""
        message_id = request.data.get('message_id')
        if not message_id:
            return Response(
                {"detail": "Se requiere el ID del mensaje"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Marcar como leídas todas las notificaciones de este mensaje para el usuario actual
        notifications = self.get_queryset().filter(
            related_message=message_id,
            is_read=False
        )
        
        count = notifications.count()
        notifications.update(is_read=True)
        
        return Response({
            'status': f'Se marcaron {count} notificaciones del mensaje como leídas',
            'count': count
        })
    
    @action(detail=False, methods=['delete'], url_path='delete_all')
    def delete_all(self, request):
        """Elimina todas las notificaciones del usuario autenticado"""
        queryset = self.get_queryset()
        count = queryset.count()
        queryset.delete()
        return Response({'status': f'Se eliminaron {count} notificaciones', 'count': count})
    
    def create(self, request, *args, **kwargs):
        """
        Sobrescribimos el método create para que solo los administradores 
        puedan crear notificaciones manualmente
        """
        if request.user.is_staff:
            return super().create(request, *args, **kwargs)
        return Response(
            {"detail": "No tienes permisos para crear notificaciones manualmente"},
            status=status.HTTP_403_FORBIDDEN
        )