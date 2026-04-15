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
import { rentalAPI } from '../services/api';
import { showToast } from '../components/Toast';
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
      await rentalAPI.bookTimeSlot(rentalId, {
        date: bookingDate,
        nightsOrHours: nights,
        slot: isSport ? selectedSlot : undefined,
        totalPrice: totalNights
      });
      showToast('Booking request sent successfully!', 'success');
      // Reset form
      setBookingDate('');
      setSelectedSlot('');
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
                <BedDouble className="w-3.5 h-3.5" /> {rental.bedrooms} bed{rental.bedrooms > 1 ? 's' : ''}
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
                {isSport ? 'Book a Time Slot' : 'Price Breakdown'}
              </span>
            </div>
            <div className="space-y-3">
              {/* Date Selection */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date</label>
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
                <span className="text-xs text-slate-500">{isSport ? 'Hours' : 'Nights'}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm transition">−</button>
                  <span className="font-bold text-slate-900 w-6 text-center">{nights}</span>
                  <button onClick={() => setNights(n => Math.min(30, n + 1))} className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-white text-sm transition">+</button>
                </div>
              </div>

              {/* Time Slot Picker (Sports Only) */}
              {isSport && (
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
              )}

              {/* Totals */}
              <div className={`border-t pt-3 space-y-1 ${isSport ? 'border-blue-200' : 'border-emerald-200'}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{rental.price} SAR × {nights} {isSport ? 'hr' : 'night'}</span>
                  <span className="font-semibold">{basePrice * nights} SAR</span>
                </div>
                {!isSport && cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cleaning fee</span>
                    <span>{cleaningFee} SAR</span>
                  </div>
                )}
                {!isSport && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service fee</span>
                    <span>{serviceFee} SAR</span>
                  </div>
                )}
                <div className={`flex justify-between text-sm font-bold border-t pt-1 mt-1 ${isSport ? 'text-blue-800 border-blue-200' : 'text-emerald-800 border-emerald-200'}`}>
                  <span>Total</span>
                  <span>{totalNights} SAR</span>
                </div>
              </div>

              <Button
                className={`w-full ${isSport ? '!bg-blue-600 hover:!bg-blue-700' : '!bg-emerald-600 hover:!bg-emerald-700'}`}
                onClick={handleBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Processing...' : 'Request to Book'}
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
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Your Name</label>
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
                <button onClick={handleSubmitReview} disabled={submittingReview} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}

            {loadingReviews ? (
              <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Star className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium">No reviews yet</p>
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

export const RentalsScreen = ({ t, initialRentalId, onRentalOpened }: { t: any; initialRentalId?: string; onRentalOpened?: () => void }) => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // UI State
  const [selectedItem, setSelectedItem] = useState<Rental | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [search, setSearch] = useState('');

  // Create Modal
  const [showHostModal, setShowHostModal] = useState(false);

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
    return rentals.filter(r => {
      const matchType = typeFilter === 'All' || r.type === typeFilter;
      const matchSearch = !search ||
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.locationName?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [rentals, typeFilter, search]);

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

      {/* Loading State */}
      {loading ? (
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="p-4">
          {visibleRentals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <Tent className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-slate-500 font-bold text-lg mb-1">No rentals available</h3>
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
                      <p className="font-bold text-lg text-emerald-700">{item.price} <span className="text-xs font-normal text-slate-500">SAR / night</span></p>
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
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
};