/* eslint-disable @typescript-eslint/no-unused-vars */
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export interface WalletTransactionItem {
  id: string;
  transaction_type: 'topup' | 'booking_hold' | 'booking_charge' | 'booking_refund_release' | 'expert_payout' | 'withdrawal';
  amount: string;
  running_balance: string;
  booking?: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  created_at: string;
}

export interface UserWalletData {
  id: string;
  balance: string;
  reserved_balance: string;
  available_balance: string;
  currency: string;
  is_frozen: boolean;
  transactions?: WalletTransactionItem[];
  created_at: string;
  updated_at: string;
}

export const paymentService = {
  getWallet: async (mode?: 'client' | 'expert'): Promise<UserWalletData> => {
    const url = mode ? `${API_BASE_URL}/payments/wallet/?mode=${mode}` : `${API_BASE_URL}/payments/wallet/`;
    const response = await fetchWithAuth(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch wallet: ${response.status}`);
    }
    return response.json();
  },

  initializeTopUp: async (amount: number, returnUrl?: string): Promise<{ tx_ref: string; amount: string; checkout_url: string; mocked?: boolean }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/wallet/topup/`, {
      method: 'POST',
      body: JSON.stringify({ amount, return_url: returnUrl }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.detail || `Failed to initialize top-up: ${response.status}`);
    }
    return response.json();
  },


  requestWithdrawal: async (amount: number, provider = 'telebirr', accountNumber?: string): Promise<{ status: string; transaction: WalletTransactionItem }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/wallet/withdraw/`, {
      method: 'POST',
      body: JSON.stringify({ amount, provider, account_number: accountNumber }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.detail || `Failed to process withdrawal: ${response.status}`);
    }
    return response.json();
  },

  linkWallet: async (provider: string, accountNumber: string, _token?: string): Promise<{ account_name?: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/wallet/link/`, {
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

  initializeEscrow: async (bookingId: string, _token?: string): Promise<{ checkout_url: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/payments/initialize/`, {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId })
    });
    if (!response.ok) {
      throw new Error(`Failed to initialize payment: ${response.status}`);
    }
    return response.json();
  },

  submitSessionEnd: async (bookingId: string, durationSeconds: number, _token?: string): Promise<{ status: string; decision: string }> => {
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

