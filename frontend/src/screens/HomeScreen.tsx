import React, { useState, useEffect } from 'react';
import { Star, Clock, Wallet, MapPin, Camera, Plus, ChevronRight, Sparkles, Search, Calendar, Tent } from 'lucide-react';
import { SAUDI_EVENTS } from './EventsScreen';
import { MOCK_TOURS } from './ToursScreen';
import { MOCK_RENTALS } from './RentalsScreen';
import { MOCK_COMMUNITIES } from './CommunitiesScreen';
import { User, Itinerary, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI } from '../services/api';
import { SkeletonCard, SkeletonList } from '../components/ui';
import { showToast } from '../components/Toast';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';

const CATEGORY_KEYS = ['All', 'Nature', 'Heritage', 'Adventure', 'Food', 'Urban', 'Beach', 'Desert'];

export const MOCK_PLACES: Place[] = [
  {
    id: 'mp-1', name: 'Edge of the World', city: 'Riyadh',
    description: 'Dramatic escarpment with panoramic desert views stretching to the horizon.',
    categoryTags: ['Nature', 'Adventure'],
    photos: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'],
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
    description: 'Green mountain forests, wildlife, and cool highland air in southern Saudi Arabia.',
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

// Iconic landmark per Saudi city
const CITY_LANDMARKS: Record<string, { url: string; label: string }> = {
  'riyadh':   { url: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200', label: 'Kingdom Centre Tower, Riyadh' },
  'jeddah':   { url: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200', label: 'Al-Balad Historic District, Jeddah' },
  'mecca':    { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  'makkah':   { url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200', label: 'Makkah Al-Mukarramah' },
  'medina':   { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  'madinah':  { url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=1200', label: 'Al-Madinah Al-Munawwarah' },
  'alula':    { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  'al ula':   { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Hegra (Madain Saleh), AlUla' },
  'abha':     { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Asir Mountains, Abha' },
  'tabuk':    { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Wadi Disah, Tabuk' },
  'dammam':   { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Dammam Corniche' },
  'khobar':   { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  'al khobar':{ url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200', label: 'Al Khobar Waterfront' },
  'yanbu':    { url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200', label: 'Red Sea Coast, Yanbu' },
  'taif':     { url: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200', label: 'Al Hada Mountains, Taif' },
  'neom':     { url: 'https://images.unsplash.com/photo-1596008194705-f0ff3d2c95a2?w=1200', label: 'NEOM, Tabuk Province' },
  'hail':     { url: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200', label: 'Qishla Palace, Hail' },
  'najran':   { url: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200', label: 'Najran Fort' },
};

const FALLBACK_HEROES = [
  'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200',
  'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200',
  'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200',
];

function getCityHero(city?: string): { url: string; label: string } {
  if (city) {
    const key = city.trim().toLowerCase();
    if (CITY_LANDMARKS[key]) return CITY_LANDMARKS[key];
    // partial match
    const match = Object.keys(CITY_LANDMARKS).find(k => key.includes(k) || k.includes(key));
    if (match) return CITY_LANDMARKS[match];
  }
  const idx = Math.floor(Math.random() * FALLBACK_HEROES.length);
  return { url: FALLBACK_HEROES[idx], label: 'Saudi Arabia' };
}

export const HomeScreen = ({
  user,
  onOpenItinerary,
  t,
  onOpenAR,
  onNavigate,
}: {
  user: User;
  onOpenItinerary: (i: Itinerary) => void;
  t: any;
  onOpenAR: () => void;
  onNavigate?: (tab: string, id?: string) => void;
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [tours, setTours] = useState<Tour[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [featuredRentals, setFeaturedRentals] = useState<Rental[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);

  // Build slideshow items from top-rated places, tours, rentals (interleaved)
  const slideshowItems: SlideItem[] = (() => {
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
        badge: 'Place',
        badgeColor: '#0d9488',
      }));

    const topTours = [...tours]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 3)
      .map(t => ({
        id: t.id || (t as any)._id || '',
        type: 'tour' as const,
        name: t.title,
        image: t.heroImage || '',
        subtitle: t.departureLocation || t.category || 'Saudi Arabia',
        rating: Number(t.rating) || undefined,
        badge: 'Tour',
        badgeColor: '#7c3aed',
      }));

    const topRentals = [...featuredRentals]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 2)
      .map(r => ({
        id: r.id || (r as any)._id || '',
        type: 'rental' as const,
        name: r.title,
        image: (r.images && r.images[0]) || r.image || '',
        subtitle: r.locationName || r.type || 'Saudi Arabia',
        rating: Number(r.rating) || undefined,
        badge: r.type || 'Rental',
        badgeColor: '#d97706',
      }));

    // Interleave: place, tour, rental, place, tour, rental...
    const result: SlideItem[] = [];
    const maxLen = Math.max(topPlaces.length, topTours.length, topRentals.length);
    for (let i = 0; i < maxLen; i++) {
      if (topPlaces[i]) result.push(topPlaces[i]);
      if (topTours[i]) result.push(topTours[i]);
      if (topRentals[i]) result.push(topRentals[i]);
    }
    return result.filter(s => s.image); // only items with photos
  })();

  const cityHero = getCityHero(user.smartProfile?.city);

  useEffect(() => {
    tourAPI.getTours()
      .then(data => { const list = Array.isArray(data) ? data : []; setTours(list.length > 0 ? list : MOCK_TOURS); })
      .catch(() => setTours(MOCK_TOURS))
      .finally(() => setIsLoadingTours(false));

    placeAPI.getPlaces()
      .then(data => { const list = Array.isArray(data) ? data : []; setPlaces(list.length > 0 ? list : MOCK_PLACES); })
      .catch(() => setPlaces(MOCK_PLACES))
      .finally(() => setIsLoadingPlaces(false));

    rentalAPI.getRentals()
      .then(data => { const list = Array.isArray(data) ? data : []; setFeaturedRentals(list.length > 0 ? list.slice(0, 4) : MOCK_RENTALS.slice(0, 4)); })
      .catch(() => setFeaturedRentals(MOCK_RENTALS.slice(0, 4)));
  }, []);

  const filteredPlaces = activeCategory === 'All'
    ? places
    : places.filter(p =>
        p.categoryTags?.some(tag => tag.toLowerCase().includes(activeCategory.toLowerCase())) ||
        p.category?.toLowerCase().includes(activeCategory.toLowerCase())
      );

  const filteredTours = activeCategory === 'All'
    ? tours
    : tours.filter(t =>
        t.category?.toLowerCase().includes(activeCategory.toLowerCase()) ||
        t.title?.toLowerCase().includes(activeCategory.toLowerCase())
      );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t.goodMorning || 'Good morning';
    if (h < 17) return t.goodAfternoon || 'Good afternoon';
    return t.goodEvening || 'Good evening';
  };

  const handleSlidePress = (item: SlideItem) => {
    if (item.type === 'place') onNavigate?.('places', item.id);
    else if (item.type === 'tour') onNavigate?.('tours', item.id);
    else if (item.type === 'rental') onNavigate?.('rentals', item.id);
  };

  return (
    <div className="bg-slate-50 min-h-full pb-24">

      {/* Hero Banner */}
      <div className="relative h-56 lg:h-72 overflow-hidden">
        <img
          src={cityHero.url}
          className="w-full h-full object-cover"
          alt={cityHero.label}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-slate-50" />
        <div className="absolute bottom-6 left-6 right-6">
          <p className="text-white/80 text-sm font-medium">{greeting()},</p>
          <h1 className="text-white text-2xl font-extrabold tracking-tight drop-shadow">
            {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {cityHero.label}
          </p>
        </div>
        <button
          onClick={onOpenAR}
          className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30"
          title="AR Guide"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-sm pt-3 pb-2 border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
          {CATEGORY_KEYS.map(cat => {
            const catLabel: Record<string, string> = {
              All: t.catAll || 'All', Nature: t.catNature || 'Nature',
              Heritage: t.catHeritage || 'Heritage', Adventure: t.catAdventure || 'Adventure',
              Food: t.catFood || 'Food', Urban: t.catUrban || 'Urban',
              Beach: t.catBeach || 'Beach', Desert: t.catDesert || 'Desert',
            };
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                }`}
              >
                {catLabel[cat] || cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Popular Spots Slideshow */}
      {slideshowItems.length > 0 && (
        <div className="mt-4 mb-1">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-slate-900">{t.sectionPopularSpots || '🌟 Popular Spots'}</h2>
            <span className="text-xs text-slate-400 font-medium">{t.sectionPopularSpotsDesc || 'Places · Tours · Rentals'}</span>
          </div>
          <FeaturedSlideshow items={slideshowItems} onPress={handleSlidePress} height="h-72" />
        </div>
      )}

      <div className="px-4 pt-5 space-y-8">

        {/* Places Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {activeCategory === 'All' ? (t.sectionPopularPlaces || '📍 Popular Places') : `${t.sectionPopularPlacesCat || '📍'} ${activeCategory}`}
            </h2>
            <button onClick={() => onNavigate?.('places')} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              {t.seeAll || 'See all'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingPlaces ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-44">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-slate-100">
              <MapPin className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-slate-400 text-sm">No places found</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {filteredPlaces.map(place => {
                const img = place.photos?.[0] || place.image;
                const rating = place.ratingSummary?.avgRating || place.rating;
                return (
                  <button
                    key={place._id || place.id}
                    onClick={() => onNavigate?.('places', place.id || place._id)}
                    className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow text-left"
                  >
                    <div className="h-28 bg-slate-200 relative overflow-hidden">
                      {img ? (
                        <img src={img} className="w-full h-full object-cover" alt={place.name} />
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
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {place.categoryTags?.[0] || place.category || place.city || ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Popular Tours Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {activeCategory === 'All' ? (t.sectionPopularTours || '🧭 Popular Tours') : `${t.sectionPopularToursCat || '🧭'} ${activeCategory}`}
            </h2>
            <button onClick={() => onNavigate?.('tours')} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              {t.seeAll || 'See all'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingTours ? (
            <SkeletonList count={3} />
          ) : filteredTours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <Sparkles className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-slate-500 font-semibold text-sm mb-1">No tours found</p>
              <p className="text-slate-400 text-xs">Try a different category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTours.map(tour => (
                <div
                  key={tour.id}
                  onClick={() => onNavigate?.('tours', tour.id || (tour as any)._id)}
                  className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex cursor-pointer"
                >
                  {/* Image */}
                  <div className="w-28 h-28 flex-shrink-0 bg-slate-200 relative overflow-hidden">
                    {tour.heroImage ? (
                      <img src={tour.heroImage} className="w-full h-full object-cover" alt={tour.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    {/* Difficulty badge */}
                    <span className={`absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      tour.difficulty === 'easy' ? 'bg-emerald-500 text-white' :
                      tour.difficulty === 'moderate' ? 'bg-amber-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {tour.difficulty}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 flex-1">{tour.title}</h3>
                      {tour.rating && (
                        <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-slate-700">{Number(tour.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mb-2 truncate">{tour.departureLocation}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        {tour.totalDuration}h
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        {tour.stops?.length ?? 0} stops
                      </span>
                      <span className="font-bold text-emerald-600 ml-auto">
                        {tour.pricePerPerson} SAR
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center pr-3">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Events Section */}
        {(() => {
          const now = new Date();
          const upcoming = SAUDI_EVENTS
            .filter(e => new Date(e.endDate) >= now)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 5);
          if (!upcoming.length) return null;
          const fmtDate = (d: string) =>
            new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">🎉 Upcoming Events</h2>
                <button
                  onClick={() => onNavigate?.('events')}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {upcoming.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onNavigate?.('events', event.id)}
                    className="flex-shrink-0 w-56 rounded-2xl overflow-hidden shadow-sm border border-slate-100 text-left active:scale-95 transition-transform"
                  >
                    {/* Image */}
                    <div className="relative h-32 bg-slate-200 overflow-hidden">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {/* Category badge */}
                      <span
                        className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.category}
                      </span>
                      {/* Date badge */}
                      <div className="absolute bottom-2 right-2 bg-white/95 rounded-lg px-2 py-1 text-center min-w-[44px]">
                        <p className="text-[10px] font-extrabold text-slate-900 leading-tight">
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </p>
                        <p className="text-sm font-extrabold text-slate-900 leading-tight">
                          {new Date(event.startDate).getDate()}
                        </p>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="bg-white p-3">
                      <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{event.title}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-400 truncate">{event.location}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs text-emerald-600 font-medium">
                          {fmtDate(event.startDate)}
                          {event.endDate !== event.startDate && ` – ${fmtDate(event.endDate)}`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Popular Rentals Block */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">🏕️ Popular Rentals</h2>
            <button onClick={() => onNavigate?.('rentals')} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {featuredRentals.map(rental => {
              const img = (rental.images && rental.images[0]) || rental.image;
              return (
                <button
                  key={rental.id}
                  onClick={() => onNavigate?.('rentals', rental.id)}
                  className="flex-shrink-0 w-48 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow text-left group"
                >
                  <div className="h-32 bg-slate-200 relative overflow-hidden">
                    {img ? (
                      <img src={img} alt={rental.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tent className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    {rental.rating && (
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-bold text-slate-700">{Number(rental.rating).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {rental.type}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-slate-900 text-sm truncate">{rental.title}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />{rental.locationName}
                    </p>
                    <p className="text-sm font-extrabold text-emerald-700 mt-1.5">{rental.price} <span className="text-xs font-normal text-slate-400">SAR/night</span></p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Popular Communities */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">👥 Popular Communities</h2>
            <button onClick={() => onNavigate?.('communities')} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {MOCK_COMMUNITIES.slice(0, 5).map(community => (
              <button
                key={community.id}
                onClick={() => onNavigate?.('communities', community.id)}
                className="flex-shrink-0 w-40 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow text-left group"
              >
                {/* Cover image */}
                <div className="h-24 bg-slate-200 relative overflow-hidden">
                  <img
                    src={community.image}
                    alt={community.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-xl">{community.icon}</span>
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {community.category}
                  </span>
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="font-bold text-slate-900 text-xs leading-tight line-clamp-2">{community.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{community.memberCount.toLocaleString()} members</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">✨ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Search, label: 'Explore Map', color: 'bg-blue-50 text-blue-600', action: () => onNavigate?.('explore') },
              { icon: Sparkles, label: 'AI Planner', color: 'bg-purple-50 text-purple-600', action: () => onNavigate?.('ai_planner') },
              { icon: Plus, label: 'New Trip', color: 'bg-emerald-50 text-emerald-600', action: () => onNavigate?.('create') },
              { icon: Camera, label: 'AR Guide', color: 'bg-orange-50 text-orange-600', action: onOpenAR },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-800 text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
};
