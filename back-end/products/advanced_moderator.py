"""
Sistema de moderación de productos personalizado por categoría.
Este módulo proporciona un sistema de moderación más inteligente y menos sensible,
con reglas específicas para cada una de las 17 categorías de productos.
"""

import re
from typing import Dict, List, Tuple, Optional
from products.models import Product


class CategoryModerator:
    """
    Moderador de productos con reglas específicas por categoría.
    """
    
    # Palabras prohibidas globales (aplicables a todas las categorías)
    GLOBAL_BANNED_WORDS = [
        # Drogas y sustancias
        'droga', 'cocaina', 'heroina', 'marihuana', 'cannabis', 'lsd', 'mdma', 'ecstasy',
        'metanfetamina', 'crack', 'anfetamina', 'opio', 'morfina', 'fentanilo',
        
        # Armas y explosivos
        'pistola', 'revolver', 'rifle', 'escopeta', 'ametralladora', 'bomba', 'explosivo',
        'granada', 'dinamita', 'balas', 'municion', 'cuchillo de combate',
        
        # Contenido sexual explícito o servicios sexuales
        'prostitucion', 'escort', 'acompañante sexual', 'masaje erotico', 'contenido adulto',
        'webcam adulto', 'servicio sexual',
        
        # Documentos falsos y fraude
        'cedula falsa', 'pasaporte falso', 'titulo falso', 'diploma falso', 'licencia falsa',
        'tarjeta credito clonada', 'dinero falso', 'billetes falsos',
        
        # Actividades ilegales
        'hacking', 'pirateo', 'software pirata', 'cuenta robada', 'tarjeta robada',
        'lavado de dinero', 'blanqueo', 'estafa piramidal'
    ]
    
    # Configuración específica por categoría
    CATEGORY_RULES = {
        'Arriendos': {
            'max_price': 2000000,  # Precio máximo en pesos chilenos
            'required_words': ['arriendo', 'alquiler', 'renta', 'habitacion', 'departamento', 'casa', 'pieza'],
            'banned_words': ['prostitucion', 'escort', 'por horas'],
            'min_description_length': 50,
            'suspicious_patterns': [
                r'solo\s+mujeres?\s+jovenes?',
                r'sin\s+preguntas',
                r'discrecion\s+absoluta'
            ]
        },
        
        'Artes y Manualidades': {
            'max_price': 500000,
            'required_words': ['arte', 'manualidad', 'creativo', 'hecho a mano', 'handmade', 'artesania'],
            'banned_words': ['replica', 'copia', 'falsificacion'],
            'min_description_length': 30,
            'suspicious_patterns': [
                r'copia\s+exacta',
                r'indistinguible\s+del\s+original'
            ]
        },
        
        'Cafetería y Snacks': {
            'max_price': 50000,
            'required_words': ['cafe', 'snack', 'comida', 'bebida', 'dulce', 'salado', 'reposteria'],
            'banned_words': ['vencido', 'caducado', 'sin registro sanitario', 'casero sin permiso'],
            'min_description_length': 20,
            'suspicious_patterns': [
                r'sin\s+fecha\s+vencimiento',
                r'preparado\s+en\s+casa\s+sin'
            ]
        },
        
        'Deportes y Outdoor': {
            'max_price': 1000000,
            'required_words': ['deporte', 'ejercicio', 'outdoor', 'aventura', 'fitness', 'entrenamiento'],
            'banned_words': ['esteroides', 'dopaje', 'sustancia prohibida'],
            'min_description_length': 30,
            'suspicious_patterns': [
                r'mejora\s+rendimiento\s+garantizado',
                r'sustancia\s+para\s+deportistas'
            ]
        },
        
        'Electrodomésticos': {
            'max_price': 2000000,
            'required_words': ['electrodomestico', 'cocina', 'lavadora', 'refrigerador', 'horno', 'electronico'],
            'banned_words': ['robado', 'sin boleta', 'origen dudoso'],
            'min_description_length': 40,
            'suspicious_patterns': [
                r'sin\s+garantia\s+ni\s+boleta',
                r'conseguido\s+de\s+manera'
            ]
        },
        
        'Entradas y Eventos': {
            'max_price': 500000,
            'required_words': ['entrada', 'ticket', 'evento', 'concierto', 'show', 'espectaculo'],
            'banned_words': ['falsa', 'clonada', 'duplicada'],
            'min_description_length': 25,
            'suspicious_patterns': [
                r'garantizado\s+ingreso\s+sin',
                r'entrada\s+sin\s+validar'
            ]
        },
        
        'Hogar y Dormitorio': {
            'max_price': 1000000,
            'required_words': ['hogar', 'casa', 'dormitorio', 'mueble', 'decoracion', 'habitacion'],
            'banned_words': ['usado sin lavar', 'con manchas permanentes', 'infestado'],
            'min_description_length': 30,
            'suspicious_patterns': [
                r'sin\s+limpiar\s+desde',
                r'manchas\s+que\s+no\s+salen'
            ]
        },
        
        'Relojes y Joyas': {
            'max_price': 5000000,
            'required_words': ['reloj', 'joya', 'oro', 'plata', 'diamante', 'accesorio'],
            'banned_words': ['replica', 'copia', 'falso', 'imitacion', 'robado'],
            'min_description_length': 40,
            'suspicious_patterns': [
                r'parece\s+original',
                r'indistinguible\s+del\s+real',
                r'rolex\s+barato'
            ]
        },
        
        'Instrumentos Musicales': {
            'max_price': 3000000,
            'required_words': ['instrumento', 'musical', 'musica', 'guitarra', 'piano', 'bateria'],
            'banned_words': ['robado', 'sin papeles', 'dudosa procedencia'],
            'min_description_length': 35,
            'suspicious_patterns': [
                r'sin\s+certificado\s+de\s+origen',
                r'conseguido\s+de\s+forma'
            ]
        },
        
        'Juegos y Entretenimiento': {
            'max_price': 800000,
            'required_words': ['juego', 'entretenimiento', 'diversión', 'consola', 'videojuego', 'juguete'],
            'banned_words': ['pirata', 'crackeado', 'modificado ilegalmente', 'cuenta robada'],
            'min_description_length': 25,
            'suspicious_patterns': [
                r'juegos\s+gratis\s+para\s+siempre',
                r'cuenta\s+con\s+todos\s+los\s+juegos'
            ]
        },
        
        'Libros, película y música': {
            'max_price': 200000,
            'required_words': ['libro', 'pelicula', 'musica', 'dvd', 'cd', 'blu-ray', 'lectura'],
            'banned_words': ['pirata', 'copia ilegal', 'descarga ilegal', 'torrent'],
            'min_description_length': 25,
            'suspicious_patterns': [
                r'copia\s+digital\s+gratis',
                r'descarga\s+desde\s+mi\s+servidor'
            ]
        },
        
        'Mascotas': {
            'max_price': 1000000,
            'required_words': ['mascota', 'perro', 'gato', 'animal', 'cachorro', 'gatito'],
            'banned_words': ['maltratado', 'enfermo sin tratar', 'sin vacunas', 'robado'],
            'min_description_length': 40,
            'suspicious_patterns': [
                r'sin\s+papeles\s+veterinarios',
                r'encontrado\s+en\s+la\s+calle\s+ayer'
            ]
        },
        
        'Ropa y Accesorios': {
            'max_price': 500000,
            'required_words': ['ropa', 'vestimenta', 'accesorio', 'zapato', 'bolso', 'prenda'],
            'banned_words': ['replica', 'copia', 'falso', 'imitacion'],
            'min_description_length': 25,
            'suspicious_patterns': [
                r'parece\s+marca\s+original',
                r'nike\s+barato\s+desde\s+china'
            ]
        },
        
        'Servicios Estudiantiles': {
            'max_price': 200000,
            'required_words': ['servicio', 'estudiante', 'estudio', 'tarea', 'proyecto', 'academico'],
            'banned_words': ['hago tareas por ti', 'examen por ti', 'titulo falso', 'plagio garantizado'],
            'min_description_length': 30,
            'suspicious_patterns': [
                r'hago\s+tu\s+tesis\s+completa',
                r'examen\s+online\s+por\s+ti',
                r'plagio\s+no\s+detectable'
            ]
        },
          'Tecnología': {
            'max_price': 3000000,
            'required_words': ['tecnologia', 'electronico', 'computador', 'celular', 'smartphone', 'tablet', 'iphone', 'samsung', 'laptop', 'pc', 'mac', 'android'],
            'banned_words': ['robado', 'bloqueado', 'sin imei', 'reportado', 'clonado'],
            'min_description_length': 35,
            'suspicious_patterns': [
                r'sin\s+caja\s+ni\s+papeles',
                r'bloqueado\s+pero\s+se\s+puede',
                r'imei\s+cambiado'
            ]
        },
        
        'Vehículos': {
            'max_price': 50000000,
            'required_words': ['vehiculo', 'auto', 'carro', 'moto', 'bicicleta', 'transporte'],
            'banned_words': ['sin papeles', 'chocado grave', 'inundado', 'robado'],
            'min_description_length': 50,
            'suspicious_patterns': [
                r'papeles\s+en\s+tramite\s+hace\s+años',
                r'motor\s+fundido\s+pero',
                r'sin\s+revision\s+tecnica\s+desde'
            ]
        },
        
        'Varios': {
            'max_price': 10000000,  # Precio más alto para categoría general
            'required_words': [],  # Sin palabras requeridas específicas
            'banned_words': [],  # Solo palabras globales
            'min_description_length': 20,
            'suspicious_patterns': [
                r'producto\s+misterioso',
                r'no\s+puedo\s+decir\s+que\s+es'
            ]
        }
    }
    
    def __init__(self):
        """Inicializa el moderador de categorías."""
        pass
    
    def moderate_product(self, product: Product) -> Tuple[bool, str]:
        """
        Modera un producto basado en su categoría.
        
        Args:
            product: El producto a moderar
            
        Returns:
            Tuple[bool, str]: (es_aprobado, motivo_si_rechazado)
        """
        try:
            category_name = product.category.name if product.category else 'Varios'
            
            # Si la categoría no existe en las reglas, usar 'Varios'
            if category_name not in self.CATEGORY_RULES:
                category_name = 'Varios'
            
            rules = self.CATEGORY_RULES[category_name]
            
            # Combinar título y descripción para análisis
            content = f"{product.title} {product.description}".lower()
            
            # 1. Verificar palabras prohibidas globales
            rejection_reason = self._check_global_banned_words(content)
            if rejection_reason:
                return False, f"[{category_name}] {rejection_reason}"
            
            # 2. Verificar palabras prohibidas específicas de la categoría
            rejection_reason = self._check_category_banned_words(content, rules['banned_words'], category_name)
            if rejection_reason:
                return False, rejection_reason
            
            # 3. Verificar precio máximo
            if product.price > rules['max_price']:
                return False, f"[{category_name}] El precio ${product.price:,} supera el límite máximo de ${rules['max_price']:,} para esta categoría."
            
            # 4. Verificar longitud mínima de descripción
            if len(product.description) < rules['min_description_length']:
                return False, f"[{category_name}] La descripción debe tener al menos {rules['min_description_length']} caracteres. Actual: {len(product.description)} caracteres."
            
            # 5. Verificar palabras requeridas (solo si están definidas)
            if rules['required_words']:
                rejection_reason = self._check_required_words(content, rules['required_words'], category_name)
                if rejection_reason:
                    return False, rejection_reason
            
            # 6. Verificar patrones sospechosos
            rejection_reason = self._check_suspicious_patterns(content, rules['suspicious_patterns'], category_name)
            if rejection_reason:
                return False, rejection_reason
            
            # Si pasa todas las verificaciones, aprobar
            return True, ""
            
        except Exception as e:
            # En caso de error, rechazar por seguridad
            return False, f"Error en la moderación: {str(e)}"
    
    def _check_global_banned_words(self, content: str) -> Optional[str]:
        """Verifica palabras prohibidas globales."""
        for word in self.GLOBAL_BANNED_WORDS:
            if word.lower() in content:
                return f"Contiene contenido prohibido: '{word}'. Los productos con este tipo de contenido no están permitidos en UOH Market."
        return None
    
    def _check_category_banned_words(self, content: str, banned_words: List[str], category: str) -> Optional[str]:
        """Verifica palabras prohibidas específicas de la categoría."""
        for word in banned_words:
            if word.lower() in content:
                return f"[{category}] Contiene términos no permitidos para esta categoría: '{word}'."
        return None
    
    def _check_required_words(self, content: str, required_words: List[str], category: str) -> Optional[str]:
        """Verifica que el contenido tenga al menos una palabra requerida."""
        has_required_word = any(word.lower() in content for word in required_words)
        if not has_required_word:
            words_list = "', '".join(required_words[:5])  # Mostrar máximo 5 ejemplos
            return f"[{category}] El producto debe incluir al menos uno de estos términos relacionados con la categoría: '{words_list}'"
        return None
    
    def _check_suspicious_patterns(self, content: str, patterns: List[str], category: str) -> Optional[str]:
        """Verifica patrones sospechosos usando regex."""
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return f"[{category}] El contenido contiene patrones sospechosos que podrían indicar actividad no permitida."
        return None
    
    def get_category_info(self, category_name: str) -> Dict:
        """Obtiene información sobre las reglas de una categoría."""
        if category_name not in self.CATEGORY_RULES:
            category_name = 'Varios'
        
        rules = self.CATEGORY_RULES[category_name]
        return {
            'category': category_name,
            'max_price': rules['max_price'],
            'min_description_length': rules['min_description_length'],
            'required_words_count': len(rules['required_words']),
            'banned_words_count': len(rules['banned_words']),
            'suspicious_patterns_count': len(rules['suspicious_patterns'])
        }


# Instancia global del moderador
category_moderator = CategoryModerator()


def moderate_product_by_category(product: Product) -> Tuple[bool, str]:
    """
    Función de conveniencia para moderar un producto.
    
    Args:
        product: El producto a moderar
        
    Returns:
        Tuple[bool, str]: (es_aprobado, motivo_si_rechazado)
    """
    return category_moderator.moderate_product(product)
