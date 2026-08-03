import { ExpertDetail, ExpertFilterParams, ExpertListItem } from '@/src/types/expert';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const expertService = {
  /**
   * Fetch verified experts with search and filter parameters
   */
  async getExperts(params: ExpertFilterParams = {}): Promise<ExpertListItem[]> {
    const query = new URLSearchParams();

    if (params.tag) query.append('tag', params.tag);
    if (params.search) query.append('search', params.search);
    if (params.min_rate) query.append('min_rate', params.min_rate);
    if (params.max_rate) query.append('max_rate', params.max_rate);

    const res = await fetch(`${API_BASE_URL}/experts/?${query.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch expert directory.');
    }

    return res.json();
  },

  /**
   * Fetch detailed profile of a single verified expert
   */
  async getExpertDetail(expertId: string): Promise<ExpertDetail> {
    const res = await fetch(`${API_BASE_URL}/experts/${expertId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error('Expert not found.');
    }

    return res.json();
  },
};