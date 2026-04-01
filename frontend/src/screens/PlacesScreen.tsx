import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Star, Search, X, TrendingUp, Award, Navigation, Wallet, WifiOff } from 'lucide-react';
import { Place } from '../types/index';
import { placeAPI } from '../services/api';
import { MOCK_PLACES } from './HomeScreen';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { SkeletonCard } from '../components/ui';
import { showToast } from '../components/Toast';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

const CATEGORY_KEYS = ['All', 'Nature', 'Heritage', 'Adventure', 'Food', 'Urban', 'Beach', 'Desert', 'Cultural'];

type QuickFilter = 'budget' | 'trending' | 'highest_rated' | 'near_me' | null;

const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925], mecca: [21.3891, 39.8579],
  medina: [24.5247, 39.5692], dammam: [26.4207, 50.0888], alula: [26.6081, 37.9162],
  taif: [21.2739, 40.4062], hail: [27.5114, 41.7208], abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715], yanbu: [24.0894, 38.0618], khobar: [26.2172, 50.1971],
  najran: [17.4930, 44.1277], jizan: [16.8892, 42.5611], al_ula: [26.6081, 37.9162],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cityDistanceKm(cityName: string, userLat: number, userLon: number): number {
  const key = cityName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const exact = CITY_COORDS[key] || CITY_COORDS[cityName.toLowerCase()];
  if (exact) return haversineKm(userLat, userLon, exact[0], exact[1]);
  for (const [k, coords] of Object.entries(CITY_COORDS)) {
    if (cityName.toLowerCase().includes(k.replace(/_/g, ' '))) return haversineKm(userLat, userLon, coords[0], coords[1]);
  }
  return 9999;
}

export const PlacesScreen = ({ t, initialPlaceId, onPlaceOpened }: { t: any; initialPlaceId?: string; onPlaceOpened?: () => void }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    placeAPI.getPlaces()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setPlaces(list.length > 0 ? list : MOCK_PLACES);
      })
      .catch(() => { setPlaces(MOCK_PLACES); setHasNetworkError(true); })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (initialPlaceId && places.length > 0) {
      const place = places.find(p => (p.id || p._id) === initialPlaceId) ?? null;
      if (place) { setSelectedPlace(place); onPlaceOpened?.(); }
    }
  }, [initialPlaceId, places]);

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

  const filtered = places
    .filter(p => {
      const matchCat = category === 'All' ||
        p.categoryTags?.some(tag => tag.toLowerCase().includes(category.toLowerCase())) ||
        p.category?.toLowerCase().includes(category.toLowerCase());
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (quickFilter === 'highest_rated') return (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0);
      if (quickFilter === 'trending') return (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0);
      if (quickFilter === 'budget') return ((a as any).entryFee ?? (a as any).priceRange ?? 0) - ((b as any).entryFee ?? (b as any).priceRange ?? 0);
      if (quickFilter === 'near_me' && userCoords) {
        const dA = cityDistanceKm(a.city || '', userCoords[0], userCoords[1]);
        const dB = cityDistanceKm(b.city || '', userCoords[0], userCoords[1]);
        return dA - dB;
      }
      return 0;
    });

  const trendingItems: TrendingItem[] = useMemo(() =>
    [...places]
      .sort((a, b) => (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0))
      .slice(0, 8)
      .filter(p => p.photos?.[0] || p.image)
      .map(p => ({
        id: p.id || p._id || '',
        image: p.photos?.[0] || p.image || '',
        name: p.name,
        subtitle: p.city || 'Saudi Arabia',
        badge: p.categoryTags?.[0] || 'Place',
        badgeColor: '#0d9488',
        rating: p.ratingSummary?.avgRating ?? p.rating,
      })),
  [places]);

  const slideshowItems: SlideItem[] = useMemo(() =>
    [...places]
      .sort((a, b) => (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0))
      .slice(0, 8)
      .filter(p => p.photos?.[0] || p.image)
      .map(p => ({
        id: p.id || p._id || '',
        type: 'place' as const,
        name: p.name,
        image: p.photos?.[0] || p.image || '',
        subtitle: p.city || 'Saudi Arabia',
        rating: p.ratingSummary?.avgRating ?? p.rating,
        badge: p.categoryTags?.[0] || 'Place',
        badgeColor: '#0d9488',
      })),
  [places]);

  const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'budget', label: t.filterBudget || 'Budget', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'trending', label: t.filterTrending || 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'highest_rated', label: t.filterTopRated || 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'near_me', label: locating ? (t.filterLocating || 'Locating…') : (t.filterNearMe || 'Near Me'), icon: <Navigation className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 pb-3">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-slate-900">{t.placesTitle || 'Places'}</h1>
          <p className="text-sm text-slate-500">{places.length} {t.placesSubtitle || 'spots in Saudi Arabia'}</p>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.placesSearch || 'Search by name or city...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick filter pills */}
        <div className="relative mb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => handleQuickFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                quickFilter === f.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>

        {/* Category Pills */}
        <div className="relative">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_KEYS.map(cat => {
            const catLabels: Record<string, string> = {
              All: t.catAll || 'All', Nature: t.catNature || 'Nature',
              Heritage: t.catHeritage || 'Heritage', Adventure: t.catAdventure || 'Adventure',
              Food: t.catFood || 'Food', Urban: t.catUrban || 'Urban',
              Beach: t.catBeach || 'Beach', Desert: t.catDesert || 'Desert',
              Cultural: t.catCultural || 'Cultural',
            };
            return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {catLabels[cat] || cat}
            </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {/* Featured slideshow */}
      {slideshowItems.length > 0 && (
        <FeaturedSlideshow
          items={slideshowItems}
          height="h-56"
          onPress={item => {
            const place = places.find(p => (p.id || p._id) === item.id) ?? null;
            if (place) setSelectedPlace(place);
          }}
        />
      )}

      {/* Network error banner */}
      {hasNetworkError && !isLoading && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs font-medium text-amber-700">Showing cached results — check your connection</p>
          <button
            onClick={() => { setHasNetworkError(false); setIsLoading(true); placeAPI.getPlaces().then(data => { const list = Array.isArray(data) ? data : []; setPlaces(list.length > 0 ? list : MOCK_PLACES); }).catch(() => { setPlaces(MOCK_PLACES); setHasNetworkError(true); }).finally(() => setIsLoading(false)); }}
            className="ml-auto text-xs font-bold text-amber-700 underline"
          >Retry</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {(search || quickFilter || category !== 'All') && (
              <p className="text-xs text-slate-500 mb-3 font-medium">
                {filtered.length === 0 ? 'No places found' : `${filtered.length} place${filtered.length !== 1 ? 's' : ''} found`}
                {search && <span className="text-slate-400"> for "<span className="text-slate-600">{search}</span>"</span>}
              </p>
            )}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MapPin className="w-12 h-12 text-slate-200 mb-3" />
                <p className="font-semibold text-slate-500 text-sm">{t.noPlacesFound || 'No places found'}</p>
                <p className="text-slate-400 text-xs mt-1">{t.tryDifferentSearch || 'Try a different category or search term'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(place => {
                  const img = place.photos?.[0] || place.image;
                  const rating = place.ratingSummary?.avgRating ?? place.rating;
                  return (
                    <button
                      key={place._id || place.id}
                      onClick={() => setSelectedPlace(place)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                    >
                      <div className="h-36 bg-slate-200 relative overflow-hidden">
                        {img ? (
                          <img
                            src={img}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            alt={place.name}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                        {rating && (
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
                          </div>
                        )}
                        {place.categoryTags?.[0] && (
                          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {place.categoryTags[0]}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{place.city || 'Saudi Arabia'}</span>
                        </p>
                        {place.ratingSummary?.reviewCount != null && (
                          <p className="text-xs text-slate-400 mt-0.5">{place.ratingSummary.reviewCount} {t.reviewsCount || 'reviews'}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {searchFocused && trendingItems.length > 0 && (
              <TrendingCards
                items={trendingItems}
                label={t.trendingPlaces || '🔥 Trending Places'}
                onSelect={item => {
                  const place = places.find(p => (p.id || p._id) === item.id) ?? null;
                  if (place) setSelectedPlace(place);
                }}
              />
            )}
          </>
        )}
      </div>

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          t={t}
          mode="page"
          allPlaces={places}
          onSwitchPlace={(p) => setSelectedPlace(p)}
        />
      )}
    </div>
  );
};
