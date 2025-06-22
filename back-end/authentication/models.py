"""
Modelos para autenticación con tokens que expiran
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.authtoken.models import Token
import binascii
import os

User = get_user_model()


class ExpiringToken(models.Model):
    """
    Token de autenticación que expira después de cierto tiempo
    """
    key = models.CharField(max_length=40, primary_key=True)
    user = models.OneToOneField(
        User, 
        related_name='expiring_auth_token',
        on_delete=models.CASCADE
    )
    created = models.DateTimeField(auto_now_add=True)
    is_persistent = models.BooleanField(default=False)  # Nuevo campo para tokens persistentes
    
    class Meta:
        verbose_name = "Token de Autenticación"
        verbose_name_plural = "Tokens de Autenticación"
    
    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super().save(*args, **kwargs)
    
    @classmethod
    def generate_key(cls):
        return binascii.hexlify(os.urandom(20)).decode()
    
    def __str__(self):
        return self.key
    @property
    def is_expired(self):
        """
        Verifica si el token ha expirado
        """
        # Si es un token persistente, nunca expira
        if hasattr(self, 'is_persistent') and self.is_persistent:
            return False
            
        from django.conf import settings
        expiry_time = getattr(settings, 'TOKEN_EXPIRY_TIME', 3600)  # Default 1 hora
        return timezone.now() > self.created + timedelta(seconds=expiry_time)
    
    @property
    def expires_at(self):
        """
        Retorna la fecha y hora de expiración del token
        """
        # Si es un token persistente, no tiene fecha de expiración
        if hasattr(self, 'is_persistent') and self.is_persistent:
            return None
            
        from django.conf import settings
        expiry_time = getattr(settings, 'TOKEN_EXPIRY_TIME', 3600)
        return self.created + timedelta(seconds=expiry_time)
    
    @property
    def time_until_expiry(self):
        """
        Retorna el tiempo restante hasta la expiración en segundos
        """
        # Si es un token persistente, retorna None (sin límite)
        if hasattr(self, 'is_persistent') and self.is_persistent:
            return None
            
        if self.is_expired:
            return 0
        expires_at = self.expires_at
        if expires_at is None:
            return None
        time_diff = expires_at - timezone.now()
        return int(time_diff.total_seconds())
    
    @classmethod
    def get_or_create_token(cls, user, remember_me=False):
        """
        Obtiene o crea un token para el usuario, eliminando tokens expirados
        """
        # Eliminar token expirado si existe
        try:
            existing_token = cls.objects.get(user=user)
            # Solo verificar expiración si no es persistente
            if not remember_me and existing_token.is_expired:
                existing_token.delete()
                # Crear nuevo token
                token = cls.objects.create(user=user)
                # Marcar como persistente si es necesario
                if remember_me:
                    token.is_persistent = True
                return token, True
            else:
                # Si existe y no ha expirado, o si es persistente, devolverlo
                if remember_me:
                    existing_token.is_persistent = True
                return existing_token, False
        except cls.DoesNotExist:
            # Crear nuevo token
            token = cls.objects.create(user=user)
            # Marcar como persistente si es necesario
            if remember_me:
                token.is_persistent = True
            return token, True


class UserSession(models.Model):
    """
    Modelo para rastrear sesiones de usuario
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_sessions')
    session_key = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    is_persistent = models.BooleanField(default=False)  # Para sesiones persistentes
    
    class Meta:
        verbose_name = "Sesión de Usuario"
        verbose_name_plural = "Sesiones de Usuario"
        ordering = ['-last_activity']
    
    def __str__(self):
        return f"{self.user.email} - {self.session_key[:8]}..."
    
    @property
    def is_expired(self):
        """
        Verifica si la sesión ha expirado
        """
        from django.conf import settings
        session_age = getattr(settings, 'SESSION_COOKIE_AGE', 3600)
        return timezone.now() > self.last_activity + timedelta(seconds=session_age)
    
    @property
    def time_until_expiry(self):
        """
        Retorna el tiempo restante hasta la expiración en segundos
        """
        if self.is_expired:
            return 0
        from django.conf import settings
        session_age = getattr(settings, 'SESSION_COOKIE_AGE', 3600)
        expires_at = self.last_activity + timedelta(seconds=session_age)
        time_diff = expires_at - timezone.now()
        return int(time_diff.total_seconds())
    
    def update_activity(self):
        """
        Actualiza la última actividad de la sesión
        """
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
