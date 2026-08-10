"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  isAuthenticated: boolean;
  userProfile: Record<string, unknown> | null;
  isExpert: boolean;
  darkMode: boolean;
  lang: "en" | "am";
  login: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setDarkMode: (mode: boolean) => void;
  setLang: (lang: "en" | "am") => void;
  setIsExpert: (expert: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [isExpert, setIsExpert] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("en");

  const refreshProfile = async () => {
    try {
      const { getUserProfile } = await import('@/src/services/userService');
      const profile = await getUserProfile();
      setUserProfile(profile);
      setIsExpert(profile.is_expert);
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  const login = async () => {
    setIsAuthenticated(true);
    await refreshProfile();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setIsExpert(false);
  };

  return (
    <UserContext.Provider value={{
      isAuthenticated,
      userProfile,
      isExpert,
      darkMode,
      lang,
      login,
      logout,
      refreshProfile,
      setDarkMode,
      setLang,
      setIsExpert
    }}>
      <div className={darkMode ? "dark" : ""}>
        {children}
      </div>
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
