'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Sun,
  Sunrise,
  Moon,
  Check,
  Sparkles,
  RotateCcw,
  BookmarkCheck,
  CalendarCheck
} from 'lucide-react';
import { BookingDetail } from '@/src/types/booking';

export interface ExpertAvailabilityManagerProps {
  availability: Record<string, string[]>;
  onChange: (updated: Record<string, string[]>) => void;
  disabled?: boolean;
  bookings?: BookingDetail[];
}

const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = typeof WEEK_DAYS[number];

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

// Defined 30-minute intervals grouped into 3 distinct day periods
interface SlotDefinition {
  timeLabel: string; // e.g. "09:00 AM"
  range: string;     // e.g. "09:00-09:30"
}

const PERIODS: { id: 'morning' | 'afternoon' | 'evening'; title: string; icon: React.ElementType; timeRange: string; slots: SlotDefinition[] }[] = [
  {
    id: 'morning',
    title: 'Morning',
    icon: Sunrise,
    timeRange: '08:00 AM – 12:00 PM',
    slots: [
      { timeLabel: '08:00 AM', range: '08:00-08:30' },
      { timeLabel: '08:30 AM', range: '08:30-09:00' },
      { timeLabel: '09:00 AM', range: '09:00-09:30' },
      { timeLabel: '09:30 AM', range: '09:30-10:00' },
      { timeLabel: '10:00 AM', range: '10:00-10:30' },
      { timeLabel: '10:30 AM', range: '10:30-11:00' },
      { timeLabel: '11:00 AM', range: '11:00-11:30' },
      { timeLabel: '11:30 AM', range: '11:30-12:00' },
    ],
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    icon: Sun,
    timeRange: '12:00 PM – 05:00 PM',
    slots: [
      { timeLabel: '12:00 PM', range: '12:00-12:30' },
      { timeLabel: '12:30 PM', range: '12:30-13:00' },
      { timeLabel: '01:00 PM', range: '13:00-13:30' },
      { timeLabel: '01:30 PM', range: '13:30-14:00' },
      { timeLabel: '02:00 PM', range: '14:00-14:30' },
      { timeLabel: '02:30 PM', range: '14:30-15:00' },
      { timeLabel: '03:00 PM', range: '15:00-15:30' },
      { timeLabel: '03:30 PM', range: '15:30-16:00' },
      { timeLabel: '04:00 PM', range: '16:00-16:30' },
      { timeLabel: '04:30 PM', range: '16:30-17:00' },
    ],
  },
  {
    id: 'evening',
    title: 'Evening',
    icon: Moon,
    timeRange: '05:00 PM – 08:00 PM',
    slots: [
      { timeLabel: '05:00 PM', range: '17:00-17:30' },
      { timeLabel: '05:30 PM', range: '17:30-18:00' },
      { timeLabel: '06:00 PM', range: '18:00-18:30' },
      { timeLabel: '06:30 PM', range: '18:30-19:00' },
      { timeLabel: '07:00 PM', range: '19:00-19:30' },
      { timeLabel: '07:30 PM', range: '19:30-20:00' },
    ],
  },
];

// Helper to format YYYY-MM-DD
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get the Monday of a given week offset from today
function getMondayOfWeek(weekOffset: number): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function ExpertAvailabilityManager({
  availability,
  onChange,
  disabled = false,
  bookings = [],
}: ExpertAvailabilityManagerProps) {
  const [selectedDayKey, setSelectedDayKey] = useState<DayKey>('mon');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  // User can choose whether edits on the active day apply to the recurring weekly template or this date specifically
  const [scope, setScope] = useState<'recurring' | 'date'>('recurring');

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(now), [now]);
  const todayDayKey = useMemo(() => {
    const day = now.getDay();
    return WEEK_DAYS[day === 0 ? 6 : day - 1];
  }, [now]);

  // Compute dates for the selected week
  const weekDates = useMemo(() => {
    const monday = getMondayOfWeek(weekOffset);
    return WEEK_DAYS.map((dayKey, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const dateKey = formatDateKey(d);
      const isToday = dateKey === todayKey;
      return {
        dayKey,
        date: d,
        dateKey,
        label: DAY_LABELS[dayKey],
        dayNumber: d.getDate(),
        shortDate: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isToday,
      };
    });
  }, [weekOffset, todayKey]);

  const activeDateItem = useMemo(() => {
    return weekDates.find(w => w.dayKey === selectedDayKey) || weekDates[0];
  }, [weekDates, selectedDayKey]);

  const hasDateOverride = useMemo(() => {
    return activeDateItem ? availability[activeDateItem.dateKey] !== undefined : false;
  }, [availability, activeDateItem]);

  // Helper to get effective slots for any day item
  const getEffectiveSlots = (dayKey: DayKey, dateKey: string): string[] => {
    if (availability[dateKey] !== undefined) {
      return availability[dateKey] || [];
    }
    return availability[dayKey] || [];
  };

  // Compute active slots based on current scope
  const activeSlots = useMemo(() => {
    if (scope === 'recurring') {
      return availability[selectedDayKey] || [];
    }
    if (availability[activeDateItem.dateKey] !== undefined) {
      return availability[activeDateItem.dateKey] || [];
    }
    return availability[selectedDayKey] || [];
  }, [availability, scope, selectedDayKey, activeDateItem]);

  // Find booked slots for this expert on the active date
  const bookedRangesOnActiveDate = useMemo(() => {
    if (!bookings || bookings.length === 0 || !activeDateItem) return new Set<string>();
    const booked = new Set<string>();
    const targetDateStr = activeDateItem.dateKey;

    bookings
      .filter(b => b.status !== 'cancelled')
      .forEach(b => {
        const start = new Date(b.scheduled_start);
        const end = new Date(b.scheduled_end);
        const bDateKey = formatDateKey(start);
        if (bDateKey === targetDateStr) {
          // Check overlap with each 30-min interval
          PERIODS.forEach(p => {
            p.slots.forEach(slot => {
              const [sHour, sMin] = slot.range.split('-')[0].split(':').map(Number);
              const [eHour, eMin] = slot.range.split('-')[1].split(':').map(Number);
              const slotStartDate = new Date(start);
              slotStartDate.setHours(sHour, sMin, 0, 0);
              const slotEndDate = new Date(start);
              slotEndDate.setHours(eHour, eMin, 0, 0);

              if (slotStartDate < end && slotEndDate > start) {
                booked.add(slot.range);
              }
            });
          });
        }
      });
    return booked;
  }, [bookings, activeDateItem]);

  const updateSlots = (newRanges: string[]) => {
    if (disabled) return;
    const sorted = [...new Set(newRanges)].sort();
    const targetKey = scope === 'recurring' ? selectedDayKey : activeDateItem.dateKey;
    onChange({
      ...availability,
      [targetKey]: sorted,
    });
  };

  const toggleSlot = (range: string) => {
    if (disabled) return;
    const isCurrentlyActive = activeSlots.includes(range);
    const updated = isCurrentlyActive
      ? activeSlots.filter(r => r !== range)
      : [...activeSlots, range];
    updateSlots(updated);
  };

  // Presets
  const applyPreset = (presetRanges: string[]) => {
    updateSlots(presetRanges);
  };

  const clearCurrentDay = () => {
    updateSlots([]);
  };

  const copyToAllWeekdays = () => {
    if (disabled) return;
    const weekdays: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const updated = { ...availability };

    if (scope === 'recurring') {
      weekdays.forEach(day => {
        updated[day] = [...activeSlots];
      });
    } else {
      weekDates
        .filter(w => weekdays.includes(w.dayKey))
        .forEach(w => {
          updated[w.dateKey] = [...activeSlots];
        });
    }
    onChange(updated);
  };

  const resetToWeeklyDefault = () => {
    if (disabled) return;
    const updated = { ...availability };
    delete updated[activeDateItem.dateKey];
    onChange(updated);
    setScope('recurring');
  };

  const applyAsWeeklyDefault = () => {
    if (disabled) return;
    onChange({
      ...availability,
      [selectedDayKey]: [...activeSlots],
    });
    setScope('recurring');
  };

  const togglePeriod = (periodSlots: SlotDefinition[]) => {
    if (disabled) return;
    const periodRanges = periodSlots.map(s => s.range);
    const allActive = periodRanges.every(r => activeSlots.includes(r));
    let updated: string[];
    if (allActive) {
      updated = activeSlots.filter(r => !periodRanges.includes(r));
    } else {
      updated = [...new Set([...activeSlots, ...periodRanges])];
    }
    updateSlots(updated);
  };

  // Calculate total configured hours this week
  const totalWeeklyHours = useMemo(() => {
    let totalSlots = 0;
    weekDates.forEach(w => {
      totalSlots += getEffectiveSlots(w.dayKey, w.dateKey).length;
    });
    return (totalSlots * 0.5).toFixed(1);
  }, [availability, weekDates]);

  // Week range label (e.g. "Sep 7 – Sep 13, 2026")
  const weekRangeLabel = useMemo(() => {
    const monday = weekDates[0].date;
    const sunday = weekDates[6].date;
    const mMonth = monday.toLocaleDateString(undefined, { month: 'short' });
    const sMonth = sunday.toLocaleDateString(undefined, { month: 'short' });
    const year = sunday.getFullYear();
    if (mMonth === sMonth) {
      return `${mMonth} ${monday.getDate()} – ${sunday.getDate()}, ${year}`;
    }
    return `${mMonth} ${monday.getDate()} – ${sMonth} ${sunday.getDate()}, ${year}`;
  }, [weekDates]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
      {/* Header & Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              Consultation Availability
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {totalWeeklyHours} hrs active this week
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage your consultation calendar, recurring templates, and specific date hours.
            </p>
          </div>
        </div>

        {/* Week Navigator */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-muted/60 p-1.5 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs sm:text-sm font-bold text-foreground px-2 text-center min-w-[150px]">
            {weekRangeLabel}
          </span>

          <button
            type="button"
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="p-1.5 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {(weekOffset !== 0 || selectedDayKey !== todayDayKey) && (
            <button
              type="button"
              onClick={() => {
                setWeekOffset(0);
                setSelectedDayKey(todayDayKey);
              }}
              className="ml-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Horizontal 7-Day Strip */}
      <div>
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map(item => {
            const isSelected = selectedDayKey === item.dayKey;
            const slotsCount = getEffectiveSlots(item.dayKey, item.dateKey).length;
            const hasSlots = slotsCount > 0;
            const hasOverride = availability[item.dateKey] !== undefined;

            return (
              <button
                key={item.dayKey}
                type="button"
                onClick={() => {
                  setSelectedDayKey(item.dayKey);
                  // Automatically switch scope if this specific date has an override
                  if (availability[item.dateKey] !== undefined) {
                    setScope('date');
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-center transition-all relative ${isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 text-foreground'
                  }`}
              >
                {item.isToday && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" title="Today" />
                )}
                <span className="text-xs font-bold capitalize">
                  {item.dayKey}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {item.dayNumber}
                </span>
                <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${hasSlots
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                  {hasSlots ? `${slotsCount}` : 'Off'}
                </span>
                {hasOverride && (
                  <span className="text-[9px] text-primary/80 font-medium mt-0.5 leading-none">
                    Custom
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Scope & Quick Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-foreground">
              Schedule for {DAY_LABELS[selectedDayKey]} ({activeDateItem.shortDate})
            </h4>
            <span className="text-xs text-muted-foreground">
              • {activeSlots.length} slots ({(activeSlots.length * 0.5).toFixed(1)} hrs)
            </span>
          </div>

          {/* Inline Scope Selector */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Apply edits to:</span>
            <div className="inline-flex items-center p-0.5 bg-muted rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope('recurring')}
                className={`px-2.5 py-1 rounded-md transition-all ${scope === 'recurring'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                All {DAY_LABELS[selectedDayKey]}s (Weekly Default)
              </button>
              <button
                type="button"
                onClick={() => setScope('date')}
                className={`px-2.5 py-1 rounded-md transition-all ${scope === 'date'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Only {activeDateItem.shortDate} (Date Override)
              </button>
            </div>

            {hasDateOverride && scope === 'date' && (
              <button
                type="button"
                onClick={resetToWeeklyDefault}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                title="Remove date override and fall back to weekly default"
              >
                Reset to default
              </button>
            )}

            {scope === 'date' && (
              <button
                type="button"
                onClick={applyAsWeeklyDefault}
                className="text-xs text-primary font-semibold hover:underline ml-1"
                title="Save these hours as your weekly recurring template"
              >
                Save as weekly default
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground text-[11px] font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset([
              '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00',
              '11:00-11:30', '11:30-12:00', '13:00-13:30', '13:30-14:00',
              '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00',
              '16:00-16:30', '16:30-17:00'
            ])}
            className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-primary/50 text-foreground font-medium transition-colors"
          >
            9 AM – 5 PM
          </button>
          <button
            type="button"
            onClick={() => applyPreset([
              '08:00-08:30', '08:30-09:00', '09:00-09:30', '09:30-10:00',
              '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00'
            ])}
            className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-primary/50 text-foreground font-medium transition-colors"
          >
            Morning
          </button>
          <button
            type="button"
            onClick={() => applyPreset([
              '13:00-13:30', '13:30-14:00', '14:00-14:30', '14:30-15:00',
              '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00'
            ])}
            className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-primary/50 text-foreground font-medium transition-colors"
          >
            Afternoon
          </button>
          <button
            type="button"
            onClick={copyToAllWeekdays}
            className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-primary/50 text-primary font-medium transition-colors flex items-center gap-1"
            title="Copy these hours to Monday through Friday"
          >
            <Copy className="w-3 h-3" />
            Copy Mon–Fri
          </button>
          <button
            type="button"
            onClick={clearCurrentDay}
            className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-destructive/40 text-destructive font-medium transition-colors flex items-center gap-1"
            title="Clear all slots for this day"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Categorized Time Periods (Morning, Afternoon, Evening) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PERIODS.map(period => {
          const PeriodIcon = period.icon;
          const periodRanges = period.slots.map(s => s.range);
          const allActive = periodRanges.every(r => activeSlots.includes(r));
          const someActive = periodRanges.some(r => activeSlots.includes(r));

          return (
            <div
              key={period.id}
              className="bg-card border border-border rounded-xl p-3.5 space-y-3"
            >
              {/* Period Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <PeriodIcon className="w-4 h-4 text-primary" />
                  <div>
                    <h5 className="font-bold text-xs text-foreground">{period.title}</h5>
                    <span className="text-[10px] text-muted-foreground">{period.timeRange}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => togglePeriod(period.slots)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors ${allActive
                      ? 'text-primary hover:text-primary/80 bg-primary/10'
                      : someActive
                        ? 'text-foreground hover:text-primary bg-muted'
                        : 'text-muted-foreground hover:text-foreground bg-muted/60'
                    }`}
                >
                  {allActive ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* 30-minute Interactive Slot Chips */}
              <div className="grid grid-cols-2 gap-1.5">
                {period.slots.map(slot => {
                  const isActive = activeSlots.includes(slot.range);
                  const isBooked = bookedRangesOnActiveDate.has(slot.range);

                  return (
                    <button
                      key={slot.range}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleSlot(slot.range)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all flex items-center justify-center gap-1 relative ${isBooked
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                          : isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent'
                        }`}
                      title={isBooked ? 'A client has booked this consultation time' : slot.range}
                    >
                      {isBooked ? (
                        <BookmarkCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : isActive ? (
                        <Check className="w-3 h-3 stroke-[3] shrink-0" />
                      ) : null}
                      <span>{slot.timeLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
