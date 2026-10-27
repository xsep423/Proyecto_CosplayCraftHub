from django.contrib import admin

from .models import Material, StockMovement


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'workshop', 'category', 'quantity', 'unit', 'min_stock', 'unit_cost', 'stock')
    list_filter = ('workshop', 'category')
    search_fields = ('name', 'supplier')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('material', 'delta', 'quantity_after', 'reason', 'user', 'created_at')
    list_filter = ('material__workshop',)
    readonly_fields = ('material', 'delta', 'quantity_after', 'reason', 'user', 'created_at')

    def has_add_permission(self, request):
        return False
