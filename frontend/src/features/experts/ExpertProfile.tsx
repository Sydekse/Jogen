'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, CheckCircle,
  Video, Phone, MessageCircle
} from 'lucide-react';
import { expertService } from '@/src/services/expertService';
import { ExpertDetail } from '@/src/types/expert';
import { BookingCheckoutModal } from '@/src/components/booking/BookingCheckoutModal';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-7 h-7" : size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sz,
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground"
          )}
        />
      ))}
    </span>
  );
}

function generateSlots(timeRanges: string[]) {
  const slots: string[] = [];
  for (const range of timeRanges) {
    const [start, end] = range.split('-');
    if (!start || !end) continue;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      let nextH = currentH;
      let nextM = currentM + 30;
      if (nextM >= 60) {
        nextH += 1;
        nextM -= 60;
      }
      if (nextH > endH || (nextH === endH && nextM > endM)) {
        break;
      }

      const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
      };

      slots.push(formatTime(currentH, currentM));

      currentH = nextH;
      currentM = nextM;
    }
  }
  return slots;
}

export function ExpertProfile({ expertId }: { expertId: string }) {
  const router = useRouter();

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking State
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<"voice" | "video" | "text">("voice");
  const [duration, setDuration] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe">("telebirr");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    expertService.getExpertDetail(expertId)
      .then(data => {
        setExpert(data);
        const days = Object.keys(data.availability || {}).filter(day => data.availability[day]?.length > 0);
        if (days.length > 0) setSelectedDay(days[0]);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [expertId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading expert profile...</div>;
  }

  if (error || !expert) {
    return <div className="p-8 text-center text-destructive">Failed to load expert profile. {error}</div>;
  }

  const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayStr = daysMap[new Date().getDay()];

  const availableDays = Object.keys(expert.availability || {}).filter(day => expert.availability[day]?.length > 0);
  let availableSlots = selectedDay ? generateSlots(expert.availability[selectedDay] || []) : [];

  if (selectedDay === todayStr) {
    const now = new Date();
    availableSlots = availableSlots.filter(slot => {
      const isPM = slot.includes('PM');
      const [hStr, mStr] = slot.split(' ')[0].split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      
      const slotDate = new Date();
      slotDate.setHours(h, m, 0, 0);
      return slotDate > now;
    });
  }

  // Financial Calculations
  const perMinuteRate = Math.round(Number(expert.rate_per_session) / 30); // Assuming rate_per_session in DB is for 30 mins
  const total = perMinuteRate * duration;
  const platformFee = Math.round(total * 0.1);

  const handleBook = () => {
    if (!selectedSlot) return;
    setShowCheckout(true);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="px-5 py-3.5 border-b border-border bg-card/50 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-bold text-foreground">Expert Profile</h1>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">

          {/* LEFT COLUMN: Profile Info */}
          <div className="lg:col-span-3 space-y-5">

            {/* Header Card */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 border border-primary/20">
                  {expert.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{expert.full_name}</h2>
                    {expert.verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        <CheckCircle className="w-3.5 h-3.5" />Verified Expert
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-sm">{expert.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <StarRating rating={4.8} size="md" /> {/* Mocked until backend supports reviews */}
                    <span className="text-sm text-muted-foreground">(48 reviews)</span>
                    <span className="text-sm text-muted-foreground">· 8 yrs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About Card */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-3">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{expert.bio}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {expert.specialty_tags.map((s: string) => (
                  <span key={s} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                    {s.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews Card */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground mb-4">Client Reviews</h3>
              <div className="text-center py-8">
                <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Reviews will be visible once the expert completes their first session.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Booking Widget */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-20 shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Book a Consultation</h3>

              {/* Day Selection */}
              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Day</p>
                {availableDays.length === 0 ? (
                  <div className="py-3 px-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">No availability set.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                        className={cn("py-2 px-3 rounded-xl text-xs font-bold transition-colors capitalize",
                          selectedDay === day ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}>
                        {day === todayStr ? "Today" : day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Time Slot</p>
                {availableSlots.length === 0 ? (
                  <div className="py-3 px-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">Please select an available day.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn("py-2 px-2 rounded-xl text-xs font-semibold transition-colors",
                          selectedSlot === slot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        )}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Session Mode */}
              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Session Mode</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([["voice", Phone, "Voice"], ["video", Video, "Video"], ["text", MessageCircle, "Text"]] as const).map(([m, Icon, label]) => (
                    <button key={m} onClick={() => setMode(m)} className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors", mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Duration</p>
                <div className="flex gap-1.5">
                  {[15, 30, 45, 60].map((d) => (
                    <button key={d} onClick={() => setDuration(d)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-colors", duration === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/70 rounded-xl p-3.5 mb-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{perMinuteRate} ETB × {duration} min</span><span className="font-semibold text-foreground">{total} ETB</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform fee (10%)</span><span className="font-semibold text-foreground">{platformFee} ETB</span></div>
                <div className="flex justify-between text-sm pt-2 border-t border-border font-bold"><span className="text-foreground">Total Escrow</span><span className="text-foreground">{(total + platformFee).toLocaleString()} ETB</span></div>
              </div>

              {/* Payment Method */}
              <div className="mb-4">
                <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Mobile Wallet</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["telebirr", "cbe"] as const).map((pm) => (
                    <button key={pm} onClick={() => setPaymentMethod(pm)} className={cn("py-3 rounded-xl text-xs font-bold transition-colors border", paymentMethod === pm ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                      {pm === "telebirr" ? "Telebirr" : "CBE Birr"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedSlot}
                onClick={handleBook}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {selectedSlot ? "Authorize Payment & Enter Session" : "Select a Time Slot to Continue"}
              </button>
              {selectedSlot && <p className="text-xs text-muted-foreground text-center mt-2">Funds held in escrow until session completes</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal Trigger */}
      {showCheckout && (
        <BookingCheckoutModal
          expert={expert}
          selectedDay={selectedDay}
          selectedSlot={selectedSlot!}
          duration={duration}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}