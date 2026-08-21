"use client";

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { reviewService } from '@/src/services/reviewService';
import { API_BASE_URL } from '@/src/config/api';
import Link from 'next/link';

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    async function checkReviewStatus() {
      try {
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch(`${API_BASE_URL}/consultations/${bookingId}/`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.has_review) {
            setAlreadyReviewed(true);
          }
        }
      } catch (e) {
        console.error("Failed checking review status", e);
      } finally {
        setLoadingCheck(false);
      }
    }
    checkReviewStatus();
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyReviewed) return;
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token') || '';
      await reviewService.submitReview(bookingId, rating, comment, token);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCheck) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Review Already Submitted</h2>
            <p className="text-muted-foreground mt-2">You have already submitted a review for this consultation session.</p>
          </div>
          <Link
            href="/bookings"
            className="inline-block w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-colors hover:bg-primary/90"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Thank You!</h2>
            <p className="text-muted-foreground mt-2">Your review has been submitted. It helps experts improve and builds trust on Jogen.</p>
          </div>
          <Link
            href="/bookings"
            className="inline-block w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl transition-colors hover:bg-primary/90"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 md:p-8 space-y-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Rate your Session</h1>
          <p className="text-sm text-muted-foreground mt-2">How was your consultation? Your feedback is valuable.</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-medium rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    (hoverRating || rating) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Write a Review (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like? What could be improved?"
              rows={4}
              className="w-full bg-background border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/bookings')}
              className="flex-1 py-3.5 bg-accent text-foreground text-sm font-bold rounded-xl transition-colors hover:bg-muted"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 py-3.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
