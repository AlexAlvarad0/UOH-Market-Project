from django.core.management.base import BaseCommand
from products.models import Category

class Command(BaseCommand):
    help = 'Create initial categories for the application'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'Arriendos',
                'description': 'Alquiler de habitaciones, departamentos y espacios'
            },
            {
                'name': 'Artes y Manualidades',
                'description': 'Materiales artísticos, manualidades y proyectos creativos'
            },
            {
                'name': 'Cafetería y Snacks',
                'description': 'Comida, bebidas, snacks y productos de cafetería'
            },
            {
                'name': 'Deportes y Outdoor',
                'description': 'Equipamiento deportivo, actividades al aire libre'
            },
            {
                'name': 'Electrodomésticos',
                'description': 'Electrodomésticos para el hogar, cocina y limpieza'
            },
            {
                'name': 'Entradas y Eventos',
                'description': 'Boletos, entradas y eventos universitarios'
            },
            {
                'name': 'Hogar y Dormitorio',
                'description': 'Muebles, decoración y artículos para el hogar'
            },
            {
                'name': 'Relojes y Joyas',
                'description': 'Relojes, joyas y accesorios'
            },
            {
                'name': 'Instrumentos Musicales',
                'description': 'Instrumentos musicales y equipamiento de audio'
            },
            {
                'name': 'Juegos y Entretenimiento',
                'description': 'Videojuegos, juegos de mesa y entretenimiento'
            },
            {
                'name': 'Libros, película y música',
                'description': 'Libros, películas, música y material educativo'
            },
            {
                'name': 'Mascotas',
                'description': 'Productos y accesorios para mascotas'
            },
            {
                'name': 'Varios',
                'description': 'Artículos diversos que no encajan en otras categorías'
            },
            {
                'name': 'Ropa y Accesorios',
                'description': 'Ropa, calzado y accesorios de moda'
            },
            {
                'name': 'Servicios Estudiantiles',
                'description': 'Servicios académicos, tutorías y apoyo estudiantil'
            },
            {
                'name': 'Tecnología',
                'description': 'Dispositivos tecnológicos, computadoras y electrónicos'
            },
            {
                'name': 'Vehículos',
                'description': 'Vehículos, bicicletas y medios de transporte'
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
