import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation, Search, List, Map as MapIcon, X, Star, Clock,
  SlidersHorizontal, Heart, ArrowUpDown, Users, CheckCircle2,
  Percent, Tag, Bookmark, Info,
} from 'lucide-react';
import { Place } from '../types/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { MOCK_PLACES } from './HomeScreen';
import { addPlaceToList, getPlaceListMembership } from './PersonalListsScreen';

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: '',             label: 'الكل',          emoji: '🗺️', color: '#0f172a' },
  { id: 'nature',       label: 'طبيعة',         emoji: '🌿', color: '#10b981' },
  { id: 'sports',       label: 'رياضة',         emoji: '⚽',  color: '#3b82f6' },
  { id: 'restaurant',   label: 'مطاعم',         emoji: '🍽️', color: '#f97316' },
  { id: 'cafe',         label: 'كافيهات',       emoji: '☕',  color: '#92400e' },
  { id: 'park',         label: 'حدائق',         emoji: '🌳', color: '#22c55e' },
  { id: 'beach',        label: 'شواطئ',         emoji: '🏖️', color: '#0ea5e9' },
  { id: 'food_truck',   label: 'فود ترك',       emoji: '🚚', color: '#f59e0b' },
  { id: 'tours',        label: 'جولات ورحلات',  emoji: '🧭', color: '#8b5cf6' },
  { id: 'heritage',     label: 'تراث',          emoji: '🏛️', color: '#d97706' },
  { id: 'shopping',     label: 'تسوق',          emoji: '🛍️', color: '#ec4899' },
  { id: 'chalet',       label: 'شاليهات',       emoji: '🏕️', color: '#64748b' },
];

// Category → color lookup
const CAT_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.id).map(c => [c.id, c.color])
);
const CAT_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter(c => c.id).map(c => [c.id, c.emoji])
);

function getCategoryId(place: Place): string {
  const tags = (place.categoryTags || []).map(t => t.toLowerCase());
  const cat = (place.category || '').toLowerCase();
  const all = [...tags, cat];
  for (const c of Object.keys(CAT_COLOR)) {
    if (all.some(t => t.includes(c) || c.includes(t))) return c;
  }
  // legacy mapping
  if (all.some(t => ['food', 'طعام', 'مطعم'].includes(t))) return 'restaurant';
  if (all.some(t => ['nature', 'طبيعة'].includes(t))) return 'nature';
  return '';
}

// ── Map icon factory ───────────────────────────────────────────────────────
function makeIcon(color: string, emoji: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 42 : 34;
  const ring = isSelected ? `box-shadow:0 0 0 4px ${color}40;` : '';
  return L.divIcon({
    className: '',
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;${ring}box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:${isSelected ? 18 : 14}px;display:block;line-height:1;">${emoji}</span>
    </div>`,
  });
}

// ── Access type badge ──────────────────────────────────────────────────────
const ACCESS_CONFIG = {
  free:       { label: 'مجاني',     color: 'bg-emerald-100 text-emerald-700' },
  ticketed:   { label: 'بتذكرة',   color: 'bg-blue-100 text-blue-700'       },
  entry_fee:  { label: 'رسوم دخول', color: 'bg-amber-100 text-amber-700'    },
};

// ── Price config ──────────────────────────────────────────────────────────
const PRICE_LABEL = ['', 'مجاني', 'اقتصادي', 'متوسط', 'فاخر'];
const PRICE_COLOR = ['', 'text-emerald-600', 'text-teal-600', 'text-amber-600', 'text-red-500'];

// ── WL helpers ─────────────────────────────────────────────────────────────
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

// ── Haversine distance ─────────────────────────────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Mock data enrichment for demo ─────────────────────────────────────────
const ENRICHED_MOCK: Place[] = [
  ...MOCK_PLACES,
  {
    id: 'ft-1', name: 'عربة بروست الطائرة', city: 'الرياض',
    description: 'فود ترك متجول يقدم البروست الكويتي.',
    categoryTags: ['food_truck', 'Food'],
    isFoodTruck: true, isTrending: true, priceRange: 2, accessType: 'free',
    isFamilySuitable: true,
    coordinates: { lat: 24.7200, lng: 46.6900 },
    ratingSummary: { avgRating: 4.7, reviewCount: 89 },
  },
  {
    id: 'ft-2', name: 'شاحنة لافييت', city: 'الرياض',
    description: 'فود ترك بمطبخ فرنسي.',
    categoryTags: ['food_truck', 'Food'],
    isFoodTruck: true, isTrending: false, priceRange: 3, accessType: 'free',
    coordinates: { lat: 24.7050, lng: 46.6700 },
    ratingSummary: { avgRating: 4.5, reviewCount: 42 },
  },
  {
    id: 'park-1', name: 'حديقة الملك عبدالله', city: 'الرياض',
    description: 'حديقة عامة ضخمة مع ألعاب أطفال.',
    categoryTags: ['park', 'Nature'],
    priceRange: 1, accessType: 'free', isFamilySuitable: true,
    coordinates: { lat: 24.7300, lng: 46.6600 },
    ratingSummary: { avgRating: 4.6, reviewCount: 210 },
  },
  {
    id: 'beach-1', name: 'شاطئ الكورنيش', city: 'جدة',
    description: 'شاطئ عام على ساحل البحر الأحمر.',
    categoryTags: ['beach', 'Beach'],
    priceRange: 1, accessType: 'free', isFamilySuitable: true,
    gender: 'mixed',
    coordinates: { lat: 21.4860, lng: 39.1920 },
    ratingSummary: { avgRating: 4.8, reviewCount: 320 },
  },
  {
    id: 'beach-2', name: 'شاطئ نسائي — أوبال', city: 'جدة',
    description: 'شاطئ مخصص للسيدات مع مرافق كاملة.',
    categoryTags: ['beach', 'Beach'],
    priceRange: 2, accessType: 'ticketed', isFamilySuitable: false,
    gender: 'women_only',
    seasonalDates: { openDate: '2025-04-01', closeDate: '2025-10-31' },
    coordinates: { lat: 21.4900, lng: 39.1880 },
    ratingSummary: { avgRating: 4.7, reviewCount: 115 },
  },
  {
    id: 'chalet-1', name: 'شاليه بادل ريف', city: 'الرياض',
    description: 'شاليه يضم ملاعب بادل وسباحة.',
    categoryTags: ['chalet', 'Sports'],
    priceRange: 3, accessType: 'entry_fee', isFamilySuitable: true,
    hasSportsFacilities: true, sportsFacilities: ['بادل', 'سباحة'],
    coordinates: { lat: 24.7400, lng: 46.7200 },
    ratingSummary: { avgRating: 4.5, reviewCount: 67 },
  },
  {
    id: 'rest-1', name: 'مطعم ياباني — كي', city: 'الرياض',
    description: 'مطعم ياباني راقٍ مع سوشي طازج.',
    categoryTags: ['restaurant', 'Food'],
    priceRange: 4, accessType: 'free', cuisineType: 'japanese',
    coordinates: { lat: 24.7100, lng: 46.6800 },
    ratingSummary: { avgRating: 4.8, reviewCount: 178 },
  },
  {
    id: 'cafe-1', name: 'قهوة محلات — بلاك', city: 'الرياض',
    description: 'كافيه عصري مع ألعاب وأنشطة.',
    categoryTags: ['cafe', 'Cafe'],
    priceRange: 2, accessType: 'free', subcategory: 'games_cafe',
    isFamilySuitable: true,
    coordinates: { lat: 24.7250, lng: 46.6650 },
    ratingSummary: { avgRating: 4.6, reviewCount: 92 },
  },
  {
    id: 'sports-1', name: 'متجر بادل برو', city: 'الرياض',
    description: 'متجر متخصص في معدات البادل والرياضة.',
    categoryTags: ['sports', 'Shopping'],
    priceRange: 3, accessType: 'free',
    coordinates: { lat: 24.7180, lng: 46.6720 },
    ratingSummary: { avgRating: 4.4, reviewCount: 44 },
  },
];

// ── Main Component ────────────────────────────────────────────────────────
export const ExploreScreen = ({ t, onOpenPlace }: { t: any; onOpenPlace: (p: Place) => void }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => getSaved());
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);

  // Filters
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(4);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterFamilyOnly, setFilterFamilyOnly] = useState(false);
  const [filterAccessType, setFilterAccessType] = useState<string>('');
  const [filterFoodTruck, setFilterFoodTruck] = useState(false);
  const [filterGender, setFilterGender] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'proximity'>('rating');
  const [filterGroupOffer, setFilterGroupOffer] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // ── Load places ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await placeAPI.getPlaces();
        const arr = Array.isArray(data) ? data : (data?.data || data?.places || []);
        setPlaces(arr.length > 0 ? arr : ENRICHED_MOCK);
      } catch {
        setPlaces(ENRICHED_MOCK);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Check is open now ────────────────────────────────────────────────────
  function isOpenNow(p: Place): boolean | null {
    if (!p.openingHours) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[new Date().getDay()];
    const h = p.openingHours[day];
    if (!h || h.closed) return false;
    const [oh, om] = h.open.split(':').map(Number);
    const [ch, cm] = h.close.split(':').map(Number);
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const open = oh * 60 + om, close = ch * 60 + cm;
    if (close < open) return now >= open || now < close;
    return now >= open && now < close;
  }

  // ── Seasonal active check ────────────────────────────────────────────────
  function isSeasonallyActive(p: Place): boolean {
    if (!p.seasonalDates?.openDate) return true;
    const now = new Date();
    const open = new Date(p.seasonalDates.openDate);
    const close = p.seasonalDates.closeDate ? new Date(p.seasonalDates.closeDate) : null;
    if (now < open) return false;
    if (close && now > close) return false;
    return true;
  }

  // ── Filtered + sorted places ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = places.filter(p => {
      const catId = getCategoryId(p);
      if (activeCategory && catId !== activeCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const tags = (p.categoryTags || []).join(' ').toLowerCase();
        if (!name.includes(q) && !city.includes(q) && !desc.includes(q) && !tags.includes(q)) return false;
      }

      const rating = p.ratingSummary?.avgRating ?? p.rating ?? 0;
      if (rating < filterMinRating) return false;

      const price = p.priceRange ?? 0;
      if (filterPriceMax < 4 && price > filterPriceMax) return false;

      if (filterOpenNow) {
        const open = isOpenNow(p);
        if (open === false) return false;
      }

      if (filterFamilyOnly && !p.isFamilySuitable) return false;

      if (filterAccessType && p.accessType !== filterAccessType) return false;

      if (filterFoodTruck && !p.isFoodTruck) return false;

      if (filterGender && p.gender && p.gender !== filterGender) return false;

      if (filterGroupOffer && !p.groupOffer?.available) return false;

      return true;
    });

    // Sorting
    if (sortBy === 'price_asc') {
      result = [...result].sort((a, b) => (a.priceRange ?? 0) - (b.priceRange ?? 0));
    } else if (sortBy === 'price_desc') {
      result = [...result].sort((a, b) => (b.priceRange ?? 0) - (a.priceRange ?? 0));
    } else if (sortBy === 'proximity' && userPos) {
      result = [...result].sort((a, b) => {
        const aLat = a.coordinates?.lat ?? a.lat ?? 24.7136;
        const aLng = a.coordinates?.lng ?? a.lng ?? 46.6753;
        const bLat = b.coordinates?.lat ?? b.lat ?? 24.7136;
        const bLng = b.coordinates?.lng ?? b.lng ?? 46.6753;
        return distKm(userPos.lat, userPos.lng, aLat, aLng) - distKm(userPos.lat, userPos.lng, bLat, bLng);
      });
    } else {
      result = [...result].sort((a, b) =>
        (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0)
      );
    }

    return result;
  }, [places, activeCategory, searchQuery, filterMinRating, filterPriceMax, filterOpenNow,
    filterFamilyOnly, filterAccessType, filterFoodTruck, filterGender, filterGroupOffer,
    sortBy, userPos]);

  // Cost-effective family options
  const familyDeals = useMemo(() =>
    filtered.filter(p => p.isFamilySuitable && (p.priceRange ?? 3) <= 2).slice(0, 3),
    [filtered]
  );

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || isLoading) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
      .setView([24.7136, 46.6753], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    markersLayerRef.current = layer;
    mapInstanceRef.current = map;

    map.on('dragstart', () => setShowBottomSheet(false));
  }, [isLoading]);

  // ── Update markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();
    markersRef.current = {};

    filtered.forEach(p => {
      const lat = p.coordinates?.lat ?? p.lat ?? 24.7136;
      const lng = p.coordinates?.lng ?? p.lng ?? 46.6753;
      const id = p._id || p.id || p.name;
      const catId = getCategoryId(p);
      const color = CAT_COLOR[catId] || '#0f172a';
      const emoji = CAT_EMOJI[catId] || '📍';
      const isSelected = selectedItem && (selectedItem._id || selectedItem.id) === id;

      const marker = L.marker([lat, lng], { icon: makeIcon(color, emoji, !!isSelected) });
      marker.addTo(markersLayerRef.current!);
      marker.bindTooltip(p.name || 'Place', { direction: 'top', offset: [0, -36], className: 'leaflet-tooltip-custom' });
      marker.on('click', () => {
        setSelectedItem(p);
        setShowBottomSheet(true);
        mapInstanceRef.current?.panTo([lat, lng], { animate: true, duration: 0.4 });
      });
      if (id) markersRef.current[String(id)] = marker;
    });
  }, [filtered, selectedItem]);

  // ── Scroll list to selected ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedItem || viewMode !== 'list') return;
    const id = selectedItem._id || selectedItem.id;
    if (!id) return;
    document.getElementById(`place-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedItem, viewMode]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    mapInstanceRef.current?.remove();
    mapInstanceRef.current = null;
    markersLayerRef.current = null;
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) { showToast('الجهاز لا يدعم تحديد الموقع', 'error'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
          L.circleMarker([lat, lng], {
            radius: 10, fillColor: '#3b82f6', color: '#fff', weight: 3, fillOpacity: 1,
          }).addTo(mapInstanceRef.current).bindTooltip('أنت هنا', { permanent: true });
        }
        setSortBy('proximity');
        setViewMode('map');
      },
      () => { setIsLocating(false); showToast('تعذّر الحصول على موقعك', 'error'); },
      { timeout: 8000 }
    );
  };

  const handleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedIds(toggleSaved(id));
  };

  const handleAddToList = (e: React.MouseEvent, place: Place, listId: import('../types/index').PersonalListType) => {
    e.stopPropagation();
    const pid = place._id || place.id || '';
    addPlaceToList(listId, {
      placeId: pid,
      placeName: place.name,
      placeImage: place.photos?.[0] || place.image,
      placeCity: place.city,
      addedAt: new Date().toISOString(),
    });
    showToast('تمت الإضافة للقائمة ✓', 'success');
    setShowListMenu(null);
  };

  const activeFiltersCount = [
    filterMinRating > 0, filterPriceMax < 4, filterOpenNow, filterFamilyOnly,
    !!filterAccessType, filterFoodTruck, !!filterGender, filterGroupOffer,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterMinRating(0); setFilterPriceMax(4); setFilterOpenNow(false);
    setFilterFamilyOnly(false); setFilterAccessType(''); setFilterFoodTruck(false);
    setFilterGender(''); setFilterGroupOffer(false); setSortBy('rating');
  };

  // ── Place card ───────────────────────────────────────────────────────────
  const PlaceCard = ({ place, compact = false }: { place: Place; compact?: boolean }) => {
    const id = place._id || place.id || '';
    const img = place.photos?.[0] || place.image;
    const rating = place.ratingSummary?.avgRating ?? place.rating;
    const price = place.priceRange;
    const isSaved = savedIds.includes(id);
    const catId = getCategoryId(place);
    const catColor = CAT_COLOR[catId] || '#0f172a';
    const catEmoji = CAT_EMOJI[catId] || '📍';
    const accessCfg = place.accessType ? ACCESS_CONFIG[place.accessType] : null;
    const isListMenuOpen = showListMenu === id;
    const inProximity = userPos && place.coordinates
      ? distKm(userPos.lat, userPos.lng, place.coordinates.lat, place.coordinates.lng)
      : null;

    return (
      <div
        id={`place-card-${id}`}
        onClick={() => {
          setSelectedItem(place);
          if (viewMode === 'map') {
            setShowBottomSheet(true);
            const lat = place.coordinates?.lat ?? place.lat ?? 24.7136;
            const lng = place.coordinates?.lng ?? place.lng ?? 46.6753;
            mapInstanceRef.current?.panTo([lat, lng], { animate: true });
          }
        }}
        className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-all ${(selectedItem?._id === id || selectedItem?.id === id) ? 'ring-2 ring-emerald-500' : ''} ${compact ? 'flex gap-3 p-3' : ''}`}
      >
        {compact ? (
          <>
            {img
              ? <img src={img} loading="lazy" className="w-16 h-16 rounded-xl object-cover shrink-0" alt={place.name} />
              : <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-2xl">{catEmoji}</div>
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1">
                <p className="font-black text-slate-900 text-sm truncate flex-1">{place.name}</p>
                {place.isFoodTruck && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black shrink-0">متجول</span>}
                {place.isTrending && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black shrink-0">🔥</span>}
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{place.city}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {rating !== undefined && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500"><Star className="w-2.5 h-2.5 fill-amber-400" />{rating.toFixed(1)}</span>}
                {price !== undefined && price > 0 && <span className={`text-[10px] font-bold ${PRICE_COLOR[price]}`}>{PRICE_LABEL[price]}</span>}
                {accessCfg && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accessCfg.color}`}>{accessCfg.label}</span>}
                {place.isFamilySuitable && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-black">👨‍👩‍👧 عائلي</span>}
                {inProximity !== null && inProximity < 50 && <span className="text-[9px] text-blue-500 font-bold">{inProximity.toFixed(1)} كم</span>}
              </div>
            </div>
            <button onClick={e => handleSave(e, id)} className="shrink-0 p-1 active:scale-90 transition-transform">
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
            </button>
          </>
        ) : (
          <>
            <div className="relative h-36">
              {img
                ? <img src={img} loading="lazy" className="w-full h-full object-cover" alt={place.name} />
                : <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `${catColor}20` }}>{catEmoji}</div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Badges top-left */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {place.isTrending && (
                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black">🔥 رائج</span>
                )}
                {place.isFoodTruck && (
                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-black">🚚 متجول</span>
                )}
                {place.partnerVenue && place.appDiscount && (
                  <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black">
                    <Percent className="w-2 h-2 inline" /> خصم {place.appDiscount}%
                  </span>
                )}
                {place.groupOffer?.available && (
                  <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-black">
                    <Users className="w-2 h-2 inline" /> عرض جماعي
                  </span>
                )}
              </div>

              {/* Save + list buttons top-right */}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <button onClick={e => handleSave(e, id)} className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowListMenu(prev => prev === id ? null : id); }}
                  className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Rating */}
              {rating !== undefined && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-white text-[10px] font-black">{rating.toFixed(1)}</span>
                </div>
              )}

              {/* Seasonal indicator */}
              {place.seasonalDates && !isSeasonallyActive(place) && (
                <div className="absolute bottom-2 right-2 bg-slate-700/80 px-2 py-0.5 rounded-full">
                  <span className="text-white text-[9px] font-black">موسمي — مغلق</span>
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate">{place.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{place.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {price !== undefined && price > 0 && <span className={`text-[10px] font-bold ${PRICE_COLOR[price]}`}>{PRICE_LABEL[price]}</span>}
                  {accessCfg && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accessCfg.color}`}>{accessCfg.label}</span>}
                </div>
              </div>

              {/* Seasonal date range */}
              {place.seasonalDates?.openDate && (
                <p className="text-[9px] text-orange-500 font-bold mt-1">
                  📅 مفتوح: {place.seasonalDates.openDate} — {place.seasonalDates.closeDate || '...'}
                </p>
              )}

              {/* Tags */}
              <div className="flex gap-1 mt-2 flex-wrap">
                {place.isFamilySuitable && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-black">👨‍👩‍👧</span>}
                {place.gender === 'women_only' && <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full font-black">👩 نسائي</span>}
                {place.hasSportsFacilities && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black">🏅 رياضي</span>}
                {place.cuisineType && <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-black">{place.cuisineType}</span>}
                {inProximity !== null && inProximity < 20 && (
                  <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black">📍 {inProximity.toFixed(1)}km</span>
                )}
                {(place.categoryTags || []).slice(0, 2).map(tag => (
                  <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black">{tag}</span>
                ))}
              </div>
            </div>

            {/* List menu overlay */}
            {isListMenuOpen && (
              <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center gap-2 p-3 z-10" onClick={e => e.stopPropagation()}>
                <p className="text-white text-xs font-black mb-1">أضف إلى قائمة</p>
                {[
                  { id: 'want_to_go' as const, label: 'أريد الذهاب', emoji: '🔖' },
                  { id: 'been_there' as const, label: 'زرته', emoji: '✅' },
                  { id: 'going_again' as const, label: 'سأعود', emoji: '🔁' },
                  { id: 'avoid' as const, label: 'تجنّب', emoji: '🚫' },
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={e => handleAddToList(e, place, l.id)}
                    className="w-full py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1"
                  >
                    {l.emoji} {l.label}
                  </button>
                ))}
                <button onClick={e => { e.stopPropagation(); setShowListMenu(null); }} className="w-full py-1.5 text-white/60 text-[10px]">إلغاء</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-3 flex items-center gap-2 pointer-events-none">
        <div className="flex-1 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3 py-2.5 shadow-md pointer-events-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
            placeholder="ابحث: مطعم، شاطئ، بادل..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 active:scale-90">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-md overflow-hidden pointer-events-auto shrink-0">
          <button onClick={() => setViewMode('map')} className={`p-2.5 transition-all ${viewMode === 'map' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
            <MapIcon className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2.5 transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Category pills ────────────────────────────────────────────── */}
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

      {/* ── Right controls ────────────────────────────────────────────── */}
      <div className="absolute top-28 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Near me */}
        <button
          onClick={handleNearMe}
          disabled={isLocating}
          className="w-10 h-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md flex items-center justify-center text-emerald-600 disabled:opacity-60 active:scale-90 transition-transform"
        >
          {isLocating
            ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            : <Navigation className="w-4 h-4" />
          }
        </button>

        {/* Sort */}
        <button
          onClick={() => {
            const opts: typeof sortBy[] = ['rating', 'price_asc', 'price_desc', 'proximity'];
            const idx = opts.indexOf(sortBy);
            setSortBy(opts[(idx + 1) % opts.length]);
          }}
          className="w-10 h-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
          title={sortBy}
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(v => !v)}
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

      {/* ── Sort badge ────────────────────────────────────────────────── */}
      {sortBy !== 'rating' && (
        <div className="absolute top-28 left-3 z-20 pointer-events-none">
          <div className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-2xl shadow-md">
            {sortBy === 'price_asc' && '↑ الأرخص أولاً'}
            {sortBy === 'price_desc' && '↓ الأغلى أولاً'}
            {sortBy === 'proximity' && '📍 الأقرب أولاً'}
          </div>
        </div>
      )}

      {/* ── Place count (when rating sort) ────────────────────────────── */}
      {sortBy === 'rating' && (
        <div className="absolute top-28 left-3 z-20 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-md px-3 py-2">
            <p className="text-xs font-black text-slate-700">{filtered.length} مكان</p>
          </div>
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────────────── */}
      {showFilters && (
        <div className="absolute top-44 right-3 z-30 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 pointer-events-auto max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-slate-800 text-sm">فلاتر البحث</p>
            <button onClick={resetFilters} className="text-[10px] text-emerald-600 font-black">إعادة ضبط</button>
          </div>

          {/* Sort */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">الترتيب</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: 'rating', label: 'الأعلى تقييماً' },
                { id: 'price_asc', label: '↑ أرخص أولاً' },
                { id: 'price_desc', label: '↓ أغلى أولاً' },
                { id: 'proximity', label: '📍 الأقرب' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as typeof sortBy)}
                  className={`py-1.5 rounded-xl text-[10px] font-black transition-all ${sortBy === opt.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price max */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">السعر الأقصى</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriceMax(filterPriceMax === p ? 4 : p)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterPriceMax < p ? 'bg-slate-50 text-slate-300' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {'$'.repeat(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Min rating */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">أدنى تقييم</p>
            <div className="flex gap-1">
              {[0, 3, 4, 4.5].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterMinRating(r)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterMinRating === r ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {r === 0 ? 'الكل' : `${r}+★`}
                </button>
              ))}
            </div>
          </div>

          {/* Access type */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">نوع الدخول</p>
            <div className="flex gap-1">
              {[{ id: '', label: 'الكل' }, { id: 'free', label: 'مجاني' }, { id: 'ticketed', label: 'بتذكرة' }, { id: 'entry_fee', label: 'رسوم' }].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterAccessType(opt.id)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterAccessType === opt.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender filter */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">الفئة المستهدفة</p>
            <div className="flex gap-1">
              {[{ id: '', label: 'الكل' }, { id: 'women_only', label: '👩 نسائي' }, { id: 'mixed', label: '👥 مختلط' }].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilterGender(opt.id)}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all ${filterGender === opt.id ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle switches */}
          {[
            { label: '👨‍👩‍👧 عائلي فقط', value: filterFamilyOnly, set: setFilterFamilyOnly },
            { label: '🚚 فود ترك فقط', value: filterFoodTruck, set: setFilterFoodTruck },
            { label: '🕒 مفتوح الآن',   value: filterOpenNow,   set: setFilterOpenNow   },
            { label: '👥 عروض جماعية', value: filterGroupOffer, set: setFilterGroupOffer },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-black text-slate-700">{item.label}</p>
              <button
                onClick={() => item.set(v => !v)}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative ${item.value ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${item.value ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Cost-effective family deals banner (list view) ────────────── */}
      {viewMode === 'list' && familyDeals.length > 0 && (filterFamilyOnly || activeCategory === '') && (
        <div className="absolute top-36 left-0 right-0 z-20 px-3 pointer-events-none">
          <div className="bg-emerald-600 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-md pointer-events-auto">
            <span className="text-lg">💡</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[10px] font-black">خيارات عائلية اقتصادية</p>
              <p className="text-white/70 text-[9px] truncate">{familyDeals.map(p => p.name).join(' • ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAP VIEW ─────────────────────────────────────────────────── */}
      <div className={`absolute inset-0 ${viewMode === 'list' ? 'hidden' : ''}`}>
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full outline-none" />

        {!selectedItem && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-black text-slate-500 shadow-md border border-slate-100">
              📍 اضغط على الأيقونة للاستكشاف
            </span>
          </div>
        )}

        {/* Bottom sheet */}
        {showBottomSheet && selectedItem && (
          <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-24">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اضغط للتفاصيل</p>
                <button onClick={() => setShowBottomSheet(false)} className="p-1.5 bg-slate-100 rounded-full active:scale-90">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
              <div className="px-3 pb-3">
                <PlaceCard place={selectedItem} compact />
              </div>
              <div className="px-3 pb-4">
                <button
                  onClick={() => onOpenPlace(selectedItem)}
                  className="w-full py-3 bg-emerald-600 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform shadow-md shadow-emerald-200"
                >
                  عرض التفاصيل الكاملة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── LIST VIEW ────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div
          ref={listRef}
          className={`absolute inset-0 overflow-y-auto pb-24 px-3 bg-slate-50 ${familyDeals.length > 0 ? 'pt-52' : 'pt-36'}`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center pt-20">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center pt-20">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-black text-slate-500">لا توجد أماكن</p>
              <p className="text-xs text-slate-400 mt-1">جرب تغيير الفلاتر أو الفئة</p>
              <button onClick={resetFilters} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-2xl active:scale-95">
                إعادة الضبط
              </button>
            </div>
          ) : (
            <div className="relative">
              {/* Food trucks trending section */}
              {(activeCategory === '' || activeCategory === 'food_truck') && filtered.some(p => p.isFoodTruck && p.isTrending) && (
                <div className="mb-4">
                  <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                    🔥 فود ترك رائج الآن
                  </p>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {filtered.filter(p => p.isFoodTruck && p.isTrending).map(p => (
                      <div key={p._id || p.id} className="shrink-0 w-40">
                        <PlaceCard place={p} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {filtered.map(p => (
                  <div key={p._id || p.id || p.name} className="relative">
                    <PlaceCard place={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Place Detail Modal */}
      {selectedItem && (
        <PlaceDetailModal
          place={selectedItem}
          onClose={() => { setSelectedItem(null); setShowBottomSheet(false); }}
          t={t}
        />
      )}
    </div>
  );
};
