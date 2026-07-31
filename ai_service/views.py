from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage
from .serializers import ChatMessageSerializer, ChatQuerySerializer
from .services import RAGPipelineService


class ChatQueryView(APIView):
    """
    POST /api/v1/chat/query
    Processes user regulatory questions through RAG pipeline.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatQuerySerializer(data=request.data)
        if (
            not serializer.is_serializer_valid()
            if hasattr(serializer, "is_serializer_valid")
            else not serializer.is_valid()
        ):
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.validated_data["question"]
        rag_service = RAGPipelineService()

        try:
            rag_response = rag_service.execute_rag_query(user=request.user, user_query=question)
            return Response(rag_response, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": {"code": "AI_SERVICE_UNAVAILABLE", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatHistoryView(APIView):
    """
    GET /api/v1/chat/history
    Returns previous AI conversations for authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = ChatMessage.objects.filter(sender=request.user, context_type="ai_chat").order_by(
            "created_at"
        )

        serializer = ChatMessageSerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
