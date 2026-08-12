"use client";

import { useRouter } from "next/navigation";
import { ExpertList } from "@/src/features/experts/ExpertList";

export default function ExpertsPage() {
  const router = useRouter();

  return (
    <ExpertList 
      onViewExpert={(id) => { 
        router.push(`/experts/${id}`); 
      }} 
    />
  );
}
