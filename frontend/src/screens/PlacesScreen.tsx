import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin, Star, Search, X, TrendingUp, Award, Navigation, Wallet, WifiOff,
  SlidersHorizontal, Bookmark, LayoutGrid, List, Map as MapIcon,
  Shuffle, CheckCheck, FolderPlus, Plus, Clock,
} from 'lucide-react';
import { Place } from '../types/index';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api';
import { SkeletonCard, SafeImage } from '../components/ui';
import { showToast } from '../components/Toast';
import { isOpenNow, getPriceLevel, formatDuration } from '../utils/placeHelpers';

import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

const TripMap = React.lazy(() => import('../components/TripMap'));

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORY_KEYS = ['All', 'Nature', 'Heritage', 'Adventure', 'Food', 'Urban', 'Beach', 'Desert', 'Cultural'];
const CITY_LIST = ['All', 'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'AlUla', 'Abha', 'Dammam', 'Taif', 'Yanbu'];
const CITY_LIST_AR: Record<string, string> = {
  All: 'الكل', Riyadh: 'الرياض', Jeddah: 'جدة', Mecca: 'مكة', Medina: 'المدينة',
  AlUla: 'العُلا', Abha: 'أبها', Dammam: 'الدمام', Taif: 'الطائف', Yanbu: 'ينبع',
};

const PRICE_LEVEL_OPTIONS = [
  { v: 0, l: 'Any' }, { v: 1, l: 'Free' }, { v: 2, l: '$ Budget' },
  { v: 3, l: '$$ Mid' }, { v: 4, l: '$$$ Premium' },
];
const SEASON_OPTIONS = [
  { v: 'All', emoji: '🗓' }, { v: 'spring', emoji: '🌸' },
  { v: 'summer', emoji: '☀️' }, { v: 'autumn', emoji: '🍂' }, { v: 'winter', emoji: '❄️' },
];
const ACCESSIBILITY_OPTIONS = [
  { k: 'wheelchair' as const, icon: '♿', l: 'Wheelchair' },
  { k: 'family' as const, icon: '👨👩👧', l: 'Family' },
  { k: 'parking' as const, icon: '🅿', l: 'Parking' },
];

const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925], mecca: [21.3891, 39.8579],
  medina: [24.5247, 39.5692], dammam: [26.4207, 50.0888], alula: [26.6081, 37.9162],
  taif: [21.2739, 40.4062], hail: [27.5114, 41.7208], abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715], yanbu: [24.0894, 38.0618], khobar: [26.2172, 50.1971],
  najran: [17.4930, 44.1277], jizan: [16.8892, 42.5611], al_ula: [26.6081, 37.9162],
};

type QuickFilter = 'budget' | 'trending' | 'highest_rated' | 'near_me' | 'open_now' | 'family';
type ViewMode = 'grid' | 'list' | 'map';

interface Trip { id: string; name: string; placeIds: string[]; }

interface PlaceFilterState {
  priceLevel: number; season: string;
  wheelchair: boolean; family: boolean; parking: boolean;
}

const DEFAULT_PLACE_FILTER: PlaceFilterState = {
  priceLevel: 0, season: 'All', wheelchair: false, family: false, parking: false,
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cityDistanceKm(cityName: string, userLat: number, userLon: number): number {
  const key = cityName.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const exact = CITY_COORDS[key] ?? CITY_COORDS[cityName.toLowerCase()];
  if (exact) return haversineKm(userLat, userLon, exact[0], exact[1]);
  for (const [k, coords] of Object.entries(CITY_COORDS)) {
    if (cityName.toLowerCase().includes(k.replace(/_/g, ' '))) return haversineKm(userLat, userLon, coords[0], coords[1]);
  }
  return 9999;
}

function formatDistance(km: number): string {
  if (km >= 9999) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

function getPlaceId(p: Place): string { return p._id || p.id || ''; }

function countActiveFilters(f: PlaceFilterState): number {
  return [f.priceLevel > 0, f.season !== 'All', f.wheelchair || f.family || f.parking].filter(Boolean).length;
}

function toggleLocalSet(key: string, id: string, currentSet: Set<string>): Set<string> {
  const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  const updated = currentSet.has(id) ? list.filter(x => x !== id) : [...list, id];
  localStorage.setItem(key, JSON.stringify(updated));
  return new Set<string>(updated);
}

function readLocalSet(key: string): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set<string>(); }
}

// ── AddToTripModal ─────────────────────────────────────────────────────────────
const AddToTripModal = ({ placeId, placeName, onClose, trips, onTripsChange }: {
  placeId: string; placeName: string; onClose: () => void;
  trips: Trip[]; onTripsChange: (t: Trip[]) => void;
}) => {
  const [newTripName, setNewTripName] = useState('');
  const [addingNew, setAddingNew] = useState(trips.length === 0);

  const saveTrips = (updated: Trip[]) => {
    localStorage.setItem('tripo_custom_trips', JSON.stringify(updated));
    onTripsChange(updated);
    onClose();
  };

  const addToTrip = (tripId: string) => {
    saveTrips(trips.map(t =>
      t.id === tripId && !t.placeIds.includes(placeId)
        ? { ...t, placeIds: [...t.placeIds, placeId] } : t
    ));
    showToast('Added to trip!', 'success');
  };

  const createTrip = () => {
    if (!newTripName.trim()) return;
    const newTrip: Trip = { id: Date.now().toString(), name: newTripName.trim(), placeIds: [placeId] };
    saveTrips([...trips, newTrip]);
    showToast(`Added to "${newTrip.name}"!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-chamber w-full max-w-lg rounded-t-3xl shadow-2xl p-5 pb-8 border border-white/10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-oasis-spring/10 rounded-xl flex items-center justify-center">
              <FolderPlus className="w-4 h-4 text-oasis-spring" />
            </div>
            <h3 className="font-black text-white text-lg">Add to Trip</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-lifted transition-colors">
            <X className="w-4 h-4 text-moon" />
          </button>
        </div>
        <p className="text-xs text-moon mb-4">
          Adding: <span className="font-black text-oasis-spring">{placeName}</span>
        </p>

        {trips.length > 0 && !addingNew && (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {trips.map(trip => {
              const alreadyIn = trip.placeIds.includes(placeId);
              return (
                <button key={trip.id} onClick={() => !alreadyIn && addToTrip(trip.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left ${alreadyIn ? 'border-oasis-spring/30 bg-oasis-spring/10 cursor-default' : 'border-white/10 hover:border-oasis-spring/50 hover:bg-oasis-spring/5'}`}>
                  <div>
                    <p className="font-black text-sm text-white">{trip.name}</p>
                    <p className="text-xs text-moon">{trip.placeIds.length} place{trip.placeIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  {alreadyIn
                    ? <CheckCheck className="w-4 h-4 text-oasis-spring flex-shrink-0" />
                    : <Plus className="w-4 h-4 text-moon flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {addingNew ? (
          <div className="space-y-2">
            <input
              autoFocus value={newTripName} onChange={e => setNewTripName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTrip()}
              placeholder="Trip name (e.g. Weekend in Jeddah)"
              className="w-full px-4 py-3 bg-lifted border border-white/10 rounded-2xl text-sm text-white placeholder-moon/40 focus:outline-none focus:ring-2 focus:ring-oasis-spring/40"
            />
            <div className="flex gap-2">
              {trips.length > 0 && (
                <button onClick={() => setAddingNew(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-sm font-black text-moon hover:bg-lifted transition-colors">
                  Back
                </button>
              )}
              <button onClick={createTrip} disabled={!newTripName.trim()}
                className="flex-1 py-3 rounded-2xl bg-oasis-spring text-midnight text-sm font-black disabled:opacity-40 hover:brightness-110 transition-all">
                Create &amp; Add
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingNew(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/10 text-sm font-black text-moon hover:border-oasis-spring/50 hover:text-oasis-spring transition-colors">
            <FolderPlus className="w-4 h-4" /> New Trip
          </button>
        )}
      </div>
    </div>
  );
};

// ── Filter Panel ──────────────────────────────────────────────────────────────
const PlaceFilterPanel = ({ open, onClose, filters, onChange, categories, onCategoriesChange, lang }: {
  open: boolean; onClose: () => void;
  filters: PlaceFilterState; onChange: (f: PlaceFilterState) => void;
  categories: Set<string>; onCategoriesChange: (c: Set<string>) => void;
  lang?: 'en' | 'ar';
}) => {
  const ar = lang === 'ar';
  const [local, setLocal] = useState<PlaceFilterState>(filters);
  const [localCats, setLocalCats] = useState<Set<string>>(categories);
  useEffect(() => { if (open) { setLocal(filters); setLocalCats(new Set(categories)); } }, [open, filters, categories]);

  const activeCount = countActiveFilters(local) + localCats.size;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-chamber w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[82vh] flex flex-col border border-white/10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-oasis-spring/10 rounded-xl flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-oasis-spring" />
            </div>
            <h3 className="font-black text-white text-lg">{ar ? 'الفلاتر' : 'Filters'}</h3>
            {activeCount > 0 && (
              <span className="bg-oasis-spring text-midnight text-xs font-black px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-lifted transition-colors">
            <X className="w-5 h-5 text-moon" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">
          {/* Categories */}
          <div>
            <p className="text-[10px] font-black text-moon uppercase tracking-[0.2em] mb-3">{ar ? 'التصنيفات' : 'Categories'}</p>
            <div className="flex gap-2 flex-wrap">
              {CATEGORY_KEYS.filter(c => c !== 'All').map(cat => {
                const catLabelAr: Record<string, string> = {
                  Nature: 'طبيعة', Heritage: 'تراث', Adventure: 'مغامرة',
                  Food: 'طعام', Urban: 'حضري', Beach: 'شاطئ', Desert: 'صحراء', Cultural: 'ثقافي',
                };
                const on = localCats.has(cat);
                return (
                  <button key={cat}
                    onClick={() => setLocalCats(prev => { const s = new Set(prev); if (s.has(cat)) s.delete(cat); else s.add(cat); return s; })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${on ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-lifted text-moon border-white/10 hover:border-oasis-spring/40'}`}>
                    {on && <CheckCheck className="w-3 h-3" />}
                    {ar ? (catLabelAr[cat] ?? cat) : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Level */}
          <div>
            <p className="text-[10px] font-black text-moon uppercase tracking-[0.2em] mb-3">{ar ? 'مستوى السعر' : 'Price Level'}</p>
            <div className="flex gap-2 flex-wrap">
              {PRICE_LEVEL_OPTIONS.map(({ v, l }) => {
                const priceLabelAr: Record<string, string> = { Any: 'الكل', Free: 'مجاني', '$ Budget': 'اقتصادي', '$$ Mid': 'متوسط', '$$$ Premium': 'فاخر' };
                return (
                  <button key={v} onClick={() => setLocal(f => ({ ...f, priceLevel: v }))}
                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${local.priceLevel === v ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-lifted text-moon border-white/10 hover:border-oasis-spring/40'}`}>
                    {ar ? (priceLabelAr[l] ?? l) : l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season */}
          <div>
            <p className="text-[10px] font-black text-moon uppercase tracking-[0.2em] mb-3">{ar ? 'أفضل موسم للزيارة' : 'Best Season to Visit'}</p>
            <div className="flex gap-2 flex-wrap">
              {SEASON_OPTIONS.map(({ v, emoji }) => {
                const seasonLabelAr: Record<string, string> = { All: 'الكل', spring: 'ربيع', summer: 'صيف', autumn: 'خريف', winter: 'شتاء' };
                return (
                  <button key={v} onClick={() => setLocal(f => ({ ...f, season: v }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border capitalize transition-all active:scale-95 ${local.season === v ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-lifted text-moon border-white/10 hover:border-oasis-spring/40'}`}>
                    {emoji} {ar ? (seasonLabelAr[v] ?? v) : v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ✅ FIX: Accessibility section — no longer duplicated */}
          <div>
            <p className="text-[10px] font-black text-moon uppercase tracking-[0.2em] mb-3">{ar ? 'إمكانية الوصول' : 'Accessibility'}</p>
            <div className="flex gap-2 flex-wrap">
              {ACCESSIBILITY_OPTIONS.map(({ k, icon, l }) => {
                const accessLabelAr: Record<string, string> = { Wheelchair: 'كراسي متحركة', Family: 'مناسب للعائلة', Parking: 'موقف سيارات' };
                return (
                  <button key={k} onClick={() => setLocal(f => ({ ...f, [k]: !f[k] }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all active:scale-95 ${local[k] ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-lifted text-moon border-white/10 hover:border-oasis-spring/40'}`}>
                    {icon} {ar ? (accessLabelAr[l] ?? l) : l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={() => { setLocal(DEFAULT_PLACE_FILTER); setLocalCats(new Set()); }}
            className="flex-1 py-3 rounded-2xl border border-white/10 text-sm font-black text-moon hover:bg-lifted transition-colors"
          >
            {ar ? 'إعادة تعيين' : 'Reset'}
          </button>
          <button
            onClick={() => { onChange(local); onCategoriesChange(localCats); onClose(); }}
            className="flex-1 py-3 rounded-2xl bg-oasis-spring text-midnight text-sm font-black hover:brightness-110 transition-all"
          >
            {ar ? 'تطبيق' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── PlacesScreen ───────────────────────────────────────────────────────────────
export const PlacesScreen = ({ t, lang, initialPlaceId, onPlaceOpened, initialQuickFilter }: {
  t: any; lang?: 'en' | 'ar'; initialPlaceId?: string; onPlaceOpened?: () => void; initialQuickFilter?: QuickFilter;
}) => {
  const ar = lang === 'ar';
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [placeFilters, setPlaceFilters] = useState<PlaceFilterState>(DEFAULT_PLACE_FILTER);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => readLocalSet('tripo_saved_places'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    placeAPI.getSavedPlaces().then(ids => {
      setSavedIds(new Set<string>(ids));
      try { localStorage.setItem('tripo_saved_places', JSON.stringify(ids)); } catch {}
    }).catch(() => {});
  }, []);

  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => readLocalSet('tripo_visited_places'));
  const [trips, setTrips] = useState<Trip[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_custom_trips') || '[]'); } catch { return []; }
  });
  const [addToTripPlaceId, setAddToTripPlaceId] = useState<string | null>(null);
  const [addToTripPlaceName, setAddToTripPlaceName] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_recent_searches') || '[]'); } catch { return []; }
  });

  const fetchPlaces = useCallback(async () => {
    setIsLoading(true);
    try {
      setPlaces(await placeAPI.getPlaces());
      setHasNetworkError(false);
    } catch {
      setHasNetworkError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  useEffect(() => {
    if (initialPlaceId && places.length > 0) {
      const place = places.find(p => getPlaceId(p) === initialPlaceId) ?? null;
      if (place) { setSelectedPlace(place); onPlaceOpened?.(); }
    }
  }, [initialPlaceId, places, onPlaceOpened]);

  useEffect(() => {
    if (initialQuickFilter) setQuickFilters(new Set([initialQuickFilter]));
  }, [initialQuickFilter]);

  useEffect(() => {
    if (!selectedPlace) setSavedIds(readLocalSet('tripo_saved_places'));
  }, [selectedPlace]);

  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim() || term.trim().length < 2) return;
    const updated = [term.trim(), ...recentSearches.filter(s => s !== term.trim())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('tripo_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  const handleQuickFilter = useCallback((f: QuickFilter) => {
    if (f === 'near_me') {
      if (quickFilters.has('near_me')) {
        setQuickFilters(prev => { const s = new Set(prev); s.delete('near_me'); return s; });
        return;
      }
      if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords([pos.coords.latitude, pos.coords.longitude]);
          setQuickFilters(prev => new Set([...prev, 'near_me']));
          setLocating(false);
        },
        () => { showToast('Could not get your location', 'error'); setLocating(false); }
      );
      return;
    }
    setQuickFilters(prev => {
      const s = new Set(prev);
      if (s.has(f)) s.delete(f); else s.add(f);
      return s;
    });
  }, [quickFilters]);

  const toggleSaved = useCallback(async (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowSaved = savedIds.has(placeId);
    setSavedIds(toggleLocalSet('tripo_saved_places', placeId, savedIds));
    showToast(isNowSaved ? 'Removed from saved' : 'Saved!', 'success');
    const token = localStorage.getItem('token');
    if (token) {
      try { await placeAPI.toggleSavedPlace(placeId); } catch {
        setSavedIds(prev => toggleLocalSet('tripo_saved_places', placeId, prev));
      }
    }
  }, [savedIds]);

  const toggleVisited = useCallback((placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowVisited = visitedIds.has(placeId);
    setVisitedIds(toggleLocalSet('tripo_visited_places', placeId, visitedIds));
    showToast(isNowVisited ? 'Marked as unvisited' : '✓ Marked as visited!', 'success');
  }, [visitedIds]);

  const openAddToTrip = useCallback((placeId: string, placeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddToTripPlaceId(placeId);
    setAddToTripPlaceName(placeName);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(placeFilters), [placeFilters]);

  // ✅ FIX: sort body is now complete — was cut off in original file
  const filtered = useMemo(() => places
    .filter(p => {
      const matchCat = categories.size === 0 ||
        [...categories].some(cat =>
          p.categoryTags?.some(tag => tag.toLowerCase().includes(cat.toLowerCase())) ||
          p.category?.toLowerCase().includes(cat.toLowerCase())
        );
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.categoryTags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      const matchCity = cityFilter === 'All' || p.city?.toLowerCase().includes(cityFilter.toLowerCase());
      const matchPrice = placeFilters.priceLevel === 0 || getPriceLevel(p) === placeFilters.priceLevel;
      const matchSeason = placeFilters.season === 'All' || p.bestSeasons?.includes(placeFilters.season as any);
      const matchWheelchair = !placeFilters.wheelchair || p.accessibility?.wheelchair;
      const matchFamily = (!placeFilters.family && !quickFilters.has('family')) || p.accessibility?.family;
      const matchParking = !placeFilters.parking || p.accessibility?.parking;
      const matchOpenNow = !quickFilters.has('open_now') || isOpenNow(p.openingHours) === true;
      return matchCat && matchSearch && matchCity && matchPrice && matchSeason &&
        matchWheelchair && matchFamily && matchParking && matchOpenNow;
    })
    .sort((a, b) => {
      if (quickFilters.has('near_me') && userCoords) {
        const d = cityDistanceKm(a.city ?? '', userCoords[0], userCoords[1]) -
          cityDistanceKm(b.city ?? '', userCoords[0], userCoords[1]);
        if (d !== 0) return d;
      }
      if (quickFilters.has('highest_rated')) {
        const d = (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0);
        if (d !== 0) return d;
      }
      if (quickFilters.has('trending')) {
        const d = (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0);
        if (d !== 0) return d;
      }
      if (quickFilters.has('budget')) return getPriceLevel(a) - getPriceLevel(b);
      return 0;
    }), [places, categories, search, cityFilter, placeFilters, quickFilters, userCoords]);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    const results = new Set<string>();
    places.forEach(p => {
      if (p.name?.toLowerCase().includes(q)) results.add(p.name);
      if (p.city?.toLowerCase().startsWith(q)) results.add(p.city!);
      p.categoryTags?.forEach(tag => { if (tag.toLowerCase().includes(q)) results.add(tag); });
    });
    return [...results].slice(0, 6);
  }, [search, places]);

  const curatedLists = useMemo(() => {
    if (!places.length) return [];
    const lists: { title: string; places: Place[] }[] = [];
    const hiddenGems = places
      .filter(p => (p.ratingSummary?.avgRating ?? p.rating ?? 0) >= 4.2 && (p.ratingSummary?.reviewCount ?? 0) < 20 && (p.photos?.[0] || p.image))
      .sort((a, b) => (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0))
      .slice(0, 8);
    if (hiddenGems.length >= 3) lists.push({ title: '💎 Hidden Gems', places: hiddenGems });
    const familyPlaces = places.filter(p => p.accessibility?.family && (p.photos?.[0] || p.image)).slice(0, 8);
    if (familyPlaces.length >= 3) lists.push({ title: '👨‍👩‍👧 Family Friendly', places: familyPlaces });
    const budgetPlaces = places.filter(p => [1, 2].includes(getPriceLevel(p)) && (p.photos?.[0] || p.image)).slice(0, 8);
    if (budgetPlaces.length >= 3) lists.push({ title: '💰 Budget Picks', places: budgetPlaces });
    return lists;
  }, [places]);

  const trendingItems: TrendingItem[] = useMemo(() =>
    [...places]
      .sort((a, b) => (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0))
      .slice(0, 8).filter(p => p.photos?.[0] || p.image)
      .map(p => ({
        id: getPlaceId(p),
        image: p.photos?.[0] || p.image || '',
        name: p.name,
        subtitle: p.city || 'Saudi Arabia',
        badge: p.categoryTags?.[0] || 'Place',
        badgeColor: '#7CF7C8',
        rating: p.ratingSummary?.avgRating ?? p.rating,
      })), [places]);

  const slideshowItems: SlideItem[] = useMemo(() =>
    [...places]
      .sort((a, b) => (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0))
      .slice(0, 8).filter(p => p.photos?.[0] || p.image)
      .map(p => ({
        id: getPlaceId(p),
        type: 'place' as const,
        name: p.name,
        image: p.photos?.[0] || p.image || '',
        subtitle: p.city || 'Saudi Arabia',
        rating: p.ratingSummary?.avgRating ?? p.rating,
        badge: p.categoryTags?.[0] || 'Place',
        badgeColor: '#7CF7C8',
      })), [places]);

  const QUICK_FILTERS = useMemo(() => [
    {
      id: 'open_now' as QuickFilter,
      label: t.filterOpenNow || (ar ? 'مفتوح الآن' : 'Open Now'),
      icon: <span className="w-2 h-2 bg-current rounded-full animate-pulse" />,
      inactive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      active: 'bg-emerald-500 text-midnight border-emerald-500',
    },
    {
      id: 'family' as QuickFilter,
      label: t.filterFamily || (ar ? 'عائلي' : 'Family'),
      icon: <span className="text-sm leading-none">👨‍👩‍👧</span>,
      inactive: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      active: 'bg-violet-500 text-white border-violet-500',
    },
    {
      id: 'trending' as QuickFilter,
      label: t.filterTrending || (ar ? 'الأكثر رواجاً' : 'Trending'),
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      inactive: 'bg-red-500/10 text-red-400 border-red-500/20',
      active: 'bg-red-500 text-white border-red-500',
    },
    {
      id: 'highest_rated' as QuickFilter,
      label: t.filterTopRated || (ar ? 'الأعلى تقييماً' : 'Top Rated'),
      icon: <Award className="w-3.5 h-3.5" />,
      inactive: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      active: 'bg-amber-500 text-midnight border-amber-500',
    },
    {
      id: 'budget' as QuickFilter,
      label: t.filterBudget || (ar ? 'اقتصادي' : 'Budget'),
      icon: <Wallet className="w-3.5 h-3.5" />,
      inactive: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      active: 'bg-sky-500 text-white border-sky-500',
    },
    {
      id: 'near_me' as QuickFilter,
      label: locating
        ? (t.filterLocating || (ar ? 'جارٍ التحديد…' : 'Locating…'))
        : (t.filterNearMe || (ar ? 'قريب مني' : 'Near Me')),
      icon: <Navigation className="w-3.5 h-3.5" />,
      inactive: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      active: 'bg-blue-500 text-white border-blue-500',
    },
  ], [t, locating, ar]);

  const isFiltering = !!(search || quickFilters.size > 0 || categories.size > 0 || cityFilter !== 'All' || activeFilterCount > 0);

  const handleSurpriseMe = () => {
    if (!filtered.length) return;
    setSelectedPlace(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  const getCardData = useCallback((place: Place) => {
    const placeId = getPlaceId(place);
    return {
      placeId,
      img: place.photos?.[0] || place.image,
      rating: place.ratingSummary?.avgRating ?? place.rating,
      openStatus: isOpenNow(place.openingHours),
      isSaved: savedIds.has(placeId),
      isVisited: visitedIds.has(placeId),
      duration: formatDuration(place.duration),
      dist: quickFilters.has('near_me') && userCoords
        ? formatDistance(cityDistanceKm(place.city || '', userCoords[0], userCoords[1]))
        : null,
    };
  }, [savedIds, visitedIds, quickFilters, userCoords]);

  // ── Grid Card ───────────────────────────────────────────────────────────────
  const renderGridCard = (place: Place) => {
    const { placeId, img, rating, openStatus, isSaved, isVisited, duration, dist } = getCardData(place);
    return (
      <button key={placeId} onClick={() => setSelectedPlace(place)}
        className="bg-chamber rounded-3xl overflow-hidden shadow-xl border border-white/5 hover:border-white/15 hover:-translate-y-1 transition-all duration-300 text-left group relative active:scale-[0.98]">
        {isVisited && <div className="absolute inset-0 z-10 pointer-events-none rounded-3xl ring-2 ring-oasis-spring/60" />}
        <div className="h-44 bg-midnight relative overflow-hidden">
          {img
            ? <SafeImage src={img} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isVisited ? 'opacity-40' : ''}`} alt={place.name} fallbackType="placeholder" />
            : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-chamber to-midnight"><MapPin className="w-10 h-10 text-white/5" /></div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent" />
          {rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-midnight/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-xl">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-black text-white">{Number(rating).toFixed(1)}</span>
            </div>
          )}
          {openStatus !== null && (
            <div className={`absolute top-3 left-3 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg ${openStatus ? 'bg-oasis-spring text-midnight' : 'bg-red-500/90 text-white'}`}>
              {openStatus ? (ar ? '● مفتوح' : '● Open') : (ar ? 'مغلق' : 'Closed')}
            </div>
          )}
          {isVisited && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-oasis-spring rounded-full p-2 shadow-xl"><CheckCheck className="w-5 h-5 text-midnight" /></div>
            </div>
          )}
          {place.categoryTags?.[0] && (
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md text-moon text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border border-white/10">
              {place.categoryTags[0]}
            </div>
          )}
          <div
            role="button" tabIndex={0}
            onClick={e => toggleSaved(placeId, e as any)}
            onKeyDown={e => e.key === 'Enter' && toggleSaved(placeId, e as any)}
            className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border border-white/10 ${isSaved ? 'bg-red-500 shadow-xl' : 'bg-black/40 hover:bg-midnight backdrop-blur-md'}`}>
            <Bookmark className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'fill-white text-white' : 'text-moon'}`} />
          </div>
        </div>
        <div className="p-4">
          <p className="font-black text-white text-sm leading-tight truncate group-hover:text-oasis-spring transition-colors">{place.name}</p>
          <p className="text-[11px] text-moon flex items-center gap-1.5 mt-1.5">
            <MapPin className="w-3 h-3 text-oasis-spring/60 flex-shrink-0" />
            <span className="truncate">{place.city || 'Saudi Arabia'}</span>
            {dist && <span className="ml-auto text-oasis-spring font-black text-[10px]">{dist}</span>}
          </p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            {place.ratingSummary?.reviewCount != null && (
              <p className="text-[10px] text-dusk font-bold">{place.ratingSummary.reviewCount} {t.reviewsCount || 'reviews'}</p>
            )}
            {duration && (
              <span className="flex items-center gap-1 text-[10px] text-dusk font-bold ml-auto">
                <Clock className="w-3 h-3 text-oasis-spring/60" />{duration}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  // ── List Card ───────────────────────────────────────────────────────────────
  const renderListCard = (place: Place) => {
    const { placeId, img, rating, openStatus, isSaved, isVisited, duration, dist } = getCardData(place);
    return (
      <button key={placeId} onClick={() => setSelectedPlace(place)}
        className="bg-chamber rounded-2xl overflow-hidden shadow-xl border border-white/5 hover:border-white/15 transition-all text-left flex active:scale-[0.98] group relative">
        {isVisited && <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl ring-1 ring-oasis-spring/60" />}
        <div className="w-28 flex-shrink-0 bg-midnight relative overflow-hidden">
          {img
            ? <SafeImage src={img} className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isVisited ? 'opacity-40' : ''}`} alt={place.name} fallbackType="placeholder" />
            : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-white/5" /></div>
          }
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
          {openStatus !== null && (
            <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${openStatus ? 'bg-oasis-spring shadow-sm' : 'bg-red-500'}`} />
          )}
          <div
            role="button" tabIndex={0}
            onClick={e => toggleSaved(placeId, e as any)}
            onKeyDown={e => e.key === 'Enter' && toggleSaved(placeId, e as any)}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border border-white/10 ${isSaved ? 'bg-red-500' : 'bg-midnight/60'}`}>
            <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-white text-white' : 'text-moon'}`} />
          </div>
        </div>
        <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start gap-2">
            <p className="font-black text-white text-sm leading-tight truncate group-hover:text-oasis-spring transition-colors">{place.name}</p>
            {rating && (
              <div className="flex items-center gap-0.5 flex-shrink-0 bg-midnight/60 px-2 py-1 rounded-lg">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-black text-white">{Number(rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-moon flex items-center gap-1 mt-1.5">
            <MapPin className="w-2.5 h-2.5 text-oasis-spring/60" />
            <span className="truncate">{place.city || 'Saudi Arabia'}</span>
          </p>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
            {dist && <span className="text-oasis-spring text-[10px] font-black">{dist}</span>}
            {duration && (
              <span className="flex items-center gap-1 text-[9px] text-dusk font-bold">
                <Clock className="w-2.5 h-2.5 text-oasis-spring/60" />{duration}
              </span>
            )}
            {openStatus !== null && (
              <span className={`ml-auto text-[9px] font-black uppercase tracking-widest ${openStatus ? 'text-oasis-spring' : 'text-red-400'}`}>
                {openStatus ? (ar ? 'مفتوح' : 'Open') : (ar ? 'مغلق' : 'Closed')}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading && places.length === 0) return (
    <div className="h-full flex flex-col bg-midnight">
      <div className="px-5 pt-8 pb-4">
        <div className="h-9 w-2/3 bg-chamber animate-pulse rounded-2xl mb-2" />
        <div className="h-4 w-1/2 bg-chamber animate-pulse rounded-xl mb-6" />
        <div className="h-14 bg-chamber animate-pulse rounded-2xl" />
      </div>
      <div className="flex-1 px-5 py-4 space-y-4 overflow-hidden">
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  // ── Error ───────────────────────────────────────────────────────────────────
  if (hasNetworkError && places.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-midnight text-center">
      <div className="w-20 h-20 bg-chamber rounded-3xl flex items-center justify-center mb-6 border border-white/5">
        <WifiOff className="w-9 h-9 text-dusk" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">{ar ? 'مشكلة في الاتصال' : 'Connection Problem'}</h2>
      <p className="text-moon text-sm mb-8 max-w-xs leading-relaxed">{ar ? 'لم نتمكن من جلب الأماكن.' : "Couldn't load places. Check your internet connection."}</p>
      <button onClick={fetchPlaces} className="px-8 py-3.5 bg-oasis-spring text-midnight font-black uppercase rounded-2xl active:scale-95 transition-all tracking-widest text-sm">
        {ar ? 'إعادة المحاولة' : 'Try Again'}
      </button>
    </div>
  );

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-midnight text-white overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 pt-6 pb-3 px-5 z-20">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {t.placesTitle || (ar ? 'اكتشف الأماكن' : 'Explore Places')}
            </h1>
            <p className="text-[10px] text-moon font-bold uppercase tracking-[0.18em] mt-0.5">
              {ar ? 'أفضل الوجهات في المملكة' : 'Top destinations in KSA'}
            </p>
          </div>
          <button
            onClick={handleSurpriseMe}
            className="w-10 h-10 bg-chamber border border-white/5 rounded-2xl flex items-center justify-center hover:border-oasis-spring/30 transition-all active:scale-90"
            title={ar ? 'فاجئني!' : 'Surprise me!'}
          >
            <Shuffle className="w-4 h-4 text-oasis-spring" />
          </button>
        </div>

        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchFocused ? 'scale-[1.015]' : ''}`}>
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${searchFocused ? 'text-oasis-spring' : 'text-dusk'}`} />
          <input
            type="text"
            placeholder={ar ? 'ابحث عن أماكن، مدن، تصنيفات…' : 'Search places, cities, categories…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="w-full bg-chamber border border-white/5 rounded-2xl py-3.5 pl-11 pr-10 text-sm font-medium text-white placeholder-moon/40 focus:outline-none focus:ring-2 focus:ring-oasis-spring/30 focus:border-oasis-spring/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-lifted transition-colors">
              <X className="w-3.5 h-3.5 text-moon" />
            </button>
          )}
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-chamber border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <button key={i} onMouseDown={() => { setSearch(s); saveRecentSearch(s); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-lifted transition-colors border-b border-white/5 last:border-0">
                  <Search className="w-3.5 h-3.5 text-dusk flex-shrink-0" />
                  <span className="text-sm font-semibold text-moon">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Mode + Cities */}
        <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex bg-chamber p-1 rounded-xl border border-white/5 shrink-0">
            {([
              { mode: 'grid' as ViewMode, Icon: LayoutGrid },
              { mode: 'list' as ViewMode, Icon: List },
              { mode: 'map' as ViewMode, Icon: MapIcon },
            ] as const).map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-oasis-spring text-midnight shadow-sm scale-105' : 'text-moon hover:text-white'}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          {CITY_LIST.map(city => (
            <button key={city} onClick={() => setCityFilter(city)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 active:scale-95 ${cityFilter === city ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-chamber text-moon border-white/5 hover:border-white/15'}`}>
              {ar ? CITY_LIST_AR[city] : city}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-28 no-scrollbar">

        {/* Map View */}
        {viewMode === 'map' && (
          <div style={{ height: 'calc(100vh - 220px)' }}>
            <React.Suspense fallback={<div className="w-full h-full bg-chamber animate-pulse rounded-xl" />}>
              <TripMap
                places={filtered.map(p => ({
                  id: (p._id || p.id || p.name).toString(),
                  name: p.name,
                  nameAr: p.nameAr,
                  city: p.city || 'Saudi Arabia',
                  cityAr: (p as any).cityAr,
                  category: p.category || p.categoryTags?.[0] || 'default',
                  ratingSummary: p.ratingSummary,
                  image: p.photos?.[0] || p.image,
                  location: p.location || {
                    type: 'Point',
                    coordinates: [p.coordinates?.lng ?? (p as any).lng ?? 46.6753, p.coordinates?.lat ?? (p as any).lat ?? 24.7136]
                  }
                })).filter(p => p?.location?.coordinates?.length === 2)}
                onSelectPlace={p => {
                  const full = places.find(fp => (fp._id || fp.id || fp.name).toString() === p.id);
                  if (full) setSelectedPlace(full);
                }}
                lang={ar ? 'ar' : 'en'}
                height="100%"
              />
            </React.Suspense>
          </div>
        )}

        {/* Grid / List */}
        {viewMode !== 'map' && (
          <div className="px-5 space-y-6 pt-2">

            {/* Featured & Trending — only when not actively filtering */}
            {!isFiltering && viewMode === 'grid' && (
              <>
                <FeaturedSlideshow
                  items={slideshowItems}
                  onSelect={id => {
                    const p = places.find(x => getPlaceId(x) === id);
                    if (p) setSelectedPlace(p);
                  }}
                  lang={lang}
                />
                {trendingItems.length > 0 && (
                  <TrendingCards
                    items={trendingItems}
                    label={ar ? '🔥 الأكثر رواجاً' : '🔥 Trending Now'}
                    onSelect={item => {
                      const p = places.find(x => getPlaceId(x) === item.id);
                      if (p) setSelectedPlace(p);
                    }}
                  />
                )}
              </>
            )}

            {/* Filter chips bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 py-1 sticky top-0 bg-midnight/95 backdrop-blur-md z-10 border-b border-white/5">
              <button
                onClick={() => setShowFilterPanel(true)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all shrink-0 active:scale-95 ${activeFilterCount > 0 ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-chamber text-white border-white/10 hover:border-white/20'}`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {ar ? 'تصفية' : 'Filters'}
                {activeFilterCount > 0 && (
                  <span className="bg-midnight/30 text-midnight px-1.5 py-0.5 rounded-md text-[9px]">{activeFilterCount}</span>
                )}
              </button>
              <div className="h-4 w-px bg-white/10 shrink-0" />
              {QUICK_FILTERS.map(f => {
                const on = quickFilters.has(f.id);
                return (
                  <button key={f.id} onClick={() => handleQuickFilter(f.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all shrink-0 active:scale-95 ${on ? f.active : f.inactive}`}>
                    {f.icon}{f.label}
                  </button>
                );
              })}
            </div>

            {/* Results header */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-moon">
                {search
                  ? (ar ? `نتائج "${search}"` : `Results for "${search}"`)
                  : (ar ? 'الأماكن المقترحة' : 'Recommended')
                }
                <span className="text-oasis-spring ml-2">({filtered.length})</span>
              </p>
              {isFiltering && (
                <button
                  onClick={() => { setPlaceFilters(DEFAULT_PLACE_FILTER); setQuickFilters(new Set()); setSearch(''); setCategories(new Set()); setCityFilter('All'); }}
                  className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors">
                  {ar ? 'مسح الكل' : 'Clear all'}
                </button>
              )}
            </div>

            {/* Cards */}
            {filtered.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
                {filtered.map(p => viewMode === 'grid' ? renderGridCard(p) : renderListCard(p))}
              </div>
            ) : (
              <div className="py-16 text-center rounded-3xl border border-dashed border-white/5 bg-chamber/20">
                <div className="w-14 h-14 bg-chamber rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <MapPin className="w-7 h-7 text-dusk opacity-40" />
                </div>
                <p className="text-moon text-sm font-bold mb-1">
                  {ar ? 'لا توجد نتائج' : 'No places found'}
                </p>
                <p className="text-dusk text-xs mb-5">
                  {ar ? 'جرب تغيير الفلاتر' : 'Try adjusting your filters'}
                </p>
                <button
                  onClick={() => { setPlaceFilters(DEFAULT_PLACE_FILTER); setQuickFilters(new Set()); setSearch(''); setCategories(new Set()); setCityFilter('All'); }}
                  className="text-oasis-spring font-black uppercase text-xs tracking-widest hover:underline">
                  {ar ? 'مسح الفلاتر' : 'Clear filters'}
                </button>
              </div>
            )}

            {/* Curated Lists */}
            {!isFiltering && curatedLists.map((list, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white">{list.title}</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-oasis-spring hover:underline">
                    {ar ? 'عرض الكل' : 'View all'}
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 -mx-5 px-5">
                  {list.places.map(p => (
                    <div key={getPlaceId(p)} className="w-44 shrink-0">{renderGridCard(p)}</div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <PlaceFilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={placeFilters}
        onChange={setPlaceFilters}
        categories={categories}
        onCategoriesChange={setCategories}
        lang={lang}
      />

      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          t={t}
          lang={lang}
          allPlaces={places}
          onSwitchPlace={setSelectedPlace}
          isSaved={savedIds.has(getPlaceId(selectedPlace))}
          onToggleSave={e => toggleSaved(getPlaceId(selectedPlace), e)}
          onOpenAddToTrip={e => openAddToTrip(getPlaceId(selectedPlace), selectedPlace.name, e)}
        />
      )}

      {addToTripPlaceId && (
        <AddToTripModal
          placeId={addToTripPlaceId}
          placeName={addToTripPlaceName}
          onClose={() => setAddToTripPlaceId(null)}
          trips={trips}
          onTripsChange={setTrips}
        />
      )}
    </div>
  );
};

export default PlacesScreen;