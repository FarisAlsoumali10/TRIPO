// frontend/src/screens/ToursScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, Clock, Users, ChevronRight, MapPin, Compass, TrendingUp, Award, Navigation,
  Wallet, Search, X, WifiOff, Bookmark, SlidersHorizontal, LayoutGrid, LayoutList, Globe,
} from 'lucide-react';
import { Tour, Itinerary, GroupTrip } from '../types';
import { tourAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { SkeletonCard, SafeImage } from '../components/ui';
import { TourDetailScreen } from './TourDetailScreen';
import { BookingModal } from '../components/BookingModal';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

// ==========================================
// Types & Constants
// ==========================================
type QuickFilter = 'budget' | 'trending' | 'highest_rated' | 'near_me' | 'new' | null;

const TOUR_CITY_PILLS = [
  { en: 'All Cities', ar: 'كل المدن' },
  { en: 'Riyadh', ar: 'الرياض' },
  { en: 'Jeddah', ar: 'جدة' },
  { en: 'AlUla', ar: 'العُلا' },
  { en: 'Taif', ar: 'الطائف' },
  { en: 'Abha', ar: 'أبها' },
  { en: 'Tabuk', ar: 'تبوك' },
];

interface TourFilterState {
  priceMin: number;
  priceMax: number;
  difficulties: string[];
  maxDuration: number; // 0 = no limit
}
const DEFAULT_FILTER: TourFilterState = { priceMin: 0, priceMax: 2000, difficulties: [], maxDuration: 0 };

const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925], mecca: [21.3891, 39.8579],
  medina: [24.5247, 39.5692], dammam: [26.4207, 50.0888], alula: [26.6081, 37.9162],
  taif: [21.2739, 40.4062], hail: [27.5114, 41.7208], abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715], yanbu: [24.0894, 38.0618], khobar: [26.2172, 50.1971],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function departureCityDistance(location: string, userLat: number, userLon: number): number {
  if (!location) return 9999;
  const city = location.split(',')[0].trim().toLowerCase().replace(/\s+/g, '_');
  for (const [k, coords] of Object.entries(CITY_COORDS)) {
    if (city.includes(k) || k.includes(city)) return haversineKm(userLat, userLon, coords[0], coords[1]);
  }
  return 9999;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-oasis-spring/10 text-oasis-spring border-oasis-spring/20',
  moderate: 'bg-karam/10 text-karam border-karam/20',
  challenging: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ==========================================
// Filter Panel
// ==========================================
interface FilterPanelProps {
  filter: TourFilterState;
  onChange: (f: TourFilterState) => void;
  onClose: () => void;
  lang?: 'en' | 'ar';
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filter, onChange, onClose, lang }) => {
  const ar = lang === 'ar';
  const [local, setLocal] = useState<TourFilterState>(filter);

  useEffect(() => { setLocal(filter); }, [filter]);

  const toggleDifficulty = (d: string) =>
    setLocal(prev => ({
      ...prev,
      difficulties: prev.difficulties.includes(d)
        ? prev.difficulties.filter(x => x !== d)
        : [...prev.difficulties, d],
    }));

  const diffBtnClass = (d: string, active: boolean) => {
    if (!active) return 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20';
    if (d === 'easy') return 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow';
    if (d === 'moderate') return 'bg-karam text-midnight border-karam';
    return 'bg-red-500 text-white border-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md" onClick={() => { onChange(local); onClose(); }} />
      <div className="relative bg-white dark:bg-navy-950 border-t border-slate-100 dark:border-white/10 rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-black text-slate-900 dark:text-white text-lg">{ar ? 'تصفية الجولات' : 'Filter Tours'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">{ar ? 'خصص نتائج بحثك' : 'Customize your search'}</p>
          </div>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="w-10 h-10 bg-slate-50 dark:bg-navy-900 hover:bg-slate-100 dark:hover:bg-navy-800 border border-slate-100 dark:border-white/5 rounded-full flex items-center justify-center transition-all active:scale-90"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-500" />
          </button>
        </div>

        {/* Price Range */}
        <div className="mb-8">
          <p className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">{ar ? 'نطاق السعر (ريال)' : 'Price Range (SAR)'}</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-2 block">{ar ? 'الحد الأدنى' : 'Min'}</label>
              <input
                type="number"
                min={0}
                max={local.priceMax}
                value={local.priceMin}
                onChange={e => setLocal(prev => ({ ...prev, priceMin: Math.min(Number(e.target.value), prev.priceMax) }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-oasis-spring transition-all"
              />
            </div>
            <span className="text-slate-200 dark:text-white/10 pb-3 font-black">—</span>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-2 block">{ar ? 'الحد الأقصى' : 'Max'}</label>
              <input
                type="number"
                min={local.priceMin}
                max={5000}
                value={local.priceMax}
                onChange={e => setLocal(prev => ({ ...prev, priceMax: Math.max(Number(e.target.value), prev.priceMin) }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-oasis-spring transition-all"
              />
            </div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <p className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">{ar ? 'مستوى الصعوبة' : 'Difficulty'}</p>
          <div className="flex gap-3 flex-wrap">
            {(['easy', 'moderate', 'challenging'] as const).map(d => {
              const diffLabelMap: Record<string, string> = ar
                ? { easy: 'سهل', moderate: 'متوسط', challenging: 'صعب' }
                : { easy: 'Easy', moderate: 'Moderate', challenging: 'Challenging' };
              return (
                <button
                  key={d}
                  onClick={() => toggleDifficulty(d)}
                  className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 border ${diffBtnClass(d, local.difficulties.includes(d))}`}
                >
                  {diffLabelMap[d]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Max Duration */}
        <div className="mb-10">
          <p className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">{ar ? 'أقصى مدة' : 'Max Duration'}</p>
          <div className="flex gap-3 flex-wrap">
            {[{ labelEn: 'Any', labelAr: 'أي مدة', val: 0 }, { labelEn: '≤3h', labelAr: '≤3 س', val: 3 }, { labelEn: '≤6h', labelAr: '≤6 س', val: 6 }, { labelEn: '≤12h', labelAr: '≤12 س', val: 12 }].map(opt => (
              <button
                key={opt.val}
                onClick={() => setLocal(prev => ({ ...prev, maxDuration: opt.val }))}
                className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 border ${local.maxDuration === opt.val ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20' }`}
              >
                {ar ? opt.labelAr : opt.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4">
          <button
            onClick={() => setLocal(DEFAULT_FILTER)}
            className="flex-1 py-4 bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-white/5 rounded-2xl font-black text-sm active:scale-95 transition-all"
          >
            {ar ? 'مسح الكل' : 'Clear All'}
          </button>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="flex-1 py-4 bg-oasis-spring text-midnight rounded-2xl font-black text-sm shadow-mint-glow active:scale-95 transition-all"
          >
            {ar ? 'تطبيق الفلاتر' : 'Apply Filters'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Main Screen Component
// ==========================================
interface ToursScreenProps {
  t: any;
  lang?: 'en' | 'ar';
  onBookingComplete: (itinerary: Itinerary, groupTrip: GroupTrip) => void;
  initialTourId?: string;
  onTourOpened?: () => void;
  initialQuickFilter?: QuickFilter;
}

export const ToursScreen: React.FC<ToursScreenProps> = ({ t, lang, onBookingComplete, initialTourId, onTourOpened, initialQuickFilter }) => {
  const ar = lang === 'ar';
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [category, setCategory] = useState('all');
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterState, setFilterState] = useState<TourFilterState>(DEFAULT_FILTER);
  const [cityFilter, setCityFilter] = useState('All Cities');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(6);

  // Re-fetch backend saved list when returning from detail
  useEffect(() => {
    if (!selectedTour) {
      tourAPI.getSavedTours()
        .then(data => setSavedIds(new Set(data || [])))
        .catch(() => { });
    }
  }, [selectedTour]);

  useEffect(() => { setVisibleCount(6); }, [search, cityFilter, filterState, quickFilter, category]);

  // Unified data load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setHasNetworkError(false);
      try {
        const params = category !== 'all' ? { category } : undefined;
        const [toursRes, savedRes] = await Promise.allSettled([
          tourAPI.getTours(params),
          tourAPI.getSavedTours()
        ]);

        if (toursRes.status === 'fulfilled') {
          setTours(toursRes.value || []);
        } else {
          setHasNetworkError(true);
        }

        if (savedRes.status === 'fulfilled') {
          setSavedIds(new Set(savedRes.value || []));
        }
      } catch {
        setHasNetworkError(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [category]);

  useEffect(() => {
    if (initialTourId && tours.length > 0) {
      const tour = tours.find(t => (t.id || (t as any)._id) === initialTourId) ?? null;
      if (tour) { setSelectedTour(tour); onTourOpened?.(); }
    }
  }, [initialTourId, tours]);

  useEffect(() => {
    if (initialQuickFilter) setQuickFilter(initialQuickFilter);
  }, [initialQuickFilter]);

  // Optimistic Background Sync
  const handleToggleSave = async (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removed from saved', 'success');
      } else {
        next.add(id);
        showToast('Saved!', 'success');
      }
      return next;
    });

    try {
      await tourAPI.toggleSavedTour(id);
    } catch (err) {
      showToast('Failed to sync save status', 'error');
      // Revert if failed
      setSavedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  };

  const handleQuickFilter = (f: QuickFilter) => {
    if (f === quickFilter) { setQuickFilter(null); return; }
    if (f === 'near_me') {
      if (!navigator.geolocation) { showToast('Geolocation not supported by your browser', 'error'); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => { setUserCoords([pos.coords.latitude, pos.coords.longitude]); setQuickFilter('near_me'); setLocating(false); },
        () => { showToast('Could not get your location', 'error'); setLocating(false); }
      );
      return;
    }
    setQuickFilter(f);
  };

  const recentlyAddedTours = useMemo(() =>
    [...tours]
      .filter(t => t.ownerId && t.heroImage)
      .sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0))
      .slice(0, 8),
    [tours]);

  const trendingItems: TrendingItem[] = useMemo(() =>
    [...tours]
      .sort((a, b) => (b.bookingsCount ?? b.reviewCount ?? 0) - (a.bookingsCount ?? a.reviewCount ?? 0))
      .slice(0, 8)
      .filter(t => t.heroImage)
      .map(t => ({
        id: t.id || (t as any)._id || '',
        image: t.heroImage || '',
        name: t.title,
        subtitle: t.departureLocation || t.category || 'Saudi Arabia',
        badge: t.category || 'Tour',
        badgeColor: '#7c3aed',
        rating: Number(t.rating) || undefined,
      })),
    [tours]);

  const slideshowItems: SlideItem[] = useMemo(() =>
    [...tours]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8)
      .filter(t => t.heroImage)
      .map(t => ({
        id: t.id || (t as any)._id || '',
        type: 'tour' as const,
        name: t.title,
        image: t.heroImage || '',
        subtitle: t.departureLocation || t.category || 'Saudi Arabia',
        rating: Number(t.rating) || undefined,
        badge: t.category || 'Tour',
        badgeColor: '#7c3aed',
      })),
    [tours]);

  const displayedTours = useMemo(() => {
    return [...tours]
      .filter(tour => {
        if (search) {
          const q = search.toLowerCase();
          const searchable = [
            tour.title, tour.category, tour.departureLocation, tour.description,
            ...(tour.highlights || []), ...(tour.tags || []), tour.guideName,
          ].filter(Boolean).join(' ').toLowerCase();
          if (!searchable.includes(q)) return false;
        }
        if (cityFilter !== 'All Cities') {
          const city = cityFilter.toLowerCase();
          if (!tour.departureLocation?.toLowerCase().includes(city)) return false;
        }
        if (tour.pricePerPerson < filterState.priceMin || tour.pricePerPerson > filterState.priceMax) return false;
        if (filterState.difficulties.length > 0 && !filterState.difficulties.includes(tour.difficulty)) return false;
        if (filterState.maxDuration > 0 && tour.totalDuration > filterState.maxDuration) return false;
        return true;
      })
      .sort((a, b) => {
        if (quickFilter === 'new') return +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0);
        if (quickFilter === 'budget') return a.pricePerPerson - b.pricePerPerson;
        if (quickFilter === 'trending') return (b.bookingsCount ?? b.reviewCount ?? 0) - (a.bookingsCount ?? a.reviewCount ?? 0);
        if (quickFilter === 'highest_rated') return (b.rating ?? 0) - (a.rating ?? 0);
        if (quickFilter === 'near_me' && userCoords) {
          return departureCityDistance(a.departureLocation || '', userCoords[0], userCoords[1])
            - departureCityDistance(b.departureLocation || '', userCoords[0], userCoords[1]);
        }
        return 0;
      });
  }, [tours, search, cityFilter, filterState, quickFilter, userCoords]);

  const visibleTours = displayedTours.slice(0, visibleCount);
  const isFilterActive = filterState.difficulties.length > 0 || filterState.maxDuration > 0 ||
    filterState.priceMin > 0 || filterState.priceMax < 2000;

  const handleBook = async (date: string, guests: number) => {
    if (!bookingTour) return;
    setIsBooking(true);
    try {
      const result = await tourAPI.bookTour(bookingTour.id || (bookingTour as any)._id!, { date, guests });
      const { groupTrip } = result;
      const itinerary: Itinerary = {
        id: groupTrip.baseItineraryId || bookingTour.id,
        title: bookingTour.title,
        city: bookingTour.departureLocation?.split(',')[0] || 'Saudi Arabia',
        places: [],
        estimatedDuration: bookingTour.totalDuration * 60,
        estimatedCost: bookingTour.pricePerPerson * guests,
      };
      const groupTripObj: GroupTrip = {
        id: groupTrip._id || groupTrip.id || Date.now().toString(),
        backendId: groupTrip._id || groupTrip.id,
        itinerary,
        members: [],
        chatMessages: [],
        expenses: [],
      };
      showToast(`Booking confirmed! You've joined the ${bookingTour.title} group!`, 'success');
      setBookingTour(null);
      setSelectedTour(null);
      onBookingComplete(itinerary, groupTripObj as any);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Booking failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsBooking(false);
    }
  };

  const CATEGORIES = [
    { id: 'all', label: t.catAll || 'All' },
    { id: 'Nature', label: t.catNature || 'Nature' },
    { id: 'Heritage', label: t.catHeritage || 'Heritage' },
    { id: 'Food', label: t.catFood || 'Food' },
    { id: 'Adventure', label: t.catDesert || 'Desert' },
    { id: 'Night', label: t.catNight || 'Night' },
  ];

  const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'new', label: ar ? '🆕 إضافات جديدة' : '🆕 New Listings', icon: null },
    { id: 'budget', label: t.filterBudget || (ar ? 'اقتصادي' : 'Budget'), icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'trending', label: t.filterTrending || (ar ? 'الأكثر شيوعاً' : 'Trending'), icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'highest_rated', label: ar ? 'الأعلى تقييماً' : 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'near_me', label: t.filterNearMe || (ar ? 'قريب مني' : 'Near Me'), icon: <Navigation className="w-3.5 h-3.5" /> },
  ];

  if (selectedTour) {
    return (
      <div className="h-full flex flex-col">
        <TourDetailScreen
          tour={selectedTour}
          onBack={() => setSelectedTour(null)}
          onBook={(tour) => setBookingTour(tour)}
          t={t}
          allTours={tours}
          onSelectTour={setSelectedTour}
        />
        {bookingTour && (
          <BookingModal
            tour={bookingTour}
            onClose={() => setBookingTour(null)}
            onConfirm={handleBook}
            isBooking={isBooking}
            lang={lang}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-navy-950 transition-colors duration-300">
      {showFilterPanel && (
        <FilterPanel
          filter={filterState}
          onChange={setFilterState}
          onClose={() => setShowFilterPanel(false)}
          lang={lang}
        />
      )}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-navy-900 dark:via-midnight dark:to-navy-950 px-6 pt-12 pb-20 overflow-hidden border-b border-slate-100 dark:border-white/5">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-oasis-spring/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-karam/5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-5 h-5 text-oasis-spring animate-pulse-soft" />
            <span className="text-slate-500 dark:text-moon text-[10px] font-black uppercase tracking-[0.2em]">{ar ? 'اكتشف المملكة العربية السعودية' : 'Discover Saudi Arabia'}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">
            {ar ? 'مغامرات مع مرشدين' : 'Guided Adventures'}
            <span className="block text-oasis-spring">{ar ? 'بعيون محلية' : 'through local eyes'}</span>
          </h1>
          <p className="text-slate-500 dark:text-moon text-sm leading-relaxed max-w-md mb-8">
            {ar ? 'جولات بإشراف خبراء عبر المملكة — احجز مقعدك وانضم إلى دردشة جماعية مع المسافرين.' : 'Expert-led tours across the Kingdom — book your spot and join a group chat with fellow travellers.'}
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">50+</p>
              <p className="text-[10px] text-slate-400 dark:text-dusk font-bold uppercase tracking-wider">{ar ? 'جولة متاحة' : 'Tours available'}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-karam">4.8★</p>
              <p className="text-[10px] text-slate-400 dark:text-dusk font-bold uppercase tracking-wider">{ar ? 'متوسط التقييم' : 'Avg. rating'}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">1.2k</p>
              <p className="text-[10px] text-slate-400 dark:text-dusk font-bold uppercase tracking-wider">{ar ? 'مسافر سعيد' : 'Happy travellers'}</p>
            </div>
            {savedIds.size > 0 && (
              <div>
                <p className="text-2xl font-black text-oasis-spring">{savedIds.size}</p>
                <p className="text-[10px] text-slate-400 dark:text-dusk font-bold uppercase tracking-wider">{ar ? 'محفوظة' : 'Saved'}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => document.getElementById('tours-list')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-oasis-spring text-midnight font-black text-sm rounded-2xl active:scale-95 transition-all shadow-mint-glow"
            >
              {ar ? 'تصفح الجولات ←' : 'Browse Tours →'}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'ai_planner' }))}
              className="px-8 py-4 bg-slate-50 dark:bg-navy-900 text-slate-900 dark:text-white font-black text-sm rounded-2xl active:scale-95 transition-all border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-navy-800"
            >
              ✨ {ar ? 'المخطط الذكي' : 'AI Planner'}
            </button>
          </div>
        </div>
      </div>

      {/* Featured slideshow */}
      {slideshowItems.length > 0 && (
        <FeaturedSlideshow
          items={slideshowItems}
          height="h-56"
          onSelect={id => {
            const tour = tours.find(t => (t.id || (t as any)._id) === id) ?? null;
            if (tour) setSelectedTour(tour);
          }}
          lang={lang}
        />
      )}

      {/* Recently Added */}
      {recentlyAddedTours.length > 0 && (
        <div className="bg-white dark:bg-navy-950 pt-6 pb-4">
          <div className="flex items-center justify-between px-6 mb-4">
            <div>
              <h2 className="font-black text-lg text-slate-900 dark:text-white">✨ {ar ? 'أُضيفت مؤخراً' : 'Recently Added'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-500">{ar ? 'جولات جديدة من مرشدين محليين' : 'New tours by local hosts'}</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-2">
            {recentlyAddedTours.map(tour => {
              const tourId = tour.id || (tour as any)._id || '';
              return (
                <button
                  key={tourId}
                  onClick={() => setSelectedTour(tour)}
                  className="flex-shrink-0 w-48 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl bg-slate-50 dark:bg-navy-900 active:scale-95 transition-all"
                >
                  <div className="relative h-28">
                    <SafeImage src={tour.heroImage} alt={tour.title} className="w-full h-full object-cover" fallbackType="placeholder" seed={tour.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-midnight/80 to-transparent" />
                    <span className="absolute top-2 left-2 bg-oasis-spring text-midnight text-[8px] font-black px-2 py-0.5 rounded-full shadow-mint-glow">NEW</span>
                  </div>
                  <div className="p-3 text-left">
                    <p className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 leading-tight mb-2">{tour.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-oasis-spring uppercase">SAR {tour.pricePerPerson}</p>
                      <div className="flex items-center gap-0.5 text-[10px] text-karam">
                        <Star className="w-2.5 h-2.5 fill-karam" />
                        <span>{tour.rating || 'New'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div id="tours-list" className="bg-white dark:bg-navy-950 px-6 pt-6 pb-2 border-b border-slate-100 dark:border-white/5 sticky top-0 z-30">
        <div className="relative group max-w-4xl mx-auto">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${searchFocused ? 'text-oasis-spring' : 'text-slate-400 dark:text-moon/40'}`} />
          <input
            type="text"
            placeholder={ar ? 'ابحث عن جولات، مرشدين، معالم…' : 'Search tours, guides, highlights…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full pl-11 pr-11 py-4 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-moon/30 outline-none focus:ring-1 focus:ring-oasis-spring/30 focus:bg-white dark:focus:bg-lifted transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-moon/40 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: filter + saved count + view toggle */}
      <div className="bg-white dark:bg-navy-950 px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
        <button
          onClick={() => setShowFilterPanel(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isFilterActive ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow' : 'bg-slate-50 dark:bg-navy-900 text-slate-500 dark:text-moon border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-lifted hover:text-slate-900 dark:hover:text-white' }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          {ar ? 'فلتر' : 'Filter'}
          {isFilterActive && <span className="w-1.5 h-1.5 rounded-full bg-midnight" />}
        </button>

        {savedIds.size > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-wider animate-in fade-in">
            <Bookmark className="w-2.5 h-2.5 fill-red-400" />
            {savedIds.size} {ar ? 'محفوظة' : 'saved'}
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto bg-slate-100 dark:bg-navy-800 p-1 rounded-xl border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-oasis-spring text-midnight shadow-sm dark:shadow-black/30' : 'text-slate-400 dark:text-moon/40 hover:text-slate-600 dark:hover:text-moon'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-oasis-spring text-midnight shadow-sm dark:shadow-black/30' : 'text-slate-400 dark:text-moon/40 hover:text-slate-600 dark:hover:text-moon'}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* City pills */}
      <div className="bg-white dark:bg-navy-950 px-6 py-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TOUR_CITY_PILLS.map(city => (
            <button
              key={city.en}
              onClick={() => setCityFilter(city.en)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${cityFilter === city.en ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-slate-50 dark:bg-navy-900 text-slate-500 dark:text-moon border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:border-white/10' }`}
            >
              {ar ? city.ar : city.en}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills + quick filters */}
      <div className="sticky top-[73px] z-20 bg-white/80 dark:bg-midnight/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 shadow-xl">
        <div className="relative px-6 pt-4 pb-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 ${category === cat.id ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-slate-50 dark:bg-navy-900 text-slate-500 dark:text-moon border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-lifted' }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${quickFilter === f.id ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow' : 'bg-slate-50 dark:bg-navy-900 text-slate-500 dark:text-moon border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-lifted hover:text-slate-900 dark:hover:text-white' }`}
              >
                {f.icon}
                {f.id === 'near_me' && locating ? (ar ? 'جارٍ التحديد…' : 'Locating…') : f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Offline banner */}
      {hasNetworkError && !isLoading && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 animate-in fade-in">
          <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs font-bold text-amber-200">Check your connection</p>
          <button
            onClick={() => {
              setHasNetworkError(false);
              setIsLoading(true);
              tourAPI.getTours().then(d => setTours(d)).catch(() => setHasNetworkError(true)).finally(() => setIsLoading(false));
            }}
            className="ml-auto text-xs font-black text-amber-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tours list */}
      <div className="px-4 py-5 max-w-5xl mx-auto">
        {isLoading ? (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {(search || quickFilter || category !== 'all' || cityFilter !== 'All Cities' || isFilterActive) && (
              <p className="text-[10px] text-moon font-black uppercase tracking-widest mb-3">
                {displayedTours.length === 0 ? 'No tours found' : `${displayedTours.length} tour${displayedTours.length !== 1 ? 's' : ''} found`}
                {search && <span className="text-moon/40 lowercase tracking-normal"> for "<span className="text-oasis-spring">{search}</span>"</span>}
              </p>
            )}
            {displayedTours.length === 0 ? (
              <div className="text-center py-16 animate-in fade-in bg-slate-50 dark:bg-chamber/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/5">
                <Compass className="w-12 h-12 text-slate-300 dark:text-moon/20 mx-auto mb-3" />
                <h3 className="font-black text-slate-900 dark:text-white text-lg mb-1">No tours found</h3>
                <p className="text-slate-500 dark:text-moon/40 text-sm">Try a different category or adjust your filters.</p>
                <button
                  onClick={() => { setCategory('all'); setCityFilter('All Cities'); setFilterState(DEFAULT_FILTER); setSearch(''); setQuickFilter(null); }}
                  className="mt-4 px-6 py-3 bg-slate-100 dark:bg-lifted text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-black text-sm hover:bg-white dark:hover:bg-navy-900 hover:text-midnight transition-all active:scale-95"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                  {visibleTours.map((tour) => (
                    <TourCard
                      key={tour.id || (tour as any)._id}
                      tour={tour}
                      onSelect={setSelectedTour}
                      saved={savedIds.has(tour.id || (tour as any)._id || '')}
                      onToggleSave={handleToggleSave}
                      viewMode={viewMode}
                      t={t}
                    />
                  ))}
                </div>
                {visibleCount < displayedTours.length && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 6)}
                    className="px-8 py-4 bg-slate-50 dark:bg-chamber border border-slate-100 dark:border-white/10 text-slate-500 dark:text-moon font-black text-sm rounded-2xl hover:bg-slate-100 dark:hover:bg-lifted hover:text-slate-900 dark:hover:text-white transition-all shadow-xl active:scale-95"
                    >
                      Load more ({displayedTours.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
            {searchFocused && trendingItems.length > 0 && (
              <TrendingCards
                items={trendingItems}
                label="🔥 Trending Tours"
                onSelect={item => {
                  const tour = tours.find(t => (t.id || (t as any)._id) === item.id) ?? null;
                  if (tour) setSelectedTour(tour);
                }}
              />
            )}
          </>
        )}
      </div>

      {bookingTour && (
        <BookingModal
          tour={bookingTour}
          onClose={() => setBookingTour(null)}
          onConfirm={handleBook}
          isBooking={isBooking}
          lang={lang}
        />
      )}
    </div>
  );
};

// ==========================================
// Tour Card Component
// ==========================================
interface TourCardProps {
  t: any;
  tour: Tour;
  onSelect: (tour: Tour) => void;
  saved: boolean;
  onToggleSave: (id: string) => void;
  viewMode: 'grid' | 'list';
}

const TourCard: React.FC<TourCardProps> = ({ tour, onSelect, saved, onToggleSave, viewMode, t }) => {
  const diffLabels: Record<string, string> = {
    easy: t.diffEasy || 'Easy',
    moderate: t.diffModerate || 'Moderate',
    challenging: t.diffChallenging || 'Challenging',
  };
  const diffColor = DIFFICULTY_COLORS[tour.difficulty] || DIFFICULTY_COLORS.easy;
  const diffLabel = diffLabels[tour.difficulty] || diffLabels.easy;
  const tourId = tour.id || (tour as any)._id || '';
  const langShort = tour.language
    ? tour.language.replace('Arabic & English', 'AR+EN').replace('Arabic', 'AR').replace('English', 'EN')
    : null;

  if (viewMode === 'list') {
    return (
      <div
        className="bg-slate-50 dark:bg-chamber rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer flex active:scale-[0.98] group"
        onClick={() => onSelect(tour)}
      >
        <div className="relative w-36 flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-midnight">
          <SafeImage
            src={tour.heroImage}
            alt={tour.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            fallbackType="placeholder"
            seed={tour.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-midnight to-transparent opacity-60" />
          <span className={`absolute top-3 left-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${diffColor}`}>
            {diffLabel}
          </span>
        </div>
        <div className="flex-1 p-4 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-oasis-spring mb-1 block">{tour.category}</span>
                <h3 className="font-black text-slate-900 dark:text-white text-sm leading-tight line-clamp-2">{tour.title}</h3>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleSave(tourId); }}
                className="w-8 h-8 bg-slate-100/40 dark:bg-midnight/40 hover:bg-slate-200 dark:hover:bg-midnight rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-all border border-slate-200/5 dark:border-white/5"
              >
                <Bookmark className={`w-3.5 h-3.5 transition-colors ${saved ? 'text-waypoint fill-waypoint' : 'text-slate-400 dark:text-moon'}`} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-moon mt-2 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-oasis-spring/60" />{tour.totalDuration}h</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-oasis-spring/60" />{tour.departureLocation?.split(',')[0]}</span>
              {tour.rating != null && (
                <span className="flex items-center gap-1 text-karam font-black">
                  <Star className="w-3 h-3 fill-karam" />{tour.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <div>
              <span className="text-slate-900 dark:text-white font-black text-base">{tour.pricePerPerson === 0 ? 'Free' : tour.pricePerPerson.toLocaleString()}</span>
              {tour.pricePerPerson > 0 && <span className="text-[10px] text-slate-500 dark:text-moon ml-1 uppercase font-bold tracking-tighter">SAR</span>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onSelect(tour); }}
              className="flex items-center gap-1 px-4 py-2 bg-oasis-spring text-midnight text-[10px] font-black uppercase rounded-xl hover:shadow-mint-glow transition-all active:scale-95"
            >
              Details <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-50 dark:bg-chamber rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:-translate-y-1 transition-all cursor-pointer active:scale-[0.98] group"
      onClick={() => onSelect(tour)}
    >
      <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-midnight">
        <SafeImage
          src={tour.heroImage}
          alt={tour.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          fallbackType="placeholder"
          seed={tour.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-midnight via-transparent to-transparent opacity-80" />

        <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${diffColor}`}>
          {diffLabel}
        </span>

        <button
          onClick={e => { e.stopPropagation(); onToggleSave(tourId); }}
          className="absolute top-4 right-4 w-10 h-10 bg-white/40 dark:bg-midnight/40 backdrop-blur-md hover:bg-white dark:hover:bg-midnight rounded-full flex items-center justify-center shadow-2xl z-10 active:scale-90 transition-all border border-slate-200/20 dark:border-white/10"
        >
          <Bookmark className={`w-4 h-4 transition-colors ${saved ? 'text-waypoint fill-waypoint' : 'text-slate-600 dark:text-moon'}`} />
        </button>

        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          {tour.isCommunityOuting && (
            <span className="px-3 py-1 bg-blue-500 text-white text-[8px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-xl">
              👥 Community
            </span>
          )}
          {tour.organizerType === 'organized_tour' && (
            <span className="px-3 py-1 bg-purple-500 text-white text-[8px] font-black uppercase rounded-lg shadow-xl">
              🏢 Organized
            </span>
          )}
        </div>

        {tour.rating !== undefined && (
          <span className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-midnight/80 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-xl text-xs font-black text-karam shadow-2xl">
            <Star className="w-3.5 h-3.5 fill-karam" />
            {tour.rating.toFixed(1)}
          </span>
        )}

        {tour.spotsRemaining != null && tour.spotsRemaining <= 4 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="px-4 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-xl shadow-2xl animate-bounce">
              Only {tour.spotsRemaining} spots left!
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-oasis-spring">{tour.category}</span>
          {langShort && (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 dark:text-moon bg-slate-100 dark:bg-midnight px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 uppercase tracking-wider">
              <Globe className="w-3 h-3" />
              {langShort}
            </span>
          )}
        </div>

        <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-4 group-hover:text-oasis-spring transition-colors">{tour.title}</h3>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-moon mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-oasis-spring/60" />
            {tour.totalDuration}h
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-oasis-spring/60" />
            Max {tour.maxGroupSize}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-oasis-spring/60" />
            {tour.departureLocation?.split(',')[0]}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{tour.pricePerPerson === 0 ? 'Free' : tour.pricePerPerson.toLocaleString()}</span>
              {tour.pricePerPerson > 0 && <span className="text-[10px] text-slate-500 dark:text-moon font-bold uppercase tracking-tighter">SAR</span>}
            </div>
            <span className="text-[9px] text-slate-400 dark:text-dusk font-bold uppercase tracking-widest mt-0.5">per person</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(tour); }}
            className="flex items-center gap-2 px-6 py-3 bg-oasis-spring text-midnight text-xs font-black uppercase rounded-2xl hover:shadow-mint-glow transition-all active:scale-95"
          >
            Explore
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};