import { fetchWithAuth } from '@/src/lib/apiClient';
import { ExpertListItem, ExpertDetail } from '@/src/types/expert';
import { API_BASE_URL } from '@/src/config/api';

export const expertService = {
  getExperts: async (params?: { search?: string, tag?: string, max_rate?: string }): Promise<ExpertListItem[]> => {
    let url = `${API_BASE_URL}/experts/`;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.tag) queryParams.append('tag', params.tag);
      if (params.max_rate) queryParams.append('max_rate', params.max_rate);
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch experts: ${response.status}`);
    }
    return response.json();
  },

  getExpertDetail: async (id: string): Promise<ExpertDetail> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/experts/${id}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch expert detail: ${response.status}`);
    }
    return response.json();
  }
};
