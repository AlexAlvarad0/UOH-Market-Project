#!/usr/bin/env python3
"""
Script para verificar y depurar problemas con imágenes de productos.
Ejecutar desde el directorio back-end: python debug_images.py
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings
from products.models import Product, ProductImage
from django.test import RequestFactory
from products.serializers import ProductSerializer, ProductImageSerializer

def check_media_settings():
    """Verificar configuración de archivos media"""
    print("🖼️  VERIFICACIÓN DE CONFIGURACIÓN DE IMÁGENES")
    print("=" * 50)
    print()
    
    print("📂 Configuración de Media Files:")
    print(f"   MEDIA_URL: {settings.MEDIA_URL}")
    print(f"   MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"   DEBUG: {settings.DEBUG}")
    print()
    
    # Verificar que el directorio media existe
    if settings.MEDIA_ROOT.exists():
        print(f"   ✅ Directorio MEDIA_ROOT existe: {settings.MEDIA_ROOT}")
    else:
        print(f"   ❌ Directorio MEDIA_ROOT no existe: {settings.MEDIA_ROOT}")
        print("      Creando directorio...")
        settings.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    
    # Verificar subdirectorio de imágenes de productos
    product_images_dir = settings.MEDIA_ROOT / 'product_images'
    if product_images_dir.exists():
        print(f"   ✅ Directorio de imágenes de productos existe: {product_images_dir}")
        
        # Listar archivos en el directorio
        image_files = list(product_images_dir.glob('*'))
        print(f"   📁 Archivos encontrados: {len(image_files)}")
        for img_file in image_files[:5]:  # Mostrar solo los primeros 5
            print(f"      - {img_file.name}")
        if len(image_files) > 5:
            print(f"      ... y {len(image_files) - 5} más")
    else:
        print(f"   ⚠️  Directorio de imágenes de productos no existe: {product_images_dir}")
    
    print()

def check_product_images():
    """Verificar productos con imágenes"""
    print("🖼️  VERIFICACIÓN DE PRODUCTOS CON IMÁGENES")
    print("=" * 50)
    print()
    
    # Contar productos y productos con imágenes
    total_products = Product.objects.count()
    products_with_images = Product.objects.filter(images__isnull=False).distinct().count()
    total_images = ProductImage.objects.count()
    
    print(f"📊 Estadísticas:")
    print(f"   Total de productos: {total_products}")
    print(f"   Productos con imágenes: {products_with_images}")
    print(f"   Total de imágenes: {total_images}")
    print()
    
    # Mostrar detalles de productos con imágenes
    products_with_imgs = Product.objects.filter(images__isnull=False).distinct()[:5]
    
    if products_with_imgs:
        print("🔍 Detalles de productos con imágenes:")
        for product in products_with_imgs:
            print(f"\n   📦 Producto: {product.title} (ID: {product.id})")
            print(f"      Vendedor: {product.seller.username}")
            print(f"      Precio: ${product.price}")
            print(f"      Imágenes:")
            
            for img in product.images.all():
                print(f"         - {img.image.name}")
                print(f"           URL: {img.image.url}")
                
                # Verificar si el archivo existe físicamente
                full_path = settings.MEDIA_ROOT / img.image.name
                if full_path.exists():
                    file_size = full_path.stat().st_size
                    print(f"           ✅ Archivo existe ({file_size} bytes)")
                else:
                    print(f"           ❌ Archivo NO existe en: {full_path}")
    else:
        print("   ⚠️  No se encontraron productos con imágenes")
    
    print()

def test_serializer_urls():
    """Probar URLs generadas por el serializer"""
    print("🌐 VERIFICACIÓN DE URLs DEL SERIALIZER")
    print("=" * 50)
    print()
    
    # Crear un request factory para simular requests
    factory = RequestFactory()
    request = factory.get('/api/products/')
    
    # Configurar el host del request
    request.META['HTTP_HOST'] = 'localhost:8000'
    request.META['wsgi.url_scheme'] = 'http'
    
    products_with_imgs = Product.objects.filter(images__isnull=False).distinct()[:3]
    
    if products_with_imgs:
        print("🔗 URLs generadas por el serializer:")
        for product in products_with_imgs:
            print(f"\n   📦 Producto: {product.title}")
            
            # Serializar con contexto de request
            serializer = ProductSerializer(product, context={'request': request})
            data = serializer.data
            
            if data['images']:
                for img_data in data['images']:
                    print(f"      🖼️  Imagen URL: {img_data['image']}")
                    
                    # Verificar si es URL absoluta
                    if img_data['image'].startswith('http'):
                        print(f"           ✅ URL absoluta")
                    else:
                        print(f"           ⚠️  URL relativa")
            else:
                print(f"      ❌ No hay imágenes en datos serializados")
    else:
        print("   ⚠️  No hay productos con imágenes para probar")
    
    print()

def check_url_configuration():
    """Verificar configuración de URLs"""
    print("🔗 VERIFICACIÓN DE CONFIGURACIÓN DE URLs")
    print("=" * 50)
    print()
    
    # Verificar si las URLs de media están configuradas
    from django.urls import reverse
    from django.test.utils import override_settings
    
    print("📋 Configuración de URLs:")
    print(f"   BASE_URL: {getattr(settings, 'BASE_URL', 'No configurado')}")
    print(f"   MEDIA_URL configurado: {settings.MEDIA_URL}")
    
    # Probar una URL de ejemplo
    sample_image_url = f"{settings.MEDIA_URL}product_images/test.jpg"
    print(f"   URL de ejemplo: {sample_image_url}")
    
    print()

def main():
    """Función principal"""
    check_media_settings()
    check_product_images()
    test_serializer_urls()
    check_url_configuration()
    
    print("🎯 RESUMEN Y RECOMENDACIONES")
    print("=" * 30)
    print()
    
    # Contar problemas encontrados
    issues = []
    
    if not (settings.MEDIA_ROOT / 'product_images').exists():
        issues.append("❌ Directorio de imágenes no existe")
    
    products_with_images = Product.objects.filter(images__isnull=False).distinct().count()
    if products_with_images == 0:
        issues.append("⚠️  No hay productos con imágenes para probar")
    
    if not hasattr(settings, 'BASE_URL'):
        issues.append("⚠️  BASE_URL no configurado en settings")
    
    if issues:
        print("Problemas encontrados:")
        for issue in issues:
            print(f"  {issue}")
        print()
        print("💡 Recomendaciones:")
        print("  1. Sube un producto con imagen desde el frontend")
        print("  2. Verifica que MEDIA_URL esté configurado en Railway")
        print("  3. Asegúrate de que BASE_URL apunte a tu dominio de Railway")
    else:
        print("✅ ¡Configuración de imágenes parece correcta!")
    
    print()

if __name__ == "__main__":
    main()
