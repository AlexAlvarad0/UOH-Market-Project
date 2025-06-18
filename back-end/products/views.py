from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Category, Product, Favorite
from .serializers import CategorySerializer, ProductSerializer, ProductDetailSerializer, FavoriteSerializer
from .filters import ProductFilter
import logging

# Configurar el logger
logger = logging.getLogger(__name__)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing categories
    """
    queryset = Category.objects.all().order_by('name')  # Add default ordering
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    
    # Deshabilitar paginación para categorías
    pagination_class = None

    def list(self, request, *args, **kwargs):
        try:
            # Verificar si hay categorías
            categories = self.get_queryset()
            count = categories.count()
            logger.info(f"Categories count: {count}")
            
            if count == 0:
                logger.warning("No categories found in database!")
                
            # Continuar con el comportamiento normal
            response = super().list(request, *args, **kwargs)
            
            # Registrar la respuesta para depuración
            logger.info(f"Categories response data: {response.data}")
            
            return response
        except Exception as e:
            logger.exception(f"Error listing categories: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['title', 'description']
    ordering_fields = ['price', 'created_at', 'views_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def increment_view(self, request, pk=None):
        """
        Incrementa views_count solo para usuarios no propietarios
        """
        instance = self.get_object()
        is_owner = request.user.is_authenticated and instance.seller == request.user
        if not is_owner:
            instance.views_count = models.F('views_count') + 1
            instance.save(update_fields=['views_count'])
            # Refresh from DB to get integer value
            instance.refresh_from_db(fields=['views_count'])
        return Response({'views_count': instance.views_count})
    
    @action(detail=False, methods=['get'])
    def my_products(self, request):
        queryset = self.queryset.filter(seller=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def debug_products(self, request):
        """
        Endpoint temporal para debug - muestra todos los productos con sus precios
        """
        try:
            seven_days_ago = timezone.now() - timedelta(days=60)  # Ampliado a 60 días para debug
            products = Product.objects.all().order_by('-created_at')[:20]  # Solo los últimos 20
            
            debug_data = []
            for product in products:
                discount_calc = 'N/A'
                if product.original_price and float(product.original_price) > 0:
                    try:
                        discount_calc = f"{((float(product.original_price) - float(product.price)) / float(product.original_price)) * 100:.1f}%"
                    except:
                        discount_calc = 'Error calculating'
                
                debug_data.append({
                    'id': product.id,
                    'title': product.title,
                    'price': str(product.price),
                    'original_price': str(product.original_price) if product.original_price else 'None',
                    'status': product.status,
                    'created_at': product.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'updated_at': product.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'is_recent': product.created_at >= seven_days_ago,
                    'discount_calc': discount_calc,
                    'has_different_prices': product.original_price != product.price if product.original_price else False
                })
            
            return Response({
                'seven_days_ago': seven_days_ago.strftime('%Y-%m-%d %H:%M:%S'),
                'current_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                'products': debug_data
            })
            
        except Exception as e:
            logger.exception(f"Error in debug_products: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def weekly_offers(self, request):
        """
        Devuelve productos con ofertas semanales (descuentos de 35% o más)
        publicados en los últimos 7 días, limitado a 10 ofertas.
        """
        try:
            # Fecha de hace 7 días para ofertas semanales
            seven_days_ago = timezone.now() - timedelta(days=7)
            logger.info(f"Searching for products created after: {seven_days_ago}")
            
            # Filtrar todos los productos con descuento (original_price > price)
            queryset = Product.objects.filter(
                status='available',
                original_price__gt=models.F('price')
            )
            
            logger.info(f"Found {queryset.count()} products matching basic criteria")
            
            # Lista para almacenar productos con su porcentaje de descuento
            offers_with_discount = []
            
            for product in queryset:
                if product.original_price and product.price:
                    # Calcular porcentaje de descuento
                    original = Decimal(str(product.original_price))
                    current = Decimal(str(product.price))
                    
                    logger.info(f"Product {product.id} ({product.title}): original=${original}, current=${current}, created={product.created_at}")
                    
                    if original > current:  # Solo si hay descuento
                        discount_percentage = ((original - current) / original) * 100
                        logger.info(f"Product {product.id} discount: {discount_percentage}%")
                        
                        # Solo incluir si el descuento es >= 35%
                        if discount_percentage >= 35:
                            offers_with_discount.append({
                                'product': product,
                                'discount_percentage': round(discount_percentage, 1)
                            })
                            logger.info(f"Product {product.id} added to offers (discount: {discount_percentage}%)")
                        else:
                            logger.info(f"Product {product.id} discount too low: {discount_percentage}%")
                    else:
                        logger.info(f"Product {product.id} has no discount or price increased")
            
            # Ordenar por porcentaje de descuento (mayor descuento primero)
            offers_with_discount.sort(key=lambda x: x['discount_percentage'], reverse=True)
            
            # Limitar a máximo 10 ofertas
            offers_with_discount = offers_with_discount[:10]
            
            # Crear respuesta con productos y porcentajes de descuento
            offers_data = []
            for offer in offers_with_discount:
                product_data = ProductSerializer(offer['product']).data
                product_data['discount_percentage'] = offer['discount_percentage']
                offers_data.append(product_data)
            
            logger.info(f"Found {len(offers_data)} weekly offers")
            return Response(offers_data)
            
        except Exception as e:
            logger.exception(f"Error getting weekly offers: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            # Logs de depuración
            logger.info(f"Recibidos datos del producto: {request.data}")
            logger.info(f"Archivos recibidos: {request.FILES}")

            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Errores de validación: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)            # Guardar el producto con estado inicial "En revisión" y establecer precio original
            product = serializer.save(status='pending', original_price=serializer.validated_data['price'])

            # Procesar múltiples imágenes
            from .models import ProductImage
            image_keys = [key for key in request.FILES.keys() if key.startswith('images[')]

            if image_keys:
                primary_image_index = request.data.get('primary_image_index', '0')
                try:
                    primary_index = int(primary_image_index)
                except (ValueError, TypeError):
                    primary_index = 0

                for key in image_keys:
                    image_file = request.FILES[key]
                    try:
                        index = int(key.split('[')[1].split(']')[0])
                        is_primary = (index == primary_index)

                        image = ProductImage.objects.create(
                            product=product,
                            image=image_file,
                            is_primary=is_primary
                        )
                        image.save()

                        logger.info(f"Imagen {index} guardada: {image.image.url} (primaria: {is_primary})")
                    except Exception as img_err:
                        logger.error(f"Error al guardar imagen {key}: {str(img_err)}")
            else:
                logger.warning(f"No se proporcionaron imágenes para el producto {product.id}")

            # Verificar si el producto pasó la moderación (atributo agregado por el signal)
            if hasattr(product, '_moderation_passed') and not product._moderation_passed:
                # El producto no pasó la moderación y ya ha sido eliminado
                rejection_reason = getattr(product, '_rejection_reason', 'El contenido es inapropiado para nuestro Marketplace')
                return Response(
                    {"error": "No podemos publicar tu producto. " + rejection_reason},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Si llegamos aquí, el producto fue aprobado o el signal no se procesó
            from .serializers import ProductDetailSerializer
            updated_serializer = ProductDetailSerializer(product)
            headers = self.get_success_headers(serializer.data)
            return Response(updated_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.exception(f"Error al crear producto: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Filtrar productos según el estado y el rol del usuario
            if request.user.is_authenticated:
                if request.user.is_staff:
                    # Los administradores pueden ver todos los productos
                    pass
                else:
                    # Usuarios normales autenticados:
                    # 1. Ver sus propios productos independientemente del estado
                    # 2. Ver productos marcados como disponible o no disponible (pero no en revisión) de otros usuarios
                    queryset = queryset.filter(
                        models.Q(seller=request.user) |  # Sus propios productos
                        (
                            ~models.Q(seller=request.user) &  # Productos de otros usuarios
                            ~models.Q(status='pending')        # Que no estén en revisión
                        )
                    )
            else:
                # Usuarios no autenticados solo ven productos disponibles o no disponibles (manualmente)
                queryset = queryset.exclude(status='pending')
                
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.exception(f"Error listing products: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            # Verificar si el usuario actual es el propietario
            if instance.seller != request.user:
                return Response(
                    {"detail": "No tienes permiso para eliminar este producto."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Primero eliminar las imágenes asociadas de manera segura
            try:
                from .models import ProductImage
                ProductImage.objects.filter(product=instance).delete()
                logger.info(f"Imágenes para producto {instance.id} eliminadas")
            except Exception as img_err:
                logger.warning(f"Error al eliminar imágenes: {str(img_err)}")
            
            # Eliminar los favoritos asociados de manera segura
            try:
                Favorite.objects.filter(product=instance).delete()
                logger.info(f"Favoritos para producto {instance.id} eliminados")
            except Exception as fav_err:
                logger.warning(f"Error al eliminar favoritos: {str(fav_err)}")
            
            # Usar eliminación directa para evitar problemas con el colector de relaciones
            # Esto evita que Django busque relaciones con tablas inexistentes
            product_id = instance.id
            from django.db import connection
            cursor = connection.cursor()
            
            # Eliminar primero cualquier registro en otras tablas relacionadas
            # que podrían estar causando problemas con la eliminación en cascada
            
            # Finalmente, eliminar el producto directamente con SQL
            cursor.execute("DELETE FROM products_product WHERE id = %s", [product_id])
            connection.commit()
            
            logger.info(f"Producto {product_id} eliminado correctamente")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.exception(f"Error deleting product: {str(e)}")
            return Response(
                {"detail": f"Error al eliminar el producto: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        try:
            # Obtener la instancia existente
            instance = self.get_object()
            
            # Verificar si el usuario es el propietario
            if instance.seller != request.user:
                return Response(
                    {"detail": "No tienes permiso para editar este producto."},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Debugging
            logger.debug(f"Update request data: {request.data}")
            logger.debug(f"Update request FILES: {request.FILES}")
              # Actualizar el producto con serializer parcial
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                logger.error(f"Update validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el precio ha cambiado para manejar el precio original
            new_price = serializer.validated_data.get('price')
            if new_price is not None and new_price != instance.price:
                # Si el precio ha cambiado y no hay precio original guardado, guardar el precio actual como original
                if instance.original_price is None:
                    serializer.validated_data['original_price'] = instance.price
                    logger.info(f"Setting original price for product {instance.id}: {instance.price} -> {new_price}")
            
            # Guardar los cambios del producto
            self.perform_update(serializer)
              # Manejar las imágenes
            from .models import ProductImage
            
            # Procesar las imágenes a eliminar (si se especifican)
            images_to_remove = request.data.getlist('remove_images[]')
            if images_to_remove:
                try:
                    # Eliminar las imágenes especificadas
                    removed_count = ProductImage.objects.filter(
                        product=instance, 
                        id__in=images_to_remove
                    ).delete()[0]
                    logger.info(f"Removed {removed_count} images for product {instance.id}")
                except Exception as e:
                    logger.error(f"Error removing images: {str(e)}")            # Agregar nuevas imágenes si existen
            new_images = []
            logger.info(f"All FILES keys in request: {list(request.FILES.keys())}")
            for key in request.FILES:
                logger.info(f"Processing key: '{key}'")
                if key.startswith('new_images['):
                    logger.info(f"Found new image with key: '{key}'")
                    new_images.append(request.FILES[key])
                else:
                    logger.info(f"Key '{key}' does not start with 'new_images['")
            
            # También mantener compatibilidad con el campo 'image' individual
            single_image = request.FILES.get('image')
            if single_image:
                logger.info(f"Found single image: {single_image.name}")
                new_images.append(single_image)
            
            logger.info(f"Total new images found: {len(new_images)}")
            
            if new_images:
                try:
                    from .models import validate_image
                    
                    # Obtener el número de imágenes existentes después de eliminar las marcadas
                    existing_images_count = ProductImage.objects.filter(product=instance).count()
                    
                    # Verificar que no exceda el límite de 10 imágenes
                    if existing_images_count + len(new_images) > 10:
                        logger.warning(f"Product {instance.id} would have {existing_images_count + len(new_images)} images, exceeding limit")
                        return Response(
                            {"detail": f"No puedes tener más de 10 imágenes por producto. Actualmente tienes {existing_images_count} imágenes."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Determinar si la primera imagen nueva debe ser primaria
                    has_primary = ProductImage.objects.filter(product=instance, is_primary=True).exists()
                    
                    # Procesar cada imagen nueva
                    for i, image_file in enumerate(new_images):
                        # Validar la imagen
                        validate_image(image_file)
                        
                        # La primera imagen nueva será primaria si no hay imagen primaria existente
                        is_primary = not has_primary and i == 0
                          # Crear nueva imagen
                        image = ProductImage.objects.create(
                            product=instance,
                            image=image_file,
                            is_primary=is_primary
                        )
                        image.save()
                        
                        logger.info(f"New image saved for product {instance.id}: {image_file.name}")
                        logger.info(f"Image ID: {image.id}, URL: {image.image.url}, is_primary: {is_primary}")
                        
                        # Verificar que la imagen realmente se guardó
                        total_images = ProductImage.objects.filter(product=instance).count()
                        logger.info(f"Total images for product {instance.id} after save: {total_images}")
                        
                        # Después de crear la primera imagen primaria, las siguientes no lo serán
                        if is_primary:
                            has_primary = True
                            
                except Exception as img_err:
                    logger.error(f"Error saving images during update: {str(img_err)}")
                    return Response(
                        {"detail": f"Error al guardar las imágenes: {str(img_err)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Obtener los datos actualizados
            instance.refresh_from_db()
            updated_serializer = self.get_serializer(instance)
            return Response(updated_serializer.data)
            
        except Exception as e:
            logger.exception(f"Error updating product: {str(e)}")
            return Response(
                {"detail": f"Error al actualizar el producto: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """
        Permite al propietario de un producto marcar/desmarcar manualmente como "No disponible"
        cuando ya no tiene stock o vuelve a tenerlo.
        """
        try:
            product = self.get_object()
            
            # Verificar si el usuario es el propietario
            if product.seller != request.user:
                return Response(
                    {"detail": "No tienes permiso para cambiar la disponibilidad de este producto."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Si el producto está en revisión, no permitir cambiar la disponibilidad
            if product.status == 'pending':
                return Response(
                    {"detail": "No puedes cambiar la disponibilidad de un producto que está en revisión."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Cambiar la disponibilidad del producto
            if product.status == 'available':
                # Si está disponible, marcarlo como no disponible
                product.status = 'unavailable'
                product.manually_unavailable = True
                message = "Producto marcado como No disponible."
            else:
                # Si está no disponible, marcarlo como disponible
                product.status = 'available'
                product.manually_unavailable = False
                message = "Producto marcado como Disponible."
                
            product.save(update_fields=['status', 'manually_unavailable'])
            
            # Devolver el producto actualizado
            serializer = self.get_serializer(product)
            return Response({
                "message": message,
                "product": serializer.data
            })
            
        except Exception as e:
            logger.exception(f"Error cambiando disponibilidad del producto: {str(e)}")
            return Response(
                {"detail": f"Error al cambiar la disponibilidad: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['delete'])
    def remove(self, request, pk=None):
        try:
            instance = Favorite.objects.get(user=request.user, product_id=pk)
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Favorite.DoesNotExist:
            return Response({'detail': 'No se encontró el producto en favoritos.'}, 
                        status=status.HTTP_404_NOT_FOUND)