/* eslint-disable @typescript-eslint/no-unused-vars */
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export const adminService = {
  getExperts: async (arg1?: string, arg2?: string): Promise<any[]> => {
    let status: string | undefined = undefined;
    const validStatuses = ['pending', 'verified', 'rejected', 'unverified'];
    if (arg1 && validStatuses.includes(arg1)) {
      status = arg1;
    } else if (arg2 && validStatuses.includes(arg2)) {
      status = arg2;
    }
    let url = `${API_BASE_URL}/admin/experts/`;
    if (status) {
      url += `?verification_status=${status}`;
    }
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch experts: ${response.status}`);
    }
    return response.json();
  },
  
  getDisputes: async (_token?: string): Promise<any[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/disputes/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch disputes: ${response.status}`);
    }
    return response.json();
  },
  
  verifyExpert: async (id: string, status: 'verified' | 'rejected', _token?: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/experts/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ verification_status: status })
    });
    if (!response.ok) {
      throw new Error(`Failed to update expert status: ${response.status}`);
    }
  },
  
  resolveDispute: async (id: string, status: string, action: string, note: string, _token?: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/disputes/${id}/resolve/`, {
      method: 'POST',
      body: JSON.stringify({ status, action, resolution_note: note })
    });
    if (!response.ok) {
      throw new Error(`Failed to resolve dispute: ${response.status}`);
    }
  }
};
