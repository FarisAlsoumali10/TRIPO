// frontend/src/screens/ToursScreen.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, Clock, Users, ChevronRight, MapPin, Compass, TrendingUp, Award, Navigation,
  Wallet, Search, X, WifiOff, Bookmark, SlidersHorizontal, LayoutGrid, LayoutList, Globe,
} from 'lucide-react';
import { Tour, Itinerary, GroupTrip } from '../types';
import { tourAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { SkeletonCard } from '../components/ui';
import { TourDetailScreen } from './TourDetailScreen';
import { BookingModal } from '../components/BookingModal';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

// ==========================================
// Types & Constants
// ==========================================
type QuickFilter = 'budget' | 'trending' | 'highest_rated' | 'near_me' | null;

const TOUR_CITY_PILLS = ['All Cities', 'Riyadh', 'Jeddah', 'AlUla', 'Taif', 'Abha', 'Tabuk'];

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
  easy: 'bg-emerald-600 text-white',
  moderate: 'bg-amber-500 text-white',
  challenging: 'bg-red-600 text-white',
};

// ==========================================
// Filter Panel
// ==========================================
interface FilterPanelProps {
  filter: TourFilterState;
  onChange: (f: TourFilterState) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filter, onChange, onClose }) => {
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
    if (!active) return 'bg-white text-slate-600 border-slate-200 hover:border-slate-400';
    if (d === 'easy') return 'bg-emerald-600 text-white border-emerald-600';
    if (d === 'moderate') return 'bg-amber-500 text-white border-amber-500';
    return 'bg-red-600 text-white border-red-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end animate-in fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { onChange(local); onClose(); }} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-slate-900 text-base">Filter Tours</h2>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-800 mb-3">Price Range (SAR)</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Min</label>
              <input
                type="number"
                min={0}
                max={local.priceMax}
                value={local.priceMin}
                onChange={e => setLocal(prev => ({ ...prev, priceMin: Math.min(Number(e.target.value), prev.priceMax) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <span className="text-slate-400 pb-2">—</span>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Max</label>
              <input
                type="number"
                min={local.priceMin}
                max={5000}
                value={local.priceMax}
                onChange={e => setLocal(prev => ({ ...prev, priceMax: Math.max(Number(e.target.value), prev.priceMin) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-800 mb-3">Difficulty</p>
          <div className="flex gap-2 flex-wrap">
            {['easy', 'moderate', 'challenging'].map(d => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors border ${diffBtnClass(d, local.difficulties.includes(d))}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Max Duration */}
        <div className="mb-8">
          <p className="text-sm font-bold text-slate-800 mb-3">Max Duration</p>
          <div className="flex gap-2 flex-wrap">
            {[{ label: 'Any', val: 0 }, { label: '≤3h', val: 3 }, { label: '≤6h', val: 6 }, { label: '≤12h', val: 12 }].map(opt => (
              <button
                key={opt.val}
                onClick={() => setLocal(prev => ({ ...prev, maxDuration: opt.val }))}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-colors border ${local.maxDuration === opt.val
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={() => setLocal(DEFAULT_FILTER)}
            className="flex-1 py-3 border border-slate-300 rounded-2xl font-bold text-slate-600 text-sm hover:bg-slate-50 transition"
          >
            Clear All
          </button>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition"
          >
            Apply Filters
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
  onBookingComplete: (itinerary: Itinerary, groupTrip: GroupTrip) => void;
  initialTourId?: string;
  onTourOpened?: () => void;
}

export const ToursScreen: React.FC<ToursScreenProps> = ({ t, onBookingComplete, initialTourId, onTourOpened }) => {
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
    { id: 'budget', label: t.filterBudget || 'Budget', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'trending', label: t.filterTrending || 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'highest_rated', label: 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'near_me', label: t.filterNearMe || 'Near Me', icon: <Navigation className="w-3.5 h-3.5" /> },
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
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      {showFilterPanel && (
        <FilterPanel
          filter={filterState}
          onChange={setFilterState}
          onClose={() => setShowFilterPanel(false)}
        />
      )}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-700 via-teal-600 to-emerald-800 px-6 pt-10 pb-16 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-12 right-4 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-6 h-6 text-emerald-200" />
            <span className="text-emerald-200 text-sm font-bold uppercase tracking-widest">Discover Saudi Arabia</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">Guided Adventures</h1>
          <p className="text-emerald-100 text-sm leading-relaxed max-w-xs">
            Expert-led tours across the Kingdom — book your spot and join a group chat with fellow travellers.
          </p>
          <div className="flex items-center gap-5 mt-5">
            <div>
              <p className="text-xl font-extrabold text-white">50+</p>
              <p className="text-xs text-emerald-200">Tours available</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xl font-extrabold text-white">4.8★</p>
              <p className="text-xs text-emerald-200">Avg. rating</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-xl font-extrabold text-white">1200+</p>
              <p className="text-xs text-emerald-200">Happy travellers</p>
            </div>
            {savedIds.size > 0 && (
              <>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-xl font-extrabold text-white">{savedIds.size}</p>
                  <p className="text-xs text-emerald-200">Saved</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Featured slideshow */}
      {slideshowItems.length > 0 && (
        <FeaturedSlideshow
          items={slideshowItems}
          height="h-56"
          onPress={item => {
            const tour = tours.find(t => (t.id || (t as any)._id) === item.id) ?? null;
            if (tour) setSelectedTour(tour);
          }}
        />
      )}

      {/* Search bar */}
      <div className="bg-white px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tours, guides, highlights…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: filter + saved count + view toggle */}
      <div className="bg-white px-4 py-2 border-b border-slate-100 flex items-center gap-2">
        <button
          onClick={() => setShowFilterPanel(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors flex-shrink-0 ${isFilterActive
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
            }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter
          {isFilterActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>

        {savedIds.size > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold flex-shrink-0 animate-in fade-in">
            <Bookmark className="w-3 h-3 fill-rose-500" />
            {savedIds.size} saved
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* City pills */}
      <div className="bg-white px-4 py-2 border-b border-slate-100">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TOUR_CITY_PILLS.map(city => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${cityFilter === city
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills + quick filters */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="relative px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${category === cat.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
        <div className="relative px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${quickFilter === f.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
              >
                {f.icon}
                {f.id === 'near_me' && locating ? 'Locating…' : f.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {/* Offline banner */}
      {hasNetworkError && !isLoading && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 animate-in fade-in">
          <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">Check your connection</p>
          <button
            onClick={() => {
              setHasNetworkError(false);
              setIsLoading(true);
              tourAPI.getTours().then(d => setTours(d)).catch(() => setHasNetworkError(true)).finally(() => setIsLoading(false));
            }}
            className="ml-auto text-xs font-bold text-amber-700 hover:underline"
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
              <p className="text-xs text-slate-500 mb-3 font-medium">
                {displayedTours.length === 0 ? 'No tours found' : `${displayedTours.length} tour${displayedTours.length !== 1 ? 's' : ''} found`}
                {search && <span className="text-slate-400"> for "<span className="text-slate-600">{search}</span>"</span>}
              </p>
            )}
            {displayedTours.length === 0 ? (
              <div className="text-center py-16 animate-in fade-in">
                <Compass className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-lg mb-1">No tours found</h3>
                <p className="text-slate-400 text-sm">Try a different category or adjust your filters.</p>
                <button
                  onClick={() => { setCategory('all'); setCityFilter('All Cities'); setFilterState(DEFAULT_FILTER); setSearch(''); setQuickFilter(null); }}
                  className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
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
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 6)}
                      className="px-6 py-2.5 bg-white border border-emerald-200 text-emerald-700 font-bold text-sm rounded-2xl hover:bg-emerald-50 transition-colors shadow-sm"
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
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer flex active:scale-[0.99]"
        onClick={() => onSelect(tour)}
      >
        <div className="relative w-28 flex-shrink-0 overflow-hidden bg-slate-100">
          {tour.heroImage ? (
            <img
              src={tour.heroImage}
              alt={tour.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'; }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Compass className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <span className={`absolute top-2 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${diffColor}`}>
            {diffLabel}
          </span>
          {tour.spotsRemaining != null && tour.spotsRemaining <= 4 && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-red-500/90 text-white text-[8px] font-extrabold rounded-full">
              {tour.spotsRemaining} left
            </span>
          )}
        </div>
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">{tour.category}</span>
                <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{tour.title}</h3>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleSave(tourId); }}
                className="w-7 h-7 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
              </button>
            </div>
            {tour.tags && tour.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {tour.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{tour.totalDuration}h</span>
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{tour.departureLocation?.split(',')[0]}</span>
              {tour.rating != null && (
                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />{tour.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-emerald-700 font-extrabold text-sm">{tour.pricePerPerson === 0 ? 'مجاني' : tour.pricePerPerson.toLocaleString()}</span>
              {tour.pricePerPerson > 0 && <span className="text-[10px] text-slate-400 ml-0.5">SAR</span>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onSelect(tour); }}
              className="flex items-center gap-0.5 px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors active:scale-95"
            >
              View <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer active:scale-[0.99]"
      onClick={() => onSelect(tour)}
    >
      <div className="relative h-48 overflow-hidden bg-slate-100">
        {tour.heroImage ? (
          <img
            src={tour.heroImage}
            alt={tour.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80';
            }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Compass className="w-12 h-12 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${diffColor}`}>
          {diffLabel}
        </span>

        <button
          onClick={e => { e.stopPropagation(); onToggleSave(tourId); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center shadow-sm z-10 active:scale-90 transition-all"
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'text-rose-500 fill-rose-500' : 'text-slate-600'}`} />
        </button>

        <div className="absolute bottom-3 left-3 flex flex-col gap-1">
          {tour.isCommunityOuting && (
            <span className="px-2 py-0.5 bg-blue-500/90 text-white text-[9px] font-extrabold rounded-full flex items-center gap-1 drop-shadow-sm">
              👥 تجمع مجتمعي
            </span>
          )}
          {tour.organizerType === 'organized_tour' && (
            <span className="px-2 py-0.5 bg-purple-500/90 text-white text-[9px] font-extrabold rounded-full drop-shadow-sm">
              🏢 رحلة منظمة
            </span>
          )}
          {tour.organizerType === 'guide_led' && (
            <span className="px-2 py-0.5 bg-teal-500/90 text-white text-[9px] font-extrabold rounded-full drop-shadow-sm">
              🧭 مرشد سياحي
            </span>
          )}
          {tour.hasAppDiscount && tour.appPrice && (
            <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-[9px] font-extrabold rounded-full drop-shadow-sm">
              🏷️ سعر التطبيق أوفر!
            </span>
          )}
        </div>

        {tour.rating !== undefined && (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-white/95 rounded-full text-xs font-bold text-slate-800 shadow">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            {tour.rating.toFixed(1)}
          </span>
        )}

        {tour.spotsRemaining != null && tour.spotsRemaining <= 4 && (
          <span className="absolute bottom-3 left-3 px-2.5 py-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-extrabold rounded-full shadow">
            Only {tour.spotsRemaining} spot{tour.spotsRemaining !== 1 ? 's' : ''} left!
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{tour.category}</span>
          {langShort && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              <Globe className="w-2.5 h-2.5" />
              {langShort}
            </span>
          )}
        </div>

        <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5 mb-2">{tour.title}</h3>

        {tour.tags && tour.tags.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {tour.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {tour.totalDuration}h
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            Max {tour.maxGroupSize}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {tour.departureLocation?.split(',')[0]}
          </span>
        </div>

        {tour.organizer && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-700 flex items-center gap-1 truncate">
                {tour.organizer.name}
                {tour.organizer.isVerified && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black shrink-0">
                    ✓ موثّق
                  </span>
                )}
                {tour.organizer.isAccredited && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black shrink-0">
                    🏅 معتمد
                  </span>
                )}
              </p>
              {tour.organizer.tripsCount && (
                <p className="text-[9px] text-slate-400">{tour.organizer.tripsCount}+ رحلة</p>
              )}
            </div>
          </div>
        )}

        {tour.isCommunityOuting && tour.currentParticipants != null && (
          <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <p className="text-[10px] text-blue-700 font-black">
              👥 {tour.currentParticipants} انضموا بالفعل
            </p>
            {tour.spotsRemaining != null && (
              <p className="text-[9px] text-blue-500">{tour.spotsRemaining} مقعد متبقٍّ</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              {tour.hasAppDiscount && tour.appPrice ? (
                <>
                  <span className="text-2xl font-extrabold text-emerald-700">{tour.appPrice.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 line-through ml-1">{tour.pricePerPerson.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-medium">SAR</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-extrabold text-emerald-700">{tour.pricePerPerson === 0 ? 'مجاني' : tour.pricePerPerson.toLocaleString()}</span>
                  {tour.pricePerPerson > 0 && <span className="text-xs text-slate-400 font-medium">SAR</span>}
                </>
              )}
            </div>
            {tour.pricePerPerson > 0 && <span className="text-[10px] text-slate-400">per person</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(tour); }}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors active:scale-95"
          >
            View Trip
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};