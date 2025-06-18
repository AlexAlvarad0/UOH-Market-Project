from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Message, Conversation
from .serializers import MessageSerializer, ConversationSerializer


@receiver(post_save, sender=Message)
def message_saved(sender, instance, created, **kwargs):
    """Enviar notificación cuando se crea o actualiza un mensaje"""
    print(f"🔄 Signal message_saved ejecutada - created: {created}, is_deleted: {getattr(instance, 'is_deleted', False)}, is_edited: {getattr(instance, 'is_edited', False)}")
    
    channel_layer = get_channel_layer()
    conversation = instance.conversation
    
    # Crear message_data manualmente para evitar problemas de serialización
    try:
        # Serializar usando MessageSerializer
        message_data = MessageSerializer(instance, context={}).data
        
        # Asegurar que las fechas estén en formato string
        if 'created_at' in message_data and hasattr(message_data['created_at'], 'isoformat'):
            message_data['created_at'] = message_data['created_at'].isoformat()
        if 'edited_at' in message_data and message_data['edited_at'] and hasattr(message_data['edited_at'], 'isoformat'):
            message_data['edited_at'] = message_data['edited_at'].isoformat()
            
    except Exception as e:
        print(f"⚠️ Error serializando mensaje, usando serialización manual: {str(e)}")
        # Fallback: crear datos manualmente
        message_data = {
            'id': instance.id,
            'conversation': instance.conversation.id,
            'sender': instance.sender.id,
            'sender_username': instance.sender.username,
            'content': instance.content,
            'message_type': instance.message_type,
            'audio_file': instance.audio_file.url if instance.audio_file else None,
            'audio_url': instance.audio_file.url if instance.audio_file else None,
            'audio_duration': instance.audio_duration,
            'created_at': instance.created_at.isoformat(),
            'edited_at': instance.edited_at.isoformat() if instance.edited_at else None,
            'is_edited': instance.is_edited,
            'is_read': instance.is_read,
            'is_deleted': instance.is_deleted,
            'liked': instance.liked,
            'liked_by': [user.id for user in instance.liked_by.all()],
            'liked_by_users': [{'id': user.id, 'username': user.username} for user in instance.liked_by.all()]
        }
    
    # Grupo de la conversación para notificaciones en tiempo real
    conversation_group = f'chat_{conversation.id}'
    
    if created:
        print(f"📨 Enviando nuevo mensaje al grupo {conversation_group}")
        # Notificar nuevo mensaje a todos los participantes de la conversación
        async_to_sync(channel_layer.group_send)(
            conversation_group,
            {
                'type': 'chat_message_broadcast',
                'message': message_data
            }
        )
        
        # Notificar a los participantes sobre el nuevo mensaje en sus notificaciones generales
        for participant in conversation.participants.all():
            if participant != instance.sender:  # No notificar al remitente
                user_group = f'user_{participant.id}'
                
                # Calcular mensajes no leídos para este usuario
                unread_count = conversation.messages.filter(
                    is_read=False
                ).exclude(sender=participant).count()
                
                async_to_sync(channel_layer.group_send)(
                    user_group,
                    {
                        'type': 'conversation_update_notification',
                        'conversation_id': conversation.id,
                        'latest_message': message_data,
                        'unread_count': unread_count
                    }
                )
    else:
        # Mensaje actualizado (editado o eliminado)
        if instance.is_deleted:
            print(f"🗑️ Enviando notificación de eliminación al grupo {conversation_group}")
            # Notificar eliminación de mensaje
            async_to_sync(channel_layer.group_send)(
                conversation_group,
                {
                    'type': 'message_delete_broadcast',
                    'message_id': instance.id
                }
            )
        elif instance.is_edited:
            print(f"✏️ Enviando notificación de edición al grupo {conversation_group}")
            # Notificar edición de mensaje
            async_to_sync(channel_layer.group_send)(
                conversation_group,
                {
                    'type': 'message_edit_broadcast',
                    'message': message_data
                }
            )


@receiver(post_save, sender=Conversation)
def conversation_created(sender, instance, created, **kwargs):
    """Enviar notificación cuando se crea una conversación"""
    if created:
        channel_layer = get_channel_layer()
        # Crear el serializer con un contexto vacío para evitar errores
        conversation_data = ConversationSerializer(instance, context={}).data
        
        # Notificar a todos los participantes sobre la nueva conversación
        for participant in instance.participants.all():
            user_group = f'user_{participant.id}'
            
            async_to_sync(channel_layer.group_send)(
                user_group,
                {
                    'type': 'new_conversation_notification',
                    'conversation': conversation_data
                }
            )


@receiver(m2m_changed, sender=Conversation.participants.through)
def conversation_participants_changed(sender, instance, action, pk_set, **kwargs):
    """Notificar cuando se añaden participantes a una conversación"""
    if action == "post_add":
        channel_layer = get_channel_layer()
        # Crear el serializer con un contexto vacío para evitar errores
        conversation_data = ConversationSerializer(instance, context={}).data
        
        # Notificar solo a los nuevos participantes
        for participant_id in pk_set:
            user_group = f'user_{participant_id}'
            
            async_to_sync(channel_layer.group_send)(
                user_group,
                {
                    'type': 'new_conversation_notification',
                    'conversation': conversation_data
                }
            )


# Agregar señal para likes de mensajes
@receiver(m2m_changed, sender=Message.liked_by.through)
def message_like_changed(sender, instance, action, pk_set, **kwargs):
    """Enviar notificación cuando se cambia el like de un mensaje"""
    if action in ["post_add", "post_remove"]:
        print(f"👍 Signal message_like_changed ejecutada - action: {action}, message_id: {instance.id}")
        
        channel_layer = get_channel_layer()
        conversation_group = f'chat_{instance.conversation.id}'
        
        # Obtener información actualizada del mensaje
        liked_by_users = [{'id': u.id, 'username': u.username} for u in instance.liked_by.all()]
        
        for user_id in pk_set:
            print(f"📤 Enviando notificación de like al grupo {conversation_group}")
            async_to_sync(channel_layer.group_send)(
                conversation_group,
                {
                    'type': 'message_like_broadcast',
                    'message_id': instance.id,
                    'user_id': user_id,
                    'liked': action == "post_add",
                    'liked_by': [u.id for u in instance.liked_by.all()],
                    'liked_by_users': liked_by_users,
                    'total_likes': instance.liked_by.count()
                }
            )
