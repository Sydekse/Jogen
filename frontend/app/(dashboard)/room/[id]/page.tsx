import ConsultationRoomWrapper from '@/src/components/room/ConsultationRoomWrapper';

export default async function RoomPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Await params for Next.js 16 compatibility
  const resolvedParams = await params;

  return (
    <main className="h-[calc(100dvh-56px)] bg-background bg-drafting-grid overflow-hidden">
      <ConsultationRoomWrapper bookingId={resolvedParams.id} />
    </main>
  );
}
