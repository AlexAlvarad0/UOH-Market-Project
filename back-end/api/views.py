from django.shortcuts import render

# Create your views here.

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            permission_classes = [IsAuthenticated]  # Any authenticated user can create/edit
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]
