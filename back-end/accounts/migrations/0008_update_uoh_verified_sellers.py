# Generated manually on 2025-06-18

from django.db import migrations
from django.db.models import Q

def update_uoh_users(apps, schema_editor):
    """Actualizar usuarios UOH para que tengan is_verified_seller = True"""
    User = apps.get_model('accounts', 'User')
    
    # Actualizar todos los usuarios con emails UOH
    updated_count = User.objects.filter(
        Q(email__endswith='@pregrado.uoh.cl') | 
        Q(email__endswith='@uoh.cl')
    ).update(is_verified_seller=True)
    
    print(f"Usuarios UOH actualizados: {updated_count}")

def reverse_update_uoh_users(apps, schema_editor):
    """Revertir cambios si es necesario"""
    # No hacemos nada en el reverse, ya que queremos mantener esta funcionalidad
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_user_is_verified_seller'),
    ]

    operations = [
        migrations.RunPython(update_uoh_users, reverse_update_uoh_users),
    ]
