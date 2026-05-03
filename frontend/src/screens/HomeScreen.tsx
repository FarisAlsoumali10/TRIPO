import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, MapPin, Camera, Plus, ChevronRight, ChevronLeft,
  Sparkles, Search, Compass, Menu, Heart,
} from 'lucide-react';
import { User, Itinerary, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI, communityAPI, eventAPI } from '../services/api';
import { SkeletonCard, SkeletonList, GlassCard, Skeleton } from '../components/ui';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';
import { NotificationPanel } from '../components/NotificationPanel';

// ── Module-scope constants ────────────────────────────────────────────────────



function normalizeEvent(e: any) {
  return {
    ...e,
    startDate: e.startDate ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    endDate: e.endDate ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    image: e.image ?? e.coverImage ?? '',
    isFree: e.isFree ?? false,
  };
}


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

const CITY_NAME_AR: Record<string, string> = {
  riyadh: 'الرياض', jeddah: 'جدة', mecca: 'مكة المكرمة', makkah: 'مكة المكرمة',
  medina: 'المدينة المنورة', madinah: 'المدينة المنورة', alula: 'العُلا', 'al ula': 'العُلا',
  abha: 'أبها', tabuk: 'تبوك', dammam: 'الدمام', khobar: 'الخبر', 'al khobar': 'الخبر',
  yanbu: 'ينبع', taif: 'الطائف', neom: 'نيوم', hail: 'حائل', najran: 'نجران',
};

function translateCity(city: string, ar: boolean): string {
  if (!ar) return city;
  return CITY_NAME_AR[city.trim().toLowerCase()] ?? city;
}

function getCityHero(city?: string): { url: string; label: string } {
  if (!city) return FALLBACK_HERO;
  const key = city.trim().toLowerCase();
  if (CITY_LANDMARKS[key]) return CITY_LANDMARKS[key];
  const match = Object.keys(CITY_LANDMARKS).find(k => key.includes(k) || k.includes(key));
  return match ? CITY_LANDMARKS[match] : FALLBACK_HERO;
}

function getKaramLevel(pts: number): string {
  if (pts >= 1000) return 'Legend';
  if (pts >= 500) return 'Pathfinder';
  if (pts >= 200) return 'Adventurer';
  return 'Explorer';
}

// ── Pure sub-components ───────────────────────────────────────────────────────

const ImgPlaceholder = React.memo(({ icon: Icon }: { icon: React.ElementType }) => (
  <div className="w-full h-full bg-gradient-to-br from-emerald-50 via-slate-100 to-teal-50 dark:from-navy-800 dark:via-navy-900 dark:to-navy-800 flex flex-col items-center justify-center gap-2">
    <Icon className="w-8 h-8 text-emerald-500/60 dark:text-mint/40" />
    <span className="text-emerald-500/50 dark:text-mint/30 text-[8px] font-black uppercase tracking-[0.3em]">Tripo</span>
  </div>
));

const RatingPill = React.memo(({ rating }: { rating: number | string }) => (
  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full z-10">
    <Star className="w-2.5 h-2.5 fill-gold text-gold" />
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
    <span className={`absolute bottom-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase z-10 ${DIFFICULTY_STYLES[level.toLowerCase()] ?? 'bg-slate-200 text-slate-700 dark:bg-navy-800 dark:text-white'}`}>
      {level}
    </span>
  );
});

const SectionHeader = React.memo(({ title, onSeeAll, seeAllLabel, isRTL }: {
  title: string; onSeeAll?: () => void; seeAllLabel: string; isRTL: boolean;
}) => (
  <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
    <h2 className={`text-lg font-extrabold text-slate-900 dark:text-white tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
      {title}
    </h2>
    {onSeeAll && (
      <button onClick={onSeeAll} className={`flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-mint active:opacity-70 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
        {seeAllLabel}
        {isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    )}
  </div>
));

// ── Helpers ──────────────────────────────────────────────────────────────────

function isOpenNow(p: Place): boolean | null {
  if (!p.openingHours) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[new Date().getDay()];
  const h = (p.openingHours as any)[day];
  if (!h || h.closed) return false;
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const open = oh * 60 + om, close = ch * 60 + cm;
  if (close < open) return now >= open || now < close;
  return now >= open && now < close;
}

const SectionTile = ({ label, emoji, countLabel, thumbs, onTap, accentColor = '#0f172a', wide = false }: {
  label: string; emoji: string; countLabel: string;
  thumbs: (string | undefined)[]; onTap: () => void; accentColor?: string; wide?: boolean;
}) => (
  <button
    onClick={onTap}
    className={`h-40 rounded-2xl shadow-md active:scale-[0.97] hover:scale-[1.02] hover:shadow-xl transition-[transform,box-shadow] duration-200 overflow-hidden relative${wide ? ' col-span-2' : ''}`}
    style={{ backgroundColor: accentColor }}
  >
    {thumbs.filter(Boolean).length >= 2 ? (
      <>
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {Array.from({ length: 4 }).map((_, i) => (
            thumbs[i]
              ? <img key={i} src={thumbs[i]} loading="lazy" className="w-full h-full object-cover" alt="" />
              : <div key={i} style={{ background: `${accentColor}99` }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </>
    ) : (
      <div className="absolute inset-0 flex items-start justify-end p-4"
        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}>
        <span className="text-5xl opacity-90">{emoji}</span>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 p-3 text-right">
      <p className="text-white font-black text-base leading-tight drop-shadow-sm">{label}</p>
      <p className="text-white/75 text-xs font-semibold mt-0.5 drop-shadow-sm">{countLabel}</p>
    </div>
  </button>
);

// ── HomeScreen ────────────────────────────────────────────────────────────────

export const HomeScreen = ({
  user, onOpenItinerary, t, onOpenAR, onNavigate, lang = 'en',
  onOpenSearch, karamPoints = 0, onOpenMenu,
}: {
  user: User;
  onOpenItinerary: (i: Itinerary) => void;
  t: any;
  onOpenAR: () => void;
  onNavigate?: (tab: string, id?: string) => void;
  lang?: string;
  onOpenSearch?: () => void;
  karamPoints?: number;
  onOpenMenu?: () => void;
}) => {
  const isRTL = lang === 'ar';

  const [places, setPlaces] = useState<Place[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [featuredRentals, setFeaturedRentals] = useState<Rental[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingRentals, setIsLoadingRentals] = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [errorPlaces, setErrorPlaces] = useState(false);
  const [errorTours, setErrorTours] = useState(false);
  const [errorRentals, setErrorRentals] = useState(false);
  const [errorEvents, setErrorEvents] = useState(false);

  const fetchAllSections = useCallback(() => {
    setErrorPlaces(false); setErrorTours(false); setErrorRentals(false); setErrorEvents(false);
    setIsLoadingPlaces(true); setIsLoadingTours(true); setIsLoadingRentals(true); setIsLoadingCommunities(true);

    Promise.allSettled([
      placeAPI.getPlaces(),
      tourAPI.getTours(),
      rentalAPI.getRentals(),
      communityAPI.getCommunities(),
      eventAPI.getEvents(),
    ]).then(([placesRes, toursRes, rentalsRes, communitiesRes, eventsRes]) => {
      if (placesRes.status === 'fulfilled') {
        setPlaces(Array.isArray(placesRes.value) ? placesRes.value : []);
      } else { setPlaces([]); setErrorPlaces(true); }
      setIsLoadingPlaces(false);

      if (toursRes.status === 'fulfilled') {
        setTours(Array.isArray(toursRes.value) ? toursRes.value : []);
      } else { setTours([]); setErrorTours(true); }
      setIsLoadingTours(false);

      if (rentalsRes.status === 'fulfilled') {
        setFeaturedRentals(Array.isArray(rentalsRes.value) ? rentalsRes.value.slice(0, 4) : []);
      } else { setFeaturedRentals([]); setErrorRentals(true); }
      setIsLoadingRentals(false);

      if (communitiesRes.status === 'fulfilled') {
        setCommunities(Array.isArray(communitiesRes.value) ? communitiesRes.value.slice(0, 6) : []);
      } else { setCommunities([]); }
      setIsLoadingCommunities(false);

      if (eventsRes.status === 'fulfilled') {
        setEvents(Array.isArray(eventsRes.value) ? eventsRes.value : []);
      } else { setEvents([]); setErrorEvents(true); }
    });
  }, []);

  useEffect(() => { fetchAllSections(); }, [fetchAllSections]);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.section-reveal');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0, rootMargin: '0px 0px -24px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const [displayPoints, setDisplayPoints] = useState(0);
  useEffect(() => {
    if (!karamPoints) return;
    const duration = 750;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPoints(Math.round(eased * karamPoints));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [karamPoints]);

  const l10n = useMemo(() => ({
    sar: isRTL ? 'ر.س' : 'SAR',
    perNight: isRTL ? '/ ليلة' : '/ night',
    seeAll: (t as any).seeAll || (isRTL ? 'عرض الكل' : 'See all'),
    qaLabel: isRTL ? '✨ إجراءات سريعة' : '✨ Quick Actions',
    sections: {
      popularSpots: (t as any).sectionPopularSpots || (isRTL ? '🌟 أبرز الأماكن' : '🌟 Popular Spots'),
      popularPlaces: (t as any).sectionPopularPlaces || (isRTL ? '📍 أماكن رائجة' : '📍 Popular Places'),
      popularTours: (t as any).sectionPopularTours || (isRTL ? '🧭 جولات مميزة' : '🧭 Popular Tours'),
      events: (t as any).sectionEvents || (isRTL ? '🎉 الفعاليات القادمة' : '🎉 Upcoming Events'),
      rentals: (t as any).sectionRentals || (isRTL ? '🏕️ إيجارات مميزة' : '🏕️ Available Stays'),
      communities: (t as any).sectionCommunities || (isRTL ? '👥 مجتمعات نشطة' : '👥 Popular Communities'),
    },
  }), [isRTL, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return (t as any).goodMorning || (isRTL ? 'صباح الخير' : 'Good morning');
    if (h < 17) return (t as any).goodAfternoon || (isRTL ? 'مساء الخير' : 'Good afternoon');
    return (t as any).goodEvening || (isRTL ? 'مساء الخير' : 'Good evening');
  }, [isRTL, t]);

  const cityHero = useMemo(() => getCityHero(user.smartProfile?.city), [user.smartProfile?.city]);
  const city = user.smartProfile?.city || 'Riyadh';

  const membersLabel = useCallback((n: number) =>
    isRTL ? `${n.toLocaleString('ar-SA')} عضو` : `${n.toLocaleString()} members`,
    [isRTL]);

  const fmtPrice = useCallback((n: number | string) =>
    Number(n).toLocaleString(isRTL ? 'ar-SA' : 'en-US'),
    [isRTL]);

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
        badge: 'Place', badgeColor: '#1EC99A',
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
        badge: r.type || 'Rental', badgeColor: '#F7C948',
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
      color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/30',
      action: () => onNavigate?.('explore'),
    },
    {
      icon: Sparkles,
      label: isRTL ? 'مخطط الذكاء الاصطناعي' : 'AI Planner',
      color: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-400/30',
      action: () => onNavigate?.('ai_planner'),
    },
    {
      icon: Plus,
      label: isRTL ? 'رحلة جديدة' : 'New Trip',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-mint/15 dark:text-mint dark:border-mint/30',
      action: () => onNavigate?.('create'),
    },
    {
      icon: Camera,
      label: isRTL ? 'دليل الواقع المعزز' : 'Use AR Guide',
      color: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-400/30',
      action: onOpenAR,
    },
    {
      icon: Heart,
      label: isRTL ? 'مزاجي' : 'Your Mood',
      color: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/30',
      action: () => onNavigate?.('your_mood'),
    },
  ], [isRTL, onNavigate, onOpenAR]);

  const handleSlidePress = useCallback((item: SlideItem) => {
    if (item.type === 'place') onNavigate?.('places', item.id);
    else if (item.type === 'tour') onNavigate?.('tours', item.id);
    else if (item.type === 'rental') onNavigate?.('rentals', item.id);
  }, [onNavigate]);

  const { seeAll, sections, sar, perNight, qaLabel } = l10n;

  const avatarUrl = (user as any).avatar;
  const userFirstName = user.name?.split(' ')[0] || 'Traveller';
  const tierLabel = getKaramLevel(karamPoints);

  const smartCounts = useMemo(() => ({
    open: places.filter(p => isOpenNow(p) === true).length,
    trending: places.filter(p => p.isTrending).length,
    family: places.filter(p => p.isFamilySuitable).length,
  }), [places]);

  const moodState = useMemo(() => {
    try {
      const raw = localStorage.getItem('tripo_mood');
      if (!raw) return { hasMood: false } as const;
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date !== today) return { hasMood: false } as const;
      return { hasMood: true, vibe: parsed.vibe, budget: parsed.budget, hours: parsed.hours } as const;
    } catch { return { hasMood: false } as const; }
  }, []);

  const moodStreak = useMemo(() => {
    try {
      const raw = localStorage.getItem('tripo_mood_streak_dates');
      return raw ? (JSON.parse(raw) as string[]).length : 0;
    } catch { return 0; }
  }, []);

  return (
    <div className="bg-white dark:bg-navy-950 min-h-full pb-32 transition-colors duration-300" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── New Top Header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white dark:bg-gradient-to-b dark:from-navy-900 dark:to-navy-950 px-4 pt-5 pb-4">
        {/* Ambient mint bloom — color anchors the header without competing with content */}
        <span className="pointer-events-none select-none absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-400/[0.06] dark:bg-mint/[0.07] blur-2xl" aria-hidden="true" />

        {/* Brand row */}
        <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Hamburger + Notifications */}
          <div className="flex items-center gap-1">
            {onOpenMenu && (
              <button
                onClick={onOpenMenu}
                className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <NotificationPanel />
          </div>

          {/* Tripo wordmark */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{isRTL ? 'تريبو' : 'Tripo'}</span>
            <span className="w-2 h-2 rounded-full bg-mint shadow-mint-glow" aria-hidden="true" />
          </div>

          {/* User pill */}
          <button
            onClick={() => onNavigate?.('profile')}
            className={`flex items-center gap-2 bg-slate-100 dark:bg-white/10 rounded-pill px-2.5 py-1.5 active:scale-95 transition-transform ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 dark:bg-mint/20 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userFirstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-black text-emerald-700 dark:text-mint">{userFirstName[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-none">{userFirstName}</p>
              <p className={`text-[9px] font-semibold leading-none mt-0.5 flex items-center gap-0.5 ${
                karamPoints >= 1000 ? 'text-gold' :
                karamPoints >= 500  ? 'text-amber-500 dark:text-amber-300' :
                karamPoints >= 200  ? 'text-orange-500 dark:text-orange-300' :
                'text-emerald-600 dark:text-mint'
              }`}>
                <Star className="w-2.5 h-2.5 fill-gold text-gold" aria-hidden="true" />
                {tierLabel} · {displayPoints.toLocaleString()}
              </p>
            </div>
          </button>
        </div>

        {/* Weather / location row */}
        {/* TODO: wire to a real weather API */}
        <div className={`flex items-center gap-1.5 mb-4 text-xs text-slate-500 dark:text-ink-secondary ${isRTL ? 'flex-row-reverse' : ''}`}>
          <MapPin className="w-3.5 h-3.5 text-mint shrink-0" aria-hidden="true" />
          <span className="font-medium">{translateCity(city, isRTL)}</span>
          <span className="opacity-50">·</span>
          <span>
            {isRTL ? '28°م · مشمس ' : '28°C · Sunny '}
            <span className="animate-weather-sway inline-block" aria-hidden="true">☀️</span>
          </span>
        </div>

        {/* Search bar */}
        <button
          onClick={onOpenSearch}
          className={`w-full flex items-center gap-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:border dark:border-white/10 dark:hover:bg-white/[0.13] dark:hover:border-mint/25 rounded-pill px-4 py-3 group active:scale-[0.98] transition-[background-color,border-color,transform] duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
          aria-label="Search"
        >
          <span className="flex-1 text-start text-sm text-slate-400 dark:text-ink-muted font-medium">
            {isRTL ? 'إلى أين تريد الذهاب؟' : 'Where do you want to go?'}
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-mint flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Search className="w-4 h-4 text-white dark:text-navy-950" aria-hidden="true" />
          </div>
        </button>
      </div>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="relative h-52 lg:h-64 overflow-hidden rounded-xl-card shadow-glass">
          <img
            src={cityHero.url}
            alt={cityHero.label}
            width={1200} height={480}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent pointer-events-none" />

          <button
            onClick={onOpenAR}
            className="absolute top-3 end-3 w-9 h-9 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/25 shadow-lg active:scale-90 transition-transform z-10"
            aria-label="AR Guide"
          >
            <Camera className="w-4 h-4" />
          </button>

          <div className={`absolute bottom-4 px-4 z-10 w-full ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-white/70 text-xs font-medium tracking-wide animate-fade-up">{greeting},</p>
            <h1 className="text-white text-xl font-black tracking-tight drop-shadow-md mt-0.5 animate-fade-up-d1">
              {userFirstName} 👋
            </h1>
            <p className="text-white/60 text-xs mt-1 flex items-center gap-1 font-medium animate-fade-up-d2">
              <MapPin className="w-3 h-3 shrink-0" />
              {cityHero.label}
            </p>
            <button
              onClick={() => onNavigate?.('explore')}
              className="mt-3 px-4 py-2 bg-mint text-navy-950 font-bold text-xs rounded-pill shadow-mint-glow active:scale-95 transition-transform hover:bg-mint-600 animate-fade-up-d3"
            >
              {isRTL ? 'عرض وحجز ←' : 'View & Book →'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mood Prompt ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 section-reveal">
        <button
          onClick={() => onNavigate?.('your_mood')}
          className="w-full relative overflow-hidden rounded-xl-card shadow-md bg-gradient-to-br from-rose-500 to-pink-500 p-4 text-white active:scale-[0.98] transition-transform"
        >
          <span className="pointer-events-none absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-once" aria-hidden="true" />
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">✨</div>
            <div className="flex-1 min-w-0">
              {moodState.hasMood ? (
                <>
                  <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">
                    {isRTL ? 'مزاج اليوم' : "Today's mood"}
                    {moodStreak >= 2 && (
                      <span className={`ms-2 bg-white/25 px-1.5 py-0.5 rounded-full inline-block${moodStreak >= 3 ? ' animate-streak-fire' : ''}`}>
                        🔥 {moodStreak}
                      </span>
                    )}
                  </p>
                  <p className="font-black text-sm leading-snug truncate mt-0.5">
                    {isRTL
                      ? `${({ chill: 'هادئ', active: 'نشيط', cultural: 'ثقافي', social: 'اجتماعي' } as Record<string,string>)[moodState.vibe] ?? moodState.vibe} · ${({ free: 'مجاني', low: 'منخفض', medium: 'متوسط', high: 'مرتفع' } as Record<string,string>)[moodState.budget] ?? moodState.budget} · ${moodState.hours}س`
                      : `${moodState.vibe} · ${moodState.budget} · ${moodState.hours}h`
                    }
                  </p>
                  <p className="text-white/85 text-xs font-semibold mt-0.5">
                    {isRTL ? 'تغيير المزاج ←' : 'Change mood →'}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-sm leading-snug">
                    {isRTL ? '✨ ما هو مزاجك اليوم؟' : "What's your vibe today?"}
                  </p>
                  <p className="text-white/85 text-xs font-semibold mt-0.5">
                    {isRTL ? 'احصل على أماكن مخصصة لك ←' : 'Get matched to perfect spots →'}
                  </p>
                </>
              )}
            </div>
            <ChevronRight className={`w-5 h-5 text-white/80 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 space-y-8">

        {/* Popular Spots Slideshow */}
        {slideshowItems.length > 0 && (
          <section className="section-reveal">
            <SectionHeader title={sections.popularSpots} onSeeAll={() => onNavigate?.('places')} seeAllLabel={seeAll} isRTL={isRTL} />
            <FeaturedSlideshow items={slideshowItems} onPress={handleSlidePress} height="h-72" />
          </section>
        )}

        {/* ── Smart context tiles ──────────────────────────────────────── */}
        <section className="section-reveal">
          <SectionHeader title={isRTL ? '⚡ اكتشف الآن' : '⚡ Discover Now'} seeAllLabel={seeAll} isRTL={isRTL} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'near',     nav: ['discover', 'near']     as const, label: isRTL ? 'بالقرب مني' : 'Near Me',   emoji: '📍', bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', count: isRTL ? 'استكشف القريب' : 'Explore nearby' },
              { id: 'open',     nav: ['places',   'open_now'] as const, label: isRTL ? 'مفتوح الآن' : 'Open Now',  emoji: '🕒', bg: 'linear-gradient(135deg,#10b981,#059669)', count: isRTL ? `${smartCounts.open} مكان` : `${smartCounts.open} places` },
              { id: 'trending', nav: ['discover', 'trending'] as const, label: isRTL ? 'رائج اليوم' : 'Trending',  emoji: '🔥', bg: 'linear-gradient(135deg,#ef4444,#dc2626)', count: isRTL ? `${smartCounts.trending} مكان` : `${smartCounts.trending} places` },
              { id: 'family',   nav: ['discover', 'family']   as const, label: isRTL ? 'عائلي' : 'Family',         emoji: '👨‍👩‍👧', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', count: isRTL ? `${smartCounts.family} مكان` : `${smartCounts.family} places` },
            ].map(tile => (
              <button
                key={tile.id}
                onClick={() => onNavigate?.(tile.nav[0], tile.nav[1])}
                className="h-24 rounded-2xl shadow-md active:scale-[0.97] hover:scale-[1.015] hover:shadow-xl hover:brightness-110 transition-[transform,box-shadow,filter] duration-200 overflow-hidden relative flex flex-col justify-between p-3"
                style={{ background: tile.bg }}
              >
                {tile.id === 'open' && (
                  <span className="absolute top-2.5 right-2.5 flex items-center justify-center z-10" aria-label="Live data" aria-hidden="true">
                    <span className="absolute w-3 h-3 rounded-full bg-mint/55 animate-ping" />
                    <span className="relative w-2 h-2 rounded-full bg-mint" />
                  </span>
                )}
                <span className="text-3xl self-end">{tile.emoji}</span>
                <div className="text-right">
                  <p className="text-white font-black text-sm leading-tight">{tile.label}</p>
                  <p className="text-white/70 text-[10px] font-semibold mt-0.5">{tile.count}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Section tiles ────────────────────────────────────────────── */}
        <section className="section-reveal">
          <SectionHeader title={isRTL ? '🗺️ استكشف' : '🗺️ Browse'} seeAllLabel={seeAll} isRTL={isRTL} />
          <div className="grid grid-cols-2 gap-3">
            {isLoadingPlaces ? <Skeleton className="h-40 rounded-2xl" /> : (
              <SectionTile
                label={isRTL ? 'أماكن' : 'Places'} emoji="📍" accentColor="#0f172a"
                countLabel={errorPlaces ? (isRTL ? '↻ إعادة المحاولة' : '↻ Retry') : (isRTL ? `${places.length} مكان` : `${places.length} places`)}
                thumbs={places.slice(0, 4).map(p => p.photos?.[0] || p.image)}
                onTap={errorPlaces ? fetchAllSections : () => onNavigate?.('places')}
              />
            )}
            {isLoadingTours ? <Skeleton className="h-40 rounded-2xl" /> : (
              <SectionTile
                label={isRTL ? 'جولات' : 'Tours'} emoji="🧭" accentColor="#7c3aed"
                countLabel={errorTours ? (isRTL ? '↻ إعادة المحاولة' : '↻ Retry') : (isRTL ? `${tours.length} جولة` : `${tours.length} tours`)}
                thumbs={tours.slice(0, 4).map(t => t.heroImage)}
                onTap={errorTours ? fetchAllSections : () => onNavigate?.('tours')}
              />
            )}
            <SectionTile
              label={isRTL ? 'فعاليات' : 'Events'} emoji="🎉" accentColor="#059669"
              countLabel={errorEvents ? (isRTL ? '↻ إعادة المحاولة' : '↻ Retry') : (isRTL ? `${upcomingEvents.length} فعالية` : `${upcomingEvents.length} events`)}
              thumbs={upcomingEvents.slice(0, 4).map(e => e.image)}
              onTap={errorEvents ? fetchAllSections : () => onNavigate?.('events')}
            />
            {isLoadingRentals ? <Skeleton className="h-40 rounded-2xl" /> : (
              <SectionTile
                label={isRTL ? 'إيجارات' : 'Stays'} emoji="🏕️" accentColor="#1d4ed8"
                countLabel={errorRentals ? (isRTL ? '↻ إعادة المحاولة' : '↻ Retry') : (isRTL ? `${featuredRentals.length} خيار` : `${featuredRentals.length} stays`)}
                thumbs={featuredRentals.slice(0, 4).map(r => r.images?.[0] || r.image)}
                onTap={errorRentals ? fetchAllSections : () => onNavigate?.('rentals')}
              />
            )}
            {isLoadingCommunities ? <Skeleton className="h-40 rounded-2xl col-span-2" /> : (
              <SectionTile
                label={isRTL ? 'مجتمعات' : 'Communities'} emoji="👥" accentColor="#6d28d9"
                countLabel={isRTL ? `${communities.length} مجتمع` : `${communities.length} communities`}
                thumbs={communities.slice(0, 4).map((c: any) => c.image)}
                onTap={() => onNavigate?.('communities')}
                wide
              />
            )}
          </div>
        </section>

        {/* ── Live Near You / Map Preview ───────────────────────────────── */}
        <section className="section-reveal">
          <SectionHeader title={isRTL ? '📍 بالقرب منك' : '📍 Live Near You'} onSeeAll={() => onNavigate?.('explore', 'near_me')} seeAllLabel={seeAll} isRTL={isRTL} />
          <div className="bg-white dark:bg-navy-900/70 border border-slate-200 dark:border-white/10 rounded-xl-card overflow-hidden shadow-md dark:shadow-glass">
            {/* Map illustration */}
            <button onClick={() => onNavigate?.('explore', 'near_me')} className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-navy-800 block">
              <img
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80"
                alt="Map preview"
                className="w-full h-full object-cover opacity-70 dark:opacity-40"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent dark:from-navy-900/90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-mint/20 border-2 border-mint flex items-center justify-center animate-pulse">
                    <MapPin className="w-5 h-5 text-mint" aria-hidden="true" />
                  </div>
                  <span className="text-white text-xs font-bold bg-navy-900/70 px-3 py-1 rounded-full backdrop-blur-sm">{translateCity(city, isRTL)}</span>
                </div>
              </div>
            </button>

            {/* Nearby events */}
            {upcomingEvents.slice(0, 2).map((event, i) => (
              <button
                key={event.id}
                onClick={() => onNavigate?.('events', event.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${i === 0 ? 'border-b border-slate-100 dark:border-white/8' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 dark:bg-navy-800 shrink-0">
                  {event.image && <img src={event.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{event.title}</p>
                  <p className="text-xs text-slate-400 dark:text-ink-muted truncate">{event.location}</p>
                </div>
                <span className="text-[10px] font-bold text-mint bg-mint/15 px-2 py-0.5 rounded-full shrink-0">
                  ~2 km
                </span>
              </button>
            ))}
            {upcomingEvents.length === 0 && (
              <div className="px-4 py-3 text-center text-xs text-slate-400 dark:text-ink-muted">
                {isRTL ? 'لا توجد فعاليات قريبة' : 'No nearby events right now'}
              </div>
            )}

            <button
              onClick={() => onNavigate?.('explore', 'near_me')}
              className="w-full py-3.5 text-sm font-bold text-emerald-600 dark:text-mint flex items-center justify-center gap-2 border-t border-slate-100 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {isRTL ? 'توسيع الخريطة واستكشاف الفعاليات' : 'Expand Map & Explore Events'}
            </button>
          </div>
        </section>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <section className="section-reveal">
          <h2 className={`text-lg font-extrabold text-slate-900 dark:text-white mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {qaLabel}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className={`flex items-center gap-3 p-4 bg-gradient-to-br border rounded-card shadow-sm active:scale-95 hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow] duration-200 ${item.color} ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
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
