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
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message', 'is_read', 
            'created_at', 'from_user', 'related_product', 
            'related_conversation', 'time_ago'
        ]
    
    def get_time_ago(self, obj):
        """Retorna una representación amigable del tiempo transcurrido"""
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff.days == 0 and diff.seconds < 60:
            return 'hace unos segundos'
        if diff.days == 0 and diff.seconds < 3600:
            minutes = diff.seconds // 60
            return f'hace {minutes} {"minuto" if minutes == 1 else "minutos"}'
        
        return f'hace {timesince(obj.created_at)}'