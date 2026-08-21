"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { useUser } from "@/src/context/UserContext";
import { API_BASE_URL } from "@/src/config/api";

export interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  needsEscalation?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatInterface({ 
  sessions, 
  setSessions, 
  activeSessionId 
}: { 
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string;
}) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { lang } = useUser();
  const endRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  if (!activeSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Loading chat...</p>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const currentText = inputText;
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: currentText };

    setSessions((prev) => prev.map((session) => {
      if (session.id === activeSession.id) {
        const isFirstUserMessage = session.messages.length <= 1;
        return {
          ...session,
          title: isFirstUserMessage ? currentText.slice(0, 30) + "..." : session.title,
          messages: [...session.messages, userMsg],
        };
      }
      return session;
    }));

    setInputText("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/chat/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ query: currentText, session_id: activeSession.id, language: lang }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || `AI request failed (${response.status})`);
      }

      const data = await response.json();
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.answer || data.response || "No response text found.",
        needsEscalation: Boolean(data.needs_escalation),
      };

      setSessions((prev) => prev.map((session) =>
        session.id === activeSession.id
          ? { ...session, messages: [...session.messages, aiReply] }
          : session
      ));
    } catch (error) {
      console.error("Chat API Error:", error);
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "system",
        text: error instanceof Error ? error.message : "The AI could not answer this message.",
      };
      setSessions((prev) => prev.map((session) =>
        session.id === activeSession.id
          ? { ...session, messages: [...session.messages, errorReply] }
          : session
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/40 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Jogen AI</p>
          <p className="text-xs text-muted-foreground">Ethiopian Law RAG</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeSession.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start gap-2.5 items-start"}`}>
            {msg.sender !== "user" && (
              <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={cn(
              "px-4 py-3 text-sm max-w-[85%]",
              msg.sender === "user" 
                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                : msg.sender === "system"
                  ? "border-2 border-destructive/30 bg-destructive/5 rounded-2xl rounded-tl-sm text-destructive"
                  : "bg-muted rounded-2xl rounded-tl-sm text-foreground"
            )}>
              <>
                {msg.text}
                {msg.needsEscalation && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/experts'; }}
                    className="block mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold"
                  >
                    Find a verified expert
                  </button>
                )}
              </>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-start justify-start">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm max-w-[85%] text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "Please wait..." : "Ask a regulatory or tax question…"}
            className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button 
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </form>
      </div>
    </div>
  );
}