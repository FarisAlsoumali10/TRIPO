import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Star,
  Share2,
  Search,
  Wallet,
  TrendingUp,
  Award,
  Copy,
  Check,
} from 'lucide-react';
import { bookingAPI } from '../services/api';
import { SafeImage } from '../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  _id: string;
  bookingReference: string;
  tour: {
    _id: string;
    title: string;
    heroImage?: string;
    departureLocation?: string;
    duration?: number;
    difficulty?: string;
    guideName?: string;
    category?: string;
  };
  date: string;
  guests: number;
  totalPrice: number;
  pricePerPerson: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus?: 'paid' | 'unpaid' | 'refunded';
  cashbackEarned?: number;
  cardLastFour?: string;
  cardType?: string;
  createdAt: string;
  notes?: string;
}

type FilterStatus = 'all' | 'upcoming' | 'completed' | 'cancelled';

// ─── Status Config ────────────────────────────────────────────────────────────

const getStatusConfig = (t: any) => ({
  confirmed: {
    label: t.bookings?.statusConfirmed || 'Confirmed',
    icon: CheckCircle2,
    bg: 'bg-oasis-spring/10',
    text: 'text-oasis-spring',
    dot: 'bg-oasis-spring',
    border: 'border-oasis-spring/20',
  },
  pending: {
    label: t.bookings?.statusPending || 'Pending',
    icon: AlertCircle,
    bg: 'bg-karam/10',
    text: 'text-karam',
    dot: 'bg-karam',
    border: 'border-karam/20',
  },
  completed: {
    label: t.bookings?.statusCompleted || 'Completed',
    icon: CheckCircle2,
    bg: 'bg-blue-400/10',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-blue-400/20',
  },
  cancelled: {
    label: t.bookings?.statusCancelled || 'Cancelled',
    icon: XCircle,
    bg: 'bg-red-400/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
    border: 'border-red-400/20',
  },
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_BOOKINGS: Booking[] = [
  {
    _id: 'bk1', bookingReference: 'TRP-2026-001',
    tour: { _id: 't1', title: 'Al-Ula Desert Sunrise Trek', heroImage: '/api/photos?place=Al-Ula', departureLocation: 'Al-Ula, Saudi Arabia', duration: 6, difficulty: 'Moderate', guideName: 'Ahmed Al-Rashidi', category: 'Desert' },
    date: '2026-07-20T06:00:00.000Z', guests: 2, totalPrice: 750, pricePerPerson: 375,
    status: 'confirmed', paymentStatus: 'paid', cashbackEarned: 38, cardLastFour: '4242', cardType: 'visa', createdAt: '2026-05-04T10:00:00.000Z',
  },
  {
    _id: 'bk2', bookingReference: 'TRP-2026-002',
    tour: { _id: 't2', title: 'Edge of the World Hike', heroImage: '/api/photos?place=Edge+of+the+World', departureLocation: 'Riyadh, Saudi Arabia', duration: 8, difficulty: 'Challenging', guideName: 'Sara Al-Otaibi', category: 'Adventure' },
    date: '2026-08-05T07:00:00.000Z', guests: 3, totalPrice: 1080, pricePerPerson: 360,
    status: 'confirmed', paymentStatus: 'paid', cashbackEarned: 54, cardLastFour: '9123', cardType: 'mada', createdAt: '2026-05-04T14:30:00.000Z',
  },
  {
    _id: 'bk3', bookingReference: 'TRP-2026-003',
    tour: { _id: 't3', title: 'Diriyah Heritage Walk', heroImage: '/api/photos?place=Diriyah', departureLocation: 'Diriyah, Saudi Arabia', duration: 3, difficulty: 'Easy', guideName: 'Khalid Al-Dossari', category: 'Heritage' },
    date: '2026-04-10T09:00:00.000Z', guests: 4, totalPrice: 600, pricePerPerson: 150,
    status: 'completed', paymentStatus: 'paid', cashbackEarned: 30, createdAt: '2026-04-01T09:00:00.000Z',
  },
  {
    _id: 'bk4', bookingReference: 'TRP-2026-004',
    tour: { _id: 't4', title: 'Red Sea Snorkeling Adventure', heroImage: '/api/photos?place=Jeddah', departureLocation: 'Jeddah, Saudi Arabia', duration: 5, difficulty: 'Easy', guideName: 'Omar Al-Zahrani', category: 'Beach' },
    date: '2026-03-15T08:00:00.000Z', guests: 2, totalPrice: 460, pricePerPerson: 230,
    status: 'cancelled', paymentStatus: 'refunded', createdAt: '2026-03-01T12:00:00.000Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang: string = 'en') {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(iso: string, lang: string = 'en') {
  return new Date(iso).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-SA', { hour: '2-digit', minute: '2-digit' });
}
function isUpcoming(iso: string) { return new Date(iso) > new Date(); }
function getDaysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1 p-0.5 rounded text-moon/40 hover:text-oasis-spring active:scale-90 transition-all" title="Copy reference">
      {copied ? <Check className="w-3 h-3 text-oasis-spring" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

// ─── BookingCard ──────────────────────────────────────────────────────────────

const BookingCard: React.FC<{ booking: Booking; expanded: boolean; onToggle: () => void; lang: string; t: any }> = ({ booking, expanded, onToggle, lang, t }) => {
  const STATUS_CONFIG = getStatusConfig(t);
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isRTL = lang === 'ar';
  const upcoming = isUpcoming(booking.date);
  const daysUntil = upcoming ? getDaysUntil(booking.date) : null;

  return (
    <div className={`rounded-3xl overflow-hidden bg-chamber border border-white/10 transition-all duration-500 ${expanded ? 'shadow-2xl shadow-black/50 ring-1 ring-oasis-spring/20' : 'hover:border-white/20'}`}>
      {/* Hero Image */}
      <div className="relative h-40 group">
        {booking.tour.heroImage ? (
          <SafeImage src={booking.tour.heroImage} alt={booking.tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" fallbackType="icon" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-oasis-spring/30 to-blue-900 flex items-center justify-center text-4xl">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-transparent" />

        {/* Status Badge */}
        <div className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border ${cfg.bg} ${cfg.border} shadow-lg`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${cfg.dot}`} />
          <span className={`text-[10px] font-black tracking-widest uppercase ${cfg.text}`}>{cfg.label}</span>
        </div>

        {/* Days-away badge */}
        {upcoming && daysUntil !== null && daysUntil <= 14 && (
          <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-midnight/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg`}>
            <span className="text-[10px] font-black text-oasis-spring tracking-wider">
              {daysUntil === 0 ? (t.bookings?.daysAwayToday || 'Today!') : 
               daysUntil === 1 ? (t.bookings?.daysAwayTomorrow || 'Tomorrow!') : 
               `${daysUntil}${t.bookings?.daysAwayFuture || 'd away'}`}
            </span>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-black text-white text-base leading-tight tracking-tight drop-shadow-md">{booking.tour.title}</p>
          {booking.tour.departureLocation && (
            <p className="text-white/70 text-[11px] mt-1 flex items-center gap-1.5 font-bold">
              <MapPin className="w-3 h-3 text-oasis-spring" />
              {booking.tour.departureLocation}
            </p>
          )}
        </div>
      </div>

      {/* Main row */}
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-3">
              <span className="text-[10px] text-moon/40 font-black font-mono tracking-widest bg-white/5 px-2 py-0.5 rounded">{booking.bookingReference}</span>
              <CopyButton text={booking.bookingReference} />
            </div>
            <div className={`flex flex-wrap gap-x-4 gap-y-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="flex items-center gap-2 text-xs text-moon font-bold">
                <Calendar className="w-3.5 h-3.5 text-oasis-spring shrink-0" />{formatDate(booking.date, lang)}
              </span>
              <span className="flex items-center gap-2 text-xs text-moon font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />{formatTime(booking.date, lang)}
              </span>
              <span className="flex items-center gap-2 text-xs text-moon font-bold">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                {booking.guests} {booking.guests === 1 ? (t.bookings?.guest || 'guest') : (t.bookings?.guests || 'guests')}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 gap-1.5">
            <span className="font-black text-white text-lg tracking-tighter">{booking.totalPrice.toLocaleString()} <span className="text-[10px] text-moon/60 ml-0.5">{t.bookings?.currency || 'SAR'}</span></span>
            {booking.cashbackEarned && booking.cashbackEarned > 0 && (
              <span className="text-[9px] bg-oasis-spring/10 text-oasis-spring font-black px-2 py-0.5 rounded-full border border-oasis-spring/20 shadow-mint-glow/20">
                +{booking.cashbackEarned} {t.bookings?.sarBack || 'SAR back'}
              </span>
            )}
            <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${expanded ? 'rotate-90 bg-oasis-spring/10' : ''}`}>
              <ChevronRight className={`w-4 h-4 ${expanded ? 'text-oasis-spring' : 'text-moon/30'}`} />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-5 pt-4 space-y-4 bg-midnight/30 backdrop-blur-sm animate-in slide-in-from-top-2 duration-300">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.bookings?.detailsDuration || 'Duration', value: `${booking.tour.duration}h`, icon: '⏱️' },
              { label: t.bookings?.detailsDifficulty || 'Difficulty', value: booking.tour.difficulty ?? '—', icon: '🎯' },
              { label: t.bookings?.detailsPerPerson || 'Per Person', value: `${booking.pricePerPerson} ${t.bookings?.currency || 'SAR'}`, icon: '💳' },
              { label: t.bookings?.detailsCategory || 'Category', value: booking.tour.category ?? '—', icon: '🗺️' },
            ].map((item) => (
              <div key={item.label} className={`bg-midnight/50 rounded-2xl p-3 border border-white/5 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-[9px] text-moon/40 font-black uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-xs font-black text-white flex items-center gap-1.5 justify-start">
                  <span className="opacity-80">{item.icon}</span>{item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Guide */}
          {booking.tour.guideName && (
            <div className={`flex items-center gap-3 bg-midnight/50 rounded-2xl p-3 border border-white/5 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <div className="w-10 h-10 rounded-2xl bg-oasis-spring/10 border border-oasis-spring/20 flex items-center justify-center text-oasis-spring font-black text-sm shrink-0 shadow-inner">
                {booking.tour.guideName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[9px] text-moon/40 font-black uppercase tracking-widest">{t.bookings?.detailsGuide || 'Guide'}</p>
                <p className="text-xs font-black text-white tracking-tight">{booking.tour.guideName}</p>
              </div>
            </div>
          )}

          {/* Payment info */}
          <div className={`flex items-center justify-between bg-midnight/50 rounded-2xl p-3 border border-white/5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <p className="text-[9px] text-moon/40 font-black uppercase tracking-widest mb-1">{t.bookings?.detailsPayment || 'Payment'}</p>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span className="opacity-70">
                  {booking.cardType === 'visa' && '💳 Visa'}
                  {booking.cardType === 'mastercard' && '💳 Mastercard'}
                  {booking.cardType === 'mada' && '🇸🇦 Mada'}
                  {!booking.cardType && '💳'}
                </span>
                {booking.cardLastFour && <span className="text-moon/30 font-mono tracking-tighter"> •••• {booking.cardLastFour}</span>}
              </div>
            </div>
            <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
              booking.paymentStatus === 'paid' ? 'bg-oasis-spring/10 text-oasis-spring border-oasis-spring/20' :
              booking.paymentStatus === 'refunded' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
              'bg-karam/10 text-karam border-karam/20'
            }`}>
              {booking.paymentStatus === 'paid' ? (t.bookings?.paymentPaid || 'Paid') : 
               booking.paymentStatus === 'refunded' ? (t.bookings?.paymentRefunded || 'Refunded') : 
               (t.bookings?.paymentUnpaid || 'Unpaid')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            {booking.status === 'completed' && (
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-karam/10 text-karam rounded-2xl text-xs font-black active:scale-95 transition-all border border-karam/20 hover:bg-karam/20 shadow-lg">
                <Star className="w-4 h-4" />{t.bookings?.actionRate || 'Rate'}
              </button>
            )}
            {(booking.status === 'confirmed' || booking.status === 'completed') && (
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-oasis-spring/10 text-oasis-spring rounded-2xl text-xs font-black active:scale-95 transition-all border border-oasis-spring/20 hover:bg-oasis-spring/20 shadow-lg">
                <Share2 className="w-4 h-4" />{t.bookings?.actionShare || 'Share'}
              </button>
            )}
            {booking.status === 'confirmed' && upcoming && (
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-400/10 text-red-400 rounded-2xl text-xs font-black active:scale-95 transition-all border border-red-400/20 hover:bg-red-400/20 shadow-lg">
                <XCircle className="w-4 h-4" />{t.bookings?.actionCancel || 'Cancel'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── StatsBar ─────────────────────────────────────────────────────────────────

const StatsBar: React.FC<{ bookings: Booking[]; t: any }> = ({ bookings, t }) => {
  const totalSpent = bookings.filter(b => b.paymentStatus === 'paid').reduce((acc, b) => acc + b.totalPrice, 0);
  const totalCashback = bookings.reduce((acc, b) => acc + (b.cashbackEarned ?? 0), 0);
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && isUpcoming(b.date)).length;

  const stats = [
    { icon: TrendingUp, color: 'text-oasis-spring', bg: 'bg-oasis-spring/10', border: 'border-oasis-spring/20', value: totalSpent.toLocaleString(), label: t.bookings?.statsSpent || 'Spent' },
    { icon: Wallet,     color: 'text-karam',        bg: 'bg-karam/10',        border: 'border-karam/20',        value: `+${totalCashback}`,              label: t.bookings?.statsCashback || 'Cashback' },
    { icon: Award,      color: 'text-blue-400',     bg: 'bg-blue-400/10',     border: 'border-blue-400/20',     value: String(completedCount),           label: t.bookings?.statsCompleted || 'Completed' },
    { icon: Calendar,   color: 'text-purple-400',   bg: 'bg-purple-400/10',   border: 'border-purple-400/20',   value: String(upcomingCount),            label: t.bookings?.statsUpcoming || 'Upcoming' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 px-4 pb-5">
      {stats.map(s => (
        <div key={s.label} className={`${s.bg} rounded-3xl p-3 flex flex-col items-center border ${s.border} shadow-lg backdrop-blur-sm transition-transform active:scale-95`}>
          <s.icon className={`w-5 h-5 ${s.color} mb-1.5`} />
          <span className={`font-black text-sm tracking-tighter ${s.color}`}>{s.value}</span>
          <span className="text-[9px] text-moon/50 font-black uppercase tracking-widest leading-tight text-center mt-0.5">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ filter: FilterStatus; onExplore: () => void; t: any }> = ({ filter, onExplore, t }) => {
  const config: Record<FilterStatus, { emoji: string; title: string; sub: string }> = {
    all:       { emoji: '🏜️', title: t.bookings?.emptyAllTitle       || 'No bookings',   sub: t.bookings?.emptyAllSub       || 'Start your journey!' },
    upcoming:  { emoji: '🗓️', title: t.bookings?.emptyUpcomingTitle  || 'No upcoming',    sub: t.bookings?.emptyUpcomingSub  || 'Plan a trip.' },
    completed: { emoji: '🏅', title: t.bookings?.emptyCompletedTitle || 'No completed',   sub: t.bookings?.emptyCompletedSub || 'Finish a trip.' },
    cancelled: { emoji: '✨', title: t.bookings?.emptyCancelledTitle || 'No cancelled',   sub: t.bookings?.emptyCancelledSub || 'No cancellations.' },
  };
  const c = config[filter];
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="text-6xl mb-6 drop-shadow-lg">{c.emoji}</div>
      <h3 className="font-black text-white text-lg mb-2 tracking-tight">{c.title}</h3>
      <p className="text-sm text-moon/70 max-w-xs mb-8 leading-relaxed font-bold">{c.sub}</p>
      {filter !== 'cancelled' && (
        <button onClick={onExplore} className="px-8 py-3.5 bg-oasis-spring text-midnight font-black text-sm rounded-2xl active:scale-95 transition-all shadow-mint-glow hover:shadow-oasis-spring/40 tracking-widest uppercase">
          {t.bookings?.exploreDestinations || t.home?.browseTours || 'Browse Tours'}
        </button>
      )}
    </div>
  );
};

// ─── BookingsScreen ───────────────────────────────────────────────────────────

interface BookingsScreenProps {
  onNavigate?: (tab: string, id?: string) => void;
  lang?: string;
  t?: any;
  user?: any;
}

export const BookingsScreen: React.FC<BookingsScreenProps> = ({ onNavigate, lang = 'en', t, user }) => {
  const isRTL = lang === 'ar';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await bookingAPI.getMyBookings();
      const arr = Array.isArray(data) ? data : (data as any)?.data ?? (data as any)?.bookings ?? [];
      setBookings((arr as Booking[]).length ? (arr as Booking[]) : MOCK_BOOKINGS);
    } catch {
      setBookings(MOCK_BOOKINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = bookings.filter(b => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !b.tour.title.toLowerCase().includes(q) &&
        !b.bookingReference.toLowerCase().includes(q) &&
        !b.tour.departureLocation?.toLowerCase().includes(q)
      ) return false;
    }
    if (filter === 'upcoming') return b.status === 'confirmed' && isUpcoming(b.date);
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleToggle = useCallback((id: string) => setExpandedId(prev => prev === id ? null : id), []);

  const FILTERS: { key: FilterStatus; label: string; emoji: string }[] = [
    { key: 'all',       label: t.bookings?.filterAll       || 'All',       emoji: '📋' },
    { key: 'upcoming',  label: t.bookings?.filterUpcoming  || 'Upcoming',  emoji: '🗓️' },
    { key: 'completed', label: t.bookings?.filterCompleted || 'Completed', emoji: '✅' },
    { key: 'cancelled', label: t.bookings?.filterCancelled || 'Cancelled', emoji: '❌' },
  ];

  const getCount = (key: FilterStatus) => {
    if (key === 'all') return bookings.length;
    if (key === 'upcoming') return bookings.filter(b => b.status === 'confirmed' && isUpcoming(b.date)).length;
    if (key === 'completed') return bookings.filter(b => b.status === 'completed').length;
    return bookings.filter(b => b.status === 'cancelled').length;
  };

  return (
    <div className="h-full flex flex-col bg-midnight">

      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-midnight via-chamber to-midnight border-b border-white/5 pt-14 pb-6 px-6">
        <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">{t.bookings?.title || 'My Bookings'}</h1>
            <p className="text-moon/60 text-xs mt-1 font-bold tracking-wide">
              {bookings.length} {t.bookings?.countLabel || 'bookings total'}
            </p>
          </div>
          <button
            onClick={load}
            className="w-12 h-12 bg-lifted rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all hover:border-oasis-spring/30 group shadow-lg"
          >
            <RotateCcw className="w-5 h-5 text-moon group-hover:text-oasis-spring transition-colors" />
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-3 bg-lifted/50 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 focus-within:border-oasis-spring/40 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Search className="w-4 h-4 text-moon/30 shrink-0" />
          <input
            className={`flex-1 bg-transparent text-white placeholder-moon/20 text-sm outline-none font-bold ${isRTL ? 'text-right' : 'text-left'}`}
            placeholder={t.bookings?.searchPlaceholder || 'Search references...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Stats */}
        {!isLoading && bookings.length > 0 && (
          <div className="pt-6">
            <StatsBar bookings={bookings} t={t} />
          </div>
        )}

        {/* Filter Tabs */}
        <div className={`flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {FILTERS.map(f => {
            const count = getCount(f.key);
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black border transition-all active:scale-95 ${
                  filter === f.key
                    ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow'
                    : 'bg-lifted/40 text-moon/60 border-white/5 hover:border-white/20'
                }`}
              >
                <span className="opacity-80">{f.emoji}</span>
                {f.label}
                {count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    filter === f.key ? 'bg-midnight/20 text-midnight' : 'bg-white/10 text-moon/40'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="px-4 pb-12 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-chamber border border-white/5">
                <div className="h-40 bg-gradient-to-r from-lifted via-chamber to-lifted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-24 bg-lifted rounded-full animate-pulse" />
                  <div className="h-5 w-48 bg-lifted rounded-full animate-pulse" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} onExplore={() => onNavigate?.('tours')} t={t} />
          ) : (
            filtered.map(booking => (
              <BookingCard
                key={booking._id}
                booking={booking}
                expanded={expandedId === booking._id}
                onToggle={() => handleToggle(booking._id)}
                lang={lang}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingsScreen;
