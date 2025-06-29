from rest_framework import serializers
from .models import Category, Product, ProductImage, Favorite
from accounts.serializers import UserSerializer
import logging

logger = logging.getLogger(__name__)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']

class ProductBasicSerializer(serializers.ModelSerializer):
    """Serializador simplificado para productos, usado en notificaciones"""
    class Meta:
        model = Product
        fields = ['id', 'title', 'price']

class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary']
    
    def get_image(self, obj):
        if obj.image:
            url = obj.image.url
            # Si la URL ya es absoluta (S3), devuélvela tal cual
            if url.startswith('http://') or url.startswith('https://'):
                return url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            else:
                from django.conf import settings
                base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                if 'railway.app' in base_url and base_url.startswith('http://'):
                    base_url = base_url.replace('http://', 'https://')
                return f"{base_url}{url}"
        return None

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    seller_username = serializers.ReadOnlyField(source='seller.username')
    is_favorite = serializers.SerializerMethodField()
    seller = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'original_price', 'category', 'category_name',
            'seller', 'seller_username', 'condition', 'created_at', 'updated_at',
            'is_available', 'views_count', 'images', 'is_favorite', 'status',
            'review_scheduled_at', 'manually_unavailable'        ]
        read_only_fields = [
            'views_count', 'created_at', 'updated_at', 
            'review_scheduled_at', 'manually_unavailable'
        ]
    
    def get_seller(self, obj):
        """Retornar información expandida del vendedor incluyendo foto de perfil"""
        seller = obj.seller
        profile_picture = None
        profile_data = {}
        
        if hasattr(seller, 'profile') and seller.profile:
            if seller.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    profile_picture = request.build_absolute_uri(seller.profile.profile_picture.url)
                else:
                    # Fallback usando BASE_URL para imágenes de perfil
                    from django.conf import settings
                    base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
                    # Asegurar HTTPS en producción
                    if 'railway.app' in base_url and base_url.startswith('http://'):
                        base_url = base_url.replace('http://', 'https://')
                    profile_picture = f"{base_url}{seller.profile.profile_picture.url}"
            
            # Calcular calificaciones promedio para el vendedor
            from accounts.models import Rating
            from django.db import models
            ratings = Rating.objects.filter(rated_user=seller)
            average_rating = 0
            total_ratings = ratings.count()
            
            if total_ratings > 0:
                average_rating = ratings.aggregate(avg_rating=models.Avg('rating'))['avg_rating'] or 0
            
            profile_data = {
                'average_rating': round(average_rating, 2),
                'total_ratings': total_ratings
            }
        
        result = {
            'id': seller.id,
            'username': seller.username,
            'email': seller.email,
            'is_verified_seller': seller.is_verified_seller,
            'profile_picture': profile_picture,
            'profile': profile_data        }
        
        return result
    
    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, product=obj).exists()
        return False
    
    def create(self, validated_data):
        # Asignar el usuario que hace la solicitud como vendedor
        user = self.context['request'].user
        product = Product.objects.create(seller=user, **validated_data)
        return product

class ProductDetailSerializer(ProductSerializer):
    # Heredamos el campo seller como SerializerMethodField del ProductSerializer
    # No lo sobrescribimos para mantener la funcionalidad de la foto de perfil
    
    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['is_favorite']
    
    # Heredamos get_is_favorite del ProductSerializer, no necesitamos redefinirlo

class FavoriteSerializer(serializers.ModelSerializer):
    # Si quieres incluir detalles del producto en respuestas GET
    product_detail = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'product', 'product_detail', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        # Log para depuración
        logger.info(f"Datos validados para crear favorito: {validated_data}")
        
        # Obtener el usuario de la solicitud
        user = self.context['request'].user
        
        # Obtener el producto y evitar que el usuario marque sus propios productos
        product = validated_data.get('product')
        if product.seller == user:
            logger.warning(f"El usuario {user.id} intentó añadir a favoritos su propio producto {product.id}")
            raise serializers.ValidationError("No puedes añadir a favoritos tus propios productos.")
        
        # Verificar si el producto está en validated_data
        if not product:
            logger.error("No se proporcionó un producto para el favorito")
            raise serializers.ValidationError({"product": "Este campo es requerido."})
        
        # Verificar si ya existe un favorito para este usuario y producto
        existing = Favorite.objects.filter(user=user, product=product).first()
        if existing:
            logger.info(f"El producto {product.id} ya está en favoritos del usuario {user.id}")
            return existing
        
        # Crear el favorito
        favorite = Favorite.objects.create(
            user=user,
            product=product
        )
        
        logger.info(f"Favorito creado: {favorite.id}")
        return favorite