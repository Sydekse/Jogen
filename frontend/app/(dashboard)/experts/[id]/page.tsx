"use client";

import { use } from "react";
import { ExpertProfile } from "@/src/features/experts/ExpertProfile";

export default function ExpertProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <ExpertProfile 
      expertId={id} 
    />
  );
}
