from django.core.management.base import BaseCommand
from products.models import Category

class Command(BaseCommand):
    help = 'Creates demo categories for the application'

    def handle(self, *args, **kwargs):
        categories = [
            {
                'name': 'Electrónica',
                'description': 'Productos electrónicos como teléfonos, ordenadores, etc.'
            },
            {
                'name': 'Hogar',
                'description': 'Artículos para el hogar, decoración, muebles, etc.'
            },
            {
                'name': 'Ropa',
                'description': 'Ropa, calzado y accesorios'
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
                'description': 'Libros, comics y material de lectura'
            },
            {
                'name': 'Otros',
                'description': 'Categoría para artículos que no encajan en ninguna otra'
            },
        ]

        created_count = 0
        existing_count = 0

        for category_data in categories:
            category, created = Category.objects.get_or_create(
                name=category_data['name'],
                defaults={'description': category_data['description']}
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))
            else:
                existing_count += 1
                self.stdout.write(self.style.WARNING(f'Category already exists: {category.name}'))

        self.stdout.write(self.style.SUCCESS(
            f'Categories created: {created_count}, already existing: {existing_count}'
        ))
