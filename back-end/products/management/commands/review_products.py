from django.core.management.base import BaseCommand
import logging
import time
from products.models import Product
from products.utils import moderate_content

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Procesa productos en estado de revisión y determina si son apropiados para publicar'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delay',
            type=int,
            default=0,
            help='Retraso en segundos para la aprobación de productos (simula un proceso de revisión más realista)'
        )

    def handle(self, *args, **options):
        delay = options['delay']
        products_pending = Product.objects.filter(status='pending')
        
        if not products_pending.exists():
            self.stdout.write(self.style.SUCCESS('No hay productos pendientes de revisión.'))
            return
        
        self.stdout.write(f'Procesando {products_pending.count()} productos en estado de revisión...')
        
        for product in products_pending:
            self.stdout.write(f'Revisando producto #{product.id}: {product.title}')
            
            # Obtener rutas de imágenes
            image_paths = [img.image.path for img in product.images.all()]
            
            # Simular retraso si está configurado
            if delay > 0:
                self.stdout.write(f'Esperando {delay} segundos para simular revisión...')
                time.sleep(delay)
            
            # Aplicar moderación de contenido
            result = moderate_content(product.title, product.description, image_paths)
            
            if result['approved']:
                product.status = 'available'
                self.stdout.write(self.style.SUCCESS(f'✓ Producto aprobado: {product.title}'))
            else:
                product.status = 'unavailable'
                self.stdout.write(self.style.ERROR(f'✗ Producto rechazado: {product.title}'))
                self.stdout.write(f'  Razón: {result["reason"]}')
            
            product.save()
        
        approved = Product.objects.filter(status='available').count()
        rejected = Product.objects.filter(status='unavailable').count()
        
        self.stdout.write(self.style.SUCCESS('Proceso de revisión completado.'))
        self.stdout.write(f'Estadísticas: {approved} productos aprobados, {rejected} productos rechazados.')