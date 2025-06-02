import django_filters
from .models import Product

class ProductFilter(django_filters.FilterSet):
    """
    Filtro personalizado para productos que incluye filtrado por rango de precios
    """
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    
    class Meta:
        model = Product
        fields = ['category', 'condition', 'min_price', 'max_price']
