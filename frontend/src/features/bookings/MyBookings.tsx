'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, Video, Phone, MessageCircle, Hash, 
  Timer, FileText, Star, X, Users 
} from 'lucide-react';
import { useUser } from '@/src/context/UserContext';
import { bookingService } from '@/src/services/bookingService';
import { BookingDetail } from '@/src/types/booking';
import { toast } from 'sonner';

// --- Utility ---
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const COLORS = ["#7C3AED", "#0891B2", "#059669", "#DC2626", "#EA580C"];
function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string) {
  return name.trim() ? name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : "EX";
}

// --- Types ---
type SessionMode = "voice" | "video" | "text";
type UIStatus = "completed" | "upcoming" | "live" | "cancelled";

interface Expert {
  id: string; name: string; title: string; color: string; initials: string;
}

interface Booking {
  id: string; expert: Expert; topic: string;
  date: string; scheduledTime: string; scheduledTs: number;
  duration: number; amount: number; status: UIStatus;
  mode: SessionMode; invoiceReady?: boolean;
}

export function MyBookings() {
  const router = useRouter();
  const { isAuthenticated, user } = useUser();
  const [filter, setFilter] = useState<"all" | UIStatus>("all");
  const [now, setNow] = useState(() => Date.now());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Update current time every 30 seconds for accurate countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => setLoading(true), 0);
    bookingService.getBookings(token)
      .then(data => {
        const mapped = data.map((b: BookingDetail): Booking => {
          const start = new Date(b.scheduled_start);
          const end = new Date(b.scheduled_end);
          const duration = Math.round((end.getTime() - start.getTime()) / 60000);
          const rate = parseFloat(b.rate_snapshot || "0");
          const amount = (rate / 30) * duration;

          let uiStatus: UIStatus = "upcoming";
          if (b.status === "completed") uiStatus = "completed";
          else if (b.status === "cancelled") uiStatus = "cancelled";
          else if (b.status === "disputed") uiStatus = "cancelled";
          else {
            const mins = Math.floor((start.getTime() - Date.now()) / 60000);
            if (mins <= 5 && mins >= -duration) uiStatus = "live";
            else uiStatus = "upcoming";
          }

          const mode: SessionMode = b.channel === "chat" ? "text" : b.channel;

          return {
            id: b.id,
            expert: {
              id: b.expert,
              name: user?.is_expert ? (b.client_name || "Client") : (b.expert_name || "Unknown Expert"),
              title: user?.is_expert ? "Client" : (b.expert_title || "Consultant"),
              initials: getInitials(user?.is_expert ? (b.client_name || "Client") : (b.expert_name || "")),
              color: getColor(user?.is_expert ? (b.client_name || "Client") : (b.expert_name || ""))
            },
            topic: "Advisory Consultation",
            date: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            scheduledTime: start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            scheduledTs: start.getTime(),
            duration,
            amount: Math.round(amount),
            status: uiStatus,
            mode,
            invoiceReady: uiStatus === "completed"
          };
        });
        setBookings(mapped);
      })
      .catch(() => {
        toast.error("Failed to fetch bookings.");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, user?.is_expert]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    try {
      await bookingService.cancelBooking(id, token);
      toast.success("Booking cancelled successfully.");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel booking.");
    }
  };

  const minsUntil = (ts: number) => Math.floor((ts - now) / 60000);

  // A session is joinable if it's within 5 minutes of starting, or currently ongoing
  const canJoin = (b: Booking) => {
    const mins = minsUntil(b.scheduledTs);
    return (b.status === "upcoming" || b.status === "live") && mins <= 5 && mins >= -b.duration;
  };

  const timeUntilLabel = (b: Booking) => {
    const mins = minsUntil(b.scheduledTs);
    if (mins <= 0) return "Session in progress";
    if (mins < 60) return `Starts in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `Starts in ${hrs}h ${rem}m` : `Starts in ${hrs}h`;
  };

  const STATUS_META: Record<UIStatus, { label: string; dot: string; text: string }> = {
    completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
    upcoming:  { label: "Upcoming",  dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400" },
    live:      { label: "Live Now",  dot: "bg-red-500 animate-pulse", text: "text-red-600 dark:text-red-400" },
    cancelled: { label: "Cancelled", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  };

  const MODE_ICON: Record<SessionMode, typeof Video> = {
    video: Video, voice: Phone, text: MessageCircle,
  };

  const tabs: Array<{ id: "all" | UIStatus; label: string; count?: number }> = [
    { id: "all", label: "All", count: bookings.length },
    { id: "upcoming", label: "Upcoming", count: bookings.filter(b => b.status === "upcoming").length },
    { id: "completed", label: "Completed", count: bookings.filter(b => b.status === "completed").length },
    { id: "cancelled", label: "Cancelled", count: bookings.filter(b => b.status === "cancelled").length },
  ];

  const visible = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
  const sorted = [...visible].sort((a, b) => b.scheduledTs - a.scheduledTs);
  const upcomingCount = bookings.filter(b => b.status === "upcoming" || b.status === "live").length;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading your bookings...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {upcomingCount > 0
              ? `You have ${upcomingCount} upcoming session${upcomingCount > 1 ? "s" : ""}.`
              : "No upcoming sessions. Find an expert to book a consultation."}
          </p>
        </div>

        {/* Join Now Banner (Appears when session is close) */}
        {bookings.filter(canJoin).map(b => (
          <div key={`banner-${b.id}`} className="mb-5 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: b.expert.color }}>
                {b.expert.initials}
                </div>
                <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                    Your session with {b.expert.name} is ready to join
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.topic} · {b.scheduledTime} · {b.duration} min</p>
                </div>
            </div>
            <button
              onClick={() => router.push(`/room/${b.id}`)}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              <Video className="w-4 h-4" /> Join Now
            </button>
          </div>
        ))}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6 bg-muted/40 rounded-xl p-1 border border-border w-fit">
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setFilter(t.id)}
              className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors",
                filter === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-bold",
                  filter === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking Cards */}
        {sorted.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-2xl">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No bookings in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(b => {
              const meta = STATUS_META[b.status];
              const ModeIcon = MODE_ICON[b.mode];
              const joinable = canJoin(b);

              return (
                <div key={b.id} className={cn(
                  "bg-card border rounded-2xl p-5 transition-all hover:shadow-sm",
                  joinable ? "border-primary/30 shadow-md" : "border-border hover:border-primary/20"
                )}>
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: b.expert.color }}>
                      {b.expert.initials}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                        <div>
                          <p className="font-bold text-foreground text-base">{b.expert.name}</p>
                          <p className="text-sm text-muted-foreground">{b.expert.title}</p>
                        </div>
                        {/* Status Badge */}
                        <div className={cn("flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border",
                          b.status === "completed" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                          b.status === "upcoming"  ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" :
                          b.status === "live"      ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                                     "bg-muted border-border text-muted-foreground")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                          {meta.label}
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-foreground mt-3">{b.topic}</p>

                      {/* Meta Data */}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{b.date} · {b.scheduledTime}</span>
                        <span className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />{b.duration} min</span>
                        <span className="flex items-center gap-1.5"><ModeIcon className="w-3.5 h-3.5" />{b.mode.charAt(0).toUpperCase() + b.mode.slice(1)}</span>
                        <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{b.id}</span>
                      </div>

                      {/* Countdown Badge */}
                      {b.status === "upcoming" && !joinable && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full">
                          <Timer className="w-3.5 h-3.5" />{timeUntilLabel(b)}
                        </div>
                      )}

                      {/* Action Row */}
                      <div className="flex flex-wrap items-center justify-between mt-5 pt-4 border-t border-border gap-4">
                        <span className="text-sm font-bold text-foreground">
                          {b.status === "upcoming" && <span className="text-muted-foreground font-normal text-xs mr-1">Escrow held ·</span>}
                          {b.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ETB</span>
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {b.status === "completed" && b.invoiceReady && (
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors">
                              <FileText className="w-3.5 h-3.5" />Invoice
                            </button>
                          )}
                          {b.status === "completed" && (
                            <button onClick={() => router.push(`/bookings/${b.id}/review`)} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                              <Star className="w-3.5 h-3.5" />Review
                            </button>
                          )}
                          {joinable && (
                            <button
                              onClick={() => router.push(`/room/${b.id}`)}
                              className="flex items-center gap-1.5 text-xs font-bold text-primary-foreground bg-primary px-5 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                              <Video className="w-3.5 h-3.5" />Join Session
                            </button>
                          )}
                          {b.status === "upcoming" && !joinable && (
                            <button onClick={() => handleCancel(b.id)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-border px-4 py-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors">
                              <X className="w-3.5 h-3.5" />Cancel
                            </button>
                          )}
                          {b.status === "cancelled" && (
                            <button onClick={() => router.push(`/experts/${b.expert.id}`)} className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                              Rebook
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Footer */}
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-base font-bold text-foreground mb-1">Need another consultation?</p>
          <p className="text-sm text-muted-foreground mb-5">Browse verified experts across tax, corporate, FX, and IP law.</p>
          <button 
            onClick={() => router.push('/experts')} 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Users className="w-4 h-4" />Find an Expert
          </button>
        </div>
      </div>
    </div>
  );
}
