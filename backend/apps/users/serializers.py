# apps/users/serializers.py
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, Workshop, get_profile


def clean_spaces(value):
    """Quita espacios sobrantes: '  Taller   X ' -> 'Taller X'."""
    return ' '.join(value.split())


def check_password_strength(password, email, name):
    """Aplica los validadores de Django y los devuelve como error 400 (no 500)."""
    candidate = User(username=email, email=email, first_name=name)
    try:
        validate_password(password, user=candidate)
    except DjangoValidationError as e:
        raise serializers.ValidationError({'password': list(e.messages)})


def email_is_taken(email):
    return (
        User.objects.filter(email__iexact=email).exists()
        or User.objects.filter(username__iexact=email).exists()
    )


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
    email = serializers.EmailField(max_length=150)   # username admite 150 como máximo
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_workshopName(self, value):
        value = clean_spaces(value)
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        if Workshop.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un taller con ese nombre.')
        return value

    def validate_ownerName(self, value):
        value = clean_spaces(value)
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if email_is_taken(value):
            raise serializers.ValidationError('Ya existe una cuenta con ese correo.')
        return value

    def validate(self, attrs):
        check_password_strength(attrs['password'], attrs['email'], attrs['ownerName'])
        return attrs

    def create(self, data):
        first, _, last = data['ownerName'].partition(' ')
        try:
            with transaction.atomic():
                workshop = Workshop.objects.create(
                    name=data['workshopName'],
                    owner=data['ownerName'],
                    email=data['email'],
                    city=data.get('city', '').strip(),
                )
                user = User.objects.create_user(
                    username=data['email'],
                    email=data['email'],
                    password=data['password'],
                    first_name=first,
                    last_name=last,
                )
                Profile.objects.update_or_create(
                    user=user,
                    defaults={'workshop': workshop, 'role': Profile.Role.ADMIN},
                )
        except IntegrityError:
            # Otra alta idéntica ganó la carrera: nada se guarda (rollback)
            raise serializers.ValidationError(
                {'workshopName': ['Ya existe un taller o una cuenta con esos datos.']}
            )
        return user


# El rol "client" necesita un cliente vinculado, así que no se asigna desde aquí
MEMBER_ROLE_CHOICES = [(v, l) for v, l in Profile.Role.choices if v != 'client']


class CreateMemberSerializer(serializers.Serializer):
    """El admin de un taller da de alta usuarios dentro de SU taller."""
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=MEMBER_ROLE_CHOICES, default=Profile.Role.MAKER)

    def validate_name(self, value):
        value = clean_spaces(value)
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if email_is_taken(value):
            raise serializers.ValidationError('Ya existe una cuenta con ese correo.')
        return value

    def validate(self, attrs):
        check_password_strength(attrs['password'], attrs['email'], attrs['name'])
        return attrs

    def create(self, data):
        first, _, last = data['name'].partition(' ')
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=data['email'],
                    email=data['email'],
                    password=data['password'],
                    first_name=first,
                    last_name=last,
                )
                Profile.objects.update_or_create(
                    user=user,
                    # El taller sale del contexto (servidor), nunca del JSON del cliente
                    defaults={'workshop': self.context['workshop'], 'role': data['role']},
                )
        except IntegrityError:
            raise serializers.ValidationError({'email': ['Ya existe una cuenta con ese correo.']})
        return user


class WorkshopSerializer(serializers.ModelSerializer):
    # El frontend usa "taxRate"; en la base se guarda como tax_rate
    taxRate = serializers.DecimalField(source='tax_rate', max_digits=5, decimal_places=2)

    class Meta:
        model = Workshop
        fields = ['name', 'owner', 'email', 'phone', 'city', 'address', 'bio', 'currency', 'taxRate']

    def validate_name(self, value):
        value = clean_spaces(value)
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        qs = Workshop.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un taller con ese nombre.')
        return value
