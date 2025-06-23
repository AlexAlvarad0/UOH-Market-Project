#!/usr/bin/env python
"""
Script para probar la API de Railway con la URL real configurada
"""
import requests
import json

def test_railway_api():
    print("=== VERIFICACIÓN CON URL REAL DE RAILWAY ===\n")
    
    base_url = "https://uoh-market-project-production-e906.up.railway.app"
    
    print(f"🔍 Probando: {base_url}")
    
    try:
        # 1. Probar endpoint base
        print("\n1. Probando endpoint base...")
        response = requests.get(f"{base_url}/api/", timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ API base funcionando")
        else:
            print(f"   ❌ Error en API base: {response.status_code}")
            return
        
        # 2. Probar endpoint de productos
        print("\n2. Probando productos...")
        products_response = requests.get(f"{base_url}/api/products/", timeout=10)
        print(f"   Status: {products_response.status_code}")
        
        if products_response.status_code == 200:
            data = products_response.json()
            products = data.get('results', [])
            print(f"   ✅ {len(products)} productos encontrados")
            
            # 3. Verificar URLs de imagen
            print("\n3. Verificando URLs de imagen...")
            found_images = False
            
            for i, product in enumerate(products[:5]):  # Solo primeros 5 productos
                if product.get('images'):
                    found_images = True
                    print(f"\n   📦 Producto {i+1}: {product['title'][:30]}...")
                    
                    for j, img in enumerate(product['images'][:2]):  # Solo primeras 2 imágenes
                        img_url = img.get('image', '')
                        print(f"      🖼️  Imagen {j+1}: {img_url}")
                        
                        # Verificar si la URL contiene el dominio correcto
                        if 'uoh-market-project-production-e906.up.railway.app' in img_url:
                            print(f"         ✅ URL correcta (contiene dominio Railway)")
                            
                            # Probar acceso a la imagen
                            try:
                                img_response = requests.head(img_url, timeout=5)
                                if img_response.status_code == 200:
                                    print(f"         ✅ Imagen accesible")
                                else:
                                    print(f"         ❌ Imagen no accesible (código: {img_response.status_code})")
                            except Exception as e:
                                print(f"         ❌ Error al acceder imagen: {e}")
                        else:
                            print(f"         ❌ URL incorrecta (no contiene dominio Railway)")
                            print(f"         📍 Detectado: {img_url[:50]}...")
                    
                    break  # Solo revisar el primer producto con imágenes
            
            if not found_images:
                print("   ⚠️  No se encontraron productos con imágenes")
        else:
            print(f"   ❌ Error en API de productos: {products_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
    
    print()

def test_media_serving():
    """Prueba si los archivos media se sirven correctamente"""
    print("=== PRUEBA DE SERVING DE ARCHIVOS MEDIA ===\n")
    
    base_url = "https://uoh-market-project-production-e906.up.railway.app"
    
    # Probar URL de media directa (si conocemos alguna)
    test_media_url = f"{base_url}/media/"
    
    try:
        response = requests.get(test_media_url, timeout=10)
        print(f"🔍 Probando directorio media: {test_media_url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Directorio media accesible")
        elif response.status_code == 404:
            print("   ⚠️  Directorio media no encontrado (normal si está vacío)")
        else:
            print(f"   ❌ Error en directorio media: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error al acceder media: {e}")
    
    print()

if __name__ == "__main__":
    test_railway_api()
    test_media_serving()
