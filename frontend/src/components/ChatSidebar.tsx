// src/components/features/ChatSidebar.tsx
"use client";

import React from "react";
import { MessageSquare, Users, BarChart3, ShieldCheck, ChevronLeft, LogOut, Settings } from "lucide-react";
import { JogenLogo } from "@/src/components/ui/jogenLogo";

interface ChatSession {
  id: string;
  title: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onToggleCollapse?: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onLogout,
  onToggleCollapse,
}: ChatSidebarProps) {
  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col h-full select-none text-sm">

      {/* 1. Brand Header with Collapse Button */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <JogenLogo className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">Jogen</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Primary Navigation Links (Matching Figma) */}
      <div className="p-3 space-y-1.5 border-b border-border">
        {/* Active/Main CTA Button matching Figma */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 bg-primary text-primary-foreground py-3 px-4 rounded-xl font-medium shadow-sm hover:opacity-90 transition text-left"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>AI Assistant</span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-foreground hover:bg-muted/60 transition text-left">
          <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>Find Experts</span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-foreground hover:bg-muted/60 transition text-left">
          <BarChart3 className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>Expert Dashboard</span>
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-foreground hover:bg-muted/60 transition text-left">
          <ShieldCheck className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span>Admin Console</span>
        </button>
      </div>

      {/* 3. AI History Section */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="text-xs font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
          AI History
        </div>
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition text-left truncate ${
              activeSessionId === session.id
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">{session.title}</span>
          </button>
        ))}
      </div>

      {/* 4. Footer controls */}
      <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition">
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs font-semibold text-destructive hover:bg-destructive/10 px-3 py-2 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

    </aside>
  );
}