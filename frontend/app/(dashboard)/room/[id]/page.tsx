import ConsultationRoomWrapper from '@/src/components/room/ConsultationRoomWrapper';

export default async function RoomPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Await params for Next.js 16 compatibility
  const resolvedParams = await params;

  return (
    <main className="h-[calc(100vh-56px)] bg-background">
      <ConsultationRoomWrapper bookingId={resolvedParams.id} />
    </main>
  );
}
