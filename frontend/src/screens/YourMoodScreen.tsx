import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, ChevronRight, Pencil, Sparkles, Tent, Compass } from 'lucide-react';
import { User, Place, Tour, Rental } from '../types/index';
import { placeAPI, tourAPI, rentalAPI } from '../services/api';
import { MOCK_PLACES } from './HomeScreen';
import { MOCK_TOURS } from './ToursScreen';
import { MOCK_RENTALS, MOCK_SPORT_VENUES } from './RentalsScreen';

// ─── Storage ──────────────────────────────────────────────────────────────────

const MOOD_KEY = 'tripo_mood';

interface MoodPrefs {
  date: string; // YYYY-MM-DD
  interests: string[];
  budget: string;
  hours: number;
  vibe: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

function loadPrefs(): MoodPrefs | null {
  try {
    const raw = localStorage.getItem(MOOD_KEY);
    if (!raw) return null;
    const p: MoodPrefs = JSON.parse(raw);
    return p.date === todayStr() ? p : null; // stale if not today
  } catch { return null; }
}

function savePrefs(p: MoodPrefs) {
  localStorage.setItem(MOOD_KEY, JSON.stringify({ ...p, date: todayStr() }));
}

// ─── Question data ────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  { id: 'Nature',    emoji: '🌿', tKey: 'interestNature'    },
  { id: 'Heritage',  emoji: '🏛️', tKey: 'interestHeritage'  },
  { id: 'Adventure', emoji: '🧗', tKey: 'interestAdventure' },
  { id: 'Food',      emoji: '🍽️', tKey: 'interestFood'      },
  { id: 'Beach',     emoji: '🏖️', tKey: 'interestBeach'     },
  { id: 'Sports',    emoji: '⚽', tKey: 'interestSports'    },
  { id: 'Culture',   emoji: '🎭', tKey: 'interestCulture'   },
  { id: 'Urban',     emoji: '🏙️', tKey: 'interestUrban'     },
];

const BUDGET_OPTIONS = [
  { val: 'free',   tKey: 'budgetFree',   descKey: 'budgetFreeDesc',   symbol: '🆓' },
  { val: 'low',    tKey: 'budgetLow',    descKey: 'budgetLowDesc',    symbol: '＄'  },
  { val: 'medium', tKey: 'budgetMedium', descKey: 'budgetMediumDesc', symbol: '＄＄' },
  { val: 'high',   tKey: 'budgetHigh',   descKey: 'budgetHighDesc',   symbol: '＄＄＄' },
];

const VIBE_OPTIONS = [
  { val: 'chill',    tKey: 'vibeChill',    emoji: '😌', color: 'from-blue-400 to-cyan-400'      },
  { val: 'active',   tKey: 'vibeActive',   emoji: '🏃', color: 'from-orange-400 to-amber-400'  },
  { val: 'cultural', tKey: 'vibeCultural', emoji: '🔍', color: 'from-purple-400 to-violet-400' },
  { val: 'social',   tKey: 'vibeSocial',   emoji: '🎉', color: 'from-pink-400 to-rose-400'     },
];

// ─── Matching helpers ─────────────────────────────────────────────────────────

function scoredPlaces(places: Place[], prefs: MoodPrefs): Place[] {
  return [...places]
    .map(p => {
      const tags = [...(p.categoryTags || []), p.category || ''].map(t => t.toLowerCase());
      const score = prefs.interests.filter(i => tags.some(t => t.includes(i.toLowerCase()))).length;
      return { p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.ratingSummary?.avgRating ?? 0) - (a.p.ratingSummary?.avgRating ?? 0))
    .map(x => x.p)
    .slice(0, 6);
}

function scoredTours(tours: Tour[], prefs: MoodPrefs): Tour[] {
  const vibeMap: Record<string, string[]> = {
    chill:    ['heritage', 'culture', 'food', 'urban'],
    active:   ['adventure', 'nature', 'hiking', 'desert'],
    cultural: ['heritage', 'history', 'culture', 'traditional'],
    social:   ['group', 'food', 'community', 'fun'],
  };
  const vibeKeywords = vibeMap[prefs.vibe] || [];
  return [...tours]
    .map(t => {
      const haystack = [t.category || '', t.title || '', ...(t.tags || [])].join(' ').toLowerCase();
      const interestScore = prefs.interests.filter(i => haystack.includes(i.toLowerCase())).length;
      const vibeScore = vibeKeywords.filter(k => haystack.includes(k)).length;
      return { t, score: interestScore * 2 + vibeScore };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || (Number(b.t.rating) || 0) - (Number(a.t.rating) || 0))
    .map(x => x.t)
    .slice(0, 4);
}

function scoredRentals(rentals: Rental[], sports: Rental[], prefs: MoodPrefs): Rental[] {
  const wantsSports = prefs.interests.includes('Sports');
  const pool = wantsSports ? [...sports, ...rentals] : rentals;
  const budgetMax: Record<string, number> = { free: 0, low: 100, medium: 300, high: 99999 };
  const max = budgetMax[prefs.budget] ?? 99999;
  return pool
    .filter(r => prefs.budget === 'free' ? (Number(r.price) || 0) === 0 : (Number(r.price) || 0) <= max || prefs.budget === 'high')
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 4);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const getGreeting = (t?: any) => {
  const h = new Date().getHours();
  if (h < 12) return t?.goodMorning || 'Good morning';
  if (h < 17) return t?.goodAfternoon || 'Good afternoon';
  return t?.goodEvening || 'Good evening';
};

const vibeGradient: Record<string, string> = {
  chill:    'from-blue-600 via-cyan-500 to-teal-500',
  active:   'from-orange-500 via-amber-500 to-yellow-400',
  cultural: 'from-purple-600 via-violet-500 to-indigo-500',
  social:   'from-pink-500 via-rose-500 to-red-400',
  default:  'from-emerald-600 via-teal-500 to-cyan-500',
};

// ─── Main component ───────────────────────────────────────────────────────────

export const YourMoodScreen = ({ user, onNavigate, t }: { user: User; onNavigate?: (tab: string, id?: string) => void; t?: any }) => {
  const [prefs, setPrefs] = useState<MoodPrefs | null>(() => loadPrefs());
  const [editing, setEditing] = useState(!loadPrefs());

  // Form state
  const [interests, setInterests] = useState<string[]>(prefs?.interests || []);
  const [budget, setBudget]       = useState(prefs?.budget || 'medium');
  const [hours, setHours]         = useState(prefs?.hours || 3);
  const [vibe, setVibe]           = useState(prefs?.vibe || '');

  // Data
  const [places, setPlaces]       = useState<Place[]>([]);
  const [tours, setTours]         = useState<Tour[]>([]);
  const [rentals, setRentals]     = useState<Rental[]>([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (prefs) {
      setLoading(true);
      Promise.allSettled([
        placeAPI.getPlaces(),
        tourAPI.getTours(),
        rentalAPI.getRentals(),
      ]).then(([p, t, r]) => {
        setPlaces(p.status === 'fulfilled' && p.value.length ? p.value : MOCK_PLACES);
        setTours(t.status === 'fulfilled' && t.value.length ? t.value : MOCK_TOURS);
        setRentals(r.status === 'fulfilled' && r.value.length ? r.value : MOCK_RENTALS);
      }).finally(() => setLoading(false));
    }
  }, [prefs]);

  const toggleInterest = (id: string) =>
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (!interests.length || !vibe) return;
    const newPrefs: MoodPrefs = { date: todayStr(), interests, budget, hours, vibe };
    savePrefs(newPrefs);
    setPrefs(newPrefs);
    setEditing(false);
  };

  const handleEdit = () => {
    if (prefs) {
      setInterests(prefs.interests);
      setBudget(prefs.budget);
      setHours(prefs.hours);
      setVibe(prefs.vibe);
    }
    setEditing(true);
  };

  const canSubmit = interests.length > 0 && vibe !== '';

  // ── Questions form ──────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 pb-24">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 px-6 pt-10 pb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-200" />
            <span className="text-emerald-100 text-sm font-bold uppercase tracking-widest">{t?.moodTitle || 'Your Mood'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            {t?.moodVibePrompt || "What's your vibe today"}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}? ✨
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            {t?.moodSubtitle || "Answer a few quick questions and we'll pick the perfect spots for you."}
          </p>
        </div>

        <div className="px-4 py-6 space-y-8">

          {/* Q1 — Interests */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t?.moodQuestion1 || 'What are you in the mood for?'} <span className="text-red-400">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(opt => {
                const sel = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all select-none ${
                      sel
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span>{opt.emoji}</span> {t?.[opt.tKey] || opt.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q2 — Vibe */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t?.moodQuestion2 || "What's your vibe?"} <span className="text-red-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {VIBE_OPTIONS.map(opt => {
                const sel = vibe === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setVibe(opt.val)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      sel
                        ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-2xl mb-1">{opt.emoji}</span>
                    <span className="text-xs font-bold text-slate-800 text-center leading-tight">{t?.[opt.tKey] || opt.val}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q3 — Budget */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t?.moodQuestion3 || 'Budget for today'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {BUDGET_OPTIONS.map(opt => {
                const sel = budget === opt.val;
                return (
                  <button
                    key={opt.val}
                    onClick={() => setBudget(opt.val)}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                      sel
                        ? 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.03]'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-xl mb-1">{opt.symbol}</span>
                    <span className="text-sm font-bold text-slate-800">{t?.[opt.tKey] || opt.val}</span>
                    <span className="text-xs text-slate-400 mt-0.5">{t?.[opt.descKey] || ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q4 — Time */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t?.moodQuestion4 || 'How much time do you have?'}
            </p>
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-4 mb-2">
                <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={hours}
                  onChange={e => setHours(parseFloat(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="font-extrabold text-slate-900 w-12 text-right">{hours}h</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                <span>1 hr</span>
                <span>4 hrs</span>
                <span>8 hrs</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              canSubmit
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-200 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {t?.moodSubmit || 'Show My Recommendations'}
          </button>
        </div>
      </div>
    );
  }

  // ── Results view ────────────────────────────────────────────────────────────
  if (!prefs) return null;

  const vibeOption = VIBE_OPTIONS.find(v => v.val === prefs.vibe);
  const gradient = vibeGradient[prefs.vibe] || vibeGradient.default;

  const recPlaces  = scoredPlaces(places, prefs);
  const recTours   = scoredTours(tours, prefs);
  const recRentals = scoredRentals(rentals, MOCK_SPORT_VENUES, prefs);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-24">

      {/* Hero header */}
      <div className={`bg-gradient-to-br ${gradient} px-6 pt-10 pb-6 relative overflow-hidden`}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute bottom-0 left-1/2 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-white/80 text-sm font-medium">{getGreeting(t)},</p>
          <h1 className="text-white text-2xl font-extrabold leading-tight mt-0.5">
            {user?.name?.split(' ')[0] || 'Explorer'} — {t?.moodHereYourDay || "here's your day 🎯"}
          </h1>

          {/* Prefs summary chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {prefs.interests.map(i => {
              const opt = INTEREST_OPTIONS.find(o => o.id === i);
              return (
                <span key={i} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
                  {opt?.emoji} {t?.[opt?.tKey || ''] || i}
                </span>
              );
            })}
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
              {vibeOption?.emoji} {t?.[vibeOption?.tKey || ''] || vibeOption?.val}
            </span>
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/25">
              ⏱ {prefs.hours}h
            </span>
          </div>

          {/* Edit button */}
          <button
            onClick={handleEdit}
            className="mt-4 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> {t?.moodChangeMood || "Change Today's Mood"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-8">

          {/* ── Places ── */}
          {recPlaces.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">{t?.moodPlacesSection || '📍 Places for You'}</h2>
                <span className="text-xs text-slate-400">{recPlaces.length} {t?.moodMatches || 'matches'}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {recPlaces.map(place => {
                  const img = place.photos?.[0] || place.image;
                  const rating = place.ratingSummary?.avgRating ?? place.rating;
                  return (
                    <button
                      key={place._id || place.id}
                      onClick={() => onNavigate?.('places', place._id || place.id)}
                      className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="h-28 bg-slate-200 relative overflow-hidden">
                        {img && <img src={img} className="w-full h-full object-cover" alt={place.name} />}
                        {rating && (
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-bold text-slate-700">{Number(rating).toFixed(1)}</span>
                          </div>
                        )}
                        {place.categoryTags?.[0] && (
                          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {place.categoryTags[0]}
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-slate-900 text-sm truncate">{place.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {place.city || 'Saudi Arabia'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Tours ── */}
          {recTours.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">{t?.moodToursSection || '🧭 Tours for You'}</h2>
                <span className="text-xs text-slate-400">{recTours.length} {t?.moodMatches || 'matches'}</span>
              </div>
              <div className="space-y-3">
                {recTours.map(tour => (
                  <button
                    key={tour.id}
                    onClick={() => onNavigate?.('tours', tour.id || (tour as any)._id)}
                    className="w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="w-24 h-24 flex-shrink-0 bg-slate-200 relative overflow-hidden">
                      {tour.heroImage && <img src={tour.heroImage} className="w-full h-full object-cover" alt={tour.title} />}
                      <span className={`absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                        tour.difficulty === 'easy' ? 'bg-emerald-500' : tour.difficulty === 'moderate' ? 'bg-amber-500' : 'bg-red-500'
                      }`}>{tour.difficulty}</span>
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <p className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{tour.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{tour.departureLocation}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" />{tour.totalDuration}h</span>
                        {tour.rating && (
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{Number(tour.rating).toFixed(1)}</span>
                        )}
                        <span className="font-bold text-emerald-600 ml-auto">{tour.pricePerPerson} SAR</span>
                      </div>
                    </div>
                    <div className="flex items-center pr-3">
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Rentals ── */}
          {recRentals.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">{t?.moodRentalsSection || '🏕️ Rentals for You'}</h2>
                <span className="text-xs text-slate-400">{recRentals.length} {t?.moodMatches || 'matches'}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {recRentals.map(rental => {
                  const img = (rental.images && rental.images[0]) || rental.image;
                  return (
                    <button
                      key={rental.id}
                      onClick={() => onNavigate?.('rentals', rental.id || (rental as any)._id)}
                      className="flex-shrink-0 w-48 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="h-32 bg-slate-200 relative overflow-hidden">
                        {img && <img src={img} className="w-full h-full object-cover" alt={rental.title} />}
                        {rental.rating && (
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-bold text-slate-700">{Number(rental.rating).toFixed(1)}</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {rental.type}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-slate-900 text-sm truncate">{rental.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />{rental.locationName}
                        </p>
                        <p className="text-sm font-extrabold text-emerald-700 mt-1.5">
                          {rental.price} <span className="text-xs font-normal text-slate-400">SAR/night</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state */}
          {recPlaces.length === 0 && recTours.length === 0 && recRentals.length === 0 && (
            <div className="text-center py-16">
              <Compass className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-500">{t?.moodNoMatches || 'No exact matches found'}</p>
              <p className="text-slate-400 text-sm mt-1">{t?.moodAdjustPrefs || 'Try adjusting your preferences'}</p>
              <button onClick={handleEdit} className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition">
                {t?.moodUpdatePrefs || 'Update Preferences'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
