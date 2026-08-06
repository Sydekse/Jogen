"use client";

import { useState } from "react";
import { AuthScreen } from "@/src/features/auth/AuthScreen";
import { MainApp } from "@/src/features/main/MainApp";
import { LandingPage } from "@/src/features/landing/LandingPage";

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  // App-wide theme and language state since these need to be shared
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<"en" | "am">("en");

  if (!isAuthenticated) {
    if (showAuth) {
      return (
        <AuthScreen 
          onLoginSuccess={() => setIsAuthenticated(true)}
        />
      );
    }
    
    return (
      <div className={darkMode ? "dark" : ""}>
        <LandingPage 
          onGetStarted={() => setShowAuth(true)}
          onDemo={() => setShowAuth(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          lang={lang}
          setLang={setLang}
        />
      </div>
    );
  }

  // Once authenticated, render MainApp which internally has the Sidebar and Topbar.
  return (
    <div className={darkMode ? "dark" : ""}>
      <MainApp 
        onLogout={() => {
          setIsAuthenticated(false);
          setShowAuth(false);
        }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        lang={lang}
        setLang={setLang}
      />
    </div>
  );
}