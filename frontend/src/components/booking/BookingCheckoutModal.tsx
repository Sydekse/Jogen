'use client';

import React, { useState } from 'react';
import { bookingService } from '@/src/services/bookingService';
import { BookingChannel } from '@/src/types/booking';
import { ExpertDetail } from '@/src/types/expert';

interface BookingCheckoutModalProps {
  expert: ExpertDetail;
  selectedDay: string;
  selectedSlot: string; // e.g. "09:00 AM"
  duration: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  expert,
  selectedDay,
  selectedSlot,
  duration,
  onClose,
  onSuccess,
}) => {
  const [channel, setChannel] = useState<BookingChannel>('voice');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Derive start and end Datetime objects
  const parseTimes = () => {
    const today = new Date();
    let startH = 9, startM = 0;
    if (selectedSlot) {
      const isPM = selectedSlot.includes('PM');
      const timePart = selectedSlot.split(' ')[0];
      const parts = timePart.split(':');
      startH = parseInt(parts[0], 10);
      startM = parseInt(parts[1], 10);
      if (isPM && startH !== 12) startH += 12;
      if (!isPM && startH === 12) startH = 0;
    }

    let endH = startH;
    let endM = startM + duration;
    while (endM >= 60) {
      endH += 1;
      endM -= 60;
    }

    const daysMap: Record<string, number> = {
      'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
    };
    
    const targetDay = daysMap[selectedDay.toLowerCase()] ?? today.getDay();
    let diff = targetDay - today.getDay();
    
    if (diff < 0) {
      diff += 7;
    }
    
    // If it's today but the selected time has already passed, push it to next week
    if (diff === 0) {
      if (startH < today.getHours() || (startH === today.getHours() && startM <= today.getMinutes())) {
         diff += 7;
      }
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);

    const startTime = new Date(targetDate);
    startTime.setHours(startH || 9, startM || 0, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endH || 9, endM || 30, 0, 0);

    return {
      startISO: startTime.toISOString(),
      endISO: endTime.toISOString(),
    };
  };

  const handleConfirmReservation = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token') || ''
          : '';

      const { startISO, endISO } = parseTimes();

      await bookingService.createBooking(
        {
          expert_id: expert.id,
          channel,
          scheduled_start: startISO,
          scheduled_end: endISO,
        },
        token
      );

      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Reservation failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const perMinuteRate = Math.round(parseFloat(expert.rate_per_session) / 30) || 0;
  const rate = perMinuteRate * duration;
  const platformFee = rate * 0.1; // 10% platform fee
  const totalETB = rate + platformFee;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Confirm Advisory Reservation
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review details and select consultation channel
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Expert & Time Summary */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-gray-900">{expert.full_name}</p>
              <p className="text-xs text-purple-900 font-medium">{expert.title}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md">
              {selectedDay.toUpperCase()} ({selectedSlot})
            </span>
          </div>
        </div>

        {/* Consultation Channel Options */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Select Channel
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'voice', label: '📞 Voice Call' },
              { key: 'video', label: '🎥 Video Call' },
              { key: 'chat', label: '💬 Live Chat' },
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setChannel(c.key as BookingChannel)}
                className={`py-3 px-2 text-xs font-bold rounded-xl border text-center transition-colors ${
                  channel === c.key
                    ? 'border-purple-900 bg-purple-900 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Expert Rate ({duration}-min)</span>
            <span className="font-semibold">{rate.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Service Fee (10%)</span>
            <span className="font-semibold">{platformFee.toLocaleString()} ETB</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total Escrow Amount</span>
            <span className="text-purple-950">{totalETB.toLocaleString()} ETB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirmReservation}
            className="flex-1 py-3 bg-purple-900 hover:bg-purple-800 disabled:bg-gray-300 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {submitting ? 'Reserving...' : 'Confirm & Reserve Slot'}
          </button>
        </div>
      </div>
    </div>
  );
};