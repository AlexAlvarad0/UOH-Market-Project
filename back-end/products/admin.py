from django.contrib import admin
from .models import Category, Product, ProductImage, Favorite

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description')
    search_fields = ('name',)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'price', 'category', 'seller', 'is_available', 'created_at')
    list_filter = ('category', 'is_available', 'condition')
    search_fields = ('title', 'description')
    inlines = [ProductImageInline]

class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'created_at')
    list_filter = ('created_at',)

admin.site.register(Category, CategoryAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(ProductImage)
admin.site.register(Favorite, FavoriteAdmin)
