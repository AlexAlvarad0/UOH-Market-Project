from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Rating
from datetime import datetime

User = get_user_model()

# Serializer básico para usar en relaciones
class UserSerializerBasic(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_verified_seller']
        read_only_fields = ['email', 'is_verified_seller']

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        required=True,
        error_messages={
            "unique": "Este nombre de usuario ya está en uso.",
            "blank": "El nombre de usuario es obligatorio.",
        }
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        
        email = attrs['email'].lower()
        
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                "email": "Este correo eléctrónico ya está en uso."
            })
        
        attrs['email'] = email
        return attrs

    def create(self, validated_data):
        password2 = validated_data.pop('password2', None)
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')  # ahora editable
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    profile_picture = serializers.SerializerMethodField()
    average_rating = serializers.ReadOnlyField()
    total_ratings = serializers.ReadOnlyField()
    birth_date = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        """Generar URL absoluta para la imagen de perfil"""
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.profile_picture.url)
                except:
                    # Fallback usando BASE_URL si build_absolute_uri falla
                    from django.conf import settings
                    base_url = getattr(settings, 'BASE_URL', '')
                    if base_url:
                        return f"{base_url.rstrip('/')}{obj.profile_picture.url}"
            return obj.profile_picture.url
        return None

    def get_birth_date(self, obj):
        """Serializar la fecha sin conversiones de zona horaria"""
        if obj.birth_date:
            # Retornar la fecha en formato string YYYY-MM-DD sin conversiones
            return obj.birth_date.strftime('%Y-%m-%d')
        return None

    class Meta:
        model = Profile
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'bio', 'location', 'birth_date', 'profile_picture', 'average_rating', 'total_ratings')
    
    def validate(self, attrs):
        """Validar que el nombre de usuario no esté duplicado"""
        user_data = attrs.get('user', {})
        username = user_data.get('username')
        
        if username and self.instance:
            # Verificar si el username ya existe en otro usuario
            if User.objects.filter(username=username).exclude(id=self.instance.user.id).exists():
                raise serializers.ValidationError({
                    "username": "Este nombre de usuario ya está en uso."
                })
        
        return attrs
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        
        # Manejar birth_date por separado ya que es un SerializerMethodField
        birth_date_str = self.initial_data.get('birth_date')
        
        # Debug: Imprimir la fecha que llega
        if birth_date_str:
            print(f"DEBUG: Fecha recibida en serializer: {birth_date_str}")
            print(f"DEBUG: Tipo de dato: {type(birth_date_str)}")

        # Actualizar campos del usuario
        if 'username' in user_data:
            instance.user.username = user_data['username']
        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            instance.user.last_name = user_data['last_name']
        instance.user.save()
        
        # Actualizar campos del perfil (excluyendo birth_date que se maneja por separado)
        for attr, value in validated_data.items():
            if attr != 'birth_date':  # Excluir birth_date ya que se maneja por separado
                setattr(instance, attr, value)
        
        # Manejar birth_date por separado
        if birth_date_str:
            try:
                from datetime import datetime
                date_obj = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
                instance.birth_date = date_obj
                print(f"DEBUG: Fecha convertida y asignada: {date_obj}")
            except ValueError as e:
                print(f"DEBUG: Error convirtiendo fecha: {e}")
         
        instance.save()
        
        # Debug: Verificar qué se guardó
        if hasattr(instance, 'birth_date') and instance.birth_date:
            print(f"DEBUG: Fecha final guardada en BD: {instance.birth_date}")
        
        return instance

class RatingSerializer(serializers.ModelSerializer):
    rater_username = serializers.CharField(source='rater.username', read_only=True)
    rated_user_username = serializers.CharField(source='rated_user.username', read_only=True)

    class Meta:
        model = Rating
        fields = ['id', 'rated_user', 'rater', 'rating', 'comment', 'created_at', 'rater_username', 'rated_user_username']
        read_only_fields = ['rater', 'created_at']

    def validate(self, data):
        request = self.context.get('request')
        if request and request.user:
            # Evitar que un usuario se califique a sí mismo
            if data['rated_user'] == request.user:
                raise serializers.ValidationError("No puedes calificarte a ti mismo.")
        return data

    def create(self, validated_data):
        validated_data['rater'] = self.context['request'].user
        return super().create(validated_data)

class RatingListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar calificaciones"""
    rater_username = serializers.CharField(source='rater.username', read_only=True)
    rater = serializers.SerializerMethodField()
    
    class Meta:
        model = Rating
        fields = ['id', 'rating', 'comment', 'created_at', 'rater_username', 'rater']
        
    def get_rater(self, obj):
        if obj.rater:
            profile_picture = None
            if hasattr(obj.rater, 'profile') and obj.rater.profile.profile_picture:
                # Construir URL completa
                request = self.context.get('request')
                if request:
                    profile_picture = request.build_absolute_uri(obj.rater.profile.profile_picture.url)
                else:
                    profile_picture = obj.rater.profile.profile_picture.url
                
            return {
                'id': obj.rater.id,
                'username': obj.rater.username,
                'first_name': obj.rater.first_name,
                'last_name': obj.rater.last_name,
                'profile_picture': profile_picture
            }
        return None

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_email_verified', 'is_verified_seller', 'profile']
        read_only_fields = ['is_email_verified', 'is_verified_seller']

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True)

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password', '')

        if email and password:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'non_field_errors': ['Credenciales inválidas']
                })

            if not user.check_password(password):
                raise serializers.ValidationError({
                    'non_field_errors': ['Contraseña incorrecta']
                })

            if not user.is_active:
                raise serializers.ValidationError({
                    'non_field_errors': ['Esta cuenta está desactivada']
                })

            attrs['user'] = user
            return attrs

        raise serializers.ValidationError({
            'non_field_errors': ['Debe proporcionar email y contraseña']
        })

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("No existe una cuenta con este correo electrónico.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Las contraseñas no coinciden."
            })
        return attrs

    def validate_token(self, value):
        try:
            from .models import PasswordResetToken
            reset_token = PasswordResetToken.objects.get(token=value)
            if not reset_token.is_valid():
                raise serializers.ValidationError("Este token ha expirado o ya fue utilizado.")
            return value
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Token inválido.")