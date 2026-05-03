// frontend/src/screens/RentalsScreen.tsx

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
import { rentalAPI, paymentAPI } from '../services/api';
import { showToast } from '../components/Toast';
import type { RentalFormValue } from '../components/RentalFormFields';
import { compressImage } from '../utils/compressImage';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';
import { PhotoLightbox } from '../components/PhotoLightbox';

interface RentalReview {
  id: string;
  rentalId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

type QuickFilter = 'budget' | 'trending' | 'top_rated' | 'near_me' | 'new' | null;

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Components ───────────────────────────────────────────────────────────────

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)} className="focus:outline-none transition-transform hover:scale-110">
        <Star className={`w-7 h-7 transition-colors ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'}`} />
      </button>
    ))}
  </div>
);

// ── Rental detail page ────────────────────────────────────────────────────────

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const RentalDetailPage = ({
  rental, onBack, allRentals = [], onSelectRental, t, lang, favorites, onToggleFavorite,
}: {
  rental: Rental;
  onBack: () => void;
  allRentals?: Rental[];
  onSelectRental?: (r: Rental) => void;
  t: any;
  lang?: 'en' | 'ar';
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
}) => {
  const ar = lang === 'ar';
  const isSport = SPORT_TYPES.has(rental.type);
  const images = rental.images?.length ? rental.images : rental.image ? [rental.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const phoneNum = rental.contactWhatsapp || rental.contactPhone;
  const rentalId = rental.id || (rental as any)._id || '';
  const isFav = favorites.has(rentalId);

  // Reviews Sync
  const [reviews, setReviews] = useState<RentalReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoadingReviews(true);
    rentalAPI.getReviews(rentalId)
      .then(data => setReviews(data || []))
      .catch(() => console.error("Failed to load reviews"))
      .finally(() => setLoadingReviews(false));
  }, [rentalId]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Inquiry & Booking
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');

  const [nights, setNights] = useState(1);
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const basePrice = Number(rental.price) || 0;
  const cleaningFee = rental.cleaningFee || 0;
  const serviceFee = rental.serviceFee || Math.round(basePrice * 0.1);
  const totalNights = isSport ? basePrice * nights : basePrice * nights + cleaningFee + serviceFee;

  const similarRentals = allRentals
    .filter(r => (r.id || (r as any)._id) !== rentalId && r.type === rental.type)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  const handleSubmitReview = async () => {
    if (!reviewAuthor.trim()) { showToast('Please enter your name', 'error'); return; }
    if (!reviewText.trim()) { showToast('Please write a review', 'error'); return; }

    setSubmittingReview(true);
    try {
      const reviewPayload = {
        author: reviewAuthor.trim(),
        rating: reviewRating,
        text: reviewText.trim()
      };

      const newReview = await rentalAPI.createReview(rentalId, reviewPayload);
      setReviews(prev => [...prev, newReview]);

      setReviewAuthor('');
      setReviewRating(5);
      setReviewText('');
      setShowReviewForm(false);
      showToast('Review submitted!', 'success');
    } catch (err) {
      showToast('Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBooking = async () => {
    if (isSport && !selectedSlot) { showToast('Please select a time slot', 'error'); return; }
    if (!bookingDate) { showToast('Please select a date', 'error'); return; }

    setBookingLoading(true);
    try {
      // Step 1: create a pending booking record
      const { data: booking } = await rentalAPI.bookTimeSlot(rentalId, {
        date: bookingDate,
        nightsOrHours: nights,
        slot: isSport ? selectedSlot : undefined,
        totalPrice: totalNights
      });
      // Step 2: redirect to secure checkout linked to this booking
      const { url } = await paymentAPI.createCheckoutSession('rental', rentalId, 1, booking?._id);
      window.location.href = url;
    } catch (e) {
      showToast('Failed to submit booking', 'error');
      setBookingLoading(false);
    }
  };

  const handleSubmitInquiry = () => {
    if (!inquiryName.trim()) { showToast('Please enter your name', 'error'); return; }
    if (!inquiryMsg.trim()) { showToast('Please enter a message', 'error'); return; }
    showToast('Inquiry sent! The host will contact you shortly.', 'success');
    setShowInquiry(false);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?rental=${rentalId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: rental.title, text: rental.description || 'Check out this rental!', url });
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
              className={`p-2 rounded-xl shadow backdrop-blur-sm transition-all duration-200 ${isFav ? 'bg-rose-500 text-white scale-105' : 'bg-white/90 text-slate-700 hover:bg-white'}`}
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
              <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 z-10 transition">
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
            </>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-5 pt-5 pb-36 max-w-2xl mx-auto w-full space-y-6">

          {/* Price + rating */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-extrabold text-emerald-700">{rental.price}</span>
              <span className="text-sm text-slate-500 ml-1.5">{ar ? (isSport ? 'ريال / ساعة' : 'ريال / ليلة') : (isSport ? 'SAR / hr' : 'SAR / night')}</span>
            </div>
            {(avgRating || rental.ratingSummary?.avgRating || rental.rating) && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-amber-700">
                  {avgRating ?? rental.ratingSummary?.avgRating?.toFixed(1) ?? rental.rating}
                </span>
                {(reviews.length || rental.ratingSummary?.reviewCount) ? (
                  <span className="text-xs text-amber-600">
                    ({reviews.length || rental.ratingSummary?.reviewCount} {ar ? 'مراجعة' : 'reviews'})
                  </span>
                ) : (
                  <span className="text-xs text-amber-600">/ 5</span>
                )}
              </div>
            )}
          </div>

          {/* Quick-info badges */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> {rental.locationName}
            </span>
            {rental.capacity && (
              <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5" /> {ar ? `حتى ${rental.capacity} ضيف` : `Up to ${rental.capacity} guests`}
              </span>
            )}
            {rental.bedrooms != null && rental.bedrooms > 0 && (
              <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <BedDouble className="w-3.5 h-3.5" /> {ar ? `${rental.bedrooms} غرفة` : `${rental.bedrooms} bed${rental.bedrooms > 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          {/* ── Description ── */}
          {rental.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">{t.aboutThisPlace || 'About this place'}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{rental.description}</p>
            </div>
          )}

          {/* ── Booking / Time-slot picker ── */}
          <div className={`border rounded-2xl p-4 ${isSport ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              {isSport ? <Clock className="w-4 h-4 text-blue-600" /> : <Calendar className="w-4 h-4 text-emerald-600" />}
              <span className={`text-sm font-bold ${isSport ? 'text-blue-800' : 'text-emerald-800'}`}>
                {isSport ? (ar ? 'احجز وقتاً' : 'Book a Time Slot') : (ar ? 'تفاصيل السعر' : 'Price Breakdown')}
              </span>
            </div>
            <div className="space-y-3">
              {/* Date Selection */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{ar ? 'التاريخ' : 'Date'}</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${isSport ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'}`}
                />
              </div>

              {/* Hours / Nights Adjuster */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{isSport ? (ar ? 'ساعات' : 'Hours') : (ar ? 'ليالٍ' : 'Nights')}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm transition">−</button>
                  <span className="font-bold text-slate-900 w-6 text-center">{nights}</span>
                  <button onClick={() => setNights(n => Math.min(30, n + 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm transition">+</button>
                </div>
              </div>

              {/* Time Slot Picker (Sports Only) */}
              {isSport && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">{ar ? 'وقت البداية' : 'Start time'}</label>
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
              )}

              {/* Totals */}
              <div className={`border-t pt-3 space-y-1 ${isSport ? 'border-blue-200' : 'border-emerald-200'}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{ar ? `${rental.price} ريال × ${nights} ${isSport ? 'ساعة' : 'ليلة'}` : `${rental.price} SAR × ${nights} ${isSport ? 'hr' : 'night'}`}</span>
                  <span className="font-semibold">{basePrice * nights} SAR</span>
                </div>
                {!isSport && cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{ar ? 'رسوم التنظيف' : 'Cleaning fee'}</span>
                    <span>{cleaningFee} SAR</span>
                  </div>
                )}
                {!isSport && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{ar ? 'رسوم الخدمة' : 'Service fee'}</span>
                    <span>{serviceFee} SAR</span>
                  </div>
                )}
                <div className={`flex justify-between text-sm font-bold border-t pt-1 mt-1 ${isSport ? 'text-blue-800 border-blue-200' : 'text-emerald-800 border-emerald-200'}`}>
                  <span>{ar ? 'الإجمالي' : 'Total'}</span>
                  <span>{totalNights} SAR</span>
                </div>
              </div>

              <Button
                className={`w-full ${isSport ? '!bg-blue-600 hover:!bg-blue-700' : '!bg-emerald-600 hover:!bg-emerald-700'}`}
                onClick={handleBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (ar ? 'جاري المعالجة...' : 'Processing...') : (ar ? 'طلب حجز' : 'Request to Book')}
              </Button>
            </div>
          </div>

          {/* ── Reviews ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">{t.reviewsHeader || 'Reviews'}</h2>
              <button
                onClick={() => setShowReviewForm(v => !v)}
                className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-700 transition"
              >
                <Star className="w-3.5 h-3.5" />
                {showReviewForm ? (t.cancelBtn || 'Cancel') : (t.writeReview || 'Write a Review')}
              </button>
            </div>

            {showReviewForm && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">{ar ? 'اسمك' : 'Your Name'}</label>
                  <input type="text" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder={ar ? 'أدخل اسمك' : 'Enter your name'}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">{ar ? 'التقييم' : 'Rating'}</label>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">{ar ? 'مراجعتك' : 'Review'}</label>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={ar ? 'شارك تجربتك...' : 'Share your experience...'} rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none" />
                </div>
                <button onClick={handleSubmitReview} disabled={submittingReview} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                  {submittingReview ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'إرسال المراجعة' : 'Submit Review')}
                </button>
              </div>
            )}

            {loadingReviews ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Star className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">{ar ? 'لا توجد مراجعات بعد' : 'No reviews yet'}</p>
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
                        {[1, 2, 3, 4, 5].map(n => (
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
        </div>
      </div>
    </>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export const RentalsScreen = ({ t, lang, initialRentalId, onRentalOpened, initialQuickFilter }: { t: any; lang?: 'en' | 'ar'; initialRentalId?: string; onRentalOpened?: () => void; initialQuickFilter?: QuickFilter }) => {
  const ar = lang === 'ar';
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // UI State
  const [selectedItem, setSelectedItem] = useState<Rental | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [search, setSearch] = useState('');

  const [hostBannerDismissed, setHostBannerDismissed] = useState(
    () => localStorage.getItem('tripo:hostBannerDismissed') === '1'
  );
  const [sportTypeFilter, setSportTypeFilter] = useState('All');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [showSaved, setShowSaved] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<FilterState>(DEFAULT_FILTER);

  // Host a Place — 3-step flow
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostStep, setHostStep] = useState(1);
  const [hostForm, setHostForm] = useState<RentalFormValue>({
    title: '', locationName: '', type: 'Chalet', price: '', description: '', phone: '', amenities: [],
  });
  const [hostImage, setHostImage] = useState<string | null>(null);
  const [hostMapsUrl, setHostMapsUrl] = useState('');
  const hostImageInputRef = useRef<HTMLInputElement>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);

  const resetHostModal = () => {
    setShowHostModal(false);
    setHostStep(1);
    setHostForm({ title: '', locationName: '', type: 'Chalet', price: '', description: '', phone: '', amenities: [] });
    setHostImage(null);
    setHostMapsUrl('');
  };

  // 1. Unified Async Fetch (No localStorage fallbacks)
  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const [apiRentalsRes, favsRes] = await Promise.allSettled([
          rentalAPI.getRentals(),
          rentalAPI.getFavorites()
        ]);

        if (apiRentalsRes.status === 'fulfilled') {
          setRentals(apiRentalsRes.value || []);
        }

        if (favsRes.status === 'fulfilled') {
          // Assuming backend returns an array of favorite rental IDs
          setFavorites(new Set(favsRes.value || []));
        }
      } catch (err) {
        showToast('Failed to load rentals data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchRealData();
  }, []);

  // 2. Open initial rental if provided via deeplink
  useEffect(() => {
    if (initialRentalId && rentals.length > 0 && !selectedItem) {
      const target = rentals.find(r => (r.id || (r as any)._id) === initialRentalId) ?? null;
      if (target) {
        setSelectedItem(target);
        onRentalOpened?.();
      }
    }
  }, [initialRentalId, rentals]);

  useEffect(() => {
    if (initialQuickFilter) setQuickFilter(initialQuickFilter);
  }, [initialQuickFilter]);

  // 3. Optimistic Background Sync Toggle
  const handleToggleFavorite = async (id: string) => {
    // Optimistic Update
    setFavorites(prev => {
      const next = new Set<string>(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removed from saved', 'success');
      } else {
        next.add(id);
        showToast('Saved!', 'success');
      }
      return next;
    });

    // Background DB Sync
    try {
      await rentalAPI.toggleFavorite(id);
    } catch (err) {
      showToast('Failed to sync favorite status', 'error');
      // Revert if failed
      setFavorites(prev => {
        const next = new Set<string>(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  };

  const visibleRentals = useMemo(() => {
    let result = rentals.filter(r => {
      const id = r.id || (r as any)._id || '';
      if (showSaved && !favorites.has(id)) return false;

      const matchType = typeFilter === 'All'
        ? true
        : typeFilter === 'Sports'
          ? SPORT_TYPES.has(r.type)
          : r.type === typeFilter;

      const matchSportType =
        typeFilter !== 'Sports' || sportTypeFilter === 'All' || r.type === sportTypeFilter;

      const matchSearch = !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.locationName?.toLowerCase().includes(search.toLowerCase());

      const matchCity =
        filter.city === 'All' ||
        r.city === filter.city ||
        r.locationName?.toLowerCase().includes(filter.city.toLowerCase());

      const price = Number(r.price) || 0;
      const matchPrice = price >= filter.priceMin && price <= filter.priceMax;
      const matchCapacity = !filter.minCapacity || (r.capacity ?? 0) >= filter.minCapacity;
      const matchAmenities =
        filter.amenities.length === 0 ||
        filter.amenities.every(a => r.amenities?.includes(a));

      return matchType && matchSportType && matchSearch && matchCity && matchPrice && matchCapacity && matchAmenities;
    });

    if (quickFilter === 'budget') {
      result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    } else if (quickFilter === 'top_rated' || quickFilter === 'trending') {
      result = [...result].sort((a, b) =>
        (b.ratingSummary?.avgRating ?? b.rating ?? 0) - (a.ratingSummary?.avgRating ?? a.rating ?? 0)
      );
    } else if (quickFilter === 'new') {
      result = [...result].sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    } else if (quickFilter === 'near_me' && userLocation) {
      result = [...result].sort((a, b) => {
        const dA = a.lat && a.lng ? haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) : Infinity;
        const dB = b.lat && b.lng ? haversine(userLocation.lat, userLocation.lng, b.lat, b.lng) : Infinity;
        return dA - dB;
      });
    }

    return result;
  }, [rentals, typeFilter, sportTypeFilter, search, quickFilter, userLocation, favorites, showSaved, filter]);

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
            title={t.hostPlace || 'Host a Place'}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Search + Filter toggles ── */}
      <div className="bg-white border-b border-slate-100 px-4 pt-3 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? 'ابحث عن إيجارات، مدن...' : 'Search rentals, cities...'}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setPendingFilter(filter); setFilterOpen(true); }}
            className={`p-2.5 rounded-xl transition-colors ${
              filter.city !== 'All' || filter.amenities.length > 0 || filter.priceMax < DEFAULT_FILTER.priceMax || filter.minCapacity > 0
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSaved(v => !v)}
            className={`p-2.5 rounded-xl transition-colors ${showSaved ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Heart className={`w-4 h-4 ${showSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Type chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
          {TYPE_FILTER_IDS.map(type => (
            <button
              key={type}
              onClick={() => { setTypeFilter(type); setSportTypeFilter('All'); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                typeFilter === type ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {(() => {
                if (type === 'All') return ar ? 'الكل' : 'All Types';
                if (type === 'Sports') return ar ? 'رياضة' : 'Sports';
                const typeAr: Record<string, string> = { Kashta: 'كشتة', Camp: 'مخيم', Chalet: 'شاليه', Apartment: 'شقة' };
                return ar ? (typeAr[type] ?? type) : type;
              })()}
            </button>
          ))}
        </div>

        {/* Sport sub-chips */}
        {typeFilter === 'Sports' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            {SPORT_TYPE_LIST.map(sport => (
              <button
                key={sport}
                onClick={() => setSportTypeFilter(sport)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  sportTypeFilter === sport ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {sport === 'All' ? (ar ? 'كل الرياضات' : 'All Sports') : sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick filters ── */}
      <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar">
        {(ar
          ? [
              { id: 'new' as Exclude<QuickFilter, null>, label: '🆕 جديد' },
              { id: 'budget' as Exclude<QuickFilter, null>, label: '💰 اقتصادي' },
              { id: 'top_rated' as Exclude<QuickFilter, null>, label: '⭐ الأعلى تقييماً' },
              { id: 'trending' as Exclude<QuickFilter, null>, label: '🔥 رائج' },
              { id: 'near_me' as Exclude<QuickFilter, null>, label: '📍 قريب مني' },
            ]
          : [
              { id: 'new' as Exclude<QuickFilter, null>, label: '🆕 New Listings' },
              { id: 'budget' as Exclude<QuickFilter, null>, label: '💰 Budget' },
              { id: 'top_rated' as Exclude<QuickFilter, null>, label: '⭐ Top Rated' },
              { id: 'trending' as Exclude<QuickFilter, null>, label: '🔥 Trending' },
              { id: 'near_me' as Exclude<QuickFilter, null>, label: '📍 Near Me' },
            ]
        ).map(qf => (
          <button
            key={qf.id}
            onClick={() => {
              if (qf.id === 'near_me') {
                if (quickFilter === 'near_me') { setQuickFilter(null); return; }
                navigator.geolocation?.getCurrentPosition(
                  pos => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setQuickFilter('near_me');
                  },
                  () => showToast('Location access denied', 'error')
                );
              } else {
                setQuickFilter(quickFilter === qf.id ? null : qf.id);
              }
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              quickFilter === qf.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4">
          {/* ── Host Banner ── */}
          {!hostBannerDismissed && !search && typeFilter === 'All' && !quickFilter && !showSaved && filter.city === 'All' && filter.amenities.length === 0 && filter.priceMax === DEFAULT_FILTER.priceMax && filter.minCapacity === 0 && (
            <div className="relative overflow-hidden rounded-2xl mb-4 bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500 shadow-lg">
              {/* Decorative blobs */}
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-amber-300/20 blur-xl pointer-events-none" />
              {/* Large bg icon */}
              <Tent className="absolute right-4 bottom-2 w-24 h-24 text-white/10 pointer-events-none" />

              {/* Dismiss */}
              <button
                onClick={() => {
                  setHostBannerDismissed(true);
                  localStorage.setItem('tripo:hostBannerDismissed', '1');
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Content */}
              <div className="relative px-5 py-5 pr-12">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-4 h-4 text-amber-200" />
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">{ar ? 'للمضيفين' : 'For Hosts'}</span>
                </div>
                <h3 className="text-white font-extrabold text-lg leading-snug mb-1">
                  {t.hostBannerTitle || 'List your place, earn with Tripo'}
                </h3>
                <p className="text-white/80 text-xs leading-relaxed mb-4">
                  {t.hostBannerSubtitle || 'Hosts in AlUla, Abha & Riyadh get bookings within 48h.'}
                </p>
                <button
                  onClick={() => setShowHostModal(true)}
                  className="inline-flex items-center gap-2 bg-white text-emerald-700 font-extrabold text-sm px-4 py-2.5 rounded-xl shadow hover:shadow-md active:scale-95 transition-all"
                >
                  {t.hostBannerCta || '🏕️ Become a Host'}
                </button>
              </div>
            </div>
          )}

          {visibleRentals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <Tent className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-slate-500 font-bold text-lg mb-1">{ar ? 'لا توجد إيجارات' : 'No rentals found'}</h3>
              <p className="text-slate-400 text-sm mb-4">{ar ? 'جرّب تعديل الفلاتر أو البحث' : 'Try adjusting your filters or search'}</p>
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('All');
                  setSportTypeFilter('All');
                  setQuickFilter(null);
                  setFilter(DEFAULT_FILTER);
                  setShowSaved(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition"
              >
                <X className="w-3.5 h-3.5" /> {ar ? 'مسح الفلاتر' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRentals.map(item => (
                <div key={item.id} onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-[0.99] transition-transform hover:shadow-md">
                  <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                    <img src={item.image || item.images?.[0]} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-slate-900/70 text-white px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">{item.type}</span>
                      {item.createdAt && (Date.now() - new Date(item.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && (
                        <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">NEW</span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleFavorite(item.id); }}
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-black/40 hover:bg-black/60 transition backdrop-blur-sm"
                    >
                      <Heart className={`w-4 h-4 ${favorites.has(item.id) ? 'fill-rose-400 text-rose-400' : 'text-white'}`} />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-2"><MapPin className="w-3 h-3" /> {item.locationName}</div>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                      <p className="font-bold text-lg text-emerald-700">{item.price} <span className="text-xs font-normal text-slate-500">{ar ? (SPORT_TYPES.has(item.type) ? 'ريال/ساعة' : 'ريال/ليلة') : (SPORT_TYPES.has(item.type) ? 'SAR / hr' : 'SAR / night')}</span></p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const avg = item.ratingSummary?.avgRating ?? item.rating;
                          const count = item.ratingSummary?.reviewCount;
                          if (!avg) return null;
                          return (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {avg.toFixed(1)}
                              {count ? <span className="font-normal text-slate-400">({count})</span> : null}
                            </span>
                          );
                        })()}
                        {quickFilter === 'near_me' && userLocation && item.lat && item.lng && (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                            <Navigation className="w-3 h-3" />
                            {haversine(userLocation.lat, userLocation.lng, item.lat, item.lng).toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <RentalDetailPage
          rental={selectedItem}
          onBack={() => setSelectedItem(null)}
          allRentals={rentals}
          onSelectRental={setSelectedItem}
          t={t}
          lang={lang}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* ── Filter Sheet ─────────────────────────────────────────────── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-slate-900">{ar ? 'الفلاتر' : 'Filters'}</h2>
              <button onClick={() => setFilterOpen(false)} className="p-2 rounded-full hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-5">
              {/* City */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">{ar ? 'المدينة' : 'City'}</label>
                <div className="flex flex-wrap gap-2">
                  {CITY_LIST.map(city => (
                    <button
                      key={city}
                      onClick={() => setPendingFilter(f => ({ ...f, city }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        pendingFilter.city === city ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price range */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                  {ar ? `السعر: ${pendingFilter.priceMin} – ${pendingFilter.priceMax} ريال` : `Price: ${pendingFilter.priceMin} – ${pendingFilter.priceMax} SAR`}
                </label>
                <input
                  type="range" min={0} max={5000} step={50}
                  value={pendingFilter.priceMax}
                  onChange={e => setPendingFilter(f => ({ ...f, priceMax: Number(e.target.value) }))}
                  className="w-full accent-emerald-600"
                />
              </div>
              {/* Min capacity */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">{ar ? 'الحد الأدنى للضيوف' : 'Min. Guests'}</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPendingFilter(f => ({ ...f, minCapacity: Math.max(0, f.minCapacity - 1) }))}
                    className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm transition">−</button>
                  <span className="font-bold text-slate-900 w-8 text-center">{pendingFilter.minCapacity || (ar ? 'أي' : 'Any')}</span>
                  <button onClick={() => setPendingFilter(f => ({ ...f, minCapacity: f.minCapacity + 1 }))}
                    className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-sm transition">+</button>
                </div>
              </div>
              {/* Amenities */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">{ar ? 'المرافق' : 'Amenities'}</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_LIST.map(amenity => {
                    const active = pendingFilter.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        onClick={() => setPendingFilter(f => ({
                          ...f,
                          amenities: active ? f.amenities.filter(a => a !== amenity) : [...f.amenities, amenity],
                        }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {AMENITY_ICONS[amenity]} {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 pb-6 flex gap-3">
              <button
                onClick={() => { setPendingFilter(DEFAULT_FILTER); setFilter(DEFAULT_FILTER); setFilterOpen(false); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition"
              >
                {ar ? 'إعادة تعيين' : 'Reset'}
              </button>
              <button
                onClick={() => { setFilter(pendingFilter); setFilterOpen(false); }}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition"
              >
                {ar ? 'تطبيق' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Host a Place — 3-step modal ─────────────────────────────────── */}
      {showHostModal && (() => {
        const PLACE_TYPES: { id: string; icon: React.ReactNode; label: string; labelAr: string }[] = [
          { id: 'Chalet',    icon: <Home className="w-5 h-5" />,      label: 'Chalet',    labelAr: 'شاليه' },
          { id: 'Villa',     icon: <Star className="w-5 h-5" />,      label: 'Villa',     labelAr: 'فيلا' },
          { id: 'Camp',      icon: <Tent className="w-5 h-5" />,      label: 'Camp',      labelAr: 'مخيم' },
          { id: 'Apartment', icon: <BedDouble className="w-5 h-5" />, label: 'Apartment', labelAr: 'شقة' },
          { id: 'Farm',      icon: <Navigation className="w-5 h-5" />,label: 'Farm',      labelAr: 'مزرعة' },
          { id: 'Other',     icon: <MapPin className="w-5 h-5" />,    label: 'Other',     labelAr: 'أخرى' },
        ];

        const HOST_AMENITIES = ['WiFi', 'BBQ', 'Pool', 'Kitchen', 'AC', 'Parking', 'Fireplace', 'Pet Friendly'];

        const step1Valid = hostForm.type && hostForm.title.trim() && hostForm.locationName.trim();
        const step2Valid = !!hostForm.price;

        const toggleAmenity = (a: string) =>
          setHostForm(f => ({
            ...f,
            amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
          }));

        const handleSubmit = async () => {
          setHostSubmitting(true);
          try {
            await rentalAPI.createRental({
              title: hostForm.title.trim(),
              locationName: hostForm.locationName.trim(),
              type: hostForm.type,
              price: Number(hostForm.price),
              description: hostForm.description.trim(),
              phone: hostForm.phone.trim(),
              amenities: hostForm.amenities,
              ...(hostImage ? { image: hostImage } : {}),
              ...(hostMapsUrl.trim() ? { mapsUrl: hostMapsUrl.trim() } : {}),
            });
            showToast('Your place has been listed!', 'success');
            localStorage.setItem('tripo_has_listed_rental', '1');
            resetHostModal();
          } catch {
            showToast('Failed to list your place. Please try again.', 'error');
          } finally {
            setHostSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
            <div
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
              style={{ background: '#081229', maxHeight: '92dvh' }}
            >
              {/* Progress bar */}
              <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${(hostStep / 3) * 100}%`, background: '#7CF7C8' }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  {hostStep > 1 && (
                    <button
                      onClick={() => setHostStep(s => s - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      <ChevronLeft className="w-4 h-4" style={{ color: '#B8C2D6' }} />
                    </button>
                  )}
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#7CF7C8' }}>
                      {ar ? `خطوة ${hostStep} من 3` : `Step ${hostStep} of 3`}
                    </p>
                    <h2 className="font-black text-white leading-tight" style={{ fontSize: '1.1rem' }}>
                      {hostStep === 1 && (ar ? 'مكانك' : 'Your place')}
                      {hostStep === 2 && (ar ? 'التفاصيل والتسعير' : 'Details & pricing')}
                      {hostStep === 3 && (ar ? 'مراجعة ونشر' : 'Review & publish')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={resetHostModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X className="w-4 h-4" style={{ color: '#B8C2D6' }} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-5">

                {/* ── Step 1: Identity ── */}
                {hostStep === 1 && (
                  <>
                    <p className="text-sm" style={{ color: '#7F8AA3' }}>{ar ? 'ما نوع المكان الذي تشاركه؟' : 'What kind of place are you sharing?'}</p>

                    {/* Type chips */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {PLACE_TYPES.map(pt => {
                        const active = hostForm.type === pt.id;
                        return (
                          <button
                            key={pt.id}
                            onClick={() => setHostForm(f => ({ ...f, type: pt.id }))}
                            className="flex flex-col items-center gap-2 py-3.5 rounded-2xl border transition-all"
                            style={{
                              background: active ? '#7CF7C8' : 'rgba(255,255,255,0.06)',
                              borderColor: active ? '#7CF7C8' : 'rgba(255,255,255,0.10)',
                              color: active ? '#050B1E' : '#B8C2D6',
                            }}
                          >
                            {pt.icon}
                            <span className="text-xs font-bold">{ar ? pt.labelAr : pt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'اسم المكان *' : 'Place name *'}</label>
                      <input
                        value={hostForm.title}
                        onChange={e => setHostForm(f => ({ ...f, title: e.target.value }))}
                        placeholder={ar ? 'مثال: شاليه الغروب، أبها' : 'e.g. Sunset Chalet, Abha'}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        style={{
                          background: '#101B36',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'الموقع *' : 'Location *'}</label>
                      <input
                        value={hostForm.locationName}
                        onChange={e => setHostForm(f => ({ ...f, locationName: e.target.value }))}
                        placeholder={ar ? 'مثال: أبها، منطقة عسير' : 'e.g. Abha, Asir Region'}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        style={{
                          background: '#101B36',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                    </div>

                    {/* Google Maps URL */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'رابط خرائط جوجل' : 'Google Maps link'} <span style={{ color: '#7F8AA3', fontWeight: 400 }}>{ar ? '(اختياري)' : '(optional)'}</span></label>
                      <input
                        value={hostMapsUrl}
                        onChange={e => setHostMapsUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        style={{
                          background: '#101B36',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs" style={{ color: '#7F8AA3' }}>{ar ? 'خرائط جوجل ← مشاركة ← نسخ الرابط' : 'Google Maps → Share → Copy link'}</p>
                        {hostMapsUrl.trim().startsWith('http') && (hostMapsUrl.includes('google') || hostMapsUrl.includes('goo.gl')) && (
                          <a
                            href={hostMapsUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-bold"
                            style={{ color: '#7CF7C8' }}
                          >
                            Preview on Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Photo upload */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'صورة' : 'Photo'} <span style={{ color: '#7F8AA3', fontWeight: 400 }}>{ar ? '(اختياري)' : '(optional)'}</span></label>
                      <input
                        ref={hostImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const compressed = await compressImage(file);
                          setHostImage(compressed);
                          e.target.value = '';
                        }}
                      />
                      {hostImage ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ height: '140px' }}>
                          <img src={hostImage} alt="preview" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              onClick={() => hostImageInputRef.current?.click()}
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{ background: 'rgba(8,18,41,0.85)', color: '#7CF7C8' }}
                            >
                              {ar ? 'استبدال' : 'Replace'}
                            </button>
                            <button
                              onClick={() => setHostImage(null)}
                              className="w-7 h-7 flex items-center justify-center rounded-full"
                              style={{ background: 'rgba(8,18,41,0.85)' }}
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => hostImageInputRef.current?.click()}
                          className="w-full rounded-xl flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed transition-all"
                          style={{ borderColor: 'rgba(124,247,200,0.25)', background: 'rgba(124,247,200,0.04)' }}
                        >
                          <Camera className="w-6 h-6" style={{ color: '#7CF7C8', opacity: 0.7 }} />
                          <span className="text-xs font-bold" style={{ color: '#7CF7C8', opacity: 0.7 }}>{ar ? 'أضف صورة' : 'Add a photo'}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* ── Step 2: Details ── */}
                {hostStep === 2 && (
                  <>
                    <p className="text-sm" style={{ color: '#7F8AA3' }}>{ar ? 'أخبر الضيوف بما يجعل مكانك مميزاً.' : 'Tell guests what makes it special.'}</p>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'الوصف' : 'Description'}</label>
                      <textarea
                        value={hostForm.description}
                        onChange={e => setHostForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={ar ? 'صف الأجواء، المشاهد، وأفضل وقت للزيارة…' : 'Describe the vibe, the views, the best time to visit…'}
                        rows={4}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                        style={{
                          background: '#101B36',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                    </div>

                    {/* Amenities */}
                    <div>
                      <label className="block text-xs font-bold mb-2" style={{ color: '#B8C2D6' }}>{ar ? 'المرافق' : 'Amenities'}</label>
                      <div className="flex flex-wrap gap-2">
                        {HOST_AMENITIES.map(a => {
                          const on = hostForm.amenities.includes(a);
                          return (
                            <button
                              key={a}
                              onClick={() => toggleAmenity(a)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                              style={{
                                background: on ? '#7CF7C8' : 'rgba(255,255,255,0.06)',
                                borderColor: on ? '#7CF7C8' : 'rgba(255,255,255,0.10)',
                                color: on ? '#050B1E' : '#B8C2D6',
                              }}
                            >
                              {AMENITY_ICONS[a] || null}
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'السعر لكل ليلة (ريال) *' : 'Price per night (SAR) *'}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: '#7F8AA3' }}>SAR</span>
                        <input
                          type="number"
                          min="0"
                          value={hostForm.price}
                          onChange={e => setHostForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="650"
                          className="w-full rounded-xl pl-14 pr-4 py-3 text-sm text-white outline-none transition-all"
                          style={{
                            background: '#101B36',
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 3: Review & publish ── */}
                {hostStep === 3 && (
                  <>
                    <p className="text-sm mb-1" style={{ color: '#7F8AA3' }}>{ar ? 'شيء أخير — كيف يتواصل معك الضيوف؟' : 'One last thing — how do guests reach you?'}</p>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: '#B8C2D6' }}>{ar ? 'رقم التواصل' : 'Contact phone'}</label>
                      <input
                        type="tel"
                        value={hostForm.phone}
                        onChange={e => setHostForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                        style={{
                          background: '#101B36',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
                      />
                    </div>

                    {/* Preview card */}
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.10)', background: '#101B36' }}>
                      <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(124,247,200,0.07)' }}>
                        {hostImage
                          ? <img src={hostImage} alt="preview" className="w-full h-full object-cover" />
                          : <Tent className="w-8 h-8" style={{ color: '#7CF7C8', opacity: 0.6 }} />
                        }
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-sm truncate" style={{ maxWidth: '70%' }}>
                            {hostForm.title || 'Your place name'}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,247,200,0.15)', color: '#7CF7C8' }}>
                            {hostForm.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: '#7F8AA3' }} />
                          <span className="text-xs" style={{ color: '#7F8AA3' }}>{hostForm.locationName || 'Location'}</span>
                          {hostMapsUrl.trim().startsWith('http') && (
                            <a
                              href={hostMapsUrl.trim()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-0.5 text-xs font-bold ml-1"
                              style={{ color: '#7CF7C8' }}
                            >
                              <ExternalLink className="w-3 h-3" /> Maps
                            </a>
                          )}
                        </div>
                        {hostForm.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {hostForm.amenities.slice(0, 4).map(a => (
                              <span key={a} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#B8C2D6' }}>{a}</span>
                            ))}
                            {hostForm.amenities.length > 4 && (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#B8C2D6' }}>+{hostForm.amenities.length - 4}</span>
                            )}
                          </div>
                        )}
                        {hostForm.price && (
                          <p className="font-black text-white text-sm pt-1">{ar ? `${hostForm.price} ريال` : `SAR ${hostForm.price}`} <span className="font-normal text-xs" style={{ color: '#7F8AA3' }}>{ar ? '/ ليلة' : '/ night'}</span></p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-5 pt-3 pb-6">
                {hostStep < 3 ? (
                  <button
                    disabled={(hostStep === 1 && !step1Valid) || (hostStep === 2 && !step2Valid)}
                    onClick={() => setHostStep(s => s + 1)}
                    className="w-full py-3.5 rounded-full font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                    style={{
                      background: '#7CF7C8',
                      color: '#050B1E',
                      boxShadow: '0 8px 24px -6px rgba(124,247,200,0.45)',
                    }}
                  >
                    {ar ? 'التالي' : 'Continue'}
                  </button>
                ) : (
                  <button
                    disabled={hostSubmitting}
                    onClick={handleSubmit}
                    className="w-full py-3.5 rounded-full font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                    style={{
                      background: '#7CF7C8',
                      color: '#050B1E',
                      boxShadow: '0 8px 24px -6px rgba(124,247,200,0.45)',
                    }}
                  >
                    {hostSubmitting ? (ar ? 'جاري النشر…' : 'Publishing…') : (ar ? 'نشر مكاني' : 'Publish my place')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};