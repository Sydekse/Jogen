"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ExpertProfile } from "@/src/features/experts/ExpertProfile";

export default function ExpertProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  return (
    <ExpertProfile 
      expertId={id} 
    />
  );
}
