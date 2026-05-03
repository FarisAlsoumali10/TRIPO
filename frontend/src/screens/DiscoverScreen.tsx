import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, MapPin, Star, ArrowRight, TrendingUp, Users, Navigation } from 'lucide-react';
import { placeAPI, tourAPI, rentalAPI } from '../services/api';
import { Place, Tour, Rental } from '../types/index';
import { showToast } from '../components/Toast';

export type DiscoverMode = 'trending' | 'near' | 'family';

interface Props {
  mode: DiscoverMode;
  t: any;
  isRTL?: boolean;
  onBack: () => void;
  onSelectPlace: (id: string) => void;
  onSelectTour: (id: string) => void;
  onSelectRental: (id: string) => void;
  onSeeAllPlaces: (filter: string) => void;
  onSeeAllTours: (filter: string) => void;
  onSeeAllRentals: (filter: string) => void;
}

// ── Distance helpers ──────────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753], jeddah: [21.4858, 39.1925], mecca: [21.3891, 39.8579],
  medina: [24.5247, 39.5692], dammam: [26.4207, 50.0888], alula: [26.6081, 37.9162],
  taif: [21.2739, 40.4062], hail: [27.5114, 41.7208], abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715], yanbu: [24.0894, 38.0618], khobar: [26.2172, 50.1971],
  najran: [17.4930, 44.1277], jizan: [16.8892, 42.5611],
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cityKm(cityName: string, userLat: number, userLon: number): number {
  const key = cityName.toLowerCase().replace(/[\s-]+/g, '_');
  const coords = CITY_COORDS[key] ?? CITY_COORDS[cityName.toLowerCase()];
  if (coords) return haversineKm(userLat, userLon, coords[0], coords[1]);
  for (const [k, c] of Object.entries(CITY_COORDS)) {
    if (cityName.toLowerCase().includes(k.replace(/_/g, ' '))) return haversineKm(userLat, userLon, c[0], c[1]);
  }
  return 9999;
}

// ── Tiny card components ──────────────────────────────────────────────────────

const MiniCard: React.FC<{ img?: string; name: string; sub?: string; rating?: number; onClick: () => void }> = ({ img, name, sub, rating, onClick }) => (
  <button onClick={onClick}
    className="flex-shrink-0 w-40 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 active:scale-[0.97] transition-transform text-left">
    <div className="h-28 bg-slate-200 relative overflow-hidden">
      {img
        ? <img src={img} alt={name} className="w-full h-full object-cover" loading="lazy" />
        : <div className="w-full h-full flex items-center justify-center"><MapPin className="w-6 h-6 text-slate-300" /></div>
      }
      {rating != null && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span className="text-[10px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
        </div>
      )}
    </div>
    <div className="p-2.5">
      <p className="font-bold text-slate-900 text-xs truncate">{name}</p>
      {sub && <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>}
    </div>
  </button>
);

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section = ({ title, onSeeAll, children }: {
  title: string; onSeeAll: () => void; children: React.ReactNode;
}) => (
  <section className="mb-8">
    <div className="flex items-center justify-between mb-3 px-5">
      <h2 className="font-black text-slate-900 text-base">{title}</h2>
      <button onClick={onSeeAll} className="flex items-center gap-1 text-xs font-bold text-emerald-600">
        See all <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
      {children}
    </div>
  </section>
);

// ── Mode meta ─────────────────────────────────────────────────────────────────

const MODE_META: Record<DiscoverMode, { label: string; emoji: string; bg: string }> = {
  trending: { label: 'Trending', emoji: '🔥', bg: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  near:     { label: 'Near Me',  emoji: '📍', bg: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  family:   { label: 'Family',   emoji: '👨‍👩‍👧', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
};

// ── Main screen ───────────────────────────────────────────────────────────────

export const DiscoverScreen: React.FC<Props> = ({
  mode, onBack, onSelectPlace, onSelectTour, onSelectRental,
  onSeeAllPlaces, onSeeAllTours, onSeeAllRentals,
}) => {
  const [places, setPlaces]   = useState<Place[]>([]);
  const [tours, setTours]     = useState<Tour[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      placeAPI.getPlaces(),
      tourAPI.getTours(),
      rentalAPI.getRentals(),
    ]).then(([p, t, r]) => {
      if (p.status === 'fulfilled') setPlaces(Array.isArray(p.value) ? p.value : []);
      if (t.status === 'fulfilled') setTours(Array.isArray(t.value) ? t.value : []);
      if (r.status === 'fulfilled') setRentals(Array.isArray(r.value) ? r.value : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (mode !== 'near') return;
    if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => { showToast('Could not get your location', 'error'); setLocating(false); },
    );
  }, [mode]);

  const filteredPlaces = useMemo(() => {
    let list = [...places];
    if (mode === 'family') list = list.filter(p => p.accessibility?.family);
    if (mode === 'trending') list.sort((a, b) => (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0));
    if (mode === 'near' && userCoords) list.sort((a, b) => cityKm(a.city ?? '', userCoords[0], userCoords[1]) - cityKm(b.city ?? '', userCoords[0], userCoords[1]));
    return list.slice(0, 8);
  }, [places, mode, userCoords]);

  const filteredTours = useMemo(() => {
    let list = [...tours];
    if (mode === 'family') list = list.filter(t => t.accessibility?.familyFriendly);
    if (mode === 'trending') list.sort((a, b) => (b.bookingsCount ?? b.reviewCount ?? 0) - (a.bookingsCount ?? a.reviewCount ?? 0));
    if (mode === 'near' && userCoords) list.sort((a, b) => cityKm(a.departureLocation ?? '', userCoords[0], userCoords[1]) - cityKm(b.departureLocation ?? '', userCoords[0], userCoords[1]));
    return list.slice(0, 8);
  }, [tours, mode, userCoords]);

  const filteredRentals = useMemo(() => {
    if (mode === 'family') return []; // Rental type has no family field
    let list = [...rentals];
    if (mode === 'trending') list.sort((a, b) => (b.ratingSummary?.reviewCount ?? 0) - (a.ratingSummary?.reviewCount ?? 0));
    if (mode === 'near' && userCoords) list.sort((a, b) => cityKm(a.city ?? '', userCoords[0], userCoords[1]) - cityKm(b.city ?? '', userCoords[0], userCoords[1]));
    return list.slice(0, 8);
  }, [rentals, mode, userCoords]);

  const meta = MODE_META[mode];

  const Skeleton = () => (
    <div className="flex gap-3 px-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex-shrink-0 w-40 h-44 bg-slate-200 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">{meta.emoji} {meta.label}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'near' && locating ? 'Finding your location…' : 'Places · Tours · Stays'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-6 pb-24">
        {mode === 'near' && !userCoords && !locating && (
          <div className="mx-5 mb-6 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <Navigation className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-sm font-medium text-blue-700">Enable location to sort by distance</p>
          </div>
        )}

        {/* Places */}
        {loading ? <Skeleton /> : filteredPlaces.length > 0 ? (
          <Section title="📍 Places" onSeeAll={() => onSeeAllPlaces(mode === 'near' ? 'near_me' : mode === 'family' ? 'family' : 'trending')}>
            {filteredPlaces.map(p => {
              const id = p._id || p.id || '';
              return (
                <MiniCard key={id} onClick={() => onSelectPlace(id)}
                  img={p.photos?.[0] || p.image} name={p.name}
                  sub={p.city || 'Saudi Arabia'}
                  rating={p.ratingSummary?.avgRating ?? p.rating}
                />
              );
            })}
          </Section>
        ) : null}

        {/* Tours */}
        {loading ? <Skeleton /> : filteredTours.length > 0 ? (
          <Section title="🧭 Tours" onSeeAll={() => onSeeAllTours(mode === 'near' ? 'near_me' : mode === 'family' ? 'family' : 'trending')}>
            {filteredTours.map(t => {
              const id = t.id || (t as any)._id || '';
              return (
                <MiniCard key={id} onClick={() => onSelectTour(id)}
                  img={t.heroImage} name={t.title}
                  sub={t.departureLocation}
                  rating={t.rating}
                />
              );
            })}
          </Section>
        ) : null}

        {/* Rentals — hidden for family mode (no family field on Rental) */}
        {loading ? <Skeleton /> : filteredRentals.length > 0 ? (
          <Section title="🏕️ Stays" onSeeAll={() => onSeeAllRentals(mode === 'near' ? 'near_me' : 'trending')}>
            {filteredRentals.map(r => {
              const id = r.id || (r as any)._id || '';
              return (
                <MiniCard key={id} onClick={() => onSelectRental(id)}
                  img={r.images?.[0] || r.image} name={r.title}
                  sub={r.city || r.locationName}
                  rating={r.ratingSummary?.avgRating ?? r.rating}
                />
              );
            })}
          </Section>
        ) : null}

        {!loading && filteredPlaces.length === 0 && filteredTours.length === 0 && filteredRentals.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
            <p className="text-4xl mb-3">{meta.emoji}</p>
            <p className="font-bold text-slate-700">No results found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different filter</p>
          </div>
        )}
      </div>
    </div>
  );
};
