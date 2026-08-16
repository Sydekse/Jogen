import { fetchWithAuth } from '@/src/lib/apiClient';

const API_BASE_URL = 'http://localhost:8000/api/v1/admin';

export const adminService = {
  getExperts: async (token: string, status?: string): Promise<any[]> => {
    let url = `${API_BASE_URL}/experts/`;
    if (status) {
      url += `?status=${status}`;
    }
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch experts: ${response.status}`);
    }
    return response.json();
  },
  
  getDisputes: async (token: string): Promise<any[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/disputes/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch disputes: ${response.status}`);
    }
    return response.json();
  },
  
  verifyExpert: async (id: string, status: 'verified' | 'rejected', token: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/experts/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      throw new Error(`Failed to update expert status: ${response.status}`);
    }
  },
  
  resolveDispute: async (id: string, status: string, action: string, note: string, token: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/disputes/${id}/resolve/`, {
      method: 'POST',
      body: JSON.stringify({ status, action, resolution_note: note })
    });
    if (!response.ok) {
      throw new Error(`Failed to resolve dispute: ${response.status}`);
    }
  }
};
