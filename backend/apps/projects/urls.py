from rest_framework.routers import DefaultRouter

from .views import ProjectMaterialViewSet, ProjectViewSet, TaskViewSet

router = DefaultRouter()
# 'tasks' y 'materials' van antes que '' para que el router no los tome como id
router.register('tasks', TaskViewSet, basename='task')
router.register('materials', ProjectMaterialViewSet, basename='project-material')
router.register('', ProjectViewSet, basename='project')

urlpatterns = router.urls
