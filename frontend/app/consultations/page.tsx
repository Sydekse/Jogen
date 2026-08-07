'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { bookingService } from '@/src/services/bookingService';
import { BookingDetail } from '@/src/types/booking';

export default function ConsultationsDashboardPage() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('access_token') || ''
            : '';
        const data = await bookingService.getBookings(token);
        setBookings(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load consultations.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'escrowed':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Escrowed
          </span>
        );
      case 'pending_payment':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Pending Payment
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'video':
        return '🎥 Video';
      case 'chat':
        return '💬 Chat';
      default:
        return '📞 Voice';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              My Consultations
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your upcoming, active, and completed micro-advisory sessions.
            </p>
          </div>
          <Link
            href="/experts"
            className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            + Book New Session
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-white rounded-xl border border-gray-200 p-6 h-28 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
            <p className="text-gray-500 text-sm">
              You have no consultation reservations yet.
            </p>
            <Link
              href="/experts"
              className="inline-block px-4 py-2 bg-purple-900 text-white text-xs font-semibold rounded-lg hover:bg-purple-800 transition-colors"
            >
              Browse Expert Directory
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-gray-900">
                      {b.expert_name || 'Legal Advisor'}
                    </h3>
                    {getStatusBadge(b.status)}
                  </div>
                  <p className="text-xs font-medium text-purple-900">
                    {b.expert_title}
                  </p>
                  <p className="text-xs text-gray-400">
                    Scheduled: {new Date(b.scheduled_start).toLocaleString()} •{' '}
                    {getChannelIcon(b.channel)}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block">
                      Locked Rate
                    </span>
                    <span className="text-base font-bold text-gray-900">
                      {parseFloat(b.rate_snapshot).toLocaleString()} ETB
                    </span>
                  </div>

                  {b.status === 'pending_payment' && (
                    <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                      Complete Escrow
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}