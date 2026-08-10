"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/src/features/auth/AuthScreen";
import { LandingPage } from "@/src/features/landing/LandingPage";
import { useUser } from "@/src/context/UserContext";

export default function WelcomePage() {
  const { isAuthenticated, login, darkMode, setDarkMode, lang, setLang } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();

  // If already authenticated, redirect to dashboard chat
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  if (showAuth) {
    return (
      <AuthScreen 
        onLoginSuccess={async () => {
          await login();
          router.push("/");
        }}
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
