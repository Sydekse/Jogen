'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, CheckCircle,
  Video, Phone, MessageCircle,
  ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { expertService } from '@/src/services/expertService';
import { reviewService } from '@/src/services/reviewService';
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
  const slots = new Set<string>();
  for (const range of timeRanges) {
    const [start, end] = range.split('-');
    if (!start || !end) continue;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      const nextM = currentM + 30;
      const nextH = currentH + Math.floor(nextM / 60);

      const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
      };

      slots.add(formatTime(currentH, currentM));

      currentH = nextH;
      currentM = nextM % 60;
    }
  }
  return [...slots];
}

const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = typeof WEEK_DAYS[number];

export function ExpertProfile({ expertId }: { expertId: string }) {
  const router = useRouter();

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Booking & Multi-Week State
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<"voice" | "video" | "text">("voice");
  const [duration, setDuration] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbe">("telebirr");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    expertService.getExpertDetail(expertId)
      .then(data => {
        setExpert(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    reviewService.getExpertReviews(expertId)
      .then(data => setReviews(data))
      .catch(err => console.error("Failed to load reviews:", err));
  }, [expertId]);

  const todayDateKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Compute 7 days for the active weekOffset
  const currentWeekDates = useMemo(() => {
    const now = new Date();
    const todayDayOfWeek = now.getDay();
    const distToMonday = todayDayOfWeek === 0 ? -6 : 1 - todayDayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    return WEEK_DAYS.map((dayKey, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = dateKey === todayDateKey;
      const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Resolve availability: check date-specific override first, then fallback to recurring dayKey
      const dateOverride = expert?.availability?.[dateKey];
      const recurring = expert?.availability?.[dayKey] || [];
      const activeRanges = dateOverride !== undefined ? dateOverride : recurring;
      const allSlots = generateSlots(activeRanges);

      // Filter slots: remove past times if today, and remove already booked slots
      const validSlots = isPast
        ? []
        : allSlots.filter(slot => {
            const isPM = slot.includes('PM');
            const [hStr, mStr] = slot.split(' ')[0].split(':');
            let h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (isPM && h !== 12) h += 12;
            if (!isPM && h === 12) h = 0;

            const slotStart = new Date(d);
            slotStart.setHours(h, m, 0, 0);

            // If today, cannot book slots that already passed
            if (isToday && slotStart <= now) {
              return false;
            }

            const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

            // Filter out if booked by another client
            if (expert?.booked_slots && expert.booked_slots.length > 0) {
              const isOverlapping = expert.booked_slots.some(b => {
                const bStart = new Date(b.start);
                const bEnd = new Date(b.end);
                return slotStart < bEnd && slotEnd > bStart;
              });
              if (isOverlapping) {
                return false;
              }
            }

            return true;
          });

      return {
        dayKey,
        date: d,
        dateKey,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: d.getDate(),
        shortDay: dayKey.toUpperCase(),
        shortDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isToday,
        isPast,
        slots: validSlots,
        hasSlots: validSlots.length > 0,
      };
    });
  }, [expert, weekOffset]);

  // Clean human date range label without week numbers
  const weekRangeLabel = useMemo(() => {
    if (!currentWeekDates || currentWeekDates.length < 7) return '';
    const monday = currentWeekDates[0].date;
    const sunday = currentWeekDates[6].date;
    const mMonth = monday.toLocaleDateString(undefined, { month: 'short' });
    const sMonth = sunday.toLocaleDateString(undefined, { month: 'short' });
    const mYear = monday.getFullYear();
    const sYear = sunday.getFullYear();

    if (mMonth === sMonth && mYear === sYear) {
      return `${mMonth} ${monday.getDate()} – ${sunday.getDate()}, ${mYear}`;
    }
    if (mYear === sYear) {
      return `${mMonth} ${monday.getDate()} – ${sMonth} ${sunday.getDate()}, ${mYear}`;
    }
    return `${mMonth} ${monday.getDate()}, ${mYear} – ${sMonth} ${sunday.getDate()}, ${sYear}`;
  }, [currentWeekDates]);

  // Set default selected date key when week dates load or week changes
  useEffect(() => {
    if (currentWeekDates.length > 0) {
      const currentSelected = currentWeekDates.find(w => w.dateKey === selectedDateKey);
      // Only set a default if there is no date selected yet or the selected date is in a different week
      if (!currentSelected) {
        if (weekOffset === 0) {
          // On current week, ALWAYS default directly to today
          const todayItem = currentWeekDates.find(w => w.dateKey === todayDateKey);
          setSelectedDateKey(todayItem ? todayItem.dateKey : currentWeekDates[0].dateKey);
        } else {
          // On future weeks, pick first day with slots, or default to first day of that week
          const firstAvailable = currentWeekDates.find(w => w.hasSlots);
          setSelectedDateKey(firstAvailable ? firstAvailable.dateKey : currentWeekDates[0].dateKey);
        }
        setSelectedSlot(null);
      }
    }
  }, [currentWeekDates, selectedDateKey, weekOffset, todayDateKey]);

  const activeDateItem = currentWeekDates.find(w => w.dateKey === selectedDateKey) || currentWeekDates[0];
  const availableSlots = activeDateItem?.slots || [];

  // Financial Calculations
  const perMinuteRate = Math.round(Number(expert?.rate_per_session || 0) / 30);
  const total = perMinuteRate * duration;
  const platformFee = Math.round(total * 0.0125);

  const handleBook = () => {
    if (!selectedSlot || !activeDateItem) return;
    setShowCheckout(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading expert profile...</div>;
  }

  if (error || !expert) {
    return <div className="p-8 text-center text-destructive">Failed to load expert profile. {error}</div>;
  }

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
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 border border-primary/20 overflow-hidden">
                  {expert.profile_picture && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={expert.profile_picture} alt={expert.full_name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                  ) : (
                    expert.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                  )}
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
                    <StarRating rating={reviews.length > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) : 0} size="md" />
                    <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
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
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Reviews will be visible once the expert completes their first session.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">{rev.client_name || "Client"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="mb-2"><StarRating rating={rev.rating} size="sm" /></div>
                      {rev.comment && <p className="text-sm text-muted-foreground">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Booking Widget */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-20 shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Book a Consultation</h3>

              {/* Date & Week Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Select Date
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={weekOffset === 0}
                      onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-foreground min-w-[120px] text-center">
                      {weekRangeLabel}
                    </span>
                    <button
                      type="button"
                      disabled={weekOffset >= 26}
                      onClick={() => setWeekOffset(prev => prev + 1)}
                      className="p-1 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Next week"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {(weekOffset !== 0 || selectedDateKey !== todayDateKey) && (
                      <button
                        type="button"
                        onClick={() => {
                          setWeekOffset(0);
                          setSelectedDateKey(todayDateKey);
                          setSelectedSlot(null);
                        }}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-0.5"
                        title="Jump to today"
                      >
                        Today
                      </button>
                    )}
                  </div>
                </div>

                {/* Horizontal 7-Day Strip */}
                <div className="grid grid-cols-7 gap-1 bg-muted/40 p-1.5 rounded-xl border border-border">
                  {currentWeekDates.map((dayItem) => {
                    const isSelected = selectedDateKey === dayItem.dateKey;
                    return (
                      <button
                        key={dayItem.dateKey}
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(dayItem.dateKey);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all relative",
                          isSelected
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : dayItem.isPast
                            ? "opacity-50 hover:opacity-85 text-muted-foreground hover:bg-background/60"
                            : dayItem.hasSlots
                            ? "hover:bg-background text-foreground hover:shadow-xs font-medium"
                            : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                        )}
                      >
                        <span className="text-[10px] uppercase tracking-tighter opacity-80">
                          {dayItem.dayName}
                        </span>
                        <span className={cn("text-xs leading-none my-0.5", isSelected ? "font-extrabold" : "font-semibold")}>
                          {dayItem.dayNumber}
                        </span>
                        {dayItem.hasSlots ? (
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full mt-0.5",
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          )} />
                        ) : (
                          <span className="text-[9px] text-muted-foreground/60 leading-none mt-0.5">
                            -
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {activeDateItem && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 px-0.5">
                    {activeDateItem.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    {activeDateItem.isToday && " (Today)"}
                  </p>
                )}
              </div>

              {/* Time Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Time Slot {availableSlots.length > 0 && `(${availableSlots.length})`}
                  </p>
                </div>
                {availableSlots.length === 0 ? (
                  <div className="py-4 px-3 bg-muted/40 rounded-xl text-center border border-dashed border-border">
                    <p className="text-xs font-medium text-muted-foreground">
                      No slots available on this date.
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {activeDateItem?.isPast
                        ? "This date has already passed. Please select an upcoming date."
                        : "Please pick another day or advance to next week."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-2 px-2.5 rounded-xl text-xs font-medium transition-all border text-center",
                          selectedSlot === slot
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                            : "bg-muted/40 hover:bg-muted border-border/60 text-foreground hover:border-border"
                        )}
                      >
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
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform fee (1.25%)</span><span className="font-semibold text-foreground">{platformFee} ETB</span></div>
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
          selectedDay={activeDateItem?.dayKey || 'mon'}
          selectedDate={activeDateItem?.date}
          selectedSlot={selectedSlot!}
          duration={duration}
          initialChannel={mode === "text" ? "chat" : mode}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            if (expertId) {
              expertService.getExpertDetail(expertId)
                .then(data => setExpert(data))
                .catch(console.error);
            }
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}