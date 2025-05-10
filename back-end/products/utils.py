import os
import logging
import numpy as np
import cv2
import tempfile
from PIL import Image
from io import BytesIO
import base64
from skimage import feature
from django.conf import settings

logger = logging.getLogger(__name__)

# Variables de configuración de sensibilidad (ajustar estos valores para hacer la detección más o menos sensible)
SENSITIVITY = {
    'cannabis': 0.6,   # Mayor valor = más sensible
    'powder': 0.7,
    'pills': 0.65
}

def ensure_image_readable(image_path):
    """
    Asegura que la imagen existe y es legible. Si hay problemas, intenta soluciones alternativas.
    """
    if not os.path.exists(image_path):
        logger.error(f"Imagen no encontrada: {image_path}")
        return None
    
    try:
        # Intentar con OpenCV primero
        img = cv2.imread(image_path)
        if img is None:
            # Si OpenCV falla, intentar con PIL
            img_pil = Image.open(image_path)
            # Convertir de PIL a formato OpenCV
            img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        return img
    except Exception as e:
        logger.error(f"Error al leer imagen {image_path}: {str(e)}")
        return None

def detect_cannabis(image_path, sensitivity=SENSITIVITY['cannabis']):
    """
    Detector mejorado de cannabis que combina múltiples técnicas y características
    """
    try:
        # Asegurar que la imagen se cargue correctamente
        img = ensure_image_readable(image_path)
        if img is None:
            return False
            
        # Convertir a HSV para mejor análisis de color
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Definir múltiples rangos para el cannabis (desde verde claro a verde oscuro)
        green_masks = []
        
        # Verde claro-medio (hojas frescas)
        lower_green1 = np.array([35, 40, 40])
        upper_green1 = np.array([85, 255, 255])
        green_masks.append(cv2.inRange(hsv, lower_green1, upper_green1))
        
        # Verde oscuro (cogollos densos)
        lower_green2 = np.array([85, 30, 30])
        upper_green2 = np.array([100, 255, 255])
        green_masks.append(cv2.inRange(hsv, lower_green2, upper_green2))
        
        # Marrón verdoso (cannabis seco)
        lower_brown = np.array([15, 30, 30])
        upper_brown = np.array([35, 255, 200])
        green_masks.append(cv2.inRange(hsv, lower_brown, upper_brown))
        
        # Combinar máscaras
        combined_mask = np.zeros_like(green_masks[0])
        for mask in green_masks:
            combined_mask = cv2.bitwise_or(combined_mask, mask)
        
        # Calcular porcentaje de píxeles en el rango adecuado
        green_ratio = np.sum(combined_mask > 0) / (img.shape[0] * img.shape[1])
        
        # Aplicar operaciones morfológicas para destacar la estructura
        kernel = np.ones((5, 5), np.uint8)
        processed_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
        processed_mask = cv2.morphologyEx(processed_mask, cv2.MORPH_CLOSE, kernel)
        
        # Encontrar contornos en la máscara
        contours, _ = cv2.findContours(processed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Características específicas de cannabis
        leaf_like_contours = 0
        bud_like_blobs = 0
        serrated_edges = 0
        
        # Analizar cada contorno
        for contour in contours:
            if cv2.contourArea(contour) < 300:  # Ignorar contornos muy pequeños
                continue
                
            # Calcular perímetro y área
            perimeter = cv2.arcLength(contour, True)
            area = cv2.contourArea(contour)
            
            # Circularidad (baja para hojas, alta para cogollos)
            circularity = 4 * np.pi * area / (perimeter ** 2) if perimeter > 0 else 0
            
            # Detectar formas como hojas (baja circularidad)
            if 0.1 < circularity < 0.5:
                leaf_like_contours += 1
                
                # Aproximar contorno para detectar bordes serrados (característicos de cannabis)
                epsilon = 0.02 * perimeter
                approx = cv2.approxPolyDP(contour, epsilon, True)
                if len(approx) > 10:  # Muchos bordes/puntas
                    serrated_edges += 1
            
            # Detectar formas como cogollos (alta circularidad pero textura irregular)
            elif 0.5 <= circularity < 0.85:
                # Crear una máscara para este contorno
                contour_mask = np.zeros_like(processed_mask)
                cv2.drawContours(contour_mask, [contour], 0, 255, -1)
                
                # Calcular textura en esta región
                masked_gray = cv2.bitwise_and(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 
                                             cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 
                                             mask=contour_mask)
                if np.sum(contour_mask > 0) > 0:  # Evitar división por cero
                    texture_variance = np.var(masked_gray[contour_mask > 0])
                    # Los cogollos tienen textura irregular (alta varianza)
                    if texture_variance > 200:
                        bud_like_blobs += 1
        
        # Calcular características de textura en la imagen completa
        if processed_mask.any():  # Verificar que hay regiones de interés
            # Crear una versión redimensionada para análisis
            height, width = img.shape[:2]
            target_size = min(256, min(height, width))
            scale = target_size / min(height, width)
            dim = (int(width * scale), int(height * scale))
            resized = cv2.resize(img, dim)
            
            # Convertir a escala de grises
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            
            # Calcular características HOG
            try:
                hog_features = feature.hog(gray, orientations=9, pixels_per_cell=(8, 8),
                                          cells_per_block=(2, 2), visualize=False)
                
                # La varianza de características HOG es alta para cannabis
                feature_variance = np.var(hog_features)
            except Exception as e:
                logger.error(f"Error calculando HOG: {str(e)}")
                feature_variance = 0
                
            # Calcular la entropía de la imagen (medida de complejidad)
            histogram = cv2.calcHist([gray], [0], None, [256], [0, 256])
            histogram = histogram / histogram.sum()
            entropy = -np.sum(histogram * np.log2(histogram + 1e-7))
            
            # Registrar todos los valores para depuración
            logger.info(f"Análisis cannabis - Verde: {green_ratio:.2f}, Hojas: {leaf_like_contours}, "
                        f"Cogollos: {bud_like_blobs}, Bordes: {serrated_edges}, "
                        f"Varianza HOG: {feature_variance:.4f}, Entropía: {entropy:.2f}")
            
            # Sistema de puntuación ponderado
            score = 0
            score += green_ratio * 2.0  # El color verde es importante
            score += min(leaf_like_contours, 5) * 0.2  # Máximo 1.0 por hojas
            score += min(bud_like_blobs, 3) * 0.3  # Máximo 0.9 por cogollos
            score += min(serrated_edges, 3) * 0.2  # Máximo 0.6 por bordes serrados
            score += min(feature_variance, 0.02) * 30  # Máximo 0.6 por textura HOG
            
            # Umbral de puntuación ajustable
            threshold = 1.0 * sensitivity
            
            if score >= threshold:
                logger.warning(f"Cannabis detectado en {image_path} (puntuación: {score:.2f})")
                return True
    
    except Exception as e:
        logger.error(f"Error en detección de cannabis: {str(e)}")
    
    return False

def detect_powder_substances(image_path, sensitivity=SENSITIVITY['powder']):
    """
    Detector avanzado para sustancias en polvo (cocaína, etc.)
    """
    try:
        # Asegurar que la imagen se cargue correctamente
        img = ensure_image_readable(image_path)
        if img is None:
            return False
            
        # Convertir a escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Suavizar la imagen
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Aplicar umbral adaptativo
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                      cv2.THRESH_BINARY, 11, 2)
        
        # Dilatación seguida de erosión para cerrar pequeños huecos
        kernel = np.ones((3, 3), np.uint8)
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Calcular porcentaje de píxeles blancos (áreas de polvo)
        white_ratio = np.sum(closed > 200) / (img.shape[0] * img.shape[1])
        
        # Detectar líneas específicas (común en disposición de drogas en polvo)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=50, maxLineGap=10)
        
        horizontal_lines = 0
        horizontal_line_lengths = []
        
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
                
                # Contar líneas horizontales (±20 grados)
                if angle < 20 or angle > 160:
                    horizontal_lines += 1
                    horizontal_line_lengths.append(length)
        
        # Características de textura para polvo
        texture_score = 0
        
        # LBP (Local Binary Pattern)
        try:
            from skimage.feature import local_binary_pattern
            radius = 3
            n_points = 8 * radius
            lbp = local_binary_pattern(gray, n_points, radius, method='uniform')
            
            # Histograma LBP
            hist, _ = np.histogram(lbp.ravel(), bins=np.arange(0, n_points + 3), 
                                  range=(0, n_points + 2))
            hist = hist.astype("float")
            hist /= (hist.sum() + 1e-7)
            
            # Entropía de textura (baja para superficies homogéneas como polvo)
            texture_entropy = -np.sum(hist * np.log2(hist + 1e-7))
            
            # Superficies de polvo tienen entropía baja-media
            if texture_entropy < 4.0:
                texture_score += (4.0 - texture_entropy) / 4.0
                
        except Exception as tex_err:
            logger.error(f"Error en análisis de textura: {str(tex_err)}")
            
        # Analizar disposición típica de drogas en polvo
        line_pattern_score = 0
        if horizontal_lines >= 2:
            # Las líneas de polvo suelen ser paralelas y de longitud similar
            if len(horizontal_line_lengths) >= 2:
                # Calcular la desviación estándar de longitudes (baja para líneas similares)
                line_std = np.std(horizontal_line_lengths)
                line_mean = np.mean(horizontal_line_lengths)
                line_cv = line_std / line_mean if line_mean > 0 else 0
                
                # Coeficiente de variación bajo indica líneas de longitud similar
                if line_cv < 0.3:
                    line_pattern_score += 0.5
                    
                # Si hay varias líneas horizontales largas y similares
                if line_mean > min(img.shape[0], img.shape[1]) * 0.15 and horizontal_lines >= 3:
                    line_pattern_score += 0.5
        
        # Registrar valores para depuración
        logger.info(f"Análisis polvo - Blanco: {white_ratio:.2f}, Líneas H: {horizontal_lines}, "
                   f"Textura: {texture_score:.2f}, Patrón líneas: {line_pattern_score:.2f}")
        
        # Sistema de puntuación ponderado
        score = 0
        score += min(white_ratio * 1.5, 1.0)  # Máximo 1.0 por áreas blancas
        score += min(horizontal_lines * 0.15, 0.9)  # Máximo 0.9 por líneas horizontales
        score += texture_score * 0.8  # Máximo 0.8 por textura homogénea
        score += line_pattern_score  # Máximo 1.0 por patrones de líneas
        
        # Umbral ajustable
        threshold = 1.4 * sensitivity
            
        if score >= threshold:
            logger.warning(f"Sustancia en polvo detectada en {image_path} (puntuación: {score:.2f})")
            return True
            
    except Exception as e:
        logger.error(f"Error en detección de polvo: {str(e)}")
    
    return False

def detect_pills(image_path, sensitivity=SENSITIVITY['pills']):
    """
    Detector mejorado de píldoras y pastillas
    """
    try:
        # Asegurar que la imagen se cargue correctamente
        img = ensure_image_readable(image_path)
        if img is None:
            return False
            
        # Convertir a escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Suavizado para reducir ruido
        blurred = cv2.GaussianBlur(gray, (7, 7), 2)
        
        # Detectar varios tipos de píldoras
        pill_score = 0
        
        # 1. Detectar círculos (píldoras redondas)
        try:
            circles = cv2.HoughCircles(blurred, cv2.HOUGH_GRADIENT, dp=1.2, minDist=20,
                                   param1=50, param2=30, minRadius=10, maxRadius=50)
            
            circle_count = 0
            if circles is not None:
                circles = np.uint16(np.around(circles))
                circle_count = len(circles[0])
                pill_score += min(circle_count * 0.25, 1.0)  # Máximo 1.0 por círculos
        except Exception as circle_err:
            logger.error(f"Error detectando círculos: {str(circle_err)}")
        
        # 2. Detectar contornos regulares (píldoras no circulares)
        try:
            # Umbral adaptativo para mejor segmentación
            thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                          cv2.THRESH_BINARY_INV, 11, 2)
            
            # Mejorar con operaciones morfológicas
            kernel = np.ones((3, 3), np.uint8)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            regular_shapes = 0
            for contour in contours:
                # Ignorar contornos muy pequeños
                if cv2.contourArea(contour) < 200:
                    continue
                    
                # Características de forma
                perimeter = cv2.arcLength(contour, True)
                area = cv2.contourArea(contour)
                
                # Circularidad
                circularity = 4 * np.pi * area / (perimeter ** 2) if perimeter > 0 else 0
                
                # Aproximar contorno
                epsilon = 0.04 * perimeter
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Rectángulo delimitador
                rect = cv2.minAreaRect(contour)
                width, height = rect[1]
                aspect_ratio = max(width, height) / min(width, height) if min(width, height) > 0 else 0
                
                # Píldoras suelen tener formas regulares: circulares, ovaladas o rectangulares
                if ((0.7 < circularity <= 1.0) or  # Circular u ovalado
                    (len(approx) == 4 and 1.0 < aspect_ratio < 2.5)):  # Rectangular con esquinas redondeadas
                    regular_shapes += 1
            
            pill_score += min(regular_shapes * 0.2, 1.0)  # Máximo 1.0 por formas regulares
            
        except Exception as contour_err:
            logger.error(f"Error analizando contornos: {str(contour_err)}")
        
        # 3. Detectar líneas de separación (común en tabletas)
        try:
            edges = cv2.Canny(blurred, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, 
                                   minLineLength=min(img.shape[0], img.shape[1])//10,
                                   maxLineGap=10)
            
            if lines is not None and len(lines) > 0:
                pill_score += min(len(lines) * 0.05, 0.5)  # Máximo 0.5 por líneas
        except Exception as line_err:
            logger.error(f"Error detectando líneas: {str(line_err)}")
        
        # 4. Comprobar agrupación de objetos (píldoras suelen estar agrupadas)
        clustering_score = 0
        if len(contours) >= 3:
            # Calcular centroides
            centroids = []
            for contour in contours:
                if cv2.contourArea(contour) >= 200:
                    M = cv2.moments(contour)
                    if M["m00"] != 0:
                        cX = int(M["m10"] / M["m00"])
                        cY = int(M["m01"] / M["m00"])
                        centroids.append((cX, cY))
            
            # Analizar la distribución espacial
            if len(centroids) >= 3:
                from scipy.spatial import distance
                
                # Calcular distancias entre centroides
                distances = []
                for i in range(len(centroids)):
                    for j in range(i + 1, len(centroids)):
                        distances.append(distance.euclidean(centroids[i], centroids[j]))
                
                # Calcular estadísticas de distancias
                if distances:
                    mean_dist = np.mean(distances)
                    std_dist = np.std(distances)
                    cv_dist = std_dist / mean_dist if mean_dist > 0 else 0
                    
                    # Píldoras suelen estar distribuidas uniformemente
                    if cv_dist < 0.5:
                        clustering_score = min(1.0, (0.5 - cv_dist) * 2)
        
        pill_score += clustering_score
        
        logger.info(f"Análisis píldoras - Puntuación: {pill_score:.2f}")
        
        # Umbral ajustable
        threshold = 1.2 * sensitivity
        
        if pill_score >= threshold:
            logger.warning(f"Píldoras detectadas en {image_path} (puntuación: {pill_score:.2f})")
            return True
            
    except Exception as e:
        logger.error(f"Error en detección de píldoras: {str(e)}")
    
    return False

def check_image_metadata(image_path):
    """
    Analiza los metadatos de la imagen en busca de información sospechosa
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        
        img = Image.open(image_path)
        
        # Verificar formato
        format_lower = img.format.lower() if img.format else ""
        if format_lower in ["webp", "heic", "heif"]:
            # Estos formatos son comunes en fotos de drogas por su mejor compresión
            logger.info(f"Formato potencialmente sospechoso: {format_lower}")
        
        # Extraer metadatos Exif
        exif_data = {}
        try:
            exif = img._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = TAGS.get(tag_id, tag_id)
                    exif_data[tag] = value
                    
                # Buscar palabras clave sospechosas en metadatos
                suspicious_keywords = [
                    "weed", "marijuana", "cannabis", "coca", "pill", "drug", 
                    "pastilla", "marihuana", "joint", "bong", "pipe"
                ]
                
                for key, value in exif_data.items():
                    if isinstance(value, str):
                        value_lower = value.lower()
                        for keyword in suspicious_keywords:
                            if keyword in value_lower:
                                logger.warning(f"Palabra clave sospechosa en metadatos: {keyword}")
                                return True
        except Exception as exif_err:
            logger.error(f"Error extrayendo Exif: {str(exif_err)}")
        
        # Verificar dimensiones sospechosas (muchas imágenes de drogas son cuadradas)
        width, height = img.size
        aspect_ratio = width / height if height > 0 else 0
        if 0.95 <= aspect_ratio <= 1.05 and width >= 400:
            logger.info(f"Imagen cuadrada de alta resolución: {width}x{height}")
        
    except Exception as e:
        logger.error(f"Error analizando metadatos: {str(e)}")
    
    return False

def analyze_image_content(image_path):
    """
    Analiza el contenido de una imagen para detectar elementos inapropiados
    utilizando técnicas avanzadas de visión por computadora.
    
    Args:
        image_path: Ruta al archivo de imagen
        
    Returns:
        dict: Resultado del análisis con claves 'is_appropriate' y 'labels'
    """
    try:
        logger.info(f"Analizando imagen: {image_path}")
        
        # Verificar si la imagen existe
        if not os.path.exists(image_path):
            logger.warning(f"Imagen no encontrada: {image_path}")
            return {"is_appropriate": True, "labels": [], "reason": ""}
        
        # Primero verificar el nombre del archivo
        filename = os.path.basename(image_path).lower()
        
        # Lista ampliada de palabras clave sospechosas
        drug_keywords = [
            # Cannabis/marihuana
            'marijuana', 'marihuana', 'cannabis', 'weed', 'hierba', 'porro', 
            'joint', 'hash', 'hashish', 'kush', 'sativa', 'indica', 'thc', 'cbd',
            # Cocaína y derivados
            'coca', 'cocaine', 'cocaina', 'crack', 'perico', 'snow', 'blow',
            # Otros estimulantes
            'meth', 'meta', 'crystal', 'speed', 'ice', 'tina', 'adderall', 'ritalin',
            # Opioides
            'heroin', 'heroina', 'fentanyl', 'fentanilo', 'oxy', 'oxycodone',
            'percocet', 'vicodin', 'morphine', 'codeine', 'codeina',
            # Alucinógenos
            'lsd', 'acid', 'acido', 'mdma', 'ecstasy', 'extasis', 'molly',
            'mushroom', 'hongos', 'peyote', 'mescaline',
            # Medicamentos/pastillas
            'pill', 'pastilla', 'xanax', 'valium', 'diazepam', 'benzo',
            # Parafernalia
            'bong', 'pipe', 'grinder', 'needle', 'jeringa', 'syringe',
            # Genéricos
            'drug', 'droga', 'high', 'dope', 'stash', 'dealer'
        ]
        
        # Buscar palabras clave en el nombre del archivo
        for keyword in drug_keywords:
            if keyword in filename:
                logger.warning(f"Palabra clave de drogas encontrada en el nombre del archivo: {keyword}")
                return {
                    "is_appropriate": False, 
                    "labels": ["drugs"], 
                    "reason": f"Nombre de archivo sospechoso ({keyword})"
                }
        
        # Verificar metadatos de la imagen
        if check_image_metadata(image_path):
            return {
                "is_appropriate": False,
                "labels": ["suspicious_metadata"],
                "reason": "La imagen contiene metadatos sospechosos relacionados con drogas"
            }
        
        # Aplicar detectores específicos con sensibilidad ajustada
        if detect_cannabis(image_path, SENSITIVITY['cannabis']):
            return {
                "is_appropriate": False, 
                "labels": ["cannabis"], 
                "reason": "La imagen contiene lo que parece ser cannabis/marihuana"
            }
            
        if detect_powder_substances(image_path, SENSITIVITY['powder']):
            return {
                "is_appropriate": False, 
                "labels": ["white_powder_substance"], 
                "reason": "La imagen contiene lo que parece ser sustancias en polvo"
            }
            
        if detect_pills(image_path, SENSITIVITY['pills']):
            return {
                "is_appropriate": False, 
                "labels": ["pills"], 
                "reason": "La imagen contiene lo que parecen ser pastillas o píldoras"
            }
        
        logger.info("Imagen analizada: No se encontró contenido sospechoso")
        return {"is_appropriate": True, "labels": [], "reason": ""}
        
    except Exception as e:
        logger.error(f"Error analizando imagen {image_path}: {str(e)}")
        # En caso de error, permitimos la imagen para evitar falsos positivos
        return {"is_appropriate": True, "labels": [], "reason": f"Error: {str(e)}"}

def moderate_content(title, description, image_paths):
    """
    Función para moderar contenido utilizando un servicio de IA.
    :param title: Título del producto.
    :param description: Descripción del producto.
    :param image_paths: Lista de rutas de imágenes del producto.
    :return: Diccionario con el resultado de la moderación.
    """
    try:
        logger.info(f"Moderando producto - Título: {title}")
        
        # Lista ampliada de términos inapropiados
        inappropriate_keywords = [
            # Drogas
            "drogas", "marihuana", "cocaína", "lsd", "éxtasis", "heroína", "metanfetamina", 
            "anfetaminas", "mdma", "narcóticos", "estupefacientes", "cannabis", "porro",
            "coca", "crack", "fentanilo", "hachís", "mota", "hierba", "weed", "cristal",
            "speed", "ice", "tina", "oxi", "oxicodona", "percocet", "vicodin", "morfina",
            "codeína", "hongos", "peyote", "mescalina", "molly", "xanax", "valium", "kush",
            "diazepam", "benzo", "lean", "dope", "high", "colocón", "trip", "alucinógeno",
            "estimulante", "sedante", "ácido", "acid", "lsd-25", "thc", "cbd", "fumar",
            "joint", "porro", "bong", "pipe", "grinder", "jeringa", "syringe", "aguja",
            "needle", "dealer", "camello", "trapicheo", "narcotráfico", "dealer",
            
            # Armas
            "armas", "pistola", "revólver", "fusil", "escopeta", "munición", "balas", 
            "explosivos", "granada", "cuchillo táctico", "navaja", "arma blanca",
            "arma de fuego", "rifle", "ametralladora", "silenciador", "glock", "beretta",
            "colt", "smith & wesson", "uzi", "ak-47", "ar-15", "calibre", "magnum",
            "recámara", "cargador", "gatillo", "mira", "explosivo", "c4", "dinamita",
            "pólvora", "municiones", "disparo", "tiroteo", "karambit", "machete",
            "puñal", "daga", "katana", "defensa personal",
            
            # Contenido para adultos
            "desnudos", "pornografía", "contenido sexual", "escorts", "prostitución",
            "servicios sexuales", "contenido para adultos", "xxx", "material explícito",
            "escorts", "pornográfico", "porno", "cam girl", "camgirl", "onlyfans",
            "fetiche", "bdsm", "erótico", "citas para adultos", "escort", "masaje con final feliz",
            "masajes eróticos", "servicios de compañía",
            
            # Contenido ilegal
            "documentos falsos", "pasaportes falsos", "licencias falsas", "dinero falso",
            "piratería", "productos robados", "mercancía robada", "falsificaciones",
            "counterfeit", "hack", "hacking", "crackear", "phishing", "robo de identidad",
            "tarjetas clonadas", "carder", "fraude", "estafa", "scam", "blanqueo", "lavado",
            "certificados falsos", "diplomas falsos", "créditos académicos", "drogas sintéticas",
            "sustancias prohibidas", "esteroides", "anabólicos"
        ]
        
        # Verificar en título y descripción
        texto_completo = (title + " " + description).lower()
        for keyword in inappropriate_keywords:
            if keyword in texto_completo:
                logger.warning(f"Contenido inapropiado detectado: '{keyword}' en el producto")
                return {"approved": False, "reason": f"Contenido inapropiado detectado: {keyword}"}
        
        # Analizar contenido de las imágenes
        for image_path in image_paths:
            # Asegurarse de que la ruta de la imagen existe y es accesible
            if not os.path.exists(image_path):
                logger.warning(f"Imagen no encontrada: {image_path}")
                continue
                
            # Analizar la imagen usando nuestra función avanzada
            image_analysis = analyze_image_content(image_path)
            
            if not image_analysis["is_appropriate"]:
                logger.warning(f"Imagen inapropiada detectada: {image_path} - {image_analysis['reason']}")
                return {"approved": False, "reason": f"Imagen inapropiada detectada: {image_analysis['reason']}"}
        
        logger.info("Moderación completada: Contenido aprobado")
        return {"approved": True}
    except Exception as e:
        logger.error(f"Error en la moderación: {str(e)}")
        return {"approved": False, "reason": f"Error en la moderación: {str(e)}"}