import React, { useState, useEffect, useMemo } from 'react';
import { reviewAPI, tourAPI } from '../services/api';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Mountain,
  Tag,
  Check,
  X,
  Star,
  MapPin,
  Calendar,
  MessageSquarePlus,
  Share2,
  Bookmark,
  Images,
  Baby,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { Tour } from '../types';
import { PhotoLightbox } from '../components/PhotoLightbox';

// ==========================================
// Types
// ==========================================
interface TourReview {
  id: string;
  tourId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  categoryRatings?: Partial<Record<ReviewCat, number>>;
}

const REVIEW_CATS = ['guideQuality', 'valueForMoney', 'experience', 'safety'] as const;
type ReviewCat = typeof REVIEW_CATS[number];
const REVIEW_CAT_LABELS: Record<ReviewCat, string> = {
  guideQuality: 'Guide Quality',
  valueForMoney: 'Value for Money',
  experience: 'Experience',
  safety: 'Safety',
};

const REVIEWS_KEY = 'tripo_tour_reviews';

function loadTourReviews(tourId: string): TourReview[] {
  try {
    const all: TourReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    return all.filter(r => r.tourId === tourId);
  } catch { return []; }
}

function saveTourReview(review: TourReview) {
  try {
    const all: TourReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
    all.push(review);
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
  } catch { /* noop */ }
}

// ==========================================
// Props & Config
// ==========================================
interface TourDetailScreenProps {
  tour: Tour;
  onBack: () => void;
  onBook: (tour: Tour) => void;
  t: any;
  allTours?: Tour[];
  onSelectTour?: (tour: Tour) => void;
}

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-emerald-100 text-emerald-800' },
  moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-800' },
  challenging: { label: 'Challenging', color: 'bg-red-100 text-red-800' },
};

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' });

// ==========================================
// Component
// ==========================================
export const TourDetailScreen: React.FC<TourDetailScreenProps> = ({ tour, onBack, onBook, t, allTours, onSelectTour }) => {
  const difficulty = difficultyConfig[tour.difficulty] || difficultyConfig.easy;

  const tourImages = (() => {
    const imgs = (tour.images && tour.images.length > 0) ? tour.images : [tour.heroImage];
    const seen = new Set<string>();
    return imgs.filter(Boolean).filter(u => { if (seen.has(u)) return false; seen.add(u); return true; }) as string[];
  })();

  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  // Feature 16 – photo grid
  const [showPhotoGrid, setShowPhotoGrid] = useState(false);

  useEffect(() => {
    if (tourImages.length <= 1) return;
    const id = setInterval(() => setImgIdx(i => (i + 1) % tourImages.length), 3500);
    return () => clearInterval(id);
  }, [tourImages.length]);

  // Feature 1 – saved state (API + localStorage cache)
  const tourId = (tour as any)._id || tour.id || '';
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('tripo_saved_tours') || '[]');
      return saved.includes(tourId);
    } catch { return false; }
  });

  // Sync saved state from API on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !tourId) return;
    tourAPI.getSavedTours().then(ids => {
      const saved = ids.includes(tourId);
      setIsSaved(saved);
      try {
        localStorage.setItem('tripo_saved_tours', JSON.stringify(ids));
      } catch {}
    }).catch(() => {});
  }, [tourId]);

  const toggleSaved = async () => {
    const next = !isSaved;
    setIsSaved(next); // optimistic
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('tripo_saved_tours') || '[]');
      const updated = next ? [...saved, tourId] : saved.filter(id => id !== tourId);
      localStorage.setItem('tripo_saved_tours', JSON.stringify(updated));
    } catch {}
    try {
      await tourAPI.toggleSavedTour(tourId);
    } catch {
      setIsSaved(!next); // revert on failure
    }
  };

  // Feature 11 – share
  const handleShare = async () => {
    const text = `${tour.title} — SAR ${tour.pricePerPerson}/person | ${tour.departureLocation}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tour.title, text, url: window.location.href });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      // show brief visual feedback via title flash — no toast import needed
    } catch { /* noop */ }
  };

  // Reviews state
  const [reviews, setReviews] = useState<TourReview[]>(() => loadTourReviews(tourId));
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [catRatings, setCatRatings] = useState<Partial<Record<ReviewCat, number>>>({});
  const [hoverCat, setHoverCat] = useState<Partial<Record<ReviewCat, number>>>({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load reviews from API on mount (cache in localStorage)
  useEffect(() => {
    if (!tourId) return;
    reviewAPI.getReviews({ targetType: 'tour', targetId: tourId })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data.reviews ?? data.data ?? []);
        const mapped: TourReview[] = list.map((r: any) => ({
          id: r._id ?? r.id ?? String(Math.random()),
          tourId,
          author: r.userId?.name ?? r.author ?? 'Guest',
          rating: r.rating,
          comment: r.comment ?? r.text ?? '',
          date: r.createdAt ?? new Date().toISOString(),
          categoryRatings: r.categoryRatings,
        }));
        setReviews(mapped);
        // write-through to localStorage cache
        try {
          const all: TourReview[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
          const others = all.filter(r => r.tourId !== tourId);
          localStorage.setItem(REVIEWS_KEY, JSON.stringify([...others, ...mapped]));
        } catch {}
      })
      .catch(() => { setReviews(loadTourReviews(tourId)); });
  }, [tourId]);

  const submitReview = async () => {
    if (!reviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        targetType: 'tour',
        targetId: tourId,
        rating: reviewRating,
        comment: reviewText.trim(),
      };
      if (Object.keys(catRatings).length > 0) payload.categoryRatings = catRatings;

      if (token) {
        const saved = await reviewAPI.createReview(payload);
        const review: TourReview = {
          id: saved._id ?? saved.id ?? Date.now().toString(),
          tourId,
          author: saved.userId?.name ?? (reviewAuthor.trim() || 'Guest'),
          rating: reviewRating,
          comment: reviewText.trim(),
          date: saved.createdAt ?? new Date().toISOString(),
          categoryRatings: Object.keys(catRatings).length > 0 ? catRatings : undefined,
        };
        setReviews(prev => [...prev, review]);
        saveTourReview(review);
      } else {
        // unauthenticated: cache locally only
        const review: TourReview = {
          id: Date.now().toString(),
          tourId,
          author: reviewAuthor.trim() || 'Guest',
          rating: reviewRating,
          comment: reviewText.trim(),
          date: new Date().toISOString(),
          categoryRatings: Object.keys(catRatings).length > 0 ? catRatings : undefined,
        };
        saveTourReview(review);
        setReviews(prev => [...prev, review]);
      }
    } catch {
      // fallback: save locally
      const review: TourReview = {
        id: Date.now().toString(),
        tourId,
        author: reviewAuthor.trim() || 'Guest',
        rating: reviewRating,
        comment: reviewText.trim(),
        date: new Date().toISOString(),
        categoryRatings: Object.keys(catRatings).length > 0 ? catRatings : undefined,
      };
      saveTourReview(review);
      setReviews(prev => [...prev, review]);
    } finally {
      setIsSubmittingReview(false);
      setReviewAuthor('');
      setReviewRating(5);
      setReviewText('');
      setCatRatings({});
      setHoverCat({});
      setShowReviewForm(false);
    }
  };

  const allReviews = reviews;
  const avgRating = allReviews.length > 0
    ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
    : (tour.rating ?? 0);
  const totalCount = allReviews.length + (tour.reviewCount ?? 0);

  // Feature 15 – rating distribution
  const ratingDist = useMemo(() =>
    [5, 4, 3, 2, 1].map(star => ({
      star,
      count: allReviews.filter(r => Math.round(r.rating) === star).length,
    })), [allReviews]);

  // Feature 14 – category aggregate
  const catAggregate = useMemo(() => {
    const result: Partial<Record<ReviewCat, number>> = {};
    REVIEW_CATS.forEach(cat => {
      const vals = allReviews
        .filter(r => r.categoryRatings?.[cat] != null)
        .map(r => r.categoryRatings![cat] as number);
      if (vals.length > 0) result[cat] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    return result;
  }, [allReviews]);

  const upcomingDates = (tour.availableDates || [])
    .map((d) => new Date(d))
    .filter((d) => d > new Date())
    .slice(0, 4);

  const similarTours = (allTours || [])
    .filter(t2 => t2.id !== tour.id && t2._id !== tour._id &&
      (t2.category === tour.category ||
        (t2.tags || []).some(tag => (tour.tags || []).includes(tag))))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  // Feature 18 – group members preview
  const bookedCount = tour.bookingsCount ?? 0;
  const spotsInCurrentGroup = bookedCount > 0 && tour.maxGroupSize
    ? bookedCount % tour.maxGroupSize || tour.maxGroupSize
    : 0;
  const previewCount = Math.min(spotsInCurrentGroup, 4);

  return (
    <>
      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={tourImages}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* Feature 16 – Photo Grid Overlay */}
      {showPhotoGrid && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <h2 className="text-white font-bold text-base">All Photos ({tourImages.length})</h2>
            <button
              onClick={() => setShowPhotoGrid(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {tourImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { setShowPhotoGrid(false); setLightboxIdx(i); }}
                  className="aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform"
                >
                  <img
                    src={src}
                    className="w-full h-full object-cover hover:opacity-90 transition"
                    alt={`Photo ${i + 1}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Hero Image slideshow */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: '18rem' }}>
          <img
            src={tourImages[imgIdx] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'}
            alt={tour.title}
            className="w-full h-full object-cover transition-opacity duration-300 cursor-zoom-in"
            onClick={() => setLightboxIdx(imgIdx)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Back button */}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-10"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </button>

          {/* Feature 11 – Share + Feature 1 – Save (top-right) */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleShare}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition active:scale-95"
            >
              <Share2 className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={toggleSaved}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition active:scale-95"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'text-rose-500 fill-rose-500' : 'text-slate-700'}`} />
            </button>
          </div>

          {/* Prev / Next arrows */}
          {tourImages.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx(i => (i - 1 + tourImages.length) % tourImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImgIdx(i => (i + 1) % tourImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
              {tour.category}
            </span>
            <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{tour.title}</h1>
            {tour.rating !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-white font-bold text-sm">{tour.rating.toFixed(1)}</span>
                {tour.reviewCount !== undefined && (
                  <span className="text-white/70 text-xs">({tour.reviewCount} {t.reviewsCount || 'reviews'})</span>
                )}
              </div>
            )}
            {tourImages.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2">
                {tourImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className="transition-all duration-300 rounded-full"
                    style={{ width: i === imgIdx ? 16 : 5, height: 5, background: i === imgIdx ? '#10b981' : 'rgba(255,255,255,0.55)' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip + See all photos */}
        {tourImages.length > 1 && (
          <div className="bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pt-2 pb-1">
              {tourImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => { setImgIdx(i); setLightboxIdx(i); }}
                  className={`flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-emerald-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={src} className="w-full h-full object-cover" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </button>
              ))}
            </div>
            {/* Feature 16 – See all photos button */}
            <button
              onClick={() => setShowPhotoGrid(true)}
              className="flex items-center gap-1.5 mx-4 mb-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
            >
              <Images className="w-3.5 h-3.5" />
              See all {tourImages.length} photos
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-36">
          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2 px-5 py-4 border-b border-slate-100">
            <div className="flex flex-col items-center gap-1">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{tour.totalDuration}h</span>
              <span className="text-[10px] text-slate-400">{t.tourDuration || 'Duration'}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Users className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">{t.tourMaxGroup || 'Max'} {tour.maxGroupSize}</span>
              <span className="text-[10px] text-slate-400">{t.tourGroupSize || 'Group size'}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Mountain className="w-5 h-5 text-emerald-600" />
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${difficulty.color}`}>
                {difficulty.label}
              </span>
              <span className="text-[10px] text-slate-400">{t.tourDifficulty || 'Difficulty'}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Tag className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">{tour.pricePerPerson}</span>
              <span className="text-[10px] text-slate-400">{t.tourSarPerson || 'SAR/person'}</span>
            </div>
          </div>

          <div className="px-5 py-5 space-y-8">
            {/* Description */}
            <p className="text-slate-600 text-sm leading-relaxed">{tour.description}</p>

            {/* Departure info */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
              <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{t.tourDeparture || 'Departure'}</p>
                <p className="text-sm font-semibold text-slate-800">{tour.departureLocation}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tour.departureTime}
                  {tour.returnTime ? ` — ${t.tourReturnBy || 'Return by'} ${tour.returnTime}` : ''}
                </p>
              </div>
            </div>

            {/* Highlights */}
            {tour.highlights.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">{t.tourHighlights || 'Highlights'}</h2>
                <ul className="space-y-2">
                  {tour.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="text-sm text-slate-700">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Day Plan / Stops */}
            {tour.stops.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-4">{t.tourDayPlan || 'Your Day Plan'}</h2>
                <div className="relative">
                  <div className="absolute left-[1.375rem] top-6 bottom-6 w-0.5 bg-slate-100" />
                  <div className="space-y-5">
                    {tour.stops.map((stop, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-extrabold shadow-md z-10">
                            {stop.order}
                          </div>
                          {stop.timeSlot && (
                            <span className="text-[9px] text-emerald-700 font-bold mt-1 whitespace-nowrap">
                              {stop.timeSlot}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            {stop.image && (
                              <img
                                src={stop.image}
                                alt={stop.placeName}
                                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-slate-900 text-sm">{stop.placeName}</h3>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                                  {stop.duration} {t.tourMin || 'min'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{stop.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* What's Included / Not Included */}
            {(tour.included.length > 0 || tour.excluded.length > 0) && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">{t.tourWhatsIncluded || "What's Included"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tour.included.length > 0 && (
                    <div className="bg-emerald-50 rounded-2xl p-4">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">{t.tourIncluded || 'Included'}</p>
                      <ul className="space-y-1.5">
                        {tour.included.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-emerald-900">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excluded.length > 0 && (
                    <div className="bg-red-50 rounded-2xl p-4">
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">{t.tourNotIncluded || 'Not Included'}</p>
                      <ul className="space-y-1.5">
                        {tour.excluded.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-red-900">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Guide Card */}
            <div>
              <h2 className="text-base font-extrabold text-slate-900 mb-3">{t.tourYourGuide || 'Your Guide'}</h2>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <img
                  src={tour.guideAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tour.guideName}`}
                  alt={tour.guideName}
                  className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover bg-slate-100"
                />
                <div className="flex-1">
                  <h3 className="font-extrabold text-slate-900">{tour.guideName}</h3>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    {t.tourCertifiedGuide || 'Certified Guide'}
                  </span>
                  {tour.guideRating !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(tour.guideRating!)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200 fill-slate-200'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">{tour.guideRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feature 17 – Physical Requirements / Accessibility */}
            {tour.accessibility && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">Physical Requirements</h2>
                <div className="grid grid-cols-2 gap-3">
                  {tour.accessibility.minAge != null && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Baby className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Min Age</p>
                        <p className="text-sm font-bold text-slate-800">{tour.accessibility.minAge}+</p>
                      </div>
                    </div>
                  )}
                  {tour.accessibility.fitnessLevel && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Activity className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Fitness</p>
                        <p className="text-sm font-bold text-slate-800">{tour.accessibility.fitnessLevel}</p>
                      </div>
                    </div>
                  )}
                  {tour.accessibility.wheelchairFriendly != null && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${tour.accessibility.wheelchairFriendly ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Wheelchair</p>
                        <p className={`text-sm font-bold ${tour.accessibility.wheelchairFriendly ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {tour.accessibility.wheelchairFriendly ? 'Accessible' : 'Not Accessible'}
                        </p>
                      </div>
                    </div>
                  )}
                  {tour.accessibility.familyFriendly != null && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                      <Users className={`w-5 h-5 flex-shrink-0 ${tour.accessibility.familyFriendly ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Family</p>
                        <p className={`text-sm font-bold ${tour.accessibility.familyFriendly ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {tour.accessibility.familyFriendly ? 'Family Friendly' : 'Adults Preferred'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Dates */}
            {upcomingDates.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">{t.tourUpcomingDates || 'Upcoming Dates'}</h2>
                <div className="flex flex-wrap gap-2">
                  {upcomingDates.map((date, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-full"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(date)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-900">
                  {t.reviewsHeader || 'Reviews'}
                  {totalCount > 0 && (
                    <span className="ml-2 text-sm font-semibold text-slate-400">({totalCount})</span>
                  )}
                </h2>
                <button
                  onClick={() => setShowReviewForm(f => !f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  {showReviewForm ? (t.cancelBtn || 'Cancel') : (t.writeReview || 'Write a Review')}
                </button>
              </div>

              {/* Feature 15 – Rating summary + distribution bars */}
              {totalCount > 0 && (
                <div className="p-4 bg-amber-50 rounded-2xl mb-4">
                  <div className="flex items-start gap-5">
                    {/* Big score */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-3xl font-extrabold text-slate-900">{avgRating.toFixed(1)}</p>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{totalCount} review{totalCount !== 1 ? 's' : ''}</p>
                    </div>
                    {/* Distribution bars */}
                    <div className="flex-1 space-y-1.5">
                      {ratingDist.map(({ star, count }) => {
                        const pct = allReviews.length > 0 ? (count / allReviews.length) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 w-3 text-right">{star}</span>
                            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                            <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 w-4 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Feature 14 – Category aggregate bars */}
              {Object.keys(catAggregate).length > 0 && (
                <div className="p-4 bg-slate-50 rounded-2xl mb-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Review Breakdown</p>
                  {REVIEW_CATS.filter(cat => catAggregate[cat] != null).map(cat => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-28 flex-shrink-0">{REVIEW_CAT_LABELS[cat]}</span>
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${(catAggregate[cat]! / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-6 text-right">{catAggregate[cat]!.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Review form */}
              {showReviewForm && (
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-3">
                  <p className="text-sm font-bold text-slate-800">{t.shareExperience || 'Share your experience'}</p>

                  {/* Overall star selector */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Overall Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setReviewRating(s)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star className={`w-7 h-7 ${s <= (hoverRating || reviewRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-slate-500">
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][hoverRating || reviewRating]}
                      </span>
                    </div>
                  </div>

                  {/* Feature 14 – Category ratings */}
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500 mb-2">Rate specific aspects (optional)</p>
                    {REVIEW_CATS.map(cat => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 w-28 flex-shrink-0">{REVIEW_CAT_LABELS[cat]}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              onMouseEnter={() => setHoverCat(prev => ({ ...prev, [cat]: s }))}
                              onMouseLeave={() => setHoverCat(prev => { const n = { ...prev }; delete n[cat]; return n; })}
                              onClick={() => setCatRatings(prev =>
                                prev[cat] === s ? (({ [cat]: _, ...rest }) => rest)(prev as any) : { ...prev, [cat]: s }
                              )}
                              className="transition-transform hover:scale-110"
                            >
                              <Star className={`w-5 h-5 ${s <= (hoverCat[cat] || catRatings[cat] || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    placeholder={t.yourName || 'Your name'}
                    value={reviewAuthor}
                    onChange={e => setReviewAuthor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  />

                  {/* Comment textarea */}
                  <textarea
                    placeholder={t.tourExpPlaceholder || 'Tell others about your experience on this tour...'}
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white resize-none"
                  />

                  <button
                    onClick={submitReview}
                    disabled={!reviewAuthor.trim() || !reviewText.trim()}
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t.submitReview || 'Submit Review'}
                  </button>
                </div>
              )}

              {/* Reviews list */}
              {allReviews.length === 0 && !showReviewForm && (
                <div className="text-center py-8 bg-slate-50 rounded-2xl">
                  <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">{t.noReviewsYet || 'No reviews yet — be the first!'}</p>
                </div>
              )}

              {allReviews.length > 0 && (
                <div className="space-y-3">
                  {allReviews.slice().reverse().map(review => (
                    <div key={review.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-extrabold text-sm">
                          {review.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <span className="font-bold text-slate-900 text-sm">{review.author}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(review.date).toLocaleDateString('en-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                          {/* Category rating pills */}
                          {review.categoryRatings && Object.keys(review.categoryRatings).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(Object.entries(review.categoryRatings) as [ReviewCat, number][]).map(([cat, val]) => (
                                <span key={cat} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                                  {REVIEW_CAT_LABELS[cat]}: {val}★
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Similar Tours */}
            {similarTours.length > 0 && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900 mb-3">{t.tourSimilarTours || 'Similar Tours'}</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
                  {similarTours.map(t2 => (
                    <button
                      key={t2.id || t2._id}
                      onClick={() => onSelectTour?.(t2)}
                      className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-95 transition-transform"
                    >
                      <div className="relative h-24">
                        <img
                          src={t2.heroImage}
                          alt={t2.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-white uppercase tracking-wide">{t2.category}</span>
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug mb-1">{t2.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 font-bold text-xs">{t2.pricePerPerson} {t.sarLabel || 'SAR'}</span>
                          {t2.rating !== undefined && (
                            <span className="text-[10px] text-amber-500 font-bold">★ {t2.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature 18 – Group Members Preview + Sticky Bottom CTA */}
        <div className="flex-shrink-0 bg-white border-t border-slate-100 px-5 pt-3 pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {/* Group preview */}
          {previewCount > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                {Array.from({ length: previewCount }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white shadow-sm bg-emerald-100 flex items-center justify-center text-[10px] font-extrabold text-emerald-700"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">{previewCount} {previewCount === 1 ? 'person has' : 'people have'}</span> already joined the next group
              </p>
            </div>
          )}
          {/* Price + Book */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">{t.tourFrom || 'From'}</p>
              <p className="text-2xl font-extrabold text-emerald-700">
                {tour.pricePerPerson.toLocaleString()}
                <span className="text-sm font-bold text-slate-500 ml-1">{t.sarLabel || 'SAR'}</span>
              </p>
              <p className="text-[10px] text-slate-400">{t.tourPerPerson || 'per person'}</p>
            </div>
            <button
              onClick={() => onBook(tour)}
              className="flex-1 max-w-xs py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-teal-600 transition active:scale-95 text-base"
            >
              {t.tourBookTrip || 'Book This Trip'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
