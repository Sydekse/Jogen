import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export const reviewService = {
  submitReview: async (bookingId: string, rating: number, comment: string, token: string): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reviews/`, {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, rating, comment }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.booking_id?.[0] || data.detail || 'Failed to submit review.');
    }
    return response.json();
  },

  getExpertReviews: async (expertId: string, token?: string): Promise<any[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reviews/expert/${expertId}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }
    return response.json();
  }
};
