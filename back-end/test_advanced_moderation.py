#!/usr/bin/env python
"""
Script de prueba para el sistema de moderación avanzado
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.advanced_moderator import category_moderator

# Crear un objeto de producto simulado para prueba
class MockProduct:
    def __init__(self, title, description, price, category_name):
        self.title = title
        self.description = description
        self.price = price
        self.category = MockCategory(category_name)

class MockCategory:
    def __init__(self, name):
        self.name = name

def test_moderation():
    print("=== Pruebas del Sistema de Moderación Avanzado ===\n")
    
    # Casos de prueba
    test_cases = [
        {
            'title': 'iPhone 13',
            'description': 'iPhone 13 en excelente estado, con caja y garantía',
            'price': 800000,
            'category': 'Tecnología',
            'expected': True
        },
        {
            'title': 'iPhone robado',
            'description': 'iPhone nuevo, sin papeles, conseguido de manera especial',
            'price': 500000,
            'category': 'Tecnología',
            'expected': False
        },
        {
            'title': 'Departamento en arriendo',
            'description': 'Arriendo habitación amoblada cerca del campus, $300.000 mensuales',
            'price': 300000,
            'category': 'Arriendos',
            'expected': True
        },
        {
            'title': 'Producto muy caro',
            'description': 'Producto de tecnología increíble',
            'price': 10000000,  # Muy caro para la categoría
            'category': 'Tecnología',
            'expected': False
        },
        {
            'title': 'Guitarra',
            'description': 'Vendo guitarra acústica en buen estado',
            'price': 150000,
            'category': 'Instrumentos Musicales',
            'expected': True
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"Caso {i}: {case['title']}")
        print(f"Categoría: {case['category']}")
        print(f"Precio: ${case['price']:,}")
        
        product = MockProduct(
            case['title'],
            case['description'], 
            case['price'],
            case['category']
        )
        
        is_approved, reason = category_moderator.moderate_product(product)
        
        status = "✅ APROBADO" if is_approved else "❌ RECHAZADO"
        expected_status = "✅ APROBADO" if case['expected'] else "❌ RECHAZADO"
        
        print(f"Resultado: {status}")
        print(f"Esperado: {expected_status}")
        
        if not is_approved:
            print(f"Motivo: {reason}")
        
        if is_approved == case['expected']:
            print("🎯 Resultado correcto")
        else:
            print("⚠️  Resultado inesperado")
        
        print("-" * 60)

if __name__ == '__main__':
    test_moderation()
