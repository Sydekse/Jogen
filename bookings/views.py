import os
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.services import NotificationService

from .models import Booking, SessionFile
from .serializers import (
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingUpdateSerializer,
    PresignedUploadRequestSerializer,
    SessionFileSerializer,
)
from .services import reserve_consultation_slot
from .storage_service import S3StorageService


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
        print("API REQUEST DATA:", request.data)
        serializer = BookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            print("API SERIALIZER ERRORS:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        booking = reserve_consultation_slot(
            client=request.user,
            expert_id=str(data["expert_id"]),
            scheduled_start=data["scheduled_start"],
            scheduled_end=data["scheduled_end"],
            channel=data.get("channel", "voice"),
        )

        start_time_str = booking.scheduled_start.strftime("%Y-%m-%d %H:%M UTC")
        NotificationService.create_and_dispatch(
            user=booking.client,
            title="New Booking Confirmed",
            message=f"Your consultation with {booking.expert.title} is scheduled for {start_time_str}.",
            notification_type="new_booking"
        )
        NotificationService.create_and_dispatch(
            user=booking.expert.user,
            title="New Booking Request",
            message=f"You have a new consultation scheduled for {start_time_str}.",
            notification_type="new_booking"
        )

        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


class ConsultationDetailView(APIView):
    """
    PATCH /api/v1/consultations/{id}
    Updates booking status (e.g. cancellation).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related("client", "expert", "expert__user").get(
                Q(client=request.user) | Q(expert__user=request.user),
                id=booking_id,
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Booking record not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_200_OK)

    def patch(self, request, booking_id):
        try:
            booking = Booking.objects.get(
                client=request.user,
                id=booking_id,
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Booking record not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.data.get("status") == "cancelled" and booking.status in {
            "cancelled",
            "completed",
        }:
            return Response(
                {"error": {"code": "INVALID_STATUS", "message": "This booking cannot be cancelled."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingUpdateSerializer(booking, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(BookingDetailSerializer(booking).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, booking_id):
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

        is_expired = booking.scheduled_end <= timezone.now()
        is_removable = booking.status in {"cancelled", "completed", "pending_payment"} or is_expired

        if not is_removable:
            return Response(
                {
                    "error": {
                        "code": "CANNOT_DELETE",
                        "message": "Only cancelled or expired bookings can be removed.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionFileUploadUrlView(APIView):
    """
    POST /api/v1/consultations/{booking_id}/files/upload-url
    Generates a secure S3 presigned upload URL for session participants.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        # Verify user is a participant or staff
        try:
            booking = Booking.objects.get(
                Q(client=request.user) | Q(expert__user=request.user) | Q(client__is_staff=True),
                id=booking_id,
            )
        except Booking.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Booking session not found or unauthorized.",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PresignedUploadRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        s3_key = f"sessions/{booking.id}/{uuid.uuid4()}-{data['file_name']}"

        storage_service = S3StorageService()
        try:
            upload_url = storage_service.generate_presigned_upload_url(
                s3_key=s3_key, mime_type=data["mime_type"]
            )
            return Response(
                {"upload_url": upload_url, "s3_key": s3_key},
                status=status.HTTP_200_OK,
            )
        except RuntimeError as e:
            return Response(
                {"error": {"code": "S3_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SessionFileListCreateView(APIView):
    """
    GET /api/v1/consultations/{booking_id}/files - List files
    POST /api/v1/consultations/{booking_id}/files - Register uploaded file
    """

    permission_classes = [IsAuthenticated]

    def _get_booking(self, request, booking_id):
        return Booking.objects.filter(
            Q(client=request.user) | Q(expert__user=request.user) | Q(client__is_staff=True),
            id=booking_id,
        ).first()

    def get(self, request, booking_id):
        booking = self._get_booking(request, booking_id)
        if not booking:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Booking session not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        files = SessionFile.objects.filter(booking=booking)
        serializer = SessionFileSerializer(files, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, booking_id):
        booking = self._get_booking(request, booking_id)
        if not booking:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Booking session not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        uploaded_file = request.FILES.get("file")
        if uploaded_file:
            s3_key = default_storage.save(
                f"sessions/{booking.id}/{uuid.uuid4()}-{uploaded_file.name}",
                uploaded_file,
            )
            session_file = SessionFile.objects.create(
                booking=booking,
                uploader=request.user,
                file_name=uploaded_file.name,
                file_size=uploaded_file.size,
                mime_type=uploaded_file.content_type or "application/octet-stream",
                s3_key=s3_key,
            )
            return Response(SessionFileSerializer(session_file).data, status=status.HTTP_201_CREATED)

        serializer = SessionFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(booking=booking, uploader=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionFileDownloadUrlView(APIView):
    """
    GET /api/v1/consultations/{booking_id}/files/{file_id}/download-url
    Generates a secure S3 presigned download URL for session files.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id, file_id):
        try:
            session_file = SessionFile.objects.get(
                Q(booking__client=request.user)
                | Q(booking__expert__user=request.user)
                | Q(uploader__is_staff=True),
                booking_id=booking_id,
                id=file_id,
            )
        except SessionFile.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "File not found or access restricted."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if settings.DEBUG and not os.getenv("AWS_STORAGE_BUCKET_NAME"):
            return Response(
                {"download_url": request.build_absolute_uri(default_storage.url(session_file.s3_key))},
                status=status.HTTP_200_OK,
            )

        storage_service = S3StorageService()
        try:
            download_url = storage_service.generate_presigned_download_url(
                s3_key=session_file.s3_key
            )
            return Response({"download_url": download_url}, status=status.HTTP_200_OK)
        except RuntimeError as e:
            return Response(
                {"error": {"code": "S3_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
