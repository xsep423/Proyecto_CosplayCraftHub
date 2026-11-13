"""
Portafolio público de un taller: /api/public/<slug>/

Sin sesión. Solo responde si el taller está activo y tiene el portafolio
encendido, y solo muestra proyectos marcados como públicos.

Nunca expone datos internos: ni cliente, ni presupuesto, ni costos, ni equipo.
Las fotos de "referencia" tampoco salen: suelen ser arte de otras personas.
"""
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.projects.models import Project, ProjectPhoto, pick_cover
from apps.users.models import Workshop

from .models import StoredImage, image_payload

LIGHT_IMAGE = [f'image__{f}' for f in StoredImage.HEAVY_FIELDS]


def public_photos_queryset():
    return (
        ProjectPhoto.objects.exclude(stage=ProjectPhoto.Stage.REFERENCE)
        .select_related('image')
        .defer(*LIGHT_IMAGE)
    )


class PublicPortfolioView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # un token vencido no debe dar 401 en una página pública
    throttle_classes = [AnonRateThrottle]

    def get(self, request, slug):
        workshop = get_object_or_404(
            Workshop.objects.select_related('logo').defer(*[f'logo__{f}' for f in StoredImage.HEAVY_FIELDS]),
            slug=slug, is_active=True, portfolio_enabled=True,
        )
        projects = (
            Project.objects.filter(workshop=workshop, is_public=True)
            .prefetch_related(Prefetch('photos', queryset=public_photos_queryset()))
            .order_by('-due_date', '-id')
        )

        items = []
        for p in projects:
            photos = list(p.photos.all())
            cover = pick_cover(photos)
            items.append({
                'id': p.id,
                'name': p.name,
                'description': p.description,
                'tags': p.tags,
                'status': p.status,
                'completed': p.status == Project.Status.COMPLETED,
                'date': p.due_date,
                'cover': image_payload(cover.image) if cover else None,
                'photos': [
                    {**image_payload(ph.image), 'caption': ph.caption, 'stage': ph.stage}
                    for ph in photos
                ],
            })

        return Response({
            'workshop': {
                'name': workshop.name,
                'slug': workshop.slug,
                'city': workshop.city,
                'bio': workshop.bio,
                'email': workshop.email,
                'phone': workshop.phone,
                'logo': image_payload(workshop.logo),
            },
            'projects': items,
        })
