import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Star, MapPin, Camera, Plus, ChevronRight, ChevronLeft,
  Sparkles, Search, Compass, Menu, Heart, Cloud,
} from 'lucide-react';
import { User, Itinerary, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI, communityAPI, eventAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { isOpenNow } from '../utils/placeHelpers';
import { Skeleton, SafeImage } from '../components/ui';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';
import { NotificationPanel } from '../components/NotificationPanel';
import { useWeather } from '../hooks/useWeather';

// ── Module-scope constants ─────────────────────────────────────────────────────

function normalizeEvent(e: any) {
  return {
    ...e,
    id:        e.id || e._id || '', 
    startDate: e.startDate ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    endDate:   e.endDate   ?? (e.date ? new Date(e.date).toISOString().split('T')[0] : ''),
    image:     e.image ?? e.coverImage ?? '',
    isFree:    e.isFree ?? false,
  };
}

const CITY_LANDMARKS: Record<string, { url: string; label: string }> = {
  riyadh:     { url: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200', label: 'Kingdom Centre Tower, Riyadh' },
  jeddah:     { url: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200', label: 'Al-Balad Historic District, Jeddah' },
  mecca:      { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  makkah:     { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  medina:     { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  madinah:    { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  alula:      { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  'al ula':   { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  abha:       { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Asir Mountains, Abha' },
  tabuk:      { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Wadi Disah, Tabuk' },
  dammam:     { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Dammam Corniche' },
  khobar:     { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  'al khobar':{ url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  yanbu:      { url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200', label: 'Red Sea Coast, Yanbu' },
  taif:       { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Al Hada Mountains, Taif' },
  neom:       { url: 'https://images.unsplash.com/photo-1596008194705-f0ff3d2c95a2?w=1200', label: 'NEOM, Tabuk Province' },
  hail:       { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Qishla Palace, Hail' },
  najran:     { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Najran Fort' },
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
  if (pts >= 500)  return 'Pathfinder';
  if (pts >= 200)  return 'Adventurer';
  return 'Explorer';
}

// ── Pure sub-components ────────────────────────────────────────────────────────

const SectionHeader = React.memo(({ title, onSeeAll, seeAllLabel, isRTL }: {
  title: string; onSeeAll?: () => void; seeAllLabel: string; isRTL: boolean;
}) => (
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
      {title}
    </h2>
    {onSeeAll && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-oasis-spring hover:opacity-70 active:scale-95 transition-all"
      >
        {seeAllLabel}
        <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
      </button>
    )}
  </div>
));

const SectionTile = ({
  label, emoji, countLabel, thumbs, onTap, accentColor = '#0f172a', wide = false,
}: {
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
              ? <SafeImage 
                  key={i} 
                  src={thumbs[i]} 
                  className="w-full h-full object-cover" 
                  alt={label} 
                  fallbackType="icon"
                />
              : <div key={i} style={{ background: `${accentColor}99` }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
      </>
    ) : (
      <div
        className="absolute inset-0 flex items-start justify-end p-4"
        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
      >
        <span className="text-5xl opacity-90">{emoji}</span>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 p-3 text-right">
      <p className="text-white font-black text-base leading-tight drop-shadow-sm">{label}</p>
      <p className="text-white/75 text-xs font-semibold mt-0.5 drop-shadow-sm">{countLabel}</p>
    </div>
  </button>
);

// ── HomeScreen ──────────────────────────────────────────────────────────────────

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

  const [places, setPlaces]                   = useState<Place[]>([]);
  const [tours, setTours]                     = useState<Tour[]>([]);
  const [featuredRentals, setFeaturedRentals] = useState<Rental[]>([]);
  const [communities, setCommunities]         = useState<any[]>([]);
  const [events, setEvents]                   = useState<any[]>([]);

  const [isLoadingPlaces, setIsLoadingPlaces]         = useState(true);
  const [isLoadingTours, setIsLoadingTours]           = useState(true);
  const [isLoadingRentals, setIsLoadingRentals]       = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);

  const [errorPlaces, setErrorPlaces]   = useState(false);
  const [errorTours, setErrorTours]     = useState(false);
  const [errorRentals, setErrorRentals] = useState(false);
  const [errorEvents, setErrorEvents]   = useState(false);

  const [moodState] = useState(() => {
    try {
      const raw = localStorage.getItem('tripo_mood');
      if (!raw) return { hasMood: false } as const;
      const parsed = JSON.parse(raw);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date !== today) return { hasMood: false } as const;
      return {
        hasMood: true,
        vibe: parsed.vibe as string,
        budget: parsed.budget as string,
        hours: parsed.hours as number,
      } as const;
    } catch {
      return { hasMood: false } as const;
    }
  });

  const [moodStreak] = useState(() => {
    try {
      const raw = localStorage.getItem('tripo_mood_streak_dates');
      return raw ? (JSON.parse(raw) as string[]).length : 0;
    } catch {
      return 0;
    }
  });

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
    const timer = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>('.section-reveal');
      const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        }),
        { threshold: 0, rootMargin: '0px 0px -24px 0px' }
      );
      els.forEach(el => obs.observe(el));
      return () => obs.disconnect();
    }, 150);
    return () => clearTimeout(timer);
  }, [places, tours, featuredRentals, communities, events]); 

  const [displayPoints, setDisplayPoints] = useState(0);
  useEffect(() => {
    if (!karamPoints) return;
    const duration = 750;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(eased * karamPoints));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [karamPoints]);

  const l10n = useMemo(() => ({
    sar:      isRTL ? 'ر.س' : 'SAR',
    perNight: isRTL ? '/ ليلة' : '/ night',
    seeAll:   t.home?.seeAll       || (isRTL ? 'عرض الكل' : 'See all'),
    qaLabel:  t.home?.quickActions || (isRTL ? 'إجراءات سريعة' : 'Quick Actions'),
    sections: {
      popularSpots:  t.home?.popularSpots  || (isRTL ? '🌟 أبرز الأماكن' : '🌟 Popular Spots'),
      popularPlaces: t.home?.popularPlaces || (isRTL ? '📍 أماكن رائجة' : '📍 Popular Places'),
      popularTours:  t.home?.popularTours  || (isRTL ? '🧭 جولات مميزة' : '🧭 Popular Tours'),
      events:        t.home?.events        || (isRTL ? '🎉 فعاليات' : '🎉 Events'),
      rentals:       t.home?.rentals       || (isRTL ? '🏕️ إيجارات' : '🏕️ Rentals'),
      communities:   t.home?.communities   || (isRTL ? '👥 مجتمعات' : '👥 Communities'),
    },
  }), [isRTL, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t.home?.goodMorning   || (isRTL ? 'صباح الخير' : 'Good morning');
    if (h < 17) return t.home?.goodAfternoon || (isRTL ? 'مساء النور'  : 'Good afternoon');
    return             t.home?.goodEvening   || (isRTL ? 'مساء الخير' : 'Good evening');
  }, [isRTL, t]);

  const cityHero = useMemo(() => getCityHero(user.smartProfile?.city), [user.smartProfile?.city]);
  const city     = user.smartProfile?.city || 'Riyadh';

  const membersLabel = useCallback((n: number) => {
    const label = n === 1 
      ? (t.home?.member  || (isRTL ? 'عضو' : 'member'))
      : (t.home?.members || (isRTL ? 'أعضاء' : 'members'));
    return `${n.toLocaleString(isRTL ? 'ar-SA' : 'en-US')} ${label}`;
  }, [isRTL, t]);

  const slideshowItems = useMemo((): SlideItem[] => {
    const topPlaces = [...places]
      .sort((a, b) => (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0))
      .slice(0, 3)
      .map(p => ({
        id: p._id || p.id || '',
        type: 'place' as const,
        name: isRTL && (p as any).nameAr ? (p as any).nameAr : p.name,
        image: p.photos?.[0] || p.image || '',
        subtitle: isRTL && (p as any).cityAr ? (p as any).cityAr : (p.city || 'Saudi Arabia'),
        rating: p.ratingSummary?.avgRating || p.rating,
        badge: isRTL ? 'مكان' : 'Place', badgeColor: '#00f2ea',
      }));

    const topTours = [...tours]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 3)
      .map(tour => ({
        id: tour.id || (tour as any)._id || '',
        type: 'tour' as const,
        name: isRTL && (tour as any).titleAr ? (tour as any).titleAr : tour.title,
        image: tour.heroImage || '',
        subtitle: tour.departureLocation || tour.category || 'Saudi Arabia',
        rating: Number(tour.rating) || undefined,
        badge: isRTL ? 'جولة' : 'Tour', badgeColor: '#00f2ea',
      }));

    const topRentals = [...featuredRentals]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 2)
      .map(r => ({
        id: r.id || (r as any)._id || '',
        type: 'rental' as const,
        name: isRTL && (r as any).titleAr ? (r as any).titleAr : r.title,
        image: r.images?.[0] || r.image || '',
        subtitle: r.locationName || r.type || 'Saudi Arabia',
        rating: Number(r.rating) || undefined,
        badge: r.type || (isRTL ? 'إيجار' : 'Rental'), badgeColor: '#00f2ea',
      }));

    const result: SlideItem[] = [];
    const maxLen = Math.max(topPlaces.length, topTours.length, topRentals.length);
    for (let i = 0; i < maxLen; i++) {
      if (topPlaces[i])  result.push(topPlaces[i]);
      if (topTours[i])   result.push(topTours[i]);
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

  const handleSlideSelect = useCallback((id: string) => {
    const item = slideshowItems.find(s => s.id === id);
    if (!item) return;
    if (item.type === 'place')  onNavigate?.('places',  item.id);
    else if (item.type === 'tour')   onNavigate?.('tours',   item.id);
    else if (item.type === 'rental') onNavigate?.('rentals', item.id);
  }, [onNavigate, slideshowItems]);

  const { seeAll, sections } = l10n;

  const avatarUrl      = (user as any).avatar;
  const userFirstName  = user.name?.split(' ')[0] || 'Traveller';
  const tierLabel      = getKaramLevel(karamPoints);
  const { weather, loading } = useWeather(city);

  const smartCounts = useMemo(() => ({
    open:     places.filter(p => isOpenNow(p) === true).length,
    trending: places.filter(p => p.isTrending).length,
    family:   places.filter(p => p.isFamilySuitable).length,
  }), [places]);

  return (
    <div
      className="bg-white dark:bg-midnight min-h-full pb-32 transition-colors duration-500 overflow-x-hidden no-scrollbar"
      dir={isRTL ? 'rtl' : 'ltr'}
    >

      {/* ── Top Header (App Bar) ───────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white dark:from-midnight via-slate-50 dark:via-chamber to-white dark:to-midnight border-b border-slate-100 dark:border-white/5 pt-12 pb-5 px-6 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-lifted border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-lg group active:scale-95 transition-all">
              <Compass className="text-oasis-spring w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">
                {isRTL ? 'تريبو' : 'Tripo'}
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-oasis-spring shadow-mint-glow animate-pulse" />
                <span className="text-[9px] text-slate-400 dark:text-moon/60 font-black tracking-widest uppercase">Concierge</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationPanel />
            <button
              onClick={() => onNavigate?.('profile')}
              className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-lifted active:scale-90 transition-all shadow-lg"
            >
              {avatarUrl ? (
                <SafeImage src={avatarUrl} alt={userFirstName} className="w-full h-full object-cover" fallbackType="icon" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-oasis-spring bg-oasis-spring/10">
                  {userFirstName[0]?.toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="bg-slate-50/50 dark:bg-lifted/40 backdrop-blur-md border border-slate-200/20 dark:border-white/5 rounded-full px-3 py-1.5 flex items-center gap-2 shrink-0">
            <MapPin className="w-3 h-3 text-oasis-spring" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{translateCity(city, isRTL)}</span>
          </div>
          <div className="bg-slate-50/50 dark:bg-lifted/40 backdrop-blur-md border border-slate-200/20 dark:border-white/5 rounded-full px-3 py-1.5 flex items-center gap-2 shrink-0">
            <Cloud className="w-3 h-3 text-oasis-spring" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {loading ? '...' : weather ? `${weather.temp}°C · ${isRTL ? weather.textAr : weather.textEn}` : '28°C'}
            </span>
          </div>
          <div className="bg-slate-50/50 dark:bg-lifted/40 backdrop-blur-md border border-slate-200/20 dark:border-white/5 rounded-full px-3 py-1.5 flex items-center gap-2 shrink-0">
            <Star className="w-3 h-3 text-oasis-spring fill-oasis-spring" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{displayPoints} PTS</span>
          </div>
        </div>
      </div>

      {/* ── Hero Slideshow / Banner ────────────────────────────────────── */}
      <div className="px-6 pt-6">
        <div className="relative h-60 md:h-72 lg:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl group border border-slate-200 dark:border-white/10">
          <SafeImage
            src={cityHero.url}
            alt={cityHero.label}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            fallbackType="placeholder"
            seed={city}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 dark:from-midnight via-midnight/40 to-transparent" />
          
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="text-oasis-spring text-[10px] font-black uppercase tracking-[0.3em] mb-1 drop-shadow-md">{greeting}</p>
              <h2 className="text-4xl font-black text-white tracking-tighter leading-none mb-3 drop-shadow-lg">
                {userFirstName}
              </h2>
              <p className="text-white/80 dark:text-moon/70 text-xs font-bold leading-relaxed max-w-xs mb-5 uppercase tracking-wide drop-shadow-sm">
                {isRTL ? 'اكتشف أفضل ما في ' : 'Discover the best of '} {translateCity(city, isRTL)}
              </p>
              <button
                onClick={() => onNavigate?.('explore')}
                className="bg-oasis-spring text-midnight px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-mint-glow active:scale-95 transition-all"
              >
                {isRTL ? 'بدء الاستكشاف' : 'Explore Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Bar (Floating Glass) ─────────────────────────────────── */}
      <div className="px-6 mt-6 section-reveal">
        <button
          onClick={onOpenSearch}
          className="w-full bg-slate-50 dark:bg-chamber border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl"
        >
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 text-slate-400 dark:text-moon/40 group-hover:text-oasis-spring transition-colors" />
            <span className="text-slate-400 dark:text-moon/40 text-sm font-black uppercase tracking-widest">
              {isRTL ? 'ابحث عن وجهتك...' : 'Search destination...'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-lifted flex items-center justify-center border border-slate-100 dark:border-white/5 text-oasis-spring group-hover:bg-oasis-spring group-hover:text-midnight transition-all shadow-sm">
            <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* ── Quick Actions Grid ─────────────────────────────────────────── */}
      <div className="px-6 mt-8 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {[
            { id: 'explore', icon: Compass, label: isRTL ? 'خريطة' : 'Map', color: 'text-blue-400' },
            { id: 'ai_planner', icon: Sparkles, label: isRTL ? 'مخطط' : 'Planner', color: 'text-purple-400' },
            { id: 'create', icon: Plus, label: isRTL ? 'جديد' : 'New', color: 'text-oasis-spring' },
            { id: 'guide', icon: Camera, label: isRTL ? 'واقع معزز' : 'AR Guide', color: 'text-orange-400' },
            { id: 'your_mood', icon: Heart, label: isRTL ? 'مزاجي' : 'Mood', color: 'text-pink-400' }
          ].map((action) => (
            <button
              key={action.id}
              onClick={() => onNavigate?.(action.id === 'guide' ? 'ar' : action.id)}
              className="flex flex-col items-center gap-3 active:scale-90 transition-transform group"
            >
              <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-chamber border border-slate-100 dark:border-white/5 flex items-center justify-center shadow-xl group-hover:border-slate-200 dark:group-hover:border-white/20 transition-all relative overflow-hidden">
                <div className={`absolute inset-0 bg-white dark:bg-navy-900/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                <action.icon className={`w-6 h-6 ${action.color} group-hover:scale-110 transition-transform`} />
              </div>
              <span className="text-[9px] font-black text-slate-400 dark:text-moon/60 uppercase tracking-widest">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mood Section (Glass Card) ───────────────────────────────────── */}
      <div className="px-6 mt-8 section-reveal">
        <button
          onClick={() => onNavigate?.('your_mood')}
          className="w-full relative overflow-hidden rounded-[2rem] bg-slate-50 dark:bg-gradient-to-br dark:from-purple-500/10 dark:to-blue-500/10 border border-slate-100 dark:border-white/10 p-6 active:scale-[0.98] transition-all shadow-2xl group"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-chamber border border-slate-100 dark:border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
              {moodState.hasMood ? '✨' : '🎨'}
            </div>
            <div className="flex-1 text-start">
              {moodState.hasMood ? (
                <>
                  <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] mb-1">
                    {isRTL ? 'مزاجك اليوم' : "Current Vibe"} {moodStreak >= 2 && `🔥 ${moodStreak}`}
                  </p>
                  <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    {moodState.vibe} · {moodState.budget}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-[0.2em] mb-1">
                    {isRTL ? 'ما هو مزاجك؟' : 'Ready to Explore?'}
                  </p>
                  <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    {isRTL ? 'حدد طابع رحلتك' : 'Discover Your Vibe'}
                  </p>
                </>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-navy-900/5 flex items-center justify-center border border-slate-200 dark:border-white/10 group-hover:bg-oasis-spring group-hover:text-midnight transition-all">
              <ChevronRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>
      </div>

      {/* ── Main Content Sections ────────────────────────────────────────── */}
      <div className="px-6 mt-10 space-y-12">
        
        {slideshowItems.length > 0 && (
          <section className="section-reveal">
            <SectionHeader
              title={sections.popularSpots}
              onSeeAll={() => onNavigate?.('places')}
              seeAllLabel={seeAll}
              isRTL={isRTL}
            />
            <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5">
              <FeaturedSlideshow items={slideshowItems} onSelect={handleSlideSelect} height="h-80" lang={lang as any} />
            </div>
          </section>
        )}

        <section className="section-reveal">
          <SectionHeader
            title={t.home?.discoverTitle || (isRTL ? 'اكتشف الآن' : 'Fast Access')}
            seeAllLabel={seeAll}
            isRTL={isRTL}
          />
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'near',     nav: ['explore', 'near_me'],  label: t.home?.discoverNear || (isRTL ? 'قريب مني' : 'Near Me'),  emoji: '📍', accent: 'text-blue-500 dark:text-blue-400' },
              { id: 'open',     nav: ['places',  'open_now'], label: t.home?.discoverOpen || (isRTL ? 'مفتوح الآن' : 'Open Now'), emoji: '🕒', accent: 'text-oasis-spring' },
              { id: 'trending', nav: ['explore', 'trending'], label: t.home?.discoverTrending || (isRTL ? 'رائج' : 'Trending'),  emoji: '🔥', accent: 'text-red-500 dark:text-red-400' },
              { id: 'family',   nav: ['explore', 'family'],   label: t.home?.discoverFamily || (isRTL ? 'عائلي' : 'Family'),         emoji: '👪', accent: 'text-purple-500 dark:text-purple-400' },
            ].map(tile => (
              <button
                key={tile.id}
                onClick={() => onNavigate?.(tile.nav[0], tile.nav[1])}
                className="h-28 rounded-3xl bg-slate-50 dark:bg-chamber border border-slate-100 dark:border-white/5 shadow-xl p-5 flex flex-col justify-between active:scale-95 hover:border-slate-200 dark:hover:border-white/20 transition-all relative overflow-hidden group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-500">{tile.emoji}</span>
                  {tile.id === 'open' && <div className="w-2 h-2 rounded-full bg-oasis-spring shadow-mint-glow animate-pulse" />}
                </div>
                <div className="text-start">
                  <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight uppercase leading-none">{tile.label}</p>
                  <p className={`text-[8px] font-black uppercase tracking-widest mt-1.5 ${tile.accent}`}>Discover Now</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section-reveal">
          <SectionHeader
            title={t.home?.browseTitle || (isRTL ? 'الفئات' : 'Categories')}
            seeAllLabel={seeAll}
            isRTL={isRTL}
          />
          <div className="grid grid-cols-2 gap-4">
            {isLoadingPlaces ? <Skeleton className="h-44 rounded-3xl" /> : (
              <SectionTile
                label={t.home?.browsePlaces || (isRTL ? 'أماكن' : 'Places')} emoji="📍" accentColor="#1a1a1a"
                countLabel={errorPlaces ? 'RETRY' : `${places.length} Items`}
                thumbs={places.slice(0, 4).map(p => p.photos?.[0] || p.image)}
                onTap={errorPlaces ? fetchAllSections : () => onNavigate?.('places')}
              />
            )}
            {isLoadingTours ? <Skeleton className="h-44 rounded-3xl" /> : (
              <SectionTile
                label={t.home?.browseTours || (isRTL ? 'جولات' : 'Tours')} emoji="🧭" accentColor="#1a1a1a"
                countLabel={errorTours ? 'RETRY' : `${tours.length} Items`}
                thumbs={tours.slice(0, 4).map(to => to.heroImage)}
                onTap={errorTours ? fetchAllSections : () => onNavigate?.('tours')}
              />
            )}
            <SectionTile
              label={t.home?.browseEvents || (isRTL ? 'فعاليات' : 'Events')} emoji="🎉" accentColor="#1a1a1a"
              countLabel={errorEvents ? 'RETRY' : `${upcomingEvents.length} Items`}
              thumbs={upcomingEvents.slice(0, 4).map(e => e.image)}
              onTap={errorEvents ? fetchAllSections : () => onNavigate?.('events')}
            />
            {isLoadingRentals ? <Skeleton className="h-44 rounded-3xl" /> : (
              <SectionTile
                label={t.home?.browseStays || (isRTL ? 'إيجارات' : 'Stays')} emoji="🏕️" accentColor="#1a1a1a"
                countLabel={errorRentals ? 'RETRY' : `${featuredRentals.length} Items`}
                thumbs={featuredRentals.slice(0, 4).map(r => r.images?.[0] || r.image)}
                onTap={errorRentals ? fetchAllSections : () => onNavigate?.('rentals')}
              />
            )}
            {isLoadingCommunities ? <Skeleton className="h-44 rounded-3xl col-span-2" /> : (
              <SectionTile
                label={t.home?.browseCommunities || (isRTL ? 'مجتمعات' : 'Communities')} emoji="👥" accentColor="#1a1a1a"
                countLabel={`${communities.length} Communities`}
                thumbs={communities.slice(0, 4).map((c: any) => c.image)}
                onTap={() => onNavigate?.('communities')}
                wide
              />
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default HomeScreen;
