'use client';

import React, { useState } from 'react';
import { expertService } from '@/src/services/expertService';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function ExpertAvailabilityManagerPage() {
  const [availability, setAvailability] = useState<Record<string, string[]>>({
    mon: ['09:00-12:00', '14:00-17:00'],
    tue: ['10:00-13:00'],
    wed: ['09:00-12:00'],
    thu: ['14:00-17:00'],
    fri: ['09:00-12:00'],
    sat: [],
    sun: [],
  });

  const [newSlotTime, setNewSlotTime] = useState<string>('');
  const [activeDay, setActiveDay] = useState<string>('mon');
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTime.trim()) return;

    setAvailability((prev) => {
      const current = prev[activeDay] || [];
      if (current.includes(newSlotTime.trim())) return prev;
      return {
        ...prev,
        [activeDay]: [...current, newSlotTime.trim()],
      };
    });
    setNewSlotTime('');
  };

  const handleRemoveSlot = (dayKey: string, slotToRemove: string) => {
    setAvailability((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((s) => s !== slotToRemove),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';
      await expertService.updateAvailability(availability, token);
      setMessage({ type: 'success', text: 'Recurring availability schedule saved successfully!' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save schedule.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Manage Weekly Availability</h1>
          <p className="mt-1 text-sm text-gray-600">
            Set your recurring consultation hours and custom available blocks for client bookings.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg text-sm border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-100">
            {DAYS.map((day) => (
              <button
                key={day.key}
                onClick={() => setActiveDay(day.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDay === day.key
                    ? 'bg-purple-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.label} ({availability[day.key]?.length || 0})
              </button>
            ))}
          </div>

          {/* Slot Input Form */}
          <form onSubmit={handleAddSlot} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. 09:00-12:00 or 15:00-16:00"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Add Time Block
            </button>
          </form>

          {/* Active Day Slots List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Slots for {DAYS.find((d) => d.key === activeDay)?.label}
            </h3>
            {(availability[activeDay] || []).length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">
                No slots configured for this day.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availability[activeDay].map((slot) => (
                  <span
                    key={slot}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-semibold"
                  >
                    {slot}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(activeDay, slot)}
                      className="text-purple-500 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save Action */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-purple-900 hover:bg-purple-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:bg-gray-300"
            >
              {saving ? 'Saving Schedule...' : 'Save Availability Matrix'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}