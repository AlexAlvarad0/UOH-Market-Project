#!/usr/bin/env python
"""
Script para verificar que los archivos media están siendo servidos correctamente
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.models import Product, ProductImage
from django.conf import settings

def check_media_files():
    print("=== VERIFICACIÓN DE ARCHIVOS MEDIA ===\n")
    
    print(f"📁 MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"🌐 MEDIA_URL: {settings.MEDIA_URL}")
    print(f"🔗 BASE_URL: {settings.BASE_URL}")
    print()
    
    # Verificar que MEDIA_ROOT existe
    if os.path.exists(settings.MEDIA_ROOT):
        print("✅ MEDIA_ROOT existe")
        
        # Listar archivos en product_images
        product_images_dir = os.path.join(settings.MEDIA_ROOT, 'product_images')
        if os.path.exists(product_images_dir):
            files = os.listdir(product_images_dir)
            print(f"📸 Archivos en product_images: {len(files)}")
            
            for file in files[:5]:  # Solo primeros 5
                file_path = os.path.join(product_images_dir, file)
                size = os.path.getsize(file_path)
                print(f"   - {file} ({size} bytes)")
        else:
            print("❌ Directorio product_images no existe")
    else:
        print("❌ MEDIA_ROOT no existe")
    
    print()
    
    # Verificar productos con imágenes
    products = Product.objects.filter(images__isnull=False).distinct()[:3]
    print(f"📦 Productos con imágenes: {products.count()}")
    
    for product in products:
        print(f"\n🛍️  {product.title[:30]}...")
        for image in product.images.all()[:2]:
            print(f"   📷 {image.image.name}")
            
            # Verificar que el archivo existe
            full_path = os.path.join(settings.MEDIA_ROOT, image.image.name)
            exists = os.path.exists(full_path)
            print(f"      Existe: {exists}")
            
            if exists:
                size = os.path.getsize(full_path)
                print(f"      Tamaño: {size} bytes")
            
            # Mostrar URL que se generaría
            url = f"{settings.BASE_URL}{settings.MEDIA_URL}{image.image.name}"
            print(f"      URL: {url}")

if __name__ == "__main__":
    check_media_files()
