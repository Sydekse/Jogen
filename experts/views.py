from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Expert
from .serializers import ExpertAvailabilitySerializer, ExpertProfileSerializer


class ExpertProfileView(APIView):
    """
    PATCH /api/v1/experts/profile
    Updates or creates profile, payout wallet, and credentials for authenticated expert.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        expert, _ = Expert.objects.get_or_create(user=request.user)
        serializer = ExpertProfileSerializer(expert, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
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
