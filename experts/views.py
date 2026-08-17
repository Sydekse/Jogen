from django.db.models import Q
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Expert
from .serializers import (
    ExpertAvailabilitySerializer,
    ExpertDetailSerializer,
    ExpertListSerializer,
    ExpertProfileSerializer,
)


class ExpertProfileView(APIView):
    """
    PATCH /api/v1/experts/profile
    Updates or creates profile, payout wallet, and credentials for authenticated expert.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        expert, _ = Expert.objects.get_or_create(user=request.user)
        serializer = ExpertProfileSerializer(expert, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Automatically move from unverified to pending when they submit their profile
            if expert.verification_status == "unverified":
                expert.verification_status = "pending"
                expert.save(update_fields=["verification_status"])

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExpertAvailabilityView(APIView):
    """
    PATCH /api/v1/experts/availability
    Updates weekly consultation availability slots for authenticated expert.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        expert, _ = Expert.objects.get_or_create(user=request.user)
        serializer = ExpertAvailabilitySerializer(expert, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExpertListView(APIView):
    """
    GET /api/v1/experts
    Returns verified experts with optional filtering by specialty tag,
    search term, and rate range.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Always filter to return strictly verified experts
        queryset = Expert.objects.filter(verification_status="verified")

        # 1. Filter by specialty tag (uses GIN Index)
        tag = request.query_params.get("tag")
        if tag:
            queryset = queryset.filter(specialty_tags__contains=[tag])

        # 2. Text search on title, bio, or full_name
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(bio__icontains=search)
                | Q(user__full_name__icontains=search)
            )

        # 3. Filter by price range
        min_rate = request.query_params.get("min_rate")
        max_rate = request.query_params.get("max_rate")
        if min_rate:
            queryset = queryset.filter(rate_per_session__gte=min_rate)
        if max_rate:
            queryset = queryset.filter(rate_per_session__lte=max_rate)

        serializer = ExpertListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpertDetailView(APIView):
    """
    GET /api/v1/experts/{id}
    Returns detailed public profile of a single verified expert.
    """

    permission_classes = [AllowAny]

    def get(self, request, expert_id):
        try:
            expert = Expert.objects.get(id=expert_id)
            if expert.verification_status != "verified":
                # Allow access if the requester is the owner of the profile or an admin
                if not request.user.is_authenticated:
                    raise Expert.DoesNotExist
                if request.user.id != expert.user.id and not request.user.is_staff:
                    raise Expert.DoesNotExist
        except Expert.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Verified expert not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ExpertDetailSerializer(expert, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpertPublicAvailabilityView(APIView):
    """
    GET /api/v1/experts/{id}/availability
    Returns weekly consultation availability matrix for a single verified expert.
    """

    permission_classes = [AllowAny]

    def get(self, request, expert_id):
        try:
            expert = Expert.objects.get(id=expert_id, verification_status="verified")
        except Expert.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Verified expert not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ExpertAvailabilitySerializer(expert)
        return Response(serializer.data, status=status.HTTP_200_OK)
