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
    <header className="relative z-50 h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 gap-3 shrink-0">
      {/* Escrow Status */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tracking-wide">Escrow Secured</span>
        </div>
      </div>

      {/* Right Controls: Notifications & Dark Mode */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="relative p-2 rounded-xl border border-border/60 hover:border-border hover:bg-accent transition-colors text-muted-foreground desk-press"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary border-2 border-card" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col">
              {/* Notifications Header: Fixed at top of dropdown, clearly visible below topbar */}
              <div className="px-4 py-3 border-b border-border bg-muted/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {/* ALWAYS visible when there are notifications */}
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className={`text-xs font-semibold transition-colors desk-press ${
                    unreadCount > 0 
                      ? "text-primary hover:underline cursor-pointer" 
                      : "text-muted-foreground/50 cursor-default"
                  }`}
                >
                  Mark all as read
                </button>
              </div>

              {/* Notification List: Scrollable container with fully visible title & message */}
              <div className="py-1 max-h-80 overflow-y-auto relative z-10">
                {notifications.length > 0 ? notifications.map(notif => (
                  <div 
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                    className={`px-4 py-3 cursor-pointer hover:bg-accent/60 transition-colors border-l-[3px] ${
                      notif.is_read 
                        ? 'border-transparent opacity-65' 
                        : 'border-primary bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      {/* Fully visible title */}
                      <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    {/* Fully visible message */}
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-2">
                      <span className="capitalize">{notif.notification_type.replace('_', ' ')}</span>
                      <span>{new Date(notif.sent_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">No notifications</p>
                    <p className="text-[11px] mt-1 opacity-75">You&apos;re all caught up!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)} 
          className="p-2 rounded-xl border border-border/60 hover:border-border hover:bg-accent transition-colors text-foreground desk-press"
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
