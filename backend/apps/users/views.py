import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.gallery.storage import save_upload

from .models import Profile, get_role
from .permissions import IsAdminRole
from .serializers import (
    CreateMemberSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterWorkshopSerializer,
    WorkshopSerializer,
    build_session,
)
from .tenancy import get_workshop


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterWorkshopView(APIView):
    """Alta de un nuevo taller (tenant). Devuelve la sesión ya iniciada."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = RegisterWorkshopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_session(user), status=status.HTTP_201_CREATED)


logger = logging.getLogger(__name__)

RESET_REQUEST_MESSAGE = (
    'Si el correo pertenece a una cuenta, te enviamos un enlace para restablecer la contraseña.'
)


def password_reset_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}'


class PasswordResetRequestView(APIView):
    """
    Envía por correo un enlace para restablecer la contraseña.
    Siempre responde lo mismo, exista o no la cuenta, para no revelar qué correos están registrados.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is not None and user.has_usable_password():
            name = f'{user.first_name} {user.last_name}'.strip() or user.username
            body = (
                f'Hola {name}:\n\n'
                'Recibimos una solicitud para restablecer tu contraseña de CosplayCraft Hub.\n'
                'Abre este enlace para elegir una nueva (caduca en 1 hora):\n\n'
                f'{password_reset_link(user)}\n\n'
                'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.\n'
            )
            try:
                send_mail('Restablece tu contraseña', body, None, [user.email])
            except Exception:
                # Un fallo del servidor de correo no debe revelar que la cuenta existe
                logger.exception('No se pudo enviar el correo de recuperación')

        return Response({'detail': RESET_REQUEST_MESSAGE})


class PasswordResetConfirmView(APIView):
    """Cambia la contraseña con el uid y token del enlace del correo."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Tu contraseña se actualizó. Ya puedes iniciar sesión.'})


class WorkshopView(APIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def get(self, request):
        return Response(WorkshopSerializer(get_workshop(request.user)).data)

    def patch(self, request):
        serializer = WorkshopSerializer(get_workshop(request.user), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class WorkshopLogoView(APIView):
    """POST (multipart, campo 'file') cambia el logo del taller; DELETE lo quita. Solo admin."""
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser]

    def post(self, request):
        return self._set(request, save_upload(get_workshop(request.user), request.FILES.get('file'), folder='logo'))

    def delete(self, request):
        return self._set(request, None)

    def _set(self, request, image):
        workshop = get_workshop(request.user)
        old = workshop.logo
        workshop.logo = image
        workshop.save(update_fields=['logo'])
        if old is not None:
            old.delete()
        return Response(WorkshopSerializer(workshop).data)


def serialize_user(u):
    full_name = f'{u.first_name} {u.last_name}'.strip()
    return {
        'id': u.id,
        'name': full_name or u.username,
        'email': u.email,
        'role': get_role(u),
        'active': u.is_active,
    }


def workshop_users(workshop):
    return User.objects.filter(profile__workshop=workshop)


class UserListView(APIView):
    """Usuarios del taller del admin (nunca los de otros talleres)."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        users = workshop_users(get_workshop(request.user)).order_by('username')
        return Response([serialize_user(u) for u in users])

    def post(self, request):
        serializer = CreateMemberSerializer(
            data=request.data, context={'workshop': get_workshop(request.user)}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serialize_user(user), status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        target = workshop_users(get_workshop(request.user)).filter(pk=pk).first()
        if target is None:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # Evita que el admin se quite su propio acceso
        if target.pk == request.user.pk:
            return Response(
                {'detail': 'No puedes cambiar tu propio rol ni desactivarte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if 'role' in request.data:
            role = request.data['role']
            if role not in Profile.Role.values:
                return Response({'detail': 'Rol inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            Profile.objects.filter(user=target).update(role=role)

        if 'active' in request.data:
            target.is_active = bool(request.data['active'])
            target.save(update_fields=['is_active'])

        return Response(serialize_user(target))


class MemberOptionsView(APIView):
    """Lista mínima (id, nombre) de usuarios activos del taller, para asignar responsables."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = workshop_users(get_workshop(request.user)).filter(is_active=True).order_by('first_name', 'username')
        return Response([{'id': u.id, 'name': serialize_user(u)['name']} for u in users])
