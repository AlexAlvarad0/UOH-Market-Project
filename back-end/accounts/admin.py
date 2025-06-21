from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.db import models

User = get_user_model()

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ('email', 'username', 'is_active', 'is_staff', 'is_superuser', 'is_email_verified', 'get_product_count', 'get_conversation_count', 'get_avg_rating', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'is_email_verified')
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Extra Información', {'fields': ('is_email_verified',)}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets
    search_fields = ('email', 'username')
    ordering = ('email',)
    date_hierarchy = 'date_joined'
    list_display += ('date_joined',)

    def get_product_count(self, obj):
        return obj.products.count()
    get_product_count.short_description = 'Productos'

    def get_conversation_count(self, obj):
        return obj.sent_messages.values('conversation').distinct().count()
    get_conversation_count.short_description = 'Conversaciones'

    def get_avg_rating(self, obj):
        ratings = obj.received_ratings.all()
        return round(ratings.aggregate(models.Avg('rating'))['rating__avg'] or 0, 2)
    get_avg_rating.short_description = 'Calif. Prom.'

# Registrar modelo Rating con métricas
from .models import Rating

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'rater', 'rated_user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('rater__username', 'rated_user__username')
