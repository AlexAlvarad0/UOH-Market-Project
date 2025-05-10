# Configuración para ejecutar tareas programadas
# Este archivo debe ser referenciado en las configuraciones del servidor

# Para ejecutar en producción con supervisord, cree un archivo de configuración
# que ejecute el siguiente comando cada minuto:
# python manage.py review_pending_products

# Para configurar crontab en Linux, ejecutar:
# crontab -e
# Y añadir la siguiente línea:
# * * * * * cd /ruta/a/tu/proyecto && /ruta/a/venv/bin/python manage.py review_pending_products

# Para configurar en Windows con Task Scheduler:
# 1. Crear una tarea programada que ejecute cada minuto:
# powershell -Command "& 'C:\ruta\a\venv\Scripts\python.exe' 'C:\ruta\a\tu\proyecto\manage.py' review_pending_products"

import os
import django
from django.conf import settings

# Configuración para ejecutar el script directamente
if __name__ == "__main__":
    # Configurar Django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
    django.setup()
    
    # Importar después de configurar Django
    from django.core.management import call_command
    
    # Ejecutar el comando
    call_command("review_pending_products")