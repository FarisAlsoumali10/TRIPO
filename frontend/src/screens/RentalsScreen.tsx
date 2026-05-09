// frontend/src/screens/RentalsScreen.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Tent, Plus, X, Star, MapPin, Flame, Phone, SlidersHorizontal,
  Camera, ExternalLink, MessageCircle, ChevronLeft, ChevronRight, User,
  ArrowLeft, Home, BedDouble, Users, Info, Trophy, Search,
  TrendingUp, Award, Navigation, Wallet, Heart, Share2, Send,
  Wifi, Utensils, Car, Waves, Wind, ShieldCheck, Calendar, Clock,
} from 'lucide-react';
import { Button, Input, SafeImage } from '../components/ui';
import { Rental } from '../types/index';
import { rentalAPI, paymentAPI } from '../services/api';
import { showToast } from '../components/Toast';
import type { RentalFormValue } from '../components/RentalFormFields';
import { compressImage } from '../utils/compressImage';
import { TrendingCards, TrendingItem } from '../components/TrendingSlideshow';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { PaymentForm } from '../components/PaymentForm';

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
  const [showPayment, setShowPayment] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState('');

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
      
      const bId = booking?._id || booking?.id;
      if (bId) {
        setActiveBookingId(bId);
        setShowPayment(true);
      } else {
        throw new Error('Booking ID missing');
      }
    } catch (e) {
      showToast('Failed to submit booking', 'error');
    } finally {
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
      <div className="fixed inset-0 z-50 bg-white dark:bg-navy-900 overflow-y-auto flex flex-col">
        {/* ── Hero image ── */}
        <div className="relative w-full h-72 flex-shrink-0 bg-slate-100 dark:bg-navy-800">
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
            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-navy-800">
              <Tent className="w-16 h-16 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Back button */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-2 bg-lifted/80 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-2xl active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> {t.backBtn || 'Back'}
          </button>

          {/* Top-right actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="bg-lifted/80 backdrop-blur-md text-white p-2.5 rounded-2xl border border-white/10 shadow-2xl active:scale-95 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleFavorite(rentalId)}
              className={`p-2.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 active:scale-95 ${isFav ? 'bg-rose-500 border-rose-500 text-white' : 'bg-lifted/80 border-white/10 text-white'}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            <span className="bg-oasis-spring text-midnight text-[10px] font-black px-3 py-2 rounded-xl backdrop-blur-md shadow-mint-glow uppercase tracking-widest">
              {rental.type}
            </span>
          </div>

          {/* Title + location */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl">{rental.title}</h1>
              {rental.verified && (
                <ShieldCheck className="w-5 h-5 text-oasis-spring flex-shrink-0 drop-shadow-2xl" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-moon flex-shrink-0" />
              <span className="text-[10px] font-black text-moon uppercase tracking-widest">{rental.locationName}</span>
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
              <span className="text-4xl font-black text-oasis-spring tracking-tighter">{rental.price}</span>
              <span className="text-[10px] font-black text-moon/40 ml-2 uppercase tracking-widest">{ar ? (isSport ? 'ريال / ساعة' : 'ريال / ليلة') : (isSport ? 'SAR / hr' : 'SAR / night')}</span>
            </div>
            {(avgRating || rental.ratingSummary?.avgRating || rental.rating) && (
              <div className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 px-4 py-2 rounded-2xl shadow-xl">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {avgRating ?? rental.ratingSummary?.avgRating?.toFixed(1) ?? rental.rating}
                </span>
                {(reviews.length || rental.ratingSummary?.reviewCount) ? (
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                    ({reviews.length || rental.ratingSummary?.reviewCount})
                  </span>
                ) : (
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">/ 5</span>
                )}
              </div>
            )}
          </div>

          {/* Quick-info badges */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
              <MapPin className="w-3.5 h-3.5 text-oasis-spring" /> {rental.locationName}
            </span>
            {rental.capacity && (
              <span className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                <Users className="w-3.5 h-3.5 text-oasis-spring" /> {ar ? `حتى ${rental.capacity} ضيف` : `Up to ${rental.capacity} guests`}
              </span>
            )}
            {rental.bedrooms != null && rental.bedrooms > 0 && (
              <span className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                <BedDouble className="w-3.5 h-3.5 text-oasis-spring" /> {ar ? `${rental.bedrooms} غرفة` : `${rental.bedrooms} bed${rental.bedrooms > 1 ? 's' : ''}`}
              </span>
            )}
          </div>

          {/* ── Description ── */}
          {rental.description && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-oasis-spring" />
                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.aboutThisPlace || 'About this place'}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed font-medium">{rental.description}</p>
            </div>
          )}

          {/* ── Booking / Time-slot picker ── */}
          <div className="bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-oasis-spring/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                {isSport ? <Clock className="w-4 h-4 text-oasis-spring" /> : <Calendar className="w-4 h-4 text-oasis-spring" />}
                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                  {isSport ? (ar ? 'احجز وقتاً' : 'Book a Time Slot') : (ar ? 'تفاصيل الحجز' : 'Booking Details')}
                </span>
              </div>
              <div className="space-y-4">
                {/* Date Selection */}
                <div>
                  <label className="text-[9px] font-black text-moon/40 uppercase tracking-widest mb-1.5 block">{ar ? 'التاريخ' : 'Date'}</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all"
                  />
                </div>
              </div>

              {/* Hours / Nights Adjuster */}
              <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-navy-950 p-4 rounded-2xl border border-slate-100 dark:border-white/8">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{isSport ? (ar ? 'ساعات' : 'Hours') : (ar ? 'ليالٍ' : 'Nights')}</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white text-lg active:scale-90 transition-all">−</button>
                  <span className="font-black text-xl text-slate-900 dark:text-white w-6 text-center tracking-tighter">{nights}</span>
                  <button onClick={() => setNights(n => Math.min(30, n + 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white text-lg active:scale-90 transition-all">+</button>
                </div>
              </div>

              {/* Time Slot Picker (Sports Only) */}
              {isSport && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest block">{ar ? 'وقت البداية' : 'Start time'}</label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {TIME_SLOTS.slice(0, -nights).map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${ selectedSlot === slot ? 'bg-oasis-spring border-oasis-spring text-midnight shadow-mint-glow' : 'bg-white dark:bg-navy-900 border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 hover:border-slate-300' }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-white/5 pt-5 space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-500">{ar ? `${rental.price} ريال × ${nights} ${isSport ? 'ساعة' : 'ليلة'}` : `${rental.price} SAR × ${nights} ${isSport ? 'hr' : 'night'}`}</span>
                  <span className="text-slate-900 dark:text-white font-black">{basePrice * nights} SAR</span>
                </div>
                {!isSport && cleaningFee > 0 && (
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500 dark:text-slate-500">{ar ? 'رسوم التنظيف' : 'Cleaning fee'}</span>
                    <span className="text-slate-900 dark:text-white">{cleaningFee} SAR</span>
                  </div>
                )}
                {!isSport && (
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500 dark:text-slate-500">{ar ? 'رسوم الخدمة' : 'Service fee'}</span>
                    <span className="text-slate-900 dark:text-white">{serviceFee} SAR</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/8 pt-4 mt-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{ar ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-2xl font-black text-oasis-spring tracking-tighter">{totalNights} SAR</span>
                </div>
              </div>

              {showPayment ? (
                <div className="animate-in fade-in zoom-in duration-500 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={() => setShowPayment(false)}
                      className="text-[10px] font-black text-moon hover:text-white uppercase tracking-widest flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> {ar ? 'تغيير الموعد' : 'Change Date'}
                    </button>
                    <span className="text-[10px] font-black text-oasis-spring uppercase tracking-widest">
                      {ar ? 'تأكيد الدفع' : 'Confirm Payment'}
                    </span>
                  </div>
                  <PaymentForm
                    itemType="rental"
                    itemId={rentalId}
                    bookingId={activeBookingId}
                    amount={totalNights}
                    lang={lang}
                    onSuccess={(mockId) => {
                      setTimeout(() => {
                        window.location.href = `/payment-success?id=${mockId}&status=paid&type=rental`;
                      }, 2000);
                    }}
                  />
                </div>
              ) : (
                <button
                  className="w-full mt-8 bg-oasis-spring text-midnight py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-mint-glow active:scale-[0.98] transition-all disabled:opacity-50"
                  onClick={handleBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (ar ? 'جاري المعالجة...' : 'Processing...') : (ar ? 'طلب حجز' : 'Request to Book')}
                </button>
              )}
            </div>
          </div>

          {/* ── Reviews ── */}
          <div className="pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t.reviewsHeader || 'Reviews'}</h2>
              <button
                onClick={() => setShowReviewForm(v => !v)}
                className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 text-[10px] font-black px-4 py-2 rounded-xl hover:bg-slate-50 transition-all active:scale-95"
              >
                <Star className="w-3.5 h-3.5 text-oasis-spring" />
                {showReviewForm ? (t.cancelBtn || 'Cancel') : (t.writeReview || 'Write a Review')}
              </button>
            </div>

            {showReviewForm && (
              <div className="bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 rounded-3xl p-6 mb-8 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4">
                <div>
                  <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-1.5 block">{ar ? 'اسمك' : 'Your Name'}</label>
                  <input type="text" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder={ar ? 'أدخل اسمك' : 'Enter your name'}
                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-1.5 block">{ar ? 'التقييم' : 'Rating'}</label>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-1.5 block">{ar ? 'مراجعتك' : 'Review'}</label>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={ar ? 'شارك تجربتك...' : 'Share your experience...'} rows={3}
                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all resize-none" />
                </div>
                <button onClick={handleSubmitReview} disabled={submittingReview} className="w-full bg-oasis-spring text-midnight py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-mint-glow hover:shadow-mint-glow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                  {submittingReview ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'إرسال المراجعة' : 'Submit Review')}
                </button>
              </div>
            )}

            {loadingReviews ? (
              <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-oasis-spring border-t-transparent rounded-full animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-navy-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                <Star className="w-12 h-12 text-slate-200 dark:text-slate-300 mb-4" />
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{ar ? 'لا توجد مراجعات بعد' : 'No reviews yet'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="bg-white dark:bg-navy-900 border border-slate-100 dark:border-white/8 rounded-[2rem] p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-800 flex items-center justify-center border border-slate-100 dark:border-white/10 shadow-lg">
                          <User className="w-5 h-5 text-oasis-spring" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{r.author}</p>
                          <p className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{new Date(r.date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-navy-950 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/8 shadow-inner">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-500 leading-relaxed font-medium italic">"{r.text}"</p>
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
    <div className="min-h-full bg-slate-50 dark:bg-navy-950 transition-colors duration-300 relative">
      {/* Header */}
      <div className="bg-white dark:bg-navy-900 border-b border-slate-100 dark:border-white/8 dark:border-white/10 px-6 py-5">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.exploreRentals || 'Rentals'}</h2>
            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">{t.rentalsDesc || 'Find camps, chalets, and local stays.'}</p>
          </div>
          <button
            onClick={() => setShowHostModal(true)}
            title={t.hostPlace || 'Host a Place'}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm dark:shadow-black/30"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Search + Filter toggles ── */}
      <div className="bg-white dark:bg-navy-900 border-b border-slate-100 dark:border-white/8 dark:border-white/10 px-4 pt-3 pb-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? 'ابحث عن إيجارات، مدن...' : 'Search rentals, cities...'}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-100 dark:bg-navy-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setPendingFilter(filter); setFilterOpen(true); }}
            className={`p-2.5 rounded-xl transition-colors ${ filter.city !== 'All' || filter.amenities.length > 0 || filter.priceMax < DEFAULT_FILTER.priceMax || filter.minCapacity > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-white/10' }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSaved(v => !v)}
            className={`p-2.5 rounded-xl transition-colors ${showSaved ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-white/10'}`}
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
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${ typeFilter === type ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-navy-700' }`}
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
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${ sportTypeFilter === sport ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100' }`}
              >
                {sport === 'All' ? (ar ? 'كل الرياضات' : 'All Sports') : sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick filters ── */}
      <div className="bg-midnight border-b border-white/5 px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar">
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
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ quickFilter === qf.id ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-white dark:bg-navy-900 text-slate-500 dark:text-slate-500 border border-slate-100 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/20' }`}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white dark:bg-navy-900 rounded-[2rem] animate-pulse border border-slate-100 dark:border-white/8" />
          ))}
        </div>
      ) : (
        <div className="p-4">
          {/* ── Host Banner ── */}
          {!hostBannerDismissed && !search && typeFilter === 'All' && !quickFilter && !showSaved && filter.city === 'All' && filter.amenities.length === 0 && filter.priceMax === DEFAULT_FILTER.priceMax && filter.minCapacity === 0 && (
            <div className="relative overflow-hidden rounded-[2.5rem] mb-6 bg-gradient-to-br from-oasis-spring/20 via-slate-50 to-slate-100 dark:via-navy-800 dark:to-navy-950 border border-slate-200 dark:border-white/10 shadow-2xl group">
              {/* Decorative blobs */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-oasis-spring/10 blur-3xl pointer-events-none group-hover:bg-oasis-spring/20 transition-all duration-1000" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
              {/* Large bg icon */}
              <Tent className="absolute right-6 bottom-4 w-32 h-32 text-white/5 pointer-events-none group-hover:rotate-6 transition-transform duration-700" />

              {/* Dismiss */}
              <button
                onClick={() => {
                  setHostBannerDismissed(true);
                  localStorage.setItem('tripo:hostBannerDismissed', '1');
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white dark:bg-navy-900/20 hover:bg-white dark:bg-navy-900/30 text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Content */}
              <div className="relative px-8 py-8 pr-20">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-oasis-spring" />
                  <span className="text-[10px] font-black text-oasis-spring uppercase tracking-[0.3em]">{ar ? 'للمضيفين' : 'For Hosts'}</span>
                </div>
                <h3 className="text-slate-900 dark:text-white font-black text-2xl leading-tight mb-2 tracking-tighter uppercase">
                  {t.hostBannerTitle || 'List your place, earn with Tripo'}
                </h3>
                <p className="text-slate-500 dark:text-slate-500 text-xs font-medium leading-relaxed mb-6 max-w-[80%]">
                  {t.hostBannerSubtitle || 'Hosts in AlUla, Abha & Riyadh get bookings within 48h.'}
                </p>
                <button
                  onClick={() => setShowHostModal(true)}
                  className="inline-flex items-center gap-2 bg-oasis-spring text-midnight font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-mint-glow hover:shadow-mint-glow-lg active:scale-95 transition-all"
                >
                  {t.hostBannerCta || '🏕️ Become a Host'}
                </button>
              </div>
            </div>
          )}

          {visibleRentals.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-navy-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 mx-2">
              <Tent className="w-16 h-16 mx-auto text-slate-200 dark:text-slate-800 mb-5" />
              <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2 tracking-tighter uppercase">{ar ? 'لا توجد إيجارات' : 'No rentals found'}</h3>
              <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8">{ar ? 'جرّب تعديل الفلاتر أو البحث' : 'Try adjusting your filters or search'}</p>
                <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('All');
                  setSportTypeFilter('All');
                  setQuickFilter(null);
                  setFilter(DEFAULT_FILTER);
                  setShowSaved(false);
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-navy-700 border border-slate-200 dark:border-white/10 transition-all active:scale-95"
              >
                <X className="w-4 h-4" /> {ar ? 'مسح الفلاتر' : 'Clear filters'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRentals.map(item => (
                <div key={item.id} onClick={() => setSelectedItem(item)}
                  className="bg-white dark:bg-navy-900 rounded-3xl p-3 border border-slate-100 dark:border-white/8 shadow-xl flex flex-col cursor-pointer active:scale-[0.99] transition-transform hover:border-slate-200 dark:hover:border-white/10">
                  <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                    <SafeImage src={item.image || item.images?.[0]} alt={item.title} className="w-full h-full object-cover" fallbackType="placeholder" seed={item.title} />
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
                    <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tighter uppercase">{item.title}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-3"><MapPin className="w-3 h-3 text-oasis-spring" /> {item.locationName}</div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/8 pt-3 mt-1">
                      <p className="font-black text-xl text-oasis-spring">{item.price} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-500 lowercase tracking-normal">{ar ? (SPORT_TYPES.has(item.type) ? 'ريال/ساعة' : 'ريال/ليلة') : (SPORT_TYPES.has(item.type) ? 'SAR / hr' : 'SAR / night')}</span></p>
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
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-500">
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-navy-900 rounded-t-[3rem] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] border-t border-slate-100 dark:border-white/10">
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{ar ? 'الفلاتر' : 'Filters'}</h2>
              <button onClick={() => setFilterOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-500 active:scale-90 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-8 py-4 space-y-8">
              {/* City */}
              <div>
                <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-3 block">{ar ? 'المدينة' : 'City'}</label>
                <div className="flex flex-wrap gap-2">
                  {CITY_LIST.map(city => (
                    <button
                      key={city}
                      onClick={() => setPendingFilter(f => ({ ...f, city }))}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ pendingFilter.city === city ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-white/10 hover:border-slate-300' }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price range */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest">{ar ? 'ميزانية السعر' : 'Price Budget'}</label>
                  <span className="text-sm font-black text-oasis-spring">
                    {ar ? `${pendingFilter.priceMax} ريال` : `${pendingFilter.priceMax} SAR`}
                  </span>
                </div>
                <input
                  type="range" min={0} max={5000} step={50}
                  value={pendingFilter.priceMax}
                  onChange={e => setPendingFilter(f => ({ ...f, priceMax: Number(e.target.value) }))}
                  className="w-full accent-oasis-spring h-1.5 bg-slate-100 dark:bg-navy-800 rounded-full appearance-none cursor-pointer"
                />
              </div>
              {/* Min capacity */}
              <div>
                <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-3 block">{ar ? 'الحد الأدنى للضيوف' : 'Min. Guests'}</label>
                <div className="flex items-center gap-5">
                  <button onClick={() => setPendingFilter(f => ({ ...f, minCapacity: Math.max(0, f.minCapacity - 1) }))}
                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white text-xl active:scale-90 transition-all">−</button>
                  <span className="font-black text-2xl text-slate-900 dark:text-white w-8 text-center tracking-tighter">{pendingFilter.minCapacity || (ar ? '0' : '0')}</span>
                  <button onClick={() => setPendingFilter(f => ({ ...f, minCapacity: f.minCapacity + 1 }))}
                    className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white text-xl active:scale-90 transition-all">+</button>
                </div>
              </div>
              {/* Amenities */}
              <div>
                <label className="text-[10px] font-black text-moon/40 uppercase tracking-widest mb-3 block">{ar ? 'المرافق' : 'Amenities'}</label>
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
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ active ? 'bg-oasis-spring text-midnight shadow-mint-glow' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-white/10 hover:border-slate-300' }`}
                      >
                        {AMENITY_ICONS[amenity]} {amenity}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-8 pb-10 pt-4 flex gap-4">
                <button
                onClick={() => { setPendingFilter(DEFAULT_FILTER); setFilter(DEFAULT_FILTER); setFilterOpen(false); }}
                className="flex-1 py-4 bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-white/10 active:scale-95 transition-all"
              >
                {ar ? 'إعادة تعيين' : 'Reset'}
              </button>
              <button
                onClick={() => { setFilter(pendingFilter); setFilterOpen(false); }}
                className="flex-1 py-4 bg-oasis-spring text-midnight font-black text-xs uppercase tracking-widest rounded-2xl shadow-mint-glow active:scale-95 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
            <div
              className="w-full sm:max-w-md bg-white dark:bg-navy-900 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] border-t sm:border border-slate-200 dark:border-white/10"
              style={{ maxHeight: '92dvh' }}
            >
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-100 dark:bg-navy-950">
                <div
                  className="h-full bg-oasis-spring shadow-mint-glow transition-all duration-700"
                  style={{ width: `${(hostStep / 3) * 100}%` }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div className="flex items-center gap-4">
                  {hostStep > 1 && (
                    <button
                      onClick={() => setHostStep(s => s - 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-500 active:scale-90 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <div>
                    <p className="text-[10px] font-black text-oasis-spring uppercase tracking-[0.3em] mb-1">
                      {ar ? `خطوة ${hostStep} من 3` : `Step ${hostStep} of 3`}
                    </p>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                      {hostStep === 1 && (ar ? 'مكانك' : 'Your place')}
                      {hostStep === 2 && (ar ? 'التفاصيل والتسعير' : 'Details & pricing')}
                      {hostStep === 3 && (ar ? 'مراجعة ونشر' : 'Review & publish')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={resetHostModal}
                  className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-navy-800 border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-500 active:scale-90 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">

                {/* ── Step 1: Identity ── */}
                {hostStep === 1 && (
                  <>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">{ar ? 'ما نوع المكان الذي تشاركه؟' : 'What kind of place are you sharing?'}</p>

                    {/* Type chips */}
                    <div className="grid grid-cols-3 gap-2">
                      {PLACE_TYPES.map(pt => {
                        const active = hostForm.type === pt.id;
                        return (
                          <button
                            key={pt.id}
                            onClick={() => setHostForm(f => ({ ...f, type: pt.id }))}
                            className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all active:scale-95 ${ active ? 'bg-oasis-spring border-oasis-spring text-midnight shadow-mint-glow' : 'bg-slate-50 dark:bg-navy-950 border-slate-100 dark:border-white/8 text-slate-500 dark:text-slate-500 hover:border-slate-300' }`}
                          >
                            <div className={active ? 'text-midnight' : 'text-oasis-spring'}>{pt.icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest">{ar ? pt.labelAr : pt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-[10px] font-black text-moon/40 uppercase tracking-widest mb-2">{ar ? 'اسم المكان *' : 'Place name *'}</label>
                        <input
                        value={hostForm.title}
                        onChange={e => setHostForm(f => ({ ...f, title: e.target.value }))}
                        placeholder={ar ? 'مثال: شاليه الغروب، أبها' : 'e.g. Sunset Chalet, Abha'}
                        className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-[10px] font-black text-moon/40 uppercase tracking-widest mb-2">{ar ? 'الموقع *' : 'Location *'}</label>
                        <input
                        value={hostForm.locationName}
                        onChange={e => setHostForm(f => ({ ...f, locationName: e.target.value }))}
                        placeholder={ar ? 'مثال: أبها، منطقة عسير' : 'e.g. Abha, Asir Region'}
                        className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Google Maps URL */}
                    <div>
                      <label className="block text-[10px] font-black text-moon/40 uppercase tracking-widest mb-2">
                        {ar ? 'رابط خرائط جوجل' : 'Google Maps link'} <span className="text-moon/20 font-medium normal-case ml-1">{ar ? '(اختياري)' : '(optional)'}</span>
                      </label>
                        <input
                        value={hostMapsUrl}
                        onChange={e => setHostMapsUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-oasis-spring/30 transition-all placeholder:text-slate-400"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[9px] font-black text-moon/20 uppercase tracking-widest">{ar ? 'خرائط جوجل ← مشاركة ← نسخ الرابط' : 'Google Maps → Share → Copy link'}</p>
                        {hostMapsUrl.trim().startsWith('http') && (hostMapsUrl.includes('google') || hostMapsUrl.includes('goo.gl')) && (
                          <a
                            href={hostMapsUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-black text-oasis-spring uppercase tracking-widest hover:underline"
                          >
                            Preview <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Photo upload */}
                    <div>
                      <label className="block text-[10px] font-black text-moon/40 uppercase tracking-widest mb-2">
                        {ar ? 'صورة' : 'Photo'} <span className="text-moon/20 font-medium normal-case ml-1">{ar ? '(اختياري)' : '(optional)'}</span>
                      </label>
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
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ height: '160px' }}>
                          <img src={hostImage} alt="preview" className="w-full h-full object-cover" />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <button
                              onClick={() => hostImageInputRef.current?.click()}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-md text-oasis-spring border border-slate-100 dark:border-white/10"
                            >
                              {ar ? 'استبدال' : 'Replace'}
                            </button>
                            <button
                              onClick={() => setHostImage(null)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg active:scale-90 transition-all"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => hostImageInputRef.current?.click()}
                          className="w-full rounded-[2rem] flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-oasis-spring/20 bg-oasis-spring/5 hover:bg-oasis-spring/10 transition-all active:scale-[0.98] group"
                        >
                          <Camera className="w-8 h-8 text-oasis-spring group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-black text-oasis-spring uppercase tracking-widest">{ar ? 'أضف صورة احترافية' : 'Add a pro photo'}</span>
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
                      <label className="block text-xs font-bold mb-1.5 text-slate-400 dark:text-slate-500">{ar ? 'الوصف' : 'Description'}</label>
                      <textarea
                        value={hostForm.description}
                        onChange={e => setHostForm(f => ({ ...f, description: e.target.value }))}
                        placeholder={ar ? 'صف الأجواء، المشاهد، وأفضل وقت للزيارة…' : 'Describe the vibe, the views, the best time to visit…'}
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none focus:border-oasis-spring/50 transition-all"
                      />
                    </div>

                    {/* Amenities */}
                    <div>
                      <label className="block text-xs font-bold mb-2 text-slate-400 dark:text-slate-500">{ar ? 'المرافق' : 'Amenities'}</label>
                      <div className="flex flex-wrap gap-2">
                        {HOST_AMENITIES.map(a => {
                          const on = hostForm.amenities.includes(a);
                          return (
                            <button
                              key={a}
                              onClick={() => toggleAmenity(a)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${ on ? 'bg-oasis-spring border-oasis-spring text-midnight' : 'bg-slate-100 dark:bg-navy-800 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-500' }`}
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
                      <label className="block text-xs font-bold mb-1.5 text-slate-400 dark:text-slate-500">{ar ? 'السعر لكل ليلة (ريال) *' : 'Price per night (SAR) *'}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">SAR</span>
                        <input
                          type="number"
                          min="0"
                          value={hostForm.price}
                          onChange={e => setHostForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="650"
                          className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl pl-14 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-oasis-spring/50 transition-all"
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
                      <label className="block text-xs font-bold mb-1.5 text-slate-400 dark:text-slate-500">{ar ? 'رقم التواصل' : 'Contact phone'}</label>
                      <input
                        type="tel"
                        value={hostForm.phone}
                        onChange={e => setHostForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+966 5X XXX XXXX"
                        className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-oasis-spring/50 transition-all"
                      />
                    </div>

                    {/* Preview card */}
                    <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-navy-950">
                      <div className="h-28 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(124,247,200,0.07)' }}>
                        {hostImage
                          ? <img src={hostImage} alt="preview" className="w-full h-full object-cover" />
                          : <Tent className="w-8 h-8" style={{ color: '#7CF7C8', opacity: 0.6 }} />
                        }
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 dark:text-white text-sm truncate" style={{ maxWidth: '70%' }}>
                            {hostForm.title || 'Your place name'}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,247,200,0.15)', color: '#7CF7C8' }}>
                            {hostForm.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500 dark:text-slate-500">{hostForm.locationName || 'Location'}</span>
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
                              <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-400">{a}</span>
                            ))}
                            {hostForm.amenities.length > 4 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-navy-800 text-slate-600 dark:text-slate-400">+{hostForm.amenities.length - 4}</span>
                            )}
                          </div>
                        )}
                         {hostForm.price && (
                          <p className="font-black text-slate-900 dark:text-white text-sm pt-1">{ar ? `${hostForm.price} ريال` : `SAR ${hostForm.price}`} <span className="font-normal text-xs text-slate-500 dark:text-slate-500">{ar ? '/ ليلة' : '/ night'}</span></p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

                {/* ── Footer CTA ── */}
                <div className="px-8 pt-4 pb-10">
                  {hostStep < 3 ? (
                    <button
                      disabled={(hostStep === 1 && !step1Valid) || (hostStep === 2 && !step2Valid)}
                      onClick={() => setHostStep(s => s + 1)}
                      className="w-full py-5 bg-oasis-spring text-midnight rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-mint-glow disabled:opacity-30 disabled:shadow-none active:scale-[0.97] transition-all"
                    >
                      {ar ? 'التالي' : 'Continue'}
                    </button>
                  ) : (
                    <button
                      disabled={hostSubmitting}
                      onClick={handleSubmit}
                      className="w-full py-5 bg-oasis-spring text-midnight rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-mint-glow disabled:opacity-30 disabled:shadow-none active:scale-[0.97] transition-all"
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