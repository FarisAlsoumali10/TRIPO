import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Heart, Users, MessageCircle, Calendar, Star } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { notificationAPI } from '../services/api';

const SOCKET_URL = (import.meta as any).env?.VITE_API_URL ?? '';

const STORAGE_KEY = 'tripo_notifications';

interface Notif {
  id: string;
  type: string;
  message?: string;
  payload?: any;
  timestamp?: number;
  createdAt?: string;
  read: boolean;
}

function toNotif(raw: any): Notif {
  return {
    id: raw._id ?? raw.id ?? String(Math.random()),
    type: raw.type,
    message: raw.message ?? raw.payload?.tourTitle ?? raw.payload?.rentalTitle
      ?? raw.payload?.threadTitle ?? raw.payload?.placeName ?? raw.payload?.groupTripTitle,
    payload: raw.payload,
    timestamp: raw.createdAt ? +new Date(raw.createdAt) : (raw.timestamp ?? Date.now()),
    read: raw.read ?? false,
  };
}

function labelForNotif(n: Notif, lang: 'en' | 'ar' = 'ar'): string {
  if (n.message) return n.message;
  const p = n.payload ?? {};
  const ar = lang === 'ar';
  switch (n.type) {
    case 'new_booking_tour': return ar ? `حجز جديد لـ "${p.tourTitle ?? 'جولتك'}"` : `New booking for "${p.tourTitle ?? 'your tour'}"`;
    case 'new_booking':      return ar ? `حجز جديد لـ "${p.rentalTitle ?? 'عقارك'}"` : `New booking for "${p.rentalTitle ?? 'your rental'}"`;
    case 'new_reply':        return ar ? `رد جديد على "${p.threadTitle ?? 'موضوعك'}"` : `New reply on "${p.threadTitle ?? 'your thread'}"`;
    case 'new_joiner':       return ar ? `شخص انضم لرحلتك إلى "${p.placeName ?? '...'}"` : `Someone joined your trip to "${p.placeName ?? '...'}"`;
    case 'new_review':       return ar ? `مراجعة جديدة على ${p.targetType ?? 'إعلانك'}` : `New review on your ${p.targetType ?? 'listing'}`;
    case 'group_invitation': return ar ? `دُعيت إلى "${p.groupTripTitle ?? 'رحلة جماعية'}"` : `Invited to "${p.groupTripTitle ?? 'a group trip'}"`;
    case 'member_joined':    return ar ? `عضو انضم إلى "${p.groupTripTitle ?? 'رحلتك'}"` : `Member joined "${p.groupTripTitle ?? 'your trip'}"`;
    case 'member_left':      return ar ? `عضو غادر "${p.groupTripTitle ?? 'رحلتك'}"` : `Member left "${p.groupTripTitle ?? 'your trip'}"`;
    default:                 return ar ? 'إشعار جديد' : 'New notification';
  }
}

const ICON_MAP: Record<string, React.ReactNode> = {
  like:             <Heart className="w-4 h-4 text-rose-500" />,
  group_join:       <Users className="w-4 h-4 text-emerald-500" />,
  community_reply:  <MessageCircle className="w-4 h-4 text-blue-500" />,
  group_invitation: <Users className="w-4 h-4 text-emerald-500" />,
  new_message:      <MessageCircle className="w-4 h-4 text-blue-500" />,
  member_joined:    <Users className="w-4 h-4 text-emerald-500" />,
  member_left:      <Users className="w-4 h-4 text-slate-400" />,
  new_booking:      <Calendar className="w-4 h-4 text-teal-500" />,
  new_booking_tour: <Calendar className="w-4 h-4 text-teal-500" />,
  new_reply:        <MessageCircle className="w-4 h-4 text-blue-500" />,
  new_joiner:       <Users className="w-4 h-4 text-emerald-500" />,
  new_review:       <Star className="w-4 h-4 text-amber-500" />,
};

function loadCache(): Notif[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCache(n: Notif[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); } catch {}
}

export const NotificationPanel = ({ lang = 'ar' }: { lang?: 'en' | 'ar' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>(loadCache);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((raw: any) => {
    const notif = toNotif(raw);
    setNotifications(prev => {
      const next = [notif, ...prev.filter(n => n.id !== notif.id)];
      saveCache(next);
      return next;
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const raw = await notificationAPI.list();
      const list: Notif[] = (Array.isArray(raw) ? raw : raw.data ?? []).map(toNotif);
      setNotifications(list);
      saveCache(list);
    } catch {}
  }, []);

  // Connect socket.io for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || socketRef.current) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('notification', (payload: any) => {
      addNotification({ ...payload, read: false, createdAt: new Date().toISOString() });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addNotification]);

  // Initial fetch + fallback poll every 5 minutes (socket handles real-time)
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveCache(updated);
    try { await notificationAPI.markAllRead(); } catch {}
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveCache(updated);
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

  const handleOpen = () => {
    setIsOpen(v => !v);
    if (!isOpen) {
      fetchNotifications();
      markAllRead();
    }
  };

  return (
    <div className="relative" id="notification-panel">
      <button onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
        aria-label="Notifications">
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
            <h3 className="font-bold text-slate-900 text-sm">{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition" aria-label="Close">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">{lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? 'bg-emerald-50/50' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {ICON_MAP[n.type] ?? <Bell className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">{labelForNotif(n, lang)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(n.timestamp ?? 0).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="text-slate-300 hover:text-slate-500 transition flex-shrink-0" aria-label="Dismiss">
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
