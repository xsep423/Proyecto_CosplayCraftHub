from django.contrib import admin

from .models import Project, ProjectMaterial, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0


class ProjectMaterialInline(admin.TabularInline):
    model = ProjectMaterial
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'workshop', 'client', 'status', 'priority', 'due_date')
    list_filter = ('workshop', 'status', 'priority')
    search_fields = ('name',)
    inlines = [TaskInline, ProjectMaterialInline]
