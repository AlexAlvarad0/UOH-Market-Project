from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

def generate_username():
    return f"user_{uuid.uuid4().hex[:8]}"

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    username = models.CharField(
        max_length=150,
        unique=True,
        default=generate_username  # Ahora usamos la función en lugar de lambda
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = generate_username()
        super().save(*args, **kwargs)

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)

    def __str__(self):
        return self.user.email

    @property
    def average_rating(self):
        """Calcula el promedio de las calificaciones recibidas por este usuario"""
        ratings = self.user.received_ratings.all()
        if ratings.exists():
            total = sum(rating.rating for rating in ratings)
            return round(total / ratings.count(), 1)
        return 0.0

    @property
    def total_ratings(self):
        """Cuenta el total de calificaciones recibidas por este usuario"""
        return self.user.received_ratings.count()

class Rating(models.Model):
    """Modelo para calificaciones de vendedores"""
    rated_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_ratings',
        verbose_name='Usuario calificado'
    )
    rater = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='given_ratings',
        verbose_name='Usuario que califica'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Calificación'
    )
    comment = models.TextField(
        max_length=500, 
        blank=True, 
        null=True,
        verbose_name='Comentario'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('rated_user', 'rater')
        verbose_name = 'Calificación'
        verbose_name_plural = 'Calificaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.rater.username} calificó a {self.rated_user.username} con {self.rating} estrellas'

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.rated_user == self.rater:
            raise ValidationError('Un usuario no puede calificarse a sí mismo.')

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        try:
            instance.profile.save()
        except Profile.DoesNotExist:
            Profile.objects.create(user=instance)