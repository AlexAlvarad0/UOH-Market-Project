from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Conversation, Message
from .serializers import MessageSerializer
from accounts.models import User
import json

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Obtener el ID de la conversación de la URL
        try:
            self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        except KeyError:
            await self.close()
            return
            
        self.conversation_group_name = f'chat_{self.conversation_id}'
        
        # Verificar autenticación
        user = self.scope.get("user")
        
        if user == AnonymousUser() or user is None:
            await self.close()
            return
        
        # Verificar que el usuario pertenece a la conversación
        user_in_conv = await self.user_in_conversation()
        
        if not user_in_conv:
            await self.close()
            return
          # Unirse al grupo de la conversación
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo de la conversación
        if hasattr(self, 'conversation_group_name'):
            await self.channel_layer.group_discard(
                self.conversation_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'message_read':
                await self.handle_message_read(data)
            elif message_type == 'message_like':
                await self.handle_message_like(data)
            elif message_type == 'message_edit':
                await self.handle_message_edit(data)
            elif message_type == 'message_delete':
                await self.handle_message_delete(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
                
        except (json.JSONDecodeError, Exception):
            pass  # Silenciar errores para mejor rendimiento
    async def handle_chat_message(self, data):
        """Manejar envío de nuevos mensajes"""
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        
        if not content and message_type == 'text':
            return
        
        # Crear el mensaje en la base de datos
        message = await self.create_message(content, message_type)
        
        if message:
            # Enviar el mensaje a todos los clientes en el grupo
            await self.channel_layer.group_send(                self.conversation_group_name,
                {
                    'type': 'chat_message_broadcast',
                    'message': message
                }
            )
    async def handle_message_read(self, data):
        """Manejar marcado de mensajes como leídos"""
        message_id = data.get('message_id')
        if message_id:
            result = await self.mark_message_read(message_id)
            if result and result.get('success'):
                # Obtener información del mensaje y su emisor
                message_sender_id = result.get('sender_id')
                if message_sender_id:
                    await self.channel_layer.group_send(
                        self.conversation_group_name,
                        {
                            'type': 'message_read_broadcast',
                            'message_id': message_id,
                            'reader_user_id': self.scope["user"].id,
                            'sender_user_id': message_sender_id
                        }
                    )

    
    async def handle_message_like(self, data):
        """Manejar likes de mensajes"""
        message_id = data.get('message_id')
        if message_id:
            result = await self.toggle_message_like(message_id)
            if result:
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        'type': 'message_like_broadcast',
                        'message_id': message_id,
                        'user_id': self.scope["user"].id,
                        'liked': result['liked'],
                        'liked_by': result['liked_by'],
                        'liked_by_users': result['liked_by_users']
                    }
                )
    
    async def handle_message_edit(self, data):
        """Manejar edición de mensajes"""
        message_id = data.get('message_id')
        new_content = data.get('content', '').strip()
        
        if message_id and new_content:
            message = await self.edit_message(message_id, new_content)
            if message:
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        'type': 'message_edit_broadcast',
                        'message': message
                    }
                )
    
    async def handle_message_delete(self, data):
        """Manejar eliminación de mensajes"""
        message_id = data.get('message_id')
        
        if message_id:
            success = await self.delete_message(message_id)
            if success:
                await self.channel_layer.group_send(
                    self.conversation_group_name,
                    {
                        'type': 'message_delete_broadcast',
                        'message_id': message_id
                    }
                )
    
    async def handle_typing(self, data):
        """Manejar indicador de escritura"""
        is_typing = data.get('is_typing', False)
        
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                'type': 'typing_broadcast',
                'user_id': self.scope["user"].id,
                'username': self.scope["user"].username,
                'is_typing': is_typing            }
        )

    # Métodos de broadcast para enviar datos a todos los clientes
    async def chat_message_broadcast(self, event):
        """Enviar nuevo mensaje a todos los clientes"""
        try:
            # Serializar de forma segura usando el método auxiliar
            message_data = self.serialize_datetime_objects(event['message'])
            
            response_data = {
                'type': 'new_message',
                'message': message_data            }
            
            await self.send(text_data=json.dumps(response_data))
            
        except Exception:
            # Enviar respuesta de error simplificada
            try:
                error_response = {
                    'type': 'new_message',
                    'message': {
                        'id': str(event.get('message', {}).get('id', 'unknown')),
                        'error': 'Error al procesar mensaje'
                    }
                }
                await self.send(text_data=json.dumps(error_response))
            except Exception:
                pass  # Silenciar para mejor rendimiento
    async def message_read_broadcast(self, event):
        """Notificar que un mensaje fue leído - solo al emisor del mensaje"""
        sender_user_id = event.get('sender_user_id')
        reader_user_id = event.get('reader_user_id')
        
        # Solo enviar la notificación al emisor del mensaje
        if sender_user_id and self.scope["user"].id == sender_user_id:
            await self.send(text_data=json.dumps({
                'type': 'message_read',
                'message_id': event['message_id'],
                'reader_user_id': reader_user_id
            }))

    async def message_like_broadcast(self, event):
        """Notificar cambio de like en mensaje"""
        await self.send(text_data=json.dumps({
            'type': 'message_like',
            'message_id': event['message_id'],
            'user_id': event['user_id'],            'liked': event['liked'],
            'liked_by': event['liked_by'],
            'liked_by_users': event['liked_by_users']        }))
    
    async def message_edit_broadcast(self, event):
        """Notificar edición de mensaje"""
        try:
            # Asegurar que el mensaje está correctamente serializado
            message_data = event['message']
            
            # Si el mensaje contiene objetos datetime, convertirlos
            if isinstance(message_data, dict):
                # Copiar el diccionario para no modificar el original
                safe_message = {}
                  # Procesar cada campo del mensaje
                for key, value in message_data.items():
                    if hasattr(value, 'isoformat'):  # Es un objeto datetime
                        safe_message[key] = value.isoformat()
                    elif value is None:
                        safe_message[key] = None
                    else:
                        safe_message[key] = value
                
                message_data = safe_message
            
            # Crear el mensaje de respuesta
            response_data = {
                'type': 'message_edited',
                'message': message_data
            }
            
            await self.send(text_data=json.dumps(response_data))
            
        except Exception:
            # Enviar respuesta de error simplificada
            try:
                # Obtener ID de manera segura
                message_id = 'unknown'
                if 'message' in event:
                    message = event['message']
                    if isinstance(message, dict):
                        message_id = message.get('id', 'unknown')
                    elif hasattr(message, 'id'):
                        message_id = str(message.id)
                
                basic_response = {
                    'type': 'message_edited',
                    'message': {
                        'id': message_id,
                        'error': 'Error al serializar mensaje editado'
                    }
                }
                await self.send(text_data=json.dumps(basic_response))
            except Exception:
                pass  # Silenciar para mejor rendimiento
    
    async def message_delete_broadcast(self, event):
        """Notificar eliminación de mensaje"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id']
        }))
    
    async def typing_broadcast(self, event):
        """Notificar indicador de escritura"""
        # No enviar el evento al mismo usuario que está escribiendo
        if event['user_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],                'is_typing': event['is_typing']
            }))

    # Métodos de base de datos (sync_to_async)
    @database_sync_to_async
    def user_in_conversation(self):
        """Verificar si el usuario pertenece a la conversación"""
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return conversation.participants.filter(id=self.scope["user"].id).exists()
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_message(self, content, message_type):
        """Crear un nuevo mensaje en la base de datos"""
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            message = Message.objects.create(
                conversation=conversation,
                sender=self.scope["user"],
                content=content,
                message_type=message_type
            )
            
            # Actualizar timestamp de la conversación
            conversation.updated_at = message.created_at
            conversation.save()
            
            # Crear datos serializables manualmente para evitar problemas con datetime
            message_data = {
                'id': message.id,
                'conversation': message.conversation.id,
                'sender': message.sender.id,
                'sender_username': message.sender.username,
                'content': message.content,
                'message_type': message.message_type,
                'audio_file': message.audio_file.url if message.audio_file else None,
                'audio_url': message.audio_file.url if message.audio_file else None,
                'audio_duration': message.audio_duration,
                'created_at': message.created_at.isoformat(),
                'edited_at': message.edited_at.isoformat() if message.edited_at else None,
                'is_edited': message.is_edited,
                'is_read': message.is_read,
                'is_deleted': message.is_deleted,
                'liked': message.liked,
                'liked_by': [user.id for user in message.liked_by.all()],
                'liked_by_users': [{'id': user.id, 'username': user.username} for user in message.liked_by.all()]
            }
            return message_data
        except Exception as e:
            print(f"❌ Error creando mensaje: {str(e)}")
            return None
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Marcar un mensaje como leído"""
        try:
            message = Message.objects.get(id=message_id)
            if message.sender != self.scope["user"]:  # No marcar propios mensajes
                message.is_read = True
                message.save()
                return {
                    'success': True,
                    'sender_id': message.sender.id
                }
            return {'success': False}
        except Message.DoesNotExist:
            return {'success': False}
    
    @database_sync_to_async
    def toggle_message_like(self, message_id):
        """Dar o quitar like a un mensaje"""
        try:
            message = Message.objects.get(id=message_id)
            user = self.scope["user"]
            
            if message.sender == user:
                return None  # No se puede dar like a propios mensajes
            
            if user in message.liked_by.all():
                message.liked_by.remove(user)
                liked = False
            else:
                message.liked_by.add(user)
                liked = True
            
            # Actualizar el campo "liked"
            message.liked = message.liked_by.count() > 0
            message.save()
            
            # Devolver información actualizada
            liked_by_users = [{'id': u.id, 'username': u.username} for u in message.liked_by.all()]
            
            return {
                'liked': liked,
                'liked_by': [u.id for u in message.liked_by.all()],
                'liked_by_users': liked_by_users
            }
        except Message.DoesNotExist:
            return None
    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        """Editar un mensaje"""
        try:
            from django.utils import timezone
            from django.core import serializers as django_serializers
            import json as json_module
            
            message = Message.objects.get(id=message_id)
            
            if message.sender != self.scope["user"]:
                return None  # Solo el remitente puede editar
            
            message.content = new_content
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save()
            
            # Actualizar timestamp de la conversación
            message.conversation.updated_at = message.edited_at
            message.conversation.save()
            
            # Crear datos serializables manualmente para evitar problemas con datetime
            message_data = {
                'id': message.id,
                'conversation': message.conversation.id,
                'sender': message.sender.id,
                'sender_username': message.sender.username,
                'content': message.content,
                'message_type': message.message_type,
                'audio_file': message.audio_file.url if message.audio_file else None,
                'audio_url': message.audio_file.url if message.audio_file else None,
                'audio_duration': message.audio_duration,
                'created_at': message.created_at.isoformat(),
                'edited_at': message.edited_at.isoformat() if message.edited_at else None,
                'is_edited': message.is_edited,
                'is_read': message.is_read,
                'is_deleted': message.is_deleted,
                'liked': message.liked,
                'liked_by': [user.id for user in message.liked_by.all()],
                'liked_by_users': [{'id': user.id, 'username': user.username} for user in message.liked_by.all()]
            }
            
            return message_data
        except Message.DoesNotExist:
            return None
    
    @database_sync_to_async
    def delete_message(self, message_id):
        """Marcar un mensaje como eliminado"""
        try:
            from django.utils import timezone
            message = Message.objects.get(id=message_id)
            
            if message.sender != self.scope["user"]:
                return False  # Solo el remitente puede eliminar
            
            message.is_deleted = True
            message.save()
            
            # Actualizar timestamp de la conversación
            message.conversation.updated_at = timezone.now()
            message.conversation.save()
            
            return True
        except Message.DoesNotExist:
            return False

    def serialize_datetime_objects(self, data):
        """Método auxiliar para convertir objetos datetime a strings de forma recursiva"""
        if isinstance(data, dict):
            result = {}
            for key, value in data.items():
                result[key] = self.serialize_datetime_objects(value)
            return result
        elif isinstance(data, (list, tuple)):
            return [self.serialize_datetime_objects(item) for item in data]
        elif hasattr(data, 'isoformat'):  # Es un objeto datetime
            return data.isoformat()
        else:
            return data


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer para notificaciones generales del usuario"""
    
    async def connect(self):
        user = self.scope.get("user")
        if user == AnonymousUser() or user is None:
            await self.close()
            return
        
        self.user_group_name = f'user_{user.id}'
        
        # Unirse al grupo de notificaciones del usuario
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"✅ Usuario {user.username} conectado a notificaciones")
    
    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user and user != AnonymousUser():
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            print(f"🚪 Usuario {user.username} desconectado de notificaciones")
    
    async def receive(self, text_data):
        # Este consumer principalmente recibe notificaciones, no envía
        pass

    async def new_conversation_notification(self, event):
        """Notificar nueva conversación"""
        await self.send(text_data=json.dumps({
            'type': 'new_conversation',
            'conversation': event['conversation']
        }))
    
    async def conversation_update_notification(self, event):
        """Notificar actualización de conversación"""
        await self.send(text_data=json.dumps({
            'type': 'conversation_update',
            'conversation_id': event['conversation_id'],
            'unread_count': event['unread_count']
        }))

    async def product_rejected_notification(self, event):
        """Notificar producto rechazado"""
        await self.send(text_data=json.dumps({
            'type': 'product_rejected',
            'notification': event['notification']
        }))