import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Heart, Users, MessageCircle, CheckCheck, Trash2, Calendar, Star, ShieldCheck, Loader2 } from 'lucide-react';
import { notificationAPI } from '../services/api';

const STORAGE_KEY = 'tripo_notifications';

type NotifType = 'like' | 'group_join' | 'community_reply' | 'booking_confirmed' | 'faza_answered' | 'event_reminder'
  | 'group_invitation' | 'new_message' | 'member_joined' | 'member_left' | 'new_booking' | 'new_booking_tour' | 'new_reply' | 'new_joiner' | 'new_review';

interface Notif {
  id: string;
  _id?: string;
  type: NotifType;
  message?: string;
  payload?: any;
  timestamp?: number;
  createdAt?: string;
  read: boolean;
  actionLabel?: string;
}

function toNotif(raw: any): Notif {
  const id = raw._id ?? raw.id ?? String(Math.random());
  const ts = raw.createdAt ? +new Date(raw.createdAt) : (raw.timestamp ?? Date.now());
  const message = raw.message ?? raw.payload?.tourTitle ?? raw.payload?.rentalTitle
    ?? raw.payload?.threadTitle ?? raw.payload?.placeName ?? raw.payload?.groupTripTitle ?? '';
  return { id, type: raw.type, message, payload: raw.payload, timestamp: ts, read: raw.read ?? false };
}

const ICON_MAP: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  like:             { icon: <Heart className="w-4 h-4" />,         bg: 'bg-rose-50',    color: 'text-rose-500' },
  group_join:       { icon: <Users className="w-4 h-4" />,         bg: 'bg-emerald-50', color: 'text-emerald-600' },
  community_reply:  { icon: <MessageCircle className="w-4 h-4" />, bg: 'bg-blue-50',    color: 'text-blue-500' },
  booking_confirmed:{ icon: <Calendar className="w-4 h-4" />,      bg: 'bg-teal-50',    color: 'text-teal-600' },
  faza_answered:    { icon: <ShieldCheck className="w-4 h-4" />,   bg: 'bg-amber-50',   color: 'text-amber-600' },
  event_reminder:   { icon: <Bell className="w-4 h-4" />,          bg: 'bg-purple-50',  color: 'text-purple-600' },
  group_invitation: { icon: <Users className="w-4 h-4" />,         bg: 'bg-emerald-50', color: 'text-emerald-600' },
  new_message:      { icon: <MessageCircle className="w-4 h-4" />, bg: 'bg-blue-50',    color: 'text-blue-500' },
  member_joined:    { icon: <Users className="w-4 h-4" />,         bg: 'bg-emerald-50', color: 'text-emerald-600' },
  member_left:      { icon: <Users className="w-4 h-4" />,         bg: 'bg-slate-50',   color: 'text-slate-500' },
  new_booking:      { icon: <Calendar className="w-4 h-4" />,      bg: 'bg-teal-50',    color: 'text-teal-600' },
  new_booking_tour: { icon: <Calendar className="w-4 h-4" />,      bg: 'bg-teal-50',    color: 'text-teal-600' },
  new_reply:        { icon: <MessageCircle className="w-4 h-4" />, bg: 'bg-blue-50',    color: 'text-blue-500' },
  new_joiner:       { icon: <Users className="w-4 h-4" />,         bg: 'bg-emerald-50', color: 'text-emerald-600' },
  new_review:       { icon: <Star className="w-4 h-4" />,          bg: 'bg-amber-50',   color: 'text-amber-600' },
};

function labelForNotif(n: Notif, ar = false): string {
  if (n.message) return n.message;
  const p = n.payload ?? {};
  switch (n.type) {
    case 'new_booking_tour': return ar ? `حجز جديد لـ "${p.tourTitle ?? 'جولتك'}"` : `New booking for "${p.tourTitle ?? 'your tour'}"`;
    case 'new_booking':      return ar ? `حجز جديد لـ "${p.rentalTitle ?? 'عقارك'}"` : `New booking for "${p.rentalTitle ?? 'your rental'}"`;
    case 'new_reply':        return ar ? `رد جديد على "${p.threadTitle ?? 'موضوعك'}"` : `New reply on "${p.threadTitle ?? 'your thread'}"`;
    case 'new_joiner':       return ar ? `شخص انضم لرحلتك إلى "${p.placeName ?? '...'}"` : `Someone joined your trip to "${p.placeName ?? '...'}"`;
    case 'new_review':       return ar ? `مراجعة جديدة على ${p.targetType ?? 'إعلانك'}` : `New review on your ${p.targetType ?? 'listing'}`;
    case 'group_invitation': return ar ? `دُعيت إلى "${p.groupTripTitle ?? 'رحلة جماعية'}"` : `You were invited to "${p.groupTripTitle ?? 'a group trip'}"`;
    case 'member_joined':    return ar ? `عضو انضم إلى "${p.groupTripTitle ?? 'رحلتك'}"` : `A member joined "${p.groupTripTitle ?? 'your trip'}"`;
    case 'member_left':      return ar ? `عضو غادر "${p.groupTripTitle ?? 'رحلتك'}"` : `A member left "${p.groupTripTitle ?? 'your trip'}"`;
    default:                 return ar ? 'لديك إشعار جديد' : 'You have a new notification';
  }
}

function groupByDate(notifs: Notif[], ar = false): { label: string; items: Notif[] }[] {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, Notif[]> = {};
  notifs.forEach(n => {
    const d   = new Date(n.timestamp ?? 0).toDateString();
    const key = d === today
      ? (ar ? 'اليوم' : 'Today')
      : d === yesterday
        ? (ar ? 'أمس' : 'Yesterday')
        : new Date(n.timestamp ?? 0).toLocaleDateString(ar ? 'ar-SA' : 'en-SA', { month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

function saveCache(notifs: Notif[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs)); } catch {}
}

function loadCache(): Notif[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export const NotificationsScreen = ({ t, lang }: { t: any; lang?: string }) => {
  const ar = lang === 'ar';
  const [notifications, setNotifications] = useState<Notif[]>(loadCache);
  const [filter, setFilter]  = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const raw = await notificationAPI.list();
      const list: Notif[] = (Array.isArray(raw) ? raw : raw.data ?? []).map(toNotif);
      setNotifications(list);
      saveCache(list);
    } catch {
      // fall back to cache already in state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveCache(updated);
    try { await notificationAPI.markAllRead(); } catch {}
  };

  const markRead = async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveCache(updated);
    try { await notificationAPI.markAsRead(id); } catch {}
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveCache(updated);
  };

  const clearAll = () => { setNotifications([]); saveCache([]); };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const grouped  = groupByDate(filtered, ar);

  return (
    <div className="min-h-full bg-slate-50 pb-28 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{ar ? 'الإشعارات' : 'Notifications'}</h1>
            {unreadCount > 0 && <p className="text-xs text-slate-400 mt-0.5">{unreadCount} {ar ? 'غير مقروءة' : 'unread'}</p>}
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />}
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl active:scale-95 transition-transform">
                <CheckCheck className="w-3.5 h-3.5" /> {ar ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="p-2 bg-slate-50 rounded-xl active:scale-95 transition-transform">
                <Trash2 className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {f === 'all' ? (ar ? 'الكل' : 'All') : (ar ? `غير مقروءة${unreadCount > 0 ? ` (${unreadCount})` : ''}` : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold text-sm">{ar ? 'لا توجد إشعارات' : 'No notifications'}</p>
            <p className="text-slate-300 text-xs mt-1">{ar ? 'ستظهر الإشعارات الجديدة هنا' : 'New notifications will appear here'}</p>
          </div>
        ) : grouped.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.items.map(notif => {
                const meta = ICON_MAP[notif.type] ?? ICON_MAP.like;
                return (
                  <div key={notif.id} onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${notif.read ? 'bg-white border-slate-100' : 'bg-white border-emerald-100 shadow-sm'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${notif.read ? 'text-slate-600' : 'text-slate-900 font-bold'}`}>
                        {labelForNotif(notif, ar)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(notif.timestamp ?? 0).toLocaleTimeString(ar ? 'ar-SA' : 'en-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />}
                      <button onClick={e => { e.stopPropagation(); dismiss(notif.id); }} className="p-1 text-slate-200 hover:text-slate-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
