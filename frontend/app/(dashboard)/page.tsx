"use client";

import ChatInterface from "@/src/features/chat/ChatInterface";
import { useChat } from "@/src/context/ChatContext";

export default function ChatPage() {
  const { sessions, setSessions, activeSessionId } = useChat();

  return (
    <ChatInterface
      sessions={sessions}
      setSessions={setSessions}
      activeSessionId={activeSessionId}
    />
  );
}
