from rest_framework import serializers

from .models import ChatMessage


class ChatQuerySerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000, required=True)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
