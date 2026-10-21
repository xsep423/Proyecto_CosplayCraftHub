from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Profile, get_role
from .permissions import IsAdminRole
from .serializers import (
    CreateMemberSerializer,
    LoginSerializer,
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
