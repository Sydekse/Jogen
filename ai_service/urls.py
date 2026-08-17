from django.urls import path

from .views import ChatHistoryView, ChatSessionManagementView, RAGChatView

urlpatterns = [
    path("", RAGChatView.as_view(), name="rag_chat"),
    path("history/", ChatHistoryView.as_view(), name="chat_history"),
    path("session/<uuid:session_id>/", ChatSessionManagementView.as_view(), name="chat_session_manage"),
]
