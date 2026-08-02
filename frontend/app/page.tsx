// app/page.tsx
"use client";

import { useState } from "react";
import { AuthScreen } from "@/src/components/AuthScreen";
import ChatInterface from "@/src/components/ChatInterface";

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      {!isAuthenticated ? (
        <AuthScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <ChatInterface />
      )}
    </main>
  );
}