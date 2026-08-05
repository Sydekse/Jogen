from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .services import RAGPipelineService


class RAGChatView(APIView):
    # Publicly accessible for development/testing
    permission_classes = [AllowAny]

    def post(self, request):
        user_query = request.data.get("query")
        target_language = request.data.get("language", "en")

        if not user_query:
            return Response(
                {"error": "The 'query' field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            rag_service = RAGPipelineService()
            result = rag_service.execute_rag_query(
                user_query=user_query,
                target_language=target_language
            )
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )