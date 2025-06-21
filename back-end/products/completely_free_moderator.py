import os
import requests
import logging
import base64
from django.conf import settings
from typing import Dict, Any, Union
from PIL import Image
import tempfile
import io

logger = logging.getLogger(__name__)

class OpenCVImageModerator:
    """
    Moderador completamente gratuito y sin límites usando OpenCV y técnicas avanzadas
    """
    
    def __init__(self):
        self.enabled = True
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.7)
        logger.info("OpenCV Image Moderator iniciado - 100% gratuito y sin límites")
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Análisis avanzado completamente gratuito usando OpenCV y técnicas de IA local
        """
        try:
            # Verificar que el archivo existe
            if not os.path.exists(image_path):
                logger.error(f"Imagen no encontrada: {image_path}")
                return {
                    'is_appropriate': False,
                    'confidence': 1.0,
                    'reason': 'Archivo de imagen no encontrado',
                    'api_used': True,
                    'service': 'opencv_local'
                }
            
            # Análisis mejorado con múltiples técnicas
            results = self._analyze_with_multiple_techniques(image_path)
            
            return self._evaluate_opencv_results(results)
            
        except Exception as e:
            logger.error(f"Error en análisis OpenCV: {str(e)}")
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': f'Error en análisis: {str(e)}',
                'api_used': False,
                'service': 'opencv_local'
            }
    
    def _analyze_with_multiple_techniques(self, image_path: str) -> Dict[str, float]:
        """
        Aplica múltiples técnicas de análisis local
        """
        results = {}
        
        try:
            # Importar utilidades locales
            import cv2
            import numpy as np
            from PIL import Image as PILImage
            
            # Cargar imagen
            img = cv2.imread(image_path)
            if img is None:
                return {'error': 1.0}
            
            # 1. Análisis de color para detectar tonos de piel (contenido NSFW)
            skin_ratio = self._detect_skin_tones(img)
            results['skin_detection'] = skin_ratio
            
            # 2. Análisis de formas sospechosas
            suspicious_shapes = self._detect_suspicious_shapes(img)
            results['shape_analysis'] = suspicious_shapes
            
            # 3. Análisis de textura para detectar sustancias
            texture_score = self._analyze_texture_patterns(img)
            results['texture_analysis'] = texture_score
            
            # 4. Análisis de bordes y contornos
            edge_analysis = self._analyze_edges_and_contours(img)
            results['edge_analysis'] = edge_analysis
              # 5. Análisis de metadatos y nombres de archivo
            metadata_score = self._analyze_metadata_and_filename(image_path)
            results['metadata_analysis'] = metadata_score
            
            return results
            
        except Exception as e:
            logger.error(f"Error en análisis múltiple: {str(e)}")
            return {'error': 0.0}
    
    def _detect_skin_tones(self, img) -> float:
        """
        Detecta tonos de piel que podrían indicar contenido NSFW real
        MEJORADO: Distingue entre contenido inapropiado y figuras/arte normal
        """
        try:
            import cv2
            import numpy as np
            
            # Convertir a HSV para mejor detección de piel
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            height, width = img.shape[:2]
            total_pixels = height * width
            
            # Rangos de color para tonos de piel (más específicos)
            skin_ranges = [
                # Piel clara
                (np.array([0, 20, 70]), np.array([20, 150, 255])),
                # Piel media
                (np.array([0, 25, 50]), np.array([15, 170, 255])),
                # Piel oscura
                (np.array([0, 30, 30]), np.array([12, 255, 200]))
            ]
            
            total_skin_pixels = 0
            skin_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
            
            for lower, upper in skin_ranges:
                mask = cv2.inRange(hsv, lower, upper)
                skin_mask = cv2.bitwise_or(skin_mask, mask)
                total_skin_pixels += cv2.countNonZero(mask)
            
            skin_ratio = total_skin_pixels / total_pixels
            
            # NUEVA LÓGICA INTELIGENTE: Análisis contextual
            
            # 1. Si hay muy poca piel (< 15%), probablemente no es NSFW
            if skin_ratio < 0.15:
                return skin_ratio * 0.3  # Reducir significativamente el score
            
            # 2. Analizar distribución de la piel detectada
            contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if len(contours) == 0:
                return 0.0
            
            # 3. Analizar características de las regiones de piel
            large_skin_regions = 0
            connected_skin_area = 0
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > total_pixels * 0.05:  # Regiones grandes de piel (>5% de la imagen)
                    large_skin_regions += 1
                    connected_skin_area += area
            
            # 4. Factores que REDUCEN la sospecha (contenido normal):
            reduction_factors = []
            
            # Factor 1: Si hay muchas regiones pequeñas separadas (figuras/juguetes)
            if len(contours) > 5 and large_skin_regions < 2:
                reduction_factors.append("multiple_small_regions")
                skin_ratio *= 0.4
            
            # Factor 2: Si la piel está en regiones muy pequeñas y dispersas
            avg_contour_size = sum(cv2.contourArea(c) for c in contours) / len(contours)
            if avg_contour_size < total_pixels * 0.02:  # Regiones muy pequeñas
                reduction_factors.append("tiny_regions")
                skin_ratio *= 0.3
            
            # Factor 3: Análisis de colores adyacentes (figuras tienden a tener colores vibrantes)
            # Detectar si hay colores no-naturales cerca de la piel (anime/figuras)
            colors_around_skin = self._analyze_colors_around_skin(img, skin_mask)
            if colors_around_skin['has_vibrant_colors']:
                reduction_factors.append("vibrant_colors")
                skin_ratio *= 0.5
            
            if colors_around_skin['has_unnatural_colors']:
                reduction_factors.append("unnatural_colors")
                skin_ratio *= 0.3
            
            # 5. Factores que AUMENTAN la sospecha (contenido potencialmente inapropiado):
            amplification_factors = []
            
            # Factor 1: Mucha piel concentrada en pocas regiones grandes
            if large_skin_regions >= 2 and connected_skin_area > total_pixels * 0.3:
                amplification_factors.append("large_concentrated_regions")
                skin_ratio *= 1.8
            
            # Factor 2: Muy alta proporción de piel (>40%)
            if skin_ratio > 0.4:
                amplification_factors.append("high_skin_ratio")
                skin_ratio *= 1.5
            
            # 6. Límites finales y logging
            final_score = min(max(skin_ratio, 0.0), 1.0)
            
            # Log para debugging
            if reduction_factors or amplification_factors:
                logger.debug(f"Skin analysis - Original: {total_skin_pixels/total_pixels:.3f}, "
                           f"Final: {final_score:.3f}, "
                           f"Reductions: {reduction_factors}, "
                           f"Amplifications: {amplification_factors}")
            
            return final_score
            
        except Exception as e:
            logger.error(f"Error en detección de piel: {str(e)}")
            return 0.0
    
    def _analyze_colors_around_skin(self, img, skin_mask):
        """
        Analiza los colores alrededor de las regiones de piel detectadas
        para distinguir entre figuras/arte y contenido real
        """
        try:
            import cv2
            import numpy as np
            
            # Dilatar la máscara de piel para obtener regiones adyacentes
            kernel = np.ones((15, 15), np.uint8)
            dilated_skin = cv2.dilate(skin_mask, kernel, iterations=1)
            
            # Región alrededor de la piel (sin incluir la piel misma)
            around_skin = cv2.bitwise_and(dilated_skin, cv2.bitwise_not(skin_mask))
            
            # Analizar colores en esta región
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            colors_info = {
                'has_vibrant_colors': False,
                'has_unnatural_colors': False
            }
            
            if cv2.countNonZero(around_skin) > 0:
                # Extraer píxeles alrededor de la piel
                around_pixels = hsv[around_skin > 0]
                
                if len(around_pixels) > 0:
                    # Detectar colores vibrantes (alta saturación)
                    high_saturation = around_pixels[:, 1] > 150
                    vibrant_ratio = np.sum(high_saturation) / len(around_pixels)
                    
                    if vibrant_ratio > 0.3:  # 30% de colores vibrantes
                        colors_info['has_vibrant_colors'] = True
                    
                    # Detectar colores no naturales (azules, verdes, rojos puros)
                    hues = around_pixels[:, 0]
                    unnatural_hues = (
                        ((hues >= 100) & (hues <= 130)) |  # Azules
                        ((hues >= 40) & (hues <= 80)) |    # Verdes puros
                        ((hues >= 160) | (hues <= 10))     # Rojos/magentas
                    )
                    unnatural_ratio = np.sum(unnatural_hues) / len(around_pixels)
                    
                    if unnatural_ratio > 0.2:  # 20% de colores no naturales
                        colors_info['has_unnatural_colors'] = True
            
            return colors_info
            
        except Exception:
            return {'has_vibrant_colors': False, 'has_unnatural_colors': False}
    
    def _detect_suspicious_shapes(self, img) -> float:
        """
        Detecta formas sospechosas (píldoras, objetos redondos pequeños, etc.)
        """
        try:
            import cv2
            import numpy as np
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detectar círculos usando HoughCircles (píldoras, pastillas)
            circles = cv2.HoughCircles(
                gray, cv2.HOUGH_GRADIENT, 1, 20,
                param1=50, param2=30, minRadius=5, maxRadius=50
            )
            
            suspicious_score = 0.0
            
            if circles is not None:
                circles = np.uint16(np.around(circles))
                
                # Analizar cada círculo detectado
                for circle in circles[0, :]:
                    x, y, radius = circle
                    
                    # Extraer región del círculo
                    mask = np.zeros(gray.shape, dtype=np.uint8)
                    cv2.circle(mask, (x, y), radius, 255, -1)
                    
                    # Analizar color y textura dentro del círculo
                    roi = cv2.bitwise_and(gray, gray, mask=mask)
                    mean_intensity = cv2.mean(roi, mask=mask)[0]
                    
                    # Si es muy uniforme y del tamaño de una píldora
                    if 10 <= radius <= 30 and mean_intensity > 100:
                        suspicious_score += 0.3
                
                # Normalizar
                suspicious_score = min(suspicious_score, 1.0)
            
            return suspicious_score
            
        except Exception:
            return 0.0
    
    def _analyze_texture_patterns(self, img) -> float:
        """
        Analiza patrones de textura que podrían indicar sustancias
        """
        try:
            import cv2
            import numpy as np
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detectar texturas granulares (posibles polvos/drogas)
            # Usar filtro Gabor para detectar texturas específicas
            kernels = []
            for theta in range(0, 180, 45):  # Diferentes orientaciones
                kernel = cv2.getGaborKernel(
                    (21, 21), 5, np.radians(theta), 2*np.pi*0.5, 0.5, 0, ktype=cv2.CV_32F
                )
                kernels.append(kernel)
            
            texture_responses = []
            for kernel in kernels:
                filtered = cv2.filter2D(gray, cv2.CV_8UC3, kernel)
                texture_responses.append(np.var(filtered))
            
            # Alta varianza en texturas podría indicar sustancias granulares
            max_texture_response = max(texture_responses)
            texture_score = min(max_texture_response / 10000, 1.0)  # Normalizar
            
            return texture_score
            
        except Exception:
            return 0.0
    
    def _analyze_edges_and_contours(self, img) -> float:
        """
        Analiza bordes y contornos para detectar objetos sospechosos
        """
        try:
            import cv2
            import numpy as np
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detectar bordes usando Canny
            edges = cv2.Canny(gray, 50, 150)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            suspicious_score = 0.0
            
            for contour in contours:
                area = cv2.contourArea(contour)
                perimeter = cv2.arcLength(contour, True)
                
                if perimeter > 0:
                    # Calcular circularidad
                    circularity = 4 * np.pi * area / (perimeter * perimeter)
                    
                    # Objetos muy circulares y pequeños (píldoras)
                    if 0.7 < circularity < 1.0 and 100 < area < 2000:
                        suspicious_score += 0.2
                    
                    # Objetos rectangulares pequeños (posibles paquetes)
                    rect = cv2.boundingRect(contour)
                    aspect_ratio = float(rect[2]) / rect[3]
                    if 0.8 < aspect_ratio < 1.2 and 500 < area < 5000:
                        suspicious_score += 0.1
            
            return min(suspicious_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _analyze_metadata_and_filename(self, image_path: str) -> float:
        """
        Analiza metadatos de la imagen y nombre del archivo
        """
        try:
            filename = os.path.basename(image_path).lower()
            
            # Palabras clave sospechosas en el nombre
            suspicious_keywords = [
                'drug', 'pill', 'powder', 'weed', 'cannabis', 'cocaine', 'heroin',
                'meth', 'lsd', 'mdma', 'ecstasy', 'nude', 'naked', 'porn', 'sex',
                'nsfw', 'adult', 'explicit', 'weapon', 'gun', 'knife'
            ]
            
            score = 0.0
            for keyword in suspicious_keywords:
                if keyword in filename:
                    score += 0.5
            
            return min(score, 1.0)
            
        except Exception:
            return 0.0
    
    def _evaluate_opencv_results(self, results: Dict[str, float]) -> Dict[str, Any]:
        """
        Evalúa los resultados del análisis OpenCV
        """
        if 'error' in results:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'Error en análisis OpenCV',
                'api_used': True,
                'service': 'opencv_local'
            }
        
        # Calcular puntuación total ponderada
        weights = {
            'skin_detection': 0.3,
            'shape_analysis': 0.25,
            'texture_analysis': 0.2,
            'edge_analysis': 0.15,
            'metadata_analysis': 0.1
        }
        
        total_score = 0.0
        details = []
        
        for category, score in results.items():
            if category in weights:
                weighted_score = score * weights[category]
                total_score += weighted_score
                
                if score > 0.3:  # Umbral para reportar
                    details.append(f"{category}: {score:.2f}")
        
        is_appropriate = total_score < self.threshold
        
        reason = f"Análisis OpenCV completado"
        if details:
            reason += f" - Detectado: {', '.join(details)}"
        
        return {
            'is_appropriate': is_appropriate,
            'confidence': total_score,
            'reason': reason,
            'api_used': True,
            'service': 'opencv_local',
            'detailed_results': results
        }

class AlternativeImageModerator:
    """
    Moderador que usa APIs públicas completamente gratuitas
    """
    
    def __init__(self):
        self.enabled = True
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.7)
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Usa APIs públicas gratuitas como alternativa
        """
        try:
            # Lista de APIs públicas gratuitas para pruebas
            # Nota: Estas son solo ejemplos, algunas pueden requerir claves gratuitas
            
            # 1. Intentar con API pública de imagen
            result = self._try_public_apis(image_path)
            
            if result:
                return result
            
            # 2. Si falla, usar análisis OpenCV como fallback
            opencv_moderator = OpenCVImageModerator()
            return opencv_moderator.analyze_image(image_path)
            
        except Exception as e:
            logger.error(f"Error en moderador alternativo: {str(e)}")
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': f'Error: {str(e)}',
                'api_used': False,
                'service': 'alternative'
            }
    
    def _try_public_apis(self, image_path: str) -> Union[Dict[str, Any], None]:
        """
        Intenta usar APIs públicas gratuitas
        """
        # Por simplicidad, retornamos None para usar OpenCV
        # Aquí podrías implementar otras APIs públicas si las encuentras
        return None

# Instancias globales de los moderadores gratuitos
opencv_moderator = OpenCVImageModerator()
alternative_moderator = AlternativeImageModerator()

def analyze_image_with_completely_free_services(image_path: str) -> Dict[str, Any]:
    """
    Función principal para análisis 100% gratuito y sin límites
    
    Args:
        image_path: Ruta a la imagen
        
    Returns:
        Resultado del análisis
    """
    logger.info("Usando servicios 100% gratuitos para moderación de imágenes")
    
    # Usar OpenCV como servicio principal (100% gratuito y sin límites)
    result = opencv_moderator.analyze_image(image_path)
    
    if result.get('api_used', False):
        return result
    
    # Fallback al moderador alternativo
    logger.info("OpenCV no disponible, usando moderador alternativo")
    return alternative_moderator.analyze_image(image_path)
