import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, MapPin, Star, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Share2, ReceiptText, RefreshCw } from 'lucide-react';
import { User } from '../types/index';
import { bookingAPI } from '../services/api';

export interface BookingRecord {
  id: string;
  tourId: string;
  tourTitle: string;
  tourImage: string;
  guideName: string;
  guideAvatar?: string;
  date: string;
  guests: number;
  totalPrice: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending';
  departureLocation: string;
  duration: number;
  bookedAt: number;
  rating?: number;
}

const STATUS_CONFIG = {
  confirmed:  { label: 'مؤكد',        color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: <CheckCircle2 className="w-3 h-3" /> },
  completed:  { label: 'مكتمل',       color: 'text-blue-600',    bg: 'bg-blue-50',     icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: 'ملغي',        color: 'text-red-500',     bg: 'bg-red-50',      icon: <XCircle className="w-3 h-3" /> },
  pending:    { label: 'في الانتظار', color: 'text-amber-600',   bg: 'bg-amber-50',    icon: <Clock className="w-3 h-3" /> },
};

interface BookingHistoryScreenProps {
  t: any;
  lang?: string;
  user?: User | null;
}

export const BookingHistoryScreen = ({ t, lang, user }: BookingHistoryScreenProps) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await bookingAPI.getMyBookings();
      setBookings(data as BookingRecord[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const today = new Date().toISOString().split('T')[0];

  const filtered = bookings.filter(b => {
    if (filter === 'upcoming')  return b.status === 'confirmed' && b.date >= today;
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleCancel = async (id: string) => {
    try {
      await bookingAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    } catch {
      // Optimistic rollback not needed — no change was made
    }
  };

  const handleRate = (id: string, rating: number) => {
    setRatingMap(p => ({ ...p, [id]: rating }));
    setBookings(prev => prev.map(b => b.id === id ? { ...b, rating } : b));
  };

  const totalSpent = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0);
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && b.date >= today).length;

  return (
    <div className="min-h-full bg-slate-50 pb-28 overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">حجوزاتي</h1>
        <p className="text-xs text-slate-400 mt-0.5">جميع رحلاتك وجولاتك المحجوزة</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { label: 'إجمالي الإنفاق', value: `${totalSpent} ر.س`, color: 'text-slate-900' },
          { label: 'جولات مكتملة',   value: completedCount,      color: 'text-blue-600' },
          { label: 'قادمة',          value: upcomingCount,        color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      <div className="mx-4 mb-4 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-black text-sm leading-tight">{(t as any).bookingsNextAdventure || 'Ready for your next adventure?'}</p>
            <p className="text-slate-400 text-xs mt-0.5">{(t as any).bookingsExploreDesc || 'Explore tours, stays & events across Saudi Arabia.'}</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'tours' }))}
            className="shrink-0 px-4 py-2.5 bg-emerald-500 text-white font-black text-xs rounded-2xl active:scale-95 transition-transform shadow-lg shadow-emerald-900/40"
          >
            {(t as any).bookingsBrowseTours || 'Browse Tours →'}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'all' as const,       label: 'الكل' },
          { id: 'upcoming' as const,  label: 'القادمة' },
          { id: 'completed' as const, label: 'المكتملة' },
          { id: 'cancelled' as const, label: 'الملغية' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all active:scale-95 ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="h-32 bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <ReceiptText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">تعذّر تحميل الحجوزات</p>
            <button
              onClick={fetchBookings}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-2xl active:scale-95 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ReceiptText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">لا توجد حجوزات</p>
            <p className="text-slate-300 text-xs mt-1">ابحث عن جولة واحجز الآن</p>
          </div>
        ) : filtered.map(booking => {
          const status = STATUS_CONFIG[booking.status];
          const isUpcoming = booking.status === 'confirmed' && booking.date >= today;
          const isExpanded = expandedId === booking.id;
          const existingRating = ratingMap[booking.id] || booking.rating;

          return (
            <div key={booking.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="relative">
                <img src={booking.tourImage} className="w-full h-32 object-cover" alt={booking.tourTitle} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-white font-black text-base leading-tight">{booking.tourTitle}</h3>
                </div>
                <div className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${status.bg} ${status.color}`}>
                  {status.icon} {status.label}
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold">{new Date(booking.date + 'T00:00:00').toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold">{booking.guests} {booking.guests === 1 ? 'شخص' : 'أشخاص'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold truncate">{booking.departureLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold">{booking.duration} ساعة</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-black text-slate-900">{booking.totalPrice} <span className="text-sm font-bold text-slate-400">ر.س</span></span>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 active:scale-95 transition-transform"
                  >
                    التفاصيل {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 rounded-2xl p-4 mb-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">المرشد</span>
                      <span className="font-bold text-slate-800">{booking.guideName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">تاريخ الحجز</span>
                      <span className="font-bold text-slate-800">{new Date(booking.bookedAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">رقم الحجز</span>
                      <span className="font-mono text-slate-400 text-[10px]">#{String(booking.id).toUpperCase().slice(-8)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isUpcoming && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="flex-1 py-2.5 bg-red-50 text-red-600 text-xs font-black rounded-2xl active:scale-95 transition-transform"
                    >
                      إلغاء الحجز
                    </button>
                  )}
                  {booking.status === 'completed' && !existingRating && (
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 font-bold mb-1 text-center">قيّم تجربتك</p>
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => handleRate(booking.id, s)} className="active:scale-90 transition-transform">
                            <Star className={`w-6 h-6 ${s <= (ratingMap[booking.id] || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {booking.status === 'completed' && existingRating && (
                    <div className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-amber-50 rounded-2xl">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= existingRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: booking.tourTitle, text: `حجزت جولة ${booking.tourTitle} من خلال تريبو!` });
                      }
                    }}
                    className="p-2.5 bg-slate-50 rounded-2xl active:scale-95 transition-transform"
                  >
                    <Share2 className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
