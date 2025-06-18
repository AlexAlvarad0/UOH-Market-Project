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
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary']

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    seller_username = serializers.ReadOnlyField(source='seller.username')
    is_favorite = serializers.SerializerMethodField()
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'original_price', 'category', 'category_name',
            'seller', 'seller_username', 'condition', 'created_at', 'updated_at',
            'is_available', 'views_count', 'images', 'is_favorite', 'status',
            'review_scheduled_at', 'manually_unavailable'
        ]
        read_only_fields = [
            'seller', 'views_count', 'created_at', 'updated_at', 
            'review_scheduled_at', 'manually_unavailable'
        ]
    
    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, product=obj).exists()
        return False
    
    def create(self, validated_data):
        # Asignar el usuario que hace la solicitud como vendedor
        user = self.context['request'].user
        product = Product.objects.create(seller=user, **validated_data)
        return product

class ProductDetailSerializer(ProductSerializer):
    seller = UserSerializer(read_only=True)
    is_favorite = serializers.SerializerMethodField()
    
    class Meta(ProductSerializer.Meta):
        fields = ProductSerializer.Meta.fields + ['is_favorite']
    
    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, product=obj).exists()
        return False

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