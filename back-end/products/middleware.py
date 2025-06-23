import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class ProductReviewMiddleware:
    """
    Middleware que revisa automáticamente los productos pendientes
    que han estado en revisión por al menos 1 minuto.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Código ejecutado para cada solicitud antes de la vista
        self.check_pending_products()
        
        # Continuamos con la solicitud normal
        response = self.get_response(request)
        
        return response
    def check_pending_products(self):
        try:
            # Importamos aquí para evitar importaciones circulares
            from products.models import Product
            from products.utils import moderate_content, validate_image_filenames
            import os
            
            # Obtener hora actual
            now = timezone.now()
            
            # Buscar productos pendientes cuyo tiempo de revisión ya ha pasado
            pending_products = Product.objects.filter(
                status='pending',
                review_scheduled_at__lte=now
            )
            
            if pending_products.exists():
                logger.info(f"Revisando {pending_products.count()} productos pendientes...")
                
                for product in pending_products:
                    try:
                        # Obtener rutas de imágenes
                        image_paths = []
                        for img in product.images.all():
                            if os.path.exists(img.image.path):
                                image_paths.append(img.image.path)
                        
                        if not image_paths:
                            # Si no hay imágenes, marcar como no disponible
                            product.status = 'unavailable'
                            product.save(update_fields=['status'])
                            logger.warning(f"Producto #{product.id} sin imágenes marcado como no disponible")
                            continue
                        
                        # Obtener nombres de archivos de imágenes
                        image_filenames = [os.path.basename(img.image.name) for img in product.images.all()]
                          # Primero validar nombres de archivos
                        filename_validation = validate_image_filenames(image_filenames)
                        
                        if not filename_validation['approved']:
                            # Producto rechazado por nombre de archivo inapropiado
                            product_id = product.id
                            product_title = product.title
                            product_seller = product.seller
                            reason = filename_validation['reason']
                            
                            # Guardar imágenes para eliminarlas
                            product_images = list(product.images.all())
                            image_paths = [img.image.path for img in product_images]
                            
                            # Eliminar producto (lo que también eliminará las imágenes por CASCADE)
                            product.delete()
                            
                            # Crear notificación al vendedor sobre el rechazo
                            from notifications.signals import create_product_rejected_notification
                            create_product_rejected_notification(product_seller, product_title, reason)
                            
                            # Intentar eliminar archivos físicos
                            for path in image_paths:
                                try:
                                    if os.path.exists(path):
                                        os.remove(path)
                                except Exception as e:
                                    logger.error(f"Error eliminando imagen {path}: {str(e)}")
                                    
                            logger.warning(f"Producto #{product_id} rechazado por nombre de archivo: {reason}")
                            continue
                        
                        # Si los nombres de archivos son apropiados, proceder con moderación de contenido
                        result = moderate_content(product.title, product.description, image_paths)
                        
                        if result['approved']:                            # Producto aprobado
                            product.status = 'available'
                            product.save(update_fields=['status'])
                            logger.info(f"Producto #{product.id} aprobado y disponible")
                        else:
                            # Producto rechazado - guardar información antes de eliminar
                            product_id = product.id
                            product_title = product.title
                            product_seller = product.seller
                            reason = result['reason']
                            
                            # Guardar imágenes para eliminarlas
                            product_images = list(product.images.all())
                            image_paths = [img.image.path for img in product_images]
                            
                            # Eliminar producto (lo que también eliminará las imágenes por CASCADE)
                            product.delete()
                            
                            # Crear notificación al vendedor sobre el rechazo
                            from notifications.signals import create_product_rejected_notification
                            create_product_rejected_notification(product_seller, product_title, reason)
                            
                            # Intentar eliminar archivos físicos
                            for path in image_paths:
                                try:
                                    if os.path.exists(path):
                                        os.remove(path)
                                except Exception as e:
                                    logger.error(f"Error eliminando imagen {path}: {str(e)}")
                                    
                            logger.warning(f"Producto #{product_id} rechazado y eliminado: {reason}")
                    
                    except Exception as e:
                        logger.error(f"Error al revisar producto #{product.id}: {str(e)}")
                        
        except Exception as e:
            # Capturar cualquier excepción para no interferir con la solicitud
            logger.error(f"Error en middleware de revisión: {str(e)}")