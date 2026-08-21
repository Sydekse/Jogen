'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { notificationService } from '@/src/services/notificationService';

export function NotificationToasts() {
  useEffect(() => {
    let previousIds = new Set<string>();

    const poll = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const notifications = await notificationService.getNotifications(token);
        notifications
          .filter((notification) => !notification.is_read && !previousIds.has(notification.id))
          .forEach((notification) => {
            toast(notification.title, { description: notification.message });
          });
        previousIds = new Set(notifications.map((notification) => notification.id));
      } catch (error) {
        console.error('Failed to refresh notifications', error);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
