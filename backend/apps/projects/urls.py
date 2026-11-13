from rest_framework.routers import DefaultRouter

from .views import ProjectMaterialViewSet, ProjectPhotoViewSet, ProjectViewSet, TaskViewSet

router = DefaultRouter()
# 'tasks', 'materials' y 'photos' van antes que '' para que el router no los tome como id
router.register('tasks', TaskViewSet, basename='task')
router.register('materials', ProjectMaterialViewSet, basename='project-material')
router.register('photos', ProjectPhotoViewSet, basename='project-photo')
router.register('', ProjectViewSet, basename='project')

urlpatterns = router.urls
