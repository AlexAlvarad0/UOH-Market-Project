#!/usr/bin/env python
"""
Script para diagnosticar las URLs de imágenes en la API
"""
import os
import sys
import django
import requests
from urllib.parse import urlparse

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.models import Product, ProductImage
from django.conf import settings

def check_image_urls():
    print("=== DIAGNÓSTICO DE URLs DE IMÁGENES ===\n")
    
    # 1. Verificar configuración
    print("1. CONFIGURACIÓN:")
    print(f"   MEDIA_URL: {settings.MEDIA_URL}")
    print(f"   MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"   BASE_URL: {getattr(settings, 'BASE_URL', 'NO CONFIGURADO')}")
    print(f"   DEBUG: {settings.DEBUG}")
    print()
    
    # 2. Verificar productos con imágenes
    products_with_images = Product.objects.filter(images__isnull=False).distinct()[:5]
    print(f"2. PRODUCTOS CON IMÁGENES (primeros 5):")
    print(f"   Total productos con imágenes: {products_with_images.count()}")
    print()
    
    for product in products_with_images:
        print(f"   Producto: {product.title[:50]}...")
        for image in product.images.all()[:2]:  # Solo primeras 2 imágenes
            print(f"     - Archivo: {image.image.name}")
            print(f"     - URL relativa: {image.image.url}")
            
            # Construir URL absoluta como en el serializer
            base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')
            absolute_url = f"{base_url}{image.image.url}"
            print(f"     - URL absoluta: {absolute_url}")
            
            # Verificar si el archivo existe físicamente
            full_path = os.path.join(settings.MEDIA_ROOT, image.image.name)
            exists = os.path.exists(full_path)
            print(f"     - Archivo existe: {exists}")
            
            if exists:
                size = os.path.getsize(full_path)
                print(f"     - Tamaño: {size} bytes")
            
            print()
    
    # 3. Verificar acceso a URLs (solo si BASE_URL está configurado)
    base_url = getattr(settings, 'BASE_URL', None)
    if base_url and base_url != 'http://localhost:8000':
        print("3. PRUEBA DE ACCESO A URLs:")
        first_product = products_with_images.first()
        if first_product and first_product.images.exists():
            first_image = first_product.images.first()
            test_url = f"{base_url}{first_image.image.url}"
            print(f"   Probando URL: {test_url}")
            
            try:
                response = requests.head(test_url, timeout=10)
                print(f"   Código de respuesta: {response.status_code}")
                if response.status_code == 200:
                    print("   ✅ Imagen accesible")
                else:
                    print("   ❌ Imagen no accesible")
            except Exception as e:
                print(f"   ❌ Error al acceder: {e}")
        else:
            print("   No hay imágenes para probar")
    else:
        print("3. BASE_URL no configurado para producción, saltando prueba de acceso")
    
    print()
    
    # 4. Verificar estructura de directorios
    print("4. ESTRUCTURA DE MEDIA:")
    media_root = settings.MEDIA_ROOT
    if os.path.exists(media_root):
        print(f"   MEDIA_ROOT existe: {media_root}")
        
        # Listar subdirectorios
        for root, dirs, files in os.walk(media_root):
            level = root.replace(media_root, '').count(os.sep)
            indent = ' ' * 2 * level
            print(f"   {indent}{os.path.basename(root)}/")
            
            # Solo mostrar algunos archivos para no saturar
            subindent = ' ' * 2 * (level + 1)
            for file in files[:3]:  # Solo primeros 3 archivos por directorio
                print(f"   {subindent}{file}")
            if len(files) > 3:
                print(f"   {subindent}... y {len(files) - 3} archivos más")
    else:
        print(f"   ❌ MEDIA_ROOT no existe: {media_root}")

if __name__ == "__main__":
    check_image_urls()
