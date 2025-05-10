from django.core.management.base import BaseCommand
from products.models import Category

class Command(BaseCommand):
    help = 'Create initial categories for the application'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Electrónica',
                'description': 'Dispositivos electrónicos, smartphones, laptops, etc.'
            },
            {
                'name': 'Hogar',
                'description': 'Muebles, decoración, electrodomésticos, etc.'
            },
            {
                'name': 'Ropa',
                'description': 'Ropa, calzado y accesorios de moda'
            },
            {
                'name': 'Deportes',
                'description': 'Equipamiento deportivo, ropa deportiva, etc.'
            },
            {
                'name': 'Juguetes',
                'description': 'Juguetes y artículos para niños'
            },
            {
                'name': 'Libros',
                'description': 'Libros, revistas, cómics, etc.'
            },
            {
                'name': 'Otros',
                'description': 'Categoría para artículos que no encajan en otras categorías'
            }
        ]

        for category_data in categories:
            category, created = Category.objects.get_or_create(
                name=category_data['name'],
                defaults={'description': category_data['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Category already exists: {category.name}'))
