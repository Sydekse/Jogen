from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingUpdateSerializer,
)
from .services import reserve_consultation_slot


class ConsultationListCreateView(APIView):
    """
    POST /api/v1/consultations - Reserve a slot
    GET /api/v1/consultations - List user or expert bookings
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Return bookings where user is either client or expert
        user = request.user
        queryset = Booking.objects.filter(Q(client=user) | Q(expert__user=user)).select_related(
            "client", "expert", "expert__user"
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = BookingDetailSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        booking = reserve_consultation_slot(
            client=request.user,
            expert_id=str(data["expert_id"]),
            scheduled_start=data["scheduled_start"],
            scheduled_end=data["scheduled_end"],
            channel=data.get("channel", "voice"),
        )

        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


class ConsultationDetailView(APIView):
    """
    PATCH /api/v1/consultations/{id}
    Updates booking status (e.g. cancellation).
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, booking_id):
        try:
            booking = Booking.objects.get(
                Q(client=request.user) | Q(expert__user=request.user),
                id=booking_id,
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Booking record not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BookingUpdateSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(BookingDetailSerializer(booking).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
