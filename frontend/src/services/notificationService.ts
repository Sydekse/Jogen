import { fetchWithAuth } from '@/src/lib/apiClient';

const API_BASE_URL = 'http://localhost:8000/api/v1/notifications';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  sent_at: string;
}

export const notificationService = {
  getNotifications: async (token?: string): Promise<Notification[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/`);
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }
    return response.json();
  },

  markAsRead: async (id: string, token?: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/${id}`, {
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
