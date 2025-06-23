#!/usr/bin/env python
"""
Script final para verificar que todo funciona correctamente
"""
import requests

def final_verification():
    print("=== VERIFICACIÓN FINAL POST-CORRECCIONES ===\n")
    
    base_url = "https://uoh-market-project-production-e906.up.railway.app"
    
    try:
        # Probar API de productos
        response = requests.get(f"{base_url}/api/products/", timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('results', [])
            print(f"✅ API funcionando - {len(products)} productos")
            
            # Verificar URLs de imagen
            for product in products:
                if product.get('images'):
                    print(f"\n📦 {product['title'][:40]}...")
                    
                    for img in product['images'][:1]:  # Solo primera imagen
                        img_url = img.get('image', '')
                        print(f"🖼️  URL: {img_url}")
                        
                        # Verificar protocolo
                        if img_url.startswith('https://'):
                            print("   ✅ Protocolo HTTPS correcto")
                        else:
                            print("   ❌ Protocolo incorrecto")
                        
                        # Verificar dominio
                        if 'uoh-market-project-production-e906.up.railway.app' in img_url:
                            print("   ✅ Dominio correcto")
                        else:
                            print("   ❌ Dominio incorrecto")
                        
                        # Probar acceso
                        try:
                            img_response = requests.head(img_url, timeout=10)
                            print(f"   📊 Status: {img_response.status_code}")
                            
                            if img_response.status_code == 200:
                                print("   ✅ Imagen accesible")
                            elif img_response.status_code == 301:
                                print("   ⚠️  Redirección 301 (revisar HTTP/HTTPS)")
                            else:
                                print(f"   ❌ Error: {img_response.status_code}")
                                
                        except Exception as e:
                            print(f"   ❌ Error de conexión: {e}")
                    
                    break  # Solo revisar primer producto con imágenes
            
        else:
            print(f"❌ Error en API: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error general: {e}")
    
    print("\n" + "="*50)
    print("RESUMEN:")
    print("Si ves '✅ Imagen accesible', el problema está resuelto")
    print("Si ves '⚠️ Redirección 301', actualiza BASE_URL a HTTPS en Railway")
    print("Si ves '❌ Error', revisa la configuración de archivos media")

if __name__ == "__main__":
    final_verification()
