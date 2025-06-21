import os
import requests
import logging
import base64
from django.conf import settings
from typing import Dict, Any, Union
from PIL import Image
import tempfile
import io
import cv2
import numpy as np

logger = logging.getLogger(__name__)

class EnhancedDrugDetector:
    """
    Detector mejorado específicamente para drogas, alcohol y sustancias prohibidas
    """
    
    def __init__(self):
        self.enabled = True
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.7)
        
        # Palabras clave específicas para diferentes tipos de sustancias
        self.drug_keywords = {
            'cannabis': ['marihuana', 'cannabis', 'weed', 'cogollo', 'hierba', 'mota', 'ganja', 'thc', 'cbd', 'planta_medicinal', 'medical_plant'],
            'alcohol': ['alcohol', 'cerveza', 'vino', 'whisky', 'vodka', 'ron', 'tequila', 'licor', 'bar', 'bebida_alcoholica', 'beer', 'wine'],
            'hard_drugs': ['cocaina', 'heroina', 'metanfetamina', 'lsd', 'mdma', 'extasis', 'crack', 'fentanilo', 'cocaine', 'heroin'],
            'pills': ['pastilla', 'pildora', 'medicina', 'farmaco', 'droga', 'pill', 'tablet', 'pastillas'],
            'paraphernalia': ['pipa', 'bong', 'grinder', 'papel_fumar', 'encendedor_especial', 'pipe']
        }
        
        # Colores específicos asociados con sustancias
        self.substance_colors = {
            'cannabis_green': [(40, 40, 40), (80, 255, 255)],  # Verde característico del cannabis
            'cannabis_brown': [(10, 50, 20), (20, 255, 200)],  # Marrón seco del cannabis
            'white_powder': [(0, 0, 200), (180, 30, 255)],      # Polvos blancos
            'crystal_clear': [(0, 0, 220), (180, 20, 255)]      # Cristales transparentes
        }
        
        logger.info("Enhanced Drug Detector iniciado - Detección específica de sustancias")
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Análisis mejorado específico para detección de drogas y alcohol
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'is_appropriate': False,
                    'confidence': 1.0,
                    'reason': 'Archivo de imagen no encontrado',
                    'api_used': True,
                    'service': 'enhanced_drug_detector'
                }
            
            # Análisis con múltiples técnicas específicas
            results = self._analyze_with_drug_specific_techniques(image_path)
            
            return self._evaluate_drug_detection_results(results)
            
        except Exception as e:
            logger.error(f"Error en detector de drogas mejorado: {str(e)}")
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': f'Error en análisis: {str(e)}',
                'api_used': False,
                'service': 'enhanced_drug_detector'
            }
    
    def _analyze_with_drug_specific_techniques(self, image_path: str) -> Dict[str, float]:
        """
        Aplica técnicas específicas para detección de drogas
        """
        results = {}
        
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {'error': 1.0}
            
            # 1. Detección específica de cannabis por color
            cannabis_score = self._detect_cannabis_by_color(img)
            results['cannabis_detection'] = cannabis_score
            
            # 2. Detección de estructuras vegetales (hojas dentadas, tricomas)
            plant_structure_score = self._detect_plant_structures(img)
            results['plant_structure'] = plant_structure_score
            
            # 3. Detección de polvos y cristales
            powder_crystal_score = self._detect_powders_and_crystals(img)
            results['powder_crystal'] = powder_crystal_score
            
            # 4. Detección de parafernalia (pipas, bongs, etc.)
            paraphernalia_score = self._detect_drug_paraphernalia(img)
            results['paraphernalia'] = paraphernalia_score
            
            # 5. Análisis mejorado de metadatos y nombres
            metadata_score = self._enhanced_metadata_analysis(image_path)
            results['enhanced_metadata'] = metadata_score
            
            # 6. Detección de texturas específicas (hojas secas, cristales)
            texture_score = self._detect_substance_textures(img)
            results['substance_texture'] = texture_score
            
            # 7. Análisis de formas específicas (botellas de alcohol, plantas)
            shape_score = self._detect_substance_shapes(img)
            results['substance_shapes'] = shape_score
            
            return results
            
        except Exception as e:
            logger.error(f"Error en análisis específico de drogas: {str(e)}")
            return {'error': 0.0}
    
    def _detect_cannabis_by_color(self, img) -> float:
        """
        Detecta cannabis por sus colores característicos
        """
        try:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            cannabis_score = 0.0
            
            # Detectar verde característico del cannabis fresco
            green_lower = np.array([35, 40, 40])
            green_upper = np.array([85, 255, 255])
            green_mask = cv2.inRange(hsv, green_lower, green_upper)
            green_ratio = cv2.countNonZero(green_mask) / (img.shape[0] * img.shape[1])
            
            # Detectar marrón del cannabis seco
            brown_lower = np.array([10, 50, 20])
            brown_upper = np.array([20, 255, 200])
            brown_mask = cv2.inRange(hsv, brown_lower, brown_upper)
            brown_ratio = cv2.countNonZero(brown_mask) / (img.shape[0] * img.shape[1])
            
            # Si hay mucho verde específico Y algo de marrón, muy sospechoso
            if green_ratio > 0.3 and brown_ratio > 0.1:
                cannabis_score = 0.9
            elif green_ratio > 0.5:  # Mucho verde específico
                cannabis_score = 0.7
            elif brown_ratio > 0.3:  # Mucho marrón
                cannabis_score = 0.6
            else:
                cannabis_score = max(green_ratio * 2, brown_ratio * 2)
            
            return min(cannabis_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _detect_plant_structures(self, img) -> float:
        """
        Detecta estructuras específicas de plantas de cannabis (hojas dentadas, tricomas)
        """
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detectar bordes para encontrar hojas dentadas
            edges = cv2.Canny(gray, 50, 150)
            
            # Buscar contornos que podrían ser hojas dentadas
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            plant_score = 0.0
            serrated_leaves = 0
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if 500 < area < 5000:  # Tamaño típico de hojas
                    # Aproximar el contorno
                    epsilon = 0.02 * cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # Las hojas de cannabis tienen muchos "dientes" (vértices)
                    if len(approx) > 10:  # Muchos vértices = hojas dentadas
                        serrated_leaves += 1
            
            # Si encontramos varias hojas dentadas, muy sospechoso
            if serrated_leaves >= 3:
                plant_score = 0.8
            elif serrated_leaves >= 1:
                plant_score = 0.5
            
            return min(plant_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _detect_powders_and_crystals(self, img) -> float:
        """
        Detecta polvos blancos y cristales sospechosos
        """
        try:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # Detectar áreas muy blancas (posibles polvos)
            white_lower = np.array([0, 0, 200])
            white_upper = np.array([180, 30, 255])
            white_mask = cv2.inRange(hsv, white_lower, white_upper)
            white_ratio = cv2.countNonZero(white_mask) / (img.shape[0] * img.shape[1])
            
            # Detectar cristales (áreas muy brillantes y uniformes)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
            crystal_ratio = cv2.countNonZero(thresh) / (img.shape[0] * img.shape[1])
            
            powder_score = 0.0
            
            # Si hay mucho blanco uniforme, sospechoso
            if white_ratio > 0.4:
                powder_score = 0.8
            elif crystal_ratio > 0.3:
                powder_score = 0.6
            else:
                powder_score = max(white_ratio * 2, crystal_ratio * 2)
            
            return min(powder_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _detect_drug_paraphernalia(self, img) -> float:
        """
        Detecta parafernalia de drogas (pipas, bongs, etc.)
        """
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detectar círculos (posibles pipas, bongs)
            circles = cv2.HoughCircles(
                gray, cv2.HOUGH_GRADIENT, 1, 20,
                param1=50, param2=30, minRadius=10, maxRadius=100
            )
            
            # Detectar líneas largas (posibles pipas)
            edges = cv2.Canny(gray, 50, 150)
            lines = cv2.HoughLinesP(
                edges, 1, np.pi/180, threshold=100,
                minLineLength=50, maxLineGap=10
            )
            
            paraphernalia_score = 0.0
            
            # Evaluar formas sospechosas
            if circles is not None and len(circles[0]) > 2:
                paraphernalia_score += 0.4
            if lines is not None and len(lines) > 10:
                paraphernalia_score += 0.3
            
            return min(paraphernalia_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _enhanced_metadata_analysis(self, image_path: str) -> float:
        """
        Análisis mejorado de metadatos y nombres de archivo
        """
        try:
            filename = os.path.basename(image_path).lower()
            
            score = 0.0
            detected_categories = []
            
            # Buscar en todas las categorías de palabras clave
            for category, keywords in self.drug_keywords.items():
                category_detected = False
                for keyword in keywords:
                    if keyword in filename:
                        category_detected = True
                        # Diferentes pesos según la gravedad
                        if category in ['cannabis', 'hard_drugs']:
                            score += 0.9  # Muy grave - casi automático rechazo
                            detected_categories.append(f"{category}({keyword})")
                        elif category in ['alcohol']:
                            score += 0.8  # Grave - alcohol también es prohibido
                            detected_categories.append(f"{category}({keyword})")
                        elif category in ['pills']:
                            score += 0.7  # Grave - medicamentos sospechosos
                            detected_categories.append(f"{category}({keyword})")
                        else:
                            score += 0.6  # Sospechoso
                            detected_categories.append(f"{category}({keyword})")
                        break  # Una detección por categoría es suficiente
            
            # Log para debug
            if detected_categories:
                logger.warning(f"Metadatos sospechosos detectados en {filename}: {detected_categories}")
            
            return min(score, 1.0)
            
        except Exception as e:
            logger.error(f"Error en análisis de metadatos: {str(e)}")
            return 0.0
    
    def _detect_substance_textures(self, img) -> float:
        """
        Detecta texturas específicas de sustancias (hojas secas, cristales, polvos)
        """
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Usar filtros Gabor específicos para detectar texturas de cannabis
            texture_score = 0.0
            
            # Filtro para texturas de hojas secas
            kernel_leaf = cv2.getGaborKernel((21, 21), 5, np.radians(45), 2*np.pi*0.3, 0.5, 0, ktype=cv2.CV_32F)
            leaf_response = cv2.filter2D(gray, cv2.CV_8UC3, kernel_leaf)
            leaf_variance = np.var(leaf_response)
            
            # Filtro para texturas granulares (polvos)
            kernel_powder = cv2.getGaborKernel((15, 15), 3, np.radians(90), 2*np.pi*0.8, 0.3, 0, ktype=cv2.CV_32F)
            powder_response = cv2.filter2D(gray, cv2.CV_8UC3, kernel_powder)
            powder_variance = np.var(powder_response)
            
            # Evaluar respuestas
            if leaf_variance > 15000:  # Textura de hojas
                texture_score += 0.6
            
            if powder_variance > 20000:  # Textura granular
                texture_score += 0.5
            
            return min(texture_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _detect_substance_shapes(self, img) -> float:
        """
        Detecta formas específicas (botellas de alcohol, plantas, etc.)
        """
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            shape_score = 0.0
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 1000:  # Objetos significativos
                    
                    # Aproximar forma
                    epsilon = 0.02 * cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # Calcular aspect ratio
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = float(w) / h
                    
                    # Forma de botella (alta y estrecha)
                    if 0.2 < aspect_ratio < 0.6 and area > 5000:
                        shape_score += 0.7  # Posible botella de alcohol
                    
                    # Forma de planta (irregular, muchos vértices)
                    elif len(approx) > 8 and area > 3000:
                        shape_score += 0.5  # Posible planta
            
            return min(shape_score, 1.0)
            
        except Exception:
            return 0.0
    
    def _evaluate_drug_detection_results(self, results: Dict[str, float]) -> Dict[str, Any]:
        """
        Evalúa los resultados del análisis específico de drogas
        """
        if 'error' in results:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'Error en análisis de drogas',
                'api_used': True,
                'service': 'enhanced_drug_detector'
            }
        
        # Pesos específicos para diferentes tipos de detección
        weights = {
            'cannabis_detection': 0.25,      # Muy importante
            'plant_structure': 0.20,         # Muy importante
            'enhanced_metadata': 0.20,       # Muy importante
            'powder_crystal': 0.15,          # Importante
            'substance_texture': 0.10,       # Moderado
            'paraphernalia': 0.05,           # Moderado
            'substance_shapes': 0.05         # Moderado
        }
        
        total_score = 0.0
        details = []
        high_risk_categories = []
        
        for category, score in results.items():
            if category in weights:
                weighted_score = score * weights[category]
                total_score += weighted_score
                
                if score > 0.5:  # Umbral para reportar
                    details.append(f"{category}: {score:.2f}")
                    
                    # Categorías de alto riesgo
                    if category in ['cannabis_detection', 'enhanced_metadata', 'plant_structure'] and score > 0.6:
                        high_risk_categories.append(category)
        
        # Si hay detecciones de alto riesgo, ser más estricto
        if high_risk_categories:
            total_score *= 1.3  # Amplificar puntuación
            total_score = min(total_score, 1.0)
        
        is_appropriate = total_score < self.threshold
        
        reason = f"Análisis de drogas mejorado completado"
        if details:
            reason += f" - Detectado: {', '.join(details)}"
        
        if not is_appropriate:
            substance_types = []
            if 'cannabis_detection' in high_risk_categories or 'plant_structure' in high_risk_categories:
                substance_types.append("cannabis/marihuana")
            if 'powder_crystal' in [k for k, v in results.items() if v > 0.6]:
                substance_types.append("sustancias en polvo")
            if 'enhanced_metadata' in high_risk_categories:
                substance_types.append("contenido identificado por nombre/metadatos")
            
            if substance_types:
                reason += f" - Posibles sustancias: {', '.join(substance_types)}"
        
        return {
            'is_appropriate': is_appropriate,
            'confidence': total_score,
            'reason': reason,
            'api_used': True,
            'service': 'enhanced_drug_detector',
            'detailed_results': results,
            'high_risk_categories': high_risk_categories
        }

# Instancia global del detector mejorado
enhanced_drug_detector = EnhancedDrugDetector()

def analyze_image_with_enhanced_drug_detection(image_path: str) -> Dict[str, Any]:
    """
    Función principal para análisis mejorado de drogas y sustancias
    
    Args:
        image_path: Ruta a la imagen
        
    Returns:
        Resultado del análisis
    """
    logger.info("Usando detector mejorado de drogas y sustancias")
    
    # Usar el detector mejorado como servicio principal
    result = enhanced_drug_detector.analyze_image(image_path)
    
    return result
