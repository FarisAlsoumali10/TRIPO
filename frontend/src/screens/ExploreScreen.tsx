import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation, Search, List, Map as MapIcon, X, Star, Clock, SlidersHorizontal, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { Place } from '../types/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { MOCK_PLACES } from './HomeScreen';

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: '',          label: 'الكل',      emoji: '🗺️', color: '#0f172a' },
  { id: 'Food',      label: 'طعام',      emoji: '🍽️', color: '#f97316' },
  { id: 'Nature',    label: 'طبيعة',     emoji: '🌿', color: '#10b981' },
  { id: 'Sports',    label: 'رياضة',     emoji: '⚽',  color: '#3b82f6' },
  { id: 'Culture',   label: 'ثقافي',     emoji: '🎭', color: '#8b5cf6' },
  { id: 'Shopping',  label: 'تسوق',      emoji: '🛍️', color: '#ec4899' },
  { id: 'Cafe',      label: 'كافيه',     emoji: '☕',  color: '#92400e' },
];

// ── Marker factory per category ──────────────────────────────────────────────
function makeIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 40 : 32;
  const ring = isSelected ? `box-shadow:0 0 0 4px ${color}40;` : '';
  return L.divIcon({
    className: '',
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;${ring}display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  });
}

// ── Wishlist helpers ─────────────────────────────────────────────────────────
const WL_KEY = 'tripo_explore_saved';
function getSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(WL_KEY) || '[]'); } catch { return []; }
}
function toggleSaved(id: string): string[] {
  const prev = getSaved();
  const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
  localStorage.setItem(WL_KEY, JSON.stringify(next));
  return next;
}

// ── Price label ───────────────────────────────────────────────────────────────
const PRICE_LABEL = ['', 'مجاني', 'اقتصادي', 'متوسط', 'فاخر'];
const PRICE_COLOR = ['', 'text-emerald-600', 'text-teal-600', 'text-amber-600', 'text-red-500'];

export const ExploreScreen = ({ t, onOpenPlace }: { t: any; onOpenPlace: (p: Place) => void }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Place | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSaved());
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Filters
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(4);
  const [filterOpenNow, setFilterOpenNow] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Load places ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await placeAPI.getPlaces();
        const arr = Array.isArray(data) ? data : (data?.data || data?.places || []);
        setPlaces(arr.length > 0 ? arr : MOCK_PLACES);
      } catch {
        setPlaces(MOCK_PLACES);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Filtered places ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return places.filter(p => {
      const cat = (p.categoryTags?.[0] || p.category || '').toLowerCase();
      if (activeCategory && !cat.includes(activeCategory.toLowerCase())) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q) && !cat.includes(q)) return false;
      }
      const rating = p.ratingSummary?.avgRating ?? p.rating ?? 0;
      if (rating < filterMinRating) return false;
      const price = p.priceRange ?? 0;
      if (price > filterPriceMax && price !== 0) return false;
      return true;
    });
  }, [places, activeCategory, searchQuery, filterMinRating, filterPriceMax, filterOpenNow]);

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || isLoading) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
      .setView([24.7136, 46.6753], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    // Custom zoom control - bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    markersLayerRef.current = layer;
    mapInstanceRef.current = map;

    // Close bottom sheet on map drag
    map.on('dragstart', () => setShowBottomSheet(false));
  }, [isLoading]);

  // ── Update markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();
    markersRef.current = {};

    const catConfig = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

    filtered.forEach(p => {
      const lat = p.coordinates?.lat ?? p.lat ?? 24.7136;
      const lng = p.coordinates?.lng ?? p.lng ?? 46.6753;
      const id = p._id || p.id || p.name;
      const isSelected = selectedItem && (selectedItem._id || selectedItem.id) === id;

      const marker = L.marker([lat, lng], {
        icon: makeIcon(catConfig.id ? catConfig.color : (CATEGORIES.find(c => (p.categoryTags?.[0] || p.category || '').toLowerCase().includes(c.id.toLowerCase()) && c.id) || CATEGORIES[0]).color, !!isSelected),
      });

      marker.addTo(markersLayerRef.current!);
      marker.bindTooltip(p.name || 'Place', { direction: 'top', offset: [0, -32], className: 'leaflet-tooltip-custom' });
      marker.on('click', () => {
        setSelectedItem(p);
        setShowBottomSheet(true);
        mapInstanceRef.current?.panTo([lat, lng], { animate: true, duration: 0.4 });
      });

      if (id) markersRef.current[id] = marker;
    });
  }, [filtered, activeCategory, selectedItem]);

  // ── Scroll list to selected ─────────────────────────────────────────────--
  useEffect(() => {
    if (!selectedItem || viewMode !== 'list') return;
    const id = selectedItem._id || selectedItem.id;
    if (!id) return;
    const el = document.getElementById(`place-card-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedItem, viewMode]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    mapInstanceRef.current?.remove();
    mapInstanceRef.current = null;
    markersLayerRef.current = null;
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 10, fillColor: '#3b82f6', color: '#fff', weight: 3, fillOpacity: 1,
          }).addTo(mapInstanceRef.current).bindTooltip('أنت هنا', { permanent: true });
        }
        setViewMode('map');
      },
      () => { setIsLocating(false); showToast('تعذّر الحصول على موقعك. تحقق من صلاحيات المتصفح.', 'error'); },
      { timeout: 8000 }
    );
  };

  const handleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedIds(toggleSaved(id));
  };

  const activeFiltersCount = (filterMinRating > 0 ? 1 : 0) + (filterPriceMax < 4 ? 1 : 0) + (filterOpenNow ? 1 : 0);

  // ── Place card (shared between bottom sheet + list) ──────────────────────
  const PlaceCard = ({ place, compact = false }: { place: Place; compact?: boolean }) => {
    const id = place._id || place.id || '';
    const img = place.photos?.[0] || place.image;
    const rating = place.ratingSummary?.avgRating ?? place.rating;
    const price = place.priceRange;
    const isSaved = savedIds.includes(id);

    return (
      <div
        id={`place-card-${id}`}
        onClick={() => { setSelectedItem(place); if (viewMode === 'map') { setShowBottomSheet(true); const lat = place.coordinates?.lat ?? place.lat ?? 24.7136; const lng = place.coordinates?.lng ?? place.lng ?? 46.6753; mapInstanceRef.current?.panTo([lat, lng], { animate: true }); } }}
        className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-all ${selectedItem?._id === id || selectedItem?.id === id ? 'ring-2 ring-emerald-500' : ''} ${compact ? 'flex gap-3 p-3' : ''}`}
      >
        {compact ? (
          <>
            {img ? <img src={img} loading="lazy" className="w-16 h-16 rounded-xl object-cover shrink-0" alt={place.name} /> : <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-2xl">{CATEGORIES.find(c => (place.categoryTags?.[0] || '').toLowerCase().includes(c.id.toLowerCase()) && c.id)?.emoji || '📍'}</div>}
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-sm truncate">{place.name}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{place.city}</p>
              <div className="flex items-center gap-2 mt-1">
                {rating !== undefined && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500"><Star className="w-2.5 h-2.5 fill-amber-400" />{rating.toFixed(1)}</span>}
                {price !== undefined && price > 0 && <span className={`text-[10px] font-bold ${PRICE_COLOR[price]}`}>{PRICE_LABEL[price]}</span>}
              </div>
            </div>
            <button onClick={e => handleSave(e, id)} className="shrink-0 p-1 active:scale-90 transition-transform" aria-label={isSaved ? 'Remove from saved' : 'Save place'}>
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
            </button>
          </>
        ) : (
          <>
            <div className="relative h-36">
              {img ? <img src={img} loading="lazy" className="w-full h-full object-cover" alt={place.name} /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">{CATEGORIES.find(c => (place.categoryTags?.[0] || '').toLowerCase().includes(c.id.toLowerCase()) && c.id)?.emoji || '📍'}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <button onClick={e => handleSave(e, id)} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center active:scale-90 transition-transform" aria-label={isSaved ? 'Remove from saved' : 'Save place'}>
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              </button>
              {rating !== undefined && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-white text-[10px] font-black">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate">{place.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{place.city}</p>
                </div>
                {price !== undefined && price > 0 && <span className={`text-[10px] font-bold shrink-0 ${PRICE_COLOR[price]}`}>{PRICE_LABEL[price]}</span>}
              </div>
              {place.categoryTags && place.categoryTags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {place.categoryTags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">

      {/* ── Top bar: search + view toggle ────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 flex items-center gap-2 pointer-events-none">
        {/* Search box */}
        <div className="flex-1 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3 py-2.5 shadow-md pointer-events-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
            placeholder={(t as any).searchPlaces || 'ابحث عن مكان...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 active:scale-90 transition-transform" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-md overflow-hidden pointer-events-auto shrink-0">
          <button
            onClick={() => setViewMode('map')}
            aria-label="Map view"
            className={`p-2.5 transition-all ${viewMode === 'map' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            <MapIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`p-2.5 transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Category pills ────────────────────────────────────────────────── */}
      <div className="absolute top-16 left-0 right-0 z-20 pointer-events-none">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 pb-1 pointer-events-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border shadow-sm transition-all active:scale-95 ${activeCategory === cat.id ? 'text-white border-transparent' : 'bg-white/95 text-slate-700 border-slate-200 backdrop-blur-sm'}`}
              style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
            >
              <span>{cat.emoji}</span>{cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right-side controls ────────────────────────────────────────────── */}
      <div className="absolute top-28 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Near Me */}
        <button
          onClick={handleNearMe}
          disabled={isLocating}
          aria-label="Near me"
          className="w-10 h-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md flex items-center justify-center text-emerald-600 disabled:opacity-60 active:scale-90 transition-transform"
        >
          {isLocating
            ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            : <Navigation className="w-4 h-4" />
          }
        </button>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(v => !v)}
          aria-label="Filters"
          className="relative w-10 h-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="absolute top-44 right-3 z-30 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-slate-800 text-sm">الفلاتر</p>
            <button onClick={() => { setFilterMinRating(0); setFilterPriceMax(4); setFilterOpenNow(false); }} className="text-[10px] text-emerald-600 font-black">إعادة ضبط</button>
          </div>

          {/* Min rating */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">الحد الأدنى للتقييم</p>
            <div className="flex gap-1">
              {[0,3,4,4.5].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterMinRating(r)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${filterMinRating === r ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {r === 0 ? 'الكل' : `${r}+★`}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">السعر</p>
            <div className="flex gap-1">
              {[1,2,3,4].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriceMax(filterPriceMax === p ? 4 : p)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95 ${filterPriceMax < p ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {'$'.repeat(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Open now */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-slate-700 flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" /> مفتوح الآن</p>
            <button
              onClick={() => setFilterOpenNow(v => !v)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative ${filterOpenNow ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${filterOpenNow ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* ── Place count badge ──────────────────────────────────────────────── */}
      <div className="absolute top-28 left-3 z-20 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md px-3 py-2">
          <p className="text-xs font-black text-slate-700">{filtered.length} مكان</p>
        </div>
      </div>

      {/* ── MAP VIEW ──────────────────────────────────────────────────────── */}
      <div className={`absolute inset-0 ${viewMode === 'list' ? 'hidden' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full outline-none" />

        {/* Hint */}
        {!selectedItem && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-black text-slate-500 shadow-md border border-slate-100">
              {(t as any).mapHint || '📍 اضغط على الدبوس للاستكشاف'}
            </span>
          </div>
        )}

        {/* ── Bottom Sheet ────────────────────────────────────────────────── */}
        {showBottomSheet && selectedItem && (
          <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-24">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اضغط للتفاصيل</p>
                <button onClick={() => setShowBottomSheet(false)} className="p-1.5 bg-slate-100 rounded-full active:scale-90 transition-transform" aria-label="Close">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              <div className="px-3 pb-4" onClick={() => { /* open detail */ }}>
                <PlaceCard place={selectedItem} compact />
              </div>
              <div className="px-3 pb-4">
                <button
                  onClick={() => setSelectedItem(selectedItem)}
                  className="w-full py-3 bg-emerald-600 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform shadow-md shadow-emerald-200"
                >
                  عرض التفاصيل الكاملة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div ref={listRef} className="absolute inset-0 overflow-y-auto pt-36 pb-24 px-3 space-y-3 bg-slate-50">
          {isLoading ? (
            <div className="flex items-center justify-center pt-20">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center pt-20">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-black text-slate-500">لا توجد أماكن</p>
              <p className="text-xs text-slate-400 mt-1">جرب تغيير الفلاتر أو الفئة</p>
              <button onClick={() => { setActiveCategory(''); setSearchQuery(''); setFilterMinRating(0); setFilterPriceMax(4); }} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-2xl active:scale-95 transition-transform">
                إعادة الضبط
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(p => <PlaceCard key={p._id || p.id || p.name} place={p} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Place Detail Modal ─────────────────────────────────────────────── */}
      {selectedItem && (
        <PlaceDetailModal place={selectedItem} onClose={() => { setSelectedItem(null); setShowBottomSheet(false); }} t={t} />
      )}
    </div>
  );
};
