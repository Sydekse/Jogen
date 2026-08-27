"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, MobileBottomNav } from "@/src/components/layout/Sidebar";
import { TopBar } from "@/src/components/layout/TopBar";
import { useUser } from "@/src/context/UserContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useUser();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/welcome");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden font-sans relative">
      <Sidebar 
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-14 md:pb-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
