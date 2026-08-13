from rest_framework import status
from rest_framework.generics import ListAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(ListAPIView):
    """
    GET /api/v1/notifications
    Lists in-app notifications for the authenticated user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-sent_at")


class NotificationReadView(UpdateAPIView):
    """
    PATCH /api/v1/notifications/{id}
    Marks a notification as read/unread.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def patch(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = request.data.get("is_read", True)
        notification.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)