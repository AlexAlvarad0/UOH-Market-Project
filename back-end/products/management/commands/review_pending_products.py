from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Product, ProductImage
from products.utils import moderate_content
import logging
import os

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Revisa productos en estado pendiente que han esperado al menos 30 segundos'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Obtener productos pendientes cuyo tiempo de revisión programado ya ha pasado
        pending_products = Product.objects.filter(
            status='pending',
            review_scheduled_at__lte=now
        )
        
        self.stdout.write(f"Encontrados {pending_products.count()} productos pendientes para revisar")
        
        for product in pending_products:
            try:
                self.stdout.write(f"Revisando producto #{product.id}: {product.title}")
                
                # Obtener rutas de imágenes
                image_paths = []
                for img in product.images.all():
                    if os.path.exists(img.image.path):
                        image_paths.append(img.image.path)
                    else:
                        logger.warning(f"Imagen no encontrada: {img.image.path}")
                
                if not image_paths:
                    logger.warning(f"No se encontraron imágenes válidas para el producto #{product.id}")
                    # Si no hay imágenes, marcar como no disponible
                    product.status = 'unavailable'
                    product.save(update_fields=['status'])
                    continue                # Aplicar moderación inteligente con análisis de imágenes IA
                from products.intelligent_moderator import moderate_product_with_ai
                is_approved, rejection_reason = moderate_product_with_ai(product)
                  if is_approved:
                    logger.info(f"Producto #{product.id} aprobado")
                    product.status = 'available'
                    product.save(update_fields=['status'])
                    self.stdout.write(self.style.SUCCESS(f"Producto #{product.id} aprobado y marcado como disponible"))
                else:
                    logger.warning(f"Producto #{product.id} rechazado: {rejection_reason}")
                    
                    # Guardar información del producto antes de eliminarlo para la notificación
                    product_title = product.title
                    product_seller = product.seller
                    product_category_name = product.category.name if product.category else 'Varios'
                    
                    # Guardar producto y sus imágenes para eliminarlos
                    product_images = list(product.images.all())
                    image_paths = [img.image.path for img in product_images]
                    
                    # Eliminar el producto (lo que también eliminará las imágenes por CASCADE)
                    product.delete()
                    
                    # Crear notificación al vendedor sobre el rechazo
                    from notifications.signals import create_product_rejected_notification
                    create_product_rejected_notification(product_seller, product_title, rejection_reason, product_category_name)
                    
                    # Intentar eliminar los archivos físicos de imágenes
                    for path in image_paths:
                        try:
                            if os.path.exists(path):
                                os.remove(path)
                                logger.info(f"Imagen eliminada: {path}")
                        except Exception as e:
                            logger.error(f"Error al eliminar imagen {path}: {str(e)}")
                    
                    self.stdout.write(self.style.WARNING(f"Producto #{product.id} rechazado y eliminado: {rejection_reason}. Notificación enviada al vendedor."))
                    
            except Exception as e:
                logger.error(f"Error al revisar producto #{product.id}: {str(e)}")
                self.stdout.write(self.style.ERROR(f"Error al revisar producto #{product.id}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("Revisión de productos completada"))