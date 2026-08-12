"use client";

import { ProfileScreen } from "@/src/features/profile/ProfileScreen";
import { useUser } from "@/src/context/UserContext";

export default function ProfilePage() {
  const { isExpert, setIsExpert, logout, userProfile, refreshProfile } = useUser();

  return (
    <ProfileScreen
      isExpert={isExpert}
      setIsExpert={setIsExpert}
      onLogout={logout}
      userProfile={userProfile}
      onProfileUpdate={refreshProfile}
    />
  );
}
