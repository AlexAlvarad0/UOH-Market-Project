from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import random
import string
from datetime import timedelta

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
    is_verified_seller = models.BooleanField(default=False)  # Campo para verificación de vendedor
    username = models.CharField(
        max_length=150,
        unique=True,
        default=generate_username  # Ahora usamos la función en lugar de lambda
    )
    # Campo temporal para códigos de verificación (Google OAuth)
    verification_code = models.CharField(max_length=10, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = generate_username()
        
        # Verificar automáticamente si el email permite vender productos
        if self.email and (self.email.endswith('@pregrado.uoh.cl') or self.email.endswith('@uoh.cl')):
            self.is_verified_seller = True
        else:
            self.is_verified_seller = False
            
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

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Token válido por 1 hora
            self.expires_at = timezone.now() + timezone.timedelta(hours=1)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Token para {self.user.email} - {'Válido' if self.is_valid() else 'Expirado/Usado'}"

    class Meta:
        ordering = ['-created_at']

class EmailVerificationOTP(models.Model):
    """Modelo para códigos OTP de verificación de email"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    resend_count = models.IntegerField(default=0)
    last_resent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Código OTP de Verificación'
        verbose_name_plural = 'Códigos OTP de Verificación'

    def save(self, *args, **kwargs):
        if not self.code:
            # Generar código de 6 dígitos
            self.code = ''.join(random.choices(string.digits, k=6))
        if not self.expires_at:
            # Código válido por 30 minutos
            self.expires_at = timezone.now() + timedelta(minutes=30)
        super().save(*args, **kwargs)

    def is_valid(self):
        """Verificar si el código OTP es válido"""
        return not self.is_used and timezone.now() < self.expires_at

    def is_expired(self):
        """Verificar si el código OTP ha expirado"""
        return timezone.now() >= self.expires_at

    def can_resend(self):
        """Verificar si se puede reenviar el código"""
        if self.resend_count >= 3:  # Máximo 3 reenvíos
            return False, "Has alcanzado el límite máximo de reenvíos"
        
        if not self.last_resent_at:
            return True, ""
        
        now = timezone.now()
        time_since_last_resend = now - self.last_resent_at
        
        # Intervalos de espera: 1 min, 3 min, 5 min
        wait_intervals = [1, 3, 5]
        
        if self.resend_count < len(wait_intervals):
            required_wait = timedelta(minutes=wait_intervals[self.resend_count])
            if time_since_last_resend < required_wait:
                remaining = required_wait - time_since_last_resend
                remaining_minutes = int(remaining.total_seconds() / 60)
                remaining_seconds = int(remaining.total_seconds() % 60)
                return False, f"Debes esperar {remaining_minutes}m {remaining_seconds}s antes de reenviar"
        
        return True, ""

    def mark_as_used(self):
        """Marcar el código como usado"""
        self.is_used = True
        self.save()

    def increment_resend_count(self):
        """Incrementar contador de reenvíos"""
        self.resend_count += 1
        self.last_resent_at = timezone.now()
        self.save()

    @classmethod
    def create_for_user(cls, user):
        """Crear un nuevo código OTP para un usuario"""
        # Invalidar códigos previos no usados
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Crear nuevo código
        return cls.objects.create(user=user)

    @classmethod
    def get_latest_valid_for_user(cls, user):
        """Obtener el código OTP válido más reciente para un usuario"""
        return cls.objects.filter(
            user=user,
            is_used=False
        ).filter(
            expires_at__gt=timezone.now()
        ).first()

    def __str__(self):
        status = "Válido" if self.is_valid() else "Expirado/Usado"
        return f"OTP {self.code} para {self.user.email} - {status}"