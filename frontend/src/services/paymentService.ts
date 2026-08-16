import { fetchWithAuth } from '@/src/lib/apiClient';

const API_BASE_URL = 'http://localhost:8000/api/v1/payments';

export const paymentService = {
  initializeEscrow: async (bookingId: string, token: string): Promise<{ checkout_url: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/initialize/`, {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    });
    if (!response.ok) {
      throw new Error(`Failed to initialize payment: ${response.status}`);
    }
    return response.json();
  }
};
