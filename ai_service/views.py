from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage, ChatSessionMetadata
from .services import RAGPipelineService


class RAGChatView(APIView):
    # Require authentication to track history
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_query = request.data.get("query")
        target_language = request.data.get("language", "en")
        session_id = request.data.get("session_id")

        if not user_query:
            return Response(
                {"error": "The 'query' field is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        if not session_id:
            return Response(
                {"error": "The 'session_id' field is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. Save the user's message
            ChatMessage.objects.create(
                sender=request.user,
                session_id=session_id,
                role="user",
                content=user_query,
                context_type="ai_chat",
            )

            # 2. Get AI Response
            rag_service = RAGPipelineService()
            result = rag_service.execute_rag_query(
                user_query=user_query, target_language=target_language
            )

            # 3. Save the AI's response
            ai_content = result.get("answer", result.get("response", ""))
            ChatMessage.objects.create(
                sender=request.user,
                session_id=session_id,
                role="ai",
                content=ai_content,
                context_type="ai_chat",
            )

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch all messages for user, grouped by session_id
        messages = ChatMessage.objects.filter(sender=request.user).order_by("created_at")
        
        # Fetch metadata
        metadata_qs = ChatSessionMetadata.objects.filter(user=request.user)
        metadata_map = {str(m.session_id): m.title for m in metadata_qs}

        sessions_map = {}
        for msg in messages:
            sid = str(msg.session_id)
            if sid not in sessions_map:
                # Use metadata title if it exists, otherwise generate one
                if sid in metadata_map:
                    title = metadata_map[sid]
                else:
                    title = msg.content[:30] + "..." if msg.role == "user" else "New Conversation"

                sessions_map[sid] = {
                    "id": sid,
                    "title": title,
                    "messages": [],
                }
            sessions_map[sid]["messages"].append(
                {
                    "id": str(msg.id),
                    "sender": msg.role,
                    "text": msg.content,
                }
            )
            # Update title to first user message if it's currently default and no metadata exists
            if msg.role == "user" and sessions_map[sid]["title"] == "New Conversation" and sid not in metadata_map:
                sessions_map[sid]["title"] = msg.content[:30] + "..."

        # Return as list, newest first
        return Response(list(sessions_map.values())[::-1], status=status.HTTP_200_OK)


class ChatSessionManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, session_id):
        new_title = request.data.get("title")
        if not new_title:
            return Response({"error": "Title is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify the session belongs to the user
        if not ChatMessage.objects.filter(session_id=session_id, sender=request.user).exists():
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
            
        metadata, created = ChatSessionMetadata.objects.get_or_create(
            session_id=session_id,
            user=request.user,
            defaults={'title': new_title}
        )
        if not created:
            metadata.title = new_title
            metadata.save()
            
        return Response({"message": "Session renamed successfully", "title": metadata.title})

    def delete(self, request, session_id):
        # Delete all messages in the session for this user
        deleted, _ = ChatMessage.objects.filter(session_id=session_id, sender=request.user).delete()
        if deleted == 0:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Also delete metadata if it exists
        ChatSessionMetadata.objects.filter(session_id=session_id, user=request.user).delete()
        
        return Response({"message": "Session deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
