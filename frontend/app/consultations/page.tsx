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
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Escrowed
          </span>
        );
      case 'pending_payment':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Pending Payment
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
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
    <main className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              My Consultations
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your upcoming, active, and completed micro-advisory sessions.
            </p>
          </div>
          <Link
            href="/experts"
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            + Book New Session
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="bg-card rounded-xl border border-border p-6 h-28 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-xl border border-border shadow-sm space-y-4">
            <p className="text-muted-foreground text-sm">
              You have no consultation reservations yet.
            </p>
            <Link
              href="/experts"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Expert Directory
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-foreground">
                      {b.expert_name || 'Legal Advisor'}
                    </h3>
                    {getStatusBadge(b.status)}
                  </div>
                  <p className="text-xs font-medium text-primary">
                    {b.expert_title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scheduled: {new Date(b.scheduled_start).toLocaleString()} •{' '}
                    {getChannelIcon(b.channel)}
                  </p>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block">
                      Locked Rate
                    </span>
                    <span className="text-base font-bold text-foreground">
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