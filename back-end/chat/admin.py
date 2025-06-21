from django.contrib import admin
from .models import Conversation, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ('sender', 'content', 'created_at', 'is_read')
    readonly_fields = ('sender', 'content', 'created_at', 'is_read')

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_participants', 'get_message_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('participants__username',)
    inlines = [MessageInline]

    def get_participants(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    get_participants.short_description = 'Participants'

    def get_message_count(self, obj):
        return obj.messages.count()
    get_message_count.short_description = 'Message Count'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('content', 'sender__username')
