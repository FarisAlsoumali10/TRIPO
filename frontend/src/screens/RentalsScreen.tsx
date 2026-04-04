import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Tent, Plus, X, Star, MapPin, Flame, Phone, SlidersHorizontal,
  Camera, ExternalLink, MessageCircle, ChevronLeft, ChevronRight, User,
  ArrowLeft, Home, BedDouble, Users, Info, Trophy, Search,
  TrendingUp, Award, Navigation, Wallet, Heart, Share2, Send,
  Wifi, Utensils, Car, Waves, Wind, ShieldCheck, Calendar, Clock,
} from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Rental } from '../types/index';
import { rentalAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';
import { PhotoLightbox } from '../components/PhotoLightbox';

const STORAGE_KEY = 'tripo_rentals_local';
const REVIEWS_KEY = 'tripo_rental_reviews';
const FAVORITES_KEY = 'tripo_rental_favorites';

interface RentalReview {
  id: string;
  rentalId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

type QuickFilter = 'budget' | 'trending' | 'top_rated' | 'near_me' | null;

const AMENITY_LIST = ['WiFi', 'BBQ', 'Kitchen', 'Pool', 'AC', 'Parking', 'Fireplace', 'Pet Friendly'] as const;
const CITY_LIST = ['All', 'Riyadh', 'Jeddah', 'AlUla', 'Abha', 'Yanbu', 'Dammam'] as const;
const SPORT_TYPE_LIST = ['All', 'Padel', 'Football', 'Basketball', 'Tennis'] as const;
const TYPE_FILTER_IDS = ['All', 'Kashta', 'Camp', 'Chalet', 'Apartment', 'Sports'] as const;

const SPORT_TYPES = new Set(['Padel', 'Football', 'Basketball', 'Tennis', 'Cricket', 'Volleyball']);

interface FilterState {
  priceMin: number;
  priceMax: number;
  minCapacity: number;
  city: string;
  amenities: string[];
}

const DEFAULT_FILTER: FilterState = { priceMin: 0, priceMax: 5000, minCapacity: 0, city: 'All', amenities: [] };

// ── helpers ───────────────────────────────────────────────────────────────────

function loadLocalRentals(): Rental[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocalRentals(list: Rental[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function loadReviews(rentalId: string): RentalReview[] {
  try {
    const all: RentalReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    return all.filter(r => r.rentalId === rentalId);
  } catch { return []; }
}
function saveReview(review: RentalReview) {
  try {
    const all: RentalReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    all.push(review);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
  } catch {}
}
function loadFavorites(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') as string[]); } catch { return new Set<string>(); }
}
function saveFavorites(favs: Set<string>) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs])); } catch {}
}
function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Amenity icon map ──────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3.5 h-3.5" />,
  'BBQ': <Flame className="w-3.5 h-3.5" />,
  'Kitchen': <Utensils className="w-3.5 h-3.5" />,
  'Pool': <Waves className="w-3.5 h-3.5" />,
  'AC': <Wind className="w-3.5 h-3.5" />,
  'Parking': <Car className="w-3.5 h-3.5" />,
  'Fireplace': <Flame className="w-3.5 h-3.5" />,
  'Pet Friendly': <Heart className="w-3.5 h-3.5" />,
  'Changing Rooms': <User className="w-3.5 h-3.5" />,
  'Equipment Rental': <Trophy className="w-3.5 h-3.5" />,
  'Night Lighting': <Star className="w-3.5 h-3.5" />,
  'Snorkeling': <Waves className="w-3.5 h-3.5" />,
  'Kayak': <Navigation className="w-3.5 h-3.5" />,
};

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_RENTALS: Rental[] = [
  {
    id: 'mock-r1',
    title: 'Desert Kashta Camp — Al Thumamah',
    type: 'Kashta',
    price: 850,
    locationName: 'Al Thumamah, Riyadh',
    city: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1533745848184-3db07256e163?w=800&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
    ],
    rating: 4.8,
    capacity: 20,
    bedrooms: 0,
    amenities: ['BBQ', 'Kitchen', 'Parking'],
    cleaningFee: 100,
    serviceFee: 80,
    lat: 24.898,
    lng: 46.712,
    description: 'A premium desert kashta camp set among rolling red dunes north of Riyadh. Includes a fully equipped outdoor kitchen, bonfire pit, and stargazing deck. Perfect for families and groups of up to 20 guests.',
    mapQuery: 'Al Thumamah National Park, Riyadh',
    contactName: 'Mohammed Al-Shehri',
    contactPhone: '+966501234567',
    contactWhatsapp: '+966501234567',
    availableFrom: '2026-04-05',
    availableTo: '2026-12-31',
  },
  {
    id: 'mock-r2',
    title: 'Mountain Chalet — Abha Highlands',
    type: 'Chalet',
    price: 1200,
    locationName: 'Abha, Asir Region',
    city: 'Abha',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
      'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=800&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    ],
    rating: 4.9,
    capacity: 8,
    bedrooms: 3,
    amenities: ['WiFi', 'Kitchen', 'BBQ', 'AC', 'Fireplace'],
    cleaningFee: 150,
    serviceFee: 120,
    lat: 18.2164,
    lng: 42.5053,
    verified: true,
    description: 'Stunning mountain chalet with panoramic views over the Asir mountains. 3 bedrooms, a fully equipped kitchen, private terrace with BBQ, and a cozy fireplace for cool highland evenings. Sleeps up to 8.',
    mapQuery: 'Abha, Asir, Saudi Arabia',
    contactName: 'Fatima Al-Ghamdi',
    contactPhone: '+966509876543',
    contactWhatsapp: '+966509876543',
    availableFrom: '2026-04-01',
    availableTo: '2026-11-30',
  },
  {
    id: 'mock-r3',
    title: 'Red Sea Beachfront Camp — Yanbu',
    type: 'Camp',
    price: 650,
    locationName: 'Yanbu Al-Bahr, Madinah',
    city: 'Yanbu',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    ],
    rating: 4.7,
    capacity: 12,
    bedrooms: 0,
    amenities: ['BBQ', 'Snorkeling', 'Kayak'],
    cleaningFee: 80,
    serviceFee: 65,
    lat: 24.0889,
    lng: 38.0580,
    description: 'Wake up steps from the crystal-clear Red Sea with direct access to world-class snorkelling reefs. The camp includes 4 glamping tents, beach chairs, a BBQ station, and kayak rentals.',
    mapQuery: 'Yanbu Al-Bahr Beach, Saudi Arabia',
    contactName: 'Khalid Al-Zahrani',
    contactPhone: '+966554321098',
    contactWhatsapp: '+966554321098',
    availableFrom: '2026-04-10',
    availableTo: '2026-10-31',
  },
  {
    id: 'mock-r4',
    title: 'AlUla Desert Glamping',
    type: 'Camp',
    price: 1500,
    locationName: 'AlUla, Madinah Region',
    city: 'AlUla',
    image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&q=80',
    ],
    rating: 5.0,
    capacity: 4,
    bedrooms: 2,
    amenities: ['Pool', 'WiFi', 'Kitchen', 'AC', 'Parking'],
    cleaningFee: 200,
    serviceFee: 150,
    lat: 26.6144,
    lng: 37.9146,
    verified: true,
    description: 'Luxury glamping tents surrounded by the ancient sandstone formations of AlUla. Wake up to sunrise over Hegra, enjoy a private chef breakfast, and stargaze from a private hot tub. An unmissable Saudi experience.',
    mapQuery: 'AlUla Old Town, Saudi Arabia',
    contactName: 'Reem Al-Harbi',
    contactPhone: '+966561234567',
    contactWhatsapp: '+966561234567',
    availableFrom: '2026-04-01',
    availableTo: '2026-06-30',
  },
  {
    id: 'mock-r5',
    title: 'Modern Apartment — Al Olaya, Riyadh',
    type: 'Apartment',
    price: 450,
    locationName: 'Al Olaya, Riyadh',
    city: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
    ],
    rating: 4.5,
    capacity: 4,
    bedrooms: 2,
    amenities: ['WiFi', 'Kitchen', 'AC', 'Parking'],
    cleaningFee: 60,
    serviceFee: 45,
    lat: 24.6877,
    lng: 46.6847,
    description: 'Sleek and fully furnished 2-bedroom apartment in the heart of Riyadh\'s business district. Walking distance to Kingdom Centre Tower, premier malls, and Riyadh\'s best restaurants. High-speed WiFi included.',
    mapQuery: 'Al Olaya District, Riyadh, Saudi Arabia',
    contactName: 'Abdullah Al-Mutairi',
    contactPhone: '+966572345678',
    availableFrom: '2026-04-01',
    availableTo: '2026-12-31',
  },
];

export const MOCK_SPORT_VENUES: Rental[] = [
  {
    id: 'mock-sp1',
    title: 'Premium Padel Club — Al Malqa',
    type: 'Padel',
    price: 200,
    locationName: 'Al Malqa, Riyadh',
    city: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
      'https://images.unsplash.com/photo-1595435742729-0e6e2a46e620?w=800&q=80',
    ],
    rating: 4.8,
    capacity: 4,
    amenities: ['Changing Rooms', 'Equipment Rental', 'Night Lighting', 'AC'],
    lat: 24.8203,
    lng: 46.6311,
    verified: true,
    description: '4 professional padel courts with glass walls, night lighting, and air-conditioned changing rooms. Equipment rental available. Suitable for all levels.',
    mapQuery: 'Al Malqa District, Riyadh, Saudi Arabia',
    contactName: 'Turki Al-Otaibi',
    contactPhone: '+966551234567',
    contactWhatsapp: '+966551234567',
  },
  {
    id: 'mock-sp2',
    title: 'Full-Size Football Pitch — Jeddah',
    type: 'Football',
    price: 400,
    locationName: 'Al Rawdah, Jeddah',
    city: 'Jeddah',
    image: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80',
    ],
    rating: 4.6,
    capacity: 22,
    amenities: ['Changing Rooms', 'Night Lighting', 'Parking'],
    lat: 21.5755,
    lng: 39.1540,
    description: 'FIFA-standard artificial grass pitch with floodlights for evening games. Capacity for 22 players. Includes a referee room, seating stands, and a snack bar.',
    mapQuery: 'Al Rawdah, Jeddah, Saudi Arabia',
    contactName: 'Hassan Al-Ghamdi',
    contactPhone: '+966562345678',
    contactWhatsapp: '+966562345678',
  },
  {
    id: 'mock-sp3',
    title: 'Indoor Basketball Arena — Dammam',
    type: 'Basketball',
    price: 150,
    locationName: 'Al Faisaliah, Dammam',
    city: 'Dammam',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    ],
    rating: 4.5,
    capacity: 10,
    amenities: ['Changing Rooms', 'AC', 'Parking'],
    lat: 26.3927,
    lng: 49.9777,
    description: 'Full-size indoor basketball court with hardwood flooring, electronic scoreboard, and bleacher seating. Available for half-court or full-court bookings.',
    mapQuery: 'Al Faisaliah, Dammam, Saudi Arabia',
    contactName: 'Nasser Al-Qahtani',
    contactPhone: '+966573456789',
    contactWhatsapp: '+966573456789',
  },
  {
    id: 'mock-sp4',
    title: 'Mini Football — 5-a-side Riyadh',
    type: 'Football',
    price: 250,
    locationName: 'Al Yasmin, Riyadh',
    city: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    ],
    rating: 4.7,
    capacity: 10,
    amenities: ['Night Lighting', 'Equipment Rental'],
    lat: 24.8355,
    lng: 46.6583,
    description: 'Compact 5-a-side turf pitch perfect for quick matches with friends. Night-lit, fully enclosed, and available in 1-hour or 2-hour slots.',
    mapQuery: 'Al Yasmin, Riyadh, Saudi Arabia',
    contactName: 'Omar Al-Shammari',
    contactPhone: '+966584567890',
    contactWhatsapp: '+966584567890',
  },
];

// ── Image carousel ────────────────────────────────────────────────────────────

const ImageCarousel = ({ images, title }: { images: string[]; title: string }) => {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  return (
    <div className="relative h-52 w-full overflow-hidden rounded-xl bg-slate-200">
      <img
        src={images[idx]}
        alt={title}
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
        loading="lazy"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Star picker ───────────────────────────────────────────────────────────────

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)} className="focus:outline-none">
        <Star className={`w-7 h-7 transition-colors ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      </button>
    ))}
  </div>
);

// ── Filter Panel ──────────────────────────────────────────────────────────────

const FilterPanel = ({
  open, onClose, filters, onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) => {
  const [local, setLocal] = useState<FilterState>(filters);

  useEffect(() => { if (open) setLocal(filters); }, [open]);

  const activeCount = [
    local.priceMin > 0 || local.priceMax < 5000,
    local.minCapacity > 0,
    local.city !== 'All',
    local.amenities.length > 0,
  ].filter(Boolean).length;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg">Filters</h3>
            {activeCount > 0 && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {/* Price range */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Price Range (SAR / night)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 mb-1 block">Min</label>
                <input
                  type="number"
                  min={0}
                  max={local.priceMax - 50}
                  step={50}
                  value={local.priceMin}
                  onChange={e => setLocal(f => ({ ...f, priceMin: Math.min(+e.target.value, f.priceMax - 50) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <span className="text-slate-400 mt-4">—</span>
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 mb-1 block">Max</label>
                <input
                  type="number"
                  min={local.priceMin + 50}
                  max={10000}
                  step={50}
                  value={local.priceMax}
                  onChange={e => setLocal(f => ({ ...f, priceMax: Math.max(+e.target.value, f.priceMin + 50) }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="5000"
                />
              </div>
            </div>
          </div>

          {/* Guests / capacity */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Minimum Guests</p>
            <div className="flex gap-2 flex-wrap">
              {[0, 2, 4, 6, 8, 12, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setLocal(f => ({ ...f, minCapacity: n }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${local.minCapacity === n ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                >
                  {n === 0 ? 'Any' : `${n}+`}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">City</p>
            <div className="flex gap-2 flex-wrap">
              {CITY_LIST.map(c => (
                <button
                  key={c}
                  onClick={() => setLocal(f => ({ ...f, city: c }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${local.city === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Amenities</p>
            <div className="flex gap-2 flex-wrap">
              {AMENITY_LIST.map(a => {
                const active = local.amenities.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => setLocal(f => ({
                      ...f,
                      amenities: active ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
                    }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                  >
                    {AMENITY_ICONS[a] || null}
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-3 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={() => setLocal(DEFAULT_FILTER)}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Reset
          </button>
          <button
            onClick={() => { onChange(local); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Rental detail page ────────────────────────────────────────────────────────

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const RentalDetailPage = ({
  rental, onBack, allRentals = [], onSelectRental, t, favorites, onToggleFavorite,
}: {
  rental: Rental;
  onBack: () => void;
  allRentals?: Rental[];
  onSelectRental?: (r: Rental) => void;
  t: any;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) => {
  const isSport = SPORT_TYPES.has(rental.type);
  const images = rental.images?.length ? rental.images : rental.image ? [rental.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const phoneNum = rental.contactWhatsapp || rental.contactPhone;
  const rentalId = rental.id || (rental as any)._id || '';
  const isFav = favorites.has(rentalId);

  // Auto-advance hero images
  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setImgIdx(i => (i + 1) % images.length), 3500);
    return () => clearInterval(id);
  }, [images.length]);

  // Reviews
  const [reviews, setReviews] = useState<RentalReview[]>(() => loadReviews(rentalId));
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Inquiry form
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');

  // Booking estimator
  const [nights, setNights] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  const basePrice = Number(rental.price) || 0;
  const cleaningFee = rental.cleaningFee || 0;
  const serviceFee = rental.serviceFee || Math.round(basePrice * 0.1);
  const totalNights = isSport ? basePrice * nights : basePrice * nights + cleaningFee + serviceFee;

  const similarRentals = allRentals
    .filter(r => (r.id || (r as any)._id) !== rentalId && r.type === rental.type)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  const handleSubmitReview = () => {
    if (!reviewAuthor.trim()) { showToast('Please enter your name', 'error'); return; }
    if (!reviewText.trim()) { showToast('Please write a review', 'error'); return; }
    const review: RentalReview = {
      id: Date.now().toString(),
      rentalId,
      author: reviewAuthor.trim(),
      rating: reviewRating,
      text: reviewText.trim(),
      date: new Date().toISOString(),
    };
    saveReview(review);
    setReviews(prev => [...prev, review]);
    setReviewAuthor('');
    setReviewRating(5);
    setReviewText('');
    setShowReviewForm(false);
    showToast('Review submitted!', 'success');
  };

  const handleSubmitInquiry = () => {
    if (!inquiryName.trim()) { showToast('Please enter your name', 'error'); return; }
    if (!inquiryMsg.trim()) { showToast('Please enter a message', 'error'); return; }
    showToast('Inquiry sent! The host will contact you shortly.', 'success');
    setInquiryName('');
    setInquiryPhone('');
    setInquiryMsg('');
    setShowInquiry(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?rental=${rentalId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: rental.title, text: rental.description, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Link copied!', 'success');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <>
      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={images}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto flex flex-col">

        {/* ── Hero image ── */}
        <div className="relative w-full h-72 flex-shrink-0 bg-slate-200">
          {images.length > 0 ? (
            <img
              src={images[imgIdx]}
              alt={rental.title}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxIdx(imgIdx)}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <Tent className="w-16 h-16 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Back button */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-2 rounded-xl font-semibold text-sm shadow hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t.backBtn || 'Back'}
          </button>

          {/* Top-right actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="bg-white/90 backdrop-blur-sm text-slate-700 p-2 rounded-xl shadow hover:bg-white transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleFavorite(rentalId)}
              className={`p-2 rounded-xl shadow backdrop-blur-sm transition ${isFav ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm">
              {rental.type}
            </span>
          </div>

          {/* Title + location */}
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-1.5 mb-1">
              <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{rental.title}</h1>
              {rental.verified && (
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 drop-shadow" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
              <span className="text-sm text-white/90">{rental.locationName}</span>
            </div>
          </div>

          {/* Carousel controls */}
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-20 right-4 flex items-center gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className="transition-all duration-300 rounded-full"
                    style={{ width: i === imgIdx ? 16 : 5, height: 5, background: i === imgIdx ? '#10b981' : 'rgba(255,255,255,0.55)' }}
                  />
                ))}
              </div>
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full z-10" style={{ top: '3.5rem', right: '1rem' }}>
                {imgIdx + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* ── Thumbnail strip ── */}
        {images.length > 1 && (
          <div className="flex gap-2 px-5 py-3 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar flex-shrink-0">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => { setImgIdx(i); setLightboxIdx(i); }}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-emerald-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={src} className="w-full h-full object-cover" alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 px-5 pt-5 pb-36 max-w-2xl mx-auto w-full space-y-5">

          {/* Price + rating */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-extrabold text-emerald-700">{rental.price}</span>
              <span className="text-sm text-slate-500 ml-1.5">SAR / {isSport ? 'hr' : 'night'}</span>
            </div>
            {(avgRating || rental.rating) && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-amber-700">{avgRating ?? rental.rating}</span>
                <span className="text-xs text-amber-600">/ 5</span>
              </div>
            )}
          </div>

          {/* Quick-info badges */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <Home className="w-3.5 h-3.5" /> {rental.type}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> {rental.locationName}
            </span>
            {rental.capacity && (
              <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5" /> Up to {rental.capacity} guests
              </span>
            )}
            {rental.bedrooms != null && rental.bedrooms > 0 && (
              <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <BedDouble className="w-3.5 h-3.5" /> {rental.bedrooms} bedroom{rental.bedrooms > 1 ? 's' : ''}
              </span>
            )}
            {rental.verified && (
              <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Host
              </span>
            )}
          </div>

          {/* Availability */}
          {(rental.availableFrom || rental.availableTo) && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-700">Availability</p>
                <p className="text-sm text-blue-600">
                  {rental.availableFrom ? formatDate(rental.availableFrom) : '—'} → {rental.availableTo ? formatDate(rental.availableTo) : 'Open-ended'}
                </p>
              </div>
            </div>
          )}

          {/* Amenities */}
          {rental.amenities && rental.amenities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">Amenities</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rental.amenities.map(a => (
                  <span key={a} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    {AMENITY_ICONS[a] ?? null}
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {rental.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{t.aboutThisPlace || 'About this place'}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{rental.description}</p>
            </div>
          )}

          {/* ── Booking estimator / Time-slot picker ── */}
          {isSport ? (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-800">Book a Time Slot</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Hours</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100">−</button>
                    <span className="font-bold text-slate-900">{nights} hr</span>
                    <button onClick={() => setNights(n => Math.min(8, n + 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Start time</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {TIME_SLOTS.slice(0, -nights).map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{rental.price} SAR × {nights} hr</span>
                    <span className="font-semibold">{basePrice * nights} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-blue-800 border-t border-blue-200 pt-1">
                    <span>Total</span>
                    <span>{basePrice * nights} SAR</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Price Breakdown</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Nights</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm">−</button>
                    <span className="font-bold text-slate-800 w-6 text-center">{nights}</span>
                    <button onClick={() => setNights(n => Math.min(30, n + 1))} className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm">+</button>
                  </div>
                </div>
                <div className="border-t border-emerald-200 pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{rental.price} SAR × {nights} night{nights > 1 ? 's' : ''}</span>
                    <span>{basePrice * nights} SAR</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cleaning fee</span>
                      <span>{cleaningFee} SAR</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service fee</span>
                    <span>{serviceFee} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-800 border-t border-emerald-200 pt-1">
                    <span>Total</span>
                    <span>{totalNights} SAR</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map link */}
          {rental.mapQuery && (
            <a
              href={mapsUrl(rental.mapQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{t.viewOnMaps || 'View on Google Maps'}</p>
                <p className="text-xs text-slate-500 truncate">{rental.mapQuery}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </a>
          )}

          {/* ── Reviews section ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.reviewsHeader || 'Reviews'}</h2>
                {avgRating && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-amber-700">{avgRating}</span>
                    <span className="text-xs text-slate-400">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowReviewForm(v => !v)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition"
              >
                <Star className="w-3.5 h-3.5" />
                {showReviewForm ? (t.cancelBtn || 'Cancel') : (t.writeReview || 'Write a Review')}
              </button>
            </div>

            {showReviewForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">{t.rentalYourName || 'Your Name'}</label>
                  <input type="text" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder="Enter your name"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Rating</label>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Review</label>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none" />
                </div>
                <button onClick={handleSubmitReview} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition">
                  Submit Review
                </button>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Star className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">{t.noRentalReviews || 'No reviews yet'}</p>
                <p className="text-xs text-slate-400">{t.beFirstToReview || 'Be the first to review this place'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{r.author}</p>
                          <p className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Host info card */}
          {(rental.contactName || rental.contactPhone || rental.contactWhatsapp) && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.hostedBy || 'Hosted by'}</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-slate-900">{rental.contactName || 'Host'}</p>
                    {rental.verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500">{rental.verified ? 'Verified Host' : 'Private host'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                {rental.contactPhone && (
                  <a href={`tel:${rental.contactPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-sm">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
                {phoneNum && (
                  <a href={`https://wa.me/${phoneNum.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── In-app inquiry form ── */}
          <div>
            <button
              onClick={() => setShowInquiry(v => !v)}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 hover:border-emerald-400 transition"
            >
              <Send className="w-4 h-4" />
              {showInquiry ? 'Cancel Inquiry' : 'Send Host a Message'}
            </button>

            {showInquiry && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Your Name</label>
                  <input type="text" value={inquiryName} onChange={e => setInquiryName(e.target.value)} placeholder="Mohammed Al-Rashid"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Phone (optional)</label>
                  <input type="tel" value={inquiryPhone} onChange={e => setInquiryPhone(e.target.value)} placeholder="+966 5X XXX XXXX"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Message</label>
                  <textarea value={inquiryMsg} onChange={e => setInquiryMsg(e.target.value)} placeholder={`Hi, I'm interested in ${rental.title}. Is it available?`}
                    rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none" />
                </div>
                <button onClick={handleSubmitInquiry}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </div>
            )}
          </div>

          {/* Similar rentals */}
          {similarRentals.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3">Similar {rental.type}s</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
                {similarRentals.map(r => {
                  const img = r.images?.[0] || r.image;
                  const rid = r.id || (r as any)._id;
                  return (
                    <button key={rid} onClick={() => onSelectRental?.(r)}
                      className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-95 transition-transform">
                      <div className="relative h-24">
                        <img src={img} alt={r.title} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white">{r.type}</span>
                        {r.verified && <ShieldCheck className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug mb-1">{r.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 font-bold text-xs">{r.price} SAR</span>
                          {r.rating !== undefined && <span className="text-[10px] text-amber-500 font-bold">★ {r.rating.toFixed(1)}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky bottom CTA ── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3 shadow-lg z-10">
          <div>
            <p className="text-xl font-extrabold text-emerald-700">{rental.price} SAR</p>
            <p className="text-xs text-slate-400">{isSport ? 'per hour' : 'per night'}</p>
          </div>
          {phoneNum ? (
            <div className="flex gap-2 flex-1 max-w-xs ml-auto">
              {rental.contactPhone && (
                <a href={`tel:${rental.contactPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition">
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
              <a href={`https://wa.me/${phoneNum.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-600 transition">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
              <button onClick={() => { setShowInquiry(true); window.scrollTo({ top: 9999, behavior: 'smooth' }); }}
                className="flex-shrink-0 flex items-center justify-center bg-slate-100 text-slate-700 p-3 rounded-xl hover:bg-slate-200 transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={onBack}
              className="flex-1 max-w-xs ml-auto flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition">
              Contact Host
            </button>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export const RentalsScreen = ({ t, initialRentalId, onRentalOpened }: { t: any; initialRentalId?: string; onRentalOpened?: () => void }) => {
  const [showHostModal, setShowHostModal] = useState(false);
  const [rentals, setRentals] = useState<Rental[]>(() => {
    const local = loadLocalRentals();
    const mockIds = new Set(MOCK_RENTALS.map(r => r.id));
    const userCreated = local.filter(r => !mockIds.has(r.id));
    return [...userCreated, ...MOCK_RENTALS];
  });
  const [selectedItem, setSelectedItem] = useState<Rental | null>(() => {
    if (!initialRentalId) return null;
    const local = loadLocalRentals();
    const base = local.length > 0 ? local : MOCK_RENTALS;
    const all = [...base, ...MOCK_SPORT_VENUES];
    return all.find(r => (r.id || (r as any)._id) === initialRentalId) ?? null;
  });
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);
  const [sportTypeFilter, setSportTypeFilter] = useState<string>('All');
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  // form state
  const [form, setForm] = useState({
    title: '', price: '', locationName: '', mapQuery: '', type: 'Camp',
    description: '', contactName: '', contactPhone: '', contactWhatsapp: '',
    capacity: '', bedrooms: '', availableFrom: '', availableTo: '',
  });
  const [formAmenities, setFormAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    rentalAPI.getRentals()
      .then(data => {
        const apiList = Array.isArray(data) ? data : [];
        const local = loadLocalRentals();
        const mockIds = new Set(MOCK_RENTALS.map(r => r.id));
        const apiIds = new Set(apiList.map((r: Rental) => r.id));
        const userCreated = local.filter(r => !apiIds.has(r.id) && !mockIds.has(r.id));
        const base = apiList.length > 0 ? apiList : MOCK_RENTALS;
        setRentals([...userCreated, ...base]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { if (initialRentalId) onRentalOpened?.(); }, []);

  useEffect(() => {
    if (initialRentalId && rentals.length > 0 && !selectedItem) {
      const rental = [...rentals, ...MOCK_SPORT_VENUES].find(r => (r.id || (r as any)._id) === initialRentalId) ?? null;
      if (rental) { setSelectedItem(rental); onRentalOpened?.(); }
    }
  }, [initialRentalId, rentals]);

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set<string>(prev);
      if (next.has(id)) { next.delete(id); showToast('Removed from saved', 'success'); }
      else { next.add(id); showToast('Saved!', 'success'); }
      saveFavorites(next);
      return next;
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setPhotos(prev => [...prev, ...dataUrls].slice(0, 6));
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.price) return;
    setSubmitting(true);
    const rentalData: Rental = {
      id: Date.now().toString(),
      title: form.title.trim(),
      price: Number(form.price),
      locationName: form.locationName.trim() || 'Saudi Arabia',
      mapQuery: form.mapQuery.trim() || form.locationName.trim(),
      type: form.type,
      description: form.description.trim(),
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      contactWhatsapp: form.contactWhatsapp.trim(),
      image: photos[0] || 'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?w=400&q=80',
      images: photos.length ? photos : undefined,
      rating: 5.0,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      amenities: formAmenities.length ? formAmenities : undefined,
      availableFrom: form.availableFrom || undefined,
      availableTo: form.availableTo || undefined,
    };
    try {
      const saved = await rentalAPI.createRental(rentalData);
      rentalData.id = saved._id || saved.id || rentalData.id;
    } catch {}
    const updated = [rentalData, ...rentals];
    setRentals(updated);
    saveLocalRentals(updated.filter(r => r.images || r.contactPhone));
    showToast('Your listing is live!', 'success');
    setForm({ title: '', price: '', locationName: '', mapQuery: '', type: 'Camp', description: '', contactName: '', contactPhone: '', contactWhatsapp: '', capacity: '', bedrooms: '', availableFrom: '', availableTo: '' });
    setFormAmenities([]);
    setPhotos([]);
    setSubmitting(false);
    setShowHostModal(false);
  };

  const showSportsSection = typeFilter === 'All' || typeFilter === 'Sports';

  const trendingItems: TrendingItem[] = useMemo(() =>
    [...rentals, ...MOCK_SPORT_VENUES]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8)
      .filter(r => (r.images && r.images[0]) || r.image)
      .map(r => ({
        id: r.id || (r as any)._id || '',
        image: (r.images && r.images[0]) || r.image || '',
        name: r.title,
        subtitle: r.locationName || r.type || 'Saudi Arabia',
        badge: r.type || 'Rental',
        badgeColor: '#d97706',
        rating: r.rating ? Number(r.rating) : undefined,
      })),
  [rentals]);

  const slideshowItems: SlideItem[] = useMemo(() =>
    [...rentals, ...MOCK_SPORT_VENUES]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8)
      .filter(r => (r.images && r.images[0]) || r.image)
      .map(r => ({
        id: r.id || (r as any)._id || '',
        type: 'rental' as const,
        name: r.title,
        image: (r.images && r.images[0]) || r.image || '',
        subtitle: r.locationName || r.type || 'Saudi Arabia',
        rating: r.rating ? Number(r.rating) : undefined,
        badge: r.type || 'Rental',
        badgeColor: '#d97706',
      })),
  [rentals]);

  const handleQuickFilter = (f: QuickFilter) => {
    if (f === quickFilter) { setQuickFilter(null); return; }
    if (f === 'near_me') {
      if (!navigator.geolocation) { setQuickFilter('near_me'); return; }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        pos => { setUserCoords([pos.coords.latitude, pos.coords.longitude]); setQuickFilter('near_me'); setLocating(false); },
        () => { setLocating(false); setQuickFilter('near_me'); },
        { timeout: 8000 },
      );
      return;
    }
    setQuickFilter(f);
  };

  const activeFilterCount = [
    filters.priceMin > 0 || filters.priceMax < 5000,
    filters.minCapacity > 0,
    filters.city !== 'All',
    filters.amenities.length > 0,
  ].filter(Boolean).length;

  const applyFilters = (list: Rental[]) =>
    list.filter(r => {
      const price = Number(r.price) || 0;
      if (price < filters.priceMin || price > filters.priceMax) return false;
      if (filters.minCapacity > 0 && (r.capacity ?? 0) < filters.minCapacity) return false;
      if (filters.city !== 'All' && r.city !== filters.city) return false;
      if (filters.amenities.length > 0 && !filters.amenities.every(a => r.amenities?.includes(a))) return false;
      return true;
    });

  const visible = applyFilters(
    rentals
      .filter(r => {
        const matchType = typeFilter === 'All' || (typeFilter !== 'Sports' && r.type === typeFilter);
        const matchSearch = !search ||
          r.title?.toLowerCase().includes(search.toLowerCase()) ||
          r.locationName?.toLowerCase().includes(search.toLowerCase()) ||
          r.type?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      })
      .sort((a, b) => {
        if (quickFilter === 'top_rated') return (b.rating ?? 0) - (a.rating ?? 0);
        if (quickFilter === 'trending') return (b.rating ?? 0) - (a.rating ?? 0) || (Number(b.price) || 0) - (Number(a.price) || 0);
        if (quickFilter === 'budget') return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (quickFilter === 'near_me' && userCoords) {
          const distA = (a.lat && a.lng) ? haversine(userCoords[0], userCoords[1], a.lat, a.lng) : 9999;
          const distB = (b.lat && b.lng) ? haversine(userCoords[0], userCoords[1], b.lat, b.lng) : 9999;
          return distA - distB;
        }
        return 0;
      })
  );

  const visibleSports = applyFilters(
    MOCK_SPORT_VENUES.filter(r => {
      const matchSport = sportTypeFilter === 'All' || r.type === sportTypeFilter;
      const matchSearch = !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.locationName?.toLowerCase().includes(search.toLowerCase());
      return matchSport && matchSearch;
    })
  );

  const kashtas = visible.filter(r => r.type === 'Kashta');
  const otherRentals = visible.filter(r => r.type !== 'Kashta');
  const hasContent = visible.length > 0 || (showSportsSection && visibleSports.length > 0);

  return (
    <div className="min-h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t.exploreRentals || 'Rentals'}</h2>
            <p className="text-slate-500 text-sm">{t.rentalsDesc || 'Find camps, chalets, and local stays.'}</p>
          </div>
          <div className="flex items-center gap-2">
            {favorites.size > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg">
                <Heart className="w-3.5 h-3.5 fill-current" /> {favorites.size}
              </span>
            )}
            <button
              onClick={() => setShowHostModal(true)}
              className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition"
            >
              <Plus className="w-4 h-4" /> {t.hostPlace || 'Host'}
            </button>
          </div>
        </div>
      </div>

      {/* Featured slideshow */}
      {slideshowItems.length > 0 && (
        <FeaturedSlideshow
          items={slideshowItems}
          height="h-56"
          onPress={item => {
            const rental = [...rentals, ...MOCK_SPORT_VENUES].find(r => (r.id || (r as any)._id) === item.id) ?? null;
            if (rental) setSelectedItem(rental);
          }}
        />
      )}

      {/* Search bar */}
      <div className="bg-white px-4 pt-3 pb-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t.rentalsSearch || 'Search rentals by name, location, type…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilterPanel(true)}
            className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${activeFilterCount > 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Quick filter pills */}
      <div className="bg-white px-4 pt-2 pb-1">
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {([
              { id: 'budget' as QuickFilter, label: t.filterBudget || 'Budget Friendly', icon: <Wallet className="w-3.5 h-3.5" /> },
              { id: 'near_me' as QuickFilter, label: locating ? 'Locating…' : (t.filterNearMe || 'Near Me'), icon: <Navigation className="w-3.5 h-3.5" /> },
              { id: 'trending' as QuickFilter, label: t.filterTrending || 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { id: 'top_rated' as QuickFilter, label: t.filterTopRated || 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickFilter === f.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TYPE_FILTER_IDS.map(f => {
              const filterLabels: Record<string, string> = {
                All: t.filterTypeAll || 'All', Kashta: t.filterKashta || 'Kashta',
                Camp: t.filterCamp || 'Camp', Chalet: t.filterChalet || 'Chalet',
                Apartment: t.filterApartment || 'Apartment', Sports: t.filterSports || 'Sports',
              };
              return (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${typeFilter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                >
                  {filterLabels[f]}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>

      <div className="p-4">
        {!hasContent ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <Tent className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-slate-500 font-bold text-lg mb-1">
              {activeFilterCount > 0 ? 'No matches for these filters' : typeFilter !== 'All' ? `No ${typeFilter} listings yet` : 'No rentals available yet'}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {activeFilterCount > 0 ? 'Try adjusting your filters.' : typeFilter !== 'All' ? 'Try a different filter or be the first to list one!' : 'Be the first to host a place!'}
            </p>
            {activeFilterCount > 0 ? (
              <button onClick={() => setFilters(DEFAULT_FILTER)} className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
                Clear Filters
              </button>
            ) : typeFilter === 'All' && (
              <button onClick={() => setShowHostModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
                + List Your Place
              </button>
            )}
          </div>
        ) : (
          <>
            {typeFilter === 'All' && kashtas.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Flame className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-none">{t.kashtaSection || 'Top Kashtas'}</h3>
                    <p className="text-[10px] text-slate-500">{t.kashtaDesc || 'Best desert experiences'}</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                  {kashtas.map(item => {
                    const img = item.images?.[0] || item.image;
                    const isFav = favorites.has(item.id);
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)}
                        className="min-w-[240px] w-[240px] bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 snap-start cursor-pointer group active:scale-95 transition-transform">
                        <div className="h-32 w-full relative">
                          <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} alt={item.title} loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3 text-white">
                            <p className="font-bold text-sm">{item.title}</p>
                            <p className="text-[10px] opacity-90">{item.locationName}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{item.rating} ★</div>
                          {item.verified && <ShieldCheck className="absolute top-2 left-2 w-4 h-4 text-emerald-400" />}
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleFavorite(item.id); }}
                            className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : 'text-white'}`} />
                          </button>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{item.description || item.locationName}</p>
                            {item.capacity && <p className="text-[10px] text-slate-400 mt-0.5">Up to {item.capacity} guests</p>}
                          </div>
                          <p className="font-bold text-orange-600 whitespace-nowrap">{item.price} <span className="text-[10px]">SAR</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(typeFilter !== 'All' ? visible : otherRentals).length > 0 && (
              <>
                {typeFilter === 'All' && <h3 className="font-bold text-slate-900 mb-3">{t.otherStays || 'Other Stays'}</h3>}
                <div className="space-y-4">
                  {(typeFilter !== 'All' ? visible : otherRentals).map(item => {
                    const img = item.images?.[0] || item.image;
                    const isFav = favorites.has(item.id);
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-[0.99] transition-transform">
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <img src={img} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} alt={item.title} loading="lazy" />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {item.rating}
                          </div>
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className="bg-slate-900/70 text-white px-2 py-0.5 rounded text-[10px] font-bold">{item.type}</span>
                            {item.verified && <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow" />}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleFavorite(item.id); }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : 'text-white'}`} />
                          </button>
                          {item.images && item.images.length > 1 && (
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              +{item.images.length - 1} {t.photosCount || 'photos'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1"><MapPin className="w-3 h-3" /> {item.locationName}</div>
                          {/* Capacity + bedrooms row */}
                          <div className="flex items-center gap-3 mb-1">
                            {item.capacity && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Users className="w-3 h-3" /> {item.capacity} guests
                              </span>
                            )}
                            {item.bedrooms != null && item.bedrooms > 0 && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <BedDouble className="w-3 h-3" /> {item.bedrooms} bed
                              </span>
                            )}
                          </div>
                          {/* Amenity chips (first 4) */}
                          {item.amenities && item.amenities.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-2">
                              {item.amenities.slice(0, 4).map(a => (
                                <span key={a} className="flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  {AMENITY_ICONS[a] ?? null} {a}
                                </span>
                              ))}
                              {item.amenities.length > 4 && (
                                <span className="text-[10px] text-slate-400">+{item.amenities.length - 4}</span>
                              )}
                            </div>
                          )}
                          {item.contactName && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                              <User className="w-3 h-3" /> {item.contactName}
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <p className="font-bold text-lg text-emerald-700">{item.price} <span className="text-xs font-normal text-slate-500">SAR / night</span></p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.contactPhone) window.open(`tel:${item.contactPhone}`, '_self');
                                else setSelectedItem(item);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
                            >
                              <Phone className="w-3 h-3" /> {item.contactPhone ? 'Call Host' : 'View'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Sports Rentals Section ── */}
            {showSportsSection && visibleSports.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Trophy className="w-4 h-4" /></div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-none">Sports Venues</h3>
                      <p className="text-[10px] text-slate-500">Book a court or pitch near you</p>
                    </div>
                  </div>
                </div>

                {/* Sport type filter */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4 pb-1">
                  {SPORT_TYPE_LIST.map(s => (
                    <button
                      key={s}
                      onClick={() => setSportTypeFilter(s)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sportTypeFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {visibleSports.map(item => {
                    const img = item.images?.[0] || item.image;
                    const isFav = favorites.has(item.id);
                    const sportColor: Record<string, string> = {
                      Padel: 'bg-blue-500',
                      Football: 'bg-green-600',
                      Basketball: 'bg-orange-500',
                      Tennis: 'bg-yellow-500',
                    };
                    const badgeColor = sportColor[item.type] || 'bg-slate-600';
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-[0.99] transition-transform">
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <img src={img} className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} alt={item.title} loading="lazy" />
                          {item.rating && (
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {item.rating}
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span className={`${badgeColor} text-white px-2 py-0.5 rounded text-[10px] font-bold`}>{item.type}</span>
                            {item.verified && <ShieldCheck className="w-4 h-4 text-emerald-400 drop-shadow" />}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleToggleFavorite(item.id); }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400 text-rose-400' : 'text-white'}`} />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1"><MapPin className="w-3 h-3" /> {item.locationName}</div>
                          {item.capacity && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                              <Users className="w-3 h-3" /> Up to {item.capacity} players
                            </div>
                          )}
                          {item.amenities && item.amenities.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-2">
                              {item.amenities.slice(0, 3).map(a => (
                                <span key={a} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                  {AMENITY_ICONS[a] ?? null} {a}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <p className="font-bold text-lg text-blue-700">{item.price} <span className="text-xs font-normal text-slate-500">SAR / hr</span></p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.contactPhone) window.open(`tel:${item.contactPhone}`, '_self');
                                else setSelectedItem(item);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                            >
                              <Phone className="w-3 h-3" /> Book
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        {searchFocused && trendingItems.length > 0 && (
          <TrendingCards
            items={trendingItems}
            label="🔥 Trending Rentals"
            onSelect={item => {
              const rental = [...rentals, ...MOCK_SPORT_VENUES].find(r => (r.id || (r as any)._id) === item.id) ?? null;
              if (rental) setSelectedItem(rental);
            }}
          />
        )}
      </div>

      {/* ── Filter Panel ── */}
      <FilterPanel
        open={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onChange={setFilters}
      />

      {/* ── Host Modal ── */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-xl">List Your Place</h3>
              <button onClick={() => setShowHostModal(false)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {/* Photos */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Photos (up to 6)</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                <div className="flex gap-2 flex-wrap">
                  {photos.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                      <img src={src} className="w-full h-full object-cover" alt="" loading="lazy" />
                      <button
                        onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                    >
                      <Camera className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-semibold">Add</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Basic info */}
              <Input label="Title *" placeholder="e.g. Cozy Desert Tent" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} />
              <Input label="Description" placeholder="Describe your place..." value={form.description} onChange={(e: any) => setForm({ ...form, description: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Price / night (SAR) *" type="number" placeholder="400" value={form.price} onChange={(e: any) => setForm({ ...form, price: e.target.value })} />
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="Kashta">Kashta</option>
                    <option value="Camp">Camp</option>
                    <option value="Chalet">Chalet</option>
                    <option value="Apartment">Apartment</option>
                  </select>
                </div>
              </div>

              {/* Capacity + bedrooms */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Max Guests" type="number" placeholder="e.g. 8" value={form.capacity} onChange={(e: any) => setForm({ ...form, capacity: e.target.value })} />
                <Input label="Bedrooms" type="number" placeholder="e.g. 2" value={form.bedrooms} onChange={(e: any) => setForm({ ...form, bedrooms: e.target.value })} />
              </div>

              {/* Availability dates */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Availability</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">From</label>
                    <input type="date" value={form.availableFrom} onChange={e => setForm({ ...form, availableFrom: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">To</label>
                    <input type="date" value={form.availableTo} onChange={e => setForm({ ...form, availableTo: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amenities</label>
                <div className="flex gap-2 flex-wrap">
                  {AMENITY_LIST.map(a => {
                    const active = formAmenities.includes(a);
                    return (
                      <button
                        key={a} type="button"
                        onClick={() => setFormAmenities(prev => active ? prev.filter(x => x !== a) : [...prev, a])}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                      >
                        {AMENITY_ICONS[a] ?? null} {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location Name *</label>
                <Input placeholder="e.g. Al-Thumamah, Riyadh" value={form.locationName} onChange={(e: any) => setForm({ ...form, locationName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Google Maps Link or Address</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Paste a Google Maps link or address" value={form.mapQuery}
                    onChange={(e) => setForm({ ...form, mapQuery: e.target.value })}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  {form.mapQuery && (
                    <a href={mapsUrl(form.mapQuery)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition">
                      <ExternalLink className="w-3.5 h-3.5" /> Preview
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Guests will see a "View on Maps" button linking here.</p>
              </div>

              {/* Contact info */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Host Contact Info</p>
                <div className="space-y-3">
                  <Input label="Your Name" placeholder="e.g. Mohammed Al-Rashid" value={form.contactName} onChange={(e: any) => setForm({ ...form, contactName: e.target.value })} />
                  <Input label="Phone Number" type="tel" placeholder="+966 5X XXX XXXX" value={form.contactPhone} onChange={(e: any) => setForm({ ...form, contactPhone: e.target.value })} />
                  <Input label="WhatsApp Number (optional)" type="tel" placeholder="+966 5X XXX XXXX" value={form.contactWhatsapp} onChange={(e: any) => setForm({ ...form, contactWhatsapp: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 border-t border-slate-100 flex-shrink-0">
              <Button className="w-full" onClick={handleSubmit} disabled={!form.title.trim() || !form.price || submitting}>
                {submitting ? 'Publishing…' : 'Publish Listing'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <RentalDetailPage
          rental={selectedItem}
          onBack={() => setSelectedItem(null)}
          allRentals={[...rentals, ...MOCK_SPORT_VENUES]}
          onSelectRental={setSelectedItem}
          t={t}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
};
