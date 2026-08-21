/* eslint-disable @typescript-eslint/no-unused-vars */
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  sent_at: string;
}

export const notificationService = {
  getNotifications: async (_token?: string): Promise<Notification[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/notifications/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }
    return response.json();
  },

  markAsRead: async (id: string, _token?: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/notifications/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_read: true }),
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.status}`);
    }
  }
};
