import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Users, MapPin, Star, Clock, CheckCircle2, 
  XCircle, ChevronDown, ChevronUp, Share2, ReceiptText, 
  RefreshCw, Wallet, Ticket, Info, AlertCircle 
} from 'lucide-react';
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
  paymentStatus?: 'paid' | 'pending' | 'refunded';
  departureLocation: string;
  duration: number;
  bookedAt: number;
  rating?: number;
}

const getStatusConfig = (t: any) => ({
  confirmed:  { label: t.bookings.statusConfirmed, color: 'text-oasis-spring', bg: 'bg-oasis-spring/10',  icon: <CheckCircle2 className="w-3 h-3" /> },
  completed:  { label: t.bookings.statusCompleted, color: 'text-karam',       bg: 'bg-karam/10',         icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:  { label: t.bookings.statusCancelled, color: 'text-waypoint',    bg: 'bg-waypoint/10',      icon: <XCircle className="w-3 h-3" /> },
  pending:    { label: t.bookings.statusPending,   color: 'text-karam',       bg: 'bg-karam/10',         icon: <Clock className="w-3 h-3" /> },
});

interface BookingHistoryScreenProps {
  t: any;
  lang?: 'en' | 'ar';
  user?: User | null;
}

export const BookingHistoryScreen = ({ t, lang = 'ar', user }: BookingHistoryScreenProps) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratingMap, setRatingMap] = useState<Record<string, number>>({});

  const isRTL = lang === 'ar';
  const bk = t.bookings;
  const STATUS_CONFIG = getStatusConfig(t);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await bookingAPI.getMyBookings();
      setBookings(data as BookingRecord[]);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const today = new Date().toISOString().split('T')[0];

  const filtered = bookings.filter(b => {
    if (filter === 'upcoming')  return (b.status === 'confirmed' || b.status === 'pending') && b.date >= today;
    if (filter === 'completed') return b.status === 'completed' || (b.status === 'confirmed' && b.date < today);
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleCancel = async (id: string) => {
    if (!window.confirm(bk.confirmCancel)) return;
    try {
      await bookingAPI.cancelBooking(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b));
    } catch (err) {
      alert(bk.errorCancel);
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      await bookingAPI.rateBooking(id, rating);
      setRatingMap(p => ({ ...p, [id]: rating }));
      setBookings(prev => prev.map(b => b.id === id ? { ...b, rating } : b));
    } catch (err) {
      console.error('Failed to save rating:', err);
      alert(bk.errorRate);
    }
  };

  const handleDownloadReceipt = (booking: BookingRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Tripo Receipt - #${String(booking.id).toUpperCase().slice(-8)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 900; color: #7CF7C8; }
            .ticket { border: 1px solid #101B36; border-radius: 20px; overflow: hidden; background: #081229; color: white; }
            .ticket-top { background: #101B36; padding: 30px; border-bottom: 2px dashed #050B1E; position: relative; }
            .ticket-top:after, .ticket-top:before { content: ''; position: absolute; bottom: -10px; width: 20px; height: 20px; background: #081229; border-radius: 50%; }
            .ticket-top:before { left: -10px; } .ticket-top:after { right: -10px; }
            .ticket-body { padding: 30px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
            .label { font-size: 10px; font-weight: 900; color: #B8C2D6; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; color: #ffffff; }
            .total { margin-top: 40px; padding-top: 20px; border-top: 2px solid #101B36; display: flex; justify-content: space-between; align-items: center; }
            .amount { font-size: 24px; font-weight: 900; color: #7CF7C8; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">TRIPO</div>
            <div class="value">Official Receipt</div>
          </div>
          <div class="ticket">
            <div class="ticket-top">
              <div class="label">Experience</div>
              <div style="font-size: 20px; font-weight: 900;">${booking.tourTitle}</div>
              <div class="value" style="color: #64748b; margin-top: 4px;">${booking.departureLocation}</div>
            </div>
            <div class="ticket-body">
              <div class="grid">
                <div>
                  <div class="label">Booking ID</div>
                  <div class="value">#${String(booking.id).toUpperCase()}</div>
                </div>
                <div>
                  <div class="label">Date</div>
                  <div class="value">${new Date(booking.date).toLocaleDateString()}</div>
                </div>
                <div>
                  <div class="label">Guests</div>
                  <div class="value">${booking.guests} Persons</div>
                </div>
                <div>
                  <div class="label">Duration</div>
                  <div class="value">${booking.duration} ${booking.tourId?.startsWith('t') ? 'Hours' : 'Nights'}</div>
                </div>
              </div>
              <div class="total">
                <div>
                  <div class="label">Status</div>
                  <div class="value" style="color: #10b981;">Paid & Confirmed</div>
                </div>
                <div style="text-align: right;">
                  <div class="label">Total Paid</div>
                  <div class="amount">${booking.totalPrice} SAR</div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
            Thank you for traveling with Tripo. This is a computer-generated receipt.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const totalSpent = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0);
  const completedCount = bookings.filter(b => b.status === 'completed' || (b.status === 'confirmed' && b.date < today)).length;
  const upcomingCount = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.date >= today).length;

  return (
    <div className="min-h-full bg-midnight pb-32 overflow-y-auto transition-colors duration-300">
      {/* Premium Header */}
      <div className="relative px-5 pt-10 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-oasis-spring/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              {bk.title}
            </h1>
            <div className="w-10 h-10 bg-lifted rounded-2xl flex items-center justify-center shadow-sm">
              <Ticket className="w-5 h-5 text-oasis-spring" />
            </div>
          </div>
          <p className="text-sm text-moon">
            {bk.titleDesc}
          </p>
        </div>
      </div>

      {/* Stats Cards — Glassmorphism style */}
      <div className="px-4 -mt-14 relative z-20">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: bk.statsSpent, value: `${totalSpent}`, suffix: isRTL ? 'ر.س' : 'SAR', icon: Wallet, color: 'karam' },
            { label: bk.statsCompleted, value: completedCount, suffix: '', icon: CheckCircle2, color: 'oasis-spring' },
            { label: bk.statsUpcoming, value: upcomingCount, suffix: '', icon: Calendar, color: 'oasis-spring' },
          ].map((s, idx) => (
            <div key={idx} className="bg-chamber rounded-3xl border border-white/5 p-4 transition-transform hover:scale-[1.02]">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 bg-lifted`}>
                <s.icon className={`w-4 h-4 text-${s.color}`} />
              </div>
              <p className="text-lg font-black text-white leading-none mb-1">{s.value}<span className="text-[10px] font-bold text-moon ml-1">{s.suffix}</span></p>
              <p className="text-[9px] text-moon font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs — Pill style */}
      <div className="flex gap-2 px-5 mt-8 mb-6 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'all' as const,       label: bk.filterAll },
          { id: 'upcoming' as const,  label: bk.filterUpcoming },
          { id: 'completed' as const, label: bk.filterPast },
          { id: 'cancelled' as const, label: bk.filterCancelled },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-6 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-300 active:scale-95 ${
              filter === f.id 
                ? 'bg-oasis-spring text-midnight shadow-mint-glow' 
                : 'bg-lifted border border-white/5 text-moon'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="px-4 space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-chamber rounded-[2rem] h-64 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-chamber rounded-[2.5rem] border border-white/5 shadow-sm">
            <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-white font-black text-lg">{bk.errorFetch}</p>
            <p className="text-moon text-sm mt-1 px-10">{bk.errorFetchSub}</p>
            <button
              onClick={fetchBookings}
              className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-oasis-spring text-midnight text-sm font-black rounded-2xl active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> {bk.tryAgain}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-chamber rounded-[2.5rem] border border-white/5">
            <div className="w-24 h-24 bg-lifted rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-10 h-10 text-moon/20" />
            </div>
            <p className="text-white font-black text-lg">{bk.emptyNoResults}</p>
            <p className="text-moon text-sm mt-1 mb-8">{bk.emptyNoResultsSub}</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'home' }))}
              className="px-10 py-4 bg-oasis-spring text-midnight font-black rounded-2xl shadow-mint-glow active:scale-95 transition-transform"
            >
              {bk.exploreDestinations}
            </button>
          </div>
        ) : (
          filtered.map(booking => {
            const status = STATUS_CONFIG[booking.status];
            const isExpanded = expandedId === booking.id;
            const existingRating = ratingMap[booking.id] || booking.rating;
            const bookingDate = new Date(booking.date + 'T00:00:00');
            
            return (
              <div 
                key={booking.id} 
                className="relative bg-chamber rounded-[2rem] border border-white/10 shadow-sm overflow-hidden transition-all duration-500"
              >
                {/* Card Top Section: Hero Image & Status */}
                <div className="relative h-44">
                  <img src={booking.tourImage || 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80'} className="w-full h-full object-cover" alt={booking.tourTitle} />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent" />
                  
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black backdrop-blur-md transition-colors duration-300" 
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-current ${booking.status === 'confirmed' ? 'animate-pulse' : ''}`} />
                    {status.label}
                  </div>

                  <div className="absolute bottom-4 left-5 right-5">
                    <p className="text-[10px] font-black text-oasis-spring uppercase tracking-widest mb-1">
                      {booking.guideName ? (lang === 'ar' ? `مع ${booking.guideName}` : `With ${booking.guideName}`) : ''}
                    </p>
                    <h3 className="text-white font-black text-xl leading-tight">{booking.tourTitle}</h3>
                  </div>
                </div>

                {/* Card Middle: Key Info Grid */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-lifted flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-oasis-spring" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-moon font-bold uppercase">{t.common?.date || (isRTL ? 'التاريخ' : 'Date')}</p>
                        <p className="text-xs font-black text-white truncate">
                          {bookingDate.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-lifted flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-oasis-spring" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-moon font-bold uppercase">{t.common?.guests || (isRTL ? 'الضيوف' : 'Guests')}</p>
                        <p className="text-xs font-black text-white">
                          {booking.guests} {booking.guests === 1 ? (t.common?.guest || (isRTL ? 'شخص' : 'Guest')) : (t.common?.guests || (isRTL ? 'أشخاص' : 'Guests'))}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-lifted flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-oasis-spring" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-moon font-bold uppercase">{t.common?.location || (isRTL ? 'الموقع' : 'Location')}</p>
                        <p className="text-xs font-black text-white truncate">{booking.departureLocation}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-lifted flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-oasis-spring" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-moon font-bold uppercase">{bk.detailsDuration}</p>
                        <p className="text-xs font-black text-white">
                          {booking.duration} {isRTL ? 'ساعة' : 'Hours'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Perforated Divider Visual */}
                  <div className="relative flex items-center mb-6">
                    <div className="absolute -left-[26px] w-5 h-5 rounded-full bg-midnight border-r border-white/10" />
                    <div className="flex-1 border-t border-dashed border-white/10" />
                    <div className="absolute -right-[26px] w-5 h-5 rounded-full bg-midnight border-l border-white/10" />
                  </div>

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-[9px] text-moon font-black uppercase tracking-wider mb-0.5">{bk.statsSpent}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white leading-none">{booking.totalPrice.toLocaleString()}</span>
                        <span className="text-xs font-bold text-moon">{isRTL ? 'ر.س' : 'SAR'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ 
                              title: booking.tourTitle, 
                              text: bk.shareBooking.replace('{title}', booking.tourTitle)
                            });
                          }
                        }}
                        className="w-11 h-11 rounded-2xl bg-lifted border border-white/10 flex items-center justify-center text-moon hover:text-oasis-spring transition-colors active:scale-90"
                        aria-label="Share booking"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                        className={`px-5 h-11 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center gap-2 ${
                          isExpanded 
                            ? 'bg-white text-midnight' 
                            : 'bg-lifted text-moon border border-white/10'
                        }`}
                      >
                        {bk.detailsBtn}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
                      <div className="bg-midnight rounded-2xl p-4 grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-moon font-bold uppercase">ID</p>
                            <p className="text-xs font-mono font-bold text-white">#{String(booking.id).toUpperCase().slice(-8)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-moon font-bold uppercase">{bk.paymentStatus}</p>
                            <p className={`text-xs font-bold ${booking.paymentStatus === 'paid' ? 'text-oasis-spring' : 'text-amber-500'}`}>
                              {booking.paymentStatus === 'paid' ? bk.paymentPaid : bk.paymentProcessing}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-moon font-bold uppercase">{isRTL ? 'تاريخ الحجز' : 'Booked On'}</p>
                            <p className="text-xs font-bold text-white">{new Date(booking.bookedAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-moon font-bold uppercase">{bk.serviceType}</p>
                            <p className="text-xs font-bold text-white capitalize">{booking.tourId?.startsWith('t') ? bk.serviceTour : bk.serviceStay}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {/* Cancellation Button if applicable */}
                        {(booking.status === 'confirmed' || booking.status === 'pending') && booking.date >= today && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            {bk.cancelBtn}
                          </button>
                        )}

                        {/* Rating Component for completed trips */}
                        {(booking.status === 'completed' || (booking.status === 'confirmed' && booking.date < today)) && (
                          <div className="flex-1 bg-karam/5 rounded-2xl p-3 flex flex-col items-center justify-center border border-karam/10">
                            {existingRating ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-karam">{bk.reviewRated}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= existingRating ? 'text-karam fill-karam' : 'text-lifted'}`} />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[10px] text-karam font-black mb-2">{bk.reviewPrompt}</p>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => handleRate(booking.id, s)} className="active:scale-125 transition-transform">
                                      <Star className="w-6 h-6 text-karam hover:fill-karam transition-colors" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        
                          <button 
                            onClick={() => handleDownloadReceipt(booking)}
                            className="flex-1 py-3 bg-lifted text-oasis-spring text-xs font-black rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 border border-white/5"
                          >
                            <ReceiptText className="w-4 h-4" />
                            {lang === 'ar' ? 'تحميل الفاتورة' : 'Download Receipt'}
                          </button>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/20">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                          {isRTL 
                            ? 'يمكنك التواصل مع المرشد مباشرة من خلال صفحة الدردشة في حال وجود أي استفسارات حول نقطة التجمع.' 
                            : 'You can contact the guide directly through the chat page if you have any questions about the meeting point.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BookingHistoryScreen;
