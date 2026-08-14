import { BookingCreatePayload, BookingDetail } from '@/src/types/booking';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const bookingService = {
  /**
   * Reserve an advisory consultation slot (POST /api/v1/consultations/)
   */
  async createBooking(payload: BookingCreatePayload, token: string): Promise<BookingDetail> {
    const res = await fetch(`${API_BASE_URL}/consultations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message =
        errorData.slot?.[0] ||
        errorData.scheduled_start?.[0] ||
        errorData.expert?.[0] ||
        'Failed to reserve consultation slot.';
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * Fetch all user bookings (GET /api/v1/consultations/)
   */
  async getBookings(token: string): Promise<BookingDetail[]> {
    const res = await fetch(`${API_BASE_URL}/consultations/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user consultations.');
    }

    return res.json();
  },

  /**
   * Cancel a booking (PATCH /api/v1/consultations/{id}/)
   */
  async cancelBooking(bookingId: string, token: string): Promise<BookingDetail> {
    const res = await fetch(`${API_BASE_URL}/consultations/${bookingId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'cancelled', cancellation_reason: 'User cancelled' }),
    });

    if (!res.ok) {
      throw new Error('Failed to cancel the booking.');
    }

    return res.json();
  },
};