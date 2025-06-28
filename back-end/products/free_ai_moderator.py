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

class HuggingFaceImageModerator:
    """
    Servicio para moderar imágenes usando la API gratuita de Hugging Face
    """
    def __init__(self):
        self.api_token = getattr(settings, 'HUGGINGFACE_API_TOKEN', '')
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.6)
        self.enabled = getattr(settings, 'CONTENT_MODERATION_ENABLED', True)
        self.base_url = "https://api-inference.huggingface.co/models"
        
        # Modelos mejorados para detección más específica
        self.models = {
            'nsfw_primary': 'Falconsai/nsfw_image_detection',  # Muy bueno para NSFW
            'nsfw_secondary': 'AdamCodd/vit-base-nsfw-detector',  # Detector alternativo NSFW
            'drug_detection': 'google/vit-base-patch16-224',  # Para clasificación general
            'inappropriate_content': 'microsoft/resnet-50',  # Para contenido general
            'safety_classifier': 'facebook/detr-resnet-50'  # Para objetos específicos
        }
        
        if not self.api_token:
            logger.info("Hugging Face API token no configurado. Usando modelos públicos sin autenticación.")
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Analiza una imagen usando Hugging Face para detectar contenido inapropiado
        
        Args:
            image_path: Ruta al archivo de imagen
            
        Returns:
            Dict con el resultado del análisis
        """
        if not self.enabled:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'Moderación por IA deshabilitada',
                'api_used': False
            }
        
        try:
            # Verificar que el archivo existe
            if not os.path.exists(image_path):
                logger.error(f"Imagen no encontrada: {image_path}")
                return {
                    'is_appropriate': False,
                    'confidence': 1.0,
                    'reason': 'Archivo de imagen no encontrado',
                    'api_used': False
                }
            
            # Preparar imagen para el análisis
            processed_image = self._prepare_image(image_path)
            if not processed_image:
                return {
                    'is_appropriate': True,
                    'confidence': 0.0,
                    'reason': 'Error procesando imagen',
                    'api_used': False
                }
            
            # Analizar primero con modelo NSFW primario
            nsfw_result = self._analyze_with_model('nsfw_primary', processed_image)
            if not nsfw_result:
                # Si falla, intentar con el modelo secundario
                logger.warning('Modelo NSFW primario falló, intentando con el secundario')
                nsfw_result = self._analyze_with_model('nsfw_secondary', processed_image)
            
            # Evaluar resultados
            return self._evaluate_huggingface_results(nsfw_result)
            
        except Exception as e:
            logger.error(f"Error al analizar imagen con Hugging Face: {str(e)}")
            return {
                'is_appropriate': True,  # En caso de error, no bloquear
                'confidence': 0.0,
                'reason': f'Error en análisis: {str(e)}',
                'api_used': False
            }
    
    def _prepare_image(self, image_path: str) -> Union[bytes, None]:
        """
        Prepara la imagen para enviar a Hugging Face
        
        Args:
            image_path: Ruta a la imagen
            
        Returns:
            Bytes de la imagen o None si hay error
        """
        try:
            with Image.open(image_path) as img:
                # Convertir a RGB si es necesario
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Redimensionar si es muy grande (para eficiencia)
                max_size = 1024
                if img.width > max_size or img.height > max_size:
                    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
                # Convertir a bytes
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                return buffer.getvalue()
                
        except Exception as e:
            logger.error(f"Error preparando imagen: {str(e)}")
            return None
    
    def _analyze_with_model(self, model_type: str, image_bytes: bytes) -> Union[Dict, None]:
        """
        Analiza imagen con un modelo específico de Hugging Face
        
        Args:
            model_type: Tipo de modelo ('nsfw', 'inappropriate', etc.)
            image_bytes: Bytes de la imagen
            
        Returns:
            Respuesta del modelo o None si hay error
        """
        try:
            model_name = self.models.get(model_type)
            if not model_name:
                logger.error(f"Modelo no encontrado: {model_type}")
                return None
            
            url = f"{self.base_url}/{model_name}"
            headers = {}
            
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            
            logger.info(f"Analizando con modelo Hugging Face: {model_name}")
            response = requests.post(url, data=image_bytes, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Respuesta de Hugging Face {model_type}: {result}")
                return result
            else:
                logger.error(f"Error en Hugging Face {model_type}: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout al llamar a Hugging Face modelo: {model_type}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión con Hugging Face {model_type}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error inesperado al llamar a Hugging Face {model_type}: {str(e)}")
            return None
    
    def _evaluate_huggingface_results(self, result: Union[Dict, None]) -> Dict[str, Any]:
        """
        Evalúa los resultados de Hugging Face
        
        Args:
            result: Resultado del análisis
            
        Returns:
            Resultado final del análisis
        """
        if not result:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'No se pudieron obtener resultados de la API',
                'api_used': False
            }
        
        try:
            # Hugging Face devuelve una lista de clasificaciones
            if isinstance(result, list) and len(result) > 0:
                # Buscar clasificaciones relacionadas con contenido inapropiado
                inappropriate_labels = ['nsfw', 'porn', 'explicit', 'sexual', 'nude', 'adult']
                max_confidence = 0.0
                detected_labels = []
                
                for classification in result:
                    label = classification.get('label', '').lower()
                    score = classification.get('score', 0.0)
                    
                    # Verificar si es una etiqueta inapropiada
                    for inappropriate_label in inappropriate_labels:
                        if inappropriate_label in label:
                            max_confidence = max(max_confidence, score)
                            detected_labels.append(f"{label} ({score:.2f})")
                            break
                
                is_appropriate = max_confidence < self.threshold
                reason = f"Contenido {'apropiado' if is_appropriate else 'inapropiado'} detectado"
                
                if detected_labels:
                    reason += f": {', '.join(detected_labels)}"
                
                return {
                    'is_appropriate': is_appropriate,
                    'confidence': max_confidence,
                    'reason': reason,
                    'api_used': True,
                    'full_results': result
                }
            
            # Si no hay resultados claros, aprobar por defecto
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'No se detectó contenido inapropiado',
                'api_used': True,
                'full_results': result
            }
            
        except Exception as e:
            logger.error(f"Error evaluando resultados de Hugging Face: {str(e)}")
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': f'Error evaluando resultados: {str(e)}',
                'api_used': False
            }

class OpenVINOImageModerator:
    """
    Moderador completamente local usando OpenVINO (sin internet)
    """
    
    def __init__(self):
        self.enabled = True
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.7)
    
    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        """
        Análisis completamente local usando técnicas de visión por computadora avanzadas
        """
        try:
            # Implementación de análisis local más sofisticado
            # que no depende de APIs externas
            
            # Por ahora, usar el análisis local existente pero con mejoras
            from . import utils
            
            result = utils._analyze_image_content_local(image_path)
            
            # Convertir formato para consistencia
            return {
                'is_appropriate': result.get('is_appropriate', True),
                'confidence': 0.8 if not result.get('is_appropriate', True) else 0.2,
                'reason': result.get('reason', 'Análisis local completado'),
                'api_used': False,
                'method': 'local_openvino'
            }
            
        except Exception as e:
            logger.error(f"Error en análisis local OpenVINO: {str(e)}")
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': f'Error en análisis local: {str(e)}',
                'api_used': False
            }

# Instancias globales
huggingface_moderator = HuggingFaceImageModerator()
openvino_moderator = OpenVINOImageModerator()

def analyze_image_with_free_ai(image_path: str) -> Dict[str, Any]:
    """
    Función principal para analizar imagen con servicios gratuitos (solo Hugging Face, sin fallback)
    
    Args:
        image_path: Ruta a la imagen
        
    Returns:
        Resultado del análisis
    """
    # Intentar con Hugging Face (gratuito y sin límites)
    result = huggingface_moderator.analyze_image(image_path)
    
    if result.get('api_used', False):
        return result
    
    # Si Hugging Face falla, RECHAZAR la imagen (no usar fallback local)
    logger.warning("Hugging Face no disponible o modelo no encontrado, rechazando imagen por seguridad")
    return {
        'is_appropriate': False,
        'confidence': 0.0,
        'reason': result.get('reason', 'No se pudo analizar la imagen por IA. Intenta de nuevo más tarde.'),
        'api_used': False
    }
