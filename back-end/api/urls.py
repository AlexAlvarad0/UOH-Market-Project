#Let's check the correct URLs for authentication

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),  # Use our custom auth app
    # ... other URL patterns without cart-related ones
]
