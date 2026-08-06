from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import uuid

from .services import RAGPipelineService
from .models import ChatMessage


class RAGChatView(APIView):
    # Require authentication to track history
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_query = request.data.get("query")
        target_language = request.data.get("language", "en")
        session_id = request.data.get("session_id")

        if not user_query:
            return Response(
                {"error": "The 'query' field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not session_id:
            return Response(
                {"error": "The 'session_id' field is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. Save the user's message
            ChatMessage.objects.create(
                sender=request.user,
                session_id=session_id,
                role="user",
                content=user_query,
                context_type="ai_chat"
            )

            # 2. Get AI Response
            rag_service = RAGPipelineService()
            result = rag_service.execute_rag_query(
                user_query=user_query,
                target_language=target_language
            )
            
            # 3. Save the AI's response
            ai_content = result.get("answer", result.get("response", ""))
            ChatMessage.objects.create(
                sender=request.user,
                session_id=session_id,
                role="ai",
                content=ai_content,
                context_type="ai_chat"
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch all messages for user, grouped by session_id
        messages = ChatMessage.objects.filter(sender=request.user).order_by('created_at')
        
        sessions_map = {}
        for msg in messages:
            if msg.session_id not in sessions_map:
                sessions_map[msg.session_id] = {
                    "id": str(msg.session_id),
                    "title": msg.content[:30] + "..." if msg.role == "user" else "New Conversation",
                    "messages": []
                }
            sessions_map[msg.session_id]["messages"].append({
                "id": str(msg.id),
                "sender": msg.role,
                "text": msg.content,
            })
            # Update title to first user message if it's currently default
            if msg.role == "user" and sessions_map[msg.session_id]["title"] == "New Conversation":
                sessions_map[msg.session_id]["title"] = msg.content[:30] + "..."
                
        # Return as list, newest first (based on last message, or just reverse dict keys)
        return Response(list(sessions_map.values())[::-1], status=status.HTTP_200_OK)