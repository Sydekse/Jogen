'use client';

import { useRouter } from 'next/navigation';
import { ExpertList } from '@/src/features/experts/ExpertList';

export default function ExpertsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-background bg-drafting-grid">
      <ExpertList onViewExpert={(id) => router.push(`/experts/${id}`)} />
    </main>
  );
}
