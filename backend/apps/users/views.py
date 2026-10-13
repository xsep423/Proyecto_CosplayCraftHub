from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .serializers import LoginSerializer

from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Profile, Workshop, get_role
from .permissions import IsAdminRole, IsAdminOrMaker
from .serializers import WorkshopSerializer


class LoginView(APIView):

    permission_classes = [AllowAny];

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(
                serializer.validated_data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class WorkshopView(APIView):
    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH'):
            return [IsAdminRole()]       # antes: IsAdminOrMaker
        return [IsAuthenticated()]

    def get(self, request):
        return Response(WorkshopSerializer(Workshop.get()).data)

    def patch(self, request):
        serializer = WorkshopSerializer(Workshop.get(), data=request.data, partial=True)
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


class UserListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        users = User.objects.order_by('username')   # TODOS, activos o no
        return Response([serialize_user(u) for u in users])


class UserDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
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
            Profile.objects.update_or_create(user=target, defaults={'role': role})

        if 'active' in request.data:
            target.is_active = bool(request.data['active'])
            target.save(update_fields=['is_active'])

        return Response(serialize_user(target))
