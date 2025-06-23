from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Crea un superusuario automáticamente usando variables de entorno'

    def handle(self, *args, **options):
        # Obtener credenciales desde variables de entorno
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@uoh.cl')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'Antilonx17*')

        self.stdout.write('=== INICIANDO CREACIÓN DE SUPERUSUARIO ===')
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Email: {email}')

        # Verificar si ya existe un superusuario
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.WARNING('Ya existe un superusuario en el sistema')
            )
            # Mostrar información del superusuario existente
            existing_user = User.objects.filter(is_superuser=True).first()
            self.stdout.write(f'Superusuario existente: {existing_user.username} - {existing_user.email}')
            return        # Crear el superusuario
        try:
            self.stdout.write('Intentando crear superusuario...')
            # Tu modelo usa email como USERNAME_FIELD, no username
            user = User.objects.create_superuser(
                email=email,
                password=password,
                username=username,
                is_email_verified=True  # Marcar como verificado
            )
            self.stdout.write(
                self.style.SUCCESS(f'Superusuario creado exitosamente: {email}')
            )
            self.stdout.write('=== SUPERUSUARIO CREADO CORRECTAMENTE ===')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error al crear superusuario: {str(e)}')
            )
            self.stdout.write('=== ERROR EN CREACIÓN DE SUPERUSUARIO ===')
            # Mostrar más detalles del error
            import traceback
            self.stdout.write(f'Traceback completo: {traceback.format_exc()}')
