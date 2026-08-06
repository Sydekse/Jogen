from django.urls import path

from .views import ChatHistoryView, RAGChatView

urlpatterns = [
    path('', RAGChatView.as_view(), name='rag_chat'),
    path('history/', ChatHistoryView.as_view(), name='chat_history'),
]