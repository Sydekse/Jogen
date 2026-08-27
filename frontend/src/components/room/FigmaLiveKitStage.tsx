'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  useTracks, 
  useLocalParticipant,
  useRoomContext,
  VideoTrack
} from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import { paymentService } from '@/src/services/paymentService';
import { BookingChannel } from '@/src/types/booking';
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';
import { useUser } from '@/src/context/UserContext';
import { 
  Mic, MicOff, Camera, CameraOff, ScreenShare, ScreenShareOff,
  PhoneOff, Timer, FileUp, FileText, X
} from 'lucide-react';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface FigmaLiveKitStageProps {
  bookingId: string;
  channel: BookingChannel;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export default function FigmaLiveKitStage({ 
  bookingId, 
  channel,
  scheduledStart,
  scheduledEnd 
}: FigmaLiveKitStageProps) {
  const router = useRouter();
  const room = useRoomContext();
  const { isExpert } = useUser();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true });

  const calculateRemainingSeconds = () => {
    if (!scheduledEnd) return 25 * 60;
    const endMs = new Date(scheduledEnd).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((endMs - nowMs) / 1000));
  };

  const calculateSecondsUntilStart = () => {
    if (!scheduledStart) return 0;
    const startMs = new Date(scheduledStart).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((startMs - nowMs) / 1000));
  };

  const [timeLeft, setTimeLeft] = useState<number>(() => calculateRemainingSeconds());
  const [timeUntilStart, setTimeUntilStart] = useState<number>(() => calculateSecondsUntilStart());
  const [showWarning, setShowWarning] = useState(false);
  const [notes, setNotes] = useState("");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<Array<{ id: string; file_name: string }>>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const warned = useRef(false);
  const endingSessionRef = useRef(false);

  const handleEndSession = useCallback(async () => {
    if (endingSessionRef.current) return;
    endingSessionRef.current = true;

    try {
      if (room && room.state === 'connected') {
        const data = new TextEncoder().encode(JSON.stringify({ type: 'SESSION_ENDED' }));
        await room.localParticipant.publishData(data, { reliable: true });
        room.disconnect();
      }
    } catch (err) {
      console.error('Failed to broadcast session end signal:', err);
    }

    let settlementSucceeded = false;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      let elapsedSeconds = 0;
      if (scheduledStart) {
        const startMs = new Date(scheduledStart).getTime();
        const nowMs = Date.now();
        elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      }

      const settlement = await paymentService.submitSessionEnd(bookingId, elapsedSeconds, token);
      settlementSucceeded = Boolean(settlement.status);
    } catch (err) {
      console.error('Session settlement request failed:', err);
    } finally {
      const queryParam = settlementSucceeded ? '?settled=true' : '';
      if (isExpert) {
        router.push(`/bookings${queryParam}`);
      } else {
        router.push(`/bookings/${bookingId}/review${queryParam}`);
      }
    }
  }, [room, bookingId, scheduledStart, router, isExpert]);

  useEffect(() => {
    if (!room) return;

    const onDataReceived = (payload: Uint8Array) => {
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str);
        if (data.type === 'SESSION_ENDED') {
          handleEndSession();
        }
      } catch (err) {
        console.error('Error parsing room data event:', err);
      }
    };

    const onDisconnected = () => {
      handleEndSession();
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room, handleEndSession]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndSession();
          return 0;
        }
        if (prev === 120 && !warned.current) {
          setShowWarning(true);
          warned.current = true;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleEndSession]);

  useEffect(() => {
    if (timeUntilStart <= 0) return;
    const timer = setInterval(() => {
      setTimeUntilStart((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeUntilStart]);

  const authorizeExtension = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      const response = await fetchWithAuth(`${API_BASE_URL}/consultations/${bookingId}/extend/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to authorize extension.');
      }

      const data = await response.json();
      setShowWarning(false);
      if (data.scheduled_end) {
        const endMs = new Date(data.scheduled_end).getTime();
        const nowMs = Date.now();
        setTimeLeft(Math.max(0, Math.floor((endMs - nowMs) / 1000)));
      } else {
        setTimeLeft((prev) => prev + 15 * 60);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Extension failed.');
    }
  };

  const toggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleCam = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const toggleScreenShare = async () => {
    try {
      const nextState = !isScreenSharing;
      await localParticipant.setScreenShareEnabled(nextState);
      setIsScreenSharing(nextState);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/consultations/${bookingId}/files/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document.');
      }

      const updated = await fetchWithAuth(`${API_BASE_URL}/consultations/${bookingId}/files/`);
      if (updated.ok) {
        setSessionFiles(await updated.json());
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openSessionFile = async (fileId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      const response = await fetchWithAuth(`${API_BASE_URL}/consultations/${bookingId}/files/${fileId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to access file.');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Could not open file.');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background relative">
      
      {showWarning && (
        <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-end justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg bg-card border-2 border-amber-400 rounded-2xl p-4 sm:p-6 shadow-2xl">
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
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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

      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xs sm:text-sm shrink-0">
            J
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-foreground truncate">Booking #{bookingId.slice(0, 8)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Jogen Secure Video Session</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {timeUntilStart > 0 && (
            <div className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] sm:text-xs font-semibold">
              Starts in {formatTime(timeUntilStart)}
            </div>
          )}
          <div className={cn("flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold tabular-nums text-xs sm:text-sm font-mono", 
            timeLeft <= 120 ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400" : "bg-muted text-foreground"
          )}>
            <Timer className="w-3.5 h-3.5" />{formatTime(timeLeft)}
          </div>
          
          <button
            type="button"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="md:hidden p-2 rounded-xl border border-border text-foreground hover:bg-accent transition-colors flex items-center gap-1 text-xs font-medium"
            title="Toggle Documents & Notes"
          >
            <FileText className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-950 relative overflow-hidden">
          <div className="flex-1 min-h-0 pb-24 sm:pb-28 p-2 sm:p-4 grid gap-2 sm:gap-4 overflow-y-auto" style={{
            gridTemplateColumns: cameraTracks.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
          }}>
            {channel !== 'video' ? (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <p className="font-semibold text-sm sm:text-base">{channel === 'voice' ? 'Voice consultation in progress' : 'Text consultation in progress'}</p>
              </div>
            ) : cameraTracks.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                <CameraOff className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-50 text-gray-400" />
                <p className="text-xs sm:text-sm font-medium">Waiting for participant cameras...</p>
              </div>
            ) : (
              cameraTracks.map((trackRef) => (
                <div key={trackRef.publication.trackSid} className="relative w-full h-48 sm:h-64 md:h-full min-h-[180px] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xl">
                  <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold text-white flex items-center gap-1.5">
                    {trackRef.participant.identity === localParticipant.identity ? "You" : "Expert"}
                    {!trackRef.participant.isMicrophoneEnabled && <MicOff className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 sm:py-5 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
            <button onClick={toggleMic} className={cn("p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all shadow-lg", isMicrophoneEnabled ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500 text-white hover:bg-red-600")} title="Toggle Microphone">
              {isMicrophoneEnabled ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            {channel === 'video' && <button onClick={toggleCam} className={cn("p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all shadow-lg", isCameraEnabled ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-red-500 text-white hover:bg-red-600")} title="Toggle Camera">
              {isCameraEnabled ? <Camera className="w-5 h-5 sm:w-6 sm:h-6" /> : <CameraOff className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>}
            {channel === 'video' && <button onClick={toggleScreenShare} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-800 hover:bg-gray-700 text-white transition-all shadow-lg hidden sm:flex" title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}>
              {isScreenSharing ? <ScreenShareOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <ScreenShare className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>}
            <button onClick={handleEndSession} className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-red-600 text-white font-bold text-xs sm:text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-950/50">
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" /> End Session
            </button>
          </div>
        </div>

        <div className={cn(
          "border-l border-border flex flex-col shrink-0 bg-card transition-all duration-300 z-30",
          showMobileSidebar 
            ? "fixed inset-x-0 bottom-0 top-14 md:relative md:inset-auto md:top-auto w-full md:w-72 shadow-2xl md:shadow-none" 
            : "hidden md:flex md:w-72"
        )}>
          <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between">
            <p className="text-xs sm:text-sm font-bold text-foreground">Session Documents</p>
            <button
              type="button"
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-accent/50 transition-colors">
              <FileUp className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">{uploadingFile ? 'Uploading...' : 'Upload Document'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">PDF or images</p>
              <input ref={fileInputRef} type="file" accept="application/pdf,image/*,.doc,.docx" onChange={handleFileSelected} className="hidden" />
            </div>
            {sessionFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {sessionFiles.map((file) => (
                  <button key={file.id} type="button" onClick={() => openSessionFile(file.id)} className="block w-full text-left text-xs text-primary hover:underline truncate">
                    {file.file_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3.5 sm:p-4 border-t border-border bg-card">
            <p className="text-xs font-bold text-foreground mb-2">Private Notes</p>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={4} 
              placeholder="Take notes during session. These are only visible to you..." 
              className="w-full text-xs sm:text-sm text-foreground bg-muted rounded-xl p-3 outline-none focus:ring-1 focus:ring-primary resize-none border border-border" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
