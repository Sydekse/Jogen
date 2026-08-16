import { fetchWithAuth } from '@/src/lib/apiClient';

const API_BASE_URL = 'http://localhost:8000/api/v1/reviews';

export const reviewService = {
  getExpertReviews: async (expertId: string, token?: string): Promise<any[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/expert/${expertId}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }
    return response.json();
  }
};
