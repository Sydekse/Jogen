import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export const paymentService = {
  linkWallet: async (provider: string, accountNumber: string, token: string): Promise<{ account_name?: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/wallet/`, {
      method: 'POST',
      body: JSON.stringify({
        wallet_provider: provider,
        wallet_account_number: accountNumber,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const fieldError = data.wallet_account_number?.[0];
      throw new Error(fieldError || data.error || data.detail || `Failed to link wallet: ${response.status}`);
    }
    return response.json();
  },

  initializeEscrow: async (bookingId: string, token: string): Promise<{ checkout_url: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/initialize/`, {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    });
    if (!response.ok) {
      throw new Error(`Failed to initialize payment: ${response.status}`);
    }
    return response.json();
  },

  submitSessionEnd: async (bookingId: string, durationSeconds: number, token: string): Promise<{ status: string; decision: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/${bookingId}/session-end/`, {
      method: 'POST',
      body: JSON.stringify({ duration_seconds: durationSeconds }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = typeof data === 'object' && data !== null
        ? Object.values(data).flat().join(' ')
        : '';
      throw new Error(detail || `Failed to settle session: ${response.status}`);
    }
    return response.json();
  },
};
