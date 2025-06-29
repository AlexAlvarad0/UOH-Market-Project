from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
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
from .pagination import CustomPageNumberPagination

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
            
            if count == 0:
                return Response(
                    {'error': 'No categories found'},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Continuar con el comportamiento normal
            response = super().list(request, *args, **kwargs)
            
            return response
        except Exception as e:
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
    pagination_class = CustomPageNumberPagination
    
    def get_serializer_context(self):
        """
        Asegurar que el request se pase al contexto del serializer
        para generar URLs absolutas de las imágenes
        """
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'weekly_offers', 'debug_products']:
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
                    'has_different_prices': product.original_price != product.price if product.original_price else False                })
            
            return Response({
                'seven_days_ago': seven_days_ago.strftime('%Y-%m-%d %H:%M:%S'),
                'current_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                'products': debug_data            })
            
        except Exception as e:
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
            
            # Filtrar todos los productos con descuento (original_price > price)
            queryset = Product.objects.filter(
                status='available',
                original_price__gt=models.F('price')
            ).select_related('seller', 'category')  # Optimizar consultas
            
            # Lista para almacenar productos con su porcentaje de descuento
            offers_with_discount = []
            
            for product in queryset:
                if product.original_price and product.price:
                    # Calcular porcentaje de descuento
                    original = Decimal(str(product.original_price))
                    current = Decimal(str(product.price))
                    
                    if original > current:  # Solo si hay descuento
                        discount_percentage = ((original - current) / original) * 100
                        
                        # Solo incluir si el descuento es >= 35%
                        if discount_percentage >= 35:
                            offers_with_discount.append({
                                'product': product,
                                'discount_percentage': round(discount_percentage, 1)
                            })
            
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
            
            return Response(offers_data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def create(self, request, *args, **kwargs):
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info('--- INICIO CREACIÓN DE PRODUCTO ---')
            logger.info(f'Usuario: {request.user} | Email: {getattr(request.user, "email", None)}')
            logger.info(f'Archivos recibidos: {list(request.FILES.keys())}')
            logger.info(f'Datos recibidos: {dict(request.data)}')
            # Verificación automática para usuarios UOH (failsafe)
            is_uoh_email = request.user.email.endswith('@pregrado.uoh.cl') or request.user.email.endswith('@uoh.cl')
            
            if is_uoh_email and not request.user.is_verified_seller:
                # Auto-corregir el estado del usuario UOH
                request.user.is_verified_seller = True
                request.user.save()
            
            # Verificar si el usuario puede vender productos
            if not request.user.is_verified_seller:
                logger.warning('Usuario no autorizado para vender productos.')
                return Response(
                    {"error": "Solo usuarios con correos institucionales (@uoh.cl o @pregrado.uoh.cl) pueden vender productos."},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f'Errores de validación: {serializer.errors}')
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Guardar el producto con estado inicial "En revisión" y establecer precio original
            product = serializer.save(status='pending', original_price=serializer.validated_data['price'])

            # Procesar múltiples imágenes
            from .models import ProductImage
            image_keys = [key for key in request.FILES.keys() if key.startswith('images[')]
            logger.info(f'Procesando imágenes: {image_keys}')

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
                        logger.info(f'Subiendo imagen {key}: {image_file.name} (primary={is_primary})')

                        image = ProductImage.objects.create(
                            product=product,
                            image=image_file,
                            is_primary=is_primary
                        )
                        image.save()
                        logger.info(f'Imagen subida correctamente: {image.image.url}')
                    except Exception as e:
                        logger.error(f'Error al subir imagen {key}: {e}')

            # Verificar si el producto pasó la moderación (atributo agregado por el signal)
            if hasattr(product, '_moderation_passed') and not product._moderation_passed:
                # El producto no pasó la moderación y ya ha sido eliminado
                rejection_reason = getattr(product, '_rejection_reason', 'El contenido es inapropiado para nuestro Marketplace')
                logger.warning(f'Producto rechazado por moderación: {rejection_reason}')
                return Response(
                    {"error": "No podemos publicar tu producto. " + rejection_reason},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Si llegamos aquí, el producto fue aprobado o el signal no se procesó
            from .serializers import ProductDetailSerializer
            updated_serializer = ProductDetailSerializer(product)
            headers = self.get_success_headers(serializer.data)
            logger.info('--- PRODUCTO CREADO EXITOSAMENTE ---')
            return Response(updated_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error inesperado en create: {e}', exc_info=True)
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
            except Exception:
                pass
              # Eliminar los favoritos asociados de manera segura
            try:
                Favorite.objects.filter(product=instance).delete()
            except Exception:
                pass  # Ignorar errores al eliminar favoritos
            
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
            
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
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
              # Actualizar el producto con serializer parcial
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el precio ha cambiado para manejar el precio original
            new_price = serializer.validated_data.get('price')
            if new_price is not None and new_price != instance.price:
                # Si el precio ha cambiado y no hay precio original guardado, guardar el precio actual como original
                if instance.original_price is None:
                    serializer.validated_data['original_price'] = instance.price
            
            # Guardar los cambios del producto
            self.perform_update(serializer)
              # Manejar las imágenes
            from .models import ProductImage
            
            # Procesar las imágenes a eliminar (si se especifican)
            images_to_remove = request.data.getlist('remove_images[]')
            if images_to_remove:
                try:
                    # Eliminar las imágenes especificadas
                    removed_count =                    ProductImage.objects.filter(
                        product=instance, 
                        id__in=images_to_remove
                    ).delete()[0]
                except Exception as e:
                    pass  # Ignorar errores al eliminar imágenes
                    
            new_images = []
            for key in request.FILES:
                if key.startswith('new_images['):
                    new_images.append(request.FILES[key])
            
            # También mantener compatibilidad con el campo 'image' individual
            single_image = request.FILES.get('image')
            if single_image:
                new_images.append(single_image)
            
            
            if new_images:
                try:
                    from .models import validate_image
                    
                    # Obtener el número de imágenes existentes después de eliminar las marcadas
                    existing_images_count = ProductImage.objects.filter(product=instance).count()
                    
                    # Verificar que no exceda el límite de 10 imágenes
                    if existing_images_count + len(new_images) > 10:
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
                        
                        
                        # Verificar que la imagen realmente se guardó
                        total_images = ProductImage.objects.filter(product=instance).count()
                          # Después de crear la primera imagen primaria, las siguientes no lo serán
                        if is_primary:
                            has_primary = True
                    
                    # ¡NUEVA FUNCIONALIDAD! Moderar imágenes nuevas con IA
                    
                    # Analizar cada imagen nueva con el sistema de IA
                    inappropriate_images = []
                    for i, image_file in enumerate(new_images):
                        try:
                            # Obtener la imagen recién creada para moderar
                            image_instance = ProductImage.objects.filter(product=instance).order_by('-id')[i]
                            image_path = image_instance.image.path
                            
                            # Usar el sistema de IA mejorado para moderar
                            from .utils import analyze_image_content
                            moderation_result = analyze_image_content(image_path)
                            
                            
                            if not moderation_result.get('is_appropriate', True):
                                inappropriate_images.append({
                                    'image_name': image_file.name,
                                    'reason': moderation_result.get('reason', 'Contenido detectado como inapropiado'),
                                    'confidence': moderation_result.get('confidence', 0)
                                })
                        
                        except Exception as mod_err:
                            # En caso de error, por seguridad, marcar como sospechosa
                            inappropriate_images.append({
                                'image_name': image_file.name,
                                'reason': f'Error en análisis de seguridad: {str(mod_err)}',
                                'confidence': 1.0
                            })
                    
                    # Si se detectaron imágenes inapropiadas, cambiar estado a pendiente y notificar
                    if inappropriate_images:
                        # Cambiar estado del producto a pendiente para revisión
                        instance.status = 'pending'
                        instance.save()
                        
                        # Programar revisión en 30 segundos
                        from django.utils import timezone
                        import datetime
                        review_time = timezone.now() + datetime.timedelta(seconds=30)
                        Product.objects.filter(pk=instance.pk).update(review_scheduled_at=review_time)
                        
                        
                        # Crear mensaje detallado para el usuario
                        image_names = [img['image_name'] for img in inappropriate_images]
                        error_details = []
                        for img in inappropriate_images:
                            error_details.append(f"• {img['image_name']}: {img['reason']}")
                        
                        error_message = (
                            f"⚠️ No podemos actualizar tu producto en este momento.\n\n"
                            f"Nuestro sistema de seguridad ha detectado contenido que podría ser inapropiado "
                            f"en las siguientes imágenes:\n\n"
                            + "\n".join(error_details) +
                            f"\n\n📋 Tu producto ha sido puesto en revisión y será analizado en los próximos 30 segundos. "
                            f"Si el contenido es apropiado, se publicará automáticamente. "
                            f"Si no, puedes editarlo y volver a intentarlo."
                        )
                        
                        return Response(
                            {"detail": error_message},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    else:
                        # Si no hay imágenes inapropiadas, continuar con la actualización
                        instance.status = 'available'
                        instance.save()
                except Exception as img_err:
                    return Response(
                        {"detail": f"Error al guardar las imágenes: {str(img_err)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Obtener los datos actualizados
            instance.refresh_from_db()
            updated_serializer = self.get_serializer(instance)
            return Response(updated_serializer.data)
            
        except Exception as e:
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
            return Response(
                {"detail": f"Error al cambiar la disponibilidad: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

# Funciones independientes para debug (fuera de los ViewSets)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def debug_user_verification(request):
    """
    Endpoint temporal para verificar y corregir el estado de verificación del usuario
    """
    try:
        user = request.user
        original_status = user.is_verified_seller
        
        # Verificar si el email es UOH y actualizar si es necesario
        is_uoh_email = user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl')
        
        if is_uoh_email and not user.is_verified_seller:
            # Actualizar el estado
            user.is_verified_seller = True
            user.save()
        
        return Response({
            'user_email': user.email,
            'is_uoh_email': is_uoh_email,
            'original_is_verified_seller': original_status,
            'current_is_verified_seller': user.is_verified_seller,
            'was_updated': original_status != user.is_verified_seller,
            'can_create_products': user.is_verified_seller
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def debug_check_user(request):
    """
    Endpoint público para verificar el estado de un usuario por email
    """
    try:
        email = request.query_params.get('email')
        if not email:
            return Response({
                'error': 'Se requiere el parámetro email'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from accounts.models import User
        try:
            user = User.objects.get(email=email)
            
            # Verificar si el email es UOH y actualizar si es necesario
            is_uoh_email = user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl')
            original_status = user.is_verified_seller
            
            if is_uoh_email and not user.is_verified_seller:
                # Auto-corregir el estado del usuario UOH
                user.is_verified_seller = True
                user.save()
            
            return Response({
                'user_email': user.email,
                'user_id': user.id,
                'is_uoh_email': is_uoh_email,
                'original_is_verified_seller': original_status,
                'current_is_verified_seller': user.is_verified_seller,
                'was_updated': original_status != user.is_verified_seller,
                'can_create_products': user.is_verified_seller,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None
            })
            
        except User.DoesNotExist:
            return Response({
                'error': f'Usuario con email {email} no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def debug_create_test(request):
        """
        Endpoint temporal para probar la creación de productos sin autenticación estricta
        """
        try:
            email = request.data.get('test_user_email')
            if not email:
                return Response({
                    'error': 'Se requiere test_user_email en el body'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from accounts.models import User
            try:
                user = User.objects.get(email=email)
                
                # Simular el request.user
                request.user = user
                
                # Log detallado del usuario para debug
                
                # Verificación automática para usuarios UOH (failsafe)
                is_uoh_email = user.email.endswith('@pregrado.uoh.cl') or user.email.endswith('@uoh.cl')
                
                if is_uoh_email and not user.is_verified_seller:
                    # Auto-corregir el estado del usuario UOH
                    user.is_verified_seller = True
                    user.save()
                
                # Verificar si el usuario puede vender productos
                if not user.is_verified_seller:
                    return Response({
                        "error": "Solo usuarios con correos institucionales (@uoh.cl o @pregrado.uoh.cl) pueden vender productos.",
                        "debug_info": {
                            "user_email": user.email,
                            "is_verified_seller": user.is_verified_seller,
                            "is_uoh_email": is_uoh_email
                        }
                    }, status=status.HTTP_403_FORBIDDEN)
                
                return Response({
                    "success": "Usuario puede crear productos",
                    "debug_info": {
                        "user_email": user.email,
                        "is_verified_seller": user.is_verified_seller,
                        "is_uoh_email": is_uoh_email,
                        "can_create_products": True
                    }
                })
                
            except User.DoesNotExist:
                return Response({
                    'error': f'Usuario con email {email} no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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