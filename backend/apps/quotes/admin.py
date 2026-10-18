from django.contrib import admin

from .models import Quote, QuoteItem


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('number', 'client', 'status', 'total', 'created_at')
    list_filter = ('status',)
    search_fields = ('number', 'client__id')
    readonly_fields = ('number',)
    inlines = [QuoteItemInline]
