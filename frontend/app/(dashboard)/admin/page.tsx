"use client";

import { AdminDashboard } from "@/src/features/admin/AdminDashboard";
import { useUser } from "@/src/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { isAdmin, isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, isAuthenticated, router]);

  if (!isAdmin) {
    return null;
  }

  return <AdminDashboard />;
}
