import { BookingCreatePayload, BookingDetail } from '@/src/types/booking';
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export const bookingService = {
  /**
   * Reserve an advisory consultation slot (POST /api/v1/consultations/)
   */
  async createBooking(payload: BookingCreatePayload, token: string): Promise<BookingDetail> {
    const res = await fetchWithAuth(`${API_BASE_URL}/consultations/`, {
      method: 'POST',
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
    const res = await fetchWithAuth(`${API_BASE_URL}/consultations/`, {
      method: 'GET',
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
    const res = await fetchWithAuth(`${API_BASE_URL}/consultations/${bookingId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled', cancellation_reason: 'User cancelled' }),
    });

    if (!res.ok) {
      throw new Error('Failed to cancel the booking.');
    }

    return res.json();
  },

  /**
   * Delete a cancelled or expired booking (DELETE /api/v1/consultations/{id}/)
   */
  async deleteBooking(bookingId: string, token: string): Promise<void> {
    const res = await fetchWithAuth(`${API_BASE_URL}/consultations/${bookingId}/`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error?.message || 'Failed to remove booking.';
      throw new Error(message);
    }
  },
};