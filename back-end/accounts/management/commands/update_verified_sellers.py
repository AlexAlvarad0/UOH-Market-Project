from django.core.management.base import BaseCommand
from django.db.models import Q
from accounts.models import User

class Command(BaseCommand):
    help = 'Actualiza el campo is_verified_seller para usuarios con correos UOH'

    def handle(self, *args, **options):
        # Buscar usuarios con correos UOH
        uoh_users = User.objects.filter(
            Q(email__endswith='@pregrado.uoh.cl') | 
            Q(email__endswith='@uoh.cl')
        )
        
        self.stdout.write(f"Encontrados {uoh_users.count()} usuarios UOH")
        
        # Mostrar información de los usuarios antes de actualizar
        for user in uoh_users:
            self.stdout.write(f"Usuario: {user.email} - is_verified_seller: {user.is_verified_seller}")
        
        # Actualizar usuarios
        updated_count = uoh_users.update(is_verified_seller=True)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Se actualizaron {updated_count} usuarios UOH con is_verified_seller=True'
            )
        )
        
        # Verificar el usuario específico mencionado
        try:
            specific_user = User.objects.get(email='alex.alvarado@pregrado.uoh.cl')
            self.stdout.write(
                self.style.SUCCESS(
                    f'Usuario alex.alvarado@pregrado.uoh.cl - is_verified_seller: {specific_user.is_verified_seller}'
                )
            )
        except User.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(
                    'Usuario alex.alvarado@pregrado.uoh.cl no encontrado'
                )
            )
