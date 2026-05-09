import React, { useState, useMemo } from 'react';
import { Calendar, Ticket, ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { SafeImage } from '../components/ui';
import { bookingAPI } from '../services/api';

export interface Booking {
  id: string;
  title: string;
  image: string;
  date: string;
  location: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  price: number;
}

interface MyBookingsProps {
  bookings?: Booking[];
  lang?: 'en' | 'ar';
  onNavigate: (tab: string, id?: string) => void;
  onBack?: () => void;
  t?: any;
}

export const MyBookingsScreen: React.FC<MyBookingsProps> = ({ 
  bookings: initialBookings, 
  lang = 'en',
  onNavigate,
  onBack,
  t
}) => {
  const isRTL = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>(initialBookings || []);
  const [isLoading, setIsLoading] = useState(!initialBookings);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialBookings) return;

    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        const data = await bookingAPI.getMyBookings();
        
        const mapped: Booking[] = data.map((b: any) => ({
          id: b.id || b._id,
          title: b.tourTitle || b.rentalTitle || 'Booking',
          image: b.tourImage || b.rentalImage || '',
          date: b.date || b.bookedAt,
          location: b.departureLocation || b.location || '',
          status: b.status === 'confirmed' ? 'upcoming' : b.status,
          price: b.totalPrice || 0
        }));

        setBookings(mapped);
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
        setError(isRTL ? 'فشل تحميل الحجوزات' : 'Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [initialBookings, isRTL]);

  const dict = useMemo(() => ({
    title: isRTL ? 'حجوزاتي' : 'My Bookings',
    tabs: {
      upcoming: isRTL ? 'القادمة' : 'Upcoming',
      completed: isRTL ? 'المكتملة' : 'Completed',
      cancelled: isRTL ? 'الملغاة' : 'Cancelled',
    },
    emptyState: {
      title: isRTL ? 'لا توجد حجوزات هنا' : 'No bookings found here',
      subtitle: isRTL ? 'ابدأ التخطيط لرحلتك القادمة واكتشف أفضل الأماكن!' : 'Start planning your next trip and discover great places!',
      button: isRTL ? 'استكشف الآن' : 'Explore Now',
    },
    bookingId: isRTL ? 'رقم الحجز:' : 'Booking ID:',
    viewTicket: isRTL ? 'عرض التذكرة' : 'View Ticket',
    rebook: isRTL ? 'احجز مجدداً' : 'Book Again',
  }), [isRTL]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  return (
    <div className={`min-h-[100dvh] bg-white dark:bg-navy-900 pb-24 ${isRTL ? 'rtl' : 'ltr'}`}>
      
      {/* ── Header ── */}
      <div className="bg-white/80 dark:bg-navy-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/8 px-6 pt-12 pb-6 sticky top-0 z-20">
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white">
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          )}
          <h1 className={`text-2xl font-black text-slate-900 dark:text-white tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
            {dict.title}
          </h1>
        </div>
        
        {/* ── Tabs ── */}
        <div className={`flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${ activeTab === tab ? 'bg-oasis-spring text-midnight shadow-lg shadow-oasis-spring/20 scale-105' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 hover:bg-slate-200' }`}
            >
              {dict.tabs[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-moon/40">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <span className="text-xs font-black uppercase tracking-widest">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-red-400 text-center">
            <AlertCircle className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm font-bold max-w-[200px]">{error}</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 rounded-[2rem] overflow-hidden active:scale-[0.98] transition-transform shadow-xl">
              <div className={`flex h-36 ${isRTL ? 'flex-row-reverse' : ''}`}>
                
                {/* Image Section */}
                <div className="w-36 h-full shrink-0 relative">
                  <SafeImage 
                    src={booking.image} 
                    alt={booking.title} 
                    className="w-full h-full object-cover"
                    fallbackType="placeholder"
                    seed={booking.title}
                  />
                  <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'}`}>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-tighter rounded-lg backdrop-blur-md text-white border border-white/10 ${ booking.status === 'upcoming' ? 'bg-oasis-spring/80 text-midnight' : booking.status === 'completed' ? 'bg-blue-500/80' : 'bg-red-500/80' }`}>
                      {dict.tabs[booking.status]}
                    </span>
                  </div>
                </div>

                {/* Info Section */}
                <div className={`flex-1 p-4 flex flex-col justify-between ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm line-clamp-2 leading-tight uppercase tracking-wide">
                      {booking.title}
                    </h3>
                    <div className={`flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Calendar className="w-3 h-3 shrink-0 text-oasis-spring" />
                      <span>{new Date(booking.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[9px] font-black text-slate-500/30 dark:text-slate-500/30 uppercase tracking-widest">
                      {dict.bookingId} {booking.id}
                    </span>
                    <button className="flex items-center justify-center w-9 h-9 bg-slate-100 dark:bg-navy-800 text-oasis-spring rounded-full hover:scale-110 transition-transform shadow-lg">
                      {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center mb-8 shadow-2xl">
              <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">
              {dict.emptyState.title}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-500 mb-10 max-w-[260px] leading-relaxed">
              {dict.emptyState.subtitle}
            </p>
            <button 
              onClick={() => onNavigate('explore')}
              className="px-10 py-4 bg-oasis-spring text-midnight font-black text-xs uppercase tracking-widest rounded-2xl shadow-oasis-spring/20 shadow-2xl active:scale-95 transition-all"
            >
              {dict.emptyState.button}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
