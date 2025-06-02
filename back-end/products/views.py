from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
from django.db import models
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
        instance.views_count += 1
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_products(self, request):
        queryset = self.queryset.filter(seller=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            # Logs de depuración
            logger.info(f"Recibidos datos del producto: {request.data}")
            logger.info(f"Archivos recibidos: {request.FILES}")

            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Errores de validación: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Guardar el producto con estado inicial "En revisión"
            product = serializer.save(status='pending')

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
            
            # Guardar los cambios del producto
            self.perform_update(serializer)
            
            # Manejar la imagen si existe
            image_file = request.FILES.get('image')
            if image_file:
                from .models import ProductImage
                try:
                    # Validar la imagen
                    from .models import validate_image
                    validate_image(image_file)
                    
                    # Eliminar imágenes anteriores (opcional)
                    old_images = ProductImage.objects.filter(product=instance)
                    if old_images.exists():
                        logger.info(f"Removing {old_images.count()} old images for product {instance.id}")
                        old_images.delete()
                    
                    # Crear nueva imagen
                    image = ProductImage.objects.create(
                        product=instance,
                        image=image_file,
                        is_primary=True
                    )
                    image.save()
                    
                    logger.info(f"New image saved for product {instance.id}: {image_file.name}")
                    logger.info(f"Image URL: {image.image.url}")
                except Exception as img_err:
                    logger.error(f"Error saving image during update: {str(img_err)}")
            
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