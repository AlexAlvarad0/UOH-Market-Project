from rest_framework import serializers
from .models import Notification
from accounts.serializers import UserSerializerBasic
from products.serializers import ProductBasicSerializer
from rest_framework.fields import SerializerMethodField

class NotificationSerializer(serializers.ModelSerializer):
    from_user = UserSerializerBasic(read_only=True)
    related_product = ProductBasicSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    time_ago = SerializerMethodField()
    message_info = SerializerMethodField()
    rating_info = SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message', 'is_read', 
            'created_at', 'from_user', 'related_product', 
            'related_conversation', 'related_message', 'related_rating',
            'time_ago', 'message_info', 'rating_info', 'extra_data'
        ]
    
    def get_time_ago(self, obj):
        """Retorna una representación amigable del tiempo transcurrido"""
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days == 0 and diff.seconds < 60:
            return 'hace unos segundos'
        elif diff.days == 0 and diff.seconds < 3600:
            minutes = diff.seconds // 60
            return f'hace {minutes} {"minuto" if minutes == 1 else "minutos"}'
        else:
            return f'hace {timesince(obj.created_at)}'
        
    def get_message_info(self, obj):
        """Retorna información adicional sobre el mensaje relacionado si existe"""
        if obj.related_message:
            # Verificar si el contenido existe y no es None
            content = obj.related_message.content or ''
            content_preview = content[:50] + ('...' if len(content) > 50 else '') if content else '[Mensaje de audio]'
            
            return {
                'id': obj.related_message.id,
                'content': content_preview,
                'conversation_id': obj.related_message.conversation.id if obj.related_message.conversation else None
            }
        return None
    
    def get_rating_info(self, obj):
        """Retorna información adicional sobre la calificación relacionada si existe"""
        if obj.related_rating:
            return {
                'id': obj.related_rating.id,
                'rating': obj.related_rating.rating,
                'comment': obj.related_rating.comment,
                'rated_user_id': obj.related_rating.rated_user.id
            }
        return None