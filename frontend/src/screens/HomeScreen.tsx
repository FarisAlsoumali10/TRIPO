import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, Clock, MapPin, Camera, Plus, ChevronRight, ChevronLeft,
  Sparkles, Search, Calendar, Tent, Mountain, Utensils, Waves,
  Landmark, Compass, Users,
} from 'lucide-react';
import { User, Itinerary, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI, communityAPI, eventAPI } from '../services/api';
import { SkeletonCard, SkeletonList } from '../components/ui';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

// ── Module-scope constants (never recreated) ──────────────────────────────────

const CATEGORY_KEYS = ['All', 'Nature', 'Heritage', 'Adventure', 'Food', 'Urban', 'Beach', 'Desert'];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  All: Compass, Nature: Mountain, Heritage: Landmark,
  Adventure: Sparkles, Food: Utensils, Urban: MapPin,
  Beach: Waves, Desert: Tent,
};

// Normalize backend event to expected shape
function normalizeEvent(e: any) {
  return {
    ...e,
    startDate: e.startDate ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    endDate: e.endDate ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    image: e.image ?? e.coverImage ?? '',
    isFree: e.isFree ?? false,
  };
}

// Fallbacks — only used when API fails
const FALLBACK_PLACES: Place[] = [];
const FALLBACK_TOURS: Tour[] = [];
const FALLBACK_RENTALS: Rental[] = [];
const FALLBACK_COMMUNITIES: any[] = [];
const FALLBACK_EVENTS: any[] = [];

// Keep MOCK_PLACES export for other screens that import it
export const MOCK_PLACES: Place[] = [
  {
    id: 'mp-1', name: 'Edge of the World', city: 'Riyadh',
    description: 'Dramatic escarpment with panoramic desert views stretching to the horizon.',
    categoryTags: ['Nature', 'Adventure'],
    photos: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    ],
    ratingSummary: { avgRating: 4.9, reviewCount: 312 },
  },
  {
    id: 'mp-2', name: 'Al-Turaif District', city: 'Riyadh',
    description: 'UNESCO World Heritage Site — birthplace of the Saudi state.',
    categoryTags: ['Heritage', 'Cultural'],
    photos: ['https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=800&q=80'],
    ratingSummary: { avgRating: 4.8, reviewCount: 198 },
  },
  {
    id: 'mp-3', name: 'Hegra (Madain Saleh)', city: 'AlUla',
    description: 'Ancient Nabataean city with monumental rock-cut tombs.',
    categoryTags: ['Heritage', 'Desert'],
    photos: ['https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=800&q=80'],
    ratingSummary: { avgRating: 4.9, reviewCount: 427 },
  },
  {
    id: 'mp-4', name: 'Al-Balad Historic District', city: 'Jeddah',
    description: 'UNESCO-listed old town with coral-stone buildings and traditional souqs.',
    categoryTags: ['Heritage', 'Urban'],
    photos: ['https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&q=80'],
    ratingSummary: { avgRating: 4.7, reviewCount: 283 },
  },
  {
    id: 'mp-5', name: 'Aseer National Park', city: 'Abha',
    description: 'Green mountain forests, wildlife, and cool highland air.',
    categoryTags: ['Nature', 'Adventure'],
    photos: ['https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=800&q=80'],
    ratingSummary: { avgRating: 4.8, reviewCount: 156 },
  },
  {
    id: 'mp-6', name: 'Red Sea Coral Reefs', city: 'Jeddah',
    description: 'World-class snorkelling and diving in crystal-clear Red Sea waters.',
    categoryTags: ['Beach', 'Nature'],
    photos: ['https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80'],
    ratingSummary: { avgRating: 4.9, reviewCount: 341 },
  },
  {
    id: 'mp-7', name: 'Souq Al-Zal', city: 'Riyadh',
    description: 'Bustling traditional market with antiques, spices, and local crafts.',
    categoryTags: ['Urban', 'Food'],
    photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80'],
    ratingSummary: { avgRating: 4.5, reviewCount: 89 },
  },
  {
    id: 'mp-8', name: 'Wadi Disah', city: 'Tabuk',
    description: 'Lush canyon oasis cutting through towering sandstone cliffs.',
    categoryTags: ['Nature', 'Desert'],
    photos: ['https://images.unsplash.com/photo-1547234935-80c7145ec969?w=800&q=80'],
    ratingSummary: { avgRating: 4.8, reviewCount: 122 },
  },
];

// ── City hero lookup ──────────────────────────────────────────────────────────

const CITY_LANDMARKS: Record<string, { url: string; label: string }> = {
  riyadh: { url: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200', label: 'Kingdom Centre Tower, Riyadh' },
  jeddah: { url: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200', label: 'Al-Balad Historic District, Jeddah' },
  mecca: { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  makkah: { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  medina: { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  madinah: { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  alula: { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  'al ula': { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  abha: { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Asir Mountains, Abha' },
  tabuk: { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Wadi Disah, Tabuk' },
  dammam: { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Dammam Corniche' },
  khobar: { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  'al khobar': { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  yanbu: { url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200', label: 'Red Sea Coast, Yanbu' },
  taif: { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Al Hada Mountains, Taif' },
  neom: { url: 'https://images.unsplash.com/photo-1596008194705-f0ff3d2c95a2?w=1200', label: 'NEOM, Tabuk Province' },
  hail: { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Qishla Palace, Hail' },
  najran: { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Najran Fort' },
};

const FALLBACK_HERO = {
  url: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200',
  label: 'Saudi Arabia',
};

function getCityHero(city?: string): { url: string; label: string } {
  if (!city) return FALLBACK_HERO;
  const key = city.trim().toLowerCase();
  if (CITY_LANDMARKS[key]) return CITY_LANDMARKS[key];
  const match = Object.keys(CITY_LANDMARKS).find(k => key.includes(k) || k.includes(key));
  return match ? CITY_LANDMARKS[match] : FALLBACK_HERO;
}

// ── Pure sub-components ───────────────────────────────────────────────────────

const ImgPlaceholder = React.memo(({ icon: Icon }: { icon: React.ElementType }) => (
  <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-slate-100 to-teal-50 dark:from-slate-800 dark:via-slate-700 dark:to-emerald-900 flex flex-col items-center justify-center gap-2">
    <Icon className="w-8 h-8 text-emerald-500/60 dark:text-emerald-400/50" />
    <span className="text-emerald-500/50 dark:text-emerald-400/30 text-[8px] font-black uppercase tracking-[0.3em]">Tripo</span>
  </div>
));

const RatingPill = React.memo(({ rating }: { rating: number | string }) => (
  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
    <span className="text-[10px] font-black text-white">{Number(rating).toFixed(1)}</span>
  </div>
));

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-emerald-500 text-white',
  moderate: 'bg-amber-500 text-white',
  hard: 'bg-red-500 text-white',
};

const DifficultyBadge = React.memo(({ level }: { level?: string }) => {
  if (!level) return null;
  return (
    <span className={`absolute bottom-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase z-10 ${DIFFICULTY_STYLES[level.toLowerCase()] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white'}`}>
      {level}
    </span>
  );
});

const SectionHeader = React.memo(({ title, onSeeAll, seeAllLabel, isRTL }: {
  title: string; onSeeAll?: () => void; seeAllLabel: string; isRTL: boolean;
}) => (
  <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
    <h2 className={`text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
      {title}
    </h2>
    {onSeeAll && (
      <button onClick={onSeeAll} className={`flex items-center gap-1 text-xs font-bold text-emerald-600 active:opacity-70 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
        {seeAllLabel}
        {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    )}
  </div>
));

// ── HomeScreen ────────────────────────────────────────────────────────────────

export const HomeScreen = ({
  user, onOpenItinerary, t, onOpenAR, onNavigate, lang = 'en',
}: {
  user: User;
  onOpenItinerary: (i: Itinerary) => void;
  t: any;
  onOpenAR: () => void;
  onNavigate?: (tab: string, id?: string) => void;
  lang?: string;
}) => {
  const isRTL = lang === 'ar';

  const [activeCategory, setActiveCategory] = useState('All');
  const [places, setPlaces] = useState<Place[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [featuredRentals, setFeaturedRentals] = useState<Rental[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);

  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingRentals, setIsLoadingRentals] = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  // ── FIX: all 4 calls fire in parallel, none token-gated (public endpoints)
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      placeAPI.getPlaces(),
      tourAPI.getTours(),
      rentalAPI.getRentals(),
      communityAPI.getCommunities(),
      eventAPI.getEvents(),
    ]).then(([placesRes, toursRes, rentalsRes, communitiesRes, eventsRes]) => {
      if (cancelled) return;

      // Places
      if (placesRes.status === 'fulfilled') {
        const list = Array.isArray(placesRes.value) ? placesRes.value : [];
        setPlaces(list.length > 0 ? list : MOCK_PLACES);
      } else {
        setPlaces(MOCK_PLACES);
      }
      setIsLoadingPlaces(false);

      // Tours
      if (toursRes.status === 'fulfilled') {
        const list = Array.isArray(toursRes.value) ? toursRes.value : [];
        setTours(list.length > 0 ? list : FALLBACK_TOURS);
      } else {
        setTours(FALLBACK_TOURS);
      }
      setIsLoadingTours(false);

      // Rentals
      if (rentalsRes.status === 'fulfilled') {
        const list = Array.isArray(rentalsRes.value) ? rentalsRes.value : [];
        setFeaturedRentals(list.length > 0 ? list.slice(0, 4) : FALLBACK_RENTALS);
      } else {
        setFeaturedRentals(FALLBACK_RENTALS);
      }
      setIsLoadingRentals(false);

      // Communities
      if (communitiesRes.status === 'fulfilled') {
        const list = Array.isArray(communitiesRes.value) ? communitiesRes.value : [];
        setCommunities(list.length > 0 ? list.slice(0, 6) : FALLBACK_COMMUNITIES);
      } else {
        setCommunities(FALLBACK_COMMUNITIES);
      }
      setIsLoadingCommunities(false);

      // Events
      if (eventsRes.status === 'fulfilled') {
        const list = Array.isArray(eventsRes.value) ? eventsRes.value : [];
        setEvents(list);
      }
    });

    return () => { cancelled = true; };
  }, []);

  // ── l10n — rebuilt only when lang/t changes
  const l10n = useMemo(() => ({
    sar: isRTL ? 'ر.س' : 'SAR',
    perNight: isRTL ? '/ ليلة' : '/ night',
    seeAll: (t as any).seeAll || (isRTL ? 'عرض الكل' : 'See all'),
    noPlaces: isRTL ? 'لا توجد أماكن' : 'No places found',
    noTours: isRTL ? 'لا توجد جولات' : 'No tours found',
    tryOther: isRTL ? 'جرب فئة أخرى' : 'Try a different category',
    qaLabel: isRTL ? '✨ إجراءات سريعة' : '✨ Quick Actions',
    sections: {
      popularSpots: (t as any).sectionPopularSpots || (isRTL ? '🌟 أبرز الأماكن' : '🌟 Popular Spots'),
      popularPlaces: (t as any).sectionPopularPlaces || (isRTL ? '📍 أماكن رائجة' : '📍 Popular Places'),
      popularTours: (t as any).sectionPopularTours || (isRTL ? '🧭 جولات مميزة' : '🧭 Popular Tours'),
      events: (t as any).sectionEvents || (isRTL ? '🎉 الفعاليات القادمة' : '🎉 Upcoming Events'),
      rentals: (t as any).sectionRentals || (isRTL ? '🏕️ إيجارات مميزة' : '🏕️ Popular Rentals'),
      communities: (t as any).sectionCommunities || (isRTL ? '👥 مجتمعات نشطة' : '👥 Popular Communities'),
    },
    catLabels: {
      All: (t as any).catAll || (isRTL ? 'الكل' : 'All'),
      Nature: (t as any).catNature || (isRTL ? 'طبيعة' : 'Nature'),
      Heritage: (t as any).catHeritage || (isRTL ? 'تراث' : 'Heritage'),
      Adventure: (t as any).catAdventure || (isRTL ? 'مغامرة' : 'Adventure'),
      Food: (t as any).catFood || (isRTL ? 'مأكولات' : 'Food'),
      Urban: (t as any).catUrban || (isRTL ? 'مدني' : 'Urban'),
      Beach: (t as any).catBeach || (isRTL ? 'شواطئ' : 'Beach'),
      Desert: (t as any).catDesert || (isRTL ? 'صحراء' : 'Desert'),
    },
  }), [isRTL, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return (t as any).goodMorning || (isRTL ? 'صباح الخير' : 'Good morning');
    if (h < 17) return (t as any).goodAfternoon || (isRTL ? 'مساء الخير' : 'Good afternoon');
    return (t as any).goodEvening || (isRTL ? 'مساء الخير' : 'Good evening');
  }, [isRTL, t]);

  const cityHero = useMemo(() => getCityHero(user.smartProfile?.city), [user.smartProfile?.city]);

  const membersLabel = useCallback((n: number) =>
    isRTL ? `${n.toLocaleString('ar-SA')} عضو` : `${n.toLocaleString()} members`,
    [isRTL]);

  const fmtPrice = useCallback((n: number | string) =>
    Number(n).toLocaleString(isRTL ? 'ar-SA' : 'en-US'),
    [isRTL]);

  // Featured slideshow — interleaved top places + tours + rentals
  const slideshowItems = useMemo((): SlideItem[] => {
    const topPlaces = [...places]
      .sort((a, b) => (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0))
      .slice(0, 3)
      .map(p => ({
        id: p._id || p.id || '',
        type: 'place' as const,
        name: p.name,
        image: p.photos?.[0] || p.image || '',
        subtitle: p.city || p.categoryTags?.[0] || 'Saudi Arabia',
        rating: p.ratingSummary?.avgRating || p.rating,
        badge: 'Place', badgeColor: '#0d9488',
      }));

    const topTours = [...tours]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 3)
      .map(tour => ({
        id: tour.id || (tour as any)._id || '',
        type: 'tour' as const,
        name: tour.title,
        image: tour.heroImage || '',
        subtitle: tour.departureLocation || tour.category || 'Saudi Arabia',
        rating: Number(tour.rating) || undefined,
        badge: 'Tour', badgeColor: '#7c3aed',
      }));

    const topRentals = [...featuredRentals]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 2)
      .map(r => ({
        id: r.id || (r as any)._id || '',
        type: 'rental' as const,
        name: r.title,
        image: r.images?.[0] || r.image || '',
        subtitle: r.locationName || r.type || 'Saudi Arabia',
        rating: Number(r.rating) || undefined,
        badge: r.type || 'Rental', badgeColor: '#d97706',
      }));

    const result: SlideItem[] = [];
    const maxLen = Math.max(topPlaces.length, topTours.length, topRentals.length);
    for (let i = 0; i < maxLen; i++) {
      if (topPlaces[i]) result.push(topPlaces[i]);
      if (topTours[i]) result.push(topTours[i]);
      if (topRentals[i]) result.push(topRentals[i]);
    }
    return result.filter(s => s.image);
  }, [places, tours, featuredRentals]);

  const filteredPlaces = useMemo(() =>
    activeCategory === 'All' ? places : places.filter(p =>
      p.categoryTags?.some(tag => tag.toLowerCase().includes(activeCategory.toLowerCase())) ||
      p.category?.toLowerCase().includes(activeCategory.toLowerCase())
    ), [places, activeCategory]);

  const filteredTours = useMemo(() =>
    activeCategory === 'All' ? tours : tours.filter(tour =>
      tour.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
      tour.title?.toLowerCase().includes(activeCategory.toLowerCase())
    ), [tours, activeCategory]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .map(normalizeEvent)
      .filter(e => e.startDate && new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 6);
  }, [events]);

  const quickActions = useMemo(() => [
    {
      icon: Search,
      label: isRTL ? 'استكشاف الخريطة' : 'Explore Map',
      color: 'bg-blue-50 text-blue-600 border-blue-100 dark:from-blue-600/20 dark:to-blue-900/20 dark:text-blue-400 dark:border-blue-500/20',
      action: () => onNavigate?.('explore'),
    },
    {
      icon: Sparkles,
      label: isRTL ? 'مخطط الذكاء الاصطناعي' : 'AI Planner',
      color: 'bg-purple-50 text-purple-600 border-purple-100 dark:from-purple-600/20 dark:to-purple-900/20 dark:text-purple-400 dark:border-purple-500/20',
      action: () => onNavigate?.('ai_planner'),
    },
    {
      icon: Plus,
      label: isRTL ? 'رحلة جديدة' : 'New Trip',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:from-emerald-600/20 dark:to-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/20',
      action: () => onNavigate?.('create'),
    },
    {
      icon: Camera,
      label: isRTL ? 'دليل الواقع المعزز' : 'AR Guide',
      color: 'bg-orange-50 text-orange-600 border-orange-100 dark:from-orange-600/20 dark:to-orange-900/20 dark:text-orange-400 dark:border-orange-500/20',
      action: onOpenAR,
    },
  ], [isRTL, onNavigate, onOpenAR]);

  const handleSlidePress = useCallback((item: SlideItem) => {
    if (item.type === 'place') onNavigate?.('places', item.id);
    else if (item.type === 'tour') onNavigate?.('tours', item.id);
    else if (item.type === 'rental') onNavigate?.('rentals', item.id);
  }, [onNavigate]);

  const { catLabels, seeAll, sections, sar, perNight, noPlaces, noTours, tryOther, qaLabel } = l10n;

  return (
    <div className="bg-white dark:bg-slate-950 min-h-full pb-28 transition-colors duration-300" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative h-64 lg:h-80 overflow-hidden">
        <img
          src={cityHero.url}
          alt={cityHero.label}
          width={1200} height={480}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white dark:from-slate-950 via-black/50 to-transparent pointer-events-none" />

        <button
          onClick={onOpenAR}
          className="absolute top-5 end-4 w-10 h-10 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/25 shadow-lg active:scale-90 transition-transform z-10"
          aria-label="AR Guide"
        >
          <Camera className="w-5 h-5" />
        </button>

        <div className={`absolute bottom-6 px-5 z-10 w-full ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-white/70 text-sm font-medium tracking-wide">{greeting},</p>
          <h1 className="text-white text-2xl font-black tracking-tight drop-shadow-md mt-0.5">
            {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/60 text-xs mt-1 flex items-center gap-1 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            {cityHero.label}
          </p>
        </div>
      </div>

      {/* ── Category Filter Pills ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2.5 border-b border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-300">
        <div className={`flex gap-2 overflow-x-auto no-scrollbar px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {CATEGORY_KEYS.map(cat => {
            const Icon = CATEGORY_ICONS[cat] || Compass;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${activeCategory === cat
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:border-emerald-400 dark:bg-white/8 dark:text-slate-300 dark:border-white/10'
                  }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {catLabels[cat as keyof typeof catLabels] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 space-y-8">

        {/* Popular Spots Slideshow */}
        {slideshowItems.length > 0 && (
          <section>
            <SectionHeader title={sections.popularSpots} onSeeAll={() => onNavigate?.('places')} seeAllLabel={seeAll} isRTL={isRTL} />
            <FeaturedSlideshow items={slideshowItems} onPress={handleSlidePress} height="h-72" />
          </section>
        )}

        {/* ── Places ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title={activeCategory === 'All' ? sections.popularPlaces : `📍 ${catLabels[activeCategory as keyof typeof catLabels] || activeCategory}`}
            onSeeAll={() => onNavigate?.('places')}
            seeAllLabel={seeAll}
            isRTL={isRTL}
          />

          {isLoadingPlaces ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {[1, 2, 3].map(i => <div key={i} className="flex-shrink-0 w-44"><SkeletonCard /></div>)}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-3xl border border-slate-200 dark:bg-white/5 dark:border-white/10">
              <MapPin className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm font-bold">{noPlaces}</p>
            </div>
          ) : (
            <div className={`flex gap-3 overflow-x-auto no-scrollbar pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {filteredPlaces.map(place => {
                const img = place.photos?.[0] || place.image;
                const rating = place.ratingSummary?.avgRating || place.rating;
                const tag = place.categoryTags?.[0] || place.category || place.city;
                return (
                  <button
                    key={place._id || place.id}
                    onClick={() => onNavigate?.('places', place.id || place._id)}
                    className="flex-shrink-0 w-44 bg-white border border-slate-100 dark:bg-slate-900 dark:border-white/8 rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform text-start"
                  >
                    <div className="h-28 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {img
                        ? <img src={img} alt={place.name} width={176} height={112}
                          className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <ImgPlaceholder icon={Mountain} />
                      }
                      {rating && <RatingPill rating={rating} />}
                      {tag && (
                        <span className="absolute bottom-2 left-2 bg-black/55 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
                          {tag}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">{place.name}</p>
                      <p className="text-xs text-slate-400 mt-1 truncate">{place.city || ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Popular Tours ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title={activeCategory === 'All' ? sections.popularTours : `🧭 ${catLabels[activeCategory as keyof typeof catLabels] || activeCategory}`}
            onSeeAll={() => onNavigate?.('tours')}
            seeAllLabel={seeAll}
            isRTL={isRTL}
          />

          {isLoadingTours ? (
            <SkeletonList count={3} />
          ) : filteredTours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 dark:bg-white/5 dark:border-white/10">
              <Sparkles className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-400 font-bold text-sm mb-1">{noTours}</p>
              <p className="text-slate-500 text-xs">{tryOther}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTours.map(tour => (
                <button
                  key={tour.id || (tour as any)._id}
                  onClick={() => onNavigate?.('tours', tour.id || (tour as any)._id)}
                  className="w-full bg-white border border-slate-100 dark:bg-slate-900 dark:border-white/8 rounded-2xl overflow-hidden shadow-md active:scale-[0.99] transition-transform flex text-start"
                >
                  <div className="w-28 h-28 flex-shrink-0 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {tour.heroImage
                      ? <img src={tour.heroImage} alt={tour.title} width={112} height={112}
                        className="w-full h-full object-cover" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <ImgPlaceholder icon={Compass} />
                    }
                    <DifficultyBadge level={tour.difficulty} />
                  </div>

                  <div className="flex-1 p-3 min-w-0">
                    <div className={`flex items-start gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 flex-1">
                        {tour.title}
                      </h3>
                      {tour.rating && (
                        <div className={`flex items-center gap-0.5 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{Number(tour.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-2 truncate">{tour.departureLocation}</p>

                    <div className={`flex items-center gap-3 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-500" />{tour.totalDuration}h
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" />{tour.stops?.length ?? 0}
                      </span>
                      {tour.pricePerPerson && (
                        <span className={`font-extrabold text-emerald-600 dark:text-emerald-400 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                          {fmtPrice(tour.pricePerPerson)} <span className="font-normal text-slate-500">{sar}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center px-3">
                    {isRTL ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Upcoming Events ───────────────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <section>
            <SectionHeader title={sections.events} onSeeAll={() => onNavigate?.('events')} seeAllLabel={seeAll} isRTL={isRTL} />
            <div className={`flex gap-3 overflow-x-auto no-scrollbar pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {upcomingEvents.map(event => {
                const startDate = new Date(event.startDate);
                return (
                  <button
                    key={event.id}
                    onClick={() => onNavigate?.('events', event.id)}
                    className="flex-shrink-0 w-56 bg-white border border-slate-100 dark:bg-slate-900 dark:border-white/8 rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform text-start"
                  >
                    <div className="relative h-32 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      {event.image
                        ? <img src={event.image} alt={event.title} width={224} height={128}
                          className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <ImgPlaceholder icon={Calendar} />
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <span
                        className="absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full text-white shadow-md z-10"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.category}
                      </span>
                      <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1 text-center min-w-[40px] z-10 shadow-md">
                        <p className="text-[9px] font-extrabold text-slate-800 leading-none uppercase tracking-wide">
                          {startDate.toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-base font-black text-slate-900 leading-tight">{startDate.getDate()}</p>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">{event.title}</p>
                      <div className={`flex items-center gap-1 mt-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-400 truncate">{event.location}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {startDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Popular Rentals ───────────────────────────────────────────── */}
        <section>
          <SectionHeader title={sections.rentals} onSeeAll={() => onNavigate?.('rentals')} seeAllLabel={seeAll} isRTL={isRTL} />

          {isLoadingRentals ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="flex-shrink-0 w-48"><SkeletonCard /></div>)}
            </div>
          ) : (
            <div className={`flex gap-3 overflow-x-auto no-scrollbar pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {featuredRentals.map(rental => {
                const img = rental.images?.[0] || rental.image;
                return (
                  <button
                    key={rental.id || (rental as any)._id}
                    onClick={() => onNavigate?.('rentals', rental.id)}
                    className="flex-shrink-0 w-48 bg-white border border-slate-100 dark:bg-slate-900 dark:border-white/8 rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform text-start group"
                  >
                    <div className="h-32 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {img
                        ? <img src={img} alt={rental.title} width={192} height={128}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : <ImgPlaceholder icon={Tent} />
                      }
                      {rental.rating && <RatingPill rating={rental.rating} />}
                      {rental.type && (
                        <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase z-10">
                          {rental.type}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">{rental.title}</p>
                      <p className={`text-xs text-slate-500 flex items-center gap-1 mt-1 truncate ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <MapPin className="w-3 h-3 shrink-0" />{rental.locationName}
                      </p>
                      {rental.price && (
                        <p className="mt-2 leading-none">
                          <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{fmtPrice(rental.price)}</span>
                          <span className="text-xs font-normal text-slate-500"> {sar} {perNight}</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Popular Communities ───────────────────────────────────────── */}
        <section>
          <SectionHeader title={sections.communities} onSeeAll={() => onNavigate?.('communities')} seeAllLabel={seeAll} isRTL={isRTL} />

          {isLoadingCommunities ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {[1, 2, 3].map(i => <div key={i} className="flex-shrink-0 w-40"><SkeletonCard /></div>)}
            </div>
          ) : (
            <div className={`flex gap-3 overflow-x-auto no-scrollbar pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {communities.map(community => (
                <button
                  key={community.id || community._id}
                  onClick={() => onNavigate?.('communities', community.id || community._id)}
                  className="flex-shrink-0 w-40 bg-white border border-slate-100 dark:bg-slate-900 dark:border-white/8 rounded-2xl overflow-hidden shadow-md active:scale-95 transition-transform text-start group"
                >
                  <div className="h-24 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    {community.image
                      ? <img src={community.image} alt={community.name} width={160} height={96}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      : <ImgPlaceholder icon={Users} />
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-2 text-xl z-10">{community.icon}</span>
                    <span className="absolute top-2 right-2 bg-black/55 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10">
                      {community.category}
                    </span>
                  </div>
                  <div className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-2">{community.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{membersLabel(community.memberCount ?? 0)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section>
          <h2 className={`text-lg font-extrabold text-slate-900 dark:text-slate-200 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {qaLabel}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className={`flex items-center gap-3 p-4 bg-gradient-to-br border rounded-2xl shadow-sm active:scale-95 transition-transform ${item.color} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm leading-snug">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
};