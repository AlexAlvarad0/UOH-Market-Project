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
            'suplementos no aprobados'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 100000,
        'food_safety_required': True
    },
    
    'Deportes y Outdoor': {
        'allowed_keywords': [
            'pelota', 'balón', 'raqueta', 'bicicleta', 'patines', 'casco', 'protecciones',
            'zapatillas deportivas', 'ropa deportiva', 'running', 'fitness', 'gym', 'pesas',
            'mancuernas', 'barra', 'colchoneta', 'esterilla', 'yoga', 'pilates',
            'camping', 'carpa', 'saco de dormir', 'mochila', 'trekking', 'senderismo',
            'escalada', 'montañismo', 'esquí', 'snowboard', 'surf', 'kayak', 'natación',
            'buceo', 'pesca', 'caña', 'anzuelo', 'red', 'cooler', 'termo'
        ],
        'forbidden_keywords': [
            'armas de caza', 'rifle de caza', 'escopeta de caza', 'munición',
            'cuchillo de supervivencia con filo peligroso', 'trampa para animales'
        ],
        'forbidden_general': ['drogas', 'armas letales', 'contenido sexual', 'ilegal'],
        'max_price': 2000000,
        'allow_hunting_gear': False  # No permitir equipo de caza
    },
    
    'Electrodomésticos': {
        'allowed_keywords': [
            'refrigerador', 'nevera', 'lavadora', 'secadora', 'lavavajillas', 'microondas',
            'horno', 'estufa', 'cocina', 'campana', 'extractor', 'aspiradora', 'plancha',
            'televisor', 'tv', 'monitor', 'aire acondicionado', 'calefactor', 'ventilador',
            'purificador', 'humidificador', 'licuadora', 'batidora', 'procesadora', 'cafetera',
            'tostadora', 'sandwichera', 'freidora', 'olla arrocera', 'multiprocesadora'
        ],
        'forbidden_keywords': [],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 3000000,
        'require_warranty_info': True
    },
    
    'Entradas y Eventos': {
        'allowed_keywords': [
            'entrada', 'ticket', 'boleto', 'concierto', 'festival', 'teatro', 'cine',
            'evento', 'espectáculo', 'show', 'fiesta', 'cumpleaños', 'graduación',
            'conferencia', 'seminario', 'taller', 'curso', 'deportivo', 'partido',
            'fútbol', 'básquet', 'tenis', 'estadio', 'arena', 'sala', 'auditorio'
        ],
        'forbidden_keywords': [
            'reventa ilegal', 'sobreprecio excesivo', 'especulación'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 500000,
        'check_event_legitimacy': True
    },
    
    'Hogar y Dormitorio': {
        'allowed_keywords': [
            'cama', 'colchón', 'almohada', 'sábanas', 'frazada', 'edredón', 'cortinas',
            'muebles', 'mesa', 'silla', 'escritorio', 'estante', 'librero', 'ropero',
            'cómoda', 'velador', 'lámpara', 'iluminación', 'decoración', 'cuadros',
            'espejos', 'plantas', 'maceteros', 'jarrones', 'cojines', 'alfombras',
            'organizadores', 'cajas', 'canastos', 'perchas', 'ganchos'
        ],
        'forbidden_keywords': [],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 2000000,
        'furniture_condition_required': True
    },
    
    'Relojes y Joyas': {
        'allowed_keywords': [
            'reloj', 'collar', 'pulsera', 'anillo', 'aros', 'pendientes', 'cadena',
            'dije', 'charm', 'oro', 'plata', 'acero', 'titanio', 'cuero', 'silicona',
            'cristal', 'cuarzo', 'automático', 'digital', 'analógico', 'cronógrafo',
            'resistente al agua', 'sumergible', 'deportivo', 'elegante', 'casual'
        ],
        'forbidden_keywords': [
            'falsificación', 'replica', 'copia', 'imitación', 'fake', 'pirateado'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 5000000,
        'authenticity_required': True
    },
    
    'Instrumentos Musicales': {
        'allowed_keywords': [
            'guitarra', 'piano', 'teclado', 'batería', 'bajo', 'violín', 'viola', 'cello',
            'flauta', 'saxofón', 'trompeta', 'trombón', 'clarinete', 'oboe', 'acordeón',
            'armónica', 'ukulele', 'mandolina', 'banjo', 'amplificador', 'parlante',
            'micrófono', 'audífonos', 'mezcladora', 'interface', 'cuerdas', 'picks',
            'baquetas', 'partituras', 'método', 'libro musical', 'atril', 'estuche'
        ],
        'forbidden_keywords': [],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 3000000,
        'condition_details_required': True
    },
    
    'Juegos y Entretenimiento': {
        'allowed_keywords': [
            'videojuegos', 'consola', 'playstation', 'xbox', 'nintendo', 'pc', 'steam',
            'juego', 'board game', 'mesa', 'cartas', 'poker', 'uno', 'monopoly',
            'puzzle', 'rompecabezas', 'lego', 'bloques', 'construcción', 'coleccionables',
            'figuras', 'muñecos', 'acción', 'anime', 'manga', 'cómics', 'libros',
            'novelas', 'ciencia ficción', 'fantasía', 'misterio', 'romance'
        ],
        'forbidden_keywords': [
            'apuestas', 'gambling', 'casino', 'dinero real', 'cuentas hackeadas',
            'trampas', 'cheats pagados', 'bots', 'hacks'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual explícito', 'ilegal'],
        'max_price': 1000000,
        'age_rating_check': True
    },
    
    'Libros, película y música': {
        'allowed_keywords': [
            'libro', 'novela', 'ensayo', 'poesía', 'biografía', 'historia', 'ciencia',
            'ficción', 'autoayuda', 'cocina', 'arte', 'fotografía', 'música', 'película',
            'dvd', 'blu-ray', 'cd', 'vinilo', 'cassette', 'digital', 'ebook', 'pdf',
            'audiolibro', 'podcast', 'serie', 'documental', 'animación', 'infantil'
        ],
        'forbidden_keywords': [
            'piratería', 'copia ilegal', 'descarga ilegal', 'torrent', 'crack',
            'contenido pirateado', 'bootleg', 'grabación no autorizada'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual explícito', 'ilegal'],
        'max_price': 200000,
        'copyright_check': True
    },
    
    'Mascotas': {
        'allowed_keywords': [
            'perro', 'gato', 'cachorro', 'gatito', 'adopción', 'rescate', 'collar',
            'correa', 'juguete', 'pelota', 'hueso', 'comida', 'alimento', 'croquetas',
            'arena', 'cama', 'casa', 'transportadora', 'jaula', 'pecera', 'acuario',
            'hamster', 'conejo', 'ave', 'pájaro', 'pez', 'tortuga', 'vitaminas',
            'medicamentos veterinarios', 'shampoo', 'cepillo', 'cortauñas'
        ],
        'forbidden_keywords': [
            'venta de animales', 'criadero ilegal', 'animales exóticos ilegales',
            'tráfico de animales', 'caza', 'maltrato', 'peleas de animales',
            'medicamentos no veterinarios', 'drogas para animales'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 300000,
        'animal_welfare_check': True,
        'require_vaccination_proof': True
    },
    
    'Ropa y Accesorios': {
        'allowed_keywords': [
            'camisa', 'camiseta', 'polera', 'pantalón', 'jeans', 'vestido', 'falda',
            'chaqueta', 'abrigo', 'sweater', 'hoodie', 'zapatos', 'zapatillas', 'botas',
            'sandalias', 'bolso', 'cartera', 'mochila', 'cinturón', 'gorro', 'sombrero',
            'bufanda', 'guantes', 'calcetines', 'ropa interior', 'pijama', 'deportiva',
            'formal', 'casual', 'vintage', 'nuevo', 'usado', 'marca', 'talla', 'color'
        ],
        'forbidden_keywords': [
            'falsificación', 'replica', 'copia', 'imitación', 'fake', 'ropa usada sucia',
            'ropa interior usada', 'fetiche'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 500000,
        'condition_description_required': True
    },
    
    'Servicios Estudiantiles': {
        'allowed_keywords': [
            'tutoría', 'clases', 'apoyo académico', 'matemáticas', 'física', 'química',
            'biología', 'historia', 'lenguaje', 'inglés', 'francés', 'alemán', 'programación',
            'computación', 'diseño', 'arquitectura', 'ingeniería', 'medicina', 'derecho',
            'psicología', 'preparación psu', 'preparación examen', 'tesis', 'ensayo',
            'corrección', 'traducción', 'transcripción', 'digitación', 'investigación'
        ],
        'forbidden_keywords': [
            'hacer tareas por ti', 'exámenes por ti', 'suplantación', 'fraude académico',
            'plagio', 'copia', 'trampa', 'cheat', 'respuestas de examen', 'trabajos hechos'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 100000,
        'academic_integrity_required': True
    },
    
    'Tecnología': {
        'allowed_keywords': [
            'computador', 'laptop', 'pc', 'mac', 'tablet', 'ipad', 'celular', 'smartphone',
            'iphone', 'android', 'samsung', 'huawei', 'xiaomi', 'auriculares', 'parlante',
            'cámara', 'fotografía', 'video', 'drone', 'smartwatch', 'reloj inteligente',
            'cargador', 'cable', 'adaptador', 'memoria', 'usb', 'disco duro', 'ssd',
            'procesador', 'gpu', 'ram', 'monitor', 'teclado', 'mouse', 'gaming'
        ],
        'forbidden_keywords': [
            'falsificación', 'replica', 'copia', 'imitación', 'fake', 'robado',
            'bloqueado', 'reportado', 'icloud', 'cuenta google', 'hackeado', 'liberado ilegalmente'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 5000000,
        'imei_check_required': True,
        'warranty_info_required': True
    },
    
    'Vehículos': {
        'allowed_keywords': [
            'auto', 'carro', 'automóvil', 'moto', 'motocicleta', 'bicicleta', 'scooter',
            'patineta', 'skate', 'patines', 'repuestos', 'neumáticos', 'llantas',
            'aceite', 'filtro', 'batería', 'alternador', 'frenos', 'amortiguadores',
            'escape', 'motor', 'transmisión', 'carrocería', 'pintura', 'tapicería',
            'audio', 'stereo', 'gps', 'alarma', 'seguridad', 'mantenimiento'
        ],
        'forbidden_keywords': [
            'sin papeles', 'sin documentos', 'robado', 'chocado grave', 'inundado',
            'accidentado sin reparar', 'multas impagas', 'prenda sin liberar',
            'documentos falsos', 'clonado', 'gemelo'
        ],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual', 'ilegal'],
        'max_price': 50000000,
        'legal_documentation_required': True,
        'technical_inspection_required': True
    },
    
    'Varios': {
        'allowed_keywords': [],  # Acepta todo lo que no esté prohibido
        'forbidden_keywords': [],
        'forbidden_general': ['drogas', 'armas', 'contenido sexual explícito', 'ilegal'],
        'max_price': 10000000,
        'general_moderation': True,  # Aplicar todas las reglas generales
        'strict_image_analysis': True
    }
}

def moderate_content_by_category(title, description, image_paths, category_name=None):
    """
    Función avanzada de moderación que adapta los criterios según la categoría del producto.
    """
    try:
        logger.info(f"Moderando producto por categoría - Título: {title}, Categoría: {category_name}")
        
        # Si no se especifica categoría, usar 'Varios' como fallback
        if not category_name or category_name not in CATEGORY_MODERATION_RULES:
            category_name = 'Varios'
            logger.warning(f"Categoría no especificada o inválida, usando 'Varios' como fallback")
        
        rules = CATEGORY_MODERATION_RULES[category_name]
        texto_completo = (title + " " + description).lower()
        
        # 1. Verificar palabras clave prohibidas específicas de la categoría
        for keyword in rules.get('forbidden_keywords', []):
            if keyword.lower() in texto_completo:
                return {
                    "approved": False, 
                    "reason": f"Contenido no permitido en categoría '{category_name}': se detectó '{keyword}'"
                }
        
        # 2. Verificar palabras clave prohibidas generales
        forbidden_general_expanded = {
            'drogas': [
                'marihuana', 'cocaína', 'lsd', 'éxtasis', 'heroína', 'metanfetamina', 
                'cannabis', 'porro', 'weed', 'mota', 'hierba', 'droga', 'narcótico',
                'crack', 'cristal', 'speed', 'molly', 'xanax', 'kush', 'thc', 'cbd'
            ],
            'armas': [
                'pistola', 'revólver', 'fusil', 'escopeta', 'munición', 'balas', 'explosivos',
                'granada', 'arma', 'rifle', 'glock', 'beretta', 'ak-47', 'ar-15'
            ],
            'contenido sexual': [
                'pornografía', 'escort', 'prostitución', 'servicios sexuales', 'xxx',
                'contenido para adultos', 'erótico', 'onlyfans'
            ],
            'ilegal': [
                'documentos falsos', 'dinero falso', 'productos robados', 'falsificación',
                'fraude', 'estafa', 'hack', 'phishing', 'tarjetas clonadas'
            ]
        }
        
        for category_forbidden in rules.get('forbidden_general', []):
            if category_forbidden in forbidden_general_expanded:
                for keyword in forbidden_general_expanded[category_forbidden]:
                    if keyword in texto_completo:
                        return {
                            "approved": False,
                            "reason": f"Contenido inapropiado detectado: {keyword} (categoría: {category_forbidden})"
                        }
        
        # 3. Verificar palabras clave requeridas (para algunas categorías)
        required_keywords = rules.get('required_keywords', [])
        if required_keywords:
            has_required = any(keyword.lower() in texto_completo for keyword in required_keywords)
            if not has_required:
                return {
                    "approved": False,
                    "reason": f"Para la categoría '{category_name}' se requiere incluir al menos una de estas palabras: {', '.join(required_keywords)}"
                }
        
        # 4. Verificar precio máximo
        max_price = rules.get('max_price')
        if max_price:
            # Buscar números en el texto que podrían ser precios
            import re
            prices = re.findall(r'\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)', texto_completo)
            for price_str in prices:
                try:
                    # Limpiar y convertir precio
                    price_clean = price_str.replace(',', '').replace('.', '')
                    price_value = int(price_clean)
                    if price_value > max_price:
                        return {
                            "approved": False,
                            "reason": f"El precio excede el máximo permitido para la categoría '{category_name}' (máximo: ${max_price:,})"
                        }
                except:
                    continue
        
        # 5. Análisis de imágenes (si está habilitado para la categoría)
        if rules.get('image_analysis', False) or rules.get('strict_image_analysis', False):
            strict_mode = rules.get('strict_image_analysis', False)
            
            for image_path in image_paths:
                if not os.path.exists(image_path):
                    logger.warning(f"Imagen no encontrada: {image_path}")
                    continue
                
                try:
                    image_analysis = analyze_image_content(image_path)
                    
                    if not image_analysis["is_appropriate"]:
                        return {
                            "approved": False,
                            "reason": f"Imagen inapropiada detectada: {image_analysis['reason']}"
                        }
                    
                    # Para categorías con análisis estricto, verificar contenido específico
                    if strict_mode:
                        # Aquí se puede agregar análisis más específico por categoría
                        pass
                        
                except Exception as e:
                    logger.error(f"Error analizando imagen {image_path}: {str(e)}")
                    if strict_mode:
                        return {
                            "approved": False,
                            "reason": "Error al procesar imagen del producto"
                        }
        
        # 6. Verificaciones específicas por categoría
        if category_name == 'Mascotas' and rules.get('animal_welfare_check'):
            animal_sale_indicators = ['vendo', 'venta', 'precio', 'cachorro en venta', 'gatito en venta']
            if any(indicator in texto_completo for indicator in animal_sale_indicators):
                if 'adopción' not in texto_completo and 'rescate' not in texto_completo:
                    return {
                        "approved": False,
                        "reason": "La venta de animales no está permitida. Solo se permite promocionar adopciones responsables."
                    }
        
        elif category_name == 'Servicios Estudiantiles' and rules.get('academic_integrity_required'):
            academic_fraud_indicators = [
                'hago tu tarea', 'examen por ti', 'trabajo listo', 'respuestas correctas',
                'garantizo nota', 'aprueba seguro'
            ]
            if any(indicator in texto_completo for indicator in academic_fraud_indicators):
                return {
                    "approved": False,
                    "reason": "No se permite ofrecer servicios que comprometan la integridad académica."
                }
        
        elif category_name == 'Tecnología' and rules.get('imei_check_required'):
            suspicious_phone_indicators = ['liberado', 'desbloqueado', 'sin icloud', 'sin cuenta google', 'reportado']
            if any(indicator in texto_completo for indicator in suspicious_phone_indicators):
                return {
                    "approved": False,
                    "reason": "Descripción sugiere posible dispositivo con problemas legales. Incluye información de garantía y procedencia."
                }
        
        logger.info(f"Moderación por categoría completada: Contenido aprobado para '{category_name}'")
        return {"approved": True}
        
    except Exception as e:
        logger.error(f"Error en la moderación por categoría: {str(e)}")
        return {"approved": False, "reason": f"Error en la moderación: {str(e)}"}


# Mantener la función original para compatibilidad
def moderate_content(title, description, image_paths, category_name=None):
    """
    Función de moderación que redirige a la nueva función por categorías.
    Mantiene compatibilidad con el código existente.
    """
    return moderate_content_by_category(title, description, image_paths, category_name)
