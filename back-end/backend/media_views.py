import os
import mimetypes
from django.http import FileResponse, Http404
from django.conf import settings
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control

@method_decorator(cache_control(max_age=3600), name='dispatch')  # Cache por 1 hora
class MediaServeView(View):
    """
    Vista para servir archivos media en producción con Daphne
    """
    def get(self, request, path):
        # Construir la ruta completa del archivo
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        # Verificar que el archivo existe y está dentro de MEDIA_ROOT
        if not os.path.exists(file_path):
            raise Http404("Media file not found")
        
        # Verificar que la ruta está dentro de MEDIA_ROOT (seguridad)
        if not os.path.commonpath([file_path, settings.MEDIA_ROOT]) == str(settings.MEDIA_ROOT):
            raise Http404("Invalid media path")
        
        # Determinar el tipo de contenido
        content_type, _ = mimetypes.guess_type(file_path)
        
        # Servir el archivo
        response = FileResponse(
            open(file_path, 'rb'),
            content_type=content_type or 'application/octet-stream'
        )
        
        # Agregar headers para caching
        response['Cache-Control'] = 'public, max-age=3600'
        
        return response
