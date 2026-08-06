import React, { useState, useEffect } from "react";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { TopBar } from "@/src/components/layout/TopBar";
import ChatInterface from "@/src/features/chat/ChatInterface";
import { ExpertList } from "@/src/features/experts/ExpertList";
import { ProfileScreen } from "@/src/features/profile/ProfileScreen";
import { ChatSession } from "@/src/features/chat/ChatInterface";

import { ExpertDashboard } from "@/src/features/dashboard/ExpertDashboard";
import { ExpertProfile } from "@/src/features/experts/ExpertProfile";

export function MainApp({ onLogout, darkMode, setDarkMode, lang, setLang }: { 
  onLogout: () => void;
  darkMode: boolean; setDarkMode: (v: boolean) => void;
  lang: "en" | "am"; setLang: (l: "en" | "am") => void;
}) {
  const [screen, setScreen] = useState<string>("ai");
  const [collapsed, setCollapsed] = useState(false);
  const [isExpert, setIsExpert] = useState(false);
  const [selectedExpertId, setSelectedExpertId] = useState<string>("");

  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  
  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const handleNewChat = React.useCallback((currentSessions: ChatSession[], currentActiveId: string) => {
    // Check if the current active session is already empty
    const currentSession = currentSessions.find(s => s.id === currentActiveId);
    if (currentSession && currentSession.messages.length <= 1 && currentSession.messages[0]?.sender === 'ai') {
        setScreen("ai");
        return; // Don't create a new one, just use the current empty one
    }
    
    // Also check if ANY session is empty and use that instead
    const emptySession = currentSessions.find(s => s.messages.length <= 1 && s.messages[0]?.sender === 'ai');
    if (emptySession) {
        setActiveSessionId(emptySession.id);
        setScreen("ai");
        return;
    }

    const newId = crypto.randomUUID();
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      messages: [
        { id: crypto.randomUUID(), sender: "ai", text: "Hello! Starting a fresh chat. How can I help?" }
      ]
    };
    setSessions([newSession, ...currentSessions]);
    setActiveSessionId(newId);
    setScreen("ai");
  }, []);

  useEffect(() => {
    // Fetch profile and chat history
    const loadData = async () => {
      try {
        const { getUserProfile } = await import('@/src/services/userService');
        const profile = await getUserProfile();
        setUserProfile(profile);
        setIsExpert(profile.is_expert);
        
        const { getChatHistory } = await import('@/src/services/chatService');
        const history = await getChatHistory();
        if (history && history.length > 0) {
          setSessions(history);
          setActiveSessionId(history[0].id);
        } else {
          handleNewChat([], "");
        }
      } catch (e) {
        console.error("Failed to load user data:", e);
      }
    };
    loadData();
  }, [handleNewChat]);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar 
        screen={screen} 
        setScreen={setScreen} 
        isExpert={isExpert} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        onNewChat={() => handleNewChat(sessions, activeSessionId)}
        userProfile={userProfile}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar 
          darkMode={darkMode} setDarkMode={setDarkMode}
          lang={lang} setLang={setLang}
        />
        <main className="flex-1 overflow-auto">
          {screen === "ai" && (
            <ChatInterface 
              sessions={sessions}
              setSessions={setSessions}
              activeSessionId={activeSessionId}
            />
          )}
          {screen === "experts" && <ExpertList onViewExpert={(id) => { setSelectedExpertId(id); setScreen("expert-profile"); }} />}
          {screen === "expert-profile" && <ExpertProfile expertId={selectedExpertId} onBack={() => setScreen("experts")} />}
          {screen === "profile" && <ProfileScreen isExpert={isExpert} setIsExpert={setIsExpert} onLogout={onLogout} userProfile={userProfile} />}
          {screen === "dashboard" && <ExpertDashboard />}
          {screen === "admin" && <div className="p-6">Admin Console (Coming Soon)</div>}
        </main>
      </div>
    </div>
  );
}
