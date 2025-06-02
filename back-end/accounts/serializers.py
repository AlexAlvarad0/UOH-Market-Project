from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Rating

User = get_user_model()

# Serializer básico para usar en relaciones
class UserSerializerBasic(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['email']

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
    profile_picture = serializers.ImageField(allow_null=True, required=False)
    average_rating = serializers.ReadOnlyField()
    total_ratings = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'bio', 'location', 'birth_date', 'profile_picture', 'average_rating', 'total_ratings')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})

        # Actualizar campos del usuario
        if 'username' in user_data:
            instance.user.username = user_data['username']
        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            instance.user.last_name = user_data['last_name']
        instance.user.save()
         
        # Actualizar campos del perfil
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
         
        instance.save()
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
            return {
                'id': obj.rater.id,
                'username': obj.rater.username,
                'first_name': obj.rater.first_name,
                'last_name': obj.rater.last_name
            }
        return None

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_email_verified', 'profile']
        read_only_fields = ['is_email_verified']

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