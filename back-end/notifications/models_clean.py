from django.db import models
from django.conf import settings
from products.models import Product

class Notification(models.Model):
    TYPE_CHOICES = (
        ('message', 'Nuevo mensaje'),
        ('views', 'Vistas de producto'),
        ('favorite', 'Añadido a favoritos'),
        ('like_message', 'Like en mensaje'),
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        help_text='Usuario que recibe la notificación'
    )
    
    type = models.CharField(
        max_length=20, 
        choices=TYPE_CHOICES,
        help_text='Tipo de notificación'
    )
    
    title = models.CharField(
        max_length=255,
        help_text='Título de la notificación'
    )
    
    message = models.TextField(
        help_text='Cuerpo del mensaje de la notificación'
    )
    
    # Campos adicionales para referencias
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='sent_notifications',
        help_text='Usuario que origina la notificación (opcional)'
    )
    
    related_product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='Producto relacionado con la notificación'
    )
    
    related_conversation = models.ForeignKey(
        'chat.Conversation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='Conversación relacionada (para notificaciones de mensajes)'
    )
    
    related_message = models.ForeignKey(
        'chat.Message',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='Mensaje relacionado (para notificaciones de likes)'
    )
    
    is_read = models.BooleanField(
        default=False,
        help_text='Indica si la notificación ha sido leída'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_type_display()} para {self.user.username}"e_display()} para {self.user.username}"
