#!/usr/bin/env python
"""
Script para verificar la configuración actual de Railway y las URLs de imagen
"""
import requests
import json
import re

def find_railway_url():
    """Intenta encontrar la URL de Railway desde el frontend config"""
    try:
        with open('../front-end/src/config.ts', 'r') as f:
            content = f.read()
            
        # Buscar patrones de URL de Railway
        railway_patterns = [
            r'https://[^.]+\.railway\.app',
            r'https://[^.]+\.up\.railway\.app'
        ]
        
        for pattern in railway_patterns:
            match = re.search(pattern, content)
            if match:
                return match.group(0)
        
        return None
    except:
        return None

def test_railway_connection():
    """Prueba la conexión con Railway"""
    
    print("=== VERIFICACIÓN DE CONFIGURACIÓN RAILWAY ===\n")
    
    # Intentar encontrar la URL de Railway
    railway_url = find_railway_url()
    
    if railway_url:
        print(f"🔍 URL de Railway encontrada: {railway_url}")
        
        # Probar conexión
        try:
            response = requests.get(f"{railway_url}/api/", timeout=10)
            print(f"✅ Conexión exitosa - Código: {response.status_code}")
            
            # Probar endpoint de productos
            products_response = requests.get(f"{railway_url}/api/products/", timeout=10)
            if products_response.status_code == 200:
                data = products_response.json()
                print(f"✅ API de productos funciona - {len(data.get('results', []))} productos")
                
                # Verificar URLs de imagen
                for product in data.get('results', [])[:3]:  # Solo primeros 3
                    if product.get('images'):
                        for img in product['images'][:1]:  # Solo primera imagen
                            img_url = img.get('image', '')
                            if 'railway.app' in img_url:
                                print(f"✅ URL de imagen correcta: {img_url[:60]}...")
                            else:
                                print(f"❌ URL de imagen incorrecta: {img_url}")
                        break
            else:
                print(f"❌ Error en API de productos: {products_response.status_code}")
                
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
    else:
        print("❌ No se encontró URL de Railway en la configuración")
        print("   Verifica que VITE_API_URL esté configurado correctamente")
    
    print()

def show_configuration_steps():
    """Muestra los pasos para configurar BASE_URL"""
    
    railway_url = find_railway_url()
    
    print("=== PASOS PARA CONFIGURAR BASE_URL EN RAILWAY ===\n")
    
    if railway_url:
        print(f"🎯 Configurar esta variable en Railway:")
        print(f"   Nombre: BASE_URL")
        print(f"   Valor: {railway_url}")
    else:
        print("🎯 Configurar esta variable en Railway:")
        print("   Nombre: BASE_URL")
        print("   Valor: https://TU-PROYECTO.railway.app")
        print("   (Reemplazar TU-PROYECTO con el nombre real)")
    
    print("\n📋 Pasos en Railway:")
    print("1. Ir al dashboard de Railway")
    print("2. Seleccionar tu proyecto backend")
    print("3. Ir a la pestaña 'Variables'")
    print("4. Hacer click en 'New Variable'")
    print("5. Nombre: BASE_URL")
    if railway_url:
        print(f"6. Valor: {railway_url}")
    else:
        print("6. Valor: https://tu-proyecto.railway.app")
    print("7. Hacer click en 'Add'")
    print("8. Hacer redeploy del proyecto")
    
    print("\n🔄 Después del redeploy:")
    print("- Las URLs de imagen deberían usar el dominio de Railway")
    print("- Las imágenes deberían aparecer en el frontend")
    
    print()

if __name__ == "__main__":
    test_railway_connection()
    show_configuration_steps()
