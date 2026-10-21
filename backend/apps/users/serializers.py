# apps/users/serializers.py
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, Workshop, get_profile


def build_session(user):
    """Tokens + datos de usuario y taller que guarda el frontend."""
    profile = get_profile(user)
    workshop = profile.workshop

    refresh = RefreshToken.for_user(user)
    # Se copian al access token. Son solo informativos para el frontend:
    # el backend siempre vuelve a leer el taller desde la base de datos.
    refresh['role'] = profile.role
    refresh['workshop_id'] = workshop.id
    refresh['workshop'] = workshop.name

    full_name = f'{user.first_name} {user.last_name}'.strip()
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'name': full_name or user.username,
            'email': user.email,
            'role': profile.role,
        },
        'workshop': {
            'id': workshop.id,
            'name': workshop.name,
            'slug': workshop.slug,
        },
    }


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            raise serializers.ValidationError('Correo o contraseña incorrectos.')

        authenticated_user = authenticate(username=user.username, password=password)
        if authenticated_user is None:
            raise serializers.ValidationError('Correo o contraseña incorrectos.')

        workshop = get_profile(authenticated_user).workshop
        if workshop is None:
            raise serializers.ValidationError('Tu usuario no pertenece a ningún taller.')
        if not workshop.is_active:
            raise serializers.ValidationError('El taller está desactivado.')

        return build_session(authenticated_user)


class RegisterWorkshopSerializer(serializers.Serializer):
    """Alta de un nuevo tenant: crea el taller y su usuario administrador."""
    workshopName = serializers.CharField(max_length=150)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    ownerName = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con ese correo.')
        return value.lower()

    def validate(self, attrs):
        validate_password(attrs['password'])
        return attrs

    def create(self, data):
        first, _, last = data['ownerName'].strip().partition(' ')
        with transaction.atomic():
            workshop = Workshop.objects.create(
                name=data['workshopName'].strip(),
                owner=data['ownerName'].strip(),
                email=data['email'],
                city=data.get('city', ''),
            )
            user = User.objects.create_user(
                username=data['email'],
                email=data['email'],
                password=data['password'],
                first_name=first,
                last_name=last,
            )
            Profile.objects.update_or_create(
                user=user, defaults={'workshop': workshop, 'role': Profile.Role.ADMIN}
            )
        return user


class CreateMemberSerializer(serializers.Serializer):
    """El admin de un taller da de alta usuarios dentro de SU taller."""
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=Profile.Role.choices, default=Profile.Role.MAKER)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con ese correo.')
        return value.lower()

    def create(self, data):
        first, _, last = data['name'].strip().partition(' ')
        with transaction.atomic():
            user = User.objects.create_user(
                username=data['email'], email=data['email'], password=data['password'],
                first_name=first, last_name=last,
            )
            Profile.objects.update_or_create(
                user=user, defaults={'workshop': self.context['workshop'], 'role': data['role']}
            )
        return user


class WorkshopSerializer(serializers.ModelSerializer):
    # El frontend usa "taxRate"; en la base se guarda como tax_rate
    taxRate = serializers.DecimalField(source='tax_rate', max_digits=5, decimal_places=2)

    class Meta:
        model = Workshop
        fields = ['name', 'owner', 'email', 'phone', 'city', 'address', 'bio', 'currency', 'taxRate']
