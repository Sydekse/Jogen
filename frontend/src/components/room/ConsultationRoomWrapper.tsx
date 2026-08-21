'use client';

import React, { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import FigmaLiveKitStage from './FigmaLiveKitStage';
import { BookingChannel } from '@/src/types/booking';

import { API_BASE_URL } from '@/src/config/api';

export default function ConsultationRoomWrapper({ bookingId }: { bookingId: string }) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<BookingChannel>('video');
  const [scheduledStart, setScheduledStart] = useState<string | undefined>();
  const [scheduledEnd, setScheduledEnd] = useState<string | undefined>();

  const handleRoomError = (roomError: Error) => {
    if (roomError.name === "NotFoundError") {
      setError("No camera or microphone was found. Connect a device or check browser permissions, then reload the session.");
      return;
    }
    setError(roomError.message || "Failed to connect to the consultation room.");
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const authToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        // Fetch token from Django. Include Auth headers if your endpoint requires it!
        const res = await fetch(`${API_BASE_URL}/consultations/video-token/?room_name=${bookingId}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (!res.ok) throw new Error("Failed to authorize session.");
        
        const data = await res.json();
        const bookingResponse = await fetch(`${API_BASE_URL}/consultations/${bookingId}/`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!bookingResponse.ok) throw new Error("Failed to load consultation mode.");
        const booking = await bookingResponse.json();
        setChannel(booking.channel || 'video');
        setScheduledStart(booking.scheduled_start);
        setScheduledEnd(booking.scheduled_end);
        setToken(data.token);
        setServerUrl(data.livekit_url);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to connect to the session.");
      }
    };

    fetchToken();
  }, [bookingId]);

  if (error) {
    return <div className="flex h-full items-center justify-center text-destructive font-bold">{error}</div>;
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium">Securing connection...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={channel === 'video'}
      audio={channel === 'voice' || channel === 'video'}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onError={handleRoomError}
      data-lk-theme="default"
      style={{ height: '100%' }}
    >
      {/* This is your custom Figma UI, injected into the LiveKit ecosystem */}
      <FigmaLiveKitStage 
        bookingId={bookingId} 
        channel={channel} 
        scheduledStart={scheduledStart} 
        scheduledEnd={scheduledEnd} 
      />
      
      {/* Required to ensure audio plays correctly in the browser */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
