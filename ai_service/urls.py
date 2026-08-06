from django.urls import path

from .views import RAGChatView, ChatHistoryView

urlpatterns = [
    path('', RAGChatView.as_view(), name='rag_chat'),
    path('history/', ChatHistoryView.as_view(), name='chat_history'),
]