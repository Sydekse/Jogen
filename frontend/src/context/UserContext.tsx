"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  isAuthenticated: boolean;
  userProfile: Record<string, unknown> | null;
  isExpert: boolean;
  isAdmin: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("en");

  const refreshProfile = async () => {
    try {
      const { getUserProfile } = await import('@/src/services/userService');
      const profile = await getUserProfile();
      setUserProfile(profile);
      setIsExpert(!!profile.is_expert);
      setIsAdmin(!!profile.is_admin);
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(true);
      refreshProfile();
    }
  }, []);

  const login = async () => {
    setIsAuthenticated(true);
    await refreshProfile();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setIsExpert(false);
    setIsAdmin(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <UserContext.Provider value={{
      isAuthenticated,
      userProfile,
      isExpert,
      isAdmin,
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
