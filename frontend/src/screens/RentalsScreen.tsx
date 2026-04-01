import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Tent, Plus, X, Star, MapPin, Flame, Phone, SlidersHorizontal,
  Camera, ExternalLink, MessageCircle, ChevronLeft, ChevronRight, User,
  ArrowLeft, Home, BedDouble, Users, Info, Trophy, Search,
  TrendingUp, Award, Navigation, Wallet,
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

interface RentalReview {
  id: string;
  rentalId: string;
  author: string;
  rating: number; // 1–5
  text: string;
  date: string; // ISO
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
const TYPE_FILTER_IDS = ['All', 'Kashta', 'Camp', 'Chalet', 'Apartment', 'Sports'] as const;
type SortOption = 'default' | 'price_asc' | 'price_desc' | 'rating_desc';
type QuickFilter = 'budget' | 'trending' | 'top_rated' | 'near_me' | null;

// ── helpers ──────────────────────────────────────────────────────────────────

function loadLocalRentals(): Rental[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveLocalRentals(list: Rental[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
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

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_RENTALS: Rental[] = [
  {
    id: 'mock-r1',
    title: 'Desert Kashta Camp — Al Thumamah',
    type: 'Kashta',
    price: 850,
    locationName: 'Al Thumamah, Riyadh',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1533745848184-3db07256e163?w=800&q=80',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
    ],
    rating: 4.8,
    description: 'A premium desert kashta camp set among rolling red dunes north of Riyadh. Includes a fully equipped outdoor kitchen, bonfire pit, and stargazing deck. Perfect for families and groups of up to 20 guests.',
    mapQuery: 'Al Thumamah National Park, Riyadh',
    contactName: 'Mohammed Al-Shehri',
    contactPhone: '+966501234567',
    contactWhatsapp: '+966501234567',
  },
  {
    id: 'mock-r2',
    title: 'Mountain Chalet — Abha Highlands',
    type: 'Chalet',
    price: 1200,
    locationName: 'Abha, Asir Region',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
      'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=800&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    ],
    rating: 4.9,
    description: 'Stunning mountain chalet with panoramic views over the Asir mountains. 3 bedrooms, a fully equipped kitchen, private terrace with BBQ, and a cozy fireplace for cool highland evenings. Sleeps up to 8.',
    mapQuery: 'Abha, Asir, Saudi Arabia',
    contactName: 'Fatima Al-Ghamdi',
    contactPhone: '+966509876543',
    contactWhatsapp: '+966509876543',
  },
  {
    id: 'mock-r3',
    title: 'Red Sea Beachfront Camp — Yanbu',
    type: 'Camp',
    price: 650,
    locationName: 'Yanbu Al-Bahr, Madinah',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
    ],
    rating: 4.7,
    description: 'Wake up steps from the crystal-clear Red Sea with direct access to world-class snorkelling reefs. The camp includes 4 glamping tents, beach chairs, a BBQ station, and kayak rentals.',
    mapQuery: 'Yanbu Al-Bahr Beach, Saudi Arabia',
    contactName: 'Khalid Al-Zahrani',
    contactPhone: '+966554321098',
    contactWhatsapp: '+966554321098',
  },
  {
    id: 'mock-r4',
    title: 'AlUla Desert Glamping',
    type: 'Camp',
    price: 1500,
    locationName: 'AlUla, Madinah Region',
    image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&q=80',
    ],
    rating: 5.0,
    description: 'Luxury glamping tents surrounded by the ancient sandstone formations of AlUla. Wake up to sunrise over Hegra, enjoy a private chef breakfast, and stargaze from a private hot tub. An unmissable Saudi experience.',
    mapQuery: 'AlUla Old Town, Saudi Arabia',
    contactName: 'Reem Al-Harbi',
    contactPhone: '+966561234567',
    contactWhatsapp: '+966561234567',
  },
  {
    id: 'mock-r5',
    title: 'Modern Apartment — Al Olaya, Riyadh',
    type: 'Apartment',
    price: 450,
    locationName: 'Al Olaya, Riyadh',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
    ],
    rating: 4.5,
    description: 'Sleek and fully furnished 2-bedroom apartment in the heart of Riyadh\'s business district. Walking distance to Kingdom Centre Tower, premier malls, and Riyadh\'s best restaurants. High-speed WiFi included.',
    mapQuery: 'Al Olaya District, Riyadh, Saudi Arabia',
    contactName: 'Abdullah Al-Mutairi',
    contactPhone: '+966572345678',
  },
];

// ── Mock sports venues ────────────────────────────────────────────────────────

export const MOCK_SPORT_VENUES: Rental[] = [
  {
    id: 'mock-sp1',
    title: 'Premium Padel Club — Al Malqa',
    type: 'Padel',
    price: 200,
    locationName: 'Al Malqa, Riyadh',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
      'https://images.unsplash.com/photo-1595435742729-0e6e2a46e620?w=800&q=80',
    ],
    rating: 4.8,
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
    image: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80',
    ],
    rating: 4.6,
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
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    ],
    rating: 4.5,
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
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    ],
    rating: 4.7,
    description: 'Compact 5-a-side turf pitch perfect for quick matches with friends. Night-lit, fully enclosed, and available in 1-hour or 2-hour slots.',
    mapQuery: 'Al Yasmin, Riyadh, Saudi Arabia',
    contactName: 'Omar Al-Shammari',
    contactPhone: '+966584567890',
    contactWhatsapp: '+966584567890',
  },
];

// ── Image carousel ───────────────────────────────────────────────────────────

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

// ── Rental detail page ────────────────────────────────────────────────────────

const RentalDetailPage = ({ rental, onBack, allRentals = [], onSelectRental, t }: { rental: Rental; onBack: () => void; allRentals?: Rental[]; onSelectRental?: (r: Rental) => void; t: any }) => {
  const images = rental.images?.length ? rental.images : rental.image ? [rental.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const phoneNum = rental.contactWhatsapp || rental.contactPhone;

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setImgIdx(i => (i + 1) % images.length), 3500);
    return () => clearInterval(id);
  }, [images.length]);

  // Reviews state
  const rentalId = rental.id || (rental as any)._id || '';

  const similarRentals = allRentals
    .filter(r => (r.id || (r as any)._id) !== rentalId && r.type === rental.type)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);
  const [reviews, setReviews] = useState<RentalReview[]>(() => loadReviews(rentalId));
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

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

      {/* ── Hero image with back button ── */}
      <div className="relative w-full h-72 flex-shrink-0 bg-slate-200">
        {images.length > 0 ? (
          <img
            src={images[imgIdx]}
            alt={rental.title}
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setLightboxIdx(imgIdx)}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
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

        {/* Type badge */}
        <span className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
          {rental.type}
        </span>

        {/* Title + location overlay */}
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{rental.title}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
            <span className="text-sm text-white/90">{rental.locationName}</span>
          </div>
        </div>

        {/* Carousel arrows + dots */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImgIdx(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dot indicators */}
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
            {/* Photo counter */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
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
              <img src={src} className="w-full h-full object-cover" alt="" />
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
            <span className="text-sm text-slate-500 ml-1.5">SAR / night</span>
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
        </div>

        {/* Description */}
        {rental.description ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">{t.aboutThisPlace || 'About this place'}</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{rental.description}</p>
          </div>
        ) : null}

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

          {/* Write review form */}
          {showReviewForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">{t.rentalYourName || 'Your Name'}</label>
                <input
                  type="text"
                  value={reviewAuthor}
                  onChange={e => setReviewAuthor(e.target.value)}
                  placeholder={t.enterYourName || 'Enter your name'}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">{t.rentalRatingLabel || 'Rating'}</label>
                <StarPicker value={reviewRating} onChange={setReviewRating} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">{t.rentalReviewLabel || 'Review'}</label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder={t.shareExperience || 'Share your experience...'}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
                />
              </div>
              <button
                onClick={handleSubmitReview}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
              >
                {t.submitReview || 'Submit Review'}
              </button>
            </div>
          )}

          {/* Review list */}
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
                        <User className="w-4.5 h-4.5 text-emerald-600" />
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
                <p className="font-bold text-slate-900">{rental.contactName || 'Host'}</p>
                <p className="text-xs text-slate-500">{t.privateHost || 'Private host'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {rental.contactPhone && (
                <a
                  href={`tel:${rental.contactPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-sm"
                >
                  <Phone className="w-4 h-4" /> {t.callBtn || 'Call'} Host
                </a>
              )}
              {phoneNum && (
                <a
                  href={`https://wa.me/${phoneNum.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* Similar rentals */}
        {similarRentals.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-900 mb-3">
              {t.similarRentalsLabel || 'Similar'} {rental.type}s
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
              {similarRentals.map(r => {
                const img = r.images?.[0] || r.image;
                const rid = r.id || (r as any)._id;
                return (
                  <button
                    key={rid}
                    onClick={() => onSelectRental?.(r)}
                    className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-95 transition-transform"
                  >
                    <div className="relative h-24">
                      <img
                        src={img}
                        alt={r.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white">{r.type}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug mb-1">{r.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-bold text-xs">{r.price} {t.sarLabel || 'SAR'}</span>
                        {r.rating !== undefined && (
                          <span className="text-[10px] text-amber-500 font-bold">★ {r.rating.toFixed(1)}</span>
                        )}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-4 shadow-lg z-10">
        <div>
          <p className="text-xl font-extrabold text-emerald-700">{rental.price} {t.sarLabel || 'SAR'}</p>
          <p className="text-xs text-slate-400">{t.perNight || 'per night'}</p>
        </div>
        {phoneNum ? (
          <div className="flex gap-2 flex-1 max-w-xs ml-auto">
            {rental.contactPhone && (
              <a
                href={`tel:${rental.contactPhone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
              >
                <Phone className="w-4 h-4" /> {t.callBtn || 'Call'}
              </a>
            )}
            <a
              href={`https://wa.me/${phoneNum.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-600 transition"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        ) : (
          <button
            onClick={onBack}
            className="flex-1 max-w-xs ml-auto flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
          >
            {t.contactHost || 'Contact Host'}
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
    // Always show mocks; prepend any user-created local rentals that aren't mocks
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

  // form state
  const [form, setForm] = useState({
    title: '', price: '', locationName: '', mapQuery: '', type: 'Camp',
    description: '', contactName: '', contactPhone: '', contactWhatsapp: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Background refresh — never hides existing data
    rentalAPI.getRentals()
      .then(data => {
        const apiList = Array.isArray(data) ? data : [];
        const local = loadLocalRentals();
        const mockIds = new Set(MOCK_RENTALS.map(r => r.id));
        const apiIds = new Set(apiList.map((r: Rental) => r.id));
        // user-created local rentals not in API and not mocks
        const userCreated = local.filter(r => !apiIds.has(r.id) && !mockIds.has(r.id));
        // real API data replaces mocks; if API empty, keep mocks
        const base = apiList.length > 0 ? apiList : MOCK_RENTALS;
        setRentals([...userCreated, ...base]);
      })
      .catch(() => { /* keep current state */ });
  }, []);

  // Clear pendingRentalId after mount if we already opened it via lazy init
  useEffect(() => {
    if (initialRentalId) onRentalOpened?.();
  }, []);

  useEffect(() => {
    if (initialRentalId && rentals.length > 0 && !selectedItem) {
      const rental = [...rentals, ...MOCK_SPORT_VENUES].find(r => (r.id || (r as any)._id) === initialRentalId) ?? null;
      if (rental) { setSelectedItem(rental); onRentalOpened?.(); }
    }
  }, [initialRentalId, rentals]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setPhotos(prev => [...prev, ...dataUrls].slice(0, 6)); // max 6 photos
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
    };

    try {
      const saved = await rentalAPI.createRental(rentalData);
      rentalData.id = saved._id || saved.id || rentalData.id;
    } catch {
      // save offline
    }

    const updated = [rentalData, ...rentals];
    setRentals(updated);
    saveLocalRentals(updated.filter(r => r.images || r.contactPhone)); // persist user-created ones

    showToast('Your listing is live!', 'success');
    setForm({ title: '', price: '', locationName: '', mapQuery: '', type: 'Camp', description: '', contactName: '', contactPhone: '', contactWhatsapp: '' });
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

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const visible = rentals
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
        const distA = haversine(userCoords[0], userCoords[1], 24.7136, 46.6753);
        const distB = haversine(userCoords[0], userCoords[1], 24.7136, 46.6753);
        return distA - distB;
      }
      return 0;
    });

  const kashtas = visible.filter(r => r.type === 'Kashta');
  const otherRentals = visible.filter(r => r.type !== 'Kashta');
  const hasContent = visible.length > 0 || (showSportsSection && MOCK_SPORT_VENUES.length > 0);

  return (
    <div className="min-h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t.exploreRentals || 'Rentals'}</h2>
            <p className="text-slate-500 text-sm">{t.rentalsDesc || 'Find camps, chalets, and local stays.'}</p>
          </div>
          <button
            onClick={() => setShowHostModal(true)}
            className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition"
          >
            <Plus className="w-4 h-4" /> {t.hostPlace || 'Host'}
          </button>
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
        <div className="relative">
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
      </div>

      {/* Quick filter pills */}
      <div className="bg-white px-4 pt-2 pb-1">
        <div className="relative">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {([
            { id: 'budget' as QuickFilter, label: t.filterBudget || 'Budget Friendly', icon: <Wallet className="w-3.5 h-3.5" /> },
            { id: 'near_me' as QuickFilter, label: locating ? (t.filterLocating || 'Locating…') : (t.filterNearMe || 'Near Me'), icon: <Navigation className="w-3.5 h-3.5" /> },
            { id: 'trending' as QuickFilter, label: t.filterTrending || 'Trending', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'top_rated' as QuickFilter, label: t.filterTopRated || 'Top Rated', icon: <Award className="w-3.5 h-3.5" /> },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => handleQuickFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                quickFilter === f.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {f.icon}
              {f.label}
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
              {typeFilter !== 'All' ? (t.rentalsNoListings || `No ${typeFilter} listings yet`) : (t.noRentals || 'No rentals available yet')}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {typeFilter !== 'All' ? (t.rentalsListFirst || 'Try a different filter or be the first to list one!') : (t.beFirstHost || 'Be the first to host a place!')}
            </p>
            {typeFilter === 'All' && (
              <button onClick={() => setShowHostModal(true)} className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
                {t.listYourPlace || '+ List Your Place'}
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
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)} className="min-w-[240px] w-[240px] bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 snap-start cursor-pointer group active:scale-95 transition-transform">
                        <div className="h-32 w-full relative">
                          <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} alt={item.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3 text-white">
                            <p className="font-bold text-sm">{item.title}</p>
                            <p className="text-[10px] opacity-90">{item.locationName}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{item.rating} ★</div>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <p className="text-[10px] text-slate-500 line-clamp-1 w-2/3">{item.description || item.locationName}</p>
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
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-[0.99] transition-transform">
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <img src={img} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }} alt={item.title} />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {item.rating}
                          </div>
                          <div className="absolute top-2 left-2 bg-slate-900/70 text-white px-2 py-0.5 rounded text-[10px] font-bold">{item.type}</div>
                          {item.images && item.images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              +{item.images.length - 1} {t.photosCount || 'photos'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1"><MapPin className="w-3 h-3" /> {item.locationName}</div>
                          {item.contactName && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                              <User className="w-3 h-3" /> {item.contactName}
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <p className="font-bold text-lg text-emerald-700">{item.price} <span className="text-xs font-normal text-slate-500">{t.sarNight || 'SAR / night'}</span></p>
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

            {/* ── Sports Rentals Section ──────────────────────────────────── */}
            {showSportsSection && MOCK_SPORT_VENUES.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Trophy className="w-4 h-4" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-none">Sports Venues</h3>
                    <p className="text-[10px] text-slate-500">Book a court or pitch near you</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {MOCK_SPORT_VENUES.map(item => {
                    const img = item.images?.[0] || item.image;
                    const sportColor: Record<string, string> = {
                      Padel: 'bg-blue-500',
                      Football: 'bg-green-600',
                      Basketball: 'bg-orange-500',
                      Tennis: 'bg-yellow-500',
                    };
                    const badgeColor = sportColor[item.type] || 'bg-slate-600';
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-[0.99] transition-transform"
                      >
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <img
                            src={img}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
                            alt={item.title}
                          />
                          {item.rating && (
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {item.rating}
                            </div>
                          )}
                          <div className={`absolute top-2 left-2 ${badgeColor} text-white px-2 py-0.5 rounded text-[10px] font-bold`}>{item.type}</div>
                          {item.images && item.images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              +{item.images.length - 1} {t.photosCount || 'photos'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <MapPin className="w-3 h-3" /> {item.locationName}
                          </div>
                          {item.contactName && (
                            <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                              <User className="w-3 h-3" /> {item.contactName}
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <p className="font-bold text-lg text-blue-700">
                              {item.price} <span className="text-xs font-normal text-slate-500">SAR / hr</span>
                            </p>
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

      {/* ── Host Modal ─────────────────────────────────────────────────────── */}
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
                      <img src={src} className="w-full h-full object-cover" alt="" />
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
                  <select
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="Kashta">Kashta</option>
                    <option value="Camp">Camp</option>
                    <option value="Chalet">Chalet</option>
                    <option value="Apartment">Apartment</option>
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location Name *</label>
                <Input placeholder="e.g. Al-Thumamah, Riyadh" value={form.locationName} onChange={(e: any) => setForm({ ...form, locationName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Google Maps Link or Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste a Google Maps link or address"
                    value={form.mapQuery}
                    onChange={(e) => setForm({ ...form, mapQuery: e.target.value })}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {form.mapQuery && (
                    <a
                      href={mapsUrl(form.mapQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
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
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.price || submitting}
              >
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
        />
      )}
    </div>
  );
};
