"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, BarChart3, Shield, ChevronLeft, ChevronRight, User, Plus, ChevronDown, ChevronUp, Clock, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { JogenLogo } from "@/src/components/ui/jogenLogo";
import { useUser } from "@/src/context/UserContext";
import { useChat } from "@/src/context/ChatContext";
import { useModal } from "@/src/context/ModalContext";

const NAV_ITEMS = [
  { id: "experts", label: "Find Experts", icon: Users, href: "/experts" },
  { id: "bookings", label: "My Bookings", icon: Clock, href: "/bookings" },
  { id: "dashboard", label: "Expert Dashboard", icon: BarChart3, href: "/dashboard" },
  { id: "admin", label: "Admin Console", icon: Shield, href: "/admin" },
  { id: "ai", label: "AI Assistant", icon: MessageSquare, href: "/" },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean; onToggle: () => void;
}) {
  const pathname = usePathname();
  const { userProfile, isExpert, isAdmin } = useUser();
  const { sessions, activeSessionId, setActiveSessionId, handleNewChat, handleRenameSession, handleDeleteSession } = useChat();
  const { showPrompt, showConfirm } = useModal();
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  // Determine active id based on pathname
  let activeId = "";
  if (pathname === "/") activeId = "ai";
  else if (pathname.startsWith("/experts")) activeId = "experts";
  else if (pathname.startsWith("/bookings")) activeId = "bookings";
  else if (pathname.startsWith("/dashboard")) activeId = "dashboard";
  else if (pathname.startsWith("/admin")) activeId = "admin";
  else if (pathname.startsWith("/profile")) activeId = "profile";

  const fullName = (userProfile?.full_name as string) || "";
  const profilePictureUrl = userProfile?.profile_picture as string | undefined;

  // Safely generate initials, defaulting to "U" (for User) if the name is blank
  const initials = fullName.trim()
    ? fullName.trim().split(/\s+/).map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : "U";

  return (
    <aside className={cn(
      "border-r border-border bg-card flex flex-col shrink-0 transition-all duration-200 overflow-hidden",
      collapsed ? "w-14" : "w-56"
    )}>
      <div className="px-2.5 py-3 border-b border-border flex items-center justify-between gap-2 min-w-0">
        <div className={cn("flex items-center gap-2.5 min-w-0 overflow-hidden transition-all duration-200", collapsed ? "w-0 opacity-0 pointer-events-none" : "flex-1 opacity-100")}>
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <JogenLogo className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground whitespace-nowrap">Jogen</span>
        </div>
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 mx-auto">
            <JogenLogo className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
        <button onClick={onToggle} className={cn(
          "p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0",
          collapsed && "hidden"
        )}>
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      {collapsed && (
        <button onClick={onToggle} className="flex items-center justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto flex flex-col">
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
          // Check if this item is active
          const isActive = activeId === id;
          if (id === "admin" && !isAdmin) return null;
          
          const expertDataObj = userProfile?.expert_data as any;
          if (id === "dashboard" && expertDataObj?.verification_status !== 'verified') return null;

          return (
            <div key={id}>
              <Link href={href} title={collapsed ? label : undefined}
                className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  collapsed ? "justify-center" : "",
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent")}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <div className="flex items-center flex-1 min-w-0 justify-between">
                    <span>{label}</span>
                    {id === "ai" && isActive && (
                      <div
                        className="p-0.5 rounded hover:bg-primary-foreground/20 ml-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsHistoryExpanded(!isHistoryExpanded);
                        }}
                      >
                        {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                )}
              </Link>
              {/* AI History Dropdown logic */}
              {id === "ai" && isActive && !collapsed && isHistoryExpanded && sessions && (
                <div className="pl-9 pr-2 py-2 space-y-1">
                  <button onClick={handleNewChat} className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                    <Plus className="w-3 h-3" /> New Chat
                  </button>
                  {sessions.map((session) => (
                    <div key={session.id} className={cn(
                      "group relative w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors",
                      session.id === activeSessionId ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent"
                    )}>
                      <button
                        onClick={() => setActiveSessionId(session.id)}
                        className="flex-1 text-left truncate min-w-0"
                      >
                        {session.title}
                      </button>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-accent pl-2">
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const newTitle = await showPrompt("Enter new session name:", session.title);
                            if (newTitle && newTitle.trim() !== "") {
                               handleRenameSession(session.id, newTitle.trim());
                            }
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (await showConfirm("Are you sure you want to delete this chat?")) {
                               handleDeleteSession(session.id);
                            }
                          }}
                          className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-2 border-t border-border">
        <Link href="/profile" title={collapsed ? "Profile" : undefined}
          className={cn("w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors group",
            collapsed ? "justify-center" : "",
            activeId === "profile" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>

          {/* Conditional rendering for Profile Picture vs Initials */}
          {profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePictureUrl}
              alt={fullName || "Profile"}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
              activeId === "profile" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary")}>
              {initials}
            </div>
          )}

          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className={cn("text-sm font-semibold truncate", activeId === "profile" ? "text-primary-foreground" : "text-foreground")}>{fullName}</p>
              <p className={cn("text-xs", activeId === "profile" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {isExpert ? "Seeker · Expert" : "Business Seeker"}
              </p>
            </div>
          )}
          {!collapsed && (
            <User className={cn("w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity",
              activeId === "profile" ? "text-primary-foreground" : "text-muted-foreground")} />
          )}
        </Link>
      </div>
    </aside>
  );
}