from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from notifications.signals import create_product_rejected_notification

User = get_user_model()

class Command(BaseCommand):
    help = 'Crear una notificación de prueba para producto rechazado'

    def add_arguments(self, parser):
        parser.add_argument('--user-email', type=str, help='Email del usuario para crear la notificación')
        parser.add_argument('--product-title', type=str, default='Producto de prueba', help='Título del producto rechazado')
        parser.add_argument('--reason', type=str, default='Contenido inapropiado detectado', help='Razón del rechazo')
        parser.add_argument('--category', type=str, default='Varios', help='Categoría del producto rechazado')

    def handle(self, *args, **options):
        user_email = options['user_email']
        product_title = options['product_title']
        reason = options['reason']
        category = options['category']
        
        if not user_email:
            self.stdout.write(self.style.ERROR('Debes proporcionar un email de usuario con --user-email'))
            return
        
        try:
            user = User.objects.get(email=user_email)
            
            # Crear la notificación de producto rechazado con categoría
            create_product_rejected_notification(user, product_title, reason, category)
            
            self.stdout.write(
                self.style.SUCCESS(f'Notificación de producto rechazado creada para {user.username} ({user.email})')
            )
            self.stdout.write(f'Producto: {product_title}')
            self.stdout.write(f'Categoría: {category}')
            self.stdout.write(f'Razón: {reason}')
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Usuario con email {user_email} no encontrado'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error al crear notificación: {str(e)}'))
