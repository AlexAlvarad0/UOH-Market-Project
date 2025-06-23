#!/usr/bin/env python
"""
Script para probar la API de productos y verificar las URLs de imagen
"""
import requests
import json
import os
from urllib.parse import urljoin

def test_product_api():
    print("=== PRUEBA DE API DE PRODUCTOS Y URLs DE IMAGEN ===\n")
    
    # URLs a probar
    base_urls = [
        "http://localhost:8000",  # Local
        "https://tu-proyecto.railway.app"  # Railway (reemplazar con tu URL real)
    ]
    
    for base_url in base_urls:
        print(f"🔍 Probando: {base_url}")
        
        # Probar endpoint de productos
        products_url = urljoin(base_url, "/api/products/")
        
        try:
            response = requests.get(products_url, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                if 'results' in data:
                    products = data['results']
                    print(f"   Productos encontrados: {len(products)}")
                    
                    # Revisar primer producto con imágenes
                    for product in products:
                        if product.get('images'):
                            print(f"   📦 Producto: {product['title'][:30]}...")
                            
                            for img in product['images'][:2]:  # Solo primeras 2 imágenes
                                img_url = img.get('image')
                                print(f"      🖼️  URL imagen: {img_url}")
                                
                                if img_url:
                                    # Probar acceso a la imagen
                                    try:
                                        img_response = requests.head(img_url, timeout=5)
                                        if img_response.status_code == 200:
                                            print(f"         ✅ Imagen accesible")
                                        else:
                                            print(f"         ❌ Imagen no accesible (código: {img_response.status_code})")
                                    except Exception as e:
                                        print(f"         ❌ Error al acceder imagen: {e}")
                            break  # Solo revisar el primer producto con imágenes
                else:
                    print(f"   ⚠️  Formato de respuesta inesperado")
                    
            else:
                print(f"   ❌ Error en API: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ Error de conexión: {e}")
        
        print()

def check_frontend_config():
    print("=== VERIFICACIÓN DE CONFIGURACIÓN DEL FRONTEND ===\n")
    
    # Verificar config.ts
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                              "front-end", "src", "config.ts")
    
    if os.path.exists(config_path):
        print("📁 Leyendo config.ts...")
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read()
            print(content)
    else:
        print("❌ No se encontró config.ts")
    
    print()

if __name__ == "__main__":
    test_product_api()
    check_frontend_config()
