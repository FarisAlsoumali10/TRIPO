import React, { useState, useEffect, useRef } from 'react';
import { X, Star, MapPin, Sparkles, Send, MessageSquare, Clock, ChevronDown, ChevronUp, ThumbsUp, Award, Camera, Building2, CheckCircle, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Place, Rental, QAItem } from '../types/index';
import { reviewAPI } from '../services/api';

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
  const [activeSection, setActiveSection] = useState<'reviews' | 'qa'>('reviews');
  const [hoursExpanded, setHoursExpanded] = useState(false);

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

  // ── derived ─────────────────────────────────────────────────────────────
  const placeName = 'title' in place ? place.title : place.name;
  const placeCat = 'type' in place ? place.type : (Array.isArray(place.categoryTags) ? place.categoryTags[0] : place.categoryTags);
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
      .catch(() => {});
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

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Provide a concise 50-word summary of the "Google Maps" reviews and general public reputation for "${placeName}" in Riyadh. Mention what people love and any common complaints. Tone: Helpful and informative. Language: ${t.aiSummaryTitle?.includes('ملخص') ? 'Arabic' : 'English'}.`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        setSummary(response.text || t.aiSummaryError || 'No summary available.');
      } catch {
        setSummary(t.aiSummaryError || 'AI summary unavailable.');
      } finally {
        setIsSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [place, placeName, t.aiSummaryTitle, t.aiSummaryError]);

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
        try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
        existing.push({ reviewId, photos: reviewPhotos });
        localStorage.setItem(key, JSON.stringify(existing));
      }
      setReviews(prev => [saved, ...prev]);
      setReviewComment('');
      setReviewRating(5);
      setReviewPhotos([]);
    } catch (_) {}
    setIsSubmitting(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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
    try { existing = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
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
  return (
    <>
      <div className={mode === 'page'
        ? "fixed inset-0 z-[100] bg-white overflow-y-auto"
        : "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      }>
        <div className={mode === 'page'
          ? "relative w-full max-w-2xl mx-auto min-h-full flex flex-col pb-16"
          : "bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col"
        }>

          {/* Back (page mode) or Close (modal mode) button */}
          {mode === 'page' ? (
            <button onClick={onClose} className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-2 rounded-xl font-semibold text-sm shadow hover:bg-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Hero image */}
          <div className={`${mode === 'page' ? 'h-72' : 'h-48'} w-full relative bg-slate-200 shrink-0`}>
            <img
              src={place.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'}
              className="w-full h-full object-cover"
              alt={placeName}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'; }}
            />
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <h2 className="text-xl font-bold">{placeName}</h2>
              <p className="text-sm opacity-90 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {placeLocation}</p>
            </div>
          </div>

          {/* Scrollable body */}
          <div className={mode === 'page' ? "p-5 flex-1 max-w-2xl mx-auto w-full" : "p-5 overflow-y-auto flex-1"}>

            {/* ── Feature 2: Promo banner ── */}
            {activePromo && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-base">🎉</span>
                <p className="text-sm font-semibold text-emerald-800">{activePromo}</p>
              </div>
            )}

            {/* ── Top meta row ── */}
            <div className="flex justify-between items-start mb-3">
              {/* Rating + Travellers' Choice */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 self-start">
                  <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                  <span className="font-bold text-slate-900">{avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}</span>
                  <span className="text-xs text-slate-500">rating</span>
                </div>
                {isTravellersChoice && (
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg self-start">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">Travellers' Choice</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="text-right">
                {priceLevel ? (
                  <p className="font-bold text-lg">{renderPriceDollars(priceLevel)}</p>
                ) : (
                  <p className="font-bold text-emerald-600 text-lg">{placePrice} <span className="text-xs text-slate-500">SAR</span></p>
                )}
                <p className="text-xs text-slate-400">{placeCat}</p>
              </div>
            </div>

            {/* ── Accessibility badges ── */}
            {accessibility && (accessibility.wheelchair || accessibility.parking || accessibility.family) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {accessibility.wheelchair && (
                  <span className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    ♿ Wheelchair
                  </span>
                )}
                {accessibility.parking && (
                  <span className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    🅿 Parking
                  </span>
                )}
                {accessibility.family && (
                  <span className="text-xs bg-green-50 border border-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    👨‍👩‍👧 Family-Friendly
                  </span>
                )}
              </div>
            )}

            {/* ── Opening Hours ── */}
            {asPlace?.openingHours && (
              <div className="mb-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                {/* Today's status row */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {openNow === true && (
                      <span className="text-xs font-semibold text-white bg-emerald-500 px-2 py-0.5 rounded-full">Open Now</span>
                    )}
                    {openNow === false && (
                      <span className="text-xs font-semibold text-white bg-red-400 px-2 py-0.5 rounded-full">Closed</span>
                    )}
                    {todayHours && (
                      <span className="text-xs text-slate-600">{todayHours}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setHoursExpanded(v => !v)}
                    className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium"
                  >
                    {hoursExpanded ? 'Hide' : 'See all hours'}
                    {hoursExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Full week */}
                {hoursExpanded && (
                  <div className="border-t border-slate-100 px-4 py-2 space-y-1">
                    {DAY_KEYS.map((key, i) => {
                      const h = asPlace.openingHours![key];
                      const isToday = i === new Date().getDay();
                      return (
                        <div key={key} className={`flex justify-between text-xs py-0.5 ${isToday ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                          <span>{DAY_LABELS[i]}{isToday ? ' (today)' : ''}</span>
                          <span>{h ? (h.closed ? 'Closed' : `${h.open} – ${h.close}`) : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Summary ── */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden mb-5">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500" />
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">{t.aiSummaryTitle || 'AI Summary'}</h3>
              </div>
              {isSummaryLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
                  <p className="text-[10px] text-slate-400 mt-3 text-right italic">{t.aiSource || 'Generated by Gemini AI'}</p>
                </>
              )}
            </div>

            {/* ── Reviews / Q&A — only for real places ── */}
            {isPlace && placeId && /^[0-9a-fA-F]{24}$/.test(placeId) && (
              <div>
                {/* Tab toggle */}
                <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveSection('reviews')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSection === 'reviews' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t.reviews || 'Reviews'}
                      {reviews.length > 0 && <span className="text-[10px] font-normal text-slate-400">({reviews.length})</span>}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveSection('qa')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSection === 'qa' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                  >
                    Q&A
                    {qaItems.length > 0 && <span className="text-[10px] font-normal text-slate-400 ml-1">({qaItems.length})</span>}
                  </button>
                </div>

                {/* ── Reviews tab ── */}
                {activeSection === 'reviews' && (
                  <div>
                    {/* Write review */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-3">
                      <div className="flex gap-1 mb-2">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setReviewRating(s)}>
                            <Star className={`w-5 h-5 transition-colors ${s <= reviewRating ? 'fill-orange-400 text-orange-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input
                          className="flex-1 bg-white rounded-xl px-3 py-2 text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder={t.reviewPlaceholder || 'Share your experience...'}
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSubmitReview()}
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={!reviewComment.trim() || isSubmitting}
                          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>

                      {/* ── Feature 1: Photo upload section ── */}
                      <div>
                        {reviewPhotos.length > 0 && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {reviewPhotos.map((photo, idx) => (
                              <div key={idx} className="relative w-16 h-16 flex-shrink-0">
                                <img src={photo} alt={`Review photo ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                                <button
                                  onClick={() => removeReviewPhoto(idx)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {reviewPhotos.length < 3 && (
                          <button
                            onClick={() => photoInputRef.current?.click()}
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors px-2 py-1.5 border border-dashed border-slate-300 rounded-lg hover:border-emerald-400"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Add Photos{reviewPhotos.length > 0 ? ` (${reviewPhotos.length}/3)` : ''}
                          </button>
                        )}
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoSelect}
                        />
                      </div>
                    </div>

                    {reviews.length === 0 ? (
                      <div className="text-center py-6 text-slate-300">
                        <MessageSquare className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs font-medium">{t.noReviews || 'No reviews yet — be the first!'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reviews.slice(0, 5).map((r: any, i) => {
                          const reviewId = r._id || String(i);
                          const voted = myVotes.has(reviewId);
                          const voteCount = helpfulVotes[reviewId] ?? 0;
                          const reply = ownerReplies[reviewId];
                          const photos = getPhotosForReview(reviewId);
                          return (
                            <div key={reviewId} className="bg-white rounded-xl border border-slate-100 p-3">
                              {/* Review header */}
                              <div className="flex items-center gap-2 mb-1">
                                <img
                                  src={typeof r.userId === 'object' ? r.userId?.avatar : undefined || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewId}`}
                                  className="w-6 h-6 rounded-full bg-slate-100"
                                  alt=""
                                />
                                <p className="text-xs font-bold text-slate-900">{typeof r.userId === 'object' ? r.userId?.name : 'User'}</p>
                                <div className="flex gap-0.5 ml-auto">
                                  {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />)}
                                </div>
                              </div>

                              {r.comment && <p className="text-xs text-slate-600 mb-2">{r.comment}</p>}

                              {/* ── Feature 1: Photo thumbnails in review display ── */}
                              {photos.length > 0 && (
                                <div className="flex gap-2 mb-2 overflow-x-auto">
                                  {photos.map((photo, idx) => (
                                    <img
                                      key={idx}
                                      src={photo}
                                      alt={`Review photo ${idx + 1}`}
                                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Actions row */}
                              <div className="flex items-center gap-2 mt-1">
                                {/* Helpful vote */}
                                <button
                                  onClick={() => handleHelpfulVote(reviewId)}
                                  disabled={voted}
                                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${voted ? 'border-emerald-300 text-emerald-600 bg-emerald-50 cursor-default' : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600'}`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  Helpful{voteCount > 0 ? ` (${voteCount})` : ''}
                                </button>

                                {/* Reply as owner */}
                                {!reply && (
                                  <button
                                    onClick={() => { setReplyingTo(reviewId); setReplyDraft(''); }}
                                    className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors ml-auto"
                                  >
                                    Reply as Owner
                                  </button>
                                )}
                              </div>

                              {/* Inline reply input */}
                              {replyingTo === reviewId && (
                                <div className="mt-2 flex gap-1.5">
                                  <input
                                    className="flex-1 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Write your response..."
                                    value={replyDraft}
                                    onChange={e => setReplyDraft(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleOwnerReply(reviewId)}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleOwnerReply(reviewId)}
                                    disabled={!replyDraft.trim()}
                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-40"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}

                              {/* Existing owner reply */}
                              {reply && (
                                <div className="mt-2 ml-3 pl-3 border-l-2 border-emerald-300 bg-emerald-50 rounded-r-lg p-2">
                                  <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Owner Response</p>
                                  <p className="text-xs text-slate-700">{reply.text}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Q&A tab ── */}
                {activeSection === 'qa' && (
                  <div>
                    {/* Ask a question */}
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-3">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-white rounded-xl px-3 py-2 text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Ask a question about this place..."
                          value={qaQuestion}
                          onChange={e => setQaQuestion(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                        />
                        <button
                          onClick={handleAskQuestion}
                          disabled={!qaQuestion.trim()}
                          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {qaItems.length === 0 ? (
                      <div className="text-center py-6 text-slate-300">
                        <MessageSquare className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs font-medium">No questions yet — ask the first one!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {qaItems.map(q => (
                          <div key={q.id} className="bg-white rounded-xl border border-slate-100 p-3">
                            {/* Question */}
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-emerald-600 font-bold text-sm mt-0.5">Q</span>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-800">{q.question}</p>
                                <p className="text-[10px] text-slate-400">{q.askedBy} · {new Date(q.askedAt).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {/* Answers */}
                            {q.answers.length > 0 && (
                              <div className="ml-5 space-y-1.5 mb-2">
                                {q.answers.map(a => (
                                  <div key={a.id} className="flex items-start gap-2">
                                    <span className="text-blue-500 font-bold text-sm mt-0.5">A</span>
                                    <div className="flex-1 bg-slate-50 rounded-lg p-2">
                                      <p className="text-xs text-slate-700">{a.text}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{a.answeredBy} · {new Date(a.answeredAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Answer button / input */}
                            {answeringId !== q.id ? (
                              <button
                                onClick={() => { setAnsweringId(q.id); setAnswerDraft(''); }}
                                className="text-[11px] text-emerald-600 font-medium hover:text-emerald-700 transition ml-5"
                              >
                                Answer
                              </button>
                            ) : (
                              <div className="ml-5 flex gap-1.5 mt-1">
                                <input
                                  className="flex-1 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="Write your answer..."
                                  value={answerDraft}
                                  onChange={e => setAnswerDraft(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddAnswer(q.id)}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddAnswer(q.id)}
                                  disabled={!answerDraft.trim()}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-40"
                                >
                                  <Send className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setAnsweringId(null)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Similar Places ── */}
            {similarPlaces.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-sm text-slate-900 mb-3">Similar Places</h3>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                  {similarPlaces.map(p => {
                    const pid = p._id || p.id || '';
                    return (
                      <button
                        key={pid}
                        onClick={() => onSwitchPlace?.(p)}
                        className="flex-shrink-0 w-24 text-left group"
                      >
                        <div className="w-24 h-16 rounded-xl overflow-hidden mb-1 bg-slate-100">
                          <img
                            src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=400&q=60'}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            alt={p.name}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=400&q=60'; }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{p.name}</p>
                        {p.ratingSummary?.avgRating != null && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <Star className="w-2.5 h-2.5 fill-orange-400 text-orange-400" />
                            {p.ratingSummary.avgRating.toFixed(1)}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Feature 2: Claim listing link ── */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => { setShowClaimModal(true); setClaimSubmitted(false); }}
                className="text-xs text-slate-400 hover:text-emerald-600 transition-colors inline-flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                Are you the owner? Claim this listing →
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Feature 2: Claim Listing Modal ── */}
      {showClaimModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowClaimModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {claimSubmitted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-slate-900 mb-1">Claim submitted!</p>
                <p className="text-sm text-slate-500">We'll verify within 48 hours.</p>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="mt-5 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-900">Claim Listing</h3>
                  <button onClick={() => setShowClaimModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 transition">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Business name */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Business Name</label>
                    <input
                      className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={claimBusinessName}
                      onChange={e => setClaimBusinessName(e.target.value)}
                      placeholder="Enter business name"
                    />
                  </div>
                  {/* Role */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Your Role</label>
                    <div className="flex gap-2">
                      {(['Owner', 'Manager', 'Marketing'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setClaimRole(r)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${claimRole === r ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Contact Email</label>
                    <input
                      type="email"
                      className="w-full bg-slate-50 rounded-xl px-3 py-2.5 text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={claimEmail}
                      onChange={e => setClaimEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  <button
                    onClick={handleSubmitClaim}
                    disabled={!claimBusinessName.trim() || !claimEmail.trim()}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                  >
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
