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
        # Usar solo un modelo NSFW confiable y gratuito
        self.model = 'Falconsai/nsfw_image_detection'  # Modelo público y activo
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
            
            # Analizar solo con el modelo NSFW seleccionado
            result = self._analyze_with_model(processed_image)
            return self._evaluate_huggingface_results(result)
            
        except Exception as e:
            logger.error(f"Error al analizar imagen con Hugging Face: {str(e)}")
            return {
                'is_appropriate': False,
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
    
    def _analyze_with_model(self, image_bytes: bytes) -> Union[Dict, None]:
        """
        Analiza imagen con el modelo NSFW de Hugging Face
        
        Args:
            image_bytes: Bytes de la imagen
            
        Returns:
            Respuesta del modelo o None si hay error
        """
        try:
            url = f"{self.base_url}/{self.model}"
            headers = {}
            
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            
            logger.info(f"Analizando con modelo Hugging Face: {self.model}")
            response = requests.post(url, data=image_bytes, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Respuesta de Hugging Face: {result}")
                return result
            else:
                logger.error(f"Error en Hugging Face: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout al llamar a Hugging Face modelo: {self.model}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión con Hugging Face: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error inesperado al llamar a Hugging Face: {str(e)}")
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

class ModerateContentImageModerator:
    """
    Moderador usando la API gratuita de ModerateContent (detecta NSFW, drogas, alcohol, armas, etc)
    """
    def __init__(self):
        self.api_key = getattr(settings, 'MODERATECONTENT_API_KEY', '')
        self.enabled = getattr(settings, 'CONTENT_MODERATION_ENABLED', True)
        self.threshold = getattr(settings, 'CONTENT_MODERATION_THRESHOLD', 0.6)
        self.api_url = 'https://api.moderatecontent.com/moderate/'
        if not self.api_key:
            logger.warning("No se ha configurado la clave de API de ModerateContent.")

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        if not self.enabled or not self.api_key:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'Moderación por IA deshabilitada o sin API Key',
                'api_used': False
            }
        try:
            with open(image_path, 'rb') as f:
                files = {'media': f}
                params = {'key': self.api_key}
                response = requests.post(self.api_url, files=files, params=params, timeout=30)
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Respuesta ModerateContent: {result}")
                # El score va de 0 (apto) a 100 (muy inapropiado)
                score = result.get('rating_index', 0)
                labels = result.get('predictions', {})
                # Considerar inapropiado si el score es alto o si detecta drogas, alcohol, armas, etc
                inappropriate = score >= 2 or any(
                    labels.get(label, 0) > 0.5 for label in ['drugs', 'alcohol', 'weapons', 'nudity', 'suggestive']
                )
                reason = f"Score: {score}, Labels: {labels}"
                return {
                    'is_appropriate': not inappropriate,
                    'confidence': score / 4.0,  # Normalizado a 0-1
                    'reason': reason,
                    'api_used': True,
                    'full_results': result
                }
            else:
                logger.error(f"Error en ModerateContent: {response.status_code} - {response.text}")
                return {
                    'is_appropriate': False,
                    'confidence': 1.0,
                    'reason': f'Error en ModerateContent: {response.text}',
                    'api_used': False
                }
        except Exception as e:
            logger.error(f"Error al analizar imagen con ModerateContent: {str(e)}")
            return {
                'is_appropriate': False,
                'confidence': 1.0,
                'reason': f'Error en análisis: {str(e)}',
                'api_used': False
            }

class SightengineImageModerator:
    """
    Moderador usando la API de Sightengine (detecta NSFW, drogas, alcohol, armas, etc)
    """
    def __init__(self):
        self.api_user = os.environ.get('SIGHTENGINE_API_USER', getattr(settings, 'SIGHTENGINE_API_USER', ''))
        self.api_secret = os.environ.get('SIGHTENGINE_API_SECRET', getattr(settings, 'SIGHTENGINE_API_SECRET', ''))
        self.enabled = getattr(settings, 'CONTENT_MODERATION_ENABLED', True)
        self.api_url = 'https://api.sightengine.com/1.0/check.json'
        self.models = 'nudity-2.1,weapon,alcohol,recreational_drug,medical,gore-2.0,tobacco,gambling'
        if not self.api_user or not self.api_secret:
            logger.warning("No se ha configurado la API de Sightengine.")

    def analyze_image(self, image_path: str) -> Dict[str, Any]:
        if not self.enabled or not self.api_user or not self.api_secret:
            return {
                'is_appropriate': True,
                'confidence': 0.0,
                'reason': 'Moderación por IA deshabilitada o sin API Key',
                'api_used': False
            }
        try:
            with open(image_path, 'rb') as f:
                files = {'media': f}
                params = {
                    'models': self.models,
                    'api_user': self.api_user,
                    'api_secret': self.api_secret
                }
                response = requests.post(self.api_url, files=files, data=params, timeout=30)
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Respuesta Sightengine: {result}")
                inappropriate = False
                reasons = []
                # Nudity
                nudity = result.get('nudity', {})
                if nudity.get('raw', 0) > 0.5 or nudity.get('partial', 0) > 0.5 or nudity.get('sexual_activity', 0) > 0.5 or nudity.get('sexual_display', 0) > 0.5 or nudity.get('erotica', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Nudity: {nudity}")
                # Drugs (recreational_drug)
                rec_drug = result.get('recreational_drug', {})
                if rec_drug.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Drugs: {rec_drug}")
                # Cannabis y otras clases de drogas
                drug_classes = rec_drug.get('classes', {})
                for drug_label, prob in drug_classes.items():
                    if prob > 0.5:
                        inappropriate = True
                        reasons.append(f"Drug class {drug_label}: {prob}")
                # Alcohol
                alcohol = result.get('alcohol', {})
                if alcohol.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Alcohol: {alcohol}")
                # Weapons
                weapon = result.get('weapon', {})
                weapon_classes = weapon.get('classes', {})
                if weapon.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Weapon: {weapon}")
                for weapon_label, prob in weapon_classes.items():
                    if prob > 0.5:
                        inappropriate = True
                        reasons.append(f"Weapon class {weapon_label}: {prob}")
                # Gore
                gore = result.get('gore', {})
                if gore.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Gore: {gore}")
                gore_classes = gore.get('classes', {})
                for gore_label, prob in gore_classes.items():
                    if prob > 0.5:
                        inappropriate = True
                        reasons.append(f"Gore class {gore_label}: {prob}")
                # Tobacco
                tobacco = result.get('tobacco', {})
                if tobacco.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Tobacco: {tobacco}")
                tobacco_classes = tobacco.get('classes', {})
                for tobacco_label, prob in tobacco_classes.items():
                    if prob > 0.5:
                        inappropriate = True
                        reasons.append(f"Tobacco class {tobacco_label}: {prob}")
                # Gambling
                gambling = result.get('gambling', {})
                if gambling.get('prob', 0) > 0.5:
                    inappropriate = True
                    reasons.append(f"Gambling: {gambling}")
                reason = "; ".join(reasons) if reasons else "Aprobado por Sightengine"
                return {
                    'is_appropriate': not inappropriate,
                    'confidence': 1.0 if inappropriate else 0.0,
                    'reason': reason,
                    'api_used': True,
                    'full_results': result
                }
            else:
                logger.error(f"Error en Sightengine: {response.status_code} - {response.text}")
                return {
                    'is_appropriate': False,
                    'confidence': 1.0,
                    'reason': f'Error en Sightengine: {response.text}',
                    'api_used': False
                }
        except Exception as e:
            logger.error(f"Error al analizar imagen con Sightengine: {str(e)}")
            return {
                'is_appropriate': False,
                'confidence': 1.0,
                'reason': f'Error en análisis: {str(e)}',
                'api_used': False
            }

# Instancias globales
huggingface_moderator = HuggingFaceImageModerator()
openvino_moderator = OpenVINOImageModerator()
moderatecontent_moderator = ModerateContentImageModerator()
sightengine_moderator = SightengineImageModerator()

def analyze_image_with_free_ai(image_path: str) -> Dict[str, Any]:
    """
    Analiza imagen usando Sightengine primero (drogas, alcohol, armas, NSFW, etc)
    """
    result = sightengine_moderator.analyze_image(image_path)
    if result.get('api_used', False):
        return result
    # Si falla, rechazar la imagen
    logger.warning("Sightengine no disponible, rechazando imagen por seguridad")
    return {
        'is_appropriate': False,
        'confidence': 1.0,
        'reason': result.get('reason', 'No se pudo analizar la imagen por IA. Intenta de nuevo más tarde.'),
        'api_used': False
    }
