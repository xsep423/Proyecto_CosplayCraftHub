"""
Consola de la plataforma (super admin).

Gestiona TALLERES (tenants), no los datos de negocio de cada uno: aquí se ven
conteos y usuarios de cada taller, se activa/desactiva un taller, se da de alta
uno nuevo y se restablece la contraseña de un usuario. Los clientes, proyectos
y cotizaciones de un taller siguen siendo visibles solo para ese taller.
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clientes.models import Cliente
from apps.projects.models import Project
from apps.quotes.models import Quote
from apps.users.models import Workshop, get_role
from apps.users.serializers import RegisterWorkshopSerializer, check_password_strength

from .permissions import IsPlatformAdmin

ACTIVE_PROJECT_STATUSES = ('in_progress', 'review')
WON_QUOTE_STATUSES = ('approved', 'invoiced')


def with_counts(queryset):
    return queryset.annotate(
        n_users=Count('members', distinct=True),
        n_clients=Count('clientes', distinct=True),
        n_projects=Count('projects', distinct=True),
        n_quotes=Count('quotes', distinct=True),
    )


def workshop_row(w):
    return {
        'id': w.id,
        'name': w.name,
        'slug': w.slug,
        'owner': w.owner,
        'email': w.email,
        'city': w.city,
        'isActive': w.is_active,
        'createdAt': w.created_at,
        'users': w.n_users,
        'clients': w.n_clients,
        'projects': w.n_projects,
        'quotes': w.n_quotes,
    }


def member_row(u):
    full_name = f'{u.first_name} {u.last_name}'.strip()
    return {
        'id': u.id,
        'name': full_name or u.username,
        'email': u.email,
        'role': get_role(u),
        'active': u.is_active,
        'lastLogin': u.last_login,
        'dateJoined': u.date_joined,
    }


def workshop_detail(w):
    w = with_counts(Workshop.objects.filter(pk=w.pk)).get()
    won = Quote.objects.filter(workshop=w, status__in=WON_QUOTE_STATUSES).prefetch_related('items')
    members = User.objects.filter(profile__workshop=w).order_by('first_name', 'username')
    return {
        **workshop_row(w),
        'phone': w.phone,
        'address': w.address,
        'currency': w.currency,
        'quotePrefix': w.quote_prefix,
        'activeProjects': Project.objects.filter(workshop=w, status__in=ACTIVE_PROJECT_STATUSES).count(),
        'wonQuotesTotal': float(sum((q.total for q in won), Decimal('0'))),
        'members': [member_row(u) for u in members],
    }


def get_workshop_or_404(pk):
    return Workshop.objects.filter(pk=pk).first()


class PlatformSummaryView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        workshops = Workshop.objects.all()
        recent = with_counts(workshops.order_by('-created_at'))[:5]
        return Response({
            'workshops': workshops.count(),
            'activeWorkshops': workshops.filter(is_active=True).count(),
            'users': User.objects.filter(profile__workshop__isnull=False).count(),
            'clients': Cliente.objects.count(),
            'projects': Project.objects.count(),
            'activeProjects': Project.objects.filter(status__in=ACTIVE_PROJECT_STATUSES).count(),
            'quotes': Quote.objects.count(),
            'recentWorkshops': [workshop_row(w) for w in recent],
        })


class PlatformWorkshopListView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        qs = Workshop.objects.order_by('name')
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(owner__icontains=search) | Q(city__icontains=search))
        return Response([workshop_row(w) for w in with_counts(qs)])

    def post(self, request):
        """Alta de un taller y su administrador desde la consola (no inicia sesión como él)."""
        serializer = RegisterWorkshopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admin_user = serializer.save()
        return Response(workshop_detail(admin_user.profile.workshop), status=status.HTTP_201_CREATED)


class PlatformWorkshopDetailView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request, pk):
        workshop = get_workshop_or_404(pk)
        if workshop is None:
            return Response({'detail': 'Taller no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(workshop_detail(workshop))

    def patch(self, request, pk):
        """Activar o desactivar un taller. Desactivado: sus usuarios no pueden entrar ni usar la API."""
        workshop = get_workshop_or_404(pk)
        if workshop is None:
            return Response({'detail': 'Taller no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if 'isActive' not in request.data:
            return Response({'detail': 'Solo se puede cambiar isActive.'}, status=status.HTTP_400_BAD_REQUEST)
        workshop.is_active = bool(request.data['isActive'])
        workshop.save(update_fields=['is_active'])
        return Response(workshop_detail(workshop))


class PlatformMemberPasswordView(APIView):
    """Restablece la contraseña de un usuario de un taller (por ejemplo, el admin que la olvidó)."""
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk, user_id):
        user = User.objects.filter(pk=user_id, profile__workshop_id=pk, is_superuser=False).first()
        if user is None:
            return Response({'detail': 'Usuario no encontrado en ese taller.'}, status=status.HTTP_404_NOT_FOUND)
        password = request.data.get('password') or ''
        check_password_strength(password, user.email, user.first_name)
        user.set_password(password)
        user.save(update_fields=['password'])
        return Response(status=status.HTTP_204_NO_CONTENT)
