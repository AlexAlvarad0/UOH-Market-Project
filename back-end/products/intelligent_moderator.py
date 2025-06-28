"""
Moderador inteligente de productos: prioriza IA para imágenes y solo usa validaciones mínimas de texto como respaldo.
"""

import os
import logging
from typing import Tuple, Dict
from products.models import Product
from .free_ai_moderator import analyze_image_with_free_ai

logger = logging.getLogger(__name__)

class IntelligentProductModerator:
    CRITICAL_BANNED_WORDS = [
        'cocaina', 'heroina', 'lsd', 'mdma', 'ecstasy', 'metanfetamina', 'crack', 'fentanilo',
        'pistola', 'revolver', 'rifle', 'ametralladora', 'bomba', 'explosivo', 'granada',
        'prostitucion', 'escort sexual', 'servicios sexuales',
        'cedula falsa', 'pasaporte falso', 'dinero falso', 'billetes falsos',
    ]
    def moderate_product(self, product: Product) -> Tuple[bool, str]:
        try:
            # 1. Análisis IA de imágenes
            images = product.images.all()
            if not images.exists():
                return False, 'El producto no tiene imágenes para analizar.'
            for image in images:
                if not os.path.exists(image.image.path):
                    continue
                result = analyze_image_with_free_ai(image.image.path)
                if not result.get('is_appropriate', True):
                    return False, f"Imagen inapropiada detectada por IA: {result.get('reason', 'Contenido inapropiado')}"
            # 2. Validación crítica de texto (solo palabras MUY específicas)
            content = f"{product.title} {product.description}".lower()
            for word in self.CRITICAL_BANNED_WORDS:
                if word in content:
                    return False, f"Palabra prohibida detectada en el texto: {word}"
            # 3. Validaciones mínimas (precio y longitud)
            if product.price <= 0:
                return False, 'El precio debe ser mayor a 0.'
            if product.price > 50000000:
                return False, 'Precio excesivamente alto (posible error o fraude).'
            if len(product.title.strip()) < 3:
                return False, 'Título demasiado corto (mínimo 3 caracteres).'
            if len(product.description.strip()) < 10:
                return False, 'Descripción demasiado corta (mínimo 10 caracteres).'
            return True, 'Producto aprobado por IA y validaciones básicas.'
        except Exception as e:
            logger.error(f"Error en moderación inteligente: {str(e)}")
            return False, f"Error en moderación: {str(e)}"

intelligent_moderator = IntelligentProductModerator()
def moderate_product_with_ai(product: Product) -> Tuple[bool, str]:
    return intelligent_moderator.moderate_product(product)
