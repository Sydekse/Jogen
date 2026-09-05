import { ExpertProfile } from '@/src/features/experts/ExpertProfile';

// 1. Make the page async and type params as a Promise
export default async function ExpertProfilePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  // 2. Await the params to unwrap the ID
  const resolvedParams = await params;

  return (
    <main className="min-h-screen bg-background bg-drafting-grid">
      {/* 3. Pass the unwrapped ID into your component */}
      <ExpertProfile expertId={resolvedParams.id} />
    </main>
  );
}
