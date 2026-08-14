'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useTracks, 
  useLocalParticipant,
  useRoomContext,
  VideoTrack
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { 
  Mic, MicOff, Camera, CameraOff, ScreenShare, 
  PhoneOff, Timer, FileUp, FileText, Send
} from 'lucide-react';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function FigmaLiveKitStage({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  
  // --- LiveKit Hooks ---
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  
  // Fetch all active camera tracks (yours + the expert's)
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  // --- UI State (From your Figma design) ---
  const INITIAL_TIME = 25 * 60; // 25 mins
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [showWarning, setShowWarning] = useState(false);
  const [extended, setExtended] = useState(false);
  const [notes, setNotes] = useState("");
  const warned = useRef(false);

  // Timer Logic
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(t);
          handleEndSession();
          return 0;
        }
        if (prev === 120 && !warned.current) {
          warned.current = true;
          setShowWarning(true);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // --- Actions ---
  const toggleMic = () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  const toggleCam = () => localParticipant.setCameraEnabled(!isCameraEnabled);
  
  const handleEndSession = () => {
    room.disconnect();
    router.push(`/bookings/${bookingId}/review`);
  };

  const authorizeExtension = () => {
    setTimeLeft((prev) => prev + 15 * 60);
    setExtended(true);
    setShowWarning(false);
    // TODO: Hit Django API to update escrow logic
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background relative">
      
      {/* 2-Minute Warning Overlay */}
      {showWarning && (
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-6">
          <div className="w-full max-w-lg bg-card border-2 border-amber-400 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-foreground">2-Minute Warning</p>
                <p className="text-xs text-muted-foreground">Your consultation window is about to expire</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Both parties can authorize a <strong className="text-foreground">15-minute paid extension</strong>.</p>
            <div className="flex gap-3">
              <button onClick={authorizeExtension} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90">
                Authorize 15-Min Extension
              </button>
              <button onClick={() => setShowWarning(false)} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-accent">
                Dismiss & Wrap Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            J
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Booking #{bookingId}</p>
            <p className="text-xs text-muted-foreground">Jogen Secure Video Session</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold tabular-nums text-sm font-mono", 
            timeLeft <= 120 ? "bg-red-100 text-red-600" : "bg-muted text-foreground"
          )}>
            <Timer className="w-3.5 h-3.5" />{formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        
        {/* Video Stage */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
          
          {/* Dynamic Video Grid */}
          <div className="flex-1 p-4 grid gap-4" style={{
            gridTemplateColumns: cameraTracks.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          }}>
            {cameraTracks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-500">
                <CameraOff className="w-12 h-12 mb-4 opacity-50" />
                <p>Waiting for cameras...</p>
              </div>
            ) : (
              cameraTracks.map((trackRef) => (
                <div key={trackRef.publication.trackSid} className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 shadow-xl">
                  <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-2">
                    {trackRef.participant.identity === localParticipant.identity ? "You" : "Expert"}
                    {!trackRef.participant.isMicrophoneEnabled && <MicOff className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-4 py-5 bg-gradient-to-t from-gray-950 to-transparent shrink-0">
            <button onClick={toggleMic} className={cn("p-4 rounded-2xl transition-all shadow-lg", isMicrophoneEnabled ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500 text-white hover:bg-red-600")}>
              {isMicrophoneEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button onClick={toggleCam} className={cn("p-4 rounded-2xl transition-all shadow-lg", isCameraEnabled ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500 text-white hover:bg-red-600")}>
              {isCameraEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
            </button>
            <button className="p-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white transition-all shadow-lg">
              <ScreenShare className="w-6 h-6" />
            </button>
            <button onClick={handleEndSession} className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-900/50">
              <PhoneOff className="w-5 h-5" /> End Session
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-border flex flex-col shrink-0 bg-card/50">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-bold text-foreground">Session Documents</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/50 transition-colors">
              <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Upload Document</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or images</p>
            </div>
          </div>
          <div className="p-4 border-t border-border bg-card">
            <p className="text-xs font-bold text-foreground mb-2">Private Notes</p>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={5} 
              placeholder="Take notes during session. These are only visible to you..." 
              className="w-full text-sm text-foreground bg-muted rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary resize-none border border-border" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
