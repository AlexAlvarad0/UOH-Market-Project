from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import datetime
import os
import logging
from .utils import moderate_content
from cloudinary_storage.storage import MediaCloudinaryStorage

logger = logging.getLogger(__name__)

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name

class Product(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Precio original
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    condition = models.CharField(max_length=50, choices=[
        ('new', 'Nuevo'),
        ('like_new', 'Como nuevo'),
        ('good', 'Buen estado'),
        ('fair', 'Estado aceptable'),
        ('poor', 'Mal estado'),
    ])
    STATUS_CHOICES = [
        ('pending', 'En revisión'),
        ('available', 'Disponible'),
        ('unavailable', 'No disponible'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_available = models.BooleanField(default=True)
    views_count = models.IntegerField(default=0)
    # Campo para controlar cuando un producto debe ser revisado
    review_scheduled_at = models.DateTimeField(null=True, blank=True)
    # Campo para registrar si el producto fue modificado por el usuario manualmente
    manually_unavailable = models.BooleanField(default=False)
    
    def __str__(self):
        return self.title

def validate_image(image):
    # Temporarily make validation less strict for debugging
    # Validar tamaño máximo (10MB en lugar de 5MB)
    max_size = 10 * 1024 * 1024  # 10MB en bytes
    if image.size > max_size:
        raise ValidationError(f'La imagen no debe superar los 10MB (tamaño actual: {image.size / 1024 / 1024:.2f}MB)')
    
    # Accept more image formats
    ext = os.path.splitext(image.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if ext not in valid_extensions:
        raise ValidationError(f'Formato de imagen no soportado. Por favor, suba una imagen en formato: {", ".join(valid_extensions)}')

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='product_images/', validators=[validate_image])  # Usar storage por defecto
    is_primary = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        logger.info(f"[DEBUG] Guardando ProductImage: type(image)={type(self.image)}, name={getattr(self.image, 'name', None)}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Image for {self.product.title}"

class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'product')
        
    def __str__(self):
        return f"{self.user.username} favorited {self.product.title}"

@receiver(post_save, sender=Product)
def product_post_save(sender, instance, created, **kwargs):
    """
    Signal para programar la moderación automática cuando se crea un producto.
    El producto se mantiene en estado 'pending' durante al menos 30 segundos antes de ser revisado.
    """
    if created and instance.status == 'pending':
        logger.info(f"Producto #{instance.id} creado: {instance.title}")
        
        # Programar la revisión para 30 segundos después de la creación
        review_time = timezone.now() + datetime.timedelta(seconds=30)
        
        # Actualizar el tiempo de revisión programado
        # Usar update() para evitar que se active de nuevo este signal
        Product.objects.filter(pk=instance.pk).update(review_scheduled_at=review_time)
        
        logger.info(f"Revisión programada para {review_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
    # No ejecutamos la moderación inmediatamente - será realizada por el middleware

# Asegurarse de que este código se carga al inicio
default_app_config = 'products.apps.ProductsConfig'