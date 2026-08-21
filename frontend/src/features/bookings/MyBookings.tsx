'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, Video, Phone, MessageCircle, Hash, 
  Timer, FileText, Star, X, Users, Trash2, Printer, CheckCircle 
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
type UIStatus = "completed" | "upcoming" | "live" | "cancelled" | "expired";

interface Expert {
  id: string; name: string; title: string; color: string; initials: string;
}

interface Booking {
  id: string; expert: Expert; topic: string;
  date: string; scheduledTime: string; scheduledTs: number;
  duration: number; amount: number; status: UIStatus;
  mode: SessionMode; invoiceReady?: boolean; hasReview?: boolean;
  depositAmount?: number; clientRefund?: number; actualDuration?: number;
  settlementDecision?: string;
}

export function MyBookings() {
  const router = useRouter();
  const { isAuthenticated, userProfile } = useUser();
  const [filter, setFilter] = useState<UIStatus>("upcoming");
  const [now, setNow] = useState(() => Date.now());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);

  // Update current time every 10 seconds for accurate countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
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
          const depositAmount = Math.round(parseFloat(b.rate_snapshot || "0"));

          const grossEarned = b.settlement?.gross_earned ? parseFloat(b.settlement.gross_earned) : null;
          const clientRefund = b.settlement?.client_refund ? parseFloat(b.settlement.client_refund) : 0;
          const actualDuration = b.settlement?.duration_seconds ? Math.round(b.settlement.duration_seconds / 60) : duration;
          const finalAmount = grossEarned !== null ? Math.round(grossEarned) : depositAmount;

          let uiStatus: UIStatus = "upcoming";
          if (b.status === "completed") uiStatus = "completed";
          else if (b.status === "cancelled") uiStatus = "cancelled";
          else if (b.status === "disputed") uiStatus = "cancelled";
          else {
            const endsIn = Math.floor((end.getTime() - Date.now()) / 60000);
            const startsIn = Math.floor((start.getTime() - Date.now()) / 60000);
            if (endsIn < 0) uiStatus = "expired";
            else if (startsIn <= 5 && startsIn >= -duration) uiStatus = "live";
            else uiStatus = "upcoming";
          }

          const mode: SessionMode = b.channel === "chat" ? "text" : b.channel;
          
          const isCurrentUserClient = userProfile?.phone_number === b.client_phone;
          const displayPartyName = isCurrentUserClient ? (b.expert_name || "Unknown Expert") : (b.client_name || "Client");
          const displayPartyTitle = isCurrentUserClient ? (b.expert_title || "Consultant") : "Client";

          return {
            id: b.id,
            expert: {
              id: b.expert,
              name: displayPartyName,
              title: displayPartyTitle,
              initials: getInitials(displayPartyName),
              color: getColor(displayPartyName)
            },
            topic: "Advisory Consultation",
            date: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            scheduledTime: start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            scheduledTs: start.getTime(),
            duration,
            amount: finalAmount,
            depositAmount,
            clientRefund,
            actualDuration,
            settlementDecision: b.settlement?.decision,
            status: uiStatus,
            mode,
            invoiceReady: uiStatus === "completed",
            hasReview: Boolean(b.has_review),
          };
        });
        setBookings(mapped);
      })
      .catch(() => {
        toast.error("Failed to fetch bookings.");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, userProfile]);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this booking record?")) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    try {
      await bookingService.deleteBooking(id, token);
      toast.success("Booking removed.");
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove booking.");
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
    expired: { label: "Session Expired", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  };

  const MODE_ICON: Record<SessionMode, typeof Video> = {
    video: Video, voice: Phone, text: MessageCircle,
  };

  const upcomingCount = bookings.filter(b => b.status === "upcoming" || b.status === "live").length;

  const tabs: Array<{ id: UIStatus; label: string; count?: number }> = [
    { id: "upcoming", label: "Upcoming", count: upcomingCount },
    { id: "completed", label: "Completed", count: bookings.filter(b => b.status === "completed").length },
    { id: "cancelled", label: "Cancelled", count: bookings.filter(b => b.status === "cancelled").length },
    { id: "expired", label: "Expired", count: bookings.filter(b => b.status === "expired").length },
  ];

  const visible = bookings.filter(b => filter === "upcoming" ? (b.status === "upcoming" || b.status === "live") : b.status === filter);
  const sorted = [...visible].sort((a, b) => b.scheduledTs - a.scheduledTs);

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
                        <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />{b.id.slice(0, 8)}</span>
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
                          {b.status === "completed" && (
                            <button 
                              onClick={() => setSelectedInvoiceBooking(b)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-4 py-2 rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />Invoice
                            </button>
                          )}
                          {b.status === "completed" && (
                            b.hasReview ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-lg">
                                <CheckCircle className="w-3.5 h-3.5" /> Reviewed
                              </span>
                            ) : (
                              <button 
                                onClick={() => router.push(`/bookings/${b.id}/review`)} 
                                className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors"
                              >
                                <Star className="w-3.5 h-3.5" />Review
                              </button>
                            )
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
                          {(b.status === "cancelled" || b.status === "expired") && (
                            <button 
                              onClick={() => handleDelete(b.id)} 
                              className="flex items-center gap-1.5 text-xs font-semibold text-destructive border border-destructive/30 px-3.5 py-2 rounded-lg hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />Remove
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

      {/* Invoice Modal */}
      {selectedInvoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setSelectedInvoiceBooking(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-border pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">Consultation Invoice</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Official Service Receipt · Jogen Platform</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-primary block">
                  INV-{selectedInvoiceBooking.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">{selectedInvoiceBooking.date}</span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expert Advisor</p>
                  <p className="font-bold text-foreground">{selectedInvoiceBooking.expert.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedInvoiceBooking.expert.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Session Mode & Duration</p>
                  <p className="font-bold text-foreground capitalize">{selectedInvoiceBooking.mode} Consultation</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedInvoiceBooking.actualDuration ?? selectedInvoiceBooking.duration} Mins Used
                    {selectedInvoiceBooking.actualDuration && selectedInvoiceBooking.actualDuration < selectedInvoiceBooking.duration ? ` (${selectedInvoiceBooking.duration} Mins Scheduled)` : ''}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Initial Escrow Deposit ({selectedInvoiceBooking.duration} mins)</span>
                  <span>{(selectedInvoiceBooking.depositAmount ?? selectedInvoiceBooking.amount).toLocaleString()} ETB</span>
                </div>
                {Boolean(selectedInvoiceBooking.clientRefund && selectedInvoiceBooking.clientRefund > 0) && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Early Departure Refund (Unused Time)</span>
                    <span>-{selectedInvoiceBooking.clientRefund?.toLocaleString()} ETB</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Platform & Escrow Service Fee (2.5%)</span>
                  <span>Included</span>
                </div>
                <div className="flex justify-between font-bold text-base text-foreground pt-2 border-t border-border">
                  <span>Total Actual Amount Paid</span>
                  <span className="text-primary">{selectedInvoiceBooking.amount.toLocaleString()} ETB</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Escrow Settlement Completed
                </span>
                <span>Chapa Pay</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
              <button 
                onClick={() => setSelectedInvoiceBooking(null)}
                className="py-3 px-5 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-muted transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
