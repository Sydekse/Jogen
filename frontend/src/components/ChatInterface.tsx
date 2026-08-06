// src/components/features/ChatInterface.tsx
"use client";

import React, { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import { Menu, Loader2 } from "lucide-react"; // Added Loader2 for loading state

interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatInterface({ onLogout }: { onLogout: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "Ethiopian Tax Advisory Overview",
      messages: [
        { id: "101", sender: "ai", text: "Welcome to Jogen! How can I assist you with your business law or tax queries today?" }
      ]
    }
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>("1");
  const [inputText, setInputText] = useState("");
  const [isEscalated, setIsEscalated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // NEW: Add a loading state to prevent spamming the backend
  const [isLoading, setIsLoading] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      messages: [
        { id: Date.now().toString(), sender: "ai", text: "Hello! Starting a fresh chat. How can I help?" }
      ]
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
  };

  // UPDATED: Made this function async to handle the real API request
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const currentText = inputText;
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: currentText };

    // 1. Add user message to UI immediately
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const isFirstUserMessage = session.messages.length <= 1;
          return {
            ...session,
            title: isFirstUserMessage ? currentText.slice(0, 30) + "..." : session.title,
            messages: [...session.messages, userMsg],
          };
        }
        return session;
      })
    );

    setInputText("");
    setIsLoading(true);

    // 2. Fetch from your actual Django RAG API
    try {
      // WARNING: Update this URL to match your Django URL configurations!
      const response = await fetch("http://localhost:8000/api/v1/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Authorization": `Bearer ${token}` // Uncomment if you are using JWT auth
        },
        body: JSON.stringify({
          query: currentText,
          session_id: activeSessionId // Send session ID so backend remembers context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with backend");
      }

      const data = await response.json();

      // 3. Add AI response to the UI
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        // WARNING: Update "data.answer" to match the actual key your Django backend returns
        text: data.answer || data.response || "No response text found.",
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, aiReply] }
            : session
        )
      );

    } catch (error) {
      console.error("Chat API Error:", error);

      // Fallback error message in UI
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "system",
        text: "Error connecting to the AI server. Please make sure the backend is running.",
      };

      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, errorReply] }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar (Desktop & Toggleable) */}
      <div className={`${isSidebarOpen ? "block" : "hidden"} md:block`}>
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
          onLogout={onLogout}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border bg-card flex justify-between items-center">
          {/* ... (Header code remains unchanged) ... */}
        </div>

        {/* Escalation Banner */}
        {/* ... (Escalation Banner code remains unchanged) ... */}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/10">
          {activeSession.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs"
                    : msg.sender === "system"
                    ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-xs"
                    : "bg-card text-card-foreground border border-border rounded-bl-xs"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* NEW: Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-xl text-sm bg-card text-muted-foreground border border-border rounded-bl-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card flex gap-3 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Please wait..." : "Type your message or prompt..."}
            className="flex-1 bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}