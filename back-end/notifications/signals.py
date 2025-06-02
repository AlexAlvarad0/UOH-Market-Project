from django.db.models.signals import post_save
from django.dispatch import receiver
from chat.models import Message
from products.models import Product, Favorite
from accounts.models import Rating
from .models import Notification
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Message)
def create_message_notification(sender, instance, created, **kwargs):
    """
    Crea una notificación cuando un usuario recibe un nuevo mensaje.
    """
    if not created:
        return  # Solo notificamos mensajes nuevos
        
    try:
        # El destinatario es el otro participante de la conversación (no el remitente)
        receiver = None
        for participant in instance.conversation.participants.all():
            if participant != instance.sender:
                receiver = participant
                break
                
        if not receiver:
            logger.warning(f"No se encontró destinatario para el mensaje ID {instance.id}")
            return
        
        # Crear notificación para el mensaje
        product = instance.conversation.product
        sender_name = instance.sender.username
        
        Notification.objects.create(
            user=receiver,
            type='message',
            title=f'Nuevo mensaje de {sender_name}',
            message=f'{sender_name} te ha enviado un mensaje sobre el producto "{product.title}"',
            from_user=instance.sender,
            related_product=product,
            related_conversation=instance.conversation
        )
        
        logger.info(f"Notificación de mensaje creada para el usuario {receiver.username}")
    
    except Exception as e:
        logger.error(f"Error al crear notificación de mensaje: {str(e)}")

@receiver(post_save, sender=Favorite)
def create_favorite_notification(sender, instance, created, **kwargs):
    """
    Crea una notificación cuando un usuario añade un producto a favoritos.
    """
    # Solo queremos crear la notificación cuando se añade un nuevo favorito
    if not created:
        return
        
    try:
        product = instance.product  # Producto que se agregó a favoritos
        user = instance.user      # Usuario que añadió el favorito
        seller = product.seller   # Propietario del producto
        
        # Solo notificamos al vendedor si el usuario que agrega a favoritos no es el mismo
        if user != seller:
            Notification.objects.create(
                user=seller,
                type='favorite',
                title='Producto añadido a favoritos',
                message=f'{user.username} ha añadido tu producto "{product.title}" a favoritos',
                from_user=user,
                related_product=product
            )
            
            logger.info(f"Notificación de favorito creada para {seller.username}")
    
    except Exception as e:
        logger.error(f"Error al crear notificación de favorito: {str(e)}")

@receiver(post_save, sender=Product)
def check_product_views(sender, instance, **kwargs):
    """
    Verifica el contador de vistas del producto y crea notificaciones cuando 
    alcanza ciertos hitos (50, 100, 500, 1000, etc.)
    """
    # Definimos los hitos de vistas para notificar
    view_milestones = [50, 100, 500, 1000, 5000, 10000]
    
    try:
        # Verificar si el número de vistas actual ha alcanzado algún hito
        views_count = instance.views_count
        
        # Solo verificamos productos con propietario definido
        if not instance.seller:
            return
            
        # Crear notificación si el número de vistas coincide exactamente con un hito
        for milestone in view_milestones:
            if views_count == milestone:
                Notification.objects.create(
                    user=instance.seller,
                    type='views',
                    title=f'¡Tu producto ha alcanzado {milestone} vistas!',
                    message=f'Tu producto "{instance.title}" ha sido visto {milestone} veces. ¡Felicidades!',
                    related_product=instance
                )
                
                logger.info(f"Notificación de hito de vistas creada para {instance.seller.username}")
                break
    
    except Exception as e:
        logger.error(f"Error al verificar vistas del producto: {str(e)}")

@receiver(post_save, sender=Rating)
def create_rating_notification(sender, instance, created, **kwargs):
    """
    Crea una notificación cuando un usuario recibe una nueva calificación.
    """
    if not created:
        return  # Solo notificamos calificaciones nuevas
        
    try:
        rated_user = instance.rated_user  # Usuario que recibió la calificación
        rater = instance.rater           # Usuario que calificó
        
        # Solo crear notificación si el calificador no es el mismo usuario calificado
        if rated_user != rater:
            # Crear la notificación
            Notification.objects.create(
                user=rated_user,
                type='rating',
                title='Nueva calificación',
                message=f'{rater.username} te calificó con {instance.rating} estrellas',
                from_user=rater,
                related_rating=instance
            )
            
            logger.info(f"Notificación de calificación creada para {rated_user.username}")
    
    except Exception as e:
        logger.error(f"Error al crear notificación de calificación: {str(e)}")