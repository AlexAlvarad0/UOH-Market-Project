#!/usr/bin/env python3
"""
Script de verificación rápida para Railway.
Puedes ejecutar esto en Railway para verificar la configuración.
"""

import os
import sys
import django

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.conf import settings

def main():
    print("🚀 VERIFICACIÓN RÁPIDA DE RAILWAY")
    print("=" * 40)
    print()
    
    print(f"DEBUG: {settings.DEBUG}")
    print(f"BASE_URL: {settings.BASE_URL}")
    print(f"MEDIA_URL: {settings.MEDIA_URL}")
    print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print()
    
    # Verificar si BASE_URL apunta a Railway
    if "railway.app" in settings.BASE_URL:
        print("✅ BASE_URL apunta a Railway")
    elif "localhost" in settings.BASE_URL:
        print("⚠️  BASE_URL apunta a localhost - NECESITA SER CAMBIADO")
    else:
        print(f"❓ BASE_URL: {settings.BASE_URL}")
    
    print()
    
    # Verificar productos con imágenes
    from products.models import Product
    products_with_images = Product.objects.filter(images__isnull=False).distinct().count()
    print(f"Productos con imágenes: {products_with_images}")
    
    if products_with_images > 0:
        print("✅ Hay productos con imágenes para probar")
    else:
        print("⚠️  No hay productos con imágenes")
    
    print()
    print("🎯 PRÓXIMOS PASOS:")
    if "localhost" in settings.BASE_URL:
        print("1. Configurar BASE_URL en Railway con tu dominio real")
        print("2. Subir un producto con imagen desde el frontend")
        print("3. Verificar que la imagen se muestre correctamente")
    else:
        print("1. Subir un producto con imagen desde el frontend")
        print("2. Verificar que la imagen se muestre correctamente")

if __name__ == "__main__":
    main()
