import React, { useState, useEffect, useRef } from "react";
import { Bell, Sun, Moon } from "lucide-react";
import { useUser } from "@/src/context/UserContext";
import { notificationService, Notification } from "@/src/services/notificationService";

export function TopBar() {
  const { darkMode, setDarkMode } = useUser();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const data = await notificationService.getNotifications(token);
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string, is_read: boolean) => {
    if (is_read) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      await notificationService.markAsRead(id, token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const unread = notifications.filter(n => !n.is_read);
    try {
      await Promise.all(unread.map(n => notificationService.markAsRead(n.id, token)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };
  
  return (
    <header className="relative z-50 h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-end px-5 gap-2.5 shrink-0">
      <div className="relative" ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-[100]">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="py-1">
              {notifications.length > 0 ? notifications.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                  className={`px-4 py-3 cursor-pointer hover:bg-accent transition-colors border-l-2 ${notif.is_read ? 'border-transparent opacity-60' : 'border-primary bg-primary/5'}`}
                >
                  <p className="text-sm font-semibold text-foreground mb-0.5">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase">{notif.notification_type.replace('_', ' ')} • {new Date(notif.sent_at).toLocaleDateString()}</p>
                </div>
              )) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No notifications right now.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl border border-border hover:bg-accent transition-colors text-foreground">
        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
