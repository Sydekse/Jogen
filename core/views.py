import os

from livekit import api
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class LiveKitTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        room_name = request.query_params.get("room_name")

        if not room_name:
            return Response(
                {"error": "room_name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        identity = f"user_{user.id}"
        name = user.full_name or "Anonymous User"

        token = api.AccessToken(
            os.getenv('LIVEKIT_API_KEY'),
            os.getenv('LIVEKIT_API_SECRET')
        )

        token.with_identity(identity)
        token.with_name(name)

        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        ))

        return Response({
            "token": token.to_jwt(),
            "livekit_url": os.getenv('LIVEKIT_URL')
        }, status=status.HTTP_200_OK)