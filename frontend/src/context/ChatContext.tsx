"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ChatSession } from '@/src/features/chat/ChatInterface';
import { useUser } from './UserContext';

interface ChatContextType {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string>>;
  handleNewChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const { isAuthenticated } = useUser();

  const handleNewChat = useCallback(() => {
    setSessions(prevSessions => {
      // Check if the current active session is already empty
      const currentSession = prevSessions.find(s => s.id === activeSessionId);
      if (currentSession && currentSession.messages.length <= 1 && currentSession.messages[0]?.sender === 'ai') {
          return prevSessions; // Don't create a new one, just use the current empty one
      }

      // Also check if ANY session is empty and use that instead
      const emptySession = prevSessions.find(s => s.messages.length <= 1 && s.messages[0]?.sender === 'ai');
      if (emptySession) {
          setActiveSessionId(emptySession.id);
          return prevSessions;
      }

      const newId = crypto.randomUUID();
      const newSession: ChatSession = {
        id: newId,
        title: "New Conversation",
        messages: [
          { id: crypto.randomUUID(), sender: "ai", text: "Hello! Starting a fresh chat. How can I help?" }
        ]
      };
      setActiveSessionId(newId);
      return [newSession, ...prevSessions];
    });
  }, [activeSessionId]);

  useEffect(() => {
    // Fetch chat history when authenticated
    const loadData = async () => {
      if (!isAuthenticated) return;
      try {
        const { getChatHistory } = await import('@/src/services/chatService');
        const history = await getChatHistory();
        if (history && history.length > 0) {
          setSessions(history);
          setActiveSessionId(history[0].id);
        } else {
          // If no history, we create a new chat via effect after checking
          setSessions([{
            id: crypto.randomUUID(),
            title: "New Conversation",
            messages: [{ id: crypto.randomUUID(), sender: "ai", text: "Hello! Starting a fresh chat. How can I help?" }]
          }]);
        }
      } catch (e) {
        console.error("Failed to load chat data:", e);
      }
    };
    loadData();
  }, [isAuthenticated]);

  return (
    <ChatContext.Provider value={{
      sessions,
      setSessions,
      activeSessionId,
      setActiveSessionId,
      handleNewChat
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
