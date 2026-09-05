"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Globe, Scale, BookOpen, FileText, ArrowRight } from "lucide-react";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { useUser } from "@/src/context/UserContext";
import { API_BASE_URL } from "@/src/config/api";
import { DogEarCorner } from "@/src/components/ui/DogEarCorner";

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

const STARTER_PROMPTS = [
  {
    category: "Commercial",
    title: "Private Limited Company (PLC)",
    desc: "Capital, founder, and registration requirements under the Commercial Code.",
    prompt: "What are the minimum capital, founder, and licensing requirements to incorporate a PLC in Ethiopia under the Commercial Code?",
    icon: Scale,
  },
  {
    category: "Tax",
    title: "Corporate Tax & VAT Filings",
    desc: "Withholding tax deadlines and VAT declaration rules (Proclamation No. 979/2016).",
    prompt: "Explain the monthly withholding tax declaration deadlines and VAT filing rules under Proclamation No. 979/2016.",
    icon: FileText,
  },
  {
    category: "Labor",
    title: "Labour Proclamation & Contracts",
    desc: "Probation durations, severance calculation, and termination rules.",
    prompt: "What are the statutory probation periods and severance pay calculations under Ethiopian Labour Proclamation No. 1156/2019?",
    icon: BookOpen,
  },
];

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
  const { lang, setLang } = useUser();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const currentText = textToSend;
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

  const handleSelectStarter = (promptText: string) => {
    setInputText(promptText);
    inputRef.current?.focus();
  };

  const isInitialState = activeSession.messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-xs">
          <JogenLogo className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-foreground">Jogen AI</p>
          <p className="text-xs text-muted-foreground">Ethiopian Law RAG</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Amharic / English Chatbot Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border border-border/80 bg-card hover:bg-accent transition-colors text-foreground shadow-2xs desk-press"
            title="Toggle AI response language"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span>{lang === "en" ? "አማርኛ" : "English"}</span>
          </button>

          <div className="flex items-center gap-1.5 pl-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground hidden sm:inline font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {activeSession.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start gap-2.5 items-start"}`}>
            {msg.sender !== "user" && (
              <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            
            {msg.sender === "user" ? (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-xs px-4 py-3 text-xs sm:text-sm max-w-[85%] sm:max-w-[80%] leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>
            ) : msg.sender === "system" ? (
              <div className="border-2 border-destructive/30 bg-destructive/5 rounded-2xl rounded-tl-sm text-destructive p-3.5 sm:p-4 text-xs sm:text-sm max-w-[85%]">
                <p className="font-semibold mb-1">System Notice</p>
                <p>{msg.text}</p>
              </div>
            ) : (
              /* AI Response with folded corner styling */
              <div className="bg-card border border-border/80 shadow-xs rounded-2xl rounded-tl-sm text-foreground relative overflow-hidden p-4 sm:p-4.5 max-w-[92%] sm:max-w-[85%]">
                <DogEarCorner size="sm" />

                {/* Body Content */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-foreground font-sans">
                  {msg.text}
                </div>

                {/* Escalation Button */}
                {msg.needsEscalation && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/experts'; }}
                    className="mt-3.5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold desk-press shadow-xs hover:opacity-95 transition-opacity"
                  >
                    <span>Find a verified expert</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Starter Consultation Questions when chat is new */}
        {isInitialState && (
          <div className="pt-2 pb-4 space-y-3 max-w-xl mx-auto">
            <div className="text-center mb-3">
              <h3 className="text-xs font-semibold text-foreground">Frequently Asked Questions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a question to get started, or ask your own below:
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {STARTER_PROMPTS.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleSelectStarter(starter.prompt)}
                    className="card-hover-wobble desk-press bg-card border border-border/80 hover:border-primary/50 p-3.5 rounded-xl shadow-2xs relative overflow-hidden text-left cursor-pointer group"
                  >
                    <DogEarCorner size="sm" />
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {starter.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            {starter.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 leading-normal">
                          {starter.desc}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading / Thinking State */}
        {isLoading && (
          <div className="flex gap-2.5 items-start justify-start">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0 mt-1 shadow-2xs">
              <JogenLogo className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border/80 rounded-2xl rounded-tl-sm px-4 py-3 text-xs sm:text-sm max-w-[85%] text-muted-foreground flex items-center gap-2.5 shadow-xs relative overflow-hidden">
              <DogEarCorner size="sm" />
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" /> 
              <span className="text-xs font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="p-3 sm:p-4 border-t border-border bg-card shrink-0 sticky bottom-0 z-20">
        <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
          <input 
            ref={inputRef}
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={
              isLoading 
                ? (lang === "en" ? "Please wait..." : "እባክዎ ይጠብቁ...") 
                : (lang === "en" ? "Ask a regulatory or tax question…" : "የህግ ወይም የታክስ ጥያቄ ይጠይቁ…")
            }
            className="flex-1 bg-muted/60 border border-border/80 focus:bg-card focus:border-primary rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
          <button 
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity desk-press shadow-xs"
            title="Send"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </form>
      </div>
    </div>
  );
}