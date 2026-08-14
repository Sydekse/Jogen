'use client';

import React, { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import FigmaLiveKitStage from './FigmaLiveKitStage';

export default function ConsultationRoomWrapper({ bookingId }: { bookingId: string }) {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const authToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        // Fetch token from Django. Include Auth headers if your endpoint requires it!
        const res = await fetch(`http://localhost:8000/api/v1/consultations/video-token/?room_name=${bookingId}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (!res.ok) throw new Error("Failed to authorize session.");
        
        const data = await res.json();
        setToken(data.token);
        setServerUrl(data.livekit_url);
      } catch (err: any) {
        setError(err.message || "Failed to connect to the session.");
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
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: '100%' }}
    >
      {/* This is your custom Figma UI, injected into the LiveKit ecosystem */}
      <FigmaLiveKitStage bookingId={bookingId} />
      
      {/* Required to ensure audio plays correctly in the browser */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
