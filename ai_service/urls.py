from django.urls import path

from .views import ChatHistoryView, ChatQueryView

urlpatterns = [
    path("query", ChatQueryView.as_view(), name="chat_query"),
    path("history", ChatHistoryView.as_view(), name="chat_history"),
]
