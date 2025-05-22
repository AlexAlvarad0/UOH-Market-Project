from django.db import models
from accounts.models import User
from products.models import Product

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Conversation about {self.product.title}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    # Indica si este mensaje ha sido marcado como liked (boolean)
    liked = models.BooleanField(default=False)
    # Usuarios que han dado like a este mensaje
    liked_by = models.ManyToManyField(User, related_name='liked_messages', blank=True)
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation}"