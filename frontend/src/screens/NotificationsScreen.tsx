import React, { useState } from 'react';
import { Bell, Heart, Users, MessageCircle, CheckCheck, Trash2, Calendar, Star, ShieldCheck } from 'lucide-react';
import { AppNotification } from '../types/index';

const STORAGE_KEY = 'tripo_notifications';

type ExtendedNotifType = AppNotification['type'] | 'booking_confirmed' | 'faza_answered' | 'event_reminder';

interface ExtendedNotification extends Omit<AppNotification, 'type'> {
  type: ExtendedNotifType;
  actionLabel?: string;
  imageUrl?: string;
}

function loadNotifications(): ExtendedNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotifications(notifs: ExtendedNotification[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs)); } catch {}
}

const ICON_MAP: Record<ExtendedNotifType, { icon: React.ReactNode; bg: string; color: string }> = {
  like:             { icon: <Heart className="w-4 h-4" />,         bg: 'bg-rose-50',    color: 'text-rose-500' },
  group_join:       { icon: <Users className="w-4 h-4" />,         bg: 'bg-emerald-50', color: 'text-emerald-600' },
  community_reply:  { icon: <MessageCircle className="w-4 h-4" />, bg: 'bg-blue-50',    color: 'text-blue-500' },
  booking_confirmed:{ icon: <Calendar className="w-4 h-4" />,      bg: 'bg-teal-50',    color: 'text-teal-600' },
  faza_answered:    { icon: <ShieldCheck className="w-4 h-4" />,   bg: 'bg-amber-50',   color: 'text-amber-600' },
  event_reminder:   { icon: <Bell className="w-4 h-4" />,          bg: 'bg-purple-50',  color: 'text-purple-600' },
};

// Group notifications by date
function groupByDate(notifs: ExtendedNotification[]): { label: string; items: ExtendedNotification[] }[] {
  const today    = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, ExtendedNotification[]> = {};
  notifs.forEach(n => {
    const d = new Date(n.timestamp).toDateString();
    const key = d === today ? 'اليوم' : d === yesterday ? 'أمس' : new Date(n.timestamp).toLocaleDateString('ar-SA', { month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

// Seed demo notifications if empty
function seedIfEmpty(): ExtendedNotification[] {
  const existing = loadNotifications();
  if (existing.length > 0) return existing;
  const demos: ExtendedNotification[] = [
    { id: 'n1', type: 'community_reply',   message: 'رد أحمد على سؤالك في مجتمع تطعيس',       timestamp: Date.now() - 600000,    read: false },
    { id: 'n2', type: 'faza_answered',     message: 'أُجيبت فزعتك! حصلت على 50 نقطة كرم',     timestamp: Date.now() - 3600000,   read: false },
    { id: 'n3', type: 'like',              message: 'أعجب 3 أشخاص بخط سيرك "رحلة الدرعية"',   timestamp: Date.now() - 7200000,   read: true  },
    { id: 'n4', type: 'booking_confirmed', message: 'تم تأكيد حجزك في جولة "حافة العالم"',      timestamp: Date.now() - 86400000,  read: true  },
    { id: 'n5', type: 'event_reminder',    message: 'فعالية "سوق الطعام" تبدأ غداً الساعة 6م',  timestamp: Date.now() - 172800000, read: true  },
    { id: 'n6', type: 'group_join',        message: 'سارة انضمت إلى رحلتك الجماعية',            timestamp: Date.now() - 259200000, read: true  },
  ];
  saveNotifications(demos);
  return demos;
}

export const NotificationsScreen = ({ t, lang }: { t: any; lang?: string }) => {
  const [notifications, setNotifications] = useState<ExtendedNotification[]>(() => seedIfEmpty());
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-full bg-slate-50 pb-28 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">الإشعارات</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{unreadCount} غير مقروء</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl active:scale-95 transition-transform"
              >
                <CheckCheck className="w-3.5 h-3.5" /> تعليم الكل مقروء
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="p-2 bg-slate-50 rounded-xl active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {[
            { id: 'all' as const,    label: 'الكل' },
            { id: 'unread' as const, label: `غير المقروءة${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold text-sm">لا توجد إشعارات</p>
            <p className="text-slate-300 text-xs mt-1">ستظهر هنا عند وصول إشعارات جديدة</p>
          </div>
        ) : grouped.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.label}</p>
            <div className="space-y-2">
              {group.items.map(notif => {
                const meta = ICON_MAP[notif.type] || ICON_MAP.like;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${notif.read ? 'bg-white border-slate-100' : 'bg-white border-emerald-100 shadow-sm'}`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${notif.read ? 'text-slate-600' : 'text-slate-900 font-bold'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(notif.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Unread dot + dismiss */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />}
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                        className="p-1 text-slate-200 hover:text-slate-400 transition-colors"
                      >
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
