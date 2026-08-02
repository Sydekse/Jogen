// src/components/features/ChatInterface.tsx
"use client";

import React, { useState } from "react";
import ChatSidebar from "./ChatSidebar";
import { Menu } from "lucide-react";

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
  // Manage multiple chat sessions
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

  // Get current active session
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: inputText };

    // Update active session messages and auto-name title if it's the first real user message
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const isFirstUserMessage = session.messages.length <= 1;
          return {
            ...session,
            title: isFirstUserMessage ? inputText.slice(0, 30) + "..." : session.title,
            messages: [...session.messages, userMsg],
          };
        }
        return session;
      })
    );

    setInputText("");

    // Simulate AI response
    setTimeout(() => {
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "I am processing your query regarding Ethiopian business regulations...",
      };
      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === activeSessionId
            ? { ...session, messages: [...session.messages, aiReply] }
            : session
        )
      );
    }, 1000);
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-foreground text-base tracking-tight truncate max-w-xs sm:max-w-md">
              {activeSession.title}
            </h2>
          </div>
          <button
            onClick={() => setIsEscalated(true)}
            className="text-xs bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-3 py-1.5 rounded-md font-medium transition"
          >
            Escalate to Human
          </button>
        </div>

        {/* Escalation Banner */}
        {isEscalated && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex justify-between items-center">
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
              Need specialized review? Hand off this context to support.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInputText("Hello, I need human support for this chat session.");
                  setIsEscalated(false);
                }}
                className="bg-amber-600 text-white text-xs px-3 py-1.5 rounded-md font-semibold hover:bg-amber-700 transition"
              >
                Pre-fill Handoff
              </button>
              <button
                onClick={() => setIsEscalated(false)}
                className="text-muted-foreground hover:text-foreground text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
                    : "bg-card text-card-foreground border border-border rounded-bl-xs"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-card flex gap-3 items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message or prompt..."
            className="flex-1 bg-background border border-input rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}