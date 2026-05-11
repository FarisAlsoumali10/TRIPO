// frontend/src/screens/ExploreScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation, Search, List, Map as MapIcon, X, Star, Clock,
  SlidersHorizontal, Heart, ArrowUpDown, Users, CheckCircle2,
  Percent, Tag, Bookmark, Info, LayoutGrid, ChevronRight,
} from 'lucide-react';
import { Place } from '../types/index';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { Skeleton, SafeImage } from '../components/ui';
import { useGeolocation } from '../hooks/useGeolocation';

import { addPlaceToList } from './PersonalListsScreen';

const TripMap = React.lazy(() => import('../components/TripMap'));

const getCategories = (isRTL: boolean) => [
  { id: '',           label: isRTL ? 'الكل'        : 'All',           emoji: '🌍', color: '#1a1a1a' },
  { id: 'nature',     label: isRTL ? 'طبيعة'       : 'Nature',        emoji: '🌿', color: '#10b981' },
  { id: 'sports',     label: isRTL ? 'رياضة'       : 'Sports',        emoji: '⚽', color: '#3b82f6' },
  { id: 'restaurant', label: isRTL ? 'مطاعم'       : 'Restaurants',   emoji: '🍽️', color: '#f97316' },
  { id: 'cafe',       label: isRTL ? 'مقاهي'       : 'Cafés',         emoji: '☕', color: '#92400e' },
  { id: 'park',       label: isRTL ? 'حدائق'       : 'Parks',         emoji: '🌳', color: '#22c55e' },
  { id: 'beach',      label: isRTL ? 'شواطئ'       : 'Beaches',       emoji: '🏖️', color: '#0ea5e9' },
  { id: 'heritage',   label: isRTL ? 'تراث'        : 'Heritage',      emoji: '🏛️', color: '#d97706' },
  { id: 'tours',      label: isRTL ? 'جولات'       : 'Tours',         emoji: '🧭', color: '#8b5cf6' },
  { id: 'shopping',   label: isRTL ? 'تسوق'        : 'Shopping',      emoji: '🛍️', color: '#ec4899' },
  { id: 'chalet',     label: isRTL ? 'شاليهات'     : 'Chalets',       emoji: '🏕️', color: '#64748b' },
  { id: 'food_truck', label: isRTL ? 'فود ترك'     : 'Food Trucks',   emoji: '🚚', color: '#f59e0b' },
];

const CAT_COLOR: Record<string, string> = {
  '': '#1a1a1a',
  'nature': '#10b981',
  'sports': '#3b82f6',
  'restaurant': '#f97316',
  'cafe': '#92400e',
  'park': '#22c55e',
  'beach': '#0ea5e9',
  'heritage': '#d97706',
  'tours': '#8b5cf6',
  'shopping': '#ec4899',
  'chalet': '#64748b',
  'food_truck': '#f59e0b',
};

const CAT_EMOJI: Record<string, string> = {
  '': '🌍',
  'nature': '🌿',
  'sports': '⚽',
  'restaurant': '🍽️',
  'cafe': '☕',
  'park': '🌳',
  'beach': '🏖️',
  'heritage': '🏛️',
  'tours': '🧭',
  'shopping': '🛍️',
  'chalet': '🏕️',
  'food_truck': '🚚',
};

function getCategoryId(place: Place): string {
  const tags = (place.categoryTags || []).map(t => t.toLowerCase());
  const cat = (place.category || '').toLowerCase();
  const all = [...tags, cat];
  for (const c of Object.keys(CAT_COLOR)) {
    if (all.some(t => t.includes(c) || c.includes(t))) return c;
  }
  if (all.some(t => ['food', 'طعام', 'مطعم'].includes(t))) return 'restaurant';
  if (all.some(t => ['nature', 'طبيعة'].includes(t))) return 'nature';
  return '';
}

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const getAccessConfig = (isRTL: boolean) => ({
  free:      { label: isRTL ? 'مجاني'     : 'Free',      color: 'bg-oasis-spring/15 text-oasis-spring border border-oasis-spring/20' },
  ticketed:  { label: isRTL ? 'بتذكرة'    : 'Ticketed',  color: 'bg-blue-500/15 text-blue-300 border border-blue-500/20' },
  entry_fee: { label: isRTL ? 'رسوم دخول' : 'Entry Fee', color: 'bg-karam/15 text-karam border border-karam/20' },
});

const getPriceLabel = (isRTL: boolean) =>
  isRTL ? ['', 'مجاني', 'اقتصادي', 'متوسط', 'فاخر'] : ['', 'Free', 'Budget', 'Mid-range', 'Premium'];

const PRICE_COLOR = ['', 'text-oasis-spring', 'text-oasis-deep', 'text-karam', 'text-waypoint'];

const PlaceCard = ({
  place,
  compact = false,
  isRTL,
  savedIds,
  handleSaveToggle,
  showListMenu,
  setShowListMenu,
  userPos,
  selectedItem,
  setSelectedItem,
  viewMode,
  setShowBottomSheet,
  handleAddToList,
  onOpenPlace,
}: {
  place: Place;
  compact?: boolean;
  isRTL: boolean;
  savedIds: Set<string>;
  handleSaveToggle: (e: React.MouseEvent, id: string) => void;
  showListMenu: string | null;
  setShowListMenu: React.Dispatch<React.SetStateAction<string | null>>;
  userPos: { lat: number; lng: number } | null;
  selectedItem: Place | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<Place | null>>;
  viewMode: string;
  setShowBottomSheet: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddToList: (e: React.MouseEvent, place: Place, listId: import('../types/index').PersonalListType) => void;
  onOpenPlace?: (p: Place) => void;
  key?: React.Key;
}) => {
  const id = place._id || place.id || '';
  const img = place.photos?.[0] || place.image;
  const rating = place.ratingSummary?.avgRating ?? place.rating;
  const price = place.priceRange;
  const isSaved = savedIds.has(id);
  const tags = (place.categoryTags || []).map(t => t.toLowerCase());
  const cat = (place.category || '').toLowerCase();
  const all = [...tags, cat];
  let catId = '';
  for (const c of ['nature', 'sports', 'restaurant', 'cafe', 'park', 'beach', 'heritage', 'tours', 'shopping', 'chalet', 'food_truck']) {
    if (all.some(t => t.includes(c) || c.includes(t))) { catId = c; break; }
  }
  const catEmoji = CAT_EMOJI[catId] || '📍';
  const accessCfg = place.accessType ? getAccessConfig(isRTL)[place.accessType as 'free' | 'ticketed' | 'entry_fee'] : null;
  const PRICE_LABEL = getPriceLabel(isRTL);
  const isListMenuOpen = showListMenu === id;

  const distKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const inProximity = userPos && place.coordinates
    ? distKm(userPos.lat, userPos.lng, place.coordinates.lat, place.coordinates.lng)
    : null;

  const pName = isRTL && (place as any).nameAr ? (place as any).nameAr : place.name;
  const pCity = isRTL && (place as any).cityAr ? (place as any).cityAr : place.city;

  return (
    <div
      id={`place-card-${id}`}
      onClick={() => {
        setSelectedItem(place);
        if (viewMode === 'map') {
          setShowBottomSheet(true);
        } else if (viewMode === 'list' && onOpenPlace) {
          onOpenPlace(place);
        }
      }}
      className={`bg-slate-50 dark:bg-chamber rounded-[1.75rem] border border-slate-100 dark:border-white/10 shadow-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-all ${(selectedItem?._id === id || selectedItem?.id === id) ? 'ring-2 ring-oasis-spring' : ''} ${compact ? 'flex gap-3 p-3' : ''}`}
    >
      {compact ? (
        <>
          <div className="relative w-20 h-20 shrink-0">
            <SafeImage
              src={img}
              className="w-full h-full rounded-2xl object-cover"
              alt={pName}
              fallbackType="placeholder"
              seed={pName}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-slate-900 dark:text-white text-sm truncate uppercase tracking-tight">{pName}</p>
              <button onClick={e => handleSaveToggle(e, id)} className="p-1">
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-300 dark:text-moon/20'}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-moon/60 font-bold uppercase tracking-widest mt-0.5">{pCity}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {rating !== undefined && <span className="flex items-center gap-1 text-[10px] font-black text-amber-500"><Star className="w-2.5 h-2.5 fill-amber-500" />{rating.toFixed(1)}</span>}
              {price !== undefined && price > 0 && <span className={`text-[10px] font-black ${PRICE_COLOR[price]}`}>{PRICE_LABEL[price]}</span>}
              {inProximity !== null && inProximity < 50 && <span className="text-[10px] text-blue-400 font-black tracking-tighter">📍 {inProximity.toFixed(1)} KM</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative h-44">
            <SafeImage
              src={img}
              className="w-full h-full object-cover"
              alt={place.name}
              fallbackType="placeholder"
              seed={place.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-midnight/80 via-transparent to-transparent" />

            <div className="absolute top-3 start-3 flex flex-col gap-1.5">
              {place.isTrending && (
                <span className="text-[9px] bg-red-500/80 backdrop-blur-md text-white px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg">🔥 RATING</span>
              )}
              {place.isFamilySuitable && (
                <span className="text-[9px] bg-oasis-spring/80 backdrop-blur-md text-midnight px-2 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg">👨‍👩‍👧 FAMILY</span>
              )}
            </div>

            <div className="absolute top-3 end-3 flex flex-col gap-2">
              <button onClick={e => handleSaveToggle(e, id)} className="w-9 h-9 bg-white/60 dark:bg-midnight/60 backdrop-blur-md border border-slate-200/20 dark:border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-white/60'}`} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowListMenu(prev => prev === id ? null : id); }}
                className="w-9 h-9 bg-white/60 dark:bg-midnight/60 backdrop-blur-md border border-slate-200/20 dark:border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              >
                <Bookmark className="w-4 h-4 text-slate-600 dark:text-white/60" />
              </button>
            </div>

            <div className="absolute bottom-3 start-3 flex items-center gap-1.5 bg-white/60 dark:bg-midnight/60 backdrop-blur-md border border-slate-200/20 dark:border-white/10 px-2.5 py-1 rounded-xl">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-slate-900 dark:text-white text-[10px] font-black">{rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-chamber">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tighter truncate">{pName}</p>
                <p className="text-[10px] text-slate-400 dark:text-moon/50 font-bold uppercase tracking-[0.2em] mt-1">{pCity}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {price !== undefined && price > 0 && <span className={`text-[10px] font-black ${PRICE_COLOR[price]} uppercase tracking-widest`}>{PRICE_LABEL[price]}</span>}
                {accessCfg && <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${accessCfg.color} uppercase tracking-widest`}>{accessCfg.label}</span>}
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              {inProximity !== null && inProximity < 20 && (
                <span className="text-[10px] bg-blue-500/10 text-blue-500 dark:text-blue-400 px-2 py-1 rounded-lg font-black border border-blue-500/20 uppercase tracking-tighter">📍 {inProximity.toFixed(1)} KM</span>
              )}
              {(place.categoryTags || []).slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] bg-slate-100 dark:bg-lifted text-slate-500 dark:text-moon/60 px-2 py-1 rounded-lg font-black border border-slate-200/10 dark:border-white/5 uppercase tracking-widest">{tag}</span>
              ))}
            </div>
          </div>

          {isListMenuOpen && (
            <div className="absolute inset-0 bg-white/90 dark:bg-midnight/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center gap-3 p-6 z-10" onClick={e => e.stopPropagation()}>
              <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-[0.2em] mb-2">{isRTL ? 'إضافة إلى القائمة' : 'Add to List'}</p>
              {[
                { id: 'want_to_go' as const, label: isRTL ? 'أريد الذهاب' : 'Want to Go', emoji: '🔖' },
                { id: 'been_there' as const, label: isRTL ? 'زرته' : 'Been There', emoji: '✅' },
                { id: 'going_again' as const, label: isRTL ? 'سأعود' : 'Going Again', emoji: '🔁' },
                { id: 'avoid' as const, label: isRTL ? 'تجنّب' : 'Avoid', emoji: '🚫' },
              ].map(l => (
                <button
                  key={l.id}
                  onClick={e => handleAddToList(e, place, l.id)}
                  className="w-full py-3 bg-slate-50/50 dark:bg-lifted/50 hover:bg-slate-100 dark:hover:bg-lifted text-slate-900 dark:text-white text-xs font-black rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center gap-3 transition-all"
                >
                  <span className="text-lg">{l.emoji}</span> {l.label.toUpperCase()}
                </button>
              ))}
              <button onClick={e => { e.stopPropagation(); setShowListMenu(null); }} className="mt-2 text-slate-400 dark:text-moon/40 text-[10px] font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors">{isRTL ? 'إلغاء' : 'CANCEL'}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
export const ExploreScreen = ({ t, onOpenPlace, lang = 'en', initialNearMe = false, onNearMeHandled }: {
  t: any;
  onOpenPlace: (p: Place) => void;
  lang?: 'en' | 'ar';
  initialNearMe?: boolean;
  onNearMeHandled?: () => void;
}) => {
  const isRTL = lang === 'ar';
  const CATEGORIES = useMemo(() => getCategories(isRTL), [isRTL]);

  const placeName = (p: Place) =>
    isRTL && (p as any).nameAr ? (p as any).nameAr : p.name;

  const placeCity = (p: Place) =>
    isRTL && (p as any).cityAr ? (p as any).cityAr : p.city;

  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [viewMode, setViewMode] = useState<'tiles' | 'map' | 'list'>('tiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showListMenu, setShowListMenu] = useState<string | null>(null);

  // Geolocation Hook
  const { position: geoPosition, loading: geoLoading, error: geoError, getLocation } = useGeolocation();
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (geoPosition) {
      setUserPos(geoPosition);
      setSortBy('proximity');
    }
  }, [geoPosition]);

  // Filters
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(4);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterFamilyOnly, setFilterFamilyOnly] = useState(false);
  const [filterTrending, setFilterTrending] = useState(false);
  const [filterAccessType, setFilterAccessType] = useState<string>('');
  const [filterFoodTruck, setFilterFoodTruck] = useState(false);
  const [filterGender, setFilterGender] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'proximity'>('rating');
  const [filterGroupOffer, setFilterGroupOffer] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const [placesRes, savedRes] = await Promise.allSettled([
          placeAPI.getPlaces(),
          token ? placeAPI.getSavedPlaces() : Promise.resolve([])
        ]);

        if (!isMounted) return;

        if (placesRes.status === 'fulfilled') {
          const arr = Array.isArray(placesRes.value) ? placesRes.value : [];
          setPlaces(arr);
        }

        if (savedRes.status === 'fulfilled') {
          setSavedIds(new Set(savedRes.value || []));
        }

      } catch (e) {
        if (isMounted) showToast('Failed to load places', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealData();
    return () => { isMounted = false; };
  }, []);

  function isOpenNow(p: Place): boolean | null {
    if (!p.openingHours) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[new Date().getDay()];
    const h = p.openingHours[day] || p.openingHours['everyday'];
    if (!h || h.closed) return false;
    const [oh, om] = h.open.split(':').map(Number);
    const [ch, cm] = h.close.split(':').map(Number);
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    const open = oh * 60 + om, close = ch * 60 + cm;
    if (close < open) return now >= open || now < close;
    return now >= open && now < close;
  }

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

      if (filterOpenNow && isOpenNow(p) === false) return false;
      if (filterFamilyOnly && !p.isFamilySuitable) return false;
      if (filterTrending && !p.isTrending) return false;
      if (filterAccessType && p.accessType !== filterAccessType) return false;
      if (filterFoodTruck && !p.isFoodTruck) return false;
      if (filterGender && p.gender && p.gender !== filterGender) return false;
      if (filterGroupOffer && !p.groupOffer?.available) return false;

      return true;
    });

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
    filterFamilyOnly, filterTrending, filterAccessType, filterFoodTruck, filterGender, filterGroupOffer,
    sortBy, userPos]);

  const smartCounts = useMemo(() => ({
    open: places.filter(p => isOpenNow(p) === true).length,
    trending: places.filter(p => p.isTrending).length,
    family: places.filter(p => p.isFamilySuitable).length,
    near: userPos
      ? places.filter(p => {
          const lat = p.coordinates?.lat ?? p.lat ?? 24.7136;
          const lng = p.coordinates?.lng ?? p.lng ?? 46.6753;
          return distKm(userPos.lat, userPos.lng, lat, lng) < 20;
        }).length
      : null,
  }), [places, userPos]);



  useEffect(() => {
    if (!initialNearMe) return;
    onNearMeHandled?.();
    getLocation();
    setViewMode('map');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!id) return;

    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast(isRTL ? 'تمت الإزالة من المحفوظات' : 'Removed from saved', 'success');
      } else {
        next.add(id);
        showToast(isRTL ? 'تم الحفظ!' : 'Saved!', 'success');
      }
      return next;
    });

    try {
      await placeAPI.toggleSavedPlace(id);
    } catch (err) {
      showToast(isRTL ? 'حدث خطأ أثناء المزامنة' : 'Sync failed, please try again', 'error');
      setSavedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
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
    showToast(isRTL ? 'تمت الإضافة للقائمة ✓' : 'Added to list ✓', 'success');
    setShowListMenu(null);
  };

  const activeFiltersCount = [
    filterMinRating > 0, filterPriceMax < 4, filterOpenNow, filterFamilyOnly, filterTrending,
    !!filterAccessType, filterFoodTruck, !!filterGender, filterGroupOffer,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterMinRating(0); setFilterPriceMax(4); setFilterOpenNow(false);
    setFilterFamilyOnly(false); setFilterTrending(false); setFilterAccessType(''); setFilterFoodTruck(false);
    setFilterGender(''); setFilterGroupOffer(false); setSortBy('rating');
  };


  return (
    <div className="h-full flex flex-col bg-white dark:bg-midnight relative transition-colors duration-500 no-scrollbar overflow-x-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute top-0 start-0 end-0 z-20 px-4 pt-4 flex items-center gap-3 pointer-events-none">
        <div className="flex-1 flex items-center gap-3 bg-white/80 dark:bg-chamber/80 backdrop-blur-xl border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3.5 shadow-2xl pointer-events-auto transition-all focus-within:bg-white dark:focus-within:bg-chamber focus-within:ring-2 focus-within:ring-oasis-spring/30">
          <Search className="w-5 h-5 text-slate-400 dark:text-moon shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-moon/40 outline-none font-black uppercase tracking-widest"
            placeholder={isRTL ? 'بحث...' : 'Search...'}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (e.target.value && viewMode === 'tiles') setViewMode('list'); }}
          />
        </div>

        <div className="flex bg-white/80 dark:bg-chamber/80 backdrop-blur-xl border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto shrink-0">
          {[
            { id: 'tiles', icon: LayoutGrid },
            { id: 'map', icon: MapIcon },
            { id: 'list', icon: List }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => { setViewMode(btn.id as any); if (btn.id === 'tiles') setActiveCategory(''); }}
              className={`p-3.5 transition-all duration-300 ${viewMode === btn.id ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'text-slate-400 dark:text-moon/40 hover:bg-slate-50 dark:hover:bg-navy-900/5'}`}
            >
              <btn.icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Category pills ────────────────────────────────────────────── */}
      {viewMode !== 'tiles' && (
        <div className="absolute top-20 start-0 end-0 z-20 pointer-events-none">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-4 pt-1 pointer-events-auto">
            <button
              onClick={() => { setViewMode('tiles'); setActiveCategory(''); }}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black bg-white dark:bg-chamber border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            >
              <ChevronRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
              {isRTL ? 'الفئات' : 'Categories'}
            </button>

            {[
              { id: 'trend', icon: '🔥', label: isRTL ? 'رائج' : 'Trending', on: filterTrending, set: setFilterTrending, bg: 'bg-red-500' },
              { id: 'open', icon: '🕒', label: isRTL ? 'مفتوح' : 'Open', on: filterOpenNow, set: setFilterOpenNow, bg: 'bg-oasis-spring' },
              { id: 'fam', icon: '👨‍👩‍👧', label: isRTL ? 'عائلي' : 'Family', on: filterFamilyOnly, set: setFilterFamilyOnly, bg: 'bg-purple-500' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => { pill.set(v => !v); setViewMode('list'); }}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black border uppercase tracking-widest transition-all active:scale-95 shadow-xl ${pill.on ? `${pill.bg} text-midnight border-transparent shadow-lg` : 'bg-white/80 dark:bg-chamber/80 backdrop-blur-xl text-slate-500 dark:text-moon border-slate-100 dark:border-white/10'}`}
              >
                <span>{pill.icon}</span> {pill.label}
              </button>
            ))}

            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); if (cat.id !== '') setViewMode('map'); }}
                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black border uppercase tracking-widest transition-all active:scale-95 shadow-xl ${activeCategory === cat.id ? 'text-white border-transparent' : 'bg-white/80 dark:bg-chamber/80 backdrop-blur-xl text-slate-500 dark:text-moon border-slate-100 dark:border-white/10'}`}
                style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Control Buttons (Floating) ─────────────────────────────────── */}
      {viewMode !== 'tiles' && (
        <div className="absolute top-36 end-4 z-20 flex flex-col gap-3 pointer-events-auto">
          <div className="flex flex-col items-center">
            <button 
              onClick={() => { getLocation(); setViewMode('map'); }} 
              disabled={geoLoading}
              className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-100 dark:border-white/10 ${geoLoading ? 'bg-slate-300 dark:bg-slate-700 text-slate-500' : 'bg-oasis-spring text-midnight shadow-mint-glow hover:bg-oasis-spring/90'}`}
            >
              {geoLoading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
            </button>
            
            {/* عرض رسالة الخطأ إن وجدت أسفل الزر */}
            {geoError && (
              <div className="absolute top-full mt-2 w-32 bg-red-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg text-center shadow-lg pointer-events-none">
                {geoError}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all relative border border-slate-100 dark:border-white/10 ${showFilters ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-white/80 dark:bg-chamber/80 backdrop-blur-xl text-slate-400 dark:text-moon hover:bg-slate-50 dark:hover:bg-navy-900/5'}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -end-1 w-5 h-5 bg-oasis-spring text-midnight text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-midnight">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Main View Area ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <div className="w-full h-full">
            <React.Suspense fallback={<div className="w-full h-full bg-midnight animate-pulse" />}>
              <TripMap
                places={(filtered ?? []).filter((p: any) => {
                  // Support both location.coordinates[] and coordinates.lat/lng formats
                  return p?.location?.coordinates?.length === 2 ||
                    (p?.coordinates?.lat != null && p?.coordinates?.lng != null) ||
                    (p?.lat != null && p?.lng != null);
                })}
                userPos={userPos}
                selectedPlace={selectedItem}
                onMarkerPress={(p) => { setSelectedItem(p); setShowBottomSheet(true); }}
                onMapPress={() => setShowBottomSheet(false)}
              />
            </React.Suspense>
          </div>
        ) : viewMode === 'list' ? (
          <div className="w-full h-full overflow-y-auto pt-36 pb-24 px-4 space-y-4 no-scrollbar">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[1.75rem]" />)
            ) : filtered.length > 0 ? (
              filtered.map(p => (
                <PlaceCard 
                  key={p._id ?? p.id} 
                  place={p} 
                  isRTL={isRTL}
                  savedIds={savedIds}
                  handleSaveToggle={handleSaveToggle}
                  showListMenu={showListMenu}
                  setShowListMenu={setShowListMenu}
                  userPos={userPos}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  viewMode={viewMode}
                  setShowBottomSheet={setShowBottomSheet}
                  handleAddToList={handleAddToList}
                  onOpenPlace={onOpenPlace}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-lifted rounded-full flex items-center justify-center mb-6 text-4xl shadow-xl">🏝️</div>
                <p className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-widest">{isRTL ? 'لا توجد نتائج' : 'No places found'}</p>
                <p className="text-slate-400 dark:text-moon/40 text-xs font-bold mt-2 uppercase tracking-widest">{isRTL ? 'جرب تغيير معايير البحث' : 'Try adjusting your filters'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto pt-24 pb-32 px-4 no-scrollbar bg-white dark:bg-midnight">
            <div className="grid grid-cols-2 gap-4">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
              ) : (
                CATEGORIES.map(cat => {
                  const count = places.filter(p => getCategoryId(p) === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setViewMode('map'); }}
                      className="h-44 rounded-[2rem] bg-slate-50 dark:bg-chamber border border-slate-100 dark:border-white/5 overflow-hidden relative group active:scale-95 transition-all shadow-xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-5 start-5 text-4xl grayscale group-hover:grayscale-0 transition-all duration-500">
                        {cat.emoji}
                      </div>
                      <div className="absolute bottom-5 start-5 text-start">
                        <p className="text-slate-900 dark:text-white font-black text-lg tracking-tighter uppercase leading-tight">{cat.label}</p>
                        <p className="text-slate-400 dark:text-moon/40 text-[9px] font-black uppercase tracking-widest mt-1">{count} ITEMS</p>
                      </div>
                      <div className="absolute top-5 end-5 w-8 h-8 rounded-full bg-white dark:bg-lifted border border-slate-100 dark:border-white/5 flex items-center justify-center text-oasis-spring opacity-0 group-hover:opacity-100 transition-all shadow-md">
                        <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Sheet (for Map View) ────────────────────────────────── */}
      {viewMode === 'map' && selectedItem && showBottomSheet && (
        <div className="absolute bottom-0 start-0 end-0 z-50 p-4 animate-in slide-in-from-bottom-full duration-500">
          <div className="bg-white/95 dark:bg-chamber/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-5 relative overflow-hidden group">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-navy-900/10 rounded-full" />
            <div className="mt-4">
              <PlaceCard 
                place={selectedItem} 
                compact 
                isRTL={isRTL}
                savedIds={savedIds}
                handleSaveToggle={handleSaveToggle}
                showListMenu={showListMenu}
                setShowListMenu={setShowListMenu}
                userPos={userPos}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                viewMode={viewMode}
                setShowBottomSheet={setShowBottomSheet}
                handleAddToList={handleAddToList}
              />
              <button
                onClick={() => onOpenPlace(selectedItem)}
                className="w-full mt-5 py-4 bg-oasis-spring text-midnight rounded-2xl font-black text-xs uppercase tracking-widest shadow-mint-glow active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isRTL ? 'عرض التفاصيل الكاملة' : 'View Full Details'} <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Screen Filters Modal ─────────────────────────────────── */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-midnight/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-chamber border border-slate-100 dark:border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[80vh] no-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tighter uppercase">{isRTL ? 'الفلاتر' : 'Filters'}</h3>
              <button onClick={() => setShowFilters(false)} className="w-10 h-10 bg-slate-50 dark:bg-lifted rounded-full flex items-center justify-center border border-slate-100 dark:border-white/5">
                <X className="w-5 h-5 text-slate-400 dark:text-moon" />
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-[0.2em] mb-4">SORT BY</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'rating', label: isRTL ? 'الأعلى تقييماً' : 'RATING' },
                    { id: 'proximity', label: isRTL ? 'الأقرب' : 'NEARBY' },
                    { id: 'price_asc', label: isRTL ? 'الأرخص' : 'LOW PRICE' },
                    { id: 'price_desc', label: isRTL ? 'الأغلى' : 'HIGH PRICE' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as any)}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${sortBy === opt.id ? 'bg-oasis-spring text-midnight border-oasis-spring' : 'bg-slate-50 dark:bg-lifted text-slate-400 dark:text-moon/60 border-slate-100 dark:border-white/5'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-[0.2em] mb-4">PRICE LIMIT</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPriceMax(p)}
                      className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all border ${filterPriceMax === p ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow' : 'bg-slate-50 dark:bg-lifted text-slate-400 dark:text-moon/60 border-slate-100 dark:border-white/5'}`}
                    >
                      {'$'.repeat(p)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                {[
                  { label: isRTL ? 'مفتوح الآن' : 'OPEN NOW', val: filterOpenNow, set: setFilterOpenNow, icon: Clock },
                  { label: isRTL ? 'مناسب للعائلة' : 'FAMILY SUITABLE', val: filterFamilyOnly, set: setFilterFamilyOnly, icon: Users },
                  { label: isRTL ? 'رائج' : 'TRENDING', val: filterTrending, set: setFilterTrending, icon: Star },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => item.set(v => !v)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-lifted/30 rounded-2xl border border-slate-100 dark:border-white/5 group active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-5 h-5 ${item.val ? 'text-oasis-spring' : 'text-slate-200 dark:text-moon/20'}`} />
                      <span className={`text-[11px] font-black uppercase tracking-widest ${item.val ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-moon/40'}`}>{item.label}</span>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-all duration-500 relative border border-slate-200 dark:border-white/10 ${item.val ? 'bg-oasis-spring' : 'bg-slate-200 dark:bg-midnight'}`}>
                      <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-navy-900 rounded-full shadow-lg transition-all duration-500 ${item.val ? (isRTL ? 'left-0.5' : 'right-0.5') : (isRTL ? 'right-0.5' : 'left-0.5')}`} />
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={resetFilters}
                className="w-full py-4 bg-slate-50 dark:bg-navy-900/5 text-slate-400 dark:text-moon/60 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {isRTL ? 'إعادة تعيين' : 'RESET ALL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExploreScreen;