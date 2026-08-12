from rest_framework import status
from rest_framework.generics import ListAPIView, UpdateAPIView
from rest_framework.response import Response

from experts.models import Expert

from .permissions import IsComplianceAdmin
from .serializers import (
    AdminExpertListSerializer,
    AdminExpertVerificationSerializer,
)


class AdminExpertListView(ListAPIView):
    """
    GET /api/v1/admin/experts
    Lists expert applications for compliance review.
    Supports filtering by ?verification_status=
    """

    permission_classes = [IsComplianceAdmin]
    serializer_class = AdminExpertListSerializer

    def get_queryset(self):
        queryset = Expert.objects.select_related("user").all().order_by("-created_at")
        status_param = self.request.query_params.get("verification_status")
        if status_param:
            queryset = queryset.filter(verification_status=status_param)
        return queryset


class AdminExpertVerificationView(UpdateAPIView):
    """
    PATCH /api/v1/admin/experts/{id}
    Grants or revokes expert verification badges ('verified', 'rejected', 'pending', 'unverified').
    """

    permission_classes = [IsComplianceAdmin]
    serializer_class = AdminExpertVerificationSerializer
    queryset = Expert.objects.all()
    lookup_field = "id"
    lookup_url_kwarg = "id"

    def patch(self, request, *args, **kwargs):
        expert = self.get_object()
        serializer = self.get_serializer(expert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["verification_status"]
        expert.verification_status = new_status
        expert.save()

        response_serializer = AdminExpertListSerializer(expert)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
