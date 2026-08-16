"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ChatSession } from '@/src/features/chat/ChatInterface';
import { useUser } from './UserContext';
import { useModal } from './ModalContext';

interface ChatContextType {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string>>;
  handleNewChat: () => void;
  handleRenameSession: (id: string, newTitle: string) => Promise<void>;
  handleDeleteSession: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const { isAuthenticated } = useUser();
  const { showAlert } = useModal();

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

  const handleRenameSession = useCallback(async (id: string, newTitle: string) => {
    try {
      const { renameChatSession } = await import('@/src/services/chatService');
      await renameChatSession(id, newTitle);
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    } catch (e) {
      console.error("Failed to rename session:", e);
      await showAlert("Failed to rename session.");
    }
  }, [showAlert]);

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      const { deleteChatSession } = await import('@/src/services/chatService');
      await deleteChatSession(id);
      setSessions(prev => {
        const next = prev.filter(s => s.id !== id);
        if (activeSessionId === id) {
          if (next.length > 0) setActiveSessionId(next[0].id);
          else handleNewChat();
        }
        return next;
      });
    } catch (e) {
      console.error("Failed to delete session:", e);
      await showAlert("Failed to delete session.");
    }
  }, [activeSessionId, handleNewChat, showAlert]);

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
          const newId = crypto.randomUUID();
          setSessions([{
            id: newId,
            title: "New Conversation",
            messages: [{ id: crypto.randomUUID(), sender: "ai", text: "Hello! Starting a fresh chat. How can I help?" }]
          }]);
          setActiveSessionId(newId);
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
      handleNewChat,
      handleRenameSession,
      handleDeleteSession
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
