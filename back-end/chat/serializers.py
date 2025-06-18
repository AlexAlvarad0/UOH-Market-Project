from rest_framework import serializers
from rest_framework import serializers
from .models import Conversation, Message
from accounts.serializers import UserSerializer
from products.serializers import ProductSerializer
from accounts.models import User

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    is_edited = serializers.ReadOnlyField()
    edited_at = serializers.ReadOnlyField()
    liked_by_users = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'content', 'message_type', 'audio_file', 
                 'audio_url', 'audio_duration', 'created_at', 'edited_at', 'is_edited', 'is_read', 'is_deleted', 
                 'liked', 'liked_by', 'liked_by_users']
        read_only_fields = ['sender', 'created_at', 'edited_at', 'is_edited', 'is_read', 'is_deleted', 
                           'liked', 'liked_by', 'liked_by_users', 'audio_url']
    def get_audio_url(self, obj):
        """Devuelve la URL completa del archivo de audio si existe"""
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            else:
                # Fallback: construir URL absoluta manualmente
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                return f"{base_url}{obj.audio_file.url}"
        return None
    
    def get_liked_by_users(self, obj):
        """Devuelve información detallada sobre los usuarios que han dado like al mensaje"""
        users = obj.liked_by.all()
        return [{'id': user.id, 'username': user.username} for user in users]
    
    def create(self, validated_data):
        user = self.context['request'].user
        message = Message.objects.create(sender=user, **validated_data)
        return message

class ParticipantSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'profile_picture']
    
    def get_profile_picture(self, obj):
        """Devuelve la URL de la foto de perfil si existe"""
        try:
            if hasattr(obj, 'profile') and obj.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.profile_picture.url)
                else:
                    return obj.profile.profile_picture.url
            return None
        except Exception:
            return None

class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    product = ProductSerializer(read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'product', 'created_at', 'updated_at', 'latest_message', 'unread_count']
    
    def get_latest_message(self, obj):
        latest = obj.messages.order_by('-created_at').first()
        if latest:
            return MessageSerializer(latest, context=self.context).data
        return None

    def get_unread_count(self, obj):
        # Verificar si el contexto existe y tiene la clave 'request'
        if not hasattr(self, 'context') or not self.context or 'request' not in self.context:
            return 0
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return 0
        user = request.user
        return obj.messages.filter(is_read=False).exclude(sender=user).count()