from django.urls import path

from .views import RAGChatView

urlpatterns = [
    path('chat/', RAGChatView.as_view(), name='rag_chat'),
]