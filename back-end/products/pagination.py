from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 12  # tamaño por defecto
    page_size_query_param = 'page_size'  # permite personalizar el tamaño
    max_page_size = 100  # máximo 100 productos por página

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })
