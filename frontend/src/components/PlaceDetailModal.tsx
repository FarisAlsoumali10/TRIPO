import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Star, MapPin, Sparkles, Send, MessageSquare, Clock, ThumbsUp, Award, Camera, Building2, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Bookmark, ExternalLink, FolderPlus, Plus, CheckCheck, Navigation } from 'lucide-react';
import { Skeleton, SafeImage } from './ui';
import { Place, Rental, QAItem } from '../types/index';
import { PhotoLightbox } from './PhotoLightbox';
import { reviewAPI, googlePlacesAPI, aiAPI, GooglePlaceDetails } from '../services/api';
import { useWeather } from '../hooks/useWeather';

import { isOpenNow, getTodayHours, getPriceRange, DAY_KEYS, DAY_LABELS } from '../utils/placeHelpers';

function renderPriceDollars(level: number): React.ReactNode {
  return (
    <span className="font-black text-oasis-spring tracking-widest">
      {'$'.repeat(level)}
      <span className="text-white/10">{'$'.repeat(4 - level)}</span>
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
  lang?: 'en' | 'ar';
  isSaved?: boolean;
  onToggleSave?: (e: React.MouseEvent) => void;
  onOpenAddToTrip?: (e: React.MouseEvent) => void;
}

const RATING_CATS = ['Atmosphere', 'Value', 'Service', 'Location'] as const;
type RatingCatType = typeof RATING_CATS[number];

interface ClaimedPlace {
  placeId: string;
  businessName: string;
  role: string;
  email: string;
  claimedAt: string;
}

interface ModalTrip { id: string; name: string; placeIds: string[] }

// ─── component ───────────────────────────────────────────────────────────────

export const PlaceDetailModal = ({
  place,
  onClose,
  t,
  allPlaces,
  onSwitchPlace,
  mode = 'modal',
  lang,
  isSaved,
  onToggleSave,
  onOpenAddToTrip
}: PlaceDetailModalProps) => {
  const ar = lang === 'ar';
  const isRTL = ar;

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

  // ── Feature 13: Contributed photos ─────────────────────────────────────────
  const _pid0 = (place as Place)._id || (place as Place).id || '';
  const [contributedPhotos, setContributedPhotos] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`tripo_contributed_photos_${_pid0}`) || '[]') as string[]; } catch { return []; }
  });
  const photoContribRef = useRef<HTMLInputElement>(null);

  const handleContribPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pid = (place as Place)._id || (place as Place).id || '';
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const b64 = ev.target?.result as string;
        if (!b64) return;
        setContributedPhotos(prev => {
          const updated = [...prev, b64].slice(0, 10);
          try { localStorage.setItem(`tripo_contributed_photos_${pid}`, JSON.stringify(updated)); } catch { }
          return updated;
        });
      };
      reader.readAsDataURL(file as File);
    });
    e.target.value = '';
  };

  // ── Feature 14: Rating breakdown ────────────────────────────────────────────
  const [reviewBreakdown, setReviewBreakdown] = useState<Partial<Record<RatingCatType, number>>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);

  const placeCity = (place as any).city || (place as any).locationName || '';
  const { weather, loading: weatherLoading } = useWeather(placeCity);

  const breakdownAggregate = useMemo(() => {
    const pid = (place as Place)._id || (place as Place).id || '';
    if (!pid) return null;
    try {
      const stored = JSON.parse(localStorage.getItem(`tripo_rating_breakdown_${pid}`) || '[]') as { breakdown: Partial<Record<RatingCatType, number>> }[];
      if (!stored.length) return null;
      const agg: Partial<Record<RatingCatType, number>> = {};
      for (const cat of RATING_CATS) {
        const vals = stored.map(s => s.breakdown[cat]).filter((v): v is number => v !== undefined);
        if (vals.length) agg[cat] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
      }
      return Object.keys(agg).length > 0 ? agg : null;
    } catch { return null; }
  }, [place, reviews.length]);

  const saveBreakdown = (breakdown: Partial<Record<RatingCatType, number>>) => {
    const pid = (place as Place)._id || (place as Place).id || '';
    if (!pid || Object.keys(breakdown).length === 0) return;
    try {
      const key = `tripo_rating_breakdown_${pid}`;
      const stored: { breakdown: Partial<Record<RatingCatType, number>> }[] = JSON.parse(localStorage.getItem(key) || '[]');
      stored.push({ breakdown });
      localStorage.setItem(key, JSON.stringify(stored));
    } catch { }
  };

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

  // ── Directions state ──────────────────────────────────────────────────────
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const [showMapChoice, setShowMapChoice] = useState(false);

  // Coordinates for this place
  const placeCoords = useMemo(() => {
    const p = place as Place;
    const lat = p.coordinates?.lat ?? p.lat ?? (place as any).y ?? null;
    const lng = p.coordinates?.lng ?? p.lng ?? (place as any).x ?? null;
    return (lat !== null && lng !== null) ? { lat: Number(lat), lng: Number(lng) } : null;
  }, [place]);

  // Haversine distance
  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Auto-detect user position for distance
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        if (placeCoords) {
          const km = haversineKm(lat, lng, placeCoords.lat, placeCoords.lng);
          setDistanceText(km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`);
        }
      },
      () => { }, // silent fail
      { timeout: 5000, maximumAge: 60000 }
    );
  }, [placeCoords]);

  // Build map URLs
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function getGoogleMapsUrl() {
    if (placeCoords) {
      return `https://www.google.com/maps/dir/?api=1&destination=${placeCoords.lat},${placeCoords.lng}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName} ${placeLocation}`)}`;
  }

  function getAppleMapsUrl() {
    if (placeCoords) {
      return `maps://?daddr=${placeCoords.lat},${placeCoords.lng}&dirflg=d`;
    }
    return `maps://?q=${encodeURIComponent(`${placeName} ${placeLocation}`)}`;
  }

  function getWazeUrl() {
    if (placeCoords) {
      return `https://waze.com/ul?ll=${placeCoords.lat},${placeCoords.lng}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(`${placeName} ${placeLocation}`)}`;
  }

  function handleDirectionsClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowMapChoice(v => !v);
  }

  // Close map picker on outside click
  useEffect(() => {
    if (!showMapChoice) return;
    const close = () => setShowMapChoice(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showMapChoice]);
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
      // Save rating breakdown (Feature 14)
      saveBreakdown(reviewBreakdown);
      setReviewComment('');
      setReviewRating(5);
      setReviewBreakdown({});
      setShowBreakdown(false);
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

  // Add to Trip
  const [showTripPanel, setShowTripPanel] = useState(false);
  const [trips, setTrips] = useState<ModalTrip[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_custom_trips') || '[]'); } catch { return []; }
  });
  const [newTripName, setNewTripName] = useState('');
  const [addingNewTrip, setAddingNewTrip] = useState(false);

  const addToTrip = (tripId: string) => {
    const updated = trips.map(t =>
      t.id === tripId && !t.placeIds.includes(placeId)
        ? { ...t, placeIds: [...t.placeIds, placeId] }
        : t
    );
    localStorage.setItem('tripo_custom_trips', JSON.stringify(updated));
    setTrips(updated);
    setShowTripPanel(false);
  };

  const createAndAddTrip = () => {
    if (!newTripName.trim() || !placeId) return;
    const newTrip: ModalTrip = { id: Date.now().toString(), name: newTripName.trim(), placeIds: [placeId] };
    const updated = [...trips, newTrip];
    localStorage.setItem('tripo_custom_trips', JSON.stringify(updated));
    setTrips(updated);
    setNewTripName('');
    setAddingNewTrip(false);
    setShowTripPanel(false);
  };

  const handleSave = (e: React.MouseEvent) => {
    if (onToggleSave) {
      onToggleSave(e);
      return;
    }
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
      <div
        className={mode === 'page'
          ? "fixed inset-0 z-[100] bg-midnight overflow-y-auto"
          : "fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
        }
        onClick={mode === 'modal' ? onClose : undefined}
      >
        <div
          className={mode === 'page'
            ? "relative w-full max-w-2xl mx-auto min-h-full flex flex-col bg-midnight"
            : "bg-chamber w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col border border-white/5"
          }
          onClick={mode === 'modal' ? (e) => e.stopPropagation() : undefined}
        >

          {/* ── CINEMATIC HERO ── */}
          <div className={`${mode === 'page' ? 'h-[55vh]' : 'h-64'} w-full relative bg-slate-900 shrink-0 overflow-hidden`}>
            <SafeImage
              src={placePhotos[photoIdx] || (googleData?.photos?.[0] ? googlePlacesAPI.photoSrc(googleData.photos[0].url) : null)}
              className="w-full h-full object-cover transition-opacity duration-500 cursor-zoom-in"
              alt={placeName}
              onClick={() => placePhotos.length > 0 && setLightboxIdx(photoIdx)}
              fallbackType="placeholder"
              seed={placeId}
            />
            {/* Top scrim */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
            {/* Bottom scrim */}
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

            {/* Back / close button */}
            <button 
              onClick={onClose}
              className="absolute top-5 start-4 z-10 flex items-center gap-2 bg-midnight/40 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-midnight/60 transition-all active:scale-95"
            >
              <ArrowLeft className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              {mode === 'page' ? (t.backBtn || 'Back') : ''}
            </button>

            {/* Photo count badge */}
            {placePhotos.length > 1 && (
              <button
                onClick={() => setLightboxIdx(photoIdx)}
                className="absolute top-5 end-4 z-10 flex items-center gap-1.5 bg-midnight/40 backdrop-blur-md text-white px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-midnight/60 transition shadow-lg"
              >
                <Camera className="w-3.5 h-3.5 text-oasis-spring" />
                {placePhotos.length}
              </button>
            )}

            {/* Title + rating overlaid on hero */}
            <div className="absolute bottom-0 start-0 end-0 p-6 z-10">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {placeCat && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-oasis-spring text-midnight px-3 py-1 rounded-xl shadow-mint-glow">
                    {placeCat}
                  </span>
                )}
                {isTravellersChoice && (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-karam text-midnight px-3 py-1 rounded-xl shadow-xl">
                    <Award className="w-3.5 h-3.5" /> {t.travellersChoice || "Travellers' Choice"}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-2xl mb-3 uppercase">{placeName}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-moon text-[11px] font-black uppercase tracking-widest">
                  <MapPin className="w-4 h-4 text-oasis-spring" />
                  {placeLocation}
                </span>
                {avgRating > 0 && (
                  <span className="flex items-center gap-2 bg-midnight/60 backdrop-blur-xl text-white text-[11px] font-black px-3 py-1.5 rounded-2xl border border-white/10 shadow-2xl">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {avgRating.toFixed(1)}
                    {reviewCount > 0 && <span className="text-moon/40 ml-1">({reviewCount})</span>}
                  </span>
                )}
              </div>
            </div>

            {/* Carousel arrows */}
            {placePhotos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + placePhotos.length) % placePhotos.length)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-midnight/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-midnight transition z-10 border border-white/10 shadow-2xl">
                  <ChevronLeft className={`w-6 h-6 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % placePhotos.length)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-midnight/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-midnight transition z-10 border border-white/10 shadow-2xl">
                  <ChevronRight className={`w-6 h-6 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
                <div className="absolute bottom-6 end-6 flex items-center gap-2 z-10">
                  {placePhotos.slice(0, 6).map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)}
                      className="transition-all duration-500 rounded-full"
                      style={{ width: i === photoIdx ? 24 : 6, height: 6, background: i === photoIdx ? '#7CF7C8' : 'rgba(255,255,255,0.2)' }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── ACTION PILL BAR ── */}
          <div className="flex items-center gap-3 px-4 py-4 bg-chamber border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar relative">
            {/* Directions button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={handleDirectionsClick}
                className="flex items-center gap-2 bg-oasis-spring text-midnight px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-mint-glow active:scale-95"
              >
                <Navigation className="w-4 h-4" />
                {t.directions || 'الاتجاهات'}
                {distanceText && (
                  <span className="bg-midnight/10 px-2 py-0.5 rounded-lg text-[9px] font-black ms-2">
                    {distanceText}
                  </span>
                )}
              </button>

              {/* Map app picker */}
              {showMapChoice && (
                <div className="absolute top-full mt-4 start-0 z-50 bg-lifted/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden w-64 animate-in fade-in slide-in-from-top-4 duration-300" onClick={e => e.stopPropagation()}>
                  <p className="text-[10px] font-black text-moon/40 px-5 pt-4 pb-1 uppercase tracking-[0.2em]">{isRTL ? 'افتح في' : 'OPEN IN'}</p>

                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapChoice(false)}
                    className="flex items-center gap-4 px-5 py-5 hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <div className="w-11 h-11 bg-chamber rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">🗺️</div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Google Maps</p>
                      {placeCoords && <p className="text-[10px] text-moon/50 font-black mt-1 uppercase tracking-tighter">{isRTL ? 'إحداثيات دقيقة' : 'PRECISE COORDS'}</p>}
                    </div>
                  </a>

                  {isIOS && (
                    <a
                      href={getAppleMapsUrl()}
                      onClick={() => setShowMapChoice(false)}
                      className="flex items-center gap-4 px-5 py-5 hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="w-11 h-11 bg-chamber rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">🍎</div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-widest">Apple Maps</p>
                        <p className="text-[10px] text-moon/50 font-black mt-1 uppercase tracking-tighter">{isRTL ? 'خرائط آبل' : 'APPLE MAPS'}</p>
                      </div>
                    </a>
                  )}

                  <a
                    href={getWazeUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMapChoice(false)}
                    className="flex items-center gap-4 px-5 py-5 hover:bg-white/5 transition-colors"
                  >
                    <div className="w-11 h-11 bg-chamber rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/5">🚗</div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Waze</p>
                      <p className="text-[10px] text-moon/50 font-black mt-1 uppercase tracking-tighter">{isRTL ? 'تجنب الازدحام' : 'AVOID TRAFFIC'}</p>
                    </div>
                  </a>

                  {distanceText && userPos && (
                    <div className="px-5 py-4 bg-oasis-spring/10 border-t border-white/10">
                      <p className="text-[11px] text-oasis-spring font-black flex items-center gap-2 uppercase tracking-tight">
                        <MapPin className="w-4 h-4" /> {distanceText} {isRTL ? 'منك' : 'FROM YOU'}
                        {placeCoords && <span className="text-moon/60 font-bold ms-1">
                          (~{Math.round(haversineKm(userPos.lat, userPos.lng, placeCoords.lat, placeCoords.lng) / 50 * 60)} MIN)
                        </span>}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {placePhotos.length > 0 && (
              <button
                onClick={() => setLightboxIdx(0)}
                className="flex-shrink-0 flex items-center gap-2 bg-lifted text-white px-5 py-2.5 rounded-2xl text-[11px] font-black border border-white/10 hover:bg-white/15 transition-all uppercase tracking-widest"
              >
                <Camera className="w-4 h-4 text-oasis-spring" />
                {t.photos || 'Photos'}
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex-shrink-0 flex items-center gap-2 bg-lifted text-white px-5 py-2.5 rounded-2xl text-[11px] font-black border border-white/10 hover:bg-white/15 transition-all uppercase tracking-widest"
            >
              <ExternalLink className="w-4 h-4 text-moon" />
              {t.share || 'Share'}
            </button>
            <button
              onClick={handleSave}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black border uppercase tracking-widest transition-all ${(isSaved ?? saved) ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-lifted text-white border-white/10 hover:bg-white/15'}`}
            >
              <Bookmark className={`w-4 h-4 ${(isSaved ?? saved) ? 'fill-rose-500' : ''}`} />
              {(isSaved ?? saved) ? (t.saved || 'Saved') : (t.save || 'Save')}
            </button>
            {isPlace && placeId && (
              <button
                onClick={(e) => {
                  if (onOpenAddToTrip) {
                    onOpenAddToTrip(e);
                  } else {
                    setShowTripPanel(v => !v);
                    setAddingNewTrip(trips.length === 0);
                  }
                }}
                className="flex-shrink-0 flex items-center gap-2 bg-lifted text-white px-5 py-2.5 rounded-2xl text-[11px] font-black border border-white/10 hover:bg-white/15 transition-all uppercase tracking-widest"
              >
                <FolderPlus className="w-4 h-4" />
                {t.addToTrip || (lang === 'ar' ? 'أضف للرحلة' : 'Add to Trip')}
              </button>
            )}
          </div>

          {/* Trip panel */}
          {showTripPanel && isPlace && (
            <div className="px-4 pb-3 bg-chamber border-b border-white/5">
              <div className="bg-lifted rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-moon uppercase tracking-widest">Add to a Trip</p>
                  <button onClick={() => setShowTripPanel(false)}><X className="w-4 h-4 text-dusk hover:text-white transition-colors" /></button>
                </div>
                {trips.length > 0 && !addingNewTrip && (
                  <div className="space-y-2 mb-3">
                    {trips.map(trip => {
                      const alreadyIn = trip.placeIds.includes(placeId);
                      return (
                        <button key={trip.id} onClick={() => !alreadyIn && addToTrip(trip.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-xs transition-all ${alreadyIn ? 'border-oasis-spring/30 bg-oasis-spring/5 cursor-default' : 'border-white/5 hover:border-oasis-spring/40 hover:bg-white/5 bg-chamber'}`}>
                          <span className="font-black text-white">{trip.name}</span>
                          {alreadyIn
                            ? <CheckCheck className="w-4 h-4 text-oasis-spring" />
                            : <Plus className="w-4 h-4 text-dusk" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {addingNewTrip ? (
                  <div className="flex gap-2">
                    <input autoFocus value={newTripName} onChange={e => setNewTripName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createAndAddTrip()}
                      placeholder="Trip name…"
                      className="flex-1 px-4 py-2.5 bg-chamber border border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-dusk" />
                    {trips.length > 0 && <button onClick={() => setAddingNewTrip(false)} className="px-2 py-2 text-[10px] font-black uppercase tracking-widest text-dusk hover:text-white">Cancel</button>}
                    <button onClick={createAndAddTrip} disabled={!newTripName.trim()}
                      className="px-4 py-2.5 bg-oasis-spring text-midnight rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 shadow-mint-glow">
                      Add
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingNewTrip(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-dusk hover:border-oasis-spring hover:text-oasis-spring transition-all">
                    <Plus className="w-4 h-4" /> New Trip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── INFO CHIPS STRIP ── */}
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-midnight border-b border-white/5 shrink-0">
            {/* Weather Chip */}
            {placeCity && (
              <span className="flex-shrink-0 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                {weatherLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : weather ? (
                  <>
                    <span className="animate-weather-sway">{weather.emoji}</span>
                    <span>{weather.temp}°</span>
                  </>
                ) : (
                  <>☀️ 28°</>
                )}
              </span>
            )}

            {avgRating > 0 && (
              <span className="flex-shrink-0 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                <Star className="w-3.5 h-3.5 fill-amber-500" /> {avgRating.toFixed(1)}
              </span>
            )}
            {openNow === true && (
              <span className="flex-shrink-0 flex items-center gap-2 bg-oasis-spring/10 border border-oasis-spring/20 text-oasis-spring px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-oasis-spring/5">
                <div className="w-2 h-2 bg-oasis-spring rounded-full animate-pulse shadow-mint-glow" />
                {t.openNow || 'Open Now'}
              </span>
            )}
            {openNow === false && (
              <span className="flex-shrink-0 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                {t.closedStatus || 'Closed'}
              </span>
            )}
            {priceLevel && (
              <span className="flex-shrink-0 bg-lifted border border-white/5 text-moon px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                {'$'.repeat(priceLevel)}{'·'.repeat(4 - priceLevel)}
              </span>
            )}
            {accessibility?.wheelchair && (
              <span className="flex-shrink-0 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                ♿ {t.accessWheelchair || 'Accessible'}
              </span>
            )}
            {accessibility?.family && (
              <span className="flex-shrink-0 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                👨‍👩‍👧 {t.accessFamily || 'Family'}
              </span>
            )}
          </div>

          {/* ── SCROLLABLE BODY ── */}
          <div className={`${mode === 'page' ? 'flex-1 max-w-2xl mx-auto w-full' : 'overflow-y-auto flex-1'} bg-midnight`}>

            {/* ── PHOTO MOSAIC GRID ── */}
            {placePhotos.length >= 2 && (
              <div className="px-4 pt-4">
                <div className="grid gap-2 rounded-3xl overflow-hidden shadow-2xl border border-white/5"
                  style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '140px 140px' }}>
                  <div className="row-span-2 overflow-hidden cursor-zoom-in group" onClick={() => setLightboxIdx(0)}>
                    <SafeImage src={placePhotos[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                      fallbackType="placeholder" seed={`${placeId}-0`} />
                  </div>
                  <div className="overflow-hidden cursor-zoom-in group" onClick={() => setLightboxIdx(1)}>
                    <SafeImage src={placePhotos[1]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                      fallbackType="placeholder" seed={`${placeId}-1`} />
                  </div>
                  <div className="relative overflow-hidden cursor-zoom-in bg-chamber group"
                    onClick={() => setLightboxIdx(Math.min(2, placePhotos.length - 1))}>
                    {placePhotos[2] && (
                      <SafeImage src={placePhotos[2]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                        fallbackType="placeholder" seed={`${placeId}-2`} />
                    )}
                    {placePhotos.length > 3 && (
                      <div className="absolute inset-0 bg-midnight/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 mb-1 text-oasis-spring" />
                        <span className="text-base font-black">+{placePhotos.length - 3}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-moon">{t.seeAllPhotos || 'See all'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Feature 13: Community photo contribution ── */}
            {isPlace && (
              <div className="mx-4 mt-4">
                <input ref={photoContribRef} type="file" accept="image/*" multiple className="hidden" onChange={handleContribPhoto} />
                {contributedPhotos.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[10px] font-black text-moon/40 uppercase tracking-widest">{isRTL ? 'صورك' : 'Your Photos'} ({contributedPhotos.length})</p>
                      <button onClick={() => photoContribRef.current?.click()}
                        className="text-[10px] text-oasis-spring font-black uppercase tracking-widest hover:underline transition-all flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> {isRTL ? 'إضافة المزيد' : 'Add more'}
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {contributedPhotos.map((src, i) => (
                        <div key={i} className="relative flex-shrink-0 group">
                          <SafeImage src={src} alt="" className="w-24 h-24 rounded-2xl object-cover border border-white/5 shadow-lg group-hover:scale-105 transition-transform" />
                          <button
                            onClick={() => setContributedPhotos(prev => {
                              const updated = prev.filter((_, j) => j !== i);
                              try { localStorage.setItem(`tripo_contributed_photos_${placeId}`, JSON.stringify(updated)); } catch { }
                              return updated;
                            })}
                            className="absolute -top-2 -end-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-midnight hover:scale-110 transition-transform">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => photoContribRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 border border-dashed border-white/10 rounded-2xl py-5 text-[10px] font-black uppercase tracking-widest text-moon/20 hover:border-oasis-spring/40 hover:text-oasis-spring transition-all group bg-chamber/50"
                  >
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform text-oasis-spring" />
                    {isRTL ? 'شارك صورك لهذا المكان' : 'Contribute Photos to this Place'}
                  </button>
                )}
              </div>
            )}

            {/* ── PROMO BANNER ── */}
            {activePromo && (
              <div className="mx-4 mt-4 bg-oasis-spring/10 border border-oasis-spring/20 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-mint-glow animate-pulse">
                <span className="text-xl">🎉</span>
                <p className="text-sm font-black text-oasis-spring uppercase tracking-wide leading-tight">{activePromo}</p>
              </div>
            )}

            {/* ── AI SUMMARY ── */}
            <div className="mx-4 mt-6 bg-chamber rounded-[2.5rem] p-6 border border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 start-0 w-2 h-full bg-gradient-to-b from-oasis-spring to-blue-500 shadow-mint-glow" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-oasis-spring/10 rounded-xl border border-oasis-spring/20">
                  <Sparkles className="w-5 h-5 text-oasis-spring" />
                </div>
                <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-white">{t.aiSummaryTitle || 'AI Summary'}</h3>
              </div>
              {isSummaryLoading ? (
                <div className="space-y-3 animate-pulse px-2">
                  <div className="h-3 bg-white/5 rounded-full w-3/4" />
                  <div className="h-3 bg-white/5 rounded-full w-full" />
                  <div className="h-3 bg-white/5 rounded-full w-5/6" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-moon/80 leading-relaxed font-bold px-1">{summary}</p>
                  <p className="text-[10px] text-moon/20 mt-6 text-end italic font-black uppercase tracking-widest">{t.aiSource || 'Generated by Gemini AI'}</p>
                </>
              )}
            </div>

            {/* ── STICKY TAB BAR ── */}
            {isPlace && (
              <div className="sticky top-0 z-20 bg-midnight/80 backdrop-blur-2xl border-b border-white/5 mt-8 shadow-2xl">
                <div className="flex px-4">
                  {(['reviews', 'info', 'qa'] as const).map(tab => (
                    <div key={tab} className="flex-1 relative">
                      <button
                        onClick={() => setActiveSection(tab)}
                        className={`w-full py-5 text-[11px] font-black uppercase tracking-widest transition-all ${activeSection === tab
                          ? 'text-oasis-spring'
                          : 'text-moon/30 hover:text-white'
                          }`}
                      >
                        {tab === 'reviews'
                          ? `${t.reviews || 'Reviews'}${reviews.length > 0 ? ` (${reviews.length})` : ''}`
                          : tab === 'info'
                            ? (t.infoTab || 'Info')
                            : `Q&A${qaItems.length > 0 ? ` (${qaItems.length})` : ''}`
                        }
                      </button>
                      {activeSection === tab && (
                        <div className="absolute bottom-0 start-1/2 -translate-x-1/2 w-10 h-1.5 bg-oasis-spring rounded-full shadow-mint-glow" />
                      )}
                    </div>
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
                    <div className="bg-chamber rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
                        <div className="p-2.5 bg-lifted rounded-2xl border border-white/5 shadow-xl">
                          <Clock className="w-5 h-5 text-oasis-spring" />
                        </div>
                        <h4 className="font-black text-[11px] uppercase tracking-widest text-white">{t.openingHours || 'Opening Hours'}</h4>
                        {openNow === true && <span className="ms-auto text-[10px] font-black uppercase bg-oasis-spring text-midnight px-3 py-1.5 rounded-xl shadow-mint-glow">{t.openNow || 'Open Now'}</span>}
                        {openNow === false && <span className="ms-auto text-[10px] font-black uppercase bg-red-500 text-white px-3 py-1.5 rounded-xl shadow-xl">{t.closedStatus || 'Closed'}</span>}
                      </div>
                      <div className="px-5 pb-5 space-y-2.5">
                        {DAY_KEYS.map((key, i) => {
                          const h = asPlace.openingHours![key];
                          const isToday = i === new Date().getDay();
                          return (
                            <div key={key} className={`flex justify-between text-xs py-2 border-b border-white/5 last:border-0 ${isToday ? 'font-black text-white' : 'text-moon font-bold'}`}>
                              <span className="flex items-center gap-2">
                                {isToday && <span className="w-1.5 h-1.5 bg-oasis-spring rounded-full shadow-mint-glow" />}
                                {DAY_LABELS[i]}{isToday ? ` ${t.todayLabel || '(today)'}` : ''}
                              </span>
                              <span>{h ? (h.closed ? (t.closedStatus || 'Closed') : `${h.open} – ${h.close}`) : '—'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-chamber rounded-[2rem] border border-white/5 p-8 text-center shadow-2xl">
                      <Clock className="w-10 h-10 mx-auto mb-3 text-dusk opacity-20" />
                      <p className="text-sm text-moon font-bold">{t.noHoursInfo || 'Opening hours not available'}</p>
                    </div>
                  )}

                  {/* Accessibility */}
                  {accessibility && (accessibility.wheelchair || accessibility.parking || accessibility.family) && (
                    <div className="bg-chamber rounded-[2rem] border border-white/5 p-6 shadow-2xl">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-white mb-4">{t.accessibility || 'Accessibility'}</h4>
                      <div className="space-y-4">
                        {[
                          { key: 'wheelchair', icon: '♿', label: t.accessWheelchair || 'Wheelchair Accessible' },
                          { key: 'parking', icon: '🅿', label: t.accessParking || 'Parking Available' },
                          { key: 'family', icon: '👨‍👩‍👧', label: t.accessFamily || 'Family-Friendly' },
                        ].map(({ key, icon, label }) => (accessibility as any)[key] && (
                          <div key={key} className="flex items-center gap-4">
                            <span className="text-xl">{icon}</span>
                            <span className="text-sm text-moon font-bold flex-1">{label}</span>
                            <div className="bg-oasis-spring/10 p-1 rounded-full shadow-mint-glow">
                              <CheckCheck className="w-4 h-4 text-oasis-spring" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Google rating summary */}
                  {!googleLoading && googleData?.rating && (
                    <div className="bg-chamber rounded-[2rem] border border-white/5 p-6 shadow-2xl">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1 shadow-lg">
                          <SafeImage src="https://www.google.com/favicon.ico" alt="Google" className="w-full h-full" fallbackType="icon" />
                        </div>
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-white">Google Rating</h4>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-5xl font-black text-white">{googleData.rating.toFixed(1)}</span>
                        <div>
                          <div className="flex gap-1 mb-1.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-5 h-5 ${s <= Math.round(googleData.rating!) ? 'fill-karam text-karam' : 'text-white/10'}`} />)}
                          </div>
                          {googleData.userRatingCount && <span className="text-[10px] font-black uppercase tracking-widest text-moon">{googleData.userRatingCount.toLocaleString()} reviews on Google</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* ── Feature 16: Nearby places ── */}
                  {allPlaces && asPlace?.city && (() => {
                    const nearby = allPlaces
                      .filter(p => {
                        const pid = p._id || p.id;
                        return pid !== placeId && p.city?.toLowerCase() === asPlace.city?.toLowerCase();
                      })
                      .slice(0, 6);
                    if (!nearby.length) return null;
                    return (
                      <div className="bg-chamber rounded-[2rem] border border-white/5 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-[10px] uppercase tracking-widest text-white">Nearby in {asPlace.city}</h4>
                          <a
                            href={`https://www.google.com/maps/search/attractions+near+${encodeURIComponent(asPlace.city || '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-black uppercase tracking-widest text-oasis-spring hover:underline transition-all flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Maps
                          </a>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                          {nearby.map(p => {
                            const pid = p._id || p.id || '';
                            const img = p.photos?.[0] || p.image;
                            return (
                              <button key={pid} onClick={() => onSwitchPlace?.(p)}
                                className="flex-shrink-0 w-28 text-left group bg-lifted rounded-xl overflow-hidden border border-white/5 shadow-lg active:scale-95 transition-all">
                                <div className="h-16 overflow-hidden bg-midnight">
                                    <SafeImage src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                      fallbackType="placeholder" seed={pid} />
                                </div>
                                <div className="p-2">
                                  <p className="text-[10px] font-black text-white line-clamp-2 leading-tight">{p.name}</p>
                                  {p.categoryTags?.[0] && (
                                    <p className="text-[9px] text-dusk font-bold uppercase mt-0.5">{p.categoryTags[0]}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* ── REVIEWS TAB ── */}
              {(activeSection === 'reviews' || !isPlace) && (
                <>
                  {/* Write review */}
                  {isPlace && placeId && /^[0-9a-fA-F]{24}$/.test(placeId) && (
                    <div className="bg-chamber rounded-[2rem] p-6 border border-white/5 shadow-2xl">
                      <p className="text-[10px] font-black text-dusk uppercase tracking-widest mb-4">{t.writeReview || 'Write a review'}</p>
                      <div className="flex items-center gap-1.5 mb-5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} onClick={() => setReviewRating(s)} className="transition-all active:scale-90 hover:scale-110">
                            <Star className={`w-8 h-8 transition-colors ${s <= reviewRating ? 'fill-karam text-karam shadow-xl' : 'text-white/10'}`} />
                          </button>
                        ))}
                        <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-oasis-spring">
                          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                        </span>
                      </div>
                      <div className="flex gap-3 mb-3">
                        <input
                          className="flex-1 bg-lifted rounded-2xl px-5 py-3.5 text-sm font-bold border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-dusk shadow-inner"
                          placeholder={t.reviewPlaceholder || 'Share your experience...'}
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubmitReview()}
                        />
                        <button onClick={handleSubmitReview} disabled={!reviewComment.trim() || isSubmitting}
                          className="p-3.5 bg-oasis-spring text-midnight rounded-2xl hover:scale-105 transition-all disabled:opacity-50 shadow-mint-glow">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                      {reviewPhotos.length > 0 && (
                        <div className="flex gap-3 mb-3 flex-wrap">
                          {reviewPhotos.map((photo, idx) => (
                            <div key={idx} className="relative w-16 h-16 flex-shrink-0 group">
                              <SafeImage src={photo} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-lg" fallbackType="placeholder" />
                              <button onClick={() => removeReviewPhoto(idx)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-midnight hover:scale-110 transition-transform">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Feature 14: Breakdown toggle */}
                      <div className="flex items-center gap-3">
                        {reviewPhotos.length < 3 && (
                          <button onClick={() => photoInputRef.current?.click()}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-dusk hover:text-oasis-spring transition-colors">
                            <Camera className="w-4 h-4" />
                            {t.addPhotos || 'Add Photos'}{reviewPhotos.length > 0 ? ` (${reviewPhotos.length}/3)` : ''}
                          </button>
                        )}
                        <button onClick={() => setShowBreakdown(v => !v)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-dusk hover:text-oasis-spring transition-colors ml-auto">
                          <Star className="w-4 h-4" />
                          {showBreakdown ? 'Hide breakdown' : 'Rate by category'}
                        </button>
                      </div>

                      {/* Feature 14: Category rating breakdown */}
                      {showBreakdown && (
                        <div className="mt-4 space-y-3 bg-lifted rounded-2xl p-4 border border-white/5 shadow-inner">
                          <p className="text-[10px] font-black text-dusk uppercase tracking-widest">Rate by Category</p>
                          {RATING_CATS.map(cat => (
                            <div key={cat} className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-moon w-20 flex-shrink-0">{cat}</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <button key={n} type="button"
                                    onClick={() => setReviewBreakdown(prev => ({ ...prev, [cat]: n }))}
                                    className="transition-all active:scale-90 hover:scale-110 focus:outline-none">
                                    <Star className={`w-6 h-6 transition-colors ${n <= (reviewBreakdown[cat] ?? 0) ? 'fill-karam text-karam' : 'text-white/10'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                    </div>
                  )}

                  {/* Feature 14: Breakdown aggregate */}
                  {breakdownAggregate && (
                    <div className="bg-chamber rounded-[2rem] border border-white/5 p-6 shadow-2xl">
                      <p className="text-[10px] font-black text-dusk uppercase tracking-widest mb-4">Rating Breakdown</p>
                      <div className="space-y-4">
                        {RATING_CATS.filter(c => breakdownAggregate[c] != null).map(cat => {
                          const val = breakdownAggregate[cat]!;
                          return (
                            <div key={cat} className="flex items-center gap-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-moon w-24 flex-shrink-0">{cat}</span>
                              <div className="flex-1 h-2 bg-lifted rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-karam rounded-full transition-all shadow-[0_0_10px_rgba(255,184,0,0.4)]" style={{ width: `${(val / 5) * 100}%` }} />
                              </div>
                              <span className="text-xs font-black text-white w-8 text-right">{val.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review list */}
                  {reviews.length === 0 && (!googleData || googleData.reviews.length === 0) ? (
                    <div className="text-center py-12 bg-chamber rounded-[2rem] border border-white/5 shadow-2xl">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-dusk opacity-20" />
                      <p className="text-sm font-bold text-moon">{t.noReviews || 'No reviews yet — be the first!'}</p>
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
                          <div key={reviewId} className="bg-chamber rounded-[2rem] border border-white/5 p-5 shadow-2xl">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-oasis-spring to-blue-500 flex items-center justify-center text-midnight text-sm font-black flex-shrink-0 shadow-mint-glow">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="font-black text-sm text-white">{authorName}</p>
                                {r.createdAt && <p className="text-[10px] font-black uppercase tracking-widest text-dusk mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0 pt-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-karam text-karam shadow-lg' : 'text-white/5'}`} />
                                ))}
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-moon font-bold leading-relaxed mb-4">{r.comment}</p>}
                            {photos.length > 0 && (
                              <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar pb-1">
                                {photos.map((photo, idx) => (
                                <SafeImage key={idx} src={photo} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-white/5 shadow-lg" fallbackType="placeholder" />
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <button onClick={() => handleHelpfulVote(reviewId)} disabled={voted}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${voted ? 'border-oasis-spring/30 text-oasis-spring bg-oasis-spring/5 cursor-default' : 'border-white/5 text-dusk hover:border-oasis-spring/40 hover:text-white bg-lifted'}`}>
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {t.helpfulBtn || 'Helpful'}{voteCount > 0 ? ` · ${voteCount}` : ''}
                              </button>
                              {!reply && (
                                <button onClick={() => { setReplyingTo(reviewId); setReplyDraft(''); }}
                                  className="text-[10px] font-black uppercase tracking-widest text-moon/40 hover:text-oasis-spring transition-colors ms-auto">
                                  {t.replyAsOwner || 'Reply as Owner'}
                                </button>
                              )}
                            </div>
                            {replyingTo === reviewId && (
                              <div className="mt-5 flex gap-3">
                                <input
                                  className="flex-1 bg-lifted rounded-[1.25rem] px-5 py-4 text-xs font-bold border border-white/10 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-moon/20"
                                  placeholder={t.writeResponsePlaceholder || 'Write your response...'}
                                  value={replyDraft}
                                  onChange={e => setReplyDraft(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleOwnerReply(reviewId)}
                                  autoFocus
                                />
                                <button onClick={() => handleOwnerReply(reviewId)} disabled={!replyDraft.trim()}
                                  className="p-4 bg-oasis-spring text-midnight rounded-[1.25rem] hover:scale-105 transition disabled:opacity-40 shadow-mint-glow">
                                  <Send className="w-5 h-5" />
                                </button>
                                <button onClick={() => setReplyingTo(null)} className="p-4 text-moon/40 hover:text-white transition-colors">
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            {reply && (
                              <div className={`mt-6 ${isRTL ? 'mr-4 pr-6 border-r-4' : 'ml-4 pl-6 border-l-4'} border-oasis-spring/40 bg-oasis-spring/5 rounded-[1.75rem] p-5 shadow-inner`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-oasis-spring rounded-full shadow-mint-glow" />
                                  <p className="text-[10px] font-black text-oasis-spring uppercase tracking-widest">
                                    {t.ownerResponse || 'Owner Response'}
                                  </p>
                                </div>
                                <p className="text-xs text-moon/80 font-bold leading-relaxed">{reply.text}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Google Reviews */}
                      {!googleLoading && googleData && googleData.reviews.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2.5 px-1 pt-4">
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-1 shadow-lg">
                              <SafeImage src="https://www.google.com/favicon.ico" alt="Google" className="w-full h-full" fallbackType="icon" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-moon">Google Reviews</span>
                            {googleData.userRatingCount !== undefined && <span className="text-[10px] font-black text-dusk ml-1">({googleData.userRatingCount.toLocaleString()})</span>}
                            {googleData.rating !== undefined && (
                              <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-karam">
                                <Star className="w-3.5 h-3.5 fill-karam" /> {googleData.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="space-y-3">
                            {googleData.reviews.map((r, i) => (
                              <div key={i} className="bg-chamber rounded-[2rem] border border-white/5 p-5 shadow-2xl">
                                <div className="flex items-start gap-4 mb-3">
                                  <SafeImage
                                    src={r.authorPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.author)}`}
                                    className="w-10 h-10 rounded-full bg-lifted object-cover flex-shrink-0 shadow-lg border border-white/5"
                                    alt={r.author}
                                    fallbackType="icon"
                                  />
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <p className="text-sm font-black text-white truncate">{r.author}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dusk mt-0.5">{r.relativeTime}</p>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0 pt-1">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-karam text-karam' : 'text-white/5'}`} />)}
                                  </div>
                                </div>
                                {r.text && <p className="text-sm text-moon font-bold leading-relaxed line-clamp-4">{r.text}</p>}
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
                  <div className="bg-chamber rounded-[2rem] p-5 border border-white/5 shadow-2xl">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-lifted rounded-xl px-5 py-3 text-sm font-bold border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-dusk"
                        placeholder={t.askQuestionPlaceholder || 'Ask a question about this place...'}
                        value={qaQuestion}
                        onChange={e => setQaQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                      />
                      <button onClick={handleAskQuestion} disabled={!qaQuestion.trim()}
                        className="p-3 bg-oasis-spring text-midnight rounded-xl hover:scale-105 transition shadow-mint-glow disabled:opacity-50">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {qaItems.length === 0 ? (
                    <div className="text-center py-12 bg-chamber rounded-[2rem] border border-white/5 shadow-2xl">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-dusk opacity-20" />
                      <p className="text-sm font-bold text-moon">{t.noQuestionsYet || 'No questions yet — ask the first one!'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {qaItems.map(q => (
                        <div key={q.id} className="bg-chamber rounded-[2rem] border border-white/5 p-5 shadow-2xl">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-8 h-8 rounded-full bg-oasis-spring/10 flex items-center justify-center text-oasis-spring font-black text-sm flex-shrink-0 shadow-mint-glow border border-oasis-spring/20">Q</div>
                            <div>
                              <p className="text-sm font-black text-white leading-relaxed">{q.question}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-dusk mt-1.5">{q.askedBy} · {new Date(q.askedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {q.answers.map(a => (
                            <div key={a.id} className="flex items-start gap-3 ms-10 mb-3 group">
                              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-[10px] flex-shrink-0 border border-blue-500/20">A</div>
                              <div className="flex-1 bg-lifted rounded-2xl p-4 shadow-inner">
                                <p className="text-xs text-moon font-bold leading-relaxed">{a.text}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-moon/20 mt-2">{a.answeredBy} · {new Date(a.answeredAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                          {answeringId !== q.id ? (
                            <button onClick={() => { setAnsweringId(q.id); setAnswerDraft(''); }}
                              className="text-[10px] font-black uppercase tracking-widest text-oasis-spring hover:underline transition-all ms-12 mt-2">
                              {t.answerBtn || '+ Answer'}
                            </button>
                          ) : (
                            <div className="ms-12 flex gap-3 mt-4">
                              <input
                                className="flex-1 bg-lifted rounded-xl px-5 py-3 text-xs font-bold border border-white/10 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-moon/20"
                                placeholder={t.writeAnswerPlaceholder || 'Write your answer...'}
                                value={answerDraft}
                                onChange={e => setAnswerDraft(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddAnswer(q.id)}
                                autoFocus
                              />
                              <button onClick={() => handleAddAnswer(q.id)} disabled={!answerDraft.trim()}
                                className="p-3 bg-oasis-spring text-midnight rounded-xl hover:scale-105 transition disabled:opacity-40 shadow-mint-glow">
                                <Send className="w-4 h-4" />
                              </button>
                              <button onClick={() => setAnsweringId(null)} className="p-3 text-moon/40 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
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
                <div className="pt-4 px-1">
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-white mb-4">{t.similarPlaces || 'Similar Places'}</h3>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                    {similarPlaces.map(p => {
                      const pid = p._id || p.id || '';
                      return (
                        <button key={pid} onClick={() => onSwitchPlace?.(p)}
                          className="flex-shrink-0 w-40 text-left group bg-chamber rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl active:scale-95 transition-all">
                          <div className="h-28 overflow-hidden bg-midnight relative">
                            <SafeImage
                              src={p.photos?.[0] || p.image}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                              alt={p.name}
                              fallbackType="placeholder"
                              seed={pid}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 to-transparent" />
                            {p.ratingSummary?.avgRating != null && (
                              <div className="absolute top-3 right-3 flex items-center gap-1 bg-midnight/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10">
                                <Star className="w-3 h-3 fill-karam text-karam" />
                                <span className="text-[10px] font-black text-white">{p.ratingSummary.avgRating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3.5">
                            <p className="text-xs font-black text-white leading-tight line-clamp-2 group-hover:text-oasis-spring transition-colors">{p.name}</p>
                            {p.city && <p className="text-[10px] font-bold text-moon mt-1.5 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-oasis-spring" />{p.city}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CLAIM LISTING ── */}
              <div className="pt-8 border-t border-white/5 text-center">
                <button
                  onClick={() => { setShowClaimModal(true); setClaimSubmitted(false); }}
                  className="text-[10px] font-black uppercase tracking-widest text-dusk hover:text-oasis-spring transition-colors inline-flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  {t.claimListing || 'Are you the owner? Claim this listing →'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── CLAIM LISTING MODAL ── */}
      {showClaimModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowClaimModal(false)}>
          <div className="bg-chamber rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-white/10 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            {claimSubmitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-oasis-spring/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-mint-glow">
                  <CheckCheck className="w-8 h-8 text-oasis-spring" />
                </div>
                <p className="font-black text-white text-lg mb-2">Claim submitted!</p>
                <p className="text-sm text-moon font-bold">We'll verify your business details within 48 hours.</p>
                <button onClick={() => setShowClaimModal(false)}
                  className="mt-8 w-full py-4 bg-oasis-spring text-midnight rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 transition shadow-mint-glow">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-white">Claim Listing</h3>
                  <button onClick={() => setShowClaimModal(false)} className="p-2 rounded-full hover:bg-white/5 transition">
                    <X className="w-5 h-5 text-dusk hover:text-white" />
                  </button>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-moon mb-2 block">Business Name</label>
                    <input className="w-full bg-lifted rounded-xl px-4 py-3 text-sm font-bold border border-white/5 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-dusk"
                      value={claimBusinessName} onChange={e => setClaimBusinessName(e.target.value)} placeholder="Enter business name" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-moon/40 mb-3 block">{isRTL ? 'دورك' : 'Your Role'}</label>
                    <div className="flex gap-2">
                      {(['Owner', 'Manager', 'Marketing'] as const).map(r => (
                        <button key={r} onClick={() => setClaimRole(r)}
                          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${claimRole === r ? 'bg-oasis-spring text-midnight border-oasis-spring shadow-mint-glow' : 'bg-lifted text-moon/40 border-white/10 hover:border-oasis-spring/40'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-moon/40 mb-3 block">{isRTL ? 'البريد الإلكتروني' : 'Contact Email'}</label>
                    <input type="email" className="w-full bg-lifted rounded-2xl px-5 py-4 text-sm font-bold border border-white/10 outline-none focus:ring-2 focus:ring-oasis-spring/40 text-white placeholder-moon/20"
                      value={claimEmail} onChange={e => setClaimEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <button onClick={handleSubmitClaim} disabled={!claimBusinessName.trim() || !claimEmail.trim()}
                    className="w-full py-5 bg-oasis-spring text-midnight rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition shadow-mint-glow disabled:opacity-50 mt-4">
                    {isRTL ? 'إرسال الطلب' : 'Submit Claim'}
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