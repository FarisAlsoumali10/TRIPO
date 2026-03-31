import React, { useState, useEffect } from 'react';
import { Bell, X, Heart, Users, MessageCircle } from 'lucide-react';
import { AppNotification } from '../types/index';

const STORAGE_KEY = 'tripo_notifications';

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const ICON_MAP: Record<AppNotification['type'], React.ReactNode> = {
  like: <Heart className="w-4 h-4 text-rose-500" />,
  group_join: <Users className="w-4 h-4 text-emerald-500" />,
  community_reply: <MessageCircle className="w-4 h-4 text-blue-500" />,
};

export const NotificationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadNotifications());

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const panel = document.getElementById('notification-panel');
      if (panel && !panel.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="relative" id="notification-panel">
      <button
        onClick={() => { setIsOpen(v => !v); if (!isOpen) markAllRead(); }}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[200] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? 'bg-emerald-50/50' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {ICON_MAP[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(n.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="text-slate-300 hover:text-slate-500 transition flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
