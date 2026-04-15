import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin, Star, Search, X, TrendingUp, Award, Navigation, Wallet, WifiOff,
  SlidersHorizontal, Bookmark, LayoutGrid, List, Map as MapIcon,
  Shuffle, CheckCheck, FolderPlus, Plus, Clock,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Place } from '../types/index';
import { placeAPI } from '../services/api';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { SkeletonCard } from '../components/ui';
import { showToast } from '../components/Toast';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

// ── Constants (module-scope — never recreated on render) ──────────────────────

const CATEGORY_KEYS = ['All', 'Nature', 'Heritage', 'Adventure', 'Food', 'Urban', 'Beach', 'Desert', 'Cultural'];
const CITY_LIST = ['All', 'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'AlUla', 'Abha', 'Dammam', 'Taif', 'Yanbu'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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
  { k: 'family' as const, icon: '👨‍👩‍👧', l: 'Family' },
  { k: 'parking' as const, icon: '🅿', l: 'Parking' },
];

const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925], mecca: [21.3891, 39.8579],
  medina: [24.5247, 39.5692], dammam: [26.4207, 50.0888], alula: [26.6081, 37.9162],
  taif: [21.2739, 40.4062], hail: [27.5114, 41.7208], abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715], yanbu: [24.0894, 38.0618], khobar: [26.2172, 50.1971],
  najran: [17.4930, 44.1277], jizan: [16.8892, 42.5611], al_ula: [26.6081, 37.9162],
};

type QuickFilter = 'budget' | 'trending' | 'highest_rated' | 'near_me' | 'open_now' | null;
type ViewMode = 'grid' | 'list' | 'map';

interface Trip { id: string; name: string; placeIds: string[]; }

interface PlaceFilterState {
  priceLevel: number; season: string;
  wheelchair: boolean; family: boolean; parking: boolean;
}

const DEFAULT_PLACE_FILTER: PlaceFilterState = {
  priceLevel: 0, season: 'All', wheelchair: false, family: false, parking: false,
};

// ── Pure helpers (module-scope) ───────────────────────────────────────────────

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

// FIX: single `new Date()` call instead of three separate calls
function isOpenNow(openingHours?: Record<string, { open: string; close: string; closed?: boolean }>): boolean | null {
  if (!openingHours) return null;
  const now = new Date();
  const hours = openingHours[DAY_KEYS[now.getDay()]];
  if (!hours || hours.closed) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  return closeMins < openMins
    ? nowMins >= openMins || nowMins < closeMins
    : nowMins >= openMins && nowMins < closeMins;
}

function formatDuration(mins?: number): string | null {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

function formatDistance(km: number): string {
  if (km >= 9999) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

function getPriceLevel(p: Place): number {
  if (p.priceRange) return p.priceRange;
  const cost = p.avgCost;
  if (cost == null) return 0;
  if (cost === 0) return 1;
  if (cost <= 50) return 2;
  if (cost <= 150) return 3;
  return 4;
}

function getPlaceId(p: Place): string { return p._id || p.id || ''; }

function countActiveFilters(f: PlaceFilterState): number {
  return [f.priceLevel > 0, f.season !== 'All', f.wheelchair || f.family || f.parking].filter(Boolean).length;
}

/** Shared localStorage Set toggle — replaces the repeated read-parse-update-save pattern */
function toggleLocalSet(key: string, id: string, currentSet: Set<string>): Set<string> {
  const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  const updated = currentSet.has(id) ? list.filter(x => x !== id) : [...list, id];
  localStorage.setItem(key, JSON.stringify(updated));
  return new Set<string>(updated);
}

function readLocalSet(key: string): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set<string>(); }
}

// ── MapView ───────────────────────────────────────────────────────────────────

const MapView = React.memo(({ places, userCoords, onSelectPlace }: {
  places: Place[];
  userCoords: [number, number] | null;
  onSelectPlace: (p: Place) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null); // FIX: track user marker to prevent accumulation

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = userCoords ?? [23.8859, 45.0792];
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(center, userCoords ? 10 : 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
    places.forEach(p => {
      const lat = p.coordinates?.lat ?? p.lat;
      const lng = p.coordinates?.lng ?? p.lng;
      if (!lat || !lng) return;
      const marker = L.circleMarker([lat, lng], {
        radius: 9, fillColor: '#0d9488', color: '#fff', weight: 2, opacity: 1, fillOpacity: 1,
      });
      const rating = p.ratingSummary?.avgRating ?? p.rating;
      marker.bindTooltip(
        `<strong>${p.name}</strong>${rating ? ` ⭐ ${Number(rating).toFixed(1)}` : ''}`,
        { direction: 'top', offset: [0, -12] }
      );
      marker.on('click', () => onSelectPlace(p));
      layerRef.current!.addLayer(marker);
    });
  }, [places, onSelectPlace]);

  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    userMarkerRef.current?.remove(); // FIX: remove previous before adding new
    userMarkerRef.current = L.circleMarker(userCoords, {
      radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(mapRef.current).bindTooltip('You', { permanent: false });
  }, [userCoords]);

  useEffect(() => () => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null; }
  }, []);

  const hasCoords = places.some(p => (p.coordinates?.lat ?? p.lat) && (p.coordinates?.lng ?? p.lng));

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {!hasCoords && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur rounded-2xl px-4 py-3 text-center shadow-md">
            <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-500">No map coordinates for these places</p>
          </div>
        </div>
      )}
    </div>
  );
});

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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl p-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg">Add to Trip</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Adding: <span className="font-bold text-slate-700">{placeName}</span>
        </p>

        {trips.length > 0 && !addingNew && (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {trips.map(trip => {
              const alreadyIn = trip.placeIds.includes(placeId);
              return (
                <button key={trip.id} onClick={() => !alreadyIn && addToTrip(trip.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${alreadyIn ? 'border-emerald-200 bg-emerald-50 cursor-default' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{trip.name}</p>
                    <p className="text-xs text-slate-400">{trip.placeIds.length} place{trip.placeIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  {alreadyIn
                    ? <CheckCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />}
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
              className="w-full px-3 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              {trips.length > 0 && (
                <button onClick={() => setAddingNew(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
                  Back
                </button>
              )}
              <button onClick={createTrip} disabled={!newTripName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-emerald-700 transition">
                Create &amp; Add
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingNew(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
            <FolderPlus className="w-4 h-4" /> New Trip
          </button>
        )}
      </div>
    </div>
  );
};

// ── Filter Panel ──────────────────────────────────────────────────────────────

const PlaceFilterPanel = ({ open, onClose, filters, onChange }: {
  open: boolean; onClose: () => void;
  filters: PlaceFilterState; onChange: (f: PlaceFilterState) => void;
}) => {
  const [local, setLocal] = useState<PlaceFilterState>(filters);
  useEffect(() => { if (open) setLocal(filters); }, [open, filters]);

  const activeCount = countActiveFilters(local); // reuse shared helper

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg">Filters</h3>
            {activeCount > 0 && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Price Level</p>
            <div className="flex gap-2 flex-wrap">
              {PRICE_LEVEL_OPTIONS.map(({ v, l }) => (
                <button key={v} onClick={() => setLocal(f => ({ ...f, priceLevel: v }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${local.priceLevel === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Best Season to Visit</p>
            <div className="flex gap-2 flex-wrap">
              {SEASON_OPTIONS.map(({ v, emoji }) => (
                <button key={v} onClick={() => setLocal(f => ({ ...f, season: v }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border capitalize transition-all ${local.season === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                  {emoji} {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Accessibility</p>
            <div className="flex gap-2 flex-wrap">
              {ACCESSIBILITY_OPTIONS.map(({ k, icon, l }) => (
                <button key={k} onClick={() => setLocal(f => ({ ...f, [k]: !f[k] }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${local[k] ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
                  {icon} {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={() => setLocal(DEFAULT_PLACE_FILTER)}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">
            Reset
          </button>
          <button onClick={() => { onChange(local); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export const PlacesScreen = ({ t, initialPlaceId, onPlaceOpened }: {
  t: any; initialPlaceId?: string; onPlaceOpened?: () => void;
}) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [category, setCategory] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [placeFilters, setPlaceFilters] = useState<PlaceFilterState>(DEFAULT_PLACE_FILTER);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [savedIds, setSavedIds] = useState<Set<string>>(() => readLocalSet('tripo_saved_places'));
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => readLocalSet('tripo_visited_places'));
  const [trips, setTrips] = useState<Trip[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_custom_trips') || '[]'); } catch { return []; }
  });
  const [addToTripPlaceId, setAddToTripPlaceId] = useState<string | null>(null);
  const [addToTripPlaceName, setAddToTripPlaceName] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_recent_searches') || '[]'); } catch { return []; }
  });

  // FIX: single fetchPlaces function reused for both initial load and Retry button
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

  // Re-sync saved state when modal closes
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
  }, [quickFilter]);

  // FIX: use shared toggleLocalSet utility — replaces duplicate read-parse-save blocks
  const toggleSaved = useCallback((placeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isNowSaved = savedIds.has(placeId);
      setSavedIds(toggleLocalSet('tripo_saved_places', placeId, savedIds));
      showToast(isNowSaved ? 'Removed from saved' : 'Saved!', 'success');
    } catch { }
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

  // FIX: filtered is now memoized — no re-sort/filter on unrelated state changes
  const filtered = useMemo(() => places
    .filter(p => {
      const matchCat = category === 'All' ||
        p.categoryTags?.some(tag => tag.toLowerCase().includes(category.toLowerCase())) ||
        p.category?.toLowerCase().includes(category.toLowerCase());

      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.categoryTags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));

      const matchCity = cityFilter === 'All' || p.city?.toLowerCase().includes(cityFilter.toLowerCase());
      const matchPrice = placeFilters.priceLevel === 0 || getPriceLevel(p) === placeFilters.priceLevel;
      const matchSeason = placeFilters.season === 'All' || p.bestSeasons?.includes(placeFilters.season as any);
      const matchWheelchair = !placeFilters.wheelchair || p.accessibility?.wheelchair;
      const matchFamily = !placeFilters.family || p.accessibility?.family;
      const matchParking = !placeFilters.parking || p.accessibility?.parking;
      const matchOpenNow = quickFilter !== 'open_now' || isOpenNow(p.openingHours) === true;

      return matchCat && matchSearch && matchCity && matchPrice && matchSeason &&
        matchWheelchair && matchFamily && matchParking && matchOpenNow;
    })
    .sort((a, b) => {
      if (quickFilter === 'highest_rated') return (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0);
      if (quickFilter === 'trending') return (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0);
      if (quickFilter === 'budget') return (getPriceLevel(a)) - (getPriceLevel(b));
      if (quickFilter === 'near_me' && userCoords) {
        return cityDistanceKm(a.city ?? '', userCoords[0], userCoords[1]) -
          cityDistanceKm(b.city ?? '', userCoords[0], userCoords[1]);
      }
      return 0;
    }), [places, category, search, cityFilter, placeFilters, quickFilter, userCoords]);

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
        badgeColor: '#0d9488',
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
        badgeColor: '#0d9488',
      })), [places]);

  // Dynamic parts of QUICK_FILTERS depend on `t` and `locating`
  const QUICK_FILTERS = useMemo(() => [
    { id: 'open_now' as QuickFilter, label: t.filterOpenNow || 'Open Now', icon: <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" /> },
    { id: 'budget' as QuickFilter, label: t.filterBudget || 'Budget', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'trending' as QuickFilter, label: t.filterTrending || 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'highest_rated' as QuickFilter, label: t.filterTopRated || 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'near_me' as QuickFilter, label: locating ? (t.filterLocating || 'Locating…') : (t.filterNearMe || 'Near Me'), icon: <Navigation className="w-3.5 h-3.5" /> },
  ], [t, locating]);

  // catLabels memoized so it's not rebuilt inside every render of the pill row
  const catLabels = useMemo<Record<string, string>>(() => ({
    All: t.catAll || 'All', Nature: t.catNature || 'Nature', Heritage: t.catHeritage || 'Heritage',
    Adventure: t.catAdventure || 'Adventure', Food: t.catFood || 'Food', Urban: t.catUrban || 'Urban',
    Beach: t.catBeach || 'Beach', Desert: t.catDesert || 'Desert', Cultural: t.catCultural || 'Cultural',
  }), [t]);

  const isFiltering = !!(search || quickFilter || category !== 'All' || cityFilter !== 'All' || activeFilterCount > 0);

  const handleSurpriseMe = () => {
    if (!filtered.length) return;
    setSelectedPlace(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  // FIX: shared card data extractor — eliminates identical 8-variable block duplicated in both renderers
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
      dist: quickFilter === 'near_me' && userCoords
        ? formatDistance(cityDistanceKm(place.city || '', userCoords[0], userCoords[1]))
        : null,
    };
  }, [savedIds, visitedIds, quickFilter, userCoords]);

  const renderGridCard = (place: Place) => {
    const { placeId, img, rating, openStatus, isSaved, isVisited, duration, dist } = getCardData(place);
    return (
      <button key={placeId} onClick={() => setSelectedPlace(place)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group relative">
        {isVisited && <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl ring-2 ring-emerald-400" />}
        <div className="h-36 bg-slate-200 relative overflow-hidden">
          {img
            ? <img src={img} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isVisited ? 'brightness-75' : ''}`} alt={place.name} loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-8 h-8 text-slate-300" /></div>
          }
          {rating && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
            </div>
          )}
          {openStatus !== null && (
            <div className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${openStatus ? 'bg-emerald-500 text-white' : 'bg-red-400/90 text-white'}`}>
              {openStatus ? '● Open' : 'Closed'}
            </div>
          )}
          {isVisited && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-emerald-500/90 rounded-full p-1.5"><CheckCheck className="w-4 h-4 text-white" /></div>
            </div>
          )}
          {place.categoryTags?.[0] && (
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
              {place.categoryTags[0]}
            </div>
          )}
          <div role="button" tabIndex={0}
            onClick={e => toggleSaved(placeId, e as any)}
            onKeyDown={e => e.key === 'Enter' && toggleSaved(placeId, e as any)}
            className={`absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${isSaved ? 'bg-rose-500 shadow-md' : 'bg-black/40 hover:bg-black/60'}`}>
            <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
          </div>
        </div>
        <div className="p-3">
          <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{place.city || 'Saudi Arabia'}</span>
            {dist && <span className="ml-auto text-emerald-600 font-semibold flex-shrink-0">{dist}</span>}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {place.ratingSummary?.reviewCount != null && (
              <p className="text-xs text-slate-400">{place.ratingSummary.reviewCount} {t.reviewsCount || 'reviews'}</p>
            )}
            {duration && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />{duration}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
            <div role="button" tabIndex={0}
              onClick={e => toggleVisited(placeId, e as any)}
              onKeyDown={e => e.key === 'Enter' && toggleVisited(placeId, e as any)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${isVisited ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
              <CheckCheck className="w-2.5 h-2.5" />{isVisited ? 'Visited' : 'Mark Visited'}
            </div>
            <div role="button" tabIndex={0}
              onClick={e => openAddToTrip(placeId, place.name, e as any)}
              onKeyDown={e => e.key === 'Enter' && openAddToTrip(placeId, place.name, e as any)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-all ml-auto cursor-pointer">
              <FolderPlus className="w-2.5 h-2.5" /> Trip
            </div>
          </div>
        </div>
      </button>
    );
  };

  const renderListCard = (place: Place) => {
    const { placeId, img, rating, openStatus, isSaved, isVisited, duration, dist } = getCardData(place);
    return (
      <button key={placeId} onClick={() => setSelectedPlace(place)}
        className="w-full bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all text-left flex items-center gap-3 p-3 group">
        <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-slate-200 relative">
          {img
            ? <img src={img} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-5 h-5 text-slate-300" /></div>
          }
          {isVisited && (
            <div className="absolute inset-0 bg-emerald-500/60 flex items-center justify-center">
              <CheckCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {place.city || 'Saudi Arabia'}
            {dist && <span className="ml-1 text-emerald-600 font-semibold">{dist}</span>}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {rating && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-600">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(rating).toFixed(1)}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                <Clock className="w-3 h-3" />{duration}
              </span>
            )}
            {openStatus !== null && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${openStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                {openStatus ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div role="button" tabIndex={0}
            onClick={e => toggleSaved(placeId, e as any)}
            onKeyDown={e => e.key === 'Enter' && toggleSaved(placeId, e as any)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${isSaved ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'}`}>
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500' : ''}`} />
          </div>
          <div role="button" tabIndex={0}
            onClick={e => openAddToTrip(placeId, place.name, e as any)}
            onKeyDown={e => e.key === 'Enter' && openAddToTrip(placeId, place.name, e as any)}
            className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:bg-teal-50 hover:text-teal-600 flex items-center justify-center transition-all cursor-pointer">
            <FolderPlus className="w-3.5 h-3.5" />
          </div>
          <div role="button" tabIndex={0}
            onClick={e => toggleVisited(placeId, e as any)}
            onKeyDown={e => e.key === 'Enter' && toggleVisited(placeId, e as any)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${isVisited ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}>
            <CheckCheck className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 pt-5 pb-3">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.placesTitle || 'Places'}</h1>
            <p className="text-sm text-slate-500">{filtered.length} {t.placesSubtitle || 'spots in Saudi Arabia'}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && filtered.length > 0 && (
              <button onClick={handleSurpriseMe} title="Surprise Me"
                className="flex items-center gap-1.5 bg-violet-50 text-violet-600 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-violet-100 hover:bg-violet-100 transition-all">
                <Shuffle className="w-3.5 h-3.5" /> Surprise
              </button>
            )}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {([
                { mode: 'grid', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                { mode: 'list', icon: <List className="w-3.5 h-3.5" /> },
                { mode: 'map', icon: <MapIcon className="w-3.5 h-3.5" /> },
              ] as const).map(({ mode, icon }) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === mode ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  {icon}
                </button>
              ))}
            </div>
            {savedIds.size > 0 && (
              <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-xl text-xs font-bold">
                <Bookmark className="w-3.5 h-3.5 fill-rose-500" />{savedIds.size}
              </div>
            )}
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 items-center mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder={t.placesSearch || 'Search by name, city, or tag...'}
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { saveRecentSearch(search); setSearchFocused(false); } }}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
            {searchFocused && search.length >= 2 && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-30 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s} onMouseDown={() => { setSearch(s); saveRecentSearch(s); setSearchFocused(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left">
                    <Search className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />{s}
                  </button>
                ))}
              </div>
            )}
            {searchFocused && !search && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-30 overflow-hidden">
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent</p>
                {recentSearches.map(s => (
                  <button key={s} onMouseDown={() => { setSearch(s); setSearchFocused(false); }}
                    className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left group">
                    <span className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />{s}
                    </span>
                    <button onMouseDown={e => {
                      e.stopPropagation();
                      const updated = recentSearches.filter(r => r !== s);
                      setRecentSearches(updated);
                      localStorage.setItem('tripo_recent_searches', JSON.stringify(updated));
                    }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-slate-300" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowFilterPanel(true)}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${activeFilterCount > 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Quick filter pills */}
        <div className="relative mb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {QUICK_FILTERS.map(f => (
              <button key={f.id} onClick={() => handleQuickFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickFilter === f.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}>
                {f.icon}{f.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>

        {/* Category pills */}
        <div className="relative mb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORY_KEYS.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${category === cat ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'}`}>
                {catLabels[cat] || cat}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>

        {/* City row */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CITY_LIST.map(city => (
              <button key={city} onClick={() => setCityFilter(city)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${cityFilter === city ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400 hover:text-teal-600'}`}>
                {city !== 'All' && <MapPin className="w-2.5 h-2.5" />}{city}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="flex-1 overflow-hidden">
          <MapView places={filtered} userCoords={userCoords} onSelectPlace={setSelectedPlace} />
        </div>
      )}

      {/* List / Grid views */}
      {viewMode !== 'map' && (
        <>
          {slideshowItems.length > 0 && !isFiltering && (
            <FeaturedSlideshow items={slideshowItems} height="h-56"
              onPress={item => {
                const place = places.find(p => getPlaceId(p) === item.id) ?? null;
                if (place) setSelectedPlace(place);
              }} />
          )}

          {hasNetworkError && !isLoading && (
            <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <WifiOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs font-medium text-amber-700">Showing cached results — check your connection</p>
              {/* FIX: reuses fetchPlaces instead of inline duplicate */}
              <button onClick={fetchPlaces} className="ml-auto text-xs font-bold text-amber-700 underline">Retry</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {isLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : places.length === 0 ? (
              <div className="flex justify-center p-8 w-full mt-10">
                <p className="text-slate-500 text-center font-semibold">لا توجد أماكن مضافة في قاعدة البيانات بعد.</p>
              </div>
            ) : (
              <>
                {isFiltering && (
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500 font-medium">
                      {filtered.length === 0 ? 'No places found' : `${filtered.length} place${filtered.length !== 1 ? 's' : ''} found`}
                      {search && <span className="text-slate-400"> for "<span className="text-slate-600">{search}</span>"</span>}
                    </p>
                    {activeFilterCount > 0 && (
                      <button onClick={() => setPlaceFilters(DEFAULT_PLACE_FILTER)}
                        className="text-xs text-emerald-600 font-bold hover:text-emerald-700">Clear filters</button>
                    )}
                  </div>
                )}

                {!isFiltering && curatedLists.length > 0 && (
                  <div className="space-y-5 mb-6">
                    {curatedLists.map(list => (
                      <div key={list.title}>
                        <h3 className="text-sm font-bold text-slate-800 mb-3">{list.title}</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                          {list.places.map(place => {
                            const img = place.photos?.[0] || place.image;
                            const rating = place.ratingSummary?.avgRating ?? place.rating;
                            const pid = getPlaceId(place);
                            return (
                              <button key={pid} onClick={() => setSelectedPlace(place)}
                                className="flex-shrink-0 w-36 text-left group rounded-xl overflow-hidden bg-white shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                <div className="h-24 bg-slate-200 relative overflow-hidden">
                                  {img
                                    ? <img src={img} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                    : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-5 h-5 text-slate-300" /></div>
                                  }
                                  {rating && (
                                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                                      <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
                                      <span className="text-[9px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2">
                                  <p className="font-bold text-[11px] text-slate-900 line-clamp-1">{place.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{place.city || 'Saudi Arabia'}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-4">
                      <h3 className="text-sm font-bold text-slate-800 mb-3">All Places</h3>
                    </div>
                  </div>
                )}

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <MapPin className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="font-semibold text-slate-500 text-sm">{t.noPlacesFound || 'No places found'}</p>
                    <p className="text-slate-400 text-xs mt-1">{t.tryDifferentSearch || 'Try a different category or search term'}</p>
                    {(activeFilterCount > 0 || cityFilter !== 'All') && (
                      <button onClick={() => { setPlaceFilters(DEFAULT_PLACE_FILTER); setCityFilter('All'); }}
                        className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold hover:bg-emerald-700 transition">
                        Reset all filters
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map(renderGridCard)}
                  </div>
                ) : (
                  <div className="space-y-2">{filtered.map(renderListCard)}</div>
                )}

                {searchFocused && trendingItems.length > 0 && (
                  <TrendingCards items={trendingItems} label={t.trendingPlaces || '🔥 Trending Places'}
                    onSelect={item => {
                      const place = places.find(p => getPlaceId(p) === item.id) ?? null;
                      if (place) setSelectedPlace(place);
                    }} />
                )}
              </>
            )}
          </div>
        </>
      )}

      {visitedIds.size > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold">
            <CheckCheck className="w-3.5 h-3.5" />{visitedIds.size} visited
          </div>
        </div>
      )}

      <PlaceFilterPanel open={showFilterPanel} onClose={() => setShowFilterPanel(false)}
        filters={placeFilters} onChange={setPlaceFilters} />

      {addToTripPlaceId && (
        <AddToTripModal placeId={addToTripPlaceId} placeName={addToTripPlaceName}
          onClose={() => { setAddToTripPlaceId(null); setAddToTripPlaceName(''); }}
          trips={trips} onTripsChange={setTrips} />
      )}

      {selectedPlace && (
        <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)}
          t={t} mode="page" allPlaces={places} onSwitchPlace={setSelectedPlace} />
      )}
    </div>
  );
};