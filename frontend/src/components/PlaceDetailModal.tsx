import React, { useState, useEffect, useRef } from 'react';
import { X, Star, MapPin, Sparkles, Send, MessageSquare, Clock, ThumbsUp, Award, Camera, Building2, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Bookmark, ExternalLink } from 'lucide-react';
import { Place, Rental, QAItem } from '../types/index';
import { PhotoLightbox } from './PhotoLightbox';
import { reviewAPI, googlePlacesAPI, aiAPI, GooglePlaceDetails } from '../services/api';

// ─── helpers ────────────────────────────────────────────────────────────────

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isOpenNow(openingHours?: Record<string, { open: string; close: string; closed?: boolean }>): boolean | null {
  if (!openingHours) return null;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const hours = openingHours[dayKey];
  if (!hours || hours.closed) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  // handle overnight (e.g. 20:00 – 02:00)
  if (closeMins < openMins) return nowMins >= openMins || nowMins < closeMins;
  return nowMins >= openMins && nowMins < closeMins;
}

function getTodayHours(openingHours?: Record<string, { open: string; close: string; closed?: boolean }>): string {
  if (!openingHours) return '';
  const dayKey = DAY_KEYS[new Date().getDay()];
  const h = openingHours[dayKey];
  if (!h) return '';
  if (h.closed) return 'Closed today';
  return `${h.open} – ${h.close}`;
}

function getPriceRange(place: Place): number | null {
  if (place.priceRange) return place.priceRange;
  const cost = place.avgCost;
  if (cost === undefined || cost === null) return null;
  if (cost === 0) return 1;
  if (cost <= 50) return 2;
  if (cost <= 150) return 3;
  return 4;
}

function renderPriceDollars(level: number): React.ReactNode {
  return (
    <span className="font-bold text-emerald-600">
      {'$'.repeat(level)}
      <span className="text-slate-300">{'$'.repeat(4 - level)}</span>
    </span>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

interface PlaceDetailModalProps {
  place: Place | Rental;
  onClose: () => void;
  t: any;
  allPlaces?: Place[];
  onSwitchPlace?: (p: Place) => void;
  mode?: 'modal' | 'page';
}

interface ClaimedPlace {
  placeId: string;
  businessName: string;
  role: string;
  email: string;
  claimedAt: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export const PlaceDetailModal = ({ place, onClose, t, allPlaces, onSwitchPlace, mode = 'modal' }: PlaceDetailModalProps) => {
  // ── existing state ──────────────────────────────────────────────────────
  const [summary, setSummary] = useState<string>('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── new state ───────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<'reviews' | 'qa' | 'info'>('reviews');

  // Helpful votes
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_helpful_votes') || '{}'); } catch { return {}; }
  });
  const [myVotes, setMyVotes] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('tripo_my_votes') || '[]')); } catch { return new Set(); }
  });

  // Owner replies
  const [ownerReplies, setOwnerReplies] = useState<Record<string, { text: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_owner_replies') || '{}'); } catch { return {}; }
  });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Q&A
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [qaQuestion, setQaQuestion] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');

  // ── Feature 1: Photo upload state ───────────────────────────────────────
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Feature 2: Claim listing state ──────────────────────────────────────
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimBusinessName, setClaimBusinessName] = useState('');
  const [claimRole, setClaimRole] = useState<'Owner' | 'Manager' | 'Marketing'>('Owner');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  // Active promo from localStorage
  const [activePromo, setActivePromo] = useState<string | null>(null);

  // ── Photo slideshow ─────────────────────────────────────────────────────
  const placePhotos: string[] = (() => {
    const p = place as any;
    const arr: string[] = [];
    if (p.photos?.length) arr.push(...p.photos);
    else if (p.image) arr.push(p.image);
    return arr;
  })();
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (placePhotos.length <= 1) return;
    const id = setInterval(() => setPhotoIdx(i => (i + 1) % placePhotos.length), 3500);
    return () => clearInterval(id);
  }, [placePhotos.length]);

  // ── Google Places data ──────────────────────────────────────────────────
  const [googleData, setGoogleData] = useState<GooglePlaceDetails | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);

  // ── derived ─────────────────────────────────────────────────────────────
  const placeName = 'title' in place ? place.title : place.name;
  const placeCatRaw = 'type' in place ? place.type : (Array.isArray(place.categoryTags) ? place.categoryTags[0] : place.categoryTags);
  const CAT_T: Record<string, string> = {
    nature: t.catNature || 'Nature', heritage: t.catHeritage || 'Heritage',
    adventure: t.catAdventure || 'Adventure', food: t.catFood || 'Food',
    urban: t.catUrban || 'Urban', beach: t.catBeach || 'Beach',
    desert: t.catDesert || 'Desert', cultural: t.catCultural || 'Cultural',
    culture: t.catCultural || 'Cultural', sports: t.interestSports || 'Sports',
    shopping: (t as any).mapCatShopping || 'Shopping',
  };
  const placeCat = placeCatRaw ? (CAT_T[placeCatRaw.toLowerCase()] || placeCatRaw) : null;
  const placePrice = 'price' in place ? place.price : place.avgCost;
  const placeLocation = 'locationName' in place ? place.locationName : 'Riyadh';
  const placeId = (place as Place)._id || (place as Place).id || '';
  const isPlace = !('title' in place);

  const asPlace = isPlace ? (place as Place) : null;
  const avgRating = asPlace?.ratingSummary?.avgRating ?? (place as any).rating ?? 0;
  const reviewCount = asPlace?.ratingSummary?.reviewCount ?? reviews.length;
  const isTravellersChoice = avgRating >= 4.5 && reviewCount >= 5;
  const openNow = isOpenNow(asPlace?.openingHours);
  const todayHours = getTodayHours(asPlace?.openingHours);
  const priceLevel = asPlace ? getPriceRange(asPlace) : null;
  const accessibility = asPlace?.accessibility;

  // Similar places
  const similarPlaces = (() => {
    if (!allPlaces || !asPlace) return [];
    const tag = asPlace.categoryTags?.[0];
    if (!tag) return [];
    return allPlaces
      .filter(p => {
        const pid = p._id || p.id;
        const currentId = placeId;
        return pid !== currentId && p.categoryTags?.includes(tag);
      })
      .sort((a, b) => (b.ratingSummary?.avgRating ?? 0) - (a.ratingSummary?.avgRating ?? 0))
      .slice(0, 4);
  })();

  // ── effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlace || !placeId || !/^[0-9a-fA-F]{24}$/.test(placeId)) return;
    reviewAPI.getReviews({ targetType: 'place', targetId: placeId })
      .then((data: any) => setReviews(Array.isArray(data) ? data : data?.reviews || []))
      .catch(() => { });
  }, [placeId, isPlace]);

  useEffect(() => {
    if (!placeId) return;
    try {
      const stored = localStorage.getItem('tripo_qa_' + placeId);
      setQaItems(stored ? JSON.parse(stored) : []);
    } catch { setQaItems([]); }
  }, [placeId]);

  // Load active promo for this place
  useEffect(() => {
    if (!placeId) return;
    try {
      const stored = localStorage.getItem(`tripo_promos_${placeId}`);
      if (stored) {
        const promos: { text: string; active: boolean }[] = JSON.parse(stored);
        const active = promos.find(p => p.active);
        setActivePromo(active ? active.text : null);
      } else {
        setActivePromo(null);
      }
    } catch { setActivePromo(null); }
  }, [placeId]);

  // Pre-fill claim business name
  useEffect(() => {
    setClaimBusinessName(placeName);
  }, [placeName]);

  // ── Fetch AI Summary (With Smart Caching & Fixed Dependencies) ──
  useEffect(() => {
    const fetchSummary = async () => {
      if (!placeId) return;

      // 1. Check cache first to save API quota
      const cacheKey = `tripo_ai_summary_${placeId}`;
      const cachedSummary = localStorage.getItem(cacheKey);

      if (cachedSummary) {
        setSummary(cachedSummary);
        setIsSummaryLoading(false);
        return; // Early exit
      }

      try {
        setIsSummaryLoading(true);
        const prompt = `Provide a concise 50-word summary of the "Google Maps" reviews and general public reputation for "${placeName}" in Riyadh. Mention what people love and any common complaints. Tone: Helpful and informative. Language: ${t.aiSummaryTitle?.includes('ملخص') ? 'Arabic' : 'English'}.`;
        const response = await aiAPI.generateContent(prompt);

        const resultText = response.text || t.aiSummaryError || 'No summary available.';
        setSummary(resultText);

        // 2. Save result to cache
        localStorage.setItem(cacheKey, resultText);

      } catch {
        setSummary(t.aiSummaryError || 'AI summary unavailable.');
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();

    // 3. Fixed dependency array (using placeId instead of the entire place object)
  }, [placeId, placeName, t.aiSummaryTitle, t.aiSummaryError]);

  // ── Fetch Google Places data ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPlace) { setGoogleLoading(false); return; }
    setGoogleLoading(true);
    const city = (place as Place).city || placeLocation;
    googlePlacesAPI.getDetails(placeName, city)
      .then(data => setGoogleData(data))
      .catch(() => setGoogleData(null))
      .finally(() => setGoogleLoading(false));
  }, [placeId, placeName]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!placeId || !reviewComment.trim() || !isPlace) return;
    setIsSubmitting(true);
    try {
      const saved = await reviewAPI.createReview({ targetType: 'place', targetId: placeId, rating: reviewRating, comment: reviewComment });
      // Save photos to localStorage
      if (reviewPhotos.length > 0) {
        const reviewId = saved._id || saved.id || Date.now().toString();
        const key = `tripo_review_photos_${placeId}`;
        let existing: { reviewId: string; photos: string[] }[] = [];
        try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch { }
        existing.push({ reviewId, photos: reviewPhotos });
        localStorage.setItem(key, JSON.stringify(existing));
      }
      setReviews(prev => [saved, ...prev]);
      setReviewComment('');
      setReviewRating(5);
      setReviewPhotos([]);
    } catch (_) { }
    setIsSubmitting(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const remaining = 3 - reviewPhotos.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        if (b64) setReviewPhotos(prev => [...prev, b64].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeReviewPhoto = (idx: number) => {
    setReviewPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const getPhotosForReview = (reviewId: string): string[] => {
    if (!placeId) return [];
    try {
      const key = `tripo_review_photos_${placeId}`;
      const stored: { reviewId: string; photos: string[] }[] = JSON.parse(localStorage.getItem(key) || '[]');
      const entry = stored.find(e => e.reviewId === reviewId);
      return entry ? entry.photos : [];
    } catch { return []; }
  };

  const handleHelpfulVote = (reviewId: string) => {
    if (myVotes.has(reviewId)) return;
    const newVotes = { ...helpfulVotes, [reviewId]: (helpfulVotes[reviewId] ?? 0) + 1 };
    const newMyVotes = new Set(myVotes);
    newMyVotes.add(reviewId);
    setHelpfulVotes(newVotes);
    setMyVotes(newMyVotes);
    localStorage.setItem('tripo_helpful_votes', JSON.stringify(newVotes));
    localStorage.setItem('tripo_my_votes', JSON.stringify([...newMyVotes]));
  };

  const handleOwnerReply = (reviewId: string) => {
    if (!replyDraft.trim()) return;
    const updated = { ...ownerReplies, [reviewId]: { text: replyDraft.trim() } };
    setOwnerReplies(updated);
    localStorage.setItem('tripo_owner_replies', JSON.stringify(updated));
    setReplyingTo(null);
    setReplyDraft('');
  };

  const handleAskQuestion = () => {
    if (!qaQuestion.trim() || !placeId) return;
    const newItem: QAItem = {
      id: Date.now().toString(),
      question: qaQuestion.trim(),
      askedBy: 'You',
      askedAt: new Date().toISOString(),
      answers: [],
    };
    const updated = [newItem, ...qaItems];
    setQaItems(updated);
    localStorage.setItem('tripo_qa_' + placeId, JSON.stringify(updated));
    setQaQuestion('');
  };

  const handleAddAnswer = (questionId: string) => {
    if (!answerDraft.trim()) return;
    const updated = qaItems.map(q => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        answers: [
          ...q.answers,
          { id: Date.now().toString(), text: answerDraft.trim(), answeredBy: 'You', answeredAt: new Date().toISOString() },
        ],
      };
    });
    setQaItems(updated);
    if (placeId) localStorage.setItem('tripo_qa_' + placeId, JSON.stringify(updated));
    setAnsweringId(null);
    setAnswerDraft('');
  };

  // Feature 2: Claim listing
  const handleSubmitClaim = () => {
    if (!claimBusinessName.trim() || !claimEmail.trim() || !placeId) return;
    const key = 'tripo_claimed_places';
    let existing: ClaimedPlace[] = [];
    try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch { }
    existing = existing.filter(c => c.placeId !== placeId);
    existing.push({
      placeId,
      businessName: claimBusinessName.trim(),
      role: claimRole,
      email: claimEmail.trim(),
      claimedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
    setClaimSubmitted(true);
  };

  // ── render ───────────────────────────────────────────────────────────────

  const [saved, setSaved] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('tripo_saved_places') || '[]') as string[]).includes(placeId); } catch { return false; }
  });

  const handleSave = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem('tripo_saved_places') || '[]');
      const updated = saved ? list.filter(id => id !== placeId) : [...list, placeId];
      localStorage.setItem('tripo_saved_places', JSON.stringify(updated));
      setSaved(!saved);
    } catch { }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: placeName, text: `Check out ${placeName} on Tripo!` }); } catch { }
    } else {
      try { await navigator.clipboard.writeText(window.location.href); } catch { }
    }
  };

  return (
    <>
      {lightboxIdx !== null && (
        <PhotoLightbox photos={placePhotos} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
      <div className={mode === 'page'
        ? "fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 overflow-y-auto"
        : "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      }>
        <div className={mode === 'page'
          ? "relative w-full max-w-2xl mx-auto min-h-full flex flex-col"
          : "bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col"
        }>

          {/* ── CINEMATIC HERO ── */}
          <div className={`${mode === 'page' ? 'h-[55vh]' : 'h-64'} w-full relative bg-slate-900 shrink-0 overflow-hidden`}>
            <img
              src={placePhotos[photoIdx] || (googleData?.photos?.[0] ? googlePlacesAPI.photoSrc(googleData.photos[0].url) : null) || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'}
              className="w-full h-full object-cover transition-opacity duration-500 cursor-zoom-in"
              alt={placeName}
              onClick={() => placePhotos.length > 0 && setLightboxIdx(photoIdx)}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'; }}
            />
            {/* Top scrim */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            {/* Bottom scrim */}
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

            {/* Back / close button */}
            <button
              onClick={onClose}
              className="absolute top-5 left-4 z-10 flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-sm font-semibold border border-white/30 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {mode === 'page' ? (t.backBtn || 'Back') : ''}
            </button>

            {/* Photo count badge */}
            {placePhotos.length > 1 && (
              <button
                onClick={() => setLightboxIdx(photoIdx)}
                className="absolute top-5 right-4 z-10 flex items-center gap-1.5 bg-black/45 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/20 hover:bg-black/60 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                {placePhotos.length}
              </button>
            )}

            {/* Title + rating overlaid on hero */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {placeCat && (
                  <span className="text-[11px] font-bold bg-emerald-500/90 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    {placeCat}
                  </span>
                )}
                {isTravellersChoice && (
                  <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-400/90 text-amber-900 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    <Award className="w-3 h-3" /> {t.travellersChoice || "Travellers' Choice"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow-lg mb-2">{placeName}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-white/90 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  {placeLocation}
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1 bg-white/15 backdrop-blur-sm text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)}
                    {reviewCount > 0 && <span className="text-white/60 font-normal text-xs">({reviewCount})</span>}
                  </span>
                )}
              </div>
            </div>

            {/* Carousel arrows */}
            {placePhotos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + placePhotos.length) % placePhotos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % placePhotos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition z-10">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-5 right-5 flex items-center gap-1.5 z-10">
                  {placePhotos.slice(0, 6).map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className="transition-all duration-300 rounded-full"
                      style={{ width: i === photoIdx ? 16 : 5, height: 5, background: i === photoIdx ? '#10b981' : 'rgba(255,255,255,0.5)' }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── ACTION PILL BAR ── */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/8 shrink-0 overflow-x-auto no-scrollbar">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(`${placeName} ${placeLocation}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <MapPin className="w-4 h-4" />
              {t.directions || 'Directions'}
            </a>
            {placePhotos.length > 0 && (
              <button
                onClick={() => setLightboxIdx(0)}
                className="flex-shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
              >
                <Camera className="w-4 h-4" />
                {t.photos || 'Photos'}
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex-shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {t.share || 'Share'}
            </button>
            <button
              onClick={handleSave}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${saved ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15'}`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
              {saved ? (t.saved || 'Saved') : (t.save || 'Save')}
            </button>
          </div>

          {/* ── INFO CHIPS STRIP ── */}
          <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/8 shrink-0">
            {avgRating > 0 && (
              <span className="flex-shrink-0 flex items-center gap-1 bg-orange-50 dark:bg-orange-500/15 border border-orange-100 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full text-xs font-bold">
                <Star className="w-3 h-3 fill-orange-500 text-orange-500" /> {avgRating.toFixed(1)}
              </span>
            )}
            {openNow === true && (
              <span className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {t.openNow || 'Open Now'}
              </span>
            )}
            {openNow === false && (
              <span className="flex-shrink-0 bg-red-50 dark:bg-red-500/15 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full text-xs font-bold">
                {t.closedStatus || 'Closed'}
              </span>
            )}
            {priceLevel && (
              <span className="flex-shrink-0 bg-slate-50 dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-bold">
                {'$'.repeat(priceLevel)}{'·'.repeat(4 - priceLevel)}
              </span>
            )}
            {placeCat && (
              <span className="flex-shrink-0 bg-slate-50 dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                {placeCat}
              </span>
            )}
            {accessibility?.wheelchair && (
              <span className="flex-shrink-0 bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                ♿ {t.accessWheelchair || 'Accessible'}
              </span>
            )}
            {accessibility?.family && (
              <span className="flex-shrink-0 bg-purple-50 dark:bg-purple-500/15 border border-purple-100 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full text-xs font-semibold">
                👨‍👩‍👧 {t.accessFamily || 'Family'}
              </span>
            )}
            {accessibility?.parking && (
              <span className="flex-shrink-0 bg-slate-50 dark:bg-white/8 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-xs font-semibold">
                🅿 {t.accessParking || 'Parking'}
              </span>
            )}
          </div>

          {/* ── SCROLLABLE BODY ── */}
          <div className={`${mode === 'page' ? 'flex-1 max-w-2xl mx-auto w-full' : 'overflow-y-auto flex-1'} bg-slate-50 dark:bg-slate-950`}>

            {/* ── PHOTO MOSAIC GRID ── */}
            {placePhotos.length >= 2 && (
              <div className="px-4 pt-4">
                <div className="grid gap-1.5 rounded-2xl overflow-hidden"
                  style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '120px 120px' }}>
                  <div className="row-span-2 overflow-hidden cursor-zoom-in" onClick={() => setLightboxIdx(0)}>
                    <img src={placePhotos[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="overflow-hidden cursor-zoom-in" onClick={() => setLightboxIdx(1)}>
                    <img src={placePhotos[1]} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="relative overflow-hidden cursor-zoom-in bg-slate-200 dark:bg-slate-800"
                    onClick={() => setLightboxIdx(Math.min(2, placePhotos.length - 1))}>
                    {placePhotos[2] && (
                      <img src={placePhotos[2]} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    {placePhotos.length > 3 && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span className="text-sm font-bold">+{placePhotos.length - 3}</span>
                        <span className="text-[10px] opacity-75">{t.seeAllPhotos || 'See all'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROMO BANNER ── */}
            {activePromo && (
              <div className="mx-4 mt-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-base">🎉</span>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{activePromo}</p>
              </div>
            )}

            {/* ── AI SUMMARY ── */}
            <div className="mx-4 mt-4 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-white/8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-blue-500 rounded-l-2xl" />
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{t.aiSummaryTitle || 'AI Summary'}</h3>
              </div>
              {isSummaryLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-5/6" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
                  <p className="text-[10px] text-slate-400 mt-3 text-right italic">{t.aiSource || 'Generated by Gemini AI'}</p>
                </>
              )}
            </div>

            {/* ── STICKY TAB BAR ── */}
            {isPlace && (
              <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/8 mt-4 shadow-sm">
                <div className="flex">
                  {(['reviews', 'info', 'qa'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveSection(tab)}
                      className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${activeSection === tab
                          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500'
                          : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                      {tab === 'reviews'
                        ? `${t.reviews || 'Reviews'}${reviews.length > 0 ? ` (${reviews.length})` : ''}`
                        : tab === 'info'
                          ? (t.infoTab || 'Info')
                          : `Q&A${qaItems.length > 0 ? ` (${qaItems.length})` : ''}`
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 pb-24 space-y-3">

              {/* ── INFO TAB ── */}
              {activeSection === 'info' && isPlace && (
                <>
                  {/* Opening hours */}
                  {asPlace?.openingHours ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.openingHours || 'Opening Hours'}</h4>
                        {openNow === true && <span className="ml-auto text-[11px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">{t.openNow || 'Open Now'}</span>}
                        {openNow === false && <span className="ml-auto text-[11px] font-bold bg-red-400 text-white px-2 py-0.5 rounded-full">{t.closedStatus || 'Closed'}</span>}
                      </div>
                      <div className="px-4 pb-4 space-y-1.5">
                        {DAY_KEYS.map((key, i) => {
                          const h = asPlace.openingHours![key];
                          const isToday = i === new Date().getDay();
                          return (
                            <div key={key} className={`flex justify-between text-xs py-1 border-b border-slate-50 dark:border-white/5 last:border-0 ${isToday ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                              <span className="flex items-center gap-1.5">
                                {isToday && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                {DAY_LABELS[i]}{isToday ? ` ${t.todayLabel || '(today)'}` : ''}
                              </span>
                              <span>{h ? (h.closed ? (t.closedStatus || 'Closed') : `${h.open} – ${h.close}`) : '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-6 text-center shadow-sm">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-white/20" />
                      <p className="text-sm text-slate-400">{t.noHoursInfo || 'Opening hours not available'}</p>
                    </div>
                  )}

                  {/* Accessibility */}
                  {accessibility && (accessibility.wheelchair || accessibility.parking || accessibility.family) && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 shadow-sm">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">{t.accessibility || 'Accessibility'}</h4>
                      <div className="space-y-2.5">
                        {[
                          { key: 'wheelchair', icon: '♿', label: t.accessWheelchair || 'Wheelchair Accessible' },
                          { key: 'parking', icon: '🅿', label: t.accessParking || 'Parking Available' },
                          { key: 'family', icon: '👨‍👩‍👧', label: t.accessFamily || 'Family-Friendly' },
                        ].map(({ key, icon, label }) => (accessibility as any)[key] && (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-lg">{icon}</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{label}</span>
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Google rating summary */}
                  {!googleLoading && googleData?.rating && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Google Rating</h4>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{googleData.rating.toFixed(1)}</span>
                        <div>
                          <div className="flex gap-0.5 mb-1">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(googleData.rating!) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-white/15'}`} />)}
                          </div>
                          {googleData.userRatingCount && <span className="text-xs text-slate-400">{googleData.userRatingCount.toLocaleString()} reviews on Google</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── REVIEWS TAB ── */}
              {(activeSection === 'reviews' || !isPlace) && (
                <>
                  {/* Write review */}
                  {isPlace && placeId && /^[0-9a-fA-F]{24}$/.test(placeId) && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-white/8 shadow-sm">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t.writeReview || 'Write a review'}</p>
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => setReviewRating(s)} className="transition-transform active:scale-90">
                            <Star className={`w-7 h-7 transition-colors ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-white/15'}`} />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                        </span>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input
                          className="flex-1 bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2.5 text-sm border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white dark:placeholder-slate-500"
                          placeholder={t.reviewPlaceholder || 'Share your experience...'}
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubmitReview()}
                        />
                        <button onClick={handleSubmitReview} disabled={!reviewComment.trim() || isSubmitting}
                          className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                      {reviewPhotos.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {reviewPhotos.map((photo, idx) => (
                            <div key={idx} className="relative w-14 h-14 flex-shrink-0">
                              <img src={photo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                              <button onClick={() => removeReviewPhoto(idx)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {reviewPhotos.length < 3 && (
                        <button onClick={() => photoInputRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                          <Camera className="w-3.5 h-3.5" />
                          {t.addPhotos || 'Add Photos'}{reviewPhotos.length > 0 ? ` (${reviewPhotos.length}/3)` : ''}
                        </button>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                    </div>
                  )}

                  {/* Review list */}
                  {reviews.length === 0 && (!googleData || googleData.reviews.length === 0) ? (
                    <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-white/15" />
                      <p className="text-sm font-medium text-slate-400">{t.noReviews || 'No reviews yet — be the first!'}</p>
                    </div>
                  ) : (
                    <>
                      {reviews.slice(0, 5).map((r: any, i) => {
                        const reviewId = r._id || String(i);
                        const voted = myVotes.has(reviewId);
                        const voteCount = helpfulVotes[reviewId] ?? 0;
                        const reply = ownerReplies[reviewId];
                        const photos = getPhotosForReview(reviewId);
                        const authorName: string = typeof r.userId === 'object' ? (r.userId?.name ?? 'User') : 'User';
                        const initials = authorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={reviewId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{authorName}</p>
                                {r.createdAt && <p className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>}
                              </div>
                              <div className="flex gap-0.5 flex-shrink-0">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-white/15'}`} />
                                ))}
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{r.comment}</p>}
                            {photos.length > 0 && (
                              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                                {photos.map((photo, idx) => (
                                  <img key={idx} src={photo} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleHelpfulVote(reviewId)} disabled={voted}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${voted ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 cursor-default' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-600'}`}>
                                <ThumbsUp className="w-3 h-3" />
                                {t.helpfulBtn || 'Helpful'}{voteCount > 0 ? ` · ${voteCount}` : ''}
                              </button>
                              {!reply && (
                                <button onClick={() => { setReplyingTo(reviewId); setReplyDraft(''); }}
                                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-auto">
                                  {t.replyAsOwner || 'Reply as Owner'}
                                </button>
                              )}
                            </div>
                            {replyingTo === reviewId && (
                              <div className="mt-3 flex gap-1.5">
                                <input
                                  className="flex-1 bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2 text-xs border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                                  placeholder={t.writeResponsePlaceholder || 'Write your response...'}
                                  value={replyDraft}
                                  onChange={e => setReplyDraft(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleOwnerReply(reviewId)}
                                  autoFocus
                                />
                                <button onClick={() => handleOwnerReply(reviewId)} disabled={!replyDraft.trim()}
                                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-40">
                                  <Send className="w-3 h-3" />
                                </button>
                                <button onClick={() => setReplyingTo(null)} className="p-2 text-slate-400 hover:text-slate-600 transition">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {reply && (
                              <div className="mt-3 ml-4 pl-3 border-l-2 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 rounded-r-xl p-2.5">
                                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">{t.ownerResponse || 'Owner Response'}</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300">{reply.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Google Reviews */}
                      {!googleLoading && googleData && googleData.reviews.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 px-1">
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Google Reviews</span>
                            {googleData.userRatingCount !== undefined && <span className="text-[10px] text-slate-400">({googleData.userRatingCount.toLocaleString()})</span>}
                            {googleData.rating !== undefined && (
                              <span className="ml-auto flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {googleData.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="space-y-3">
                            {googleData.reviews.map((r, i) => (
                              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 shadow-sm">
                                <div className="flex items-start gap-3 mb-2">
                                  <img
                                    src={r.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.author)}`}
                                    className="w-9 h-9 rounded-full bg-slate-100 object-cover flex-shrink-0 shadow-sm"
                                    alt={r.author}
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.author)}`; }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.author}</p>
                                    <p className="text-[10px] text-slate-400">{r.relativeTime}</p>
                                  </div>
                                  <div className="flex gap-0.5 flex-shrink-0">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-white/15'}`} />)}
                                  </div>
                                </div>
                                {r.text && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-4">{r.text}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Q&A TAB ── */}
              {activeSection === 'qa' && isPlace && (
                <>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-white/8 shadow-sm">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2.5 text-sm border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white dark:placeholder-slate-500"
                        placeholder={t.askQuestionPlaceholder || 'Ask a question about this place...'}
                        value={qaQuestion}
                        onChange={e => setQaQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                      />
                      <button onClick={handleAskQuestion} disabled={!qaQuestion.trim()}
                        className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {qaItems.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-white/15" />
                      <p className="text-sm font-medium text-slate-400">{t.noQuestionsYet || 'No questions yet — ask the first one!'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qaItems.map(q => (
                        <div key={q.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/8 p-4 shadow-sm">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-sm flex-shrink-0">Q</span>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{q.question}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{q.askedBy} · {new Date(q.askedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {q.answers.map(a => (
                            <div key={a.id} className="flex items-start gap-3 ml-10 mb-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xs flex-shrink-0">A</span>
                              <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl p-2.5">
                                <p className="text-xs text-slate-700 dark:text-slate-300">{a.text}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{a.answeredBy} · {new Date(a.answeredAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                          {answeringId !== q.id ? (
                            <button onClick={() => { setAnsweringId(q.id); setAnswerDraft(''); }}
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 transition ml-10">
                              {t.answerBtn || '+ Answer'}
                            </button>
                          ) : (
                            <div className="ml-10 flex gap-1.5 mt-2">
                              <input
                                className="flex-1 bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2 text-xs border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                                placeholder={t.writeAnswerPlaceholder || 'Write your answer...'}
                                value={answerDraft}
                                onChange={e => setAnswerDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddAnswer(q.id)}
                                autoFocus
                              />
                              <button onClick={() => handleAddAnswer(q.id)} disabled={!answerDraft.trim()}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-40">
                                <Send className="w-3 h-3" />
                              </button>
                              <button onClick={() => setAnsweringId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── SIMILAR PLACES ── */}
              {similarPlaces.length > 0 && (
                <div className="pt-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">{t.similarPlaces || 'Similar Places'}</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                    {similarPlaces.map(p => {
                      const pid = p._id || p.id || '';
                      return (
                        <button key={pid} onClick={() => onSwitchPlace?.(p)}
                          className="flex-shrink-0 w-40 text-left group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/8 shadow-sm active:scale-95 transition-transform">
                          <div className="h-24 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                            <img
                              src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=400&q=60'}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              alt={p.name}
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=400&q=60'; }}
                            />
                            {p.ratingSummary?.avgRating != null && (
                              <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                {p.ratingSummary.avgRating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">{p.name}</p>
                            {p.city && <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.city}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CLAIM LISTING ── */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/8 text-center">
                <button
                  onClick={() => { setShowClaimModal(true); setClaimSubmitted(false); }}
                  className="text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {t.claimListing || 'Are you the owner? Claim this listing →'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── CLAIM LISTING MODAL ── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowClaimModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            {claimSubmitted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900 dark:text-white mb-1">Claim submitted!</p>
                <p className="text-sm text-slate-500">We'll verify within 48 hours.</p>
                <button onClick={() => setShowClaimModal(false)}
                  className="mt-5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Claim Listing</h3>
                  <button onClick={() => setShowClaimModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Business Name</label>
                    <input className="w-full bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2.5 text-sm border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                      value={claimBusinessName} onChange={e => setClaimBusinessName(e.target.value)} placeholder="Enter business name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Your Role</label>
                    <div className="flex gap-2">
                      {(['Owner', 'Manager', 'Marketing'] as const).map(r => (
                        <button key={r} onClick={() => setClaimRole(r)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${claimRole === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-white/8 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-400'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Contact Email</label>
                    <input type="email" className="w-full bg-slate-50 dark:bg-white/8 rounded-xl px-3 py-2.5 text-sm border border-slate-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                      value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <button onClick={handleSubmitClaim} disabled={!claimBusinessName.trim() || !claimEmail.trim()}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
                    Submit Claim
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};