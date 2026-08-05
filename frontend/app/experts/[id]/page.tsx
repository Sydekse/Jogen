'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { expertService } from '@/src/services/expertService';
import { ExpertDetail } from '@/src/types/expert';

interface PageProps {
  params: Promise<{ id: string }>;
}

const daysOfWeek = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function ExpertDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [expert, setExpert] = useState<ExpertDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Booking Slot State
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  
  useEffect(() => {
    async function loadExpert() {
      try {
        setLoading(true);
        const data = await expertService.getExpertDetail(id);
        setExpert(data);

        // Pre-select first day with available slots
        const availableDay = daysOfWeek.find(
          (d) => data.availability[d.key] && data.availability[d.key].length > 0
        );
        if (availableDay) {
          setSelectedDay(availableDay.key);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load expert profile.');
      } finally {
        setLoading(false);
      }
    }

    loadExpert();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center">
        <div className="max-w-4xl w-full bg-white rounded-xl border border-gray-200 p-8 animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-24 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center items-center">
        <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Expert Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || 'This profile is unavailable.'}</p>
          <Link
            href="/experts"
            className="px-4 py-2 bg-purple-900 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 transition-colors"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const activeSlots = expert.availability[selectedDay] || [];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/experts"
            className="inline-flex items-center text-xs font-semibold text-purple-900 hover:text-purple-700"
          >
            ← Back to Directory
          </Link>
        </div>

        {/* Header Profile Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-gray-900">
                {expert.full_name || 'Legal & Tax Advisor'}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>
            <p className="text-base font-medium text-purple-900 mt-1">{expert.title}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {expert.specialty_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 w-full md:w-auto text-center md:text-right">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">
              Fractional Advisory Rate
            </span>
            <span className="text-2xl font-extrabold text-purple-950">
              {parseFloat(expert.rate_per_session).toLocaleString()} ETB
            </span>
            <span className="text-xs text-gray-500 block mt-0.5">per 30-min session</span>
          </div>
        </div>

        {/* Bio & Availability Picker Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Biography & Experience Column */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              About & Experience
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {expert.bio || 'No detailed biography provided.'}
            </p>
          </div>

          {/* Schedule Calendar Picker Column */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Select Advisory Slot
            </h2>

            {/* Day Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Available Days
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {daysOfWeek.map((day) => {
                  const hasSlots = expert.availability[day.key]?.length > 0;
                  return (
                    <button
                      key={day.key}
                      disabled={!hasSlots}
                      onClick={() => {
                        setSelectedDay(day.key);
                        setSelectedTimeSlot('');
                      }}
                      className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                        selectedDay === day.key
                          ? 'bg-purple-900 text-white'
                          : hasSlots
                          ? 'bg-gray-100 text-gray-800 hover:bg-purple-100'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {day.key.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Available Time Slots ({daysOfWeek.find((d) => d.key === selectedDay)?.label})
              </label>
              {activeSlots.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  No slots available on this day.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`w-full py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                        selectedTimeSlot === slot
                          ? 'bg-purple-900 text-white border-purple-900'
                          : 'bg-white border-gray-200 text-gray-800 hover:border-purple-300'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Booking CTA */}
            <button
              disabled={!selectedTimeSlot}
              className={`w-full py-3 rounded-lg text-sm font-bold text-white transition-colors shadow-sm ${
                selectedTimeSlot
                  ? 'bg-purple-900 hover:bg-purple-800 cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {selectedTimeSlot ? `Confirm & Reserve Slot (${selectedTimeSlot})` : 'Select a Slot'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}